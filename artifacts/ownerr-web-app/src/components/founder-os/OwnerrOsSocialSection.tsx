import { ExternalLink, Instagram, Linkedin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OWNERR_OS_SOCIAL_LINKS } from "@/lib/ownerr-os/social";
import { cn } from "@/lib/utils";

function XIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden
      fill="currentColor"
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

const ICONS = {
  linkedin: Linkedin,
  instagram: Instagram,
  x: XIcon,
} as const;

type Variant = "hero" | "section";

export function OwnerrOsSocialSection({
  variant = "section",
  className,
}: {
  variant?: Variant;
  className?: string;
}) {
  if (variant === "hero") {
    return (
      <div className={cn("flex flex-wrap items-center gap-2", className)}>
        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[color:var(--terminal-muted)]">
          Follow
        </span>
        {OWNERR_OS_SOCIAL_LINKS.map((item) => {
          const Icon = ICONS[item.id];
          return (
            <a
              key={item.id}
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] border border-[color:var(--terminal-border)]/80 bg-[color:var(--terminal-surface)]/50 text-[color:var(--terminal-muted)] transition-colors hover:border-[color:var(--brand-lime)]/40 hover:text-[color:var(--terminal-fg)]"
              aria-label={`OWNERR OS on ${item.label}`}
            >
              <Icon className="h-4 w-4" />
            </a>
          );
        })}
      </div>
    );
  }

  return (
    <section
      className={cn(
        "saas-glass-card rounded-[14px] border border-[color:var(--terminal-border)]/80 p-6 sm:p-8",
        className,
      )}
    >
      <p className="luxury-kicker">Community</p>
      <h2 className="marketing-section-heading mt-2">Follow OWNERR OS</h2>
      <p className="marketing-body-sm mt-3 max-w-lg">
        Product updates, founder stories, and acquisition-market context — join
        us on LinkedIn, Instagram, and X.
      </p>
      <div className="mt-6 flex flex-wrap gap-2">
        {OWNERR_OS_SOCIAL_LINKS.map((item) => {
          const Icon = ICONS[item.id];
          return (
            <Button
              key={item.id}
              type="button"
              variant="outline"
              className="h-11 rounded-[10px] font-bold"
              asChild
            >
              <a href={item.href} target="_blank" rel="noopener noreferrer">
                <Icon className="mr-2 h-4 w-4" aria-hidden />
                {item.label}
                <ExternalLink
                  className="ml-2 h-3.5 w-3.5 opacity-60"
                  aria-hidden
                />
              </a>
            </Button>
          );
        })}
      </div>
    </section>
  );
}
