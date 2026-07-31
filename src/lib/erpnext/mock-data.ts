import { IMG } from "@/lib/catalog-data";
import type { ItemGroup, Order, Outlet, Product } from "./types";

// Fallback data used only when ERPNEXT_URL/API credentials are not
// configured (local dev, or before the integration is wired up), so the
// site keeps rendering instead of hard-failing.
export const mockProducts: Product[] = [
  {
    id: "batik-royal",
    name: "Batik Tasik Royal Violet",
    category: "Fashion • Batik",
    price: 450000,
    image: IMG.batik,
    alt: "Kain batik Tasik Royal Violet dengan motif tradisional ungu keemasan",
  },
  {
    id: "tenun-heritage",
    name: "Modern Tenun Heritage",
    category: "Fashion • Tenun",
    price: 890000,
    image: IMG.promoBatik,
    alt: "Kemeja tenun heritage modern pada manekin minimalis",
  },
  {
    id: "signature-wallet",
    name: "Signature Wallet Series",
    category: "Aksesoris • Kulit",
    price: 325000,
    image: IMG.wallet,
    alt: "Set aksesoris kulit mewah bernuansa violet di studio minimalis",
  },
  {
    id: "eco-woven",
    name: "Eco-Woven Storage Set",
    category: "Home Decor • Anyaman",
    price: 210000,
    image: IMG.baskets,
    alt: "Keranjang anyaman tangan untuk dekorasi rumah modern",
  },
  {
    id: "galunggung-arabica",
    name: "Galunggung Arabica Gold",
    category: "Gourmet • Kopi",
    price: 125000,
    image: IMG.coffee,
    alt: "Biji kopi arabika Tasikmalaya dalam kemasan ungu premium",
  },
  {
    id: "kelom-geulis",
    name: "Kelom Geulis Modern Art",
    category: "Fashion • Alas Kaki",
    price: 420000,
    image: IMG.kelom,
    alt: "Kelom geulis kayu dengan ukiran artistik modern",
  },
];

export const mockItemGroups: ItemGroup[] = [
  { name: "Fashion • Batik", label: "Fashion • Batik", parent: null },
  { name: "Fashion • Tenun", label: "Fashion • Tenun", parent: null },
  { name: "Aksesoris • Kulit", label: "Aksesoris • Kulit", parent: null },
  { name: "Home Decor • Anyaman", label: "Home Decor • Anyaman", parent: null },
  { name: "Gourmet • Kopi", label: "Gourmet • Kopi", parent: null },
  { name: "Fashion • Alas Kaki", label: "Fashion • Alas Kaki", parent: null },
];

export const mockOutlets: Outlet[] = [
  { code: "XSC", name: "X-SHA Cikiray", city: "Tasikmalaya", territory: null },
  { code: "XCW", name: "X-SHA Ciawi", city: "Ciawi", territory: null },
  { code: "PSR", name: "X-SHA Pasar", city: "Tasikmalaya", territory: null },
  { code: "XPY", name: "X-SHA Panyingkiran", city: "Tasikmalaya", territory: null },
];

export const mockOrders: Order[] = [
  { id: "DEMO-0001", date: "2026-08-14", status: "Selesai", total: 1250000 },
  { id: "DEMO-0002", date: "2026-08-08", status: "Selesai", total: 545000 },
];
