import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { getSupabase } from "@/lib/supabase/client";
import {
  findOrCreateConversation,
  listInboxForUser,
  listMessages,
  markConversationRead,
  repairBuyerInterestConversations,
  sendMessage,
} from "@/lib/marketplace/messageService";
import { marketplaceKeys } from "@/lib/marketplace/queryKeys";
import { useToast } from "@/hooks/use-toast";
import { MarketplaceError } from "@/lib/marketplace/errors";

export function useInbox() {
  const { session } = useAuth();
  const authUserId = session?.user?.id;
  return useQuery({
    queryKey: marketplaceKeys.inbox(authUserId ?? ""),
    queryFn: async () => {
      if (!authUserId) return [];
      try {
        await repairBuyerInterestConversations();
      } catch {
        /* best-effort backfill for interests missing threads */
      }
      return listInboxForUser(authUserId);
    },
    enabled: !!authUserId,
  });
}

export function useConversationMessages(conversationId: string | undefined) {
  return useQuery({
    queryKey: marketplaceKeys.messages(conversationId ?? ""),
    queryFn: () => listMessages(conversationId!),
    enabled: !!conversationId,
    refetchInterval: 8_000,
  });
}

export function useSendMessage() {
  const { currentUser } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: { conversationId: string; body: string }) => {
      const {
        data: { user },
      } = await getSupabase().auth.getUser();
      if (!user) throw new MarketplaceError("Sign in required", "forbidden");
      return sendMessage({
        conversationId: input.conversationId,
        senderUser: user,
        body: input.body,
      });
    },
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({
        queryKey: marketplaceKeys.messages(vars.conversationId),
      });
      if (currentUser) {
        void qc.invalidateQueries({
          queryKey: marketplaceKeys.inbox(currentUser.id),
        });
      }
    },
    onError: (err: Error) => {
      toast({
        title: "Message failed",
        description: err.message,
        variant: "destructive",
      });
    },
  });
}

export function useOpenConversation() {
  return useMutation({
    mutationFn: async (startupSlug: string) => {
      const {
        data: { user },
      } = await getSupabase().auth.getUser();
      if (!user) throw new MarketplaceError("Sign in required", "forbidden");
      return findOrCreateConversation({ startupSlug, buyerUser: user });
    },
  });
}

export function useMarkConversationRead() {
  const { currentUser } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (conversationId: string) => {
      if (!currentUser)
        throw new MarketplaceError("Sign in required", "forbidden");
      return markConversationRead(conversationId, currentUser.id);
    },
    onSuccess: () => {
      if (currentUser) {
        void qc.invalidateQueries({
          queryKey: marketplaceKeys.inbox(currentUser.id),
        });
      }
    },
  });
}
