import { useState, useEffect } from 'react';
import { useParams } from 'wouter';
import { mockFounders, mockStartups } from '@/lib/mockData';
import { StartupCard } from '@/components/StartupCard';
import { motion } from 'framer-motion';

export default function FounderProfile() {
  const { handle } = useParams();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const founder = mockFounders.find(f => f.handle === handle);
  
  if (!isMounted) return <div className="min-h-[500px]" />;
  
  if (!founder) {
    return (
      <div className="startup-card p-12 text-center">
        <h2 className="text-2xl font-bold">Founder not found</h2>
      </div>
    );
  }

  const startups = founder.startupSlugs
    .map(slug => mockStartups.find(s => s.slug === slug))
    .filter(Boolean) as typeof mockStartups;

  const totalMrr = startups.reduce((sum, s) => sum + s.revenue, 0);

  return (
    <div className="flex flex-col gap-8">
      
      <div className="startup-card p-8 md:p-12 relative overflow-hidden bg-gradient-to-br from-white to-muted/30">
        <div className="flex flex-col md:flex-row gap-8 items-center md:items-start text-center md:text-left">
          
          <div className="relative">
            <img 
              src={`https://api.dicebear.com/7.x/notionists/svg?seed=${founder.avatarSeed}`} 
              alt={founder.name}
              className="w-32 h-32 rounded-full bg-white border-4 border-white shadow-md z-10 relative"
            />
            {founder.lookingForCofounder && (
              <div className="absolute -bottom-2 -right-2 bg-[#E6FFE8] text-black border border-black text-[10px] font-bold px-2 py-1 rounded-full z-20 whitespace-nowrap shadow-sm">
                Open to co-founding
              </div>
            )}
          </div>
          
          <div className="flex-1">
            <h1 className="text-4xl font-bold mb-2">{founder.name}</h1>
            <a href={`https://twitter.com/${founder.twitter.replace('@', '')}`} target="_blank" rel="noreferrer" className="text-[#5B5BFF] hover:underline font-bold mb-4 inline-block">
              {founder.twitter}
            </a>
            
            <p className="text-lg text-muted-foreground mb-6 max-w-2xl">{founder.bio}</p>
            
            <div className="flex flex-wrap justify-center md:justify-start gap-2">
              {founder.skills.map(skill => (
                <span key={skill} className="text-xs bg-white border border-border px-3 py-1.5 rounded-full font-bold uppercase tracking-wider shadow-sm">
                  {skill}
                </span>
              ))}
            </div>
          </div>

        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Startups by {founder.name.split(' ')[0]}</h2>
          <div className="text-sm font-bold text-muted-foreground">
            Total MRR: <span className="text-black ml-1">${(totalMrr).toLocaleString()}</span>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {startups.map((startup, index) => (
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
      </div>

    </div>
  );
}