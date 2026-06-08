import type { HTMLAttributes, ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/** Primary panel on marketplace buyer/seller desk routes. */
export const marketplaceDeskCardClass =
  "brand-panel-card brand-panel-card--top-gradient overflow-hidden rounded-xl border shadow-none";

export function marketplaceDeskKpiValueClass(index: number): string {
  const mod = index % 3;
  if (mod === 1) return "text-brand-orange";
  if (mod === 2) return "text-brand-red";
  return "text-brand-lime";
}

type StatProps = {
  label: string;
  value: ReactNode;
  valueClassName?: string;
};

export function MarketplaceDeskStat({
  label,
  value,
  valueClassName,
}: StatProps) {
  return (
    <div className="brand-kpi-card overflow-hidden rounded-xl p-2.5 sm:p-3">
      <p className="brand-eyebrow text-[9px] leading-tight sm:text-[10px]">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 text-lg font-bold tabular-nums text-brand-lime sm:text-xl",
          valueClassName,
        )}
      >
        {value}
      </p>
    </div>
  );
}

export function MarketplaceDeskStatGrid({ children }: { children: ReactNode }) {
  return (
    <div className="mb-4 grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-3 lg:grid-cols-4">
      {children}
    </div>
  );
}

export function MarketplaceDeskListItem({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "brand-panel-card overflow-hidden rounded-xl border p-3 text-sm shadow-none",
        className,
      )}
      {...props}
    />
  );
}

type PanelProps = {
  title: string;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
};

export function MarketplaceDeskPanel({
  title,
  children,
  className,
  contentClassName,
}: PanelProps) {
  return (
    <Card className={cn(marketplaceDeskCardClass, "rounded-xl", className)}>
      <CardHeader className="px-4 pb-2 pt-4 sm:px-6 sm:pb-3">
        <CardTitle className="brand-eyebrow text-xs font-bold tracking-widest">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent
        className={cn("px-4 pb-4 pt-0 sm:px-6 sm:pb-6", contentClassName)}
      >
        {children}
      </CardContent>
    </Card>
  );
}

type KpiCardProps = {
  title: string;
  children: ReactNode;
  className?: string;
};

/** Metric tile in dashboard overview grids. */
export function MarketplaceDeskKpiCard({
  title,
  children,
  className,
}: KpiCardProps) {
  return (
    <Card
      className={cn(
        "brand-kpi-card overflow-hidden rounded-xl border shadow-none",
        className,
      )}
    >
      <CardHeader className="px-4 pb-2 pt-4 sm:px-6">
        <CardTitle className="brand-eyebrow text-[10px] font-bold tracking-widest">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0 sm:px-6 sm:pb-6">
        {children}
      </CardContent>
    </Card>
  );
}
