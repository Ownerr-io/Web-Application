import type { ReactNode } from "react";
import { OWNERR_OS_APP_CONTENT_CLASS } from "@/lib/ownerrOsAppLayout";
import { AUTH_APP_PAGE_ROOT } from "@/lib/appDeskLayout";
import { BrandAppPageShell } from "@/components/brand/BrandAppPageShell";
import { cn } from "@/lib/utils";

type Props = {
  kicker?: string;
  title: string;
  description?: ReactNode;
  children: ReactNode;
};

/** Shared in-app page chrome (aligned with marketplace desk pages). */
export function OwnerrOsAppPageShell({
  kicker = "OWNERR OS",
  title,
  description,
  children,
}: Props) {
  return (
    <div
      className={cn(
        OWNERR_OS_APP_CONTENT_CLASS,
        AUTH_APP_PAGE_ROOT,
        "ownerr-os-app-page w-full",
      )}
    >
      <BrandAppPageShell
        kicker={kicker}
        title={title}
        description={description}
        className="!space-y-6"
      >
        {children}
      </BrandAppPageShell>
    </div>
  );
}
