import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type AdminKpi = {
  label: string;
  value: string | number;
  hint?: string;
  onClick?: () => void;
  accent?: "default" | "success" | "warning";
};

type Props = {
  items: AdminKpi[];
  columns?: 2 | 3 | 4;
};

export function AdminKpiGrid({ items, columns = 4 }: Props) {
  const gridClass =
    columns === 2
      ? "sm:grid-cols-2"
      : columns === 3
        ? "sm:grid-cols-2 lg:grid-cols-3"
        : "sm:grid-cols-2 lg:grid-cols-4";

  return (
    <div className={cn("grid gap-4", gridClass)}>
      {items.map((item) => (
        <Card
          key={item.label}
          className={cn(
            "brand-kpi-card p-5 transition shadow-none",
            item.onClick && "cursor-pointer",
            item.accent === "success" && "border-[color:var(--brand-lime)]/35",
            item.accent === "warning" &&
              "border-[color:var(--brand-orange)]/35",
          )}
          onClick={item.onClick}
        >
          <p className="text-xs font-medium uppercase tracking-wide text-brand-orange/90">
            {item.label}
          </p>
          <p
            className={cn(
              "mt-2 text-2xl font-bold tabular-nums",
              item.accent === "success" && "brand-kpi-value--success",
              item.accent === "warning" && "brand-kpi-value--warning",
            )}
          >
            {item.value}
          </p>
          {item.hint ? (
            <p className="mt-1 text-xs text-muted-foreground">{item.hint}</p>
          ) : null}
        </Card>
      ))}
    </div>
  );
}

export function AdminBreakdownList({
  title,
  rows,
}: {
  title: string;
  rows: { label: string; value: string | number; key?: string }[];
}) {
  if (rows.length === 0) return null;
  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold text-brand-lime">{title}</h3>
      <ul className="brand-breakdown-list divide-y rounded-lg">
        {rows.map((row, index) => (
          <li
            key={row.key ?? `${index}-${row.label}`}
            className="flex items-center justify-between px-4 py-2.5 text-sm"
          >
            <span className="text-muted-foreground">{row.label}</span>
            <span className="brand-breakdown-value font-medium tabular-nums">
              {row.value}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
