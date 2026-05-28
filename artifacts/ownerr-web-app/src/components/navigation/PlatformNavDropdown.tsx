import { Link } from "wouter";
import { ArrowRight, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { NavLinkItem } from "@/routes/navConfig";

type Props = {
  label: string;
  items: NavLinkItem[];
  active: boolean;
  terminal: boolean;
  onNavigate?: () => void;
};

const ACCENTS = ["lime", "orange", "red", "lime", "orange"] as const;

export function PlatformNavDropdown({
  label,
  items,
  active,
  terminal,
  onNavigate,
}: Props) {
  const triggerClass = cn(
    "group/trigger inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold tracking-wide transition-colors outline-none",
    "focus-visible:ring-2 focus-visible:ring-[color:var(--brand-orange)]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--terminal-surface)]",
    "data-[state=open]:text-brand-orange",
    active
      ? terminal
        ? "text-brand-orange"
        : "text-foreground"
      : terminal
        ? "text-[color:var(--terminal-muted)] hover:text-[color:var(--terminal-fg)]"
        : "text-muted-foreground hover:text-foreground",
  );

  const subtitle =
    label === "Products"
      ? "Modules on the Ownerr platform"
      : "Guides and reference";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={triggerClass}
        aria-label={`${label} menu`}
      >
        <span className="relative">
          {label}
          <span
            className="nav-trigger-gradient-line absolute -bottom-1 left-0 h-px w-0 transition-all duration-300 group-data-[state=open]/trigger:w-full group-hover/trigger:w-full"
            aria-hidden
          />
        </span>
        <ChevronDown
          className="h-3.5 w-3.5 opacity-70 transition-transform duration-300 group-data-[state=open]/trigger:rotate-180"
          aria-hidden
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        sideOffset={12}
        className={cn(
          "luxury-nav-dropdown z-[100] font-mono",
          "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-[0.98] data-[state=open]:zoom-in-[0.98] data-[side=bottom]:slide-in-from-top-1",
          !terminal && "border-border bg-background/95",
        )}
      >
        <div className="luxury-nav-dropdown-header">
          <p className="luxury-kicker">{label}</p>
          <span className="luxury-rule mt-3 block" aria-hidden />
          <p className="mt-3 text-[11px] leading-snug text-[color:var(--terminal-muted)]">
            {subtitle}
          </p>
        </div>
        <div className="luxury-nav-dropdown-body">
          {items.map((item, i) => {
            const accent = ACCENTS[i % ACCENTS.length];
            return (
              <DropdownMenuItem
                key={item.id}
                asChild
                className="cursor-pointer rounded-none p-0 focus:bg-transparent data-[highlighted]:bg-transparent"
              >
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  data-accent={accent}
                  className="luxury-nav-dropdown-item group/item"
                >
                  <span className="mt-0.5 w-6 shrink-0 font-mono text-[10px] font-bold tabular-nums text-[color:var(--terminal-muted)]">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-bold leading-tight text-[color:var(--terminal-display)]">
                      {item.label}
                    </span>
                    {item.description ? (
                      <span className="mt-1 block text-[11px] font-normal leading-snug text-[color:var(--terminal-muted)]">
                        {item.description}
                      </span>
                    ) : null}
                  </span>
                  <ArrowRight
                    className="mt-0.5 h-4 w-4 shrink-0 text-brand-orange opacity-0 transition-all duration-200 group-hover/item:translate-x-0.5 group-hover/item:opacity-100"
                    aria-hidden
                  />
                </Link>
              </DropdownMenuItem>
            );
          })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
