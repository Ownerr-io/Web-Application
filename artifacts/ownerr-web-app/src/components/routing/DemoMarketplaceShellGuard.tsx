import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { useActiveProduct } from "@/context/ActiveProductContext";
import {
  applyDemoMarketplaceProductLock,
  demoMarketplaceHomeHref,
  isDemoMarketplaceLockedSession,
  isPathAllowedForDemoMarketplaceLock,
} from "@/lib/marketplace/demoSessionLock";

/**
 * Keeps demo buyer/seller sessions inside `/marketplace/*` until they click Log out.
 */
export function DemoMarketplaceShellGuard() {
  const [location, navigate] = useLocation();
  const { loading, session, currentUser } = useAuth();
  const { setActiveProduct } = useActiveProduct();

  useEffect(() => {
    if (loading || !session?.user?.email) return;
    const email = session.user.email;
    if (!isDemoMarketplaceLockedSession(email)) return;

    applyDemoMarketplaceProductLock();
    setActiveProduct("marketplace");

    const pathname = location.split("?")[0] ?? location;
    if (!isPathAllowedForDemoMarketplaceLock(pathname)) {
      navigate(demoMarketplaceHomeHref(currentUser?.role ?? null), {
        replace: true,
      });
    }
  }, [
    loading,
    session,
    currentUser?.role,
    location,
    navigate,
    setActiveProduct,
  ]);

  return null;
}
