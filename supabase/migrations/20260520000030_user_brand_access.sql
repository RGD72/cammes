CREATE TABLE user_brand_access (
  user_id UUID NOT NULL REFERENCES users_profile(id) ON DELETE CASCADE,
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  granted_by UUID NOT NULL REFERENCES users_profile(id),
  revoked_at TIMESTAMPTZ,
  PRIMARY KEY (user_id, brand_id)
);
CREATE INDEX idx_uba_user_active ON user_brand_access(user_id) WHERE revoked_at IS NULL;
CREATE INDEX idx_uba_brand_active ON user_brand_access(brand_id) WHERE revoked_at IS NULL;

ALTER TABLE user_brand_access ENABLE ROW LEVEL SECURITY;

-- Admin gerencia acessos para marcas que ele possui
CREATE POLICY uba_admin_manage ON user_brand_access
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM brands b
      WHERE b.id = user_brand_access.brand_id
        AND b.owner_admin_id = auth.uid()
    )
  );

-- Usuário vê os próprios acessos
CREATE POLICY uba_self_read ON user_brand_access
  FOR SELECT USING (user_id = auth.uid());

-- Policy de brands que dependia de user_brand_access (criada aqui pois uba já existe)
CREATE POLICY brands_customer_read_published ON brands
  FOR SELECT USING (
    published = true
    AND EXISTS (
      SELECT 1 FROM user_brand_access uba
      WHERE uba.brand_id = brands.id
        AND uba.user_id = auth.uid()
        AND uba.revoked_at IS NULL
    )
  );
