-- PL/pgSQL sets SELECT INTO targets to NULL when no row is found (overwriting := 0).
-- That left v_mrr NULL, skipped the startup fallback, and broke valuation_inputs inserts.

BEGIN;

CREATE OR REPLACE FUNCTION public.generate_valuation_report(p_startup_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_report_id uuid := gen_random_uuid();
  v_trust numeric;
  v_mrr numeric := 0;
  v_arr numeric := 0;
  v_growth numeric := 0;
  v_traffic bigint := 0;
  v_margin numeric := 0;
  v_industry text;
  v_age_years numeric := 1;
  v_base_mult numeric := 4;
  v_low numeric;
  v_mid numeric;
  v_high numeric;
  v_conf text := 'low';
  v_points integer := 0;
  v_founded integer;
BEGIN
  IF NOT public.startup_owned_by_auth(p_startup_id) AND NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT score INTO v_trust FROM public.trust_scores WHERE startup_id = p_startup_id;
  v_trust := COALESCE(v_trust, 0);

  SELECT COALESCE(mrr, 0), COALESCE(arr, mrr * 12, 0)
  INTO v_mrr, v_arr
  FROM public.financial_metrics
  WHERE startup_id = p_startup_id
  ORDER BY period_start DESC
  LIMIT 1;

  IF NOT FOUND THEN
    v_mrr := 0;
    v_arr := 0;
  END IF;

  IF COALESCE(v_mrr, 0) = 0 THEN
    SELECT
      COALESCE(annual_revenue / 12.0, 0),
      COALESCE(annual_revenue, 0),
      COALESCE(growth_rate, 0),
      industry,
      founded_year
    INTO v_mrr, v_arr, v_growth, v_industry, v_founded
    FROM public.startups
    WHERE id = p_startup_id;

    IF NOT FOUND THEN
      v_mrr := 0;
      v_arr := 0;
      v_growth := 0;
    END IF;
  ELSE
    SELECT COALESCE(growth_rate, 0), industry, founded_year
    INTO v_growth, v_industry, v_founded
    FROM public.startups
    WHERE id = p_startup_id;

    IF NOT FOUND THEN
      v_growth := 0;
    END IF;
  END IF;

  v_mrr := COALESCE(v_mrr, 0);
  v_arr := COALESCE(v_arr, 0);
  v_growth := COALESCE(v_growth, 0);

  IF v_founded IS NOT NULL THEN
    v_age_years := GREATEST(0.5, extract(year from now()) - v_founded);
  END IF;

  SELECT COALESCE(SUM(sessions), 0) INTO v_traffic FROM public.traffic_metrics
  WHERE startup_id = p_startup_id AND period_start >= (current_date - interval '30 days')::date;

  SELECT CASE WHEN COALESCE(SUM(revenue), 0) > 0
    THEN COALESCE(SUM(net_income), 0) / NULLIF(SUM(revenue), 0) ELSE 0 END
  INTO v_margin
  FROM public.accounting_metrics
  WHERE startup_id = p_startup_id AND period_start >= (current_date - interval '365 days')::date;

  v_margin := COALESCE(v_margin, 0);

  v_base_mult := CASE
    WHEN v_industry ILIKE '%SaaS%' THEN 5.5
    WHEN v_industry ILIKE '%AI%' THEN 6
    WHEN v_industry ILIKE '%Mobile%' THEN 4
    ELSE 4
  END;

  v_base_mult := v_base_mult + LEAST(2, GREATEST(-1, v_growth / 20.0));
  v_base_mult := v_base_mult + LEAST(1.5, v_margin * 2);
  v_base_mult := v_base_mult + LEAST(1, ln(GREATEST(v_traffic, 1) + 1) / 10.0);
  v_base_mult := v_base_mult * (0.85 + v_trust / 200.0);

  v_mid := GREATEST(0, COALESCE(v_arr, v_mrr * 12)) * v_base_mult;
  v_low := v_mid * 0.75;
  v_high := v_mid * 1.35;

  IF v_mrr > 0 THEN v_points := v_points + 1; END IF;
  IF v_traffic > 0 THEN v_points := v_points + 1; END IF;
  IF v_margin <> 0 THEN v_points := v_points + 1; END IF;
  IF v_trust >= 45 THEN v_points := v_points + 1; END IF;
  IF EXISTS (SELECT 1 FROM public.verification_results WHERE startup_id = p_startup_id AND status = 'pass') THEN
    v_points := v_points + 1;
  END IF;

  v_conf := CASE
    WHEN v_points >= 4 AND v_trust >= 65 THEN 'high'
    WHEN v_points >= 2 THEN 'medium'
    ELSE 'low'
  END;

  UPDATE public.valuation_reports SET status = 'superseded'
  WHERE startup_id = p_startup_id AND status = 'published';

  INSERT INTO public.valuation_reports (
    id, startup_id, status, low_amount, expected_amount, high_amount,
    confidence, trust_score_at_compute, explanation, model_version
  ) VALUES (
    v_report_id, p_startup_id, 'draft', round(v_low, 2), round(v_mid, 2), round(v_high, 2),
    v_conf, v_trust,
    jsonb_build_object(
      'multiples', jsonb_build_object('applied', v_base_mult),
      'inputs', jsonb_build_object(
        'mrr', v_mrr, 'arr', v_arr, 'growth_rate', v_growth,
        'traffic_sessions_30d', v_traffic, 'profit_margin_proxy', v_margin,
        'business_age_years', v_age_years
      ),
      'factors', jsonb_build_array(
        'ARR/MRR from financial_metrics or startup record',
        'Growth and margin adjustments',
        'Traffic and trust weighting'
      )
    ),
    'ownerr-v1'
  );

  INSERT INTO public.valuation_inputs (report_id, input_key, input_value, source)
  VALUES
    (v_report_id, 'mrr', to_jsonb(v_mrr), 'metric'),
    (v_report_id, 'arr', to_jsonb(v_arr), 'metric'),
    (v_report_id, 'trust_score', to_jsonb(v_trust), 'computed');

  INSERT INTO public.valuation_adjustments (report_id, adjustment_key, delta_pct, reason, rule_id)
  VALUES
    (v_report_id, 'growth', v_growth, 'Growth rate adjustment', 'growth-v1'),
    (v_report_id, 'trust', v_trust, 'Trust score multiplier', 'trust-v1');

  INSERT INTO public.valuation_history (startup_id, report_id, snapshot)
  VALUES (
    p_startup_id, v_report_id,
    jsonb_build_object('low', v_low, 'expected', v_mid, 'high', v_high, 'confidence', v_conf)
  );

  RETURN v_report_id;
END;
$$;

NOTIFY pgrst, 'reload schema';

COMMIT;
