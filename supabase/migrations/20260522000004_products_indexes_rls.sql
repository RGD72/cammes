-- Story 2.5: indexes missing from Story 2.4 + refined customer read policy

CREATE INDEX IF NOT EXISTS idx_products_brand_look_group
  ON public.products(brand_id, look_group);

CREATE INDEX IF NOT EXISTS idx_products_brand_display_order
  ON public.products(brand_id, display_order);

-- Refine customer read policy: add brands.published = true guard
DROP POLICY IF EXISTS products_customer_read ON public.products;

CREATE POLICY products_customer_read ON public.products
  FOR SELECT USING (
    status = 'approved'
    AND public.user_has_active_brand_access(brand_id)
    AND EXISTS (
      SELECT 1 FROM public.brands
      WHERE brands.id = products.brand_id
        AND brands.published = true
    )
  );
