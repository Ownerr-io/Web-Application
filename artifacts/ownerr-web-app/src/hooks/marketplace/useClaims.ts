import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getSupabase } from '@/lib/supabase/client';
import { getClaimSpotStats, listPublicClaims, submitSpotClaim } from '@/lib/marketplace/claimService';
import { marketplaceKeys } from '@/lib/marketplace/queryKeys';
import type { ClaimSpotRole } from '@/lib/marketplace/types';
import { useToast } from '@/hooks/use-toast';
import { MarketplaceError } from '@/lib/marketplace/errors';

export function useClaimStats() {
  return useQuery({
    queryKey: marketplaceKeys.claimStats(),
    queryFn: () => getClaimSpotStats(),
    retry: false,
    staleTime: 60_000,
  });
}

export function usePublicClaims() {
  return useQuery({
    queryKey: marketplaceKeys.claims(),
    queryFn: () => listPublicClaims(),
  });
}

export function useSubmitClaim() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: {
      name: string;
      handle: string;
      email: string;
      role: ClaimSpotRole;
      tagline?: string;
    }) => {
      const { data: { user } } = await getSupabase().auth.getUser();
      if (!user) throw new MarketplaceError('Sign in required', 'forbidden');
      return submitSpotClaim({ user, ...input });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: marketplaceKeys.claims() });
      void qc.invalidateQueries({ queryKey: marketplaceKeys.claimStats() });
      toast({ title: 'Claim submitted' });
    },
    onError: (err: Error) => {
      toast({
        title: 'Claim failed',
        description: err.message,
        variant: 'destructive',
      });
    },
  });
}
