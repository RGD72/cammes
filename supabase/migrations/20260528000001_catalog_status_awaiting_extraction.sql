-- Add 'awaiting_extraction' to catalog_status enum.
-- This value is used by countPdfPagesAndUpdateStatus after a successful upload,
-- to signal that the PDF is ready for the extraction pipeline.
ALTER TYPE public.catalog_status ADD VALUE IF NOT EXISTS 'awaiting_extraction' AFTER 'pending';
