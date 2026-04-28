import { Link, useLocation } from 'wouter';
import { useMockSession } from '@/context/MockSessionContext';
import { Startup } from '@/lib/mockData';
import { formatShortCurrency } from '@/lib/utils';
import { StartupTripleScores } from '@/components/StartupTripleScores';
import { Button } from '@/components/ui/button';

function CardBody({ startup, logoColor }: { startup: Startup; logoColor: string }) {
  return (
    <>


      <div className="mb-4 flex items-center gap-3">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[8px] border border-black/10 text-xl font-bold dark:border-white/12"
          style={{ backgroundColor: logoColor }}
        >
          <img
            src={`https://api.dicebear.com/7.x/shapes/svg?seed=${startup.name}`}
            alt={`${startup.name} avatar`}
            className="h-8 w-8"
          />
        </div>
        <div className="min-w-0 flex-1 pr-8">
          <h3 className="startup-listing-title truncate text-base group-hover:underline">{startup.name}</h3>
          <p className="startup-listing-category truncate">{startup.category}</p>
        </div>
      </div>

      <div className="startup-listing-metrics mt-auto grid grid-cols-3 gap-2">
        <div className="min-w-0 text-center">
          <div className="startup-listing-metric-label">Revenue</div>
          <div className="startup-listing-metric-value">{formatShortCurrency(startup.revenue)}</div>
        </div>
        <div className="min-w-0 text-center">
          <div className="startup-listing-metric-label">Price</div>
          <div className="startup-listing-metric-value">
            {startup.price != null ? formatShortCurrency(startup.price) : '—'}
          </div>
        </div>
        <div className="min-w-0 text-center">
          <div className="startup-listing-metric-label">Multiple</div>
          <div className="startup-listing-metric-value">
            {startup.multiple != null ? `${startup.multiple.toFixed(1)}x` : '—'}
          </div>
        </div>
      </div>
      <div className="mt-3 border-t border-border/80 pt-3">
        <StartupTripleScores startup={startup} />
      </div>
    </>
  );
}

export function StartupCard({ startup, showBidCta }: { startup: Startup; showBidCta?: boolean }) {
  const logoColor = startup.logoColor ?? '#E6EAFF';
  const bidHref = `/acquire?listing=${encodeURIComponent(startup.slug)}`;
  const { isAuthenticated, openAuthDialog } = useMockSession();
  const [, setLocation] = useLocation();

  if (showBidCta && startup.forSale) {
    return (
      <div className="startup-listing-card group flex flex-col">
        <Link href={`/startup/${startup.slug}`} className="block min-h-0 flex-1">
          <CardBody startup={startup} logoColor={logoColor} />
        </Link>
        <div className="mt-3 border-t border-border/80 px-1 pb-1 pt-3">
          <Button
            type="button"
            size="sm"
            className="h-9 w-full font-bold"
            onClick={() => {
              if (isAuthenticated) {
                setLocation(bidHref);
              } else {
                openAuthDialog();
              }
            }}
          >
            Bid
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Link href={`/startup/${startup.slug}`} className="block">
      <div className="startup-listing-card group flex flex-col">
        <CardBody startup={startup} logoColor={logoColor} />
      </div>
    </Link>
  );
}