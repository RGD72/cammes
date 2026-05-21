-- Extensions necessárias para o MVP completo
-- pgcrypto: encriptação da chave OpenRouter (Story 2.1)
-- pgaudit: auditoria SQL (Story 5.5)
-- pg_cron: purge automático de audit_logs (Story 5.5)
-- pg_net: trigger HTTP para pipeline de extração (Story 2.4)
-- uuid-ossp: geração de UUIDs compatíveis
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pgaudit;
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
