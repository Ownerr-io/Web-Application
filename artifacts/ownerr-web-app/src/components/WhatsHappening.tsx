import { Link } from 'wouter';
import { ChevronRight, Heart, MessageCircle, Share2 } from 'lucide-react';
import { whatsHappeningPosts, mockFounders, mockStartups } from '@/lib/mockData';

export function WhatsHappening() {
  return (
    <section className="min-w-0">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xl font-bold">What's happening?</h2>
        <Link
          href="/feed"
          className="inline-flex items-center gap-0.5 text-sm text-muted-foreground hover:text-foreground"
        >
          View feed
          <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
        </Link>
      </div>

      <div className="columns-1 md:columns-2 lg:columns-3 gap-4 [column-fill:_balance]">
        {whatsHappeningPosts.map((post) => {
          const founder = mockFounders.find((f) => f.handle === post.founderHandle);
          const startup = mockStartups.find((s) => s.slug === post.startupSlug);
          return (
            <article
              key={post.id}
              className="break-inside-avoid mb-4 rounded-[12px] border border-border bg-card text-card-foreground p-4 hover:-translate-y-0.5 transition-transform"
            >
              <header className="flex items-center gap-2 mb-2 text-xs">
                {startup && (
                  <Link href={`/startup/${post.startupSlug}`} className="shrink-0" aria-label={startup.name}>
                    <img
                      src={`https://api.dicebear.com/7.x/shapes/svg?seed=${startup.name}`}
                      alt=""
                      className="h-6 w-6 rounded-full bg-muted transition-opacity hover:opacity-80"
                    />
                  </Link>
                )}
                <Link
                  href={`/founder/${post.founderHandle}`}
                  className="font-bold text-foreground hover:underline"
                >
                  @{post.founderHandle}
                </Link>
                <span className="text-muted-foreground">on</span>
                <Link href={`/startup/${post.startupSlug}`} className="font-bold hover:underline truncate max-w-[140px]">
                  {post.startupName}
                </Link>
                <span className="text-muted-foreground">·</span>
                <span className="text-muted-foreground">{post.timestamp}</span>
              </header>

              <p className="text-sm whitespace-pre-line leading-relaxed">{post.text}</p>

              {post.hasImage && (
                <div
                  className="mt-3 rounded-lg overflow-hidden border border-border h-36 flex items-end p-3 text-xs font-bold"
                  style={{ background: post.imageGradient || 'linear-gradient(135deg,#222,#444)', color: '#fff' }}
                >
                  <span className="bg-black/40 px-2 py-0.5 rounded backdrop-blur">{post.imageCaption}</span>
                </div>
              )}

              <footer className="flex items-center gap-4 mt-3 pt-3 border-t border-border text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1 hover:text-foreground cursor-pointer"><Heart className="w-3.5 h-3.5" /> {post.likes}</span>
                <span className="inline-flex items-center gap-1 hover:text-foreground cursor-pointer"><MessageCircle className="w-3.5 h-3.5" /> {post.comments}</span>
                <span className="inline-flex items-center gap-1 hover:text-foreground cursor-pointer ml-auto"><Share2 className="w-3.5 h-3.5" /></span>
              </footer>
            </article>
          );
        })}
      </div>
    </section>
  );
}