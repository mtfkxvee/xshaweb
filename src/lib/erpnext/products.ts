import { createServerFn } from "@tanstack/react-start";
import { erpRequest, erpToday, jsonFields, jsonFilters } from "./client";
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
  // Whether `itemGroup` is a branch (Department/Category — matched via
  // "descendants of") or a leaf Sub Category (matched via exact equality).
  itemGroupIsGroup?: boolean;
  // Outlet warehouse (Outlet.warehouse) to restrict results to items that
  // have stock there (Bin.actual_qty > 0). The quantity itself is never
  // exposed to the client — it's only used as a filter.
  warehouse?: string;
  page?: number;
  pageSize?: number;
  sort?: "relevance" | "price_asc" | "price_desc";
};

export type ProductPage = {
  products: Product[];
  total: number;
};

// Frappe doesn't allow filtering on dotted/joined fields (only selecting
// them), so a branch item_group ("descendants of") can't be pushed into the
// Bin query directly. Resolve it to the concrete set of matching Item Group
// names up front via a plain query against Item Group itself (a real tree
// doctype, where "descendants of" works natively).
async function resolveItemGroupNames(itemGroup: string, isGroup: boolean): Promise<Set<string>> {
  if (!isGroup) return new Set([itemGroup]);
  const res = await erpRequest<{ data: { name: string }[] }>("/api/resource/Item Group", {
    params: {
      fields: jsonFields(["name"]),
      filters: jsonFilters([["name", "descendants of", itemGroup]]),
      limit_page_length: "0",
    },
  });
  return new Set(res.data.map((g) => g.name));
}

type ErpBinRow = {
  item_code: string;
  item_name: string;
  item_group: string;
  standard_rate: number;
  image: string | null;
  disabled: number;
  is_sales_item: number;
};

// Items in stock at one outlet's warehouse. Bin doesn't support server-side
// filtering on its joined Item fields (disabled, is_sales_item, item_group),
// so those, plus search/sort/pagination, are applied in memory over the
// warehouse's full stocked-item set — bounded by that warehouse's own stock
// count (thousands at most), not the whole catalog.
async function getProductsInStock(
  data: ProductQuery,
  page: number,
  pageSize: number,
  erpBaseUrl: string,
): Promise<ProductPage> {
  const [binRes, groupNames] = await Promise.all([
    erpRequest<{ data: ErpBinRow[] }>("/api/resource/Bin", {
      params: {
        fields: jsonFields([
          "item_code",
          "item_code.item_name as item_name",
          "item_code.item_group as item_group",
          "item_code.standard_rate as standard_rate",
          "item_code.image as image",
          "item_code.disabled as disabled",
          "item_code.is_sales_item as is_sales_item",
        ]),
        filters: jsonFilters([
          ["warehouse", "=", data.warehouse],
          ["actual_qty", ">", 0],
        ]),
        limit_page_length: "0",
      },
    }),
    data.itemGroup ? resolveItemGroupNames(data.itemGroup, Boolean(data.itemGroupIsGroup)) : null,
  ]);

  const search = data.search?.toLowerCase();
  let rows = binRes.data.filter(
    (r) =>
      r.disabled === 0 &&
      r.is_sales_item === 1 &&
      (!groupNames || groupNames.has(r.item_group)) &&
      (!search ||
        r.item_name.toLowerCase().includes(search) ||
        r.item_group.toLowerCase().includes(search)),
  );

  if (data.sort === "price_asc") {
    rows = [...rows].sort((a, b) => a.standard_rate - b.standard_rate);
  } else if (data.sort === "price_desc") {
    rows = [...rows].sort((a, b) => b.standard_rate - a.standard_rate);
  }

  const total = rows.length;
  const pageRows = rows.slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize);

  return {
    products: pageRows.map((r) =>
      mapItemToProduct(
        {
          name: r.item_code,
          item_name: r.item_name,
          item_group: r.item_group,
          standard_rate: r.standard_rate,
          image: r.image,
          description: null,
        },
        erpBaseUrl,
      ),
    ),
    total,
  };
}

