import { Link } from "wouter";

import { cn } from "@/lib/utils";
import {
  getSidebarNavGroupLabel,
  isSidebarNavActive,
  type SidebarNavItemDef,
  type SidebarNavSection,
} from "@/routing/navigationRegistry";
import { useAuthenticatedNav } from "@/hooks/useAuthenticatedNav";

function DeskNavLinks({
  onNavigate,
  location,
  links,
}: {
  onNavigate?: () => void;
  location: string;
  links: readonly SidebarNavItemDef[];
}) {
  const linkClass = (active: boolean) =>
    cn(
      "flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-all hover:text-primary sm:min-h-0 sm:py-2 outline-none focus:outline-none focus-visible:outline-none",
      active && "bg-muted text-primary",
    );

  const group = links[0]?.group;
  const ariaLabel = group
    ? `${getSidebarNavGroupLabel(group)} navigation`
    : "Workspace";

  return (
    <nav
      className="grid items-start gap-1 text-sm font-medium sm:gap-0.5"
      aria-label={ariaLabel}
    >
      {links.map(({ id, href, label, icon: Icon }) => {
        const active = isSidebarNavActive(location, href);
        return (
          <Link
            key={id}
            href={href}
            onClick={onNavigate}
            className={linkClass(active)}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

function DeskNavSections({
  onNavigate,
  location,
  sections,
}: {
  onNavigate?: () => void;
  location: string;
  sections: readonly SidebarNavSection[];
}) {
  return (
    <div className="space-y-6">
      {sections.map((section) => (
        <div key={section.title}>
          <p className="mb-2 px-3 text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
            {section.title}
          </p>
          <DeskNavLinks
            onNavigate={onNavigate}
            location={location}
            links={section.items}
          />
        </div>
      ))}
    </div>
  );
}

export function DashboardSidebar() {
  const {
    location,
    navGroup,
    sidebarLinks,
    marketplaceSections,
    ownerrSections,
  } = useAuthenticatedNav();

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <div className="shrink-0 p-4">
        <div className="flex items-center gap-2 text-lg font-bold text-foreground">
          <img src="/Ownerr Logo.svg" alt="" className="h-6 w-6" />
          <span className="truncate">
            {navGroup ? getSidebarNavGroupLabel(navGroup) : "OWNERR"}
          </span>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6">
        {marketplaceSections ? (
          <DeskNavSections location={location} sections={marketplaceSections} />
        ) : ownerrSections ? (
          <DeskNavSections location={location} sections={ownerrSections} />
        ) : (
          <DeskNavLinks location={location} links={sidebarLinks} />
        )}
      </div>
    </div>
  );
}
