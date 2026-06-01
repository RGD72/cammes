-- Replace partial unique index with a full unique index so that
-- ON CONFLICT (extraction_job_id, source_page, reference) resolves
-- deterministically. PostgreSQL treats NULL as distinct in unique indexes,
-- so multiple rows with reference IS NULL are still allowed.
DROP INDEX IF EXISTS public.idx_products_job_page_ref;

CREATE UNIQUE INDEX idx_products_job_page_ref
  ON public.products(extraction_job_id, source_page, reference);
