import { getSupabase } from "@/lib/supabase/client";
import { SchemaTables as T } from "@/lib/supabase/schemaTables";

export type ValuationReportRow = {
  id: string;
  startup_id: string;
  status: string;
  low_amount: number | null;
  expected_amount: number | null;
  high_amount: number | null;
  currency: string;
  confidence: string;
  trust_score_at_compute: number | null;
  explanation: Record<string, unknown>;
  created_at: string;
  published_at: string | null;
};

export async function generateValuationReport(
  startupId: string,
): Promise<string> {
  const { data, error } = await getSupabase().rpc("generate_valuation_report", {
    p_startup_id: startupId,
  });
  if (error) throw new Error(error.message);
  return String(data);
}

export async function publishValuationReport(reportId: string): Promise<void> {
  const { error } = await getSupabase().rpc("publish_valuation_report", {
    p_report_id: reportId,
  });
  if (error) throw new Error(error.message);
}

export async function fetchLatestValuationReport(
  startupId: string,
): Promise<ValuationReportRow | null> {
  const { data, error } = await getSupabase()
    .from(T.trust.valuationReports)
    .select("*")
    .eq("startup_id", startupId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as ValuationReportRow | null) ?? null;
}

export async function generateAiInsights(startupId: string): Promise<string> {
  const { data, error } = await getSupabase().rpc("generate_ai_insights", {
    p_startup_id: startupId,
  });
  if (error) throw new Error(error.message);
  return String(data);
}

export async function fetchLatestAiInsights(startupId: string): Promise<{
  output: Record<string, unknown>;
  created_at: string;
} | null> {
  const { data, error } = await getSupabase()
    .from(T.trust.aiInsightRuns)
    .select("output, created_at")
    .eq("startup_id", startupId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return {
    output: (data.output ?? {}) as Record<string, unknown>,
    created_at: data.created_at,
  };
}
