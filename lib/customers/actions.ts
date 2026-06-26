'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createServiceRoleSupabaseClient } from '@/lib/supabase/admin';
import { logAuditEvent } from '@/lib/audit/log-event';
import { recordConsent } from '@/lib/consent/actions';
import { CURRENT_DOCUMENT_VERSION } from '@/lib/consent/constants';
import type { Result } from '@/lib/types/index';

export interface AdminCustomer {
  id: string;
  full_name: string;
  email: string;
  is_active: boolean;
  brands: Array<{ id: string; name: string; revoked_at: string | null }>;
  last_sign_in_at: string | null;
}

function permissionDenied(message = 'Não autenticado'): Result<never> {
  return {
    ok: false,
    error: {
      code: 'PERMISSION_DENIED',
      message,
      timestamp: new Date().toISOString(),
      requestId: crypto.randomUUID(),
    },
  };
}

function internalError(message: string): Result<never> {
  return {
    ok: false,
    error: {
      code: 'INTERNAL',
      message,
      timestamp: new Date().toISOString(),
      requestId: crypto.randomUUID(),
    },
  };
}

function conflictError(message: string): Result<never> {
  return {
    ok: false,
    error: {
      code: 'CONFLICT',
      message,
      timestamp: new Date().toISOString(),
      requestId: crypto.randomUUID(),
    },
  };
}

export async function listAdminCustomers(): Promise<Result<AdminCustomer[]>> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return permissionDenied();

  // Step 1: admin's brands (RLS filters by owner_admin_id automatically)
  const { data: adminBrands, error: brandsError } = await supabase
    .from('brands')
    .select('id, name');
  if (brandsError) return internalError(brandsError.message);
  if (!adminBrands?.length) return { ok: true, data: [] };

  const brandIds = adminBrands.map((b: { id: string }) => b.id);
  const brandMap = Object.fromEntries(
    adminBrands.map((b: { id: string; name: string }) => [b.id, b.name]),
  );

  // Step 2: accesses to this admin's brands
  const { data: accesses, error: accessError } = await supabase
    .from('user_brand_access')
    .select('user_id, brand_id, revoked_at')
    .in('brand_id', brandIds);
  if (accessError) return internalError(accessError.message);
  if (!accesses?.length) return { ok: true, data: [] };

  const customerIds = [...new Set(accesses.map((a: { user_id: string }) => a.user_id))];

  // Step 3: customer profiles
  const { data: profiles, error: profileError } = await supabase
    .from('users_profile')
    .select('id, full_name, email, is_active')
    .in('id', customerIds)
    .eq('role', 'customer');
  if (profileError) return internalError(profileError.message);

  // Step 4: last_sign_in_at via service role
  const adminClient = createServiceRoleSupabaseClient();
  const { data: authData } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
  const lastSignInMap = Object.fromEntries(
    (authData?.users ?? []).map((u: { id: string; last_sign_in_at?: string }) => [
      u.id,
      u.last_sign_in_at ?? null,
    ]),
  );

  // Step 5: merge
  const customerBrands: Record<
    string,
    Array<{ id: string; name: string; revoked_at: string | null }>
  > = {};
  for (const a of accesses) {
    if (!customerBrands[a.user_id]) customerBrands[a.user_id] = [];
    customerBrands[a.user_id].push({
      id: a.brand_id,
      name: brandMap[a.brand_id] ?? '',
      revoked_at: a.revoked_at,
    });
  }

  const customers: AdminCustomer[] = (profiles ?? []).map(
    (p: { id: string; full_name: string; email: string; is_active: boolean }) => ({
      id: p.id,
      full_name: p.full_name,
      email: p.email,
      is_active: p.is_active,
      brands: customerBrands[p.id] ?? [],
      last_sign_in_at: lastSignInMap[p.id] ?? null,
    }),
  );

  return { ok: true, data: customers };
}

// E-mail transacional (SMTP) ainda não está configurado no projeto — clientes são
// criados com essa senha padrão e o admin a comunica fora da plataforma (telefone/WhatsApp).
// TODO: voltar para convite por e-mail (inviteUserByEmail) quando o SMTP customizado
// estiver configurado no painel do Supabase.
const DEFAULT_CUSTOMER_PASSWORD = '123456';

