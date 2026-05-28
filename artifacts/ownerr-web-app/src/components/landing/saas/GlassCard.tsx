import { cn } from "@/lib/utils";

type Props = {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  glow?: boolean;
};

export function GlassCard({
  children,
  className,
  hover = true,
  glow = false,
}: Props) {
  return (
    <div
      className={cn(
        "saas-glass-card rounded-[10px] border border-[color:var(--terminal-border)]/60",
        hover && "saas-glass-card-hover",
        glow && "shadow-[var(--platform-glow)]",
        className,
      )}
    >
      {children}
    </div>
  );
}
