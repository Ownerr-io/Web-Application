-- Persist expected TXT token on domain verification_results.summary for UI/debug.

BEGIN;

CREATE OR REPLACE FUNCTION public.domain_verification_apply_result(
  p_challenge_id uuid,
  p_pass boolean,
  p_evidence jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ch public.domain_verification_challenges%ROWTYPE;
  v_provider_id uuid;
BEGIN
  SELECT * INTO v_ch FROM public.domain_verification_challenges WHERE id = p_challenge_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Challenge not found'; END IF;

  IF v_ch.status = 'verified' AND NOT p_pass THEN
    RETURN;
  END IF;
  IF v_ch.expires_at <= now() AND NOT p_pass THEN
    RETURN;
  END IF;

  UPDATE public.domain_verification_challenges
  SET status = CASE WHEN p_pass THEN 'verified' ELSE 'pending' END,
      verified_at = CASE WHEN p_pass THEN now() ELSE NULL END
  WHERE id = p_challenge_id;

  SELECT id INTO v_provider_id FROM public.verification_providers WHERE slug = 'domain';

  INSERT INTO public.verification_results (
    startup_id, provider_id, dimension, status, summary, evidence_ref, valid_from, valid_until
  ) VALUES (
    v_ch.startup_id,
    v_provider_id,
    'domain',
    CASE WHEN p_pass THEN 'pass' ELSE 'fail' END,
    jsonb_build_object(
      'domain', v_ch.domain,
      'method', v_ch.method,
      'host', v_ch.host,
      'expected_record', v_ch.expected_record
    ),
    p_evidence,
    CASE WHEN p_pass THEN now() ELSE NULL END,
    CASE WHEN p_pass THEN now() + interval '30 days' ELSE NULL END
  );

  PERFORM public.refresh_listing_gates_from_evidence(v_ch.startup_id);
END;
$$;

NOTIFY pgrst, 'reload schema';

COMMIT;
