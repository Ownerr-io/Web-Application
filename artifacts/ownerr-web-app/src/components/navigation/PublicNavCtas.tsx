import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  demoMarketplaceHomeHref,
  isDemoMarketplaceLockedSession,
} from "@/lib/marketplace/demoSessionLock";
import { useAuth } from "@/context/AuthContext";
import { buildAuthStartRedirect } from "@/routing/authResolver";

type Props = {
  terminal: boolean;
  onNavigate?: () => void;
  className?: string;
  stacked?: boolean;
};

export function PublicNavCtas({
  terminal: _terminal,
  onNavigate,
  className,
  stacked,
}: Props) {
  const [location] = useLocation();
  const { session, currentUser } = useAuth();
  const primaryBtn = cn("btn-platform-gradient font-bold", stacked && "w-full");
  const href =
    session?.user.email && isDemoMarketplaceLockedSession(session.user.email)
      ? demoMarketplaceHomeHref(currentUser?.role ?? null)
      : buildAuthStartRedirect(location);

  return (
    <Button asChild size="sm" className={cn(primaryBtn, className)}>
      <Link href={href} onClick={onNavigate}>
        Get Started
      </Link>
    </Button>
  );
}