export async function inviteCustomer(input: {
  email: string;
  fullName: string;
  phone?: string;
}): Promise<Result<{ userId: string; defaultPassword: string }>> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return permissionDenied();

  const adminClient = createServiceRoleSupabaseClient();
  const email = input.email.trim().toLowerCase();

  const { data: createData, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password: DEFAULT_CUSTOMER_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: input.fullName },
  });

  let invitedUserId: string;

  if (createError) {
    if (
      createError.code !== 'email_exists' &&
      !createError.message.toLowerCase().includes('already been registered')
    ) {
      return internalError(createError.message);
    }

    // auth.users já tem esse e-mail. Pode ser duplicata real (já tem users_profile)
    // ou um registro órfão de um convite anterior que falhou antes de criar o profile.
    const { data: existingProfile } = await adminClient
      .from('users_profile')
      .select('id')
      .eq('email', email)
      .maybeSingle();
    if (existingProfile) {
      return conflictError('E-mail já cadastrado.');
    }

    const { data: listData, error: listError } = await adminClient.auth.admin.listUsers({
      perPage: 1000,
    });
    if (listError) return internalError(listError.message);
    const orphan = listData.users.find((u) => u.email?.toLowerCase() === email);
    if (!orphan) return conflictError('E-mail já cadastrado.');
    invitedUserId = orphan.id;

    // auth.users órfão de um convite anterior — alinha a senha à senha padrão atual
    // para garantir que o cliente consiga acessar.
    const { error: updateError } = await adminClient.auth.admin.updateUserById(orphan.id, {
      password: DEFAULT_CUSTOMER_PASSWORD,
      email_confirm: true,
    });
    if (updateError) return internalError(updateError.message);
  } else {
    invitedUserId = createData.user.id;
  }

  // Create users_profile for invited user (bypasses RLS — invited user has no session yet)
  const { error: profileError } = await adminClient.from('users_profile').upsert(
    {
      id: invitedUserId,
      role: 'customer',
      full_name: input.fullName,
      email,
      phone: input.phone?.trim() || null,
      is_active: true,
    },
    { onConflict: 'id' },
  );
  if (profileError) return internalError(profileError.message);

  // Acesso por padrão a todas as marcas do admin — restringir a uma marca específica
  // é um passo posterior, feito via CustomerBrandManager na página do cliente.
  const { data: adminBrands, error: brandsError } = await supabase.from('brands').select('id');
  if (brandsError) return internalError(brandsError.message);

  const brandIds = (adminBrands ?? []).map((b: { id: string }) => b.id);
  if (brandIds.length > 0) {
    const { error: accessError } = await supabase.from('user_brand_access').upsert(
      brandIds.map((brandId) => ({
        user_id: invitedUserId,
        brand_id: brandId,
        granted_by: user.id,
        granted_at: new Date().toISOString(),
        revoked_at: null,
      })),
      { onConflict: 'user_id,brand_id' },
    );
    if (accessError) return internalError(accessError.message);
  }

  await logAuditEvent('customer_invited', {
    email,
    brandIds,
    invitedBy: user.id,
  });

  return { ok: true, data: { userId: invitedUserId, defaultPassword: DEFAULT_CUSTOMER_PASSWORD } };
}

export async function grantBrandAccess(customerId: string, brandId: string): Promise<Result<void>> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return permissionDenied();

  // UPSERT: handles previously revoked records (PK conflict on re-grant)
  const { error } = await supabase.from('user_brand_access').upsert(
    {
      user_id: customerId,
      brand_id: brandId,
      granted_at: new Date().toISOString(),
      granted_by: user.id,
      revoked_at: null,
    },
    { onConflict: 'user_id,brand_id' },
  );
  if (error) return internalError(error.message);

  await logAuditEvent('customer_brand_granted', { customerId, brandId, grantedBy: user.id });
  return { ok: true, data: undefined };
}

export async function revokeBrandAccess(
  customerId: string,
  brandId: string,
): Promise<Result<void>> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return permissionDenied();

  const { error } = await supabase
    .from('user_brand_access')
    .update({ revoked_at: new Date().toISOString() })
    .eq('user_id', customerId)
    .eq('brand_id', brandId);
  if (error) return internalError(error.message);

  await logAuditEvent('customer_brand_revoked', { customerId, brandId, revokedBy: user.id });
  return { ok: true, data: undefined };
}

export async function deactivateCustomer(customerId: string): Promise<Result<void>> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return permissionDenied();

  const { error } = await supabase
    .from('users_profile')
    .update({ is_active: false })
    .eq('id', customerId)
    .eq('role', 'customer');
  if (error) return internalError(error.message);

  await logAuditEvent('customer_deactivated', { customerId, deactivatedBy: user.id });
  return { ok: true, data: undefined };
}

export async function acceptInviteTerms(): Promise<Result<void>> {
  return recordConsent(CURRENT_DOCUMENT_VERSION);
}
