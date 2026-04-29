import { Heart, Link2, MessageCircle } from 'lucide-react';
import { Link } from 'wouter';
import { FOUNDER_SOLD_POSTS } from '@/lib/acquireMarketplaceData';
import { founderAvatarUrl } from '@/lib/utils';

function PostBody({ text }: { text: string }) {
  const chunks = text.split(/(@[\w_]+)/g);
  return (
    <p className="whitespace-pre-wrap font-mono text-[15px] leading-normal text-foreground/90 dark:text-[#e7e9ea]">
      {chunks.map((chunk, i) =>
        chunk.startsWith('@') ? (
          <Link
            key={i}
            href={`/founder/${encodeURIComponent(chunk.slice(1))}`}
            className="text-sky-600 hover:underline dark:text-[#1d9bf0]"
          >
            {chunk}
          </Link>
        ) : (
          <span key={i}>{chunk}</span>
        ),
      )}
    </p>
  );
}

function XLogo() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 text-foreground/80 dark:text-[#e7e9ea]" aria-hidden fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

export function FoundersSoldSection() {
  return (
    <section className="min-w-0 border-t border-border pt-16 dark:border-[#2f3336]">
      <h2 className="mb-8 text-center font-mono text-2xl font-bold text-foreground md:text-3xl dark:text-white">
        Founders who sold on Ownerr
      </h2>
      <div className="mx-auto grid grid-cols-1 gap-4 md:grid-cols-2">
        {FOUNDER_SOLD_POSTS.map((post) => (
          <article
            key={post.id}
            className="overflow-hidden rounded-2xl border border-border bg-card text-left text-card-foreground transition-colors hover:border-muted-foreground/30 dark:border-[#2f3336] dark:bg-[#16181c] dark:hover:border-[#536471]"
          >
            <div className="p-4">
              <div className="flex gap-3">
                <img
                  src={founderAvatarUrl(post.avatarSeed)}
                  alt=""
                  className="h-10 w-10 shrink-0 rounded-full bg-muted dark:bg-[#2f3336]"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1">
                        <Link
                          href={`/founder/${post.handle}`}
                          className="truncate font-mono text-[15px] font-bold text-foreground hover:underline dark:text-[#e7e9ea]"
                        >
                          {post.displayName}
                        </Link>
                        {post.verified ? (
                          <span
                            className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-sky-500 text-[10px] text-white dark:bg-[#1d9bf0]"
                            title="Verified"
                          >
                            ✓
                          </span>
                        ) : null}
                      </div>
                      <Link
                        href={`/founder/${post.handle}`}
                        className="block font-mono text-[15px] text-muted-foreground hover:text-foreground hover:underline dark:text-[#71767b] dark:hover:text-[#e7e9ea]"
                      >
                        @{post.handle}
                      </Link>
                    </div>
                    <XLogo />
                  </div>
                  {post.headline ? (
                    <p className="mt-2 font-mono text-[15px] font-bold text-foreground dark:text-[#e7e9ea]">{post.headline}</p>
                  ) : null}
                  <div className="mt-2">
                    <PostBody text={post.body} />
                  </div>
                </div>
              </div>
              {post.imageSrc ? (
                <div className="mt-3 overflow-hidden rounded-xl border border-border dark:border-[#2f3336]">
                  <img src={post.imageSrc} alt="" className="h-auto w-full object-cover" loading="lazy" />
                </div>
              ) : null}
            </div>
            <div className="border-t border-border px-4 py-2 dark:border-[#2f3336]">
              <p className="font-mono text-[13px] text-muted-foreground dark:text-[#71767b]">{post.timeLabel}</p>
              <div className="mt-3 flex flex-wrap items-center gap-4 border-t border-border pt-3 font-mono text-[13px] text-muted-foreground dark:border-[#2f3336] dark:text-[#71767b]">
                <span className="inline-flex items-center gap-1.5 text-pink-500">
                  <Heart className="h-4 w-4 fill-pink-500 text-pink-500" strokeWidth={0} />
                  <span className="tabular-nums text-foreground dark:text-[#e7e9ea]">{post.likes}</span>
                </span>
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 text-sky-600 transition-opacity hover:opacity-80 dark:text-[#1d9bf0]"
                >
                  <MessageCircle className="h-4 w-4" strokeWidth={2} />
                  Reply
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 text-muted-foreground transition-opacity hover:opacity-80"
                >
                  <Link2 className="h-4 w-4" strokeWidth={2} />
                  Copy link
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}