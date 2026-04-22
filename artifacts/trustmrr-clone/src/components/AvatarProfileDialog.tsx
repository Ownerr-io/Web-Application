import { X, Globe, Monitor, Smartphone, Chrome } from 'lucide-react';
import type { Visitor } from '@/lib/mockData';

export function AvatarProfileDialog({ visitor, onClose }: { visitor: Visitor | null; onClose: () => void }) {
  if (!visitor) return null;

  const conversion = Math.max(0, Math.min(100, visitor.conversionLikelihood));

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[420px] rounded-2xl border border-white/10 bg-[#0e1428] text-white shadow-2xl p-5 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-white/70 hover:text-white"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-start gap-4 mb-4">
          <img
            src={`https://api.dicebear.com/7.x/notionists/svg?seed=${visitor.avatarSeed}`}
            alt={visitor.name}
            className="w-16 h-16 rounded-full bg-white/10 ring-2 ring-white/20"
          />
          <div className="flex-1 min-w-0 pt-1">
            <h3 className="text-lg font-bold truncate">{visitor.name}</h3>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs mt-2 text-white/80">
              <span className="inline-flex items-center gap-1.5">
                <span className="text-base leading-none">{visitor.countryFlag}</span>
                <span>{visitor.city}</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-white/20" />
                <span>{visitor.os}</span>
              </span>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs mt-1 text-white/80">
              <span className="inline-flex items-center gap-1.5">
                {visitor.device === 'Desktop' ? <Monitor className="w-3 h-3" /> : <Smartphone className="w-3 h-3" />}
                <span>{visitor.device}</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Chrome className="w-3 h-3" />
                <span>{visitor.browser}</span>
              </span>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 pt-4 space-y-2.5 text-sm">
          <Row label="Referrer" value={
            <span className="inline-flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-white/70" /> {visitor.referrer}
            </span>
          } />
          <Row label="Current URL" value={<span className="font-mono text-xs">{visitor.currentUrl}</span>} />
          <Row label="Session time" value={visitor.sessionTime} />
          <Row label="Total visits" value={String(visitor.totalVisits)} />
        </div>

        <div className="mt-5">
          <div className="flex items-center justify-between mb-2 text-sm">
            <span className="text-white/80">Conversion likelihood:</span>
            <span className="font-bold text-white">+{conversion}% <span className="text-white/60 font-normal">vs. avg</span></span>
          </div>
          <div className="relative h-2 rounded-full overflow-hidden bg-white/10">
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to right,#3b82f6,#a855f7,#ef4444)' }} />
            <div className="absolute -top-1.5 w-4 h-4 rounded-full bg-white border-2 border-orange-400 shadow"
              style={{ left: `calc(${conversion}% - 8px)` }} />
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-white/80">Estimated value:</span>
          <span className="font-bold text-emerald-400">${visitor.estimatedValue.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-white/70">{label}:</span>
      <span className="text-white">{value}</span>
    </div>
  );
}
