import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

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
  const [items, setItems] = useState<CartItem[]>([]);
  const [open, setOpen] = useState(false);

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
        setOpen(true);
      },
      setQty: (id, qty) =>
        setItems((prev) => prev.map((p) => (p.id === id ? { ...p, qty: Math.max(1, qty) } : p))),
      remove: (id) => setItems((prev) => prev.filter((p) => p.id !== id)),
      clear: () => setItems([]),
    };
  }, [items, open]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
