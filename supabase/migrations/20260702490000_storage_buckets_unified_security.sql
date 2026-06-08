-- Unify storage bucket security for all dashboard buckets.
-- Canonical app buckets: listing-business-proofs (seller intake), verification-documents (registration OCR).
-- Legacy buckets listing_proofs / registration_docs: same path rules as canonical (startup_id/...).
-- person_verification_docs: auth.uid() as first path segment (future ID uploads).

BEGIN;

CREATE OR REPLACE FUNCTION public.storage_path_owned_by_person_auth(p_object_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL
    AND split_part(coalesce(p_object_name, ''), '/', 1) = auth.uid()::text;
$$;

GRANT EXECUTE ON FUNCTION public.storage_path_owned_by_person_auth(text) TO authenticated;

-- ---------------------------------------------------------------------------
-- Bucket metadata (always private)
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  (
    'listing-business-proofs',
    'listing-business-proofs',
    false,
    20971520,
    ARRAY[
      'image/jpeg', 'image/png', 'image/webp', 'application/pdf',
      'text/csv', 'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ]::text[]
  ),
  (
    'listing_proofs',
    'listing_proofs',
    false,
    20971520,
    ARRAY[
      'image/jpeg', 'image/png', 'image/webp', 'application/pdf',
      'text/csv', 'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ]::text[]
  ),
  (
    'verification-documents',
    'verification-documents',
    false,
    26214400,
    ARRAY[
      'application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/tiff'
    ]::text[]
  ),
  (
    'registration_docs',
    'registration_docs',
    false,
    20971520,
    ARRAY['image/jpeg', 'image/png', 'application/pdf']::text[]
  ),
  (
    'person_verification_docs',
    'person_verification_docs',
    false,
    10485760,
    ARRAY['image/jpeg', 'image/png', 'application/pdf']::text[]
  )
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

UPDATE storage.buckets SET public = false
WHERE id IN (
  'listing-business-proofs',
  'listing_proofs',
  'verification-documents',
  'registration_docs',
  'person_verification_docs'
);

-- ---------------------------------------------------------------------------
-- Macro: founder startup path buckets (listing-business-proofs, listing_proofs,
-- verification-documents, registration_docs)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  b text;
BEGIN
  FOREACH b IN ARRAY ARRAY[
    'listing-business-proofs',
    'listing_proofs',
    'verification-documents',
    'registration_docs'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', b || '_select');
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', b || '_insert');
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', b || '_update');
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', b || '_delete');
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', b || '_admin');
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', b || '_service');

    EXECUTE format($pol$
      CREATE POLICY %I ON storage.objects
        FOR SELECT TO authenticated
        USING (
          bucket_id = %L
          AND (
            public.storage_path_owned_by_auth(name)
            OR public.is_platform_admin()
          )
        )
    $pol$, b || '_select', b);

    EXECUTE format($pol$
      CREATE POLICY %I ON storage.objects
        FOR INSERT TO authenticated
        WITH CHECK (
          bucket_id = %L
          AND public.storage_path_owned_by_auth(name)
        )
    $pol$, b || '_insert', b);

    EXECUTE format($pol$
      CREATE POLICY %I ON storage.objects
        FOR UPDATE TO authenticated
        USING (
          bucket_id = %L
          AND public.storage_path_owned_by_auth(name)
        )
        WITH CHECK (
          bucket_id = %L
          AND public.storage_path_owned_by_auth(name)
        )
    $pol$, b || '_update', b, b);

    EXECUTE format($pol$
      CREATE POLICY %I ON storage.objects
        FOR DELETE TO authenticated
        USING (
          bucket_id = %L
          AND (
            public.storage_path_owned_by_auth(name)
            OR public.is_platform_admin()
          )
        )
    $pol$, b || '_delete', b);

    EXECUTE format($pol$
      CREATE POLICY %I ON storage.objects
        FOR ALL TO authenticated
        USING (bucket_id = %L AND public.is_platform_admin())
        WITH CHECK (bucket_id = %L AND public.is_platform_admin())
    $pol$, b || '_admin', b, b);

    EXECUTE format($pol$
      CREATE POLICY %I ON storage.objects
        FOR ALL TO service_role
        USING (bucket_id = %L)
        WITH CHECK (bucket_id = %L)
    $pol$, b || '_service', b, b);
  END LOOP;
END $$;

-- Drop older policy names (avoid duplicates on listing-business-proofs / verification-documents)
DROP POLICY IF EXISTS listing_proofs_storage_select ON storage.objects;
DROP POLICY IF EXISTS listing_proofs_storage_insert ON storage.objects;
DROP POLICY IF EXISTS listing_proofs_storage_update ON storage.objects;
DROP POLICY IF EXISTS listing_proofs_storage_delete ON storage.objects;
DROP POLICY IF EXISTS listing_proofs_storage_admin ON storage.objects;
DROP POLICY IF EXISTS listing_proofs_storage_service ON storage.objects;
DROP POLICY IF EXISTS verification_docs_storage_select ON storage.objects;
DROP POLICY IF EXISTS verification_docs_storage_insert ON storage.objects;
DROP POLICY IF EXISTS verification_docs_storage_update ON storage.objects;
DROP POLICY IF EXISTS verification_docs_storage_delete ON storage.objects;
DROP POLICY IF EXISTS verification_docs_storage_admin ON storage.objects;
DROP POLICY IF EXISTS verification_docs_storage_service ON storage.objects;

-- ---------------------------------------------------------------------------
-- person_verification_docs — path: {auth_user_id}/...
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS person_verification_docs_select ON storage.objects;
DROP POLICY IF EXISTS person_verification_docs_insert ON storage.objects;
DROP POLICY IF EXISTS person_verification_docs_update ON storage.objects;
DROP POLICY IF EXISTS person_verification_docs_delete ON storage.objects;
DROP POLICY IF EXISTS person_verification_docs_admin ON storage.objects;
DROP POLICY IF EXISTS person_verification_docs_service ON storage.objects;

CREATE POLICY person_verification_docs_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'person_verification_docs'
    AND (
      public.storage_path_owned_by_person_auth(name)
      OR public.is_platform_admin()
    )
  );

CREATE POLICY person_verification_docs_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'person_verification_docs'
    AND public.storage_path_owned_by_person_auth(name)
  );

CREATE POLICY person_verification_docs_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'person_verification_docs'
    AND public.storage_path_owned_by_person_auth(name)
  )
  WITH CHECK (
    bucket_id = 'person_verification_docs'
    AND public.storage_path_owned_by_person_auth(name)
  );

CREATE POLICY person_verification_docs_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'person_verification_docs'
    AND (
      public.storage_path_owned_by_person_auth(name)
      OR public.is_platform_admin()
    )
  );

CREATE POLICY person_verification_docs_admin ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'person_verification_docs' AND public.is_platform_admin())
  WITH CHECK (bucket_id = 'person_verification_docs' AND public.is_platform_admin());

CREATE POLICY person_verification_docs_service ON storage.objects
  FOR ALL TO service_role
  USING (bucket_id = 'person_verification_docs')
  WITH CHECK (bucket_id = 'person_verification_docs');

NOTIFY pgrst, 'reload schema';

COMMIT;
