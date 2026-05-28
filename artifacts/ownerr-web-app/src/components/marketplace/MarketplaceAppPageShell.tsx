import type { ReactNode } from "react";
import { Link } from "wouter";
import { ChevronLeft } from "lucide-react";
import { MARKETPLACE_APP_CONTENT_CLASS } from "@/lib/marketplaceAppLayout";
import { cn } from "@/lib/utils";

type Props = {
  kicker?: string;
  title: string;
  description?: ReactNode;
  backHref?: string;
  backLabel?: string;
  /** Compact single-row header (buyer desk listing/detail pages). */
  layout?: "default" | "compact";
  headerActions?: ReactNode;
  children: ReactNode;
  className?: string;
};

/** In-app marketplace page header — same pattern as Ownerr Network desk pages. */
export function MarketplaceAppPageShell({
  kicker = "Marketplace",
  title,
  description,
  backHref,
  backLabel = "Back",
  layout = "default",
  headerActions,
  children,
  className,
}: Props) {
  if (layout === "compact") {
    return (
      <div
        className={cn(
          MARKETPLACE_APP_CONTENT_CLASS,
          "acquire-terminal-palette w-full space-y-4",
          className,
        )}
      >
        <header className="flex items-center justify-between gap-3 border-b border-[color:var(--terminal-border)]/80 pb-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[10px] font-black uppercase tracking-[0.18em] text-[color:var(--terminal-lime)]">
              {kicker}
            </p>
            <h1 className="truncate text-lg font-bold tracking-tight text-[color:var(--terminal-display)] sm:text-xl">
              {title}
            </h1>
            {description ? (
              <p className="truncate text-xs text-[color:var(--terminal-muted)]">
                {description}
              </p>
            ) : null}
          </div>
          {headerActions ? (
            <div className="flex shrink-0 items-center gap-2">
              {headerActions}
            </div>
          ) : null}
        </header>
        <div>{children}</div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        MARKETPLACE_APP_CONTENT_CLASS,
        "acquire-terminal-palette w-full",
        className,
      )}
    >
      {backHref ? (
        <Link
          href={backHref}
          className="inline-flex h-10 w-fit items-center gap-1.5 rounded-[10px] border border-[color:var(--terminal-border)] bg-[color:var(--terminal-surface)] px-3.5 text-sm font-bold text-[color:var(--terminal-fg)] shadow-sm transition-colors hover:bg-[color:var(--terminal-surface-2)]"
        >
          <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden />
          {backLabel}
        </Link>
      ) : null}
      <header className="space-y-2">
        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[color:var(--terminal-lime)]">
          {kicker}
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-[color:var(--terminal-display)] sm:text-3xl">
          {title}
        </h1>
        {description ? (
          <p className="text-sm text-[color:var(--terminal-muted)]">
            {description}
          </p>
        ) : null}
      </header>
      {children}
    </div>
  );
}
