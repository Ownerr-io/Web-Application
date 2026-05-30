import { useEffect } from "react";
import { useLocation } from "wouter";
import { getAdminAppFromPath } from "@/lib/admin/config";
import { trackAdminPageView } from "@/lib/admin/analytics";

export function useAdminPageView(page: string): void {
  const [location] = useLocation();

  useEffect(() => {
    const app = getAdminAppFromPath(location);
    if (app) {
      trackAdminPageView(app.slug, page);
    } else if (location === "/admin") {
      trackAdminPageView("ownerr_network", "hub");
    }
  }, [location, page]);
}
