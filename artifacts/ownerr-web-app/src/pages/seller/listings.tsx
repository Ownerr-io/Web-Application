import { Redirect } from "wouter";
import { MARKETPLACE_ROUTES } from "@/routing/routeRegistry";

/** @deprecated My listings merged into Companies. */
export default function SellerListingsRedirect() {
  return <Redirect to={MARKETPLACE_ROUTES.sellerCompanies} />;
}
