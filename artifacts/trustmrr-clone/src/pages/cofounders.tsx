import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'wouter';
import { mockFounders } from '@/lib/mockData';
import { Search } from 'lucide-react';

export default function Cofounders() {
  const [isMounted, setIsMounted] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const lookingForCofounder = mockFounders.filter(f => f.lookingForCofounder);
  
  const filtered = lookingForCofounder.filter(f => {
    const matchesSearch = f.name.toLowerCase().includes(search.toLowerCase()) || 
                          f.skills.some(s => s.toLowerCase().includes(search.toLowerCase())) ||
                          f.bio.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  if (!isMounted) return <div className="min-h-[500px]" />;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
        <div>
          <h1 className="text-3xl font-bold mb-2">Co-founders directory</h1>
          <p className="text-muted-foreground">Verified founders looking for their next partner.</p>
        </div>
        
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input 
            type="search" 
            placeholder="Search skills, names..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-9 pr-4 rounded-[8px] border border-border bg-white outline-none focus:ring-2 focus:ring-black focus:border-transparent font-mono text-sm shadow-sm"
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
                    src={`https://api.dicebear.com/7.x/notionists/svg?seed=${founder.avatarSeed}`} 
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