import { Redirect } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { marketplaceAppRoutes } from "@/routes/appRoutes";

export default function AppBidsPage() {
  const { currentUser } = useAuth();
  if (!currentUser) return <Redirect to="/" />;
  if (currentUser.role === "buyer")
    return <Redirect to={marketplaceAppRoutes.buyerBids} />;
  return <Redirect to={marketplaceAppRoutes.founder} />;
}
