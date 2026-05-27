import type { ReactNode } from 'react';
import type { AppSlug } from '@workspace/api-zod';
import { useOwnerr } from '@/context/ownerr/OwnerrProvider';
import { useMarketplace } from '@/context/marketplace/MarketplaceProvider';
import { useOwnerrNetwork } from '@/context/ownerr-network/OwnerrNetworkProvider';
import { ProductShellFallback } from '@/components/product/ProductShellFallback';

const LABELS: Record<AppSlug, string> = {
  ownerr_os: 'OWNERR OS',
  marketplace: 'Marketplace',
  ownerr_network: 'Ownerr Network',
};

function OwnerrReady({ children }: { children: ReactNode }) {
  const { loading, error, reload } = useOwnerr();
  const label = LABELS.ownerr_os;
  if (loading) return <ProductShellFallback mode="loading" productLabel={label} />;
  if (error) {
    return (
      <ProductShellFallback
        mode="error"
        productLabel={label}
        message={error}
        onRetry={() => void reload()}
      />
    );
  }
  return <>{children}</>;
}

function MarketplaceReady({ children }: { children: ReactNode }) {
  const { loading, error, reload } = useMarketplace();
  const label = LABELS.marketplace;
  if (loading) return <ProductShellFallback mode="loading" productLabel={label} />;
  if (error) {
    return (
      <ProductShellFallback
        mode="error"
        productLabel={label}
        message={error}
        onRetry={() => void reload()}
      />
    );
  }
  return <>{children}</>;
}

function OwnerrNetworkReady({ children }: { children: ReactNode }) {
  const { loading, error, reload } = useOwnerrNetwork();
  const label = LABELS.ownerr_network;
  if (loading) return <ProductShellFallback mode="loading" productLabel={label} />;
  if (error) {
    return (
      <ProductShellFallback
        mode="error"
        productLabel={label}
        message={error}
        onRetry={() => void reload()}
      />
    );
  }
  return <>{children}</>;
}

export function ProductAppReady({ product, children }: { product: AppSlug; children: ReactNode }) {
  if (product === 'ownerr_os') return <OwnerrReady>{children}</OwnerrReady>;
  if (product === 'marketplace') return <MarketplaceReady>{children}</MarketplaceReady>;
  return <OwnerrNetworkReady>{children}</OwnerrNetworkReady>;
}
