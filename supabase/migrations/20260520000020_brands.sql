CREATE TABLE brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9-]+$'),
  name TEXT NOT NULL,
  description TEXT,
  logo_url TEXT,
  published BOOLEAN NOT NULL DEFAULT false,
  owner_admin_id UUID NOT NULL REFERENCES users_profile(id),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_brands_owner ON brands(owner_admin_id);
CREATE INDEX idx_brands_published ON brands(published) WHERE published = true;

ALTER TABLE brands ENABLE ROW LEVEL SECURITY;

-- Admin tem controle total sobre suas próprias marcas
CREATE POLICY brands_admin_full ON brands
  FOR ALL USING (
    owner_admin_id = auth.uid()
    AND EXISTS (SELECT 1 FROM users_profile WHERE id = auth.uid() AND role = 'admin')
  );

-- NOTA: a política brands_customer_read_published referencia user_brand_access
-- que ainda não existe. Será criada em 20260520_0030_user_brand_access.sql.
