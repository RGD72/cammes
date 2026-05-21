-- Fix: infinite recursion in RLS policies. Discovered in Story 1.6 integration tests.
--
-- Three circular references identified:
--
-- 1. brands_customer_read_published → user_brand_access (uba_admin_manage → brands → cycle)
-- 2. users_profile_admin_read_customers → users_profile (self-referential)
-- 3. brands_admin_full → users_profile (users_profile_admin_read_customers → users_profile → cycle)
--
-- Fix: SECURITY DEFINER functions bypass RLS on referenced tables, breaking all cycles.
-- These functions run as the definer (postgres/superuser), avoiding recursive policy evaluation.
-- Security is preserved: auth.uid() returns the current authenticated user's ID in any context.

-- Function 1: Check if current authenticated user is admin (bypasses users_profile RLS)
CREATE OR REPLACE FUNCTION public.current_user_is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users_profile
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- Function 2: Check if current user has active access to a brand (bypasses user_brand_access RLS)
CREATE OR REPLACE FUNCTION public.user_has_active_brand_access(p_brand_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_brand_access
    WHERE brand_id = p_brand_id
      AND user_id = auth.uid()
      AND revoked_at IS NULL
  );
$$;

-- Fix users_profile_admin_read_customers (self-referential)
DROP POLICY IF EXISTS users_profile_admin_read_customers ON public.users_profile;
CREATE POLICY users_profile_admin_read_customers ON public.users_profile
  FOR SELECT USING (
    role = 'customer'
    AND public.current_user_is_admin()
  );

-- Fix brands_admin_full (queries users_profile which has self-referential policy)
DROP POLICY IF EXISTS brands_admin_full ON public.brands;
CREATE POLICY brands_admin_full ON public.brands
  FOR ALL USING (
    owner_admin_id = auth.uid()
    AND public.current_user_is_admin()
  );

-- Fix brands_customer_read_published (queries user_brand_access which queries brands)
DROP POLICY IF EXISTS brands_customer_read_published ON public.brands;
CREATE POLICY brands_customer_read_published ON public.brands
  FOR SELECT USING (
    published = true
    AND public.user_has_active_brand_access(id)
  );
