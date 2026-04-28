import {
  Briefcase,
  Home,
  LogOut,
  MessageSquare,
  Search,
  ShieldCheck,
  Star,
} from "lucide-react";
import { Link, useLocation } from "wouter";

import { Button } from "@/components/ui/button";
import { cn, founderAvatarUrl } from "@/lib/utils";
import { useMockSession } from "@/context/MockSessionContext";

const buyerLinks = [
  { href: "/buyer", label: "Overview", icon: Home },
  { href: "/buyer/acquire", label: "Browse Startups", icon: Search },
  { href: "/buyer/interests", label: "My Interests", icon: Star },
  { href: "/buyer/bids", label: "My Bids", icon: Briefcase },
];

const sellerLinks = [
  { href: "/seller", label: "Overview", icon: Home },
  { href: "/seller/listings", label: "My Listings", icon: Briefcase },
  { href: "/seller/inbox", label: "Inbox", icon: MessageSquare },
  { href: "/seller/verification", label: "Verification", icon: ShieldCheck },
];

export function DashboardSidebar() {
  const { currentUser, logout } = useMockSession();
  const [location] = useLocation();
  const links = currentUser?.role === "buyer" ? buyerLinks : sellerLinks;
  const profileHref = currentUser?.role === "buyer" ? "/buyer/profile" : "/seller/profile";

  return (
    <div className="flex h-full flex-col border-r bg-background">
      <div className="p-4">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg">
          <img src="/Ownerr Logo.svg" alt="Ownerr" className="h-6 w-6" />
          <span>Ownerr.io</span>
        </Link>
      </div>
      <div className="flex-1 overflow-y-auto">
        <nav className="grid items-start px-4 text-sm font-medium">
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
                location === href && "bg-muted text-primary"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="p-4 pt-2">
        {currentUser ? (
          <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/20 p-2">
            <Link href={profileHref} className={cn("flex min-w-0 flex-1 items-center gap-2 rounded-md px-1 py-1", location === profileHref && "bg-muted")}>
              <img
                src={founderAvatarUrl(currentUser.avatarSeed ?? currentUser.id)}
                alt=""
                className="h-7 w-7 shrink-0 rounded-full border border-border object-cover"
              />
              <span className="truncate text-sm font-medium text-foreground">{currentUser.name}</span>
            </Link>
            <Button onClick={logout} variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label="Logout">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}