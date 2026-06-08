-- Founder listing create + platform encryption bootstrap + worker grants

BEGIN;

CREATE OR REPLACE FUNCTION public.founder_create_startup(
  p_slug text,
  p_title text,
  p_description text DEFAULT '',
  p_industry text DEFAULT 'SaaS',
  p_founded_year integer DEFAULT NULL,
  p_currency text DEFAULT 'USD'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid := gen_random_uuid();
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF length(trim(p_slug)) < 2 OR length(trim(p_title)) < 2 THEN
    RAISE EXCEPTION 'Invalid slug or title';
  END IF;

  INSERT INTO public.startups (
    id, slug, founder_user_id, title, description, industry,
    founded_year, currency, visibility, status, verified, metadata
  ) VALUES (
    v_id, lower(trim(p_slug)), auth.uid(), trim(p_title), coalesce(p_description, ''),
    p_industry, p_founded_year, coalesce(p_currency, 'USD'),
    'public', 'published', false, '{}'::jsonb
  );

  INSERT INTO public.trust_scores (startup_id, score, level)
  VALUES (v_id, 0, 'unverified')
  ON CONFLICT (startup_id) DO NOTHING;

  PERFORM public.append_audit_log('startup', v_id, 'founder_create', NULL,
    jsonb_build_object('slug', p_slug));

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.founder_create_startup(text, text, text, text, integer, text) TO authenticated;

GRANT EXECUTE ON FUNCTION public.recompute_startup_trust(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.domain_verification_apply_result(uuid, boolean, jsonb) TO service_role;

-- AI insights: deterministic analysis (never mutates source metrics)
CREATE OR REPLACE FUNCTION public.generate_ai_insights(p_startup_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid := gen_random_uuid();
  v_out jsonb := '{}'::jsonb;
  v_rev numeric;
  v_acct numeric;
  v_trust numeric;
BEGIN
  IF NOT public.startup_owned_by_auth(p_startup_id) AND NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT coalesce(sum(mrr), 0) INTO v_rev FROM public.financial_metrics
  WHERE startup_id = p_startup_id AND period_start >= (current_date - interval '60 days')::date;

  SELECT coalesce(sum(revenue), 0) INTO v_acct FROM public.accounting_metrics
  WHERE startup_id = p_startup_id AND period_start >= (current_date - interval '60 days')::date;

  SELECT score INTO v_trust FROM public.trust_scores WHERE startup_id = p_startup_id;

  v_out := jsonb_build_object(
    'revenue_trend', CASE WHEN v_rev > 0 THEN 'active' ELSE 'insufficient_data' END,
    'data_inconsistency',
      CASE
        WHEN v_rev > 0 AND v_acct > 0 AND abs(v_rev - v_acct) / greatest(v_rev, v_acct) > 0.25
        THEN jsonb_build_object('severity', 'high', 'delta_pct', round(abs(v_rev - v_acct) / greatest(v_rev, v_acct) * 100, 2))
        ELSE jsonb_build_object('severity', 'none')
      END,
    'trust_anomaly',
      CASE WHEN coalesce(v_trust, 0) < 20 AND v_rev > 1000
        THEN jsonb_build_object('note', 'High revenue with low trust — review verifications')
        ELSE jsonb_build_object('note', 'none')
      END,
    'valuation_hint', 'Run generate_valuation_report for structured ranges'
  );

  INSERT INTO public.ai_insight_runs (id, startup_id, insight_type, input_snapshot_hash, output, model_id)
  VALUES (
    v_id, p_startup_id, 'platform_rules_v1',
    md5(v_out::text), v_out, 'ownerr-rules-v1'
  );

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_ai_insights(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
