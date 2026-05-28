import { cn } from "@/lib/utils";

type Props = {
  index?: string;
  label: string;
  title: React.ReactNode;
  description?: string;
  align?: "left" | "center";
  className?: string;
};

/** Editorial section intro — no pills or chips. */
export function SectionHeader({
  index,
  label,
  title,
  description,
  align = "left",
  className,
}: Props) {
  const centered = align === "center";

  return (
    <header
      className={cn(centered && "mx-auto max-w-2xl text-center", className)}
    >
      <div
        className={cn("flex items-center gap-4", centered && "justify-center")}
      >
        {index ? (
          <span className="font-mono text-xs font-bold tabular-nums text-[color:var(--terminal-muted)]">
            {index}
          </span>
        ) : null}
        <span className="luxury-kicker">{label}</span>
        <span
          className={cn("luxury-rule flex-1", centered && "max-w-[120px]")}
          aria-hidden
        />
      </div>
      <h2
        className={cn(
          "mt-5 text-balance text-3xl font-light tracking-tight sm:text-4xl",
          centered && "mx-auto",
        )}
      >
        {title}
      </h2>
      {description ? (
        <p
          className={cn(
            "mt-4 max-w-xl text-sm leading-relaxed text-[color:var(--terminal-muted)] sm:text-[15px] sm:leading-relaxed",
            centered && "mx-auto",
          )}
        >
          {description}
        </p>
      ) : null}
    </header>
  );
}
