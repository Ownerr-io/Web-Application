import { Redirect } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { marketplaceAppRoutes } from "@/routes/appRoutes";

/** Routes founders to inbox and buyers to interests as the messaging surface for now. */
export default function AppMessagesPage() {
  const { currentUser } = useAuth();
  if (!currentUser) return <Redirect to="/" />;
  if (currentUser.role === "founder")
    return <Redirect to={marketplaceAppRoutes.founderInbox} />;
  return <Redirect to={marketplaceAppRoutes.buyerInterests} />;
}
