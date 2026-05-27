-- Story 5.6: consent_log table + consented_version column
-- Replaces interim terms_accepted_at field from Story 5.3

CREATE TABLE consent_log (
  id               BIGSERIAL PRIMARY KEY,
  user_id          UUID NOT NULL REFERENCES users_profile(id) ON DELETE CASCADE,
  document_version TEXT NOT NULL,
  accepted_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address       INET
);

CREATE INDEX idx_consent_user_version ON consent_log(user_id, document_version);

ALTER TABLE consent_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY consent_log_self_read ON consent_log
  FOR SELECT USING (user_id = auth.uid());

-- Replace terms_accepted_at with versioned consented_version
ALTER TABLE users_profile ADD COLUMN consented_version TEXT NULL;

-- Migrate existing accepted users
UPDATE users_profile
SET consented_version = '1.0'
WHERE terms_accepted_at IS NOT NULL;

-- Backfill consent_log from interim field
INSERT INTO consent_log (user_id, document_version, accepted_at)
SELECT id, '1.0', terms_accepted_at
FROM users_profile
WHERE terms_accepted_at IS NOT NULL;

ALTER TABLE users_profile DROP COLUMN terms_accepted_at;
