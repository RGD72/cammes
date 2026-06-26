-- Fix: "Erro ao gerar link de download" for customers downloading the brand catalog PDF.
--
-- Root cause: catalogs_bucket_customer_select (20260625000001) called
-- public.user_has_active_brand_access() inside a storage.objects USING clause.
-- That function is declared with SET search_path = '', which — per the same bug
-- documented in 20260528000002_fix_catalogs_storage_rls.sql — makes auth.uid()
-- resolve to NULL in the Storage execution context. The EXISTS check always
-- failed, so createSignedUrl() was denied for every customer.
--
-- Fix: consolidated SECURITY DEFINER function scoped to the storage policy,
-- with SET search_path = public, auth, storage, mirroring catalog_upload_authorized().

CREATE OR REPLACE FUNCTION public.catalog_download_authorized(p_bucket_id text, p_name text)
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
      JOIN public.user_brand_access ON user_brand_access.brand_id = brands.id
      WHERE brands.id::text = (storage.foldername(p_name))[1]
        AND user_brand_access.user_id = auth.uid()
        AND user_brand_access.revoked_at IS NULL
    );
$$;

DROP POLICY IF EXISTS catalogs_bucket_customer_select ON storage.objects;
CREATE POLICY catalogs_bucket_customer_select ON storage.objects
  FOR SELECT TO authenticated
  USING (public.catalog_download_authorized(bucket_id, name));
