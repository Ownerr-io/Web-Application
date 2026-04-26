import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'wouter';
import { mockFounders } from '@/lib/mockData';
import { founderAvatarUrl } from '@/lib/utils';
import { Search } from 'lucide-react';

export default function Cofounders() {
  const [isMounted, setIsMounted] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const lookingForCofounder = mockFounders.filter(f => f.lookingForCofounder);
  
  const q = search.trim().toLowerCase();
  const filtered = lookingForCofounder.filter((f) => {
    if (!q) return true;
    return (
      f.name.toLowerCase().includes(q) ||
      f.handle.toLowerCase().includes(q) ||
      f.twitter.toLowerCase().includes(q) ||
      f.skills.some((s) => s.toLowerCase().includes(q)) ||
      f.bio.toLowerCase().includes(q)
    );
  });

  if (!isMounted) return <div className="min-h-[500px]" />;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
        <div>
          <h1 className="text-3xl font-bold mb-2">Co-founders directory</h1>
          <p className="text-muted-foreground">Verified founders looking for their next partner.</p>
        </div>
        
        <div className="relative w-full max-w-md md:max-w-lg md:shrink-0 md:ml-auto">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            type="search"
            autoComplete="off"
            placeholder='Search by name, skill, or bio, e.g. "Next.js"'
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-11 w-full rounded-[8px] border border-border bg-card pl-10 pr-4 text-sm text-foreground shadow-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((founder, index) => (
          <motion.div
            key={founder.handle}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05, duration: 0.2 }}
          >
            <Link href={`/founder/${founder.handle}`}>
              <div className="startup-card p-5 h-full flex flex-col group cursor-pointer">
                <div className="flex items-center gap-3 mb-4">
                  <img 
                    src={founderAvatarUrl(founder.avatarSeed)} 
                    alt={founder.name}
                    className="w-12 h-12 rounded-full bg-muted border border-border"
                  />
                  <div>
                    <h3 className="font-bold text-lg group-hover:underline leading-tight">{founder.name}</h3>
                    <p className="text-xs text-muted-foreground">{founder.twitter}</p>
                  </div>
                </div>
                
                <p className="text-sm mb-4 flex-1">{founder.bio}</p>
                
                <div className="flex flex-wrap gap-1 mt-auto pt-4 border-t border-border">
                  {founder.skills.map(skill => (
                    <span key={skill} className="text-[10px] bg-muted/50 border border-border px-2 py-1 rounded font-bold uppercase tracking-wider">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="startup-card p-12 text-center flex flex-col items-center justify-center bg-muted/10 border-dashed">
          <div className="text-4xl mb-4">🔍</div>
          <h3 className="font-bold text-lg mb-2">No founders found</h3>
          <p className="text-muted-foreground text-sm">Try searching for different skills.</p>
        </div>
      )}
    </div>
  );
}