import { Link } from 'wouter';
import * as Icons from 'lucide-react';
import { browseCategories } from '@/lib/mockData';
import { ThemeToggle } from './ThemeToggle';

function getIcon(name: string) {
  const Lib = Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>;
  const Comp = Lib[name] ?? Icons.Circle;
  return Comp;
}

export function BottomSection() {
  return (
    <div className="mt-24 pt-16 border-t border-border">
      {/* Buffett character + speech bubble */}
      <div className="flex flex-col items-center gap-6 mb-12">
        <div className="flex items-end gap-3">
          <img
            src="https://api.dicebear.com/7.x/personas/svg?seed=warren-buffett-trustmrr&backgroundColor=transparent"
            alt="$1 or $1,000,000?"
            className="w-24 h-24 rounded-full bg-card border border-border"
          />
          <Link
            href="/game"
            className="mb-3 rounded-full bg-foreground text-background px-4 py-2 text-sm font-bold relative hover:scale-105 transition-transform"
          >
            $1 or $1,000,000?
            <span className="absolute -left-2 bottom-2 w-3 h-3 bg-foreground rotate-45" />
          </Link>
        </div>

        <h2 className="text-3xl md:text-4xl font-bold text-center tracking-tight max-w-2xl">
          The database of verified startup revenues
        </h2>

        <div className="flex w-full max-w-xl mx-auto gap-2">
          <div className="relative flex-1">
            <Icons.Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder='"SaaS over $10K/mo"'
              className="w-full h-11 pl-10 pr-4 rounded-[8px] border border-border bg-card text-foreground outline-none focus:ring-2 focus:ring-ring text-sm"
            />
          </div>
          <button className="h-11 px-5 bg-card text-foreground font-bold border border-border rounded-[10px] whitespace-nowrap hover:-translate-y-0.5 transition-transform inline-flex items-center gap-1">
            <Icons.Plus className="w-4 h-4" /> Add startup
          </button>
        </div>
      </div>

      {/* Browse by category */}
      <div className="my-16">
        <h3 className="text-center text-base font-bold mb-6">Browse by category</h3>
        <div className="flex flex-wrap justify-center gap-2 max-w-3xl mx-auto">
          {browseCategories.map((c) => {
            const Icon = getIcon(c.icon);
            return (
              <Link
                key={c.label}
                href="/acquire"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-card hover:bg-muted text-sm transition-colors"
              >
                <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                <span>{c.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* 4-column footer */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-16 text-sm">
        <FooterCol title="Navigation" items={['Buy/Sell Startups','Dashboard','Feed','Find Co-founders','Search','Stats','Olympics','Categories','Tech Stack','Recently Added','Top 100 Startups','Newsletter','$1 vs $1,000,000 Startup','APA, LOI, NDA templates','FAQ']} />
        <FooterCol title="Browse startups" items={['Artificial Intelligence','SaaS','Developer Tools','Fintech','Marketing','E-commerce','Productivity','Design Tools','No-Code','Analytics','OpenClaw']} />
        <FooterCol title="API" items={['Documentation','List startups','Get startup','Get API key']} />
        <FooterCol title="From the maker of TrustMRR" items={['Newsletter for entrepreneurs','CodeFast','ShipFast','DataFast','ByeDispute','IndiePage','ZenVoice','GamifyList','Unicorn','WorkbookPDF','HabitsGarden']} />
      </div>

      <div className="mt-12 pt-6 border-t border-border flex flex-col md:flex-row gap-4 items-center justify-between text-xs text-muted-foreground">
        <div>Built with care by indie founders. Not affiliated with Stripe. © 2026 TrustMRR</div>
        <div className="flex items-center gap-3">
          <a href="#" className="hover:text-foreground">About</a>
          <a href="#" className="hover:text-foreground">Methodology</a>
          <a href="#" className="hover:text-foreground">Twitter</a>
          <a href="#" className="hover:text-foreground">RSS</a>
          <a href="#" className="hover:text-foreground">Privacy</a>
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
}

function FooterCol({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h4 className="font-bold mb-3">{title}</h4>
      <ul className="space-y-1.5 text-muted-foreground">
        {items.map((i) => (
          <li key={i}><a href="#" className="hover:text-foreground transition-colors">{i}</a></li>
        ))}
      </ul>
    </div>
  );
}
