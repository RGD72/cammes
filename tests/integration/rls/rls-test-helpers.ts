import { createClient, SupabaseClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321'
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
const ANON_KEY = process.env.SUPABASE_ANON_KEY ?? ''

export const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

export async function getUserClient(email: string, password: string): Promise<SupabaseClient> {
  const client = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { error } = await client.auth.signInWithPassword({ email, password })
  if (error) throw new Error(`Failed to sign in as ${email}: ${error.message}`)
  return client
}

export interface TestUser {
  id: string
  email: string
  password: string
}

export interface TestBrand {
  id: string
  slug: string
}

export async function createTestAdmin(emailPrefix: string): Promise<TestUser> {
  const email = `${emailPrefix}-admin@test-rls.cammes.dev`
  const password = 'Test1234!'
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (error || !data.user) throw new Error(`Failed to create admin user ${email}: ${error?.message}`)
  const { error: profileError } = await supabaseAdmin.from('users_profile').insert({
    id: data.user.id,
    role: 'admin',
    full_name: `Admin ${emailPrefix}`,
    email,
  })
  if (profileError) throw new Error(`Failed to insert admin profile: ${profileError.message}`)
  return { id: data.user.id, email, password }
}

export async function createTestCustomer(emailPrefix: string): Promise<TestUser> {
  const email = `${emailPrefix}-customer@test-rls.cammes.dev`
  const password = 'Test1234!'
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (error || !data.user) throw new Error(`Failed to create customer user ${email}: ${error?.message}`)
  const { error: profileError } = await supabaseAdmin.from('users_profile').insert({
    id: data.user.id,
    role: 'customer',
    full_name: `Customer ${emailPrefix}`,
    email,
  })
  if (profileError) throw new Error(`Failed to insert customer profile: ${profileError.message}`)
  return { id: data.user.id, email, password }
}

export async function createTestBrand(adminId: string, slug: string, published = true): Promise<TestBrand> {
  const { data, error } = await supabaseAdmin
    .from('brands')
    .insert({
      slug,
      name: `Brand ${slug}`,
      owner_admin_id: adminId,
      published,
    })
    .select('id, slug')
    .single()
  if (error || !data) throw new Error(`Failed to create brand ${slug}: ${error?.message}`)
  return { id: data.id, slug: data.slug }
}

export async function grantAccess(customerId: string, brandId: string, adminId: string): Promise<void> {
  const { error } = await supabaseAdmin.from('user_brand_access').upsert(
    { user_id: customerId, brand_id: brandId, granted_by: adminId, revoked_at: null },
    { onConflict: 'user_id,brand_id' },
  )
  if (error) throw new Error(`Failed to grant access: ${error.message}`)
}

export async function revokeAccess(customerId: string, brandId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('user_brand_access')
    .update({ revoked_at: new Date().toISOString() })
    .eq('user_id', customerId)
    .eq('brand_id', brandId)
  if (error) throw new Error(`Failed to revoke access: ${error.message}`)
}

export interface TestCatalog {
  id: string
}

export async function createTestCatalog(brandId: string, uploadedBy: string): Promise<TestCatalog> {
  const { data, error } = await supabaseAdmin
    .from('catalogs')
    .insert({
      brand_id: brandId,
      file_path: `test/catalog-${Date.now()}.pdf`,
      page_count: 10,
      status: 'pending',
      uploaded_by: uploadedBy,
    })
    .select('id')
    .single()
  if (error || !data) throw new Error(`Failed to create catalog: ${error?.message}`)
  return { id: data.id }
}

export interface TestExtractionJob {
  id: string
}

export async function createTestExtractionJob(
  catalogId: string,
  brandId: string,
  adminId: string,
): Promise<TestExtractionJob> {
  const { data, error } = await supabaseAdmin
    .from('extraction_jobs')
    .insert({
      catalog_id: catalogId,
      brand_id: brandId,
      admin_user_id: adminId,
      status: 'done',
      model_id: 'test-model',
      pages_total: 10,
    })
    .select('id')
    .single()
  if (error || !data) throw new Error(`Failed to create extraction job: ${error?.message}`)
  return { id: data.id }
}

export async function cleanupTestData(userIds: string[]): Promise<void> {
  if (userIds.length === 0) return
  await supabaseAdmin.from('user_brand_access').delete().in('user_id', userIds)
  await supabaseAdmin.from('brands').delete().in('owner_admin_id', userIds)
  for (const id of userIds) {
    await supabaseAdmin.auth.admin.deleteUser(id)
  }
}
