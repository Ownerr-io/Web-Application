import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import { mockStartups, leaderboardStartups } from '@/lib/mockData';
import { formatCurrency } from '@/lib/utils';

export default function Stats() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return <div className="min-h-[500px]" />;

  // Prepare category data
  const categoryCounts: Record<string, number> = {};
  mockStartups.forEach(s => {
    categoryCounts[s.category] = (categoryCounts[s.category] || 0) + 1;
  });
  
  const categoryData = Object.entries(categoryCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Prepare MRR distribution data
  const mrrBrackets = [
    { name: '< $5k', max: 5000, count: 0 },
    { name: '$5k-$10k', max: 10000, count: 0 },
    { name: '$10k-$50k', max: 50000, count: 0 },
    { name: '$50k-$100k', max: 100000, count: 0 },
    { name: '> $100k', max: Infinity, count: 0 }
  ];

  mockStartups.forEach(s => {
    for (let i = 0; i < mrrBrackets.length; i++) {
      if (s.revenue < mrrBrackets[i].max) {
        mrrBrackets[i].count++;
        break;
      }
    }
  });

  const totalMrr = leaderboardStartups.reduce((sum, s) => sum + s.revenue, 0);
  const avgMrr = totalMrr / mockStartups.length;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Platform Stats</h1>
        <p className="text-muted-foreground">Aggregated data from all verified startups on TrustMRR.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="startup-card p-6 flex flex-col justify-center bg-[#E6F5FF]"
        >
          <div className="text-sm text-black/60 font-bold mb-2 uppercase tracking-wider">Total Verified MRR</div>
          <div className="text-4xl font-bold">{formatCurrency(totalMrr)}</div>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="startup-card p-6 flex flex-col justify-center"
        >
          <div className="text-sm text-muted-foreground font-bold mb-2 uppercase tracking-wider">Average MRR</div>
          <div className="text-4xl font-bold">{formatCurrency(avgMrr)}</div>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="startup-card p-6 flex flex-col justify-center bg-[#FFE6F1]"
        >
          <div className="text-sm text-black/60 font-bold mb-2 uppercase tracking-wider">Acquisition Volume</div>
          <div className="text-4xl font-bold">
            {formatCurrency(mockStartups.filter(s => s.price).reduce((sum, s) => sum + (s.price || 0), 0))}
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="startup-card p-6"
        >
          <h3 className="font-bold mb-6 text-lg">Top Categories</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E5E5" />
                <XAxis type="number" tick={{ fontSize: 12, fill: '#888' }} axisLine={false} tickLine={false} />
                <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 12, fill: '#333' }} axisLine={false} tickLine={false} />
                <Tooltip 
                  cursor={{ fill: 'rgba(0,0,0,0.05)' }} 
                  contentStyle={{ borderRadius: '8px', border: '1px solid #E5E5E5', fontFamily: 'monospace', fontWeight: 'bold' }}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? '#0A0A0A' : '#E5E5E5'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          className="startup-card p-6"
        >
          <h3 className="font-bold mb-6 text-lg">MRR Distribution</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mrrBrackets} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E5E5" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#888' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#888' }} axisLine={false} tickLine={false} />
                <Tooltip 
                  cursor={{ fill: 'rgba(0,0,0,0.05)' }} 
                  contentStyle={{ borderRadius: '8px', border: '1px solid #E5E5E5', fontFamily: 'monospace', fontWeight: 'bold' }}
                />
                <Bar dataKey="count" fill="#E6FFE8" stroke="#0A0A0A" strokeWidth={1} strokeDasharray="2 2" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>
    </div>
  );
}