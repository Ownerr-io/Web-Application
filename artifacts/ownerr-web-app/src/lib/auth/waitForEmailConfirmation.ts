import { getSupabase } from "@/lib/supabase/client";

const CONFIRM_WAIT_MS = 12_000;

/**
 * Waits for Supabase to finish PKCE/hash exchange after email confirm links.
 */
export async function waitForEmailConfirmationSession(): Promise<{
  confirmed: boolean;
  email?: string;
}> {
  const supabase = getSupabase();
  const hash = typeof window !== "undefined" ? window.location.hash : "";
  const search = typeof window !== "undefined" ? window.location.search : "";

  if (hash.includes("error=") || search.includes("error=")) {
    return { confirmed: false };
  }

  const check = async () => {
    const { data } = await supabase.auth.getSession();
    const user = data.session?.user;
    if (user?.email_confirmed_at) {
      return { confirmed: true as const, email: user.email ?? undefined };
    }
    return { confirmed: false as const, email: user?.email ?? undefined };
  };

  const immediate = await check();
  if (immediate.confirmed) return immediate;

  const hasAuthFragment =
    hash.includes("access_token") ||
    hash.includes("type=signup") ||
    hash.includes("type=email") ||
    search.includes("code=");

  if (!hasAuthFragment && !immediate.email) {
    return immediate;
  }

  return new Promise((resolve) => {
    let settled = false;
    const finish = (result: { confirmed: boolean; email?: string }) => {
      if (settled) return;
      settled = true;
      sub.subscription.unsubscribe();
      window.clearTimeout(timer);
      resolve(result);
    };

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user?.email_confirmed_at) {
        finish({
          confirmed: true,
          email: session.user.email ?? undefined,
        });
      }
    });

    const timer = window.setTimeout(() => {
      void check().then((r) => finish(r));
    }, CONFIRM_WAIT_MS);
  });
}
