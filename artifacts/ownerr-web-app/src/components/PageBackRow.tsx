import { ChevronLeft } from "lucide-react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  MARKETPLACE_BASE,
  isMarketplaceBuyerAppPath,
  marketplaceBrowsePath,
  marketplacePath,
} from "@/lib/appPaths";

type PageBackRowProps = {
  className?: string;
  /** @default true */
  showHome?: boolean;
};

/**
 * One standard place for back navigation: first row in the main column, left-aligned.
 * Back uses history when available; otherwise goes home.
 */
export function PageBackRow({ className, showHome = true }: PageBackRowProps) {
  const [location, setLocation] = useLocation();
  const onMarketplace =
    location.startsWith(`${MARKETPLACE_BASE}/`) ||
    location === MARKETPLACE_BASE;
  const homeHref = isMarketplaceBuyerAppPath(location)
    ? marketplaceBrowsePath(location)
    : onMarketplace
      ? marketplacePath("/")
      : "/";

  function goBack() {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      setLocation(homeHref);
    }
  }

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 [column-gap:0.5rem] [row-gap:0.5rem]",
        className,
      )}
    >
      <button
        type="button"
        onClick={goBack}
        className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-[10px] border border-border bg-card px-3.5 text-sm font-bold text-foreground shadow-sm transition-colors hover:bg-muted"
      >
        <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden />
        Back
      </button>
      {showHome ? (
        <Link
          href={homeHref}
          className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-[10px] border border-dashed border-border bg-transparent px-3.5 text-sm font-bold text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
        >
          Home
        </Link>
      ) : null}
    </div>
  );
}
