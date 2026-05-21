import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import {
  supabaseAdmin,
  createTestAdmin,
  createTestCustomer,
  createTestBrand,
  grantAccess,
  getUserClient,
  cleanupTestData,
  type TestUser,
  type TestBrand,
} from './rls-test-helpers'

let adminA: TestUser
let adminB: TestUser
let customerA: TestUser
let customerB: TestUser
let brandA: TestBrand

beforeAll(async () => {
  adminA = await createTestAdmin('uba-test-adminA')
  adminB = await createTestAdmin('uba-test-adminB')
  customerA = await createTestCustomer('uba-test-customerA')
  customerB = await createTestCustomer('uba-test-customerB')
  brandA = await createTestBrand(adminA.id, 'uba-test-brand-a', true)
})

afterAll(async () => {
  await cleanupTestData([adminA.id, adminB.id, customerA.id, customerB.id])
})

describe('uba_admin_manage — controle de acesso por admin', () => {
  it('N-UBA-1: customer_A não consegue INSERT em user_brand_access', async () => {
    const client = await getUserClient(customerA.email, customerA.password)
    const { data, error } = await client.from('user_brand_access').insert({
      user_id: customerA.id,
      brand_id: brandA.id,
      granted_by: customerA.id,
    })
    expect(data).toBeNull()
    expect(error).not.toBeNull()
  })

  it('N-UBA-2: admin_B não consegue INSERT acesso para brand_A (não é dono)', async () => {
    const client = await getUserClient(adminB.email, adminB.password)
    const { data, error } = await client.from('user_brand_access').insert({
      user_id: customerA.id,
      brand_id: brandA.id,
      granted_by: adminB.id,
    })
    expect(data).toBeNull()
    expect(error).not.toBeNull()
  })

  it('P-UBA-1: admin_A consegue INSERT acesso de customer_A para brand_A', async () => {
    const client = await getUserClient(adminA.email, adminA.password)
    const { data, error } = await client.from('user_brand_access').insert({
      user_id: customerA.id,
      brand_id: brandA.id,
      granted_by: adminA.id,
    })
    expect(error).toBeNull()
    expect(data).toBeDefined()
  })
})

describe('uba_self_read — isolamento entre customers', () => {
  it('N-UBA-4: customer_A não vê acessos de customer_B', async () => {
    await grantAccess(customerB.id, brandA.id, adminA.id)
    const client = await getUserClient(customerA.email, customerA.password)
    const { data } = await client
      .from('user_brand_access')
      .select('user_id')
      .eq('user_id', customerB.id)
    expect(data).toHaveLength(0)
  })

  it('P-UBA-4: customer_A vê o próprio acesso via uba_self_read', async () => {
    const client = await getUserClient(customerA.email, customerA.password)
    const { data } = await client
      .from('user_brand_access')
      .select('user_id, brand_id')
      .eq('user_id', customerA.id)
    expect(data!.length).toBeGreaterThanOrEqual(1)
    expect(data![0].user_id).toBe(customerA.id)
  })

  it('N-UBA-3: admin_B não vê acessos de brand_A (não é dono)', async () => {
    const client = await getUserClient(adminB.email, adminB.password)
    const { data } = await client
      .from('user_brand_access')
      .select('brand_id')
      .eq('brand_id', brandA.id)
    expect(data).toHaveLength(0)
  })

  it('N-UBA-5: customer_A não consegue UPDATE no próprio acesso', async () => {
    const client = await getUserClient(customerA.email, customerA.password)
    const { data } = await client
      .from('user_brand_access')
      .update({ revoked_at: new Date().toISOString() })
      .eq('user_id', customerA.id)
      .eq('brand_id', brandA.id)
      .select('user_id')
    expect(data).toHaveLength(0)
  })
})
