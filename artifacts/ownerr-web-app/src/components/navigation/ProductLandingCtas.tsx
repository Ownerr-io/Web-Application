import { Link, useLocation } from 'wouter';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useRequireAuth } from '@/lib/platform/requireAuth';
import type { ProductNavItem } from '@/routes/publicNavConfig';

type Props = {
  product: ProductNavItem;
  className?: string;
  compact?: boolean;
};

export function ProductLandingCtas({ product, className, compact }: Props) {
  const [, setLocation] = useLocation();
  const { requireSession } = useRequireAuth();

  const openApp = () => {
    requireSession(() => setLocation(product.appHref), { productPath: product.appHref });
  };

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <Button
        type="button"
        className={cn(
          'btn-platform-gradient gap-1.5 rounded-[8px] font-bold',
          compact ? 'h-9 px-4 text-xs' : 'h-11 px-6 text-sm',
        )}
        onClick={openApp}
      >
        {compact ? 'Open app' : product.openLabel}
        <ArrowRight className={cn(compact ? 'h-3.5 w-3.5' : 'h-4 w-4')} aria-hidden />
      </Button>
      <Button
        asChild
        variant="outline"
        className={cn(
          'rounded-[8px] border-[color:var(--terminal-border)] font-semibold',
          compact ? 'h-9 px-3 text-xs' : 'h-11 px-6 text-sm',
        )}
      >
        <Link href={product.learnMoreHref}>Learn more</Link>
      </Button>
    </div>
  );
}
