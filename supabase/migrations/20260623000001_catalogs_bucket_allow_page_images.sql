-- The catalogs bucket only allowed application/pdf. Page images (rendered
-- client-side from the PDF for product photos on the storefront) are JPEGs
-- stored under {brand_id}/{catalog_id}/pages/page-{n}.jpg in the same bucket
-- so they're covered by the existing brand-ownership RLS policies.
UPDATE storage.buckets
SET allowed_mime_types = ARRAY['application/pdf', 'image/jpeg']
WHERE id = 'catalogs';

-- No DELETE policy existed on storage.objects for this bucket — deleteCatalog/
-- deleteBrand's storage cleanup (file_path, and now pages/*) was silently a
-- no-op for admins. Reuses the existing catalog_upload_authorized() guard.
CREATE POLICY catalogs_bucket_admin_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (public.catalog_upload_authorized(bucket_id, name));
