import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { useOutlet } from "./outlet-context";
import { checkItemStock } from "@/lib/erpnext/products";

export type CartItem = {
  id: string;
  name: string;
  price: number;
  oldPrice?: number;
  qty: number;
  image: string;
  alt: string;
};

type CartContextValue = {
  items: CartItem[];
  open: boolean;
  total: number;
  count: number;
  // Increments every time an item is added — the top-nav cart icon keys an
  // animation off this to pulse instead of the drawer popping open.
  pulseKey: number;
  openCart: () => void;
  closeCart: () => void;
  add: (item: Omit<CartItem, "qty">) => void;
  setQty: (id: string, qty: number) => void;
  remove: (id: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

const STORAGE_KEY = "xsha_cart";

function loadStoredItems(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CartItem[]) : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { selectedOutlet } = useOutlet();
  const [items, setItems] = useState<CartItem[]>([]);
  const [open, setOpen] = useState(false);
  const [pulseKey, setPulseKey] = useState(0);

  // Hydrate from localStorage only on the client, after mount, so SSR output
  // (always empty cart) matches the initial client render.
  useEffect(() => {
    setItems(loadStoredItems());
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const value = useMemo<CartContextValue>(() => {
    const total = items.reduce((sum, i) => sum + i.price * i.qty, 0);
    const count = items.reduce((sum, i) => sum + i.qty, 0);
    return {
      items,
      open,
      total,
      count,
      pulseKey,
      openCart: () => setOpen(true),
      closeCart: () => setOpen(false),
      add: (item) => {
        setItems((prev) => {
          const found = prev.find((p) => p.id === item.id);
          if (found) {
            return prev.map((p) => (p.id === item.id ? { ...p, qty: p.qty + 1 } : p));
          }
          return [...prev, { ...item, qty: 1 }];
        });
        // Don't pop the drawer open on every add — just pulse the cart icon
        // so shoppers can keep browsing; they open the cart themselves when
        // ready to check out.
        setPulseKey((k) => k + 1);

        // If an outlet is picked globally, warn (but don't block) when the
        // item isn't actually in stock there — the shopper finds out now
        // instead of after checkout.
        if (selectedOutlet?.warehouse) {
          checkItemStock({ data: { itemCode: item.id, warehouse: selectedOutlet.warehouse } })
            .then((inStock) => {
              if (!inStock) {
                toast.warning(
                  `${item.name} kemungkinan tidak tersedia di outlet ${selectedOutlet.name}. Admin akan konfirmasi ketersediaannya.`,
                );
              }
            })
            .catch(() => {
              // Silently ignore — this is an advisory check, not a hard gate.
            });
        }
      },
      setQty: (id, qty) =>
        setItems((prev) => prev.map((p) => (p.id === id ? { ...p, qty: Math.max(1, qty) } : p))),
      remove: (id) => setItems((prev) => prev.filter((p) => p.id !== id)),
      clear: () => setItems([]),
    };
  }, [items, open, pulseKey, selectedOutlet]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
