import { Redirect } from "wouter";
import { PRODUCT_ROUTES } from "@/routing/routeRegistry";

/** Legacy URL — profile holds account settings. */
export default function OwnerrNetworkAppSettingsPage() {
  return <Redirect to={PRODUCT_ROUTES.ownerrNetworkProfile} replace />;
}
