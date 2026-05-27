import { useState, useEffect, useMemo } from 'react';
import { Link } from 'wouter';
import { motion } from 'framer-motion';
import { Heart, MessageCircle, Share2 } from 'lucide-react';

import { whatsHappeningPosts, leaderboardMetricValue } from '@/lib/mockData';
import { buildFoundersFromStartups } from '@/lib/marketplace/founders';
import { usePublicStartups } from '@/hooks/marketplace/usePublicStartups';
import { mergeWithUserStartups, USER_STARTUPS_CHANGED_EVENT } from '@/lib/userStartups';
import { feedPostAvatarUrl, formatShortCurrency } from '@/lib/utils';
import { marketplacePath } from '@/lib/appPaths';
import { FeedSidebar } from '@/components/FeedSidebar';

export default function Feed() {
  const { data: publicStartups = [] } = usePublicStartups();
  const founders = useMemo(() => buildFoundersFromStartups(publicStartups), [publicStartups]);
  const [isMounted, setIsMounted] = useState(false);
  const [userStartupsTick, setUserStartupsTick] = useState(0);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    const bump = () => setUserStartupsTick((t) => t + 1);
    window.addEventListener(USER_STARTUPS_CHANGED_EVENT, bump);
    window.addEventListener('storage', bump);
    return () => {
      window.removeEventListener(USER_STARTUPS_CHANGED_EVENT, bump);
      window.removeEventListener('storage', bump);
    };
  }, []);

  const mergedStartups = useMemo(() => {
    void userStartupsTick;
    return mergeWithUserStartups(publicStartups);
  }, [publicStartups, userStartupsTick]);

  if (!isMounted) return <div className="min-h-[500px]" />;

  return (
    <div className="w-full min-w-0">
      <div className="mb-6 lg:mb-8">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">What&apos;s happening on Ownerr?</h1>
        <p className="mp-body mt-1 text-sm">
          Community updates, new listings, and founder milestones.
        </p>
      </div>

      <div className="flex w-full min-w-0 flex-col gap-8 lg:flex-row lg:items-stretch lg:gap-10">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4">
          {whatsHappeningPosts.map((post, index) => {
            const founder = founders.find((f) => f.handle === post.founderHandle);
            const startup = mergedStartups.find((s) => s.slug === post.startupSlug);
            const displayName = founder?.name ?? `@${post.founderHandle}`;
            const action = post.action ?? 'added';
            const headerAvatar = feedPostAvatarUrl(founder, post, startup);

            return (
              <motion.article
                key={post.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(index * 0.04, 0.3), duration: 0.25 }}
                className="rounded-[12px] border border-border bg-card p-4 text-card-foreground shadow-sm"
              >
                <header className="mb-2 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs">
                  <img
                    src={headerAvatar}
                    alt=""
                    width={24}
                    height={24}
                    loading="lazy"
                    decoding="async"
                    className="h-6 w-6 shrink-0 rounded-md border border-border/60 bg-muted object-cover"
                  />
                  <Link
                    href={marketplacePath(`/founder/${post.founderHandle}`)}
                    className="mp-link font-bold hover:underline"
                  >
                    {displayName}
                  </Link>
                  <span className="mp-muted">{action}</span>
                  <Link
                    href={marketplacePath(`/startup/${post.startupSlug}`)}
                    className="mp-link font-bold hover:underline"
                  >
                    {post.startupName}
                  </Link>
                  <span className="mp-muted">·</span>
                  <span className="mp-muted">{post.timestamp}</span>
                </header>

                {startup && (
                  <div className="mb-2 flex flex-wrap gap-1.5">
                    <span className="rounded bg-foreground/90 px-1.5 py-0.5 text-[10px] font-bold text-background tabular-nums">
                      {formatShortCurrency(leaderboardMetricValue(startup, 'mrr', 'current'))}/mo
                    </span>
                    <span className="rounded bg-foreground/90 px-1.5 py-0.5 text-[10px] font-bold text-background tabular-nums">
                      {formatShortCurrency(startup.revenue)} MRR
                    </span>
                    <span className="rounded bg-foreground/90 px-1.5 py-0.5 text-[10px] font-bold text-background tabular-nums">
                      {formatShortCurrency((startup.peakMrr ?? startup.revenue) * 18)} total
                    </span>
                  </div>
                )}

                <p className="mp-body whitespace-pre-line text-sm leading-relaxed">{post.text}</p>

                {post.hasImage && (
                  <div
                    className="mt-3 flex h-36 items-end rounded-lg border border-border p-3 text-xs font-bold"
                    style={{
                      background: post.imageGradient || 'linear-gradient(135deg,#222,#444)',
                      color: '#fff',
                    }}
                  >
                    <span className="rounded bg-black/40 px-2 py-0.5 backdrop-blur">
                      {post.imageCaption}
                    </span>
                  </div>
                )}

                <footer className="mp-muted mt-3 flex items-center gap-4 border-t border-border pt-3 text-xs">
                  <span className="mp-link inline-flex cursor-pointer items-center gap-1">
                    <Heart className="h-3.5 w-3.5" /> {post.likes}
                  </span>
                  <span className="mp-link inline-flex cursor-pointer items-center gap-1">
                    <MessageCircle className="h-3.5 w-3.5" /> {post.comments}
                  </span>
                  <span className="mp-link ml-auto inline-flex cursor-pointer items-center gap-1">
                    <Share2 className="h-3.5 w-3.5" />
                  </span>
                </footer>
              </motion.article>
            );
          })}
        </div>

        <FeedSidebar />
      </div>
    </div>
  );
}
