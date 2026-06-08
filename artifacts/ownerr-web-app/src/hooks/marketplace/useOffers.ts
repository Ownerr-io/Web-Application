import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { getSupabase } from "@/lib/supabase/client";
import {
  acceptCounterOffer,
  acceptOffer,
  advanceAcquisitionStage,
  counterOffer,
  declineOffer,
  fetchBidDetail,
  listBuyerOffers,
  listOffersForStartupSlug,
  listSellerOfferGroups,
  submitOffer,
  withdrawOffer,
} from "@/lib/marketplace/offerService";
import { marketplaceKeys } from "@/lib/marketplace/queryKeys";
import type { AcquisitionStage } from "@/lib/marketplace/types";
import { useToast } from "@/hooks/use-toast";
import { MarketplaceError } from "@/lib/marketplace/errors";

export function useBuyerOffers() {
  const { session } = useAuth();
  return useQuery({
    queryKey: marketplaceKeys.offers.buyer(session?.user?.id ?? ""),
    queryFn: () => listBuyerOffers(),
    enabled: !!session?.user?.id,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
  });
}

export function useSellerOfferGroups() {
  const { session } = useAuth();
  return useQuery({
    queryKey: marketplaceKeys.offers.seller(session?.user?.id ?? ""),
    queryFn: () => listSellerOfferGroups(),
    enabled: !!session?.user?.id,
  });
}

export function useStartupOffers(slug: string | undefined) {
  return useQuery({
    queryKey: marketplaceKeys.offers.startup(slug ?? ""),
    queryFn: () => listOffersForStartupSlug(slug!),
    enabled: !!slug,
  });
}

export function useBidDetail(bidId: string | undefined) {
  return useQuery({
    queryKey: marketplaceKeys.offers.detail(bidId ?? ""),
    queryFn: () => fetchBidDetail(bidId!),
    enabled: !!bidId,
  });
}

function useInvalidateOffers() {
  const { currentUser } = useAuth();
  const qc = useQueryClient();
  return () => {
    const id = currentUser?.id;
    if (id) {
      void qc.invalidateQueries({ queryKey: marketplaceKeys.offers.buyer(id) });
      void qc.invalidateQueries({
        queryKey: marketplaceKeys.offers.seller(id),
      });
    }
    void qc.invalidateQueries({ queryKey: ["marketplace", "offers"] });
    void qc.invalidateQueries({ queryKey: ["marketplace", "offer-events"] });
    void qc.invalidateQueries({ queryKey: ["conversation-thread"] });
    if (id) {
      void qc.invalidateQueries({ queryKey: marketplaceKeys.inbox(id) });
    }
  };
}

export function useSubmitOffer() {
  const invalidate = useInvalidateOffers();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (input: {
      startupSlug: string;
      amount: number;
      message?: string;
      proofOfFunds?: string;
      expiresAt?: string;
      conversationId?: string;
    }) => {
      const {
        data: { user },
      } = await getSupabase().auth.getUser();
      if (!user) throw new MarketplaceError("Sign in required", "forbidden");
      return submitOffer({ user, ...input });
    },
    onSuccess: () => {
      invalidate();
      toast({ title: "Offer submitted" });
    },
    onError: (e: Error) =>
      toast({
        title: "Offer failed",
        description: e.message,
        variant: "destructive",
      }),
  });
}

function useOfferMutation<T>(
  mutationFn: (arg: T) => Promise<void>,
  successTitle: string,
) {
  const invalidate = useInvalidateOffers();
  const { toast } = useToast();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      invalidate();
      toast({ title: successTitle });
    },
    onError: (e: Error) =>
      toast({
        title: "Action failed",
        description: e.message,
        variant: "destructive",
      }),
  });
}

export function useOfferActions() {
  const counter = useOfferMutation(
    (a: { bidId: string; amount: number; message?: string }) =>
      counterOffer(a.bidId, a.amount, a.message),
    "Counter sent",
  );
  const accept = useOfferMutation(
    (bidId: string) => acceptOffer(bidId),
    "Offer accepted",
  );
  const decline = useOfferMutation(
    (a: { bidId: string; message?: string }) =>
      declineOffer(a.bidId, a.message),
    "Offer declined",
  );
  const withdraw = useOfferMutation(
    (bidId: string) => withdrawOffer(bidId),
    "Offer withdrawn",
  );
  const acceptCounter = useOfferMutation(
    (bidId: string) => acceptCounterOffer(bidId),
    "Counter accepted",
  );
  const advanceStage = useOfferMutation(
    (a: { bidId: string; stage: AcquisitionStage }) =>
      advanceAcquisitionStage(a.bidId, a.stage),
    "Stage updated",
  );
  return { counter, accept, decline, withdraw, acceptCounter, advanceStage };
}
