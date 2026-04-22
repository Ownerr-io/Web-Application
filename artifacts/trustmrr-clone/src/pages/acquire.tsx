import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { mockStartups } from '@/lib/mockData';
import { StartupCard } from '@/components/StartupCard';
import { Search } from 'lucide-react';

const CATEGORIES = ['All', 'SaaS', 'Mobile Apps', 'Developer Tools', 'Marketing', 'Artificial Intelligence', 'Content Creation'];

export default function Acquire() {
  const [isMounted, setIsMounted] = useState(false);
  const [activeCategory, setActiveCategory] = useState('All');
  const [search, setSearch] = useState('');

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const forSale = mockStartups.filter(s => s.forSale);
  
  const filtered = forSale.filter(s => {
    const matchesCategory = activeCategory === 'All' || s.category === activeCategory;
    const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) || 
                          s.description.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  if (!isMounted) return <div className="min-h-[500px]" />;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
        <div>
          <h1 className="text-3xl font-bold mb-2">Acquire a startup</h1>
          <p className="text-muted-foreground">Browse verified startups that are currently open to acquisition offers.</p>
        </div>
        
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input 
            type="search" 
            placeholder="Search listings..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-9 pr-4 rounded-[8px] border border-border bg-white outline-none focus:ring-2 focus:ring-black focus:border-transparent font-mono text-sm shadow-sm"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-1.5 rounded-full text-sm font-bold transition-colors ${
              activeCategory === cat 
                ? 'bg-black text-white' 
                : 'bg-white border border-border hover:bg-muted/50'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((startup, index) => (
          <motion.div
            key={startup.slug}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05, duration: 0.2 }}
          >
            <StartupCard startup={startup} />
          </motion.div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="startup-card p-12 text-center flex flex-col items-center justify-center bg-muted/10 border-dashed">
          <div className="text-4xl mb-4">👻</div>
          <h3 className="font-bold text-lg mb-2">No startups found</h3>
          <p className="text-muted-foreground text-sm">Try adjusting your filters to see more results.</p>
          <button 
            onClick={() => { setActiveCategory('All'); setSearch(''); }}
            className="mt-4 px-4 py-2 bg-white border border-border rounded-[8px] font-bold text-sm shadow-sm hover:bg-muted/50"
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}