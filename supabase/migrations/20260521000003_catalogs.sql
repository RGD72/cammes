-- Enum de status do catálogo
CREATE TYPE public.catalog_status AS ENUM (
  'pending',
  'processing',
  'ready_for_review',
  'published'
);

-- Tabela catalogs
CREATE TABLE IF NOT EXISTS public.catalogs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id    UUID        NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  file_path   TEXT        NOT NULL,
  page_count  INT,
  status      public.catalog_status NOT NULL DEFAULT 'pending',
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  uploaded_by UUID        NOT NULL REFERENCES public.users_profile(id)
);

CREATE INDEX IF NOT EXISTS idx_catalogs_brand_id    ON public.catalogs(brand_id);
CREATE INDEX IF NOT EXISTS idx_catalogs_uploaded_by ON public.catalogs(uploaded_by);

ALTER TABLE public.catalogs ENABLE ROW LEVEL SECURITY;

-- Admins gerenciam apenas catálogos de marcas que lhes pertencem
CREATE POLICY catalogs_admin_manage ON public.catalogs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.brands
      WHERE brands.id = catalogs.brand_id
        AND brands.owner_admin_id = auth.uid()
    )
    AND public.current_user_is_admin()
  );

-- Bucket privado para PDFs de catálogos
-- file_size_limit: 500MB; allowed_mime_types: server-side AC4 validation
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'catalogs',
  'catalogs',
  false,
  524288000,
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Storage Policy: admin pode fazer upload em catalogs/{brand_id}/*
-- onde brand_id é de uma marca que lhe pertence
CREATE POLICY catalogs_bucket_admin_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'catalogs'
    AND EXISTS (
      SELECT 1 FROM public.brands
      WHERE brands.id::text = (storage.foldername(name))[1]
        AND brands.owner_admin_id = auth.uid()
    )
    AND public.current_user_is_admin()
  );

CREATE POLICY catalogs_bucket_admin_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'catalogs'
    AND EXISTS (
      SELECT 1 FROM public.brands
      WHERE brands.id::text = (storage.foldername(name))[1]
        AND brands.owner_admin_id = auth.uid()
    )
    AND public.current_user_is_admin()
  );
