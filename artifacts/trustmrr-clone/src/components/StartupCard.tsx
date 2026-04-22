import { Link } from 'wouter';
import { Startup } from '@/lib/mockData';
import { formatCurrency, formatShortCurrency } from '@/lib/utils';

export function StartupCard({ startup }: { startup: Startup }) {
  return (
    <Link href={`/startup/${startup.slug}`}>
      <div className="startup-card p-5 h-full flex flex-col group cursor-pointer block">
        
        {startup.forSale && (
          <div className="for-sale-ribbon">
            <span>FOR SALE</span>
          </div>
        )}

        <div className="flex items-center gap-3 mb-4">
          <div 
            className="w-12 h-12 rounded-[8px] flex items-center justify-center font-bold text-xl shadow-sm border border-black/5"
            style={{ backgroundColor: startup.logoColor, color: 'rgba(0,0,0,0.7)' }}
          >
            {startup.name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0 pr-8">
            <h3 className="font-bold text-lg truncate group-hover:underline">{startup.name}</h3>
            <p className="text-xs text-muted-foreground truncate">{startup.category}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mt-auto pt-4 border-t border-border">
          <div>
            <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">MRR</div>
            <div className="font-bold">{formatShortCurrency(startup.revenue)}</div>
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">Price</div>
            <div className="font-bold">{startup.price ? formatShortCurrency(startup.price) : '—'}</div>
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">Multiple</div>
            <div className="font-bold">{startup.multiple ? `${startup.multiple.toFixed(1)}x` : '—'}</div>
          </div>
        </div>

      </div>
    </Link>
  );
}