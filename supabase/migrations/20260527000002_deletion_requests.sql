-- Story 5.7: Direito ao Esquecimento — tabela deletion_requests

CREATE TABLE public.deletion_requests (
  id             BIGSERIAL PRIMARY KEY,
  user_id        UUID NULL REFERENCES public.users_profile(id) ON DELETE SET NULL,
  user_email     TEXT NOT NULL,
  requested_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  status         TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'in_review', 'completed')),
  completed_at   TIMESTAMPTZ NULL,
  processed_by   UUID NULL REFERENCES public.users_profile(id) ON DELETE SET NULL,
  admin_notes    TEXT NULL
);

CREATE INDEX idx_deletion_requests_status
  ON public.deletion_requests(status)
  WHERE status != 'completed';

CREATE INDEX idx_deletion_requests_user
  ON public.deletion_requests(user_id)
  WHERE status != 'completed';

ALTER TABLE public.deletion_requests ENABLE ROW LEVEL SECURITY;

-- Clientes podem ler suas próprias solicitações
CREATE POLICY deletion_requests_self_read
  ON public.deletion_requests
  FOR SELECT
  USING (user_id = auth.uid());

-- INSERT e UPDATE via service_role apenas (sem policy user-facing)
