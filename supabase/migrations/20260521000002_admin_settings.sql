-- Story 2.1: Gestão Segura da Chave OpenRouter (BYOK)
-- Tabela admin_settings: armazena chave OpenRouter criptografada por admin

CREATE TABLE IF NOT EXISTS public.admin_settings (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id           UUID NOT NULL UNIQUE REFERENCES public.users_profile(id) ON DELETE CASCADE,
  openrouter_key_encrypted TEXT,
  openrouter_model        TEXT NOT NULL DEFAULT 'google/gemini-flash-2.5',
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_settings_admin_user_id
  ON public.admin_settings(admin_user_id);

ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

-- Admin pode ler e modificar apenas seus próprios settings
CREATE POLICY admin_settings_self_manage ON public.admin_settings
  FOR ALL
  USING (
    admin_user_id = auth.uid()
    AND public.current_user_is_admin()
  );

-- Helper: criptografa texto via pgcrypto (retorna base64 para armazenar como TEXT)
-- O segredo é passado como parâmetro SQL — nunca interpolado na string
CREATE OR REPLACE FUNCTION public.pgp_encrypt_text(p_plaintext text, p_secret text)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT encode(public.pgp_sym_encrypt(p_plaintext, p_secret), 'base64');
$$;

-- Helper: descriptografa via pgcrypto (recebe base64 TEXT, retorna texto)
CREATE OR REPLACE FUNCTION public.pgp_decrypt_text(p_ciphertext text, p_secret text)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT public.pgp_sym_decrypt(decode(p_ciphertext, 'base64'), p_secret);
$$;
