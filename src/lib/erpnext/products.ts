import { createServerFn } from "@tanstack/react-start";
import { erpRequest, jsonFields, jsonFilters } from "./client";
import { getErpnextConfig, isErpnextConfigured } from "./config";
import { mockItemGroups, mockProducts } from "./mock-data";
import type { ItemGroup, Product } from "./types";

const PLACEHOLDER_IMAGE = "/product-placeholder.svg";

type ErpItem = {
  name: string;
  item_name: string;
  item_group: string;
  standard_rate: number;
  image: string | null;
  description: string | null;
};

function mapItemToProduct(item: ErpItem, erpBaseUrl: string): Product {
  return {
    id: item.name,
    name: item.item_name || item.name,
    category: item.item_group,
    price: item.standard_rate ?? 0,
    image: item.image ? `${erpBaseUrl}${item.image}` : PLACEHOLDER_IMAGE,
    alt: item.item_name || item.name,
  };
}

const SALEABLE_ITEM_FILTERS = [
  ["disabled", "=", 0],
  ["is_sales_item", "=", 1],
];

export type ProductQuery = {
  search?: string;
  itemGroup?: string;
  page?: number;
  pageSize?: number;
  sort?: "relevance" | "price_asc" | "price_desc";
};

export type ProductPage = {
  products: Product[];
  total: number;
};

export const getProducts = createServerFn({ method: "GET" })
  .validator((input: ProductQuery) => input)
  .handler(async ({ data }): Promise<ProductPage> => {
    if (!isErpnextConfigured()) {
      return { products: mockProducts, total: mockProducts.length };
    }

    const page = data.page ?? 1;
    const pageSize = data.pageSize ?? 12;
    const filters: unknown[] = [...SALEABLE_ITEM_FILTERS];
    if (data.itemGroup) filters.push(["item_group", "=", data.itemGroup]);

    const orderBy =
      data.sort === "price_asc"
        ? "standard_rate asc"
        : data.sort === "price_desc"
          ? "standard_rate desc"
          : "modified desc";

    const params: Record<string, string> = {
      fields: jsonFields([
        "name",
        "item_name",
        "item_group",
        "standard_rate",
        "image",
        "description",
      ]),
      filters: jsonFilters(filters),
      limit_start: String((page - 1) * pageSize),
      limit_page_length: String(pageSize),
      order_by: orderBy,
    };
    if (data.search) {
      params.or_filters = jsonFilters([
        ["item_name", "like", `%${data.search}%`],
        ["item_group", "like", `%${data.search}%`],
      ]);
    }

    const config = getErpnextConfig()!;
    const [listRes, countRes] = await Promise.all([
      erpRequest<{ data: ErpItem[] }>("/api/resource/Item", { params }),
      erpRequest<{ message: number }>("/api/method/frappe.client.get_count", {
        params: {
          doctype: "Item",
          filters: jsonFilters(filters),
          ...(data.search
            ? {
                or_filters: jsonFilters([
                  ["item_name", "like", `%${data.search}%`],
                  ["item_group", "like", `%${data.search}%`],
                ]),
              }
            : {}),
        },
      }),
    ]);

    return {
      products: listRes.data.map((item) => mapItemToProduct(item, config.url)),
      total: countRes.message,
    };
  });

export const getProductById = createServerFn({ method: "GET" })
  .validator((input: { id: string }) => input)
  .handler(async ({ data }): Promise<Product | null> => {
    if (!isErpnextConfigured()) {
      return mockProducts.find((p) => p.id === data.id) ?? null;
    }
    const config = getErpnextConfig()!;
    try {
      const res = await erpRequest<{ data: ErpItem }>(
        `/api/resource/Item/${encodeURIComponent(data.id)}`,
        {
          params: {
            fields: jsonFields([
              "name",
              "item_name",
              "item_group",
              "standard_rate",
              "image",
              "description",
            ]),
          },
        },
      );
      return mapItemToProduct(res.data, config.url);
    } catch {
      return null;
    }
  });

export type PromoProduct = Product & { discountPercent: number; oldPrice: number };

