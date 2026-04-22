import { useEffect, useState } from 'react';
import { Star } from 'lucide-react';
import { mockVisitors, type Visitor } from '@/lib/mockData';
import { AvatarProfileDialog } from './AvatarProfileDialog';

const visitFeed = [
  { name: 'chocolate gorilla', flag: '🇺🇸', country: 'United States', url: '/startup/postpeer' },
  { name: 'sapphire fowl',     flag: '🇺🇸', country: 'United States', url: '/startup/vidai-llc' },
  { name: 'white urial',       flag: '🇹🇷', country: 'Turkey',        url: '/startup/ploxto' },
  { name: 'aida dunder',       flag: '🇸🇪', country: 'Sweden',        url: '/' },
  { name: 'priya kumar',       flag: '🇮🇳', country: 'India',         url: '/acquire' },
  { name: 'leo silva',         flag: '🇧🇷', country: 'Brazil',        url: '/stats' },
  { name: 'eva schmidt',       flag: '🇩🇪', country: 'Germany',       url: '/feed' },
];

export function LiveGlobe() {
  const [selected, setSelected] = useState<Visitor | null>(null);
  const [visitorCount, setVisitorCount] = useState(55);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setVisitorCount((n) => Math.max(40, Math.min(80, n + Math.round((Math.random() - 0.5) * 4))));
      setTick((t) => t + 1);
    }, 2500);
    return () => clearInterval(id);
  }, []);

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Live visitors</h2>
        <span className="text-sm text-muted-foreground">Real-time activity from around the world</span>
      </div>

      <div className="relative w-full overflow-hidden rounded-[14px] border border-border bg-[#070b1c]" style={{ aspectRatio: '16 / 9' }}>
        {/* Stars background */}
        <div className="absolute inset-0 globe-stars" />

        {/* The globe sphere */}
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            width: 'min(72%, 520px)',
            aspectRatio: '1/1',
            background:
              'radial-gradient(circle at 35% 30%, #1e3a8a 0%, #1e293b 45%, #0f172a 70%, #050a18 100%)',
            boxShadow: 'inset -30px -40px 80px rgba(0,0,0,0.55), 0 0 80px rgba(59,130,246,0.18)',
          }}
        >
          {/* faux continents */}
          <div className="absolute inset-0 rounded-full overflow-hidden opacity-40 mix-blend-screen pointer-events-none"
            style={{
              backgroundImage:
                "radial-gradient(ellipse 18% 12% at 28% 32%, #6b7280, transparent 60%), radial-gradient(ellipse 14% 10% at 50% 38%, #6b7280, transparent 60%), radial-gradient(ellipse 22% 16% at 65% 50%, #6b7280, transparent 60%), radial-gradient(ellipse 12% 8% at 78% 65%, #6b7280, transparent 60%), radial-gradient(ellipse 16% 10% at 22% 60%, #6b7280, transparent 60%)",
            }}
          />
          {/* meridian lines */}
          <div className="absolute inset-0 rounded-full overflow-hidden pointer-events-none opacity-25"
            style={{
              backgroundImage:
                'repeating-linear-gradient(90deg, transparent 0 24px, rgba(148,163,184,0.25) 24px 25px), repeating-linear-gradient(0deg, transparent 0 24px, rgba(148,163,184,0.25) 24px 25px)',
            }}
          />
        </div>

        {/* Visitor avatar markers */}
        {mockVisitors.map((v) => (
          <button
            key={v.id}
            onClick={() => setSelected(v)}
            className="absolute -translate-x-1/2 -translate-y-1/2 group"
            style={{ top: `${v.top}%`, left: `${v.left}%` }}
            aria-label={`Visitor ${v.name}`}
          >
            <div className="relative">
              <img
                src={`https://api.dicebear.com/7.x/notionists/svg?seed=${v.avatarSeed}`}
                alt={v.name}
                className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-white/10 ring-2 ring-white/30 group-hover:ring-white transition-all group-hover:scale-110 shadow-lg"
              />
              <span
                className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-[#070b1c]"
                style={{ backgroundColor: v.dotColor }}
              />
            </div>
          </button>
        ))}

        {/* Top-left stats overlay */}
        <div className="absolute top-3 left-3 sm:top-4 sm:left-4 max-w-[300px] rounded-xl border border-white/10 bg-black/60 backdrop-blur p-3 text-white text-xs space-y-2">
          <div className="flex items-center gap-2">
            <span className="font-bold flex items-center gap-1.5"><Star className="w-3.5 h-3.5 fill-orange-400 text-orange-400" />TrustMRR Live</span>
            <span className="text-white/50">|</span>
            <span className="text-orange-300 font-bold tracking-wider">REAL-TIME</span>
          </div>
          <div className="text-[13px]">
            <span className="text-emerald-400 font-bold">●</span> {visitorCount} visitors on{' '}
            <span className="font-bold">trustmrr.com</span>{' '}
            <span className="text-white/60">(est. value: <span className="text-emerald-400 font-bold">${(visitorCount * 0.09).toFixed(0)}</span>)</span>
          </div>
          <Pills label="Referrers" items={[`Direct (${33 + (tick % 3)})`, `Google (${14 + (tick % 2)})`, 'android.gms']} />
          <Pills label="Countries" items={[`🇮🇳 India (${15})`, `🇺🇸 United States (${7})`, `🇻🇳 Vietnam`]} />
          <Pills label="Devices"   items={[`💻 Desktop (${38})`, `📱 Mobile (${17})`]} />
        </div>

        {/* Bottom-left visit feed */}
        <div className="absolute bottom-3 left-3 sm:bottom-4 sm:left-4 max-w-[320px] rounded-xl border border-white/10 bg-black/60 backdrop-blur p-3 text-white text-[11px] space-y-1.5 hidden sm:block">
          {visitFeed.slice(0, 4).map((f, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0" />
              <div className="leading-tight">
                <span className="font-bold">{f.name}</span>{' '}
                <span className="text-white/60">from</span>{' '}
                <span>{f.flag} {f.country}</span>{' '}
                <span className="text-white/60">visited</span>{' '}
                <span className="font-mono">{f.url}</span>
                <div className="text-white/40 text-[10px] mt-0.5">{(i + 1) * 2 + 4} minutes ago</div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom-right badge */}
        <div className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/60 backdrop-blur px-3 py-1 text-white text-[11px]">
          <Star className="w-3 h-3 fill-orange-400 text-orange-400" />
          <span>Powered by TrustMRR Live</span>
        </div>
      </div>

      <AvatarProfileDialog visitor={selected} onClose={() => setSelected(null)} />
    </section>
  );
}

function Pills({ label, items }: { label: string; items: string[] }) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className="text-white/50 w-[68px] shrink-0">{label}</span>
      {items.map((it, i) => (
        <span key={i} className="rounded-full bg-white/10 border border-white/10 px-2 py-0.5 text-[11px] whitespace-nowrap">
          {it}
        </span>
      ))}
    </div>
  );
}
