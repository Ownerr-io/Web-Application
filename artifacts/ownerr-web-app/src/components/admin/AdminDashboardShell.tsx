import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export const ADMIN_LOGO_SRC = "/Ownerr%20Logo.svg";

export function AdminLogo({
  className,
  alt = "Ownerr",
}: {
  className?: string;
  alt?: string;
}) {
  return (
    <img
      src={ADMIN_LOGO_SRC}
      alt={alt}
      className={cn("h-8 w-8 shrink-0 object-contain", className)}
    />
  );
}

export function AdminDashboardPage({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("space-y-10", className)}>{children}</div>;
}

export function AdminPageHeader({
  title,
  description,
  children,
}: {
  title: string;
  description?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="brand-page-header space-y-2 border-b border-[color:var(--terminal-border)] pb-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="brand-eyebrow">Platform admin</p>
          <h2 className="brand-page-title text-2xl font-bold tracking-tight">
            {title}
          </h2>
          {description ? (
            <p className="text-sm text-muted-foreground max-w-2xl">
              {description}
            </p>
          ) : null}
        </div>
        {children}
      </div>
    </header>
  );
}

export function AdminMetricsBlock({
  title = "Key metrics",
  description,
  children,
}: {
  title?: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="brand-block space-y-4">
      <AdminBlockHeading
        title={title}
        description={description}
        accent="lime"
      />
      {children}
    </section>
  );
}

export function AdminChartsBlock({
  title = "Charts",
  description,
  children,
}: {
  title?: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="brand-block space-y-4">
      <AdminBlockHeading
        title={title}
        description={description}
        accent="orange"
      />
      <div className="brand-charts-grid">{children}</div>
    </section>
  );
}

export function AdminInsightsBlock({
  title = "Insights",
  description,
  children,
}: {
  title?: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="brand-block space-y-6">
      <AdminBlockHeading title={title} description={description} accent="red" />
      {children}
    </section>
  );
}

function AdminBlockHeading({
  title,
  description,
  accent,
}: {
  title: string;
  description?: string;
  accent: "lime" | "orange" | "red";
}) {
  return (
    <div className="flex items-end gap-3">
      <span
        className={cn(
          "brand-block-accent h-8 w-1 shrink-0 rounded-full",
          accent === "lime" && "brand-block-accent--lime",
          accent === "orange" && "brand-block-accent--orange",
          accent === "red" && "brand-block-accent--red",
        )}
        aria-hidden
      />
      <div>
        <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
        {description ? (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        ) : null}
      </div>
    </div>
  );
}

export function AdminInlineLink({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="font-medium text-brand-orange underline-offset-2 hover:text-brand-lime hover:underline"
      onClick={onClick}
    >
      {children}
    </button>
  );
}
