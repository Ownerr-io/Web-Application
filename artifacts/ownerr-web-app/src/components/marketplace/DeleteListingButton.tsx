import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { deleteFounderListingBySlug } from "@/lib/intelligence/listingVerificationApi";
import { invalidateSellerDeskQueries } from "@/lib/marketplace/invalidateSellerDeskQueries";
import { MARKETPLACE_ROUTES } from "@/routing/routeRegistry";
import { cn } from "@/lib/utils";

type Props = {
  slug: string;
  listingName: string;
  /** Navigate here after delete (default: verification list). */
  redirectHref?: string;
  variant?: "default" | "outline" | "secondary" | "ghost" | "destructive";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  showIcon?: boolean;
  label?: string;
  onDeleted?: () => void;
  /** Used when `label` is empty (icon button). */
  ariaLabel?: string;
};

export function DeleteListingButton({
  slug,
  listingName,
  redirectHref = MARKETPLACE_ROUTES.sellerCompanies,
  variant = "outline",
  size = "sm",
  className,
  showIcon = true,
  label = "Delete listing",
  onDeleted,
  ariaLabel,
}: Props) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const qc = useQueryClient();
  const [, setLocation] = useLocation();

  const deleteMut = useMutation({
    mutationFn: () => deleteFounderListingBySlug(slug),
    onSuccess: () => {
      invalidateSellerDeskQueries(qc);
      void qc.invalidateQueries({
        queryKey: ["listing-verification-snapshot", slug],
      });
      setOpen(false);
      toast({
        title: "Listing deleted",
        description: `${listingName} and its verification data were removed.`,
      });
      onDeleted?.();
      setLocation(redirectHref);
    },
    onError: (e: Error) => {
      toast({
        title: "Could not delete listing",
        description: e.message,
        variant: "destructive",
      });
    },
  });

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        className={cn(className)}
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          setOpen(true);
        }}
        aria-label={ariaLabel ?? (label || `Delete ${listingName}`)}
      >
        {showIcon ? (
          <Trash2 className={cn("h-4 w-4", label ? "mr-2" : "")} aria-hidden />
        ) : null}
        {label ? label : null}
      </Button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this listing?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-medium text-foreground">{listingName}</span>{" "}
              ({slug}) will be permanently removed, including verification
              progress, connected provider credentials, and draft or published
              marketplace data. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMut.isPending}>
              Cancel
            </AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={deleteMut.isPending}
              onClick={() => deleteMut.mutate()}
            >
              {deleteMut.isPending ? "Deleting…" : "Delete permanently"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
