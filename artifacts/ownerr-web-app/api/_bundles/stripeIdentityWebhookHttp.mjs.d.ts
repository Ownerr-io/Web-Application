import type { SupabaseClient } from "@supabase/supabase-js";

export function handleStripeIdentityWebhookHttp(
  supabase: SupabaseClient,
  input: {
    rawBody: string;
    stripeSignatureHeader?: string;
    webhookSecret?: string;
    isProduction?: boolean;
  },
): Promise<{
  status: number;
  body: string;
  contentType?: string;
}>;
