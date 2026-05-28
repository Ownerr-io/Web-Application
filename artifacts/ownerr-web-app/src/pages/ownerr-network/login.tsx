import { Redirect } from "wouter";
import { productAuthPath } from "@/lib/auth/productAuthRoutes";

/** Legacy route — forwards to product-scoped auth. */
export default function OwnerrNetworkLoginPage() {
  return <Redirect to={productAuthPath("ownerr_network", "login")} replace />;
}
