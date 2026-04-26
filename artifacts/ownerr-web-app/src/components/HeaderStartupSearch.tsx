import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'wouter';
import { Search } from 'lucide-react';
import { mockStartups } from '@/lib/mockData';
import { mergeWithUserStartups, USER_STARTUPS_CHANGED_EVENT } from '@/lib/userStartups';
import { cn } from '@/lib/utils';

export function HeaderStartupSearch({ className }: { className?: string }) {
  const [, setLocation] = useLocation();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [userTick, setUserTick] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const bump = () => setUserTick((t) => t + 1);
    window.addEventListener(USER_STARTUPS_CHANGED_EVENT, bump);
    window.addEventListener('storage', bump);
    return () => {
      window.removeEventListener(USER_STARTUPS_CHANGED_EVENT, bump);
      window.removeEventListener('storage', bump);
    };
  }, []);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const startups = useMemo(
    () =>
      [...mergeWithUserStartups(mockStartups)].sort((a, b) =>
        a.name.localeCompare(b.name),
      ),
    [userTick],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return startups;
    return startups.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.slug.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q),
    );
  }, [startups, query]);

  function pick(slug: string) {
    setLocation(`/startup/${slug}`);
    setQuery('');
    setOpen(false);
  }

  return (
    <div ref={wrapRef} className={cn('relative flex-1', className)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
      <input
        type="search"
        role="combobox"
        aria-expanded={open}
        aria-controls="startup-search-results"
        autoComplete="off"
        placeholder="Search startups, category, or “SaaS $10K/mo”"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        className="h-11 w-full min-w-0 rounded-[8px] border border-border bg-card pl-10 pr-4 text-xs text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring sm:text-sm shadow-sm"
      />
      {open && filtered.length > 0 && (
        <div
          id="startup-search-results"
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-72 overflow-auto rounded-[8px] border border-border bg-popover text-popover-foreground shadow-lg"
        >
          {filtered.slice(0, 40).map((s) => (
            <button
              key={s.slug}
              type="button"
              role="option"
              className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm hover:bg-accent hover:text-accent-foreground transition-colors border-b border-border/60 last:border-0"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(s.slug)}
            >
              <div
                className="w-9 h-9 rounded-[6px] flex items-center justify-center font-bold text-sm border border-black/5 shrink-0"
                style={{ backgroundColor: s.logoColor, color: 'rgba(0,0,0,0.75)' }}
              >
                {s.name.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-bold truncate">{s.name}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {s.category}
                  {s.forSale ? ' · For sale' : ''}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
      {open && query.trim() && filtered.length === 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-[8px] border border-border bg-popover px-3 py-4 text-sm text-muted-foreground shadow-lg text-center">
          No companies match “{query.trim()}”.
        </div>
      )}
    </div>
  );
}
