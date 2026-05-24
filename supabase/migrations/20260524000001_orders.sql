-- Story 4.4: Orders and order_items tables with RLS
-- orders: permanent record of a submitted cart
-- order_items: snapshot of 8-column cart data at submission time

CREATE TYPE public.order_status AS ENUM ('received', 'viewed');

CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT NOT NULL UNIQUE,
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE RESTRICT,
  customer_user_id UUID NOT NULL REFERENCES public.users_profile(id) ON DELETE RESTRICT,
  customer_name TEXT NOT NULL,
  total_brl NUMERIC(12,2) NOT NULL,
  status public.order_status NOT NULL DEFAULT 'received',
  client_idempotency_key UUID NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  viewed_at TIMESTAMPTZ,
  pdf_path TEXT,
  UNIQUE (customer_user_id, client_idempotency_key)
);

CREATE INDEX idx_orders_brand_submitted ON public.orders(brand_id, submitted_at DESC);
CREATE INDEX idx_orders_customer ON public.orders(customer_user_id, submitted_at DESC);

CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  reference TEXT NOT NULL,
  description TEXT NOT NULL,
  color TEXT,
  size TEXT,
  quantity INTEGER NOT NULL CHECK (quantity >= 1),
  customer_name TEXT NOT NULL,
  unit_price_brl NUMERIC(10,2) NOT NULL,
  total_brl NUMERIC(12,2) NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_order_items_order ON public.order_items(order_id);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Customer reads their own orders
CREATE POLICY orders_customer_own ON public.orders
  FOR SELECT USING (customer_user_id = auth.uid());

-- Brand admin reads and manages orders for their brand
CREATE POLICY orders_admin_own_brand ON public.orders
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.brands b
      WHERE b.id = orders.brand_id AND b.owner_admin_id = auth.uid()
    )
  );

-- order_items inherit access through their parent order
CREATE POLICY order_items_inherit ON public.order_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id
        AND (
          o.customer_user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.brands b
            WHERE b.id = o.brand_id AND b.owner_admin_id = auth.uid()
          )
        )
    )
  );
