import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { getSupabase } from '@/lib/supabase/client';
import {
  expressInterest,
  listBuyerInterests,
  withdrawInterest,
} from '@/lib/marketplace/interestService';
import { marketplaceKeys } from '@/lib/marketplace/queryKeys';
import { useToast } from '@/hooks/use-toast';
import { MarketplaceError } from '@/lib/marketplace/errors';

export function useMyInterests() {
  const { session } = useAuth();
  const authUserId = session?.user?.id;
  return useQuery({
    queryKey: marketplaceKeys.interests.mine(authUserId ?? ''),
    queryFn: () => listBuyerInterests(authUserId!),
    enabled: !!authUserId,
  });
}

export function useExpressInterest() {
  const { currentUser } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: { listingSlug: string; message: string; offerAmount?: number | null }) => {
      const { data: { user } } = await getSupabase().auth.getUser();
      if (!user) throw new MarketplaceError('Sign in required', 'forbidden');
      return expressInterest({
        user,
        listingSlug: input.listingSlug,
        message: input.message,
        offerAmount: input.offerAmount,
      });
    },
    onSuccess: () => {
      if (currentUser) {
        void qc.invalidateQueries({ queryKey: marketplaceKeys.interests.mine(currentUser.id) });
        void qc.invalidateQueries({ queryKey: marketplaceKeys.bids.mine(currentUser.id) });
      }
      toast({ title: 'Interest sent' });
    },
    onError: (err: Error) => {
      toast({
        title: 'Could not send interest',
        description: err.message,
        variant: 'destructive',
      });
    },
  });
}

export function useWithdrawInterest() {
  const { currentUser } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (interestId: string) => withdrawInterest(interestId),
    onSuccess: () => {
      if (currentUser) {
        void qc.invalidateQueries({ queryKey: marketplaceKeys.interests.mine(currentUser.id) });
      }
    },
    onError: (err: Error) => {
      toast({
        title: 'Could not withdraw interest',
        description: err.message,
        variant: 'destructive',
      });
    },
  });
}
