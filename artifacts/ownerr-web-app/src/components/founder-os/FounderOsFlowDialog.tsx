import { useEffect } from "react";
import { useLocation } from "wouter";
import { useFounderOs } from "@/context/FounderOsContext";
import { PRODUCT_ROUTES } from "@/routing/routeRegistry";

/** Legacy modal entry — redirects to full-page valuation-style flow. */
export function FounderOsFlowDialog() {
  const { flowOpen, closeFlow } = useFounderOs();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!flowOpen) return;
    closeFlow();
    setLocation(PRODUCT_ROUTES.ownerrOsApp);
  }, [flowOpen, closeFlow, setLocation]);

  return null;
}
