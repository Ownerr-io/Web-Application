import { useState } from "react";
import { useLocation } from "wouter";
import { Loader2, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MARKETPLACE_ROUTES } from "@/routing/routeRegistry";
import { ensureConversationForBid } from "@/lib/marketplace/offerService";
import { useToast } from "@/hooks/use-toast";

type Props = {
  mode: "buyer" | "seller";
  bidId?: string;
  conversationId?: string | null;
  startupSlug?: string;
  className?: string;
};

export function OpenConversationButton({
  mode,
  bidId,
  conversationId,
  startupSlug,
  className,
}: Props) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  function chatPath(id: string) {
    return mode === "buyer"
      ? MARKETPLACE_ROUTES.buyerInboxConversation(id)
      : MARKETPLACE_ROUTES.sellerInboxConversation(id);
  }

  async function openChat() {
    if (conversationId) {
      setLocation(chatPath(conversationId));
      return;
    }
    if (bidId) {
      setLoading(true);
      try {
        const id = await ensureConversationForBid(bidId);
        setLocation(chatPath(id));
      } catch (e) {
        toast({
          title: "Could not open chat",
          description: e instanceof Error ? e.message : "Try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
      return;
    }
    if (startupSlug && mode === "buyer") {
      setLoading(true);
      try {
        const { findOrCreateConversation } =
          await import("@/lib/marketplace/messageService");
        const { getSupabase } = await import("@/lib/supabase/client");
        const {
          data: { user },
        } = await getSupabase().auth.getUser();
        if (!user) throw new Error("Sign in required");
        const id = await findOrCreateConversation({
          startupSlug,
          buyerUser: user,
        });
        setLocation(chatPath(id));
      } catch (e) {
        toast({
          title: "Could not open chat",
          description: e instanceof Error ? e.message : "Try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
      return;
    }
    setLocation(
      mode === "buyer"
        ? MARKETPLACE_ROUTES.buyerInbox
        : MARKETPLACE_ROUTES.sellerInbox,
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={className ?? "gap-1.5"}
      disabled={loading}
      onClick={() => void openChat()}
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <MessageCircle className="h-3.5 w-3.5" />
      )}
      Open conversation
    </Button>
  );
}
