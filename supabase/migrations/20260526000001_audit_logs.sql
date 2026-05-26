-- migration: 20260526000001_audit_logs
-- story: 5.5 — Log de Auditoria e Eventos de Produto
-- Phase 2 purge policy (pg_cron) planejada:
--   SELECT cron.schedule('audit-purge', '0 3 * * *',
--     $$DELETE FROM audit_logs WHERE created_at < now() - interval '90 days'$$);
-- MVP: logs permanentes (sem purge automático).

CREATE TABLE audit_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES users_profile(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  target_resource_type TEXT,
  target_resource_id TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_user_created ON audit_logs(user_id, created_at DESC);
CREATE INDEX idx_audit_event_created ON audit_logs(event_type, created_at DESC);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Apenas admins podem ler logs de auditoria.
-- Inserts são feitos via service_role server-side (sem policy de INSERT user-facing).
CREATE POLICY audit_admin_read ON audit_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users_profile WHERE id = auth.uid() AND role = 'admin')
  );
