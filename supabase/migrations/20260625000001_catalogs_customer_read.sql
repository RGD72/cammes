-- catalogs só tinha policy admin (catalogs_admin_manage), então getCatalogByBrand()
-- e getCatalogSignedUrl() — que usam o client com RLS, não service role — sempre
-- retornavam 0 linhas para clientes. O botão "Baixar catálogo PDF" nunca aparecia
-- e, mesmo que aparecesse, a geração da signed URL falharia.
CREATE POLICY catalogs_customer_read ON public.catalogs
  FOR SELECT USING (
    public.user_has_active_brand_access(brand_id)
  );

CREATE POLICY catalogs_bucket_customer_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'catalogs'
    AND EXISTS (
      SELECT 1 FROM public.brands
      WHERE brands.id::text = (storage.foldername(name))[1]
        AND public.user_has_active_brand_access(brands.id)
    )
  );
