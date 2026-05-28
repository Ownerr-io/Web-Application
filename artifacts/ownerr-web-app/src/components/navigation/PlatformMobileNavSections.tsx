import { Link } from "wouter";
import { ChevronDown } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { SheetClose } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import {
  NAV_ITEMS,
  getProductsDropdownSections,
} from "@/routes/publicNavConfig";
import { isNavLinkActive } from "@/routes/navConfig";

type Props = {
  location: string;
  onNavigate?: () => void;
  linkClass: (active: boolean) => string;
};

function MobileProductsAccordion({
  location,
  onNavigate,
  linkClass,
}: {
  location: string;
  onNavigate?: () => void;
  linkClass: (active: boolean) => string;
}) {
  const sections = getProductsDropdownSections();
  const nestedLink = (active: boolean) =>
    cn(
      linkClass(active),
      "rounded-[8px] border-l-2 border-transparent py-2.5 pl-3 text-[13px] hover:border-[color:var(--terminal-ochre)] hover:bg-[color:var(--terminal-surface)]/50",
    );

  const groupLabel = (title: string | null) =>
    title ? (
      <p className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[color:var(--terminal-muted)]">
        {title}
      </p>
    ) : null;

  return (
    <Collapsible className="group/navcoll rounded-[10px] border border-[color:var(--terminal-border)]/60 bg-[color:var(--terminal-bg)]/40">
      <CollapsibleTrigger className="flex w-full items-center justify-between px-4 py-3.5 text-left text-[color:var(--terminal-fg)]">
        <span>
          <span className="block text-sm font-bold">Products</span>
          <span className="mt-0.5 block text-[11px] text-[color:var(--terminal-muted)]">
            All products & apps
          </span>
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 opacity-70 transition-transform duration-300 group-data-[state=open]/navcoll:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent className="border-t border-[color:var(--terminal-border)]/50 px-2 py-2">
        {sections.map((section) => (
          <div
            key={section.id}
            className={cn(
              section.id !== "hub" &&
                "mt-2 border-t border-[color:var(--terminal-border)]/40 pt-2",
            )}
          >
            {groupLabel(section.title)}
            {section.items.map((item) => (
              <SheetClose key={item.id} asChild>
                <Link
                  href={item.href}
                  className={nestedLink(isNavLinkActive(location, item.href))}
                  onClick={onNavigate}
                >
                  {item.label}
                </Link>
              </SheetClose>
            ))}
          </div>
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}

export function PlatformMobileNavSections({
  location,
  onNavigate,
  linkClass,
}: Props) {
  return (
    <>
      <MobileProductsAccordion
        location={location}
        onNavigate={onNavigate}
        linkClass={linkClass}
      />
      {NAV_ITEMS.map((item) => (
        <SheetClose key={item.id} asChild>
          <Link
            href={item.href}
            className={linkClass(isNavLinkActive(location, item.href))}
            onClick={onNavigate}
          >
            {item.label}
          </Link>
        </SheetClose>
      ))}
    </>
  );
}
