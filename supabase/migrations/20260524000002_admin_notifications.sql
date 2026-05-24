-- Story 4.4: Admin notifications table
-- Stores new_order events for brand admins; badge UI is Story 4.6

CREATE TABLE public.admin_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES public.users_profile(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  brand_id UUID REFERENCES public.brands(id) ON DELETE CASCADE,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Partial index: unread notifications per admin, ordered by recency
CREATE INDEX idx_notif_admin_unread ON public.admin_notifications(admin_user_id, created_at DESC)
  WHERE read = false;

ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

-- Admin sees only their own notifications
CREATE POLICY notif_admin_own ON public.admin_notifications
  FOR ALL USING (admin_user_id = auth.uid());
