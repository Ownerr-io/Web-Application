import { useLocation } from "wouter";
import { OwnerrOsAppPageShell } from "@/components/founder-os/OwnerrOsAppPageShell";
import { OwnerrOsEditStartupForm } from "@/components/founder-os/OwnerrOsEditStartupForm";
import { useOwnerrFounderRecords } from "@/hooks/founder-os/useOwnerrFounderRecords";
import { ownerrOsListingDetailPath } from "@/lib/ownerrOsRoutes";
import { PRODUCT_ROUTES } from "@/routing/routeRegistry";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function OwnerrOsListingNewPage() {
  const [, navigate] = useLocation();
  const { reload } = useOwnerrFounderRecords();

  return (
    <OwnerrOsAppPageShell
      title="Add startup"
      description="Create another listing with its own referral link and share assets."
    >
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="-mt-2 mb-2 w-fit"
        asChild
      >
        <Link href={PRODUCT_ROUTES.ownerrOsListings}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to table
        </Link>
      </Button>
      <OwnerrOsEditStartupForm
        mode="create"
        onSaved={(created) => {
          void reload();
          if (created?.id) {
            navigate(ownerrOsListingDetailPath(created.id), { replace: true });
            return;
          }
          navigate(PRODUCT_ROUTES.ownerrOsListings, { replace: true });
        }}
      />
    </OwnerrOsAppPageShell>
  );
}
