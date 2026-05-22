-- Função trigger reutilizável para updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Enum de status do produto (Story 2.5 não precisa recriar — já existe aqui)
DO $$ BEGIN
  CREATE TYPE public.product_status AS ENUM ('extracted', 'approved', 'hidden');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Tabela products — schema básico para o pipeline de extração
-- Story 2.5 adiciona índices completos e refina RLS via ALTER TABLE/CREATE INDEX IF NOT EXISTS
CREATE TABLE IF NOT EXISTS public.products (
  id                    UUID                  PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id              UUID                  NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  catalog_id            UUID                  NOT NULL REFERENCES public.catalogs(id) ON DELETE CASCADE,
  extraction_job_id     UUID                  NOT NULL REFERENCES public.extraction_jobs(id) ON DELETE CASCADE,
  reference             TEXT,
  description           TEXT,
  sizes                 JSONB,
  colors                JSONB,
  price_brl             NUMERIC,
  image_crop_url        TEXT,
  look_group            TEXT,
  source_page           INT,
  extraction_confidence JSONB,
  status                public.product_status NOT NULL DEFAULT 'extracted',
  display_order         INT,
  created_at            TIMESTAMPTZ           NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ           NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_products_brand_catalog ON public.products(brand_id, catalog_id);
CREATE INDEX IF NOT EXISTS idx_products_brand_status  ON public.products(brand_id, status);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Admin: CRUD em produtos de suas marcas
CREATE POLICY products_admin_manage ON public.products
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.brands
      WHERE brands.id = products.brand_id
        AND brands.owner_admin_id = auth.uid()
    )
    AND public.current_user_is_admin()
  );

-- Customer: SELECT em produtos aprovados de marcas com acesso ativo
-- Story 2.5 refina esta política com isolamento mais granular
CREATE POLICY products_customer_read ON public.products
  FOR SELECT USING (
    status = 'approved'
    AND public.user_has_active_brand_access(brand_id)
  );

CREATE TRIGGER set_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();
