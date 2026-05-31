import { Redirect } from "wouter";
import { ADMIN_ROUTES } from "@/routing/routeRegistry";

/** @deprecated — founder metrics live on Founders + dashboard */
export default function OwnerrOsAnalyticsAdminPage() {
  return <Redirect to={ADMIN_ROUTES.ownerrOsFounders} replace />;
}
