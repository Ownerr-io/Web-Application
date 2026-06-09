-- Schema v2 renamed listing_seller_intake → marketplace_seller_intake and dropped the compat view.
-- Function rewrite missed unqualified refs in ON CONFLICT (listing_seller_intake.col) → 42P01.

BEGIN;

DO $$
DECLARE
  r record;
  def text;
  newdef text;
BEGIN
  FOR r IN
    SELECT p.oid, p.proname
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prokind = 'f'
      AND position('listing_seller_intake' in p.prosrc) > 0
  LOOP
    BEGIN
      def := pg_get_functiondef(r.oid);
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE 'seller_intake_v2_table_refs: skip % (%)', r.proname, SQLERRM;
        CONTINUE;
    END;

    newdef := def;
    newdef := replace(newdef, 'listing_seller_intake.', 'marketplace_seller_intake.');
    newdef := replace(newdef, 'public.listing_seller_intake', 'public.marketplace_seller_intake');
    IF newdef IS DISTINCT FROM def THEN
      EXECUTE newdef;
      RAISE NOTICE 'seller_intake_v2_table_refs: updated public.%', r.proname;
    END IF;
  END LOOP;
END $$;

GRANT EXECUTE ON FUNCTION public.founder_save_seller_intake(jsonb, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.founder_get_seller_intake(text) TO authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