export const getProducts = createServerFn({ method: "GET" })
  .validator((input: ProductQuery) => input)
  .handler(async ({ data }): Promise<ProductPage> => {
    if (!isErpnextConfigured()) {
      return { products: mockProducts, total: mockProducts.length };
    }

    const page = data.page ?? 1;
    const pageSize = data.pageSize ?? 12;
    const config = getErpnextConfig()!;

    if (data.warehouse) {
      return getProductsInStock(data, page, pageSize, config.url);
    }

    const filters: unknown[] = [...SALEABLE_ITEM_FILTERS];
    if (data.itemGroup) {
      // A leaf Sub Category has no descendants, so "descendants of" would
      // wrongly return nothing for it — only branches use that operator.
      filters.push(["item_group", data.itemGroupIsGroup ? "descendants of" : "=", data.itemGroup]);
    }

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

// Restricts an already-resolved product list to items that have stock
// (Bin.actual_qty > 0) at one outlet's warehouse. Used to make the promo
// listings respect the same global outlet filter as the catalog.
async function filterInStock<T extends { id: string }>(
  items: T[],
  warehouse: string | undefined,
): Promise<T[]> {
  if (!warehouse || items.length === 0) return items;
  const res = await erpRequest<{ data: { item_code: string }[] }>("/api/resource/Bin", {
    params: {
      fields: jsonFields(["item_code"]),
      filters: jsonFilters([
        ["item_code", "in", items.map((i) => i.id)],
        ["warehouse", "=", warehouse],
        ["actual_qty", ">", 0],
      ]),
      limit_page_length: "0",
    },
  });
  const inStock = new Set(res.data.map((r) => r.item_code));
  return items.filter((i) => inStock.has(i.id));
}

// Used by the cart when adding an item while an outlet is selected, to warn
// the shopper up front instead of them finding out only after checkout.
export const checkItemStock = createServerFn({ method: "GET" })
  .validator((input: { itemCode: string; warehouse: string }) => input)
  .handler(async ({ data }): Promise<boolean> => {
    if (!isErpnextConfigured()) return true;
    const res = await erpRequest<{ data: { name: string }[] }>("/api/resource/Bin", {
      params: {
        fields: jsonFields(["name"]),
        filters: jsonFilters([
          ["item_code", "=", data.itemCode],
          ["warehouse", "=", data.warehouse],
          ["actual_qty", ">", 0],
        ]),
        limit_page_length: "1",
      },
    });
    return res.data.length > 0;
  });

export type PromoProduct = Product & { discountPercent: number; oldPrice: number };

type ErpPricingRule = {
  name: string;
  title: string;
  apply_on: "Item Code" | "Item Group" | "Transaction";
  rate_or_discount: "Rate" | "Discount Percentage" | "Discount Amount";
  discount_percentage: number;
  discount_amount: number;
  items?: { item_code: string }[];
  item_groups?: { item_group: string }[];
};

function discountFor(rule: ErpPricingRule, oldPrice: number) {
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
  return { discountPercent, price };
}

// ERPNext's Item doctype has no "on promo" flag here — active promos are
// modeled as Pricing Rule records (selling=1, disable=0, within date range).
// Only Item Code-scoped rules are expanded for now; Item Group-scoped rules
// would require paging through every item in the group, which isn't worth
// the request volume until confirmed there are real ones in use.
export const getPromoProducts = createServerFn({ method: "GET" })
  .validator((input: { warehouse?: string } | undefined) => input)
  .handler(async ({ data }): Promise<PromoProduct[]> => {
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
    const today = erpToday();
    const warehouse = data?.warehouse;
    const TARGET = 8;

    // Without a warehouse filter, the first 10 active rules are plenty (any
    // 8 items make an equally valid "deals" sample). With one, a fixed small
    // sample very often has zero overlap with one outlet's inventory — so
    // instead search progressively (in small batches, checking stock as we
    // go) and stop as soon as enough in-stock candidates are found.
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
        limit_page_length: warehouse ? "80" : String(TARGET + 2),
      },
    });

    const BATCH = 15;
    const promoItemCodes = new Map<string, ErpPricingRule>();
    for (let i = 0; i < rulesRes.data.length && promoItemCodes.size < TARGET; i += BATCH) {
      const batchRules = await Promise.all(
        rulesRes.data
          .slice(i, i + BATCH)
          .map((r) =>
            erpRequest<{ data: ErpPricingRule }>(
              `/api/resource/Pricing Rule/${encodeURIComponent(r.name)}`,
              {},
            ),
          ),
      );

      const batchCodes: string[] = [];
      for (const { data: rule } of batchRules) {
        for (const line of rule.items ?? []) {
          if (!promoItemCodes.has(line.item_code)) {
            promoItemCodes.set(line.item_code, rule);
            batchCodes.push(line.item_code);
          }
        }
      }

      if (warehouse && batchCodes.length > 0) {
        const stockRes = await erpRequest<{ data: { item_code: string }[] }>("/api/resource/Bin", {
          params: {
            fields: jsonFields(["item_code"]),
            filters: jsonFilters([
              ["item_code", "in", batchCodes],
              ["warehouse", "=", warehouse],
              ["actual_qty", ">", 0],
            ]),
            limit_page_length: "0",
          },
        });
        const inStock = new Set(stockRes.data.map((r) => r.item_code));
        for (const code of batchCodes) {
          if (!inStock.has(code)) promoItemCodes.delete(code);
        }
      }
    }

    const itemCodes = [...promoItemCodes.keys()].slice(0, TARGET);
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
      const { discountPercent, price } = discountFor(rule, oldPrice);
      return { ...mapItemToProduct(item, config.url), oldPrice, price, discountPercent };
    });
  });

