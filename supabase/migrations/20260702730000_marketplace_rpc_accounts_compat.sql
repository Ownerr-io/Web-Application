-- Messaging RPCs fail (400) when helpers still SELECT from marketplace_profiles
-- after physical rename to marketplace_accounts (view dropped in schema v2 cutover).

BEGIN;

CREATE OR REPLACE FUNCTION public._marketplace_buyer_profile_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tbl text := public._desk_marketplace_table_name();
  v_id uuid;
BEGIN
  IF v_tbl IS NULL THEN
    RETURN NULL;
  END IF;
  EXECUTE format(
    $q$
      SELECT id FROM public.%I
      WHERE auth_user_id = $1 AND desk_role = 'buyer' AND status = 'active'
      LIMIT 1
    $q$,
    v_tbl
  )
  INTO v_id
  USING auth.uid();
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public._marketplace_conversation_participant(p_conversation_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conv public.marketplace_conversations%ROWTYPE;
  v_tbl text := public._desk_marketplace_table_name();
  v_ok boolean;
BEGIN
  SELECT * INTO v_conv FROM public.marketplace_conversations WHERE id = p_conversation_id;
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF v_tbl IS NOT NULL THEN
    EXECUTE format(
      $q$
        SELECT EXISTS (
          SELECT 1 FROM public.%I mp
          WHERE mp.auth_user_id = $1
            AND mp.desk_role = 'buyer'
            AND mp.status = 'active'
            AND mp.id = $2
        )
      $q$,
      v_tbl
    )
    INTO v_ok
    USING auth.uid(), v_conv.buyer_profile_id;
    IF v_ok THEN
      RETURN true;
    END IF;

    EXECUTE format(
      $q$
        SELECT EXISTS (
          SELECT 1 FROM public.%I mp
          WHERE mp.auth_user_id = $1
            AND mp.desk_role IN ('seller', 'founder')
            AND mp.id = $2
        )
      $q$,
      v_tbl
    )
    INTO v_ok
    USING auth.uid(), v_conv.seller_profile_id;
    IF v_ok THEN
      RETURN true;
    END IF;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.marketplace_companies s
    WHERE s.id = v_conv.startup_id
      AND s.founder_user_id = auth.uid()
  ) THEN
    RETURN true;
  END IF;

  IF public.is_platform_admin() THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

DO $r$
BEGIN
  IF to_regclass('public.marketplace_accounts') IS NOT NULL
     AND to_regclass('public.marketplace_profiles') IS NULL THEN
    CREATE VIEW public.marketplace_profiles WITH (security_invoker = true) AS
      SELECT * FROM public.marketplace_accounts;
    COMMENT ON VIEW public.marketplace_profiles IS
      'Schema v2 compat; physical table is marketplace_accounts.';
    GRANT SELECT ON public.marketplace_profiles TO authenticated;
  END IF;
END $r$;

NOTIFY pgrst, 'reload schema';

COMMIT;
