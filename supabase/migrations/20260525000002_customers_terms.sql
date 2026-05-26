-- Story 5.3: adds terms_accepted_at to users_profile
-- Interim field — Story 5.6 replaces this with consent_log table (full versioning)
ALTER TABLE users_profile ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ NULL;

-- Admin can deactivate customers (update is_active via Server Action)
CREATE POLICY users_profile_admin_update_customers ON users_profile
  FOR UPDATE
  USING (
    role = 'customer'
    AND EXISTS (
      SELECT 1 FROM users_profile a
      WHERE a.id = auth.uid() AND a.role = 'admin'
    )
  )
  WITH CHECK (role = 'customer');
