import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

type Ctx = {
  addOpen: boolean;
  setAddOpen: (open: boolean) => void;
  openAddStartup: () => void;
};

const AddStartupContext = createContext<Ctx | null>(null);

export function AddStartupProvider({ children }: { children: React.ReactNode }) {
  const [addOpen, setAddOpen] = useState(false);
  const openAddStartup = useCallback(() => setAddOpen(true), []);

  const value = useMemo(
    () => ({ addOpen, setAddOpen, openAddStartup }),
    [addOpen, openAddStartup],
  );

  return <AddStartupContext.Provider value={value}>{children}</AddStartupContext.Provider>;
}

export function useAddStartup() {
  const ctx = useContext(AddStartupContext);
  if (!ctx) {
    throw new Error('useAddStartup must be used within AddStartupProvider');
  }
  return ctx;
}
