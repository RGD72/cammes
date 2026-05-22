-- Story 2.6: add superseded status to extraction pipeline + idempotency index for products
-- ADD VALUE IF NOT EXISTS requires PostgreSQL 12+ (Supabase uses 15+) — safe in transaction

ALTER TYPE public.extraction_status ADD VALUE IF NOT EXISTS 'superseded' AFTER 'failed';

-- Partial unique index for product deduplication by job (AC 2)
-- NULL reference is excluded: NULL != NULL in PostgreSQL, so only deduplicate when reference is known
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_job_page_ref
  ON public.products(extraction_job_id, source_page, reference)
  WHERE reference IS NOT NULL;
