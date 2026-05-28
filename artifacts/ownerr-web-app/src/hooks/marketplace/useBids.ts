import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { getSupabase } from "@/lib/supabase/client";
import {
  createBid,
  listBidsForBuyer,
  listBidsForStartupSlug,
  updateBidStatus,
} from "@/lib/marketplace/bidService";
import { marketplaceKeys } from "@/lib/marketplace/queryKeys";
import type { BidStatus } from "@/lib/marketplace/types";
import { useToast } from "@/hooks/use-toast";
import { MarketplaceError } from "@/lib/marketplace/errors";

export function useMyBids() {
  const { session } = useAuth();
  const authUserId = session?.user?.id;
  return useQuery({
    queryKey: marketplaceKeys.bids.mine(authUserId ?? ""),
    queryFn: () => listBidsForBuyer(authUserId!),
    enabled: !!authUserId,
  });
}

export function useStartupBids(slug: string | undefined) {
  return useQuery({
    queryKey: marketplaceKeys.bids.startup(slug ?? ""),
    queryFn: () => listBidsForStartupSlug(slug!),
    enabled: !!slug,
  });
}

export function useCreateBid() {
  const { currentUser } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: {
      startupSlug: string;
      amount: number;
      message?: string;
    }) => {
      const {
        data: { user },
      } = await getSupabase().auth.getUser();
      if (!user) throw new MarketplaceError("Sign in required", "forbidden");
      return createBid({
        user,
        startupSlug: input.startupSlug,
        amount: input.amount,
        message: input.message,
      });
    },
    onSuccess: (_data, vars) => {
      if (currentUser) {
        void qc.invalidateQueries({
          queryKey: marketplaceKeys.bids.mine(currentUser.id),
        });
      }
      void qc.invalidateQueries({
        queryKey: marketplaceKeys.bids.startup(vars.startupSlug),
      });
      toast({ title: "Bid submitted" });
    },
    onError: (err: Error) => {
      toast({
        title: "Could not submit bid",
        description: err.message,
        variant: "destructive",
      });
    },
  });
}

export function useUpdateBidStatus() {
  const { currentUser } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (input: {
      bidId: string;
      status: BidStatus;
      startupSlug?: string;
    }) => {
      if (!currentUser)
        throw new MarketplaceError("Sign in required", "forbidden");
      return updateBidStatus({
        bidId: input.bidId,
        status: input.status,
        asAuthUserId: currentUser.id,
      });
    },
    onSuccess: (_data, vars) => {
      if (currentUser) {
        void qc.invalidateQueries({
          queryKey: marketplaceKeys.bids.mine(currentUser.id),
        });
      }
      if (vars.startupSlug) {
        void qc.invalidateQueries({
          queryKey: marketplaceKeys.bids.startup(vars.startupSlug),
        });
      }
    },
    onError: (err: Error) => {
      toast({
        title: "Could not update bid",
        description: err.message,
        variant: "destructive",
      });
    },
  });
}
