import { Heart, MessageSquare, TrendingUp, Eye, Gift } from 'lucide-react';
import { type Startup } from '@/lib/mockData';
import { formatShortCurrency } from '@/lib/utils';

export function ForSaleBanner({ startup }: { startup: Startup }) {
  return (
    <div className="font-mono rounded-xl border border-amber-200/80 bg-amber-50/90 p-4 text-amber-950 dark:border-[#5c3a1a] dark:bg-[#2a1a0e] dark:text-[#fde8d7]">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex-1">
          <div className="mb-3 flex items-center gap-3">
            <p>
              This startup is for sale. Asking price:{' '}
              <span className="font-bold text-amber-950 dark:text-white">
                {formatShortCurrency(startup.price ?? 0)}
              </span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <InfoTag icon={TrendingUp}>
              {startup.multiple?.toFixed(1)}x revenue
            </InfoTag>
            <InfoTag icon={Eye}>
              {(startup.listingViews ?? 0).toLocaleString()} buyers saw this
              recently
            </InfoTag>
            <InfoTag icon={Gift}>10 offers received</InfoTag>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            className="flex h-10 items-center gap-2 rounded-md border border-amber-600/30 bg-amber-100/80 px-4 text-sm font-bold text-amber-900 transition-colors hover:bg-amber-200/90 hover:text-amber-950 active:bg-amber-200 dark:border-orange-500/50 dark:bg-transparent dark:text-orange-400 dark:hover:bg-orange-500/10 dark:hover:text-orange-100 dark:active:bg-orange-500/20"
          >
            <Heart className="h-4 w-4" />
            Save
          </button>
          <button
            type="button"
            className="flex h-10 items-center gap-2 rounded-md bg-orange-500 px-4 text-sm font-bold text-white transition-colors hover:bg-orange-400 hover:text-white focus-visible:ring-2 focus-visible:ring-orange-400/90 focus-visible:ring-offset-2 focus-visible:ring-offset-amber-50 active:bg-orange-600 dark:focus-visible:ring-orange-300/90 dark:focus-visible:ring-offset-[#2a1a0e]"
          >
            <MessageSquare className="h-4 w-4" />
            Contact Seller
          </button>
        </div>
      </div>
    </div>
  );
}

function InfoTag({
  icon: Icon,
  children,
}: {
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-200/80 px-3 py-1 text-xs text-amber-950 dark:bg-[#4a2a0a] dark:text-[#fde8d7]">
      <Icon className="h-3.5 w-3.5" />
      {children}
    </span>
  );
}