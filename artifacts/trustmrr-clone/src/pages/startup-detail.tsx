import { useState, useEffect } from 'react';
import { useParams } from 'wouter';
import { mockStartups, mockFounders } from '@/lib/mockData';
import { formatCurrency, formatShortCurrency } from '@/lib/utils';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Link } from 'wouter';
import { Lock } from 'lucide-react';

export default function StartupDetail() {
  const { slug } = useParams();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const startup = mockStartups.find(s => s.slug === slug);
  
  if (!isMounted) return <div className="min-h-[500px]" />;
  
  if (!startup) {
    return (
      <div className="startup-card p-12 text-center">
        <h2 className="text-2xl font-bold">Startup not found</h2>
      </div>
    );
  }

  const founder = mockFounders.find(f => f.handle === startup.founderHandle);

  return (
    <div className="flex flex-col gap-8">
      
      {/* Header Profile */}
      <div className="startup-card p-8 relative overflow-hidden">
        {startup.forSale && (
          <div className="for-sale-ribbon">
            <span>FOR SALE</span>
          </div>
        )}
        
        <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
          <div 
            className="w-24 h-24 rounded-2xl flex items-center justify-center font-bold text-4xl shadow-md border border-black/5 shrink-0"
            style={{ backgroundColor: startup.logoColor, color: 'rgba(0,0,0,0.7)' }}
          >
            {startup.name.charAt(0)}
          </div>
          
          <div className="flex-1">
            <h1 className="text-4xl font-bold mb-2">{startup.name}</h1>
            <div className="flex items-center gap-3 text-sm mb-4">
              <span className="bg-muted px-2 py-1 rounded font-bold">{startup.category}</span>
              <span className="text-muted-foreground">Founded {startup.foundedYear}</span>
            </div>
            <p className="text-lg">{startup.description}</p>
          </div>
          
          {startup.forSale && (
            <div className="shrink-0 w-full md:w-auto">
              <button className="w-full md:w-auto px-8 py-3 bg-[#E6FFE8] border border-black border-dashed rounded-[10px] font-bold text-black shadow-sm hover:-translate-y-0.5 transition-transform flex items-center justify-center gap-2">
                <Lock className="w-4 h-4" /> Contact Seller
              </button>
            </div>
          )}
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="startup-card p-4">
          <div className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-1">MRR</div>
          <div className="text-2xl font-bold">{formatShortCurrency(startup.revenue)}</div>
        </div>
        <div className="startup-card p-4">
          <div className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-1">Growth (MoM)</div>
          <div className={`text-2xl font-bold ${startup.momGrowth > 0 ? 'text-green-600' : startup.momGrowth < 0 ? 'text-red-500' : ''}`}>
            {startup.momGrowth > 0 && '+'}
            {startup.momGrowth}%
          </div>
        </div>
        <div className="startup-card p-4">
          <div className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-1">Customers</div>
          <div className="text-2xl font-bold">{startup.customers.toLocaleString()}</div>
        </div>
        <div className="startup-card p-4">
          <div className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-1">TTM Profit</div>
          <div className="text-2xl font-bold">{startup.ttmProfit ? formatShortCurrency(startup.ttmProfit) : '—'}</div>
        </div>
        <div className="startup-card p-4 bg-[#FFF8E6] border-amber-200">
          <div className="text-xs text-black/60 font-bold uppercase tracking-wider mb-1">Asking Price</div>
          <div className="text-2xl font-bold">{startup.price ? formatShortCurrency(startup.price) : '—'}</div>
        </div>
        <div className="startup-card p-4">
          <div className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-1">Multiple</div>
          <div className="text-2xl font-bold">{startup.multiple ? `${startup.multiple.toFixed(1)}x` : '—'}</div>
        </div>
      </div>

      {/* Chart */}
      <div className="startup-card p-6">
        <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
          Verified MRR Chart
          <span className="text-xs font-normal text-muted-foreground border border-border px-2 py-0.5 rounded-full bg-muted/50">Stripe Verified</span>
        </h3>
        
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={startup.monthlyRevenueSeries} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E5E5" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#888' }} axisLine={false} tickLine={false} />
              <YAxis 
                tick={{ fontSize: 12, fill: '#888' }} 
                axisLine={false} 
                tickLine={false}
                tickFormatter={(value) => `$${value >= 1000 ? (value/1000) + 'k' : value}`}
              />
              <Tooltip 
                cursor={{ stroke: 'rgba(0,0,0,0.1)', strokeWidth: 1, strokeDasharray: '3 3' }} 
                contentStyle={{ borderRadius: '8px', border: '1px solid #0A0A0A', fontFamily: 'monospace', fontWeight: 'bold', backgroundColor: '#0A0A0A', color: 'white' }}
                formatter={(value: number) => [formatCurrency(value), 'MRR']}
              />
              {/* Jagged, un-smoothed line to match the requested look */}
              <Line 
                type="linear" 
                dataKey="value" 
                stroke="#0A0A0A" 
                strokeWidth={2} 
                dot={{ r: 3, fill: '#0A0A0A', strokeWidth: 0 }} 
                activeDot={{ r: 5, fill: '#5B5BFF', strokeWidth: 0 }} 
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Founder Profile Card */}
      {founder && (
        <div>
          <h3 className="font-bold text-lg mb-4">Listed by</h3>
          <Link href={`/founder/${founder.handle}`}>
            <div className="startup-card p-6 flex items-center gap-4 group cursor-pointer hover:bg-muted/10 transition-colors">
              <img 
                src={`https://api.dicebear.com/7.x/notionists/svg?seed=${founder.avatarSeed}`} 
                alt={founder.name}
                className="w-16 h-16 rounded-full bg-muted border border-border shrink-0"
              />
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-bold text-xl group-hover:underline">{founder.name}</h4>
                  <span className="text-sm text-[#5B5BFF]">{founder.twitter}</span>
                </div>
                <p className="text-muted-foreground text-sm">{founder.bio}</p>
              </div>
            </div>
          </Link>
        </div>
      )}

    </div>
  );
}