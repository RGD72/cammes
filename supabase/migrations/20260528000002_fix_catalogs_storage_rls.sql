-- Fix: Unauthorized on catalog PDF upload even with valid JWT.
--
-- Root cause (two compounding issues):
--
-- 1. SET search_path = '' on current_user_is_admin() causes auth.uid() to return
--    NULL silently in the Supabase storage execution context (different Postgres role
--    and session setup than the regular PostgREST path). The function appears correct
--    but the admin check always evaluates to false, denying every upload.
--
-- 2. The storage policy queried public.brands inline (subject to its own RLS).
--    brands_admin_full also calls current_user_is_admin(), creating a nested
--    evaluation that multiplies the search_path bug.
--
-- Fix: single SECURITY DEFINER function that consolidates all three checks
-- (bucket guard, brand ownership, admin role) with SET search_path = public, auth, storage
-- so auth.uid() resolves correctly in the storage execution context.

CREATE OR REPLACE FUNCTION public.catalog_upload_authorized(p_bucket_id text, p_name text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, auth, storage
AS $$
  SELECT
    p_bucket_id = 'catalogs'
    AND EXISTS (
      SELECT 1 FROM public.brands
      WHERE brands.id::text = (storage.foldername(p_name))[1]
        AND brands.owner_admin_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.users_profile
      WHERE id = auth.uid() AND role = 'admin'
    );
$$;

-- Rebuild storage policies using the consolidated function.
-- SECURITY DEFINER bypasses RLS on both brands and users_profile,
-- eliminating nested policy evaluation entirely.
DROP POLICY IF EXISTS catalogs_bucket_admin_insert ON storage.objects;
DROP POLICY IF EXISTS catalogs_bucket_admin_select ON storage.objects;

CREATE POLICY catalogs_bucket_admin_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (public.catalog_upload_authorized(bucket_id, name));

CREATE POLICY catalogs_bucket_admin_select ON storage.objects
  FOR SELECT TO authenticated
  USING (public.catalog_upload_authorized(bucket_id, name));
