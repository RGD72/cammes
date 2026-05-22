CREATE TYPE public.extraction_status AS ENUM ('queued', 'running', 'done', 'failed');

CREATE TABLE IF NOT EXISTS public.extraction_jobs (
  id                UUID                     PRIMARY KEY DEFAULT gen_random_uuid(),
  catalog_id        UUID                     NOT NULL REFERENCES public.catalogs(id) ON DELETE CASCADE,
  brand_id          UUID                     NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  admin_user_id     UUID                     NOT NULL REFERENCES public.users_profile(id),
  status            public.extraction_status NOT NULL DEFAULT 'queued',
  model_id          TEXT                     NOT NULL,
  pages_total       INT                      NOT NULL,
  pages_processed   INT                      NOT NULL DEFAULT 0,
  products_count    INT                      NOT NULL DEFAULT 0,
  actual_cost_usd   NUMERIC,
  actual_cost_brl   NUMERIC,
  error_message     TEXT,
  started_at        TIMESTAMPTZ,
  completed_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ              NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_extraction_jobs_catalog_id   ON public.extraction_jobs(catalog_id);
CREATE INDEX IF NOT EXISTS idx_extraction_jobs_brand_status ON public.extraction_jobs(brand_id, status);

ALTER TABLE public.extraction_jobs ENABLE ROW LEVEL SECURITY;

-- Admin acessa jobs das marcas que lhe pertencem (join via brands.owner_admin_id)
CREATE POLICY extraction_jobs_admin_manage ON public.extraction_jobs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.brands
      WHERE brands.id = extraction_jobs.brand_id
        AND brands.owner_admin_id = auth.uid()
    )
    AND public.current_user_is_admin()
  );
