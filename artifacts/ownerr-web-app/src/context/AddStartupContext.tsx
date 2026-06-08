import React, { createContext, useCallback, useContext, useMemo } from "react";
import { useLocation } from "wouter";
import { MARKETPLACE_ROUTES } from "@/routing/routeRegistry";

type Ctx = {
  openAddStartup: () => void;
};

const AddStartupContext = createContext<Ctx | null>(null);

export function AddStartupProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [, setLocation] = useLocation();

  const openAddStartup = useCallback(() => {
    setLocation(MARKETPLACE_ROUTES.sellerCompanyNew);
  }, [setLocation]);

  const value = useMemo(() => ({ openAddStartup }), [openAddStartup]);

  return (
    <AddStartupContext.Provider value={value}>
      {children}
    </AddStartupContext.Provider>
  );
}

export function useAddStartup() {
  const ctx = useContext(AddStartupContext);
  if (!ctx) {
    throw new Error("useAddStartup must be used within AddStartupProvider");
  }
  return ctx;
}
