import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import {
  supabaseAdmin,
  createTestAdmin,
  createTestCustomer,
  createTestBrand,
  createTestCatalog,
  createTestExtractionJob,
  grantAccess,
  getUserClient,
  cleanupTestData,
  type TestUser,
  type TestBrand,
  type TestCatalog,
  type TestExtractionJob,
} from './rls-test-helpers'

let adminX: TestUser
let adminY: TestUser
let customerA: TestUser
let brandX: TestBrand
let brandY: TestBrand
let catalogX: TestCatalog
let jobX: TestExtractionJob
let productXId: string
let productYId: string

async function createTestProduct(
  brandId: string,
  catalogId: string,
  jobId: string,
  status: 'extracted' | 'approved' | 'hidden' = 'approved',
): Promise<string> {
  const { data, error } = await supabaseAdmin
    .from('products')
    .insert({
      brand_id: brandId,
      catalog_id: catalogId,
      extraction_job_id: jobId,
      reference: `REF-${Date.now()}`,
      description: 'Test product',
      status,
      display_order: 1,
    })
    .select('id')
    .single()
  if (error || !data) throw new Error(`Failed to create product: ${error?.message}`)
  return data.id
}

beforeAll(async () => {
  adminX = await createTestAdmin('products-test-adminX')
  adminY = await createTestAdmin('products-test-adminY')
  customerA = await createTestCustomer('products-test-customerA')
  brandX = await createTestBrand(adminX.id, 'products-test-brand-x', true)
  brandY = await createTestBrand(adminY.id, 'products-test-brand-y', true)
  catalogX = await createTestCatalog(brandX.id, adminX.id)
  jobX = await createTestExtractionJob(catalogX.id, brandX.id, adminX.id)
  const catalogY = await createTestCatalog(brandY.id, adminY.id)
  const jobY = await createTestExtractionJob(catalogY.id, brandY.id, adminY.id)
  productXId = await createTestProduct(brandX.id, catalogX.id, jobX.id, 'approved')
  productYId = await createTestProduct(brandY.id, catalogY.id, jobY.id, 'approved')
})

afterAll(async () => {
  await supabaseAdmin.from('products').delete().in('brand_id', [brandX.id, brandY.id])
  await supabaseAdmin.from('extraction_jobs').delete().in('brand_id', [brandX.id, brandY.id])
  await supabaseAdmin.from('catalogs').delete().in('brand_id', [brandX.id, brandY.id])
  await cleanupTestData([adminX.id, adminY.id, customerA.id])
})

describe('products_admin_manage — isolamento cross-admin', () => {
  it('P-PR-1: admin_X consegue SELECT em produtos da própria brand_X', async () => {
    const client = await getUserClient(adminX.email, adminX.password)
    const { data } = await client.from('products').select('id').eq('brand_id', brandX.id)
    expect(data!.length).toBeGreaterThanOrEqual(1)
    expect(data!.some((p) => p.id === productXId)).toBe(true)
  })

  it('N-PR-1: admin_X não consegue SELECT em produtos de brand_Y (cross-admin)', async () => {
    const client = await getUserClient(adminX.email, adminX.password)
    const { data } = await client.from('products').select('id').eq('id', productYId)
    expect(data).toHaveLength(0)
  })

  it('P-PR-3: admin_X consegue UPDATE em produto da própria brand_X', async () => {
    const client = await getUserClient(adminX.email, adminX.password)
    const { data } = await client
      .from('products')
      .update({ description: 'Updated description' })
      .eq('id', productXId)
      .select('id')
    expect(data).toHaveLength(1)
  })
})

describe('products_customer_read — isolamento de customer', () => {
  it('P-PR-2: customer_A lê produto aprovado de marca publicada com acesso ativo', async () => {
    await grantAccess(customerA.id, brandX.id, adminX.id)
    const client = await getUserClient(customerA.email, customerA.password)
    const { data } = await client
      .from('products')
      .select('id')
      .eq('id', productXId)
      .eq('status', 'approved')
    expect(data).toHaveLength(1)
    expect(data![0].id).toBe(productXId)
  })

  it('N-PR-2: customer_A não lê produto com status=extracted (não aprovado)', async () => {
    const extractedId = await createTestProduct(brandX.id, catalogX.id, jobX.id, 'extracted')
    const client = await getUserClient(customerA.email, customerA.password)
    const { data } = await client.from('products').select('id').eq('id', extractedId)
    expect(data).toHaveLength(0)
    await supabaseAdmin.from('products').delete().eq('id', extractedId)
  })

  it('N-PR-3: customer_A não lê produto de marca com published=false', async () => {
    const unpublishedBrand = await createTestBrand(adminX.id, 'products-test-unpublished', false)
    const unpublishedCatalog = await createTestCatalog(unpublishedBrand.id, adminX.id)
    const unpublishedJob = await createTestExtractionJob(
      unpublishedCatalog.id,
      unpublishedBrand.id,
      adminX.id,
    )
    const unpublishedProductId = await createTestProduct(
      unpublishedBrand.id,
      unpublishedCatalog.id,
      unpublishedJob.id,
      'approved',
    )
    await grantAccess(customerA.id, unpublishedBrand.id, adminX.id)
    const client = await getUserClient(customerA.email, customerA.password)
    const { data } = await client.from('products').select('id').eq('id', unpublishedProductId)
    expect(data).toHaveLength(0)
    await supabaseAdmin.from('products').delete().eq('id', unpublishedProductId)
    await supabaseAdmin.from('extraction_jobs').delete().eq('id', unpublishedJob.id)
    await supabaseAdmin.from('catalogs').delete().eq('id', unpublishedCatalog.id)
    await supabaseAdmin.from('brands').delete().eq('id', unpublishedBrand.id)
  })

  it('N-PR-4: customer_A sem user_brand_access não lê produtos de marca publicada', async () => {
    const client = await getUserClient(customerA.email, customerA.password)
    const { data } = await client.from('products').select('id').eq('id', productYId)
    expect(data).toHaveLength(0)
  })
})
