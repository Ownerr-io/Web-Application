import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { mockFeedEvents } from '@/lib/mockData';

export default function Feed() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return <div className="min-h-[500px]" />;

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Activity Feed</h1>
        <p className="text-muted-foreground">The latest milestones, listings, and verifications.</p>
      </div>

      <div className="startup-card p-6">
        <div className="relative border-l-2 border-border ml-3 md:ml-4 space-y-8 pb-4">
          {mockFeedEvents.map((event, index) => (
            <motion.div 
              key={event.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1, duration: 0.3 }}
              className="relative pl-6 md:pl-8"
            >
              {/* Timeline dot */}
              <div className="absolute w-3 h-3 bg-black rounded-full -left-[7px] top-1.5 outline outline-4 outline-white"></div>
              
              <div className="flex flex-col gap-1">
                <span className="text-xs font-bold text-muted-foreground tracking-wider uppercase">
                  {event.timestamp}
                </span>
                <span className="text-base font-medium">
                  {event.content}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}