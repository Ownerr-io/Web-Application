-- Internal RPCs call append_audit_log with five args (subject, id, action, before, after).
-- Older 5- and 6-arg overloads plus the 7-arg version all match → "function is not unique".

BEGIN;

DROP FUNCTION IF EXISTS public.append_audit_log(text, uuid, text, jsonb, jsonb);
DROP FUNCTION IF EXISTS public.append_audit_log(text, uuid, text, jsonb, jsonb, text);

CREATE OR REPLACE FUNCTION public.append_audit_log(
  p_subject_type text,
  p_subject_id uuid,
  p_action text,
  p_before jsonb DEFAULT NULL,
  p_after jsonb DEFAULT NULL,
  p_ip_address text DEFAULT NULL,
  p_request_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_id uuid := gen_random_uuid();
  v_role text;
  v_ip_hash text;
BEGIN
  PERFORM set_config('row_security', 'off', true);
  SELECT u.role INTO v_role FROM public.users u WHERE u.auth_user_id = auth.uid() LIMIT 1;

  IF p_ip_address IS NOT NULL AND length(trim(p_ip_address)) > 0 THEN
    v_ip_hash := encode(digest(trim(p_ip_address), 'sha256'), 'hex');
  END IF;

  INSERT INTO public.sys_audit_logs (
    id, subject_type, subject_id, action, actor_user_id, actor_role,
    ip_hash, before_state, after_state, request_id
  )
  VALUES (
    v_id, p_subject_type, p_subject_id, p_action, auth.uid(), v_role,
    v_ip_hash, p_before, p_after, p_request_id
  );
  RETURN v_id;
END;
$$;

NOTIFY pgrst, 'reload schema';

COMMIT;
