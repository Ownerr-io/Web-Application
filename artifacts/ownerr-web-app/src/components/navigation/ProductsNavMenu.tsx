import { Link } from "wouter";
import { ArrowRight, ChevronDown, LayoutGrid } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { getProductsDropdownSections } from "@/routes/publicNavConfig";
import { isProductsDropdownActive } from "@/routes/navConfig";

type Props = {
  active: boolean;
  terminal: boolean;
  onNavigate?: () => void;
};

export function ProductsNavMenu({ active, terminal, onNavigate }: Props) {
  const sections = getProductsDropdownSections();

  const triggerClass = cn(
    "group/trigger inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-xs font-bold tracking-wide transition-colors outline-none",
    "focus-visible:ring-2 focus-visible:ring-[color:var(--brand-orange)]/40 focus-visible:ring-offset-2",
    active
      ? terminal
        ? "text-[color:var(--terminal-ochre)]"
        : "text-foreground"
      : terminal
        ? "text-[color:var(--terminal-muted)] hover:bg-[color:var(--terminal-surface-2)] hover:text-[color:var(--terminal-fg)]"
        : "text-muted-foreground hover:text-foreground",
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={triggerClass}
        aria-label="Products menu"
        aria-haspopup="menu"
      >
        <span className="relative">
          Products
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
        sideOffset={14}
        className={cn(
          "saas-glass-card luxury-nav-dropdown z-[100] w-[min(100vw-2rem,24rem)] border border-[color:var(--terminal-border)]/80 p-0 font-mono shadow-xl backdrop-blur-xl",
          "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-[0.98] data-[state=open]:zoom-in-[0.98]",
        )}
      >
        <div className="luxury-nav-dropdown-header border-b border-[color:var(--terminal-border)]/60 px-4 py-3">
          <p className="luxury-kicker">Products</p>
          <p className="mt-2 text-[11px] leading-snug text-[color:var(--terminal-muted)]">
            OWNERR product apps and the full catalog.
          </p>
        </div>
        <div className="luxury-nav-dropdown-body max-h-[min(70vh,28rem)] overflow-y-auto p-1">
          {sections.map((section) => (
            <div
              key={section.id}
              className={cn(
                section.id !== "hub" &&
                  "mt-1 border-t border-[color:var(--terminal-border)]/50 pt-1",
              )}
            >
              {section.title ? (
                <p className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[color:var(--terminal-muted)]">
                  {section.title}
                </p>
              ) : null}
              <ul
                role="list"
                className={cn(
                  !section.title &&
                    "divide-y divide-[color:var(--terminal-border)]/50",
                )}
              >
                {section.items.map((item, itemIndex) => {
                  const isHub = section.id === "hub";
                  return (
                    <li key={item.id}>
                      <Link
                        href={item.href}
                        onClick={onNavigate}
                        className={cn(
                          "luxury-nav-dropdown-item group/item flex gap-3 rounded-[8px] px-3 py-3 transition-colors hover:bg-[color:var(--terminal-surface)]/60",
                          isHub && "bg-[color:var(--terminal-surface)]/30",
                        )}
                      >
                        {isHub ? (
                          <LayoutGrid
                            className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--terminal-ochre)]"
                            aria-hidden
                          />
                        ) : (
                          <span className="mt-0.5 w-6 shrink-0 font-mono text-[10px] font-bold tabular-nums text-[color:var(--terminal-muted)]">
                            {String(itemIndex + 1).padStart(2, "0")}
                          </span>
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="block text-[13px] font-bold text-[color:var(--terminal-display)]">
                            {item.label}
                          </span>
                          <span className="mt-1 block text-[11px] font-normal leading-snug text-[color:var(--terminal-muted)]">
                            {item.description}
                          </span>
                        </span>
                        <ArrowRight
                          className="mt-1 h-4 w-4 shrink-0 text-[color:var(--terminal-ochre)] opacity-0 transition-all group-hover/item:translate-x-0.5 group-hover/item:opacity-100"
                          aria-hidden
                        />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function useProductsNavActive(location: string) {
  return isProductsDropdownActive(location);
}
