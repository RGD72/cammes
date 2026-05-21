CREATE TYPE user_role AS ENUM ('admin', 'customer');

CREATE TABLE users_profile (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_users_profile_role ON users_profile(role);

ALTER TABLE users_profile ENABLE ROW LEVEL SECURITY;

-- Usuário lê o próprio perfil
CREATE POLICY users_profile_self_read ON users_profile
  FOR SELECT USING (id = auth.uid());

-- Admin lê perfis de clientes (para gestão de acessos — Story 5.3)
CREATE POLICY users_profile_admin_read_customers ON users_profile
  FOR SELECT USING (
    role = 'customer'
    AND EXISTS (
      SELECT 1 FROM users_profile a
      WHERE a.id = auth.uid() AND a.role = 'admin'
    )
  );

-- Usuário atualiza o próprio perfil
CREATE POLICY users_profile_self_update ON users_profile
  FOR UPDATE USING (id = auth.uid());
