import type { ReactNode } from "react";
import { MARKETPLACE_APP_CONTENT_CLASS } from "@/lib/marketplaceAppLayout";
import { BrandAppPageShell } from "@/components/brand/BrandAppPageShell";
import { cn } from "@/lib/utils";
import { AUTH_APP_PAGE_ROOT } from "@/lib/appDeskLayout";

type Props = {
  kicker?: string;
  title: string;
  description?: ReactNode;
  backHref?: string;
  backLabel?: string;
  layout?: "default" | "compact";
  headerActions?: ReactNode;
  children: ReactNode;
  className?: string;
};

/** In-app marketplace page header — same pattern as Ownerr OS / Network desk pages. */
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
          AUTH_APP_PAGE_ROOT,
          "w-full",
          className,
        )}
      >
        <BrandAppPageShell
          kicker={kicker}
          title={title}
          description={description}
          headerActions={headerActions}
          className="!space-y-4"
        >
          {children}
        </BrandAppPageShell>
      </div>
    );
  }

  return (
    <div
      className={cn(
        MARKETPLACE_APP_CONTENT_CLASS,
        AUTH_APP_PAGE_ROOT,
        "w-full",
        className,
      )}
    >
      <BrandAppPageShell
        kicker={kicker}
        title={title}
        description={description}
        backHref={backHref}
        backLabel={backLabel}
      >
        {children}
      </BrandAppPageShell>
    </div>
  );
}
