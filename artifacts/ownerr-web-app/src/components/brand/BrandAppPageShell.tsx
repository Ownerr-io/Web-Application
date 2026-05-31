import type { ReactNode } from "react";
import { Link } from "wouter";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export {
  AdminLogo as BrandLogo,
  ADMIN_LOGO_SRC as BRAND_LOGO_SRC,
} from "@/components/admin/AdminDashboardShell";

type Props = {
  kicker?: string;
  title: string;
  description?: ReactNode;
  backHref?: string;
  backLabel?: string;
  headerActions?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
};

/** Shared in-app page chrome (desk + marketplace) — logo palette headers. */
export function BrandAppPageShell({
  kicker,
  title,
  description,
  backHref,
  backLabel = "Back",
  headerActions,
  children,
  className,
  contentClassName,
}: Props) {
  return (
    <div className={cn("w-full space-y-6 sm:space-y-8", className)}>
      {backHref ? (
        <Link
          href={backHref}
          className="brand-back-link inline-flex h-10 w-fit items-center gap-1.5 rounded-[10px] px-3.5 text-sm font-bold shadow-sm"
        >
          <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden />
          {backLabel}
        </Link>
      ) : null}
      <header className="brand-page-header space-y-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-2">
            {kicker ? <p className="brand-eyebrow">{kicker}</p> : null}
            <h1 className="brand-page-title text-2xl font-bold tracking-tight sm:text-3xl">
              {title}
            </h1>
            {description ? (
              <p className="text-sm text-muted-foreground max-w-2xl">
                {description}
              </p>
            ) : null}
          </div>
          {headerActions ? (
            <div className="flex shrink-0 items-center gap-2">
              {headerActions}
            </div>
          ) : null}
        </div>
      </header>
      <div className={cn("space-y-6", contentClassName)}>{children}</div>
    </div>
  );
}
