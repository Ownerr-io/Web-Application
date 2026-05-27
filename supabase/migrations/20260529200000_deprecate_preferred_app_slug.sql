-- Document deprecated launcher column (do not drop until analytics confirm zero reads).

COMMENT ON COLUMN public.platform_users.preferred_app_slug IS
  'DEPRECATED (2026-05): Product lock uses sessionStorage (ownerr.active_product) and product_sessions.product. Application code must not read or write this column. Safe to drop in a future migration after verification.';
