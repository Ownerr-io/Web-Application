import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { AppSlug } from '@workspace/api-zod';
import {
  clearActiveProduct,
  isAppSlug,
  persistActiveProduct,
  readActiveProduct,
} from '@/lib/auth/productLock';

type ActiveProductContextValue = {
  activeProduct: AppSlug | null;
  setActiveProduct: (slug: AppSlug) => void;
  clear: () => void;
};

const ActiveProductContext = createContext<ActiveProductContextValue | null>(null);

function sanitizeStoredProduct(): AppSlug | null {
  const stored = readActiveProduct();
  if (stored && isAppSlug(stored)) return stored;
  if (stored) clearActiveProduct();
  return null;
}

export function ActiveProductProvider({ children }: { children: ReactNode }) {
  const [activeProduct, setActiveProductState] = useState<AppSlug | null>(() => sanitizeStoredProduct());

  const setActiveProduct = useCallback((slug: AppSlug) => {
    if (!isAppSlug(slug)) return;
    persistActiveProduct(slug);
    setActiveProductState(slug);
  }, []);

  const clear = useCallback(() => {
    clearActiveProduct();
    setActiveProductState(null);
  }, []);

  const value = useMemo(() => ({ activeProduct, setActiveProduct, clear }), [activeProduct, setActiveProduct, clear]);

  return <ActiveProductContext.Provider value={value}>{children}</ActiveProductContext.Provider>;
}

export function useActiveProduct(): ActiveProductContextValue {
  const ctx = useContext(ActiveProductContext);
  if (!ctx) throw new Error('useActiveProduct must be used within ActiveProductProvider');
  return ctx;
}

