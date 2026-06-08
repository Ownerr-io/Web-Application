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
import { runOncePerSession } from "@/lib/marketplace/oncePerSession";
import type { ConversationMessage, InboxThread } from "@/lib/marketplace/types";
import { marketplaceKeys } from "@/lib/marketplace/queryKeys";
import { useToast } from "@/hooks/use-toast";
import { MarketplaceError } from "@/lib/marketplace/errors";

const inboxQueryOptions = {
  staleTime: 30_000,
  refetchOnWindowFocus: false,
} as const;

export function useInbox() {
  const { session } = useAuth();
  const authUserId = session?.user?.id;
  return useQuery({
    queryKey: marketplaceKeys.inbox(authUserId ?? ""),
    queryFn: async () => {
      if (!authUserId) return [];
      try {
        await runOncePerSession(`repair-inbox:${authUserId}`, () =>
          repairBuyerInterestConversations().then(() => undefined),
        );
      } catch {
        /* best-effort backfill for interests missing threads */
      }
      return listInboxForUser(authUserId);
    },
    enabled: !!authUserId,
    ...inboxQueryOptions,
  });
}

export function useConversationMessages(conversationId: string | undefined) {
  return useQuery({
    queryKey: marketplaceKeys.messages(conversationId ?? ""),
    queryFn: () => listMessages(conversationId!),
    enabled: !!conversationId,
    staleTime: 5_000,
    refetchInterval: 15_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
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
    onSuccess: (message, vars) => {
      qc.setQueryData(
        marketplaceKeys.messages(vars.conversationId),
        (prev: ConversationMessage[] | undefined) => [...(prev ?? []), message],
      );
      if (currentUser) {
        qc.setQueryData(
          marketplaceKeys.inbox(currentUser.id),
          (prev: InboxThread[] | undefined) =>
            prev?.map((t) =>
              t.conversationId === vars.conversationId
                ? {
                    ...t,
                    lastMessage: message.body,
                    updatedAt: message.createdAt,
                  }
                : t,
            ),
        );
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
    retry: false,
    onSuccess: (_data, conversationId) => {
      if (!currentUser) return;
      qc.setQueryData(
        marketplaceKeys.inbox(currentUser.id),
        (prev: InboxThread[] | undefined) =>
          prev?.map((t) =>
            t.conversationId === conversationId ? { ...t, unreadCount: 0 } : t,
          ),
      );
    },
  });
}
