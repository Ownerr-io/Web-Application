import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, Loader2, Send } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  useConversationMessages,
  useMarkConversationRead,
  useSendMessage,
} from "@/hooks/marketplace/useInbox";
import { useQuery } from "@tanstack/react-query";
import { fetchConversationThread } from "@/lib/marketplace/messageService";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { MarketplaceDeskPanel } from "@/components/marketplace/MarketplaceDeskUi";
import { MARKETPLACE_ROUTES } from "@/routing/routeRegistry";

type Props = {
  mode: "buyer" | "seller";
  conversationId: string;
  backHref: string;
};

export function MarketplaceConversationChat({
  mode,
  conversationId,
  backHref,
}: Props) {
  const { session } = useAuth();
  const authUserId = session?.user?.id;
  const bottomRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState("");

  const { data: thread, isLoading: threadLoading } = useQuery({
    queryKey: ["conversation-thread", conversationId, authUserId],
    queryFn: () => fetchConversationThread(conversationId, authUserId!),
    enabled: !!authUserId && !!conversationId,
  });

  const { data: messages = [], isLoading: messagesLoading } =
    useConversationMessages(conversationId);
  const sendMut = useSendMessage();
  const readMut = useMarkConversationRead();

  useEffect(() => {
    if (!conversationId || !authUserId) return;
    void readMut.mutate(conversationId);
  }, [conversationId, authUserId, readMut]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, sendMut.isSuccess]);

  const counterparty =
    mode === "buyer" ? thread?.sellerName : thread?.buyerName;
  const listingLabel = thread?.startupTitle ?? thread?.startupSlug ?? "Listing";

  async function onSend(e: React.FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body || sendMut.isPending) return;
    await sendMut.mutateAsync({ conversationId, body });
    setDraft("");
  }

  if (threadLoading || messagesLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading conversation…
      </div>
    );
  }

  if (!thread) {
    return (
      <MarketplaceDeskPanel title="Conversation">
        <p className="text-sm text-muted-foreground">
          This thread was not found or you do not have access.
        </p>
        <Button variant="outline" className="mt-4" asChild>
          <Link href={backHref}>Back to inbox</Link>
        </Button>
      </MarketplaceDeskPanel>
    );
  }

  const messagingClosed = thread.status !== "open";

  return (
    <div className="flex flex-col gap-3 sm:min-h-0 sm:gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="sm" className="gap-1.5 -ml-2" asChild>
          <Link href={backHref}>
            <ArrowLeft className="h-4 w-4" />
            Inbox
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <p className="font-semibold truncate">
            {counterparty ?? "Conversation"}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {listingLabel}
            {thread.startupSlug ? (
              <>
                {" · "}
                <Link
                  href={
                    mode === "buyer"
                      ? MARKETPLACE_ROUTES.buyerStartup(thread.startupSlug)
                      : MARKETPLACE_ROUTES.sellerStartup(thread.startupSlug)
                  }
                  className="underline-offset-2 hover:underline"
                >
                  View listing
                </Link>
              </>
            ) : null}
          </p>
        </div>
      </div>

      <div className="brand-panel-card flex flex-col overflow-hidden rounded-xl border sm:min-h-[min(50dvh,420px)]">
        <div className="space-y-3 overflow-y-auto overscroll-contain p-3 sm:flex-1 sm:p-4 sm:max-h-[min(52dvh,480px)]">
          {messages.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">
              No messages yet. Say hello to start the conversation.
            </p>
          ) : (
            messages.map((m) => {
              const mine = m.senderUserId === authUserId;
              return (
                <div
                  key={m.id}
                  className={cn("flex", mine ? "justify-end" : "justify-start")}
                >
                  <div
                    className={cn(
                      "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm shadow-sm",
                      mine
                        ? "bg-brand-lime/20 text-foreground border border-brand-lime/30"
                        : "bg-muted/80 text-foreground border border-border",
                    )}
                  >
                    <p className="whitespace-pre-wrap break-words">{m.body}</p>
                    <p
                      className={cn(
                        "mt-1 text-[10px] tabular-nums",
                        mine
                          ? "text-muted-foreground"
                          : "text-muted-foreground",
                      )}
                    >
                      {new Date(m.createdAt).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        {messagingClosed ? (
          <div className="border-t border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
            This conversation is closed because the offer was declined. You can
            read past messages here; neither party can send new ones unless the
            buyer submits a new offer.
          </div>
        ) : (
          <form
            onSubmit={onSend}
            className="border-t border-border bg-card/80 p-3 flex flex-col gap-2 sm:flex-row sm:items-end"
          >
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Write a message…"
              rows={2}
              className="min-h-[44px] resize-none flex-1"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void onSend(e);
                }
              }}
            />
            <Button
              type="submit"
              className="btn-marketplace-primary shrink-0 gap-2"
              disabled={!draft.trim() || sendMut.isPending}
            >
              {sendMut.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Send
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
