import { Redirect } from "wouter";
import { MARKETPLACE_ROUTES } from "@/routing/routeRegistry";

/** @deprecated Use /buyer/offers */
export default function BuyerBidsRedirectPage() {
  return <Redirect to={MARKETPLACE_ROUTES.buyerOffers} />;
}
