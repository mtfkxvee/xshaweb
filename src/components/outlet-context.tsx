import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { getOutlets } from "@/lib/erpnext/outlets";
import type { Outlet } from "@/lib/erpnext/types";

type OutletContextValue = {
  outlets: Outlet[];
  outletCode: string;
  selectedOutlet: Outlet | null;
  setOutletCode: (code: string) => void;
};

const OutletContext = createContext<OutletContextValue | null>(null);

const STORAGE_KEY = "xsha_outlet";

export function OutletProvider({ children }: { children: ReactNode }) {
  const { data: outlets } = useQuery({
    queryKey: ["outlets"],
    queryFn: () => getOutlets(),
    staleTime: 10 * 60_000,
  });

  const [outletCode, setOutletCodeState] = useState("");

  // Hydrate from localStorage only on the client, after mount, so SSR output
  // (no outlet selected) matches the initial client render.
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) setOutletCodeState(stored);
    } catch {
      // ignore
    }
  }, []);

  const setOutletCode = (code: string) => {
    setOutletCodeState(code);
    try {
      if (code) window.localStorage.setItem(STORAGE_KEY, code);
      else window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  const value = useMemo<OutletContextValue>(() => {
    // Only outlets linked to a warehouse can be used for stock filtering.
    const list = (outlets ?? []).filter((o) => o.warehouse);
    return {
      outlets: list,
      outletCode,
      selectedOutlet: list.find((o) => o.code === outletCode) ?? null,
      setOutletCode,
    };
  }, [outlets, outletCode]);

  return <OutletContext.Provider value={value}>{children}</OutletContext.Provider>;
}

export function useOutlet() {
  const ctx = useContext(OutletContext);
  if (!ctx) throw new Error("useOutlet must be used within OutletProvider");
  return ctx;
}