type ErpPricingRule = {
  name: string;
  apply_on: "Item Code" | "Item Group" | "Transaction";
  rate_or_discount: "Rate" | "Discount Percentage" | "Discount Amount";
  discount_percentage: number;
  discount_amount: number;
  items?: { item_code: string }[];
  item_groups?: { item_group: string }[];
};

// ERPNext's Item doctype has no "on promo" flag here — active promos are
// modeled as Pricing Rule records (selling=1, disable=0, within date range).
// Only Item Code-scoped rules are expanded for now; Item Group-scoped rules
// would require paging through every item in the group, which isn't worth
// the request volume until confirmed there are real ones in use.
export const getPromoProducts = createServerFn({ method: "GET" }).handler(
  async (): Promise<PromoProduct[]> => {
    if (!isErpnextConfigured()) {
      return mockProducts.slice(0, 4).map((p, i) => {
        const discountPercent = [25, 20, 15, 30][i];
        return {
          ...p,
          discountPercent,
          oldPrice: p.price,
          price: Math.round((p.price * (100 - discountPercent)) / 100),
        };
      });
    }

    const config = getErpnextConfig()!;
    const today = new Date().toISOString().slice(0, 10);

    const rulesRes = await erpRequest<{ data: { name: string }[] }>("/api/resource/Pricing Rule", {
      params: {
        fields: jsonFields(["name"]),
        filters: jsonFilters([
          ["disable", "=", 0],
          ["selling", "=", 1],
          ["apply_on", "=", "Item Code"],
          ["valid_from", "<=", today],
          ["valid_upto", ">=", today],
        ]),
        limit_page_length: "10",
      },
    });

    const rules = await Promise.all(
      rulesRes.data.map((r) =>
        erpRequest<{ data: ErpPricingRule }>(
          `/api/resource/Pricing Rule/${encodeURIComponent(r.name)}`,
          {},
        ),
      ),
    );

    const promoItemCodes = new Map<string, ErpPricingRule>();
    for (const { data: rule } of rules) {
      for (const line of rule.items ?? []) {
        if (!promoItemCodes.has(line.item_code)) promoItemCodes.set(line.item_code, rule);
      }
    }

    const itemCodes = [...promoItemCodes.keys()].slice(0, 8);
    if (itemCodes.length === 0) return [];

    const itemsRes = await erpRequest<{ data: ErpItem[] }>("/api/resource/Item", {
      params: {
        fields: jsonFields([
          "name",
          "item_name",
          "item_group",
          "standard_rate",
          "image",
          "description",
        ]),
        filters: jsonFilters([["name", "in", itemCodes]]),
        limit_page_length: "0",
      },
    });

    return itemsRes.data.map((item) => {
      const rule = promoItemCodes.get(item.name)!;
      const oldPrice = item.standard_rate ?? 0;
      const discountPercent =
        rule.rate_or_discount === "Discount Percentage"
          ? rule.discount_percentage
          : oldPrice > 0
            ? Math.round((rule.discount_amount / oldPrice) * 100)
            : 0;
      const price =
        rule.rate_or_discount === "Discount Amount"
          ? Math.max(0, oldPrice - rule.discount_amount)
          : Math.round((oldPrice * (100 - discountPercent)) / 100);

      return { ...mapItemToProduct(item, config.url), oldPrice, price, discountPercent };
    });
  },
);

export const getItemGroups = createServerFn({ method: "GET" }).handler(
  async (): Promise<ItemGroup[]> => {
    if (!isErpnextConfigured()) return mockItemGroups;

    const res = await erpRequest<{
      data: {
        name: string;
        item_group_name: string;
        parent_item_group: string | null;
        is_group: number;
      }[];
    }>("/api/resource/Item Group", {
      params: {
        fields: jsonFields(["name", "item_group_name", "parent_item_group", "is_group"]),
        filters: jsonFilters([["is_group", "=", 0]]),
        limit_page_length: "0",
        order_by: "item_group_name asc",
      },
    });

    return res.data.map((g) => ({
      name: g.name,
      label: g.item_group_name || g.name,
      parent: g.parent_item_group,
    }));
  },
);
