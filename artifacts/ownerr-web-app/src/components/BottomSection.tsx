import { Link } from "wouter";
import type { LucideIcon } from "lucide-react";
import {
  Banknote,
  BarChart3,
  Brain,
  CheckSquare,
  Circle,
  GraduationCap,
  Headphones,
  HeartPulse,
  Home,
  Layers,
  Megaphone,
  Package,
  Palette,
  PenLine,
  Plane,
  Plus,
  Search,
  Share2,
  Shield,
  ShoppingBag,
  Terminal,
  TrendingUp,
  Users,
} from "lucide-react";
import { BROWSE_LABEL_TO_ACQUIRE_CATEGORY } from "@/lib/acquireBrowseCategoryMap";
import { browseCategories } from "@/lib/mockData";
import { useAuth } from "@/context/AuthContext";
import { useRequireAuth } from "@/lib/platform/requireAuth";
import { useAddStartup } from "@/context/AddStartupContext";
import { marketplacePath } from "@/lib/appPaths";

const ICON_MAP: Record<string, LucideIcon> = {
  Brain,
  Package,
  Terminal,
  Banknote,
  CheckSquare,
  Megaphone,
  ShoppingBag,
  Palette,
  Layers,
  BarChart3,
  GraduationCap,
  HeartPulse,
  Share2,
  PenLine,
  TrendingUp,
  Headphones,
  Users,
  Home,
  Plane,
  Shield,
};

function getIcon(name: string): LucideIcon {
  return ICON_MAP[name] ?? Circle;
}

export function BottomSection() {
  const { openAddStartup } = useAddStartup();
  const { isAuthenticated } = useAuth();
  const { requireAuth } = useRequireAuth();

  return (
    <div className="border-t border-border pt-8">
      <div className="mb-12 flex flex-col items-stretch gap-5 text-left sm:items-center sm:text-center">
        <h2 className="text-balance text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl">
          The database of verified startup revenues
        </h2>

        <div className="mx-auto flex w-full max-w-xl flex-col gap-2 sm:flex-row sm:items-stretch">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search, e.g. SaaS over $10K/mo"
              className="h-11 w-full min-w-0 rounded-[8px] border border-border bg-card pl-10 pr-4 text-xs text-foreground outline-none focus:ring-2 focus:ring-ring sm:text-sm"
            />
          </div>
          <button
            type="button"
            onClick={() =>
              isAuthenticated
                ? openAddStartup()
                : requireAuth({
                    action: "add_startup",
                    onAllowed: openAddStartup,
                  })
            }
            className="inline-flex h-11 w-full shrink-0 items-center justify-center gap-1 rounded-[10px] border border-border bg-card px-5 font-bold text-foreground transition-transform hover:-translate-y-0.5 sm:w-auto"
          >
            <Plus className="h-4 w-4 shrink-0" /> Add startup
          </button>
        </div>
      </div>

      {/* Browse by category */}
      <div className="my-12 sm:my-16">
        <h3 className="mb-4 text-center text-sm font-bold sm:mb-6 sm:text-base">
          Browse by category
        </h3>
        <div className="mx-auto flex max-w-3xl flex-wrap justify-center gap-1.5 sm:gap-2">
          {browseCategories.map((c) => {
            const Icon = getIcon(c.icon);
            const acq = BROWSE_LABEL_TO_ACQUIRE_CATEGORY[c.label];
            const href = acq
              ? `${marketplacePath("/acquire")}?category=${encodeURIComponent(acq)}`
              : marketplacePath("/acquire");
            return (
              <Link
                key={c.label}
                href={href}
                className="inline-flex max-w-full min-w-0 items-center gap-1 rounded-full border border-border bg-card px-2 py-1 text-xs transition-colors hover:bg-muted sm:gap-1.5 sm:px-3 sm:py-1.5 sm:text-sm"
              >
                <Icon className="h-3 w-3 shrink-0 text-muted-foreground sm:h-3.5 sm:w-3.5" />
                <span className="truncate">{c.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
