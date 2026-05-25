INSERT INTO storage.buckets (id, name, public)
VALUES ('orders', 'orders', false)
ON CONFLICT (id) DO NOTHING;
