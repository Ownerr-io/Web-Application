import { Redirect, useParams } from "wouter";
import { MARKETPLACE_ROUTES } from "@/routing/routeRegistry";

/** Legacy URL → company workspace verification tab. */
export default function SellerVerificationDetailRedirect() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug ?? "";
  if (!slug) {
    return <Redirect to={MARKETPLACE_ROUTES.sellerCompanies} />;
  }
  return <Redirect to={MARKETPLACE_ROUTES.sellerVerificationDetail(slug)} />;
}