export type PromoRuleProducts = {
  rule: { id: string; title: string };
  products: PromoProduct[];
};

// Resolves the exact items covered by one specific Pricing Rule (the one
// behind a clicked promo banner), instead of the aggregated top-N deals used
// on the homepage/promo grid.
export const getPromoRuleProducts = createServerFn({ method: "GET" })
  .validator((input: { ruleId: string; warehouse?: string }) => input)
  .handler(async ({ data }): Promise<PromoRuleProducts | null> => {
    if (!isErpnextConfigured()) return null;

    const config = getErpnextConfig()!;
    let rule: ErpPricingRule;
    try {
      const ruleRes = await erpRequest<{ data: ErpPricingRule }>(
        `/api/resource/Pricing Rule/${encodeURIComponent(data.ruleId)}`,
        {},
      );
      rule = ruleRes.data;
    } catch {
      return null;
    }

    let itemCodes: string[] = [];
    if (rule.apply_on === "Item Code") {
      itemCodes = (rule.items ?? []).map((i) => i.item_code);
    } else if (rule.apply_on === "Item Group") {
      const groups = (rule.item_groups ?? []).map((g) => g.item_group);
      if (groups.length > 0) {
        const groupItemsRes = await erpRequest<{ data: { name: string }[] }>("/api/resource/Item", {
          params: {
            fields: jsonFields(["name"]),
            filters: jsonFilters([
              ["item_group", "in", groups],
              ["disabled", "=", 0],
              ["is_sales_item", "=", 1],
            ]),
            limit_page_length: "50",
          },
        });
        itemCodes = groupItemsRes.data.map((i) => i.name);
      }
    }

    if (itemCodes.length === 0) {
      return { rule: { id: rule.name, title: rule.title }, products: [] };
    }

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

    const products = itemsRes.data.map((item) => {
      const oldPrice = item.standard_rate ?? 0;
      const { discountPercent, price } = discountFor(rule, oldPrice);
      return { ...mapItemToProduct(item, config.url), oldPrice, price, discountPercent };
    });

    return {
      rule: { id: rule.name, title: rule.title },
      products: await filterInStock(products, data.warehouse),
    };
  });

export type PromoBanner = {
  id: string;
  title: string;
  image: string;
};

// A banner is a Pricing Rule with an image attached via its
// "custom_banner_promo" field. Rules without that field set are not
// fabricated into a banner — the whole section is omitted when none qualify.
export const getPromoBanners = createServerFn({ method: "GET" }).handler(
  async (): Promise<PromoBanner[]> => {
    if (!isErpnextConfigured()) return [];

    const config = getErpnextConfig()!;
    const today = erpToday();
    const res = await erpRequest<{
      data: { name: string; title: string; custom_banner_promo: string }[];
    }>("/api/resource/Pricing Rule", {
      params: {
        fields: jsonFields(["name", "title", "custom_banner_promo"]),
        filters: jsonFilters([
          ["disable", "=", 0],
          ["selling", "=", 1],
          ["valid_from", "<=", today],
          ["valid_upto", ">=", today],
          ["custom_banner_promo", "is", "set"],
        ]),
        limit_page_length: "6",
      },
    });

    return res.data.map((r) => ({
      id: r.name,
      title: r.title,
      image: `${config.url}${r.custom_banner_promo}`,
    }));
  },
);

const ROOT_ITEM_GROUP = "All Item Groups";

// One function for all three cascading levels: called with no `parent` (or
// the root) it returns Departments, called with a Department name it returns
// Categories, called with a Category name it returns Sub Categories.
export const getItemGroupChildren = createServerFn({ method: "GET" })
  .validator((input: { parent?: string } | undefined) => input)
  .handler(async ({ data }): Promise<ItemGroup[]> => {
    if (!isErpnextConfigured()) {
      return data?.parent ? [] : mockItemGroups;
    }

    const parent = data?.parent || ROOT_ITEM_GROUP;
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
        filters: jsonFilters([["parent_item_group", "=", parent]]),
        limit_page_length: "0",
        order_by: "item_group_name asc",
      },
    });

    return res.data.map((g) => ({
      name: g.name,
      label: g.item_group_name || g.name,
      parent: g.parent_item_group,
      isGroup: Boolean(g.is_group),
    }));
  });
