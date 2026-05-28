import { Redirect } from "wouter";
import { PRODUCT_ROUTES } from "@/routing/routeRegistry";

/** Legacy URL — profile holds account settings. */
export default function OwnerrOsAppSettingsPage() {
  return <Redirect to={PRODUCT_ROUTES.ownerrOsProfile} replace />;
}
