import { useEffect, useState } from 'react';
import { StatsDashboard } from '@/components/stats/StatsDashboard';

export default function Stats() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return <div className="min-h-[500px] bg-background" />;

  return (
    <div className="w-full min-w-0 bg-background px-0 py-1 text-foreground">
      <StatsDashboard />
    </div>
  );
}
