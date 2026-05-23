-- Story 4.2: Cart schema with RLS
-- carts: one cart per (user_id, brand_id) pair
-- cart_items: line items belonging to a cart

CREATE TABLE public.carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users_profile(id) ON DELETE CASCADE,
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, brand_id)
);

CREATE TABLE public.cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id UUID NOT NULL REFERENCES public.carts(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  color TEXT,
  size TEXT,
  quantity INTEGER NOT NULL CHECK (quantity >= 1 AND quantity <= 99),
  unit_price_brl_snapshot NUMERIC(10,2) NOT NULL,
  total_brl NUMERIC(12,2) NOT NULL,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cart_items_cart ON public.cart_items(cart_id);

ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

-- Users can only access their own carts
CREATE POLICY carts_owner ON public.carts
  FOR ALL USING (user_id = auth.uid());

-- Users can only access cart_items belonging to their carts
CREATE POLICY cart_items_owner ON public.cart_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.carts c
      WHERE c.id = cart_items.cart_id
        AND c.user_id = auth.uid()
    )
  );
