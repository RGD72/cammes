import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import {
  supabaseAdmin,
  createTestAdmin,
  createTestCustomer,
  createTestBrand,
  grantAccess,
  revokeAccess,
  getUserClient,
  cleanupTestData,
  type TestUser,
  type TestBrand,
} from './rls-test-helpers'

let adminA: TestUser
let adminB: TestUser
let customerA: TestUser
let brandA: TestBrand
let brandB: TestBrand

beforeAll(async () => {
  adminA = await createTestAdmin('brands-test-adminA')
  adminB = await createTestAdmin('brands-test-adminB')
  customerA = await createTestCustomer('brands-test-customerA')
  brandA = await createTestBrand(adminA.id, 'brands-test-brand-a', true)
  brandB = await createTestBrand(adminB.id, 'brands-test-brand-b', true)
})

afterAll(async () => {
  await cleanupTestData([adminA.id, adminB.id, customerA.id])
})

describe('brands_admin_full — isolamento cross-admin', () => {
  it('N-BR-1: admin_A não consegue SELECT em brand_B (cross-admin)', async () => {
    const client = await getUserClient(adminA.email, adminA.password)
    const { data } = await client.from('brands').select('id').eq('id', brandB.id)
    expect(data).toHaveLength(0)
  })

  it('N-BR-2: admin_A não consegue UPDATE em brand_B', async () => {
    const client = await getUserClient(adminA.email, adminA.password)
    const { data } = await client
      .from('brands')
      .update({ name: 'Hacked' })
      .eq('id', brandB.id)
      .select('id')
    expect(data).toHaveLength(0)
  })

  it('N-BR-3: admin_A não consegue DELETE em brand_B', async () => {
    const client = await getUserClient(adminA.email, adminA.password)
    const { data } = await client.from('brands').delete().eq('id', brandB.id).select('id')
    expect(data).toHaveLength(0)
    const { data: stillExists } = await supabaseAdmin.from('brands').select('id').eq('id', brandB.id).single()
    expect(stillExists).not.toBeNull()
  })

  it('P-BR-1: admin_A consegue SELECT na própria brand_A', async () => {
    const client = await getUserClient(adminA.email, adminA.password)
    const { data } = await client.from('brands').select('id').eq('id', brandA.id)
    expect(data).toHaveLength(1)
    expect(data![0].id).toBe(brandA.id)
  })

  it('P-BR-2: admin_A consegue UPDATE na própria brand_A', async () => {
    const client = await getUserClient(adminA.email, adminA.password)
    const { data } = await client
      .from('brands')
      .update({ name: 'Brand A Updated' })
      .eq('id', brandA.id)
      .select('id')
    expect(data).toHaveLength(1)
  })
})

describe('brands_customer_read_published — acesso de customer', () => {
  it('N-BR-4: customer_A sem user_brand_access não vê brand_A nem brand_B', async () => {
    const client = await getUserClient(customerA.email, customerA.password)
    const { data } = await client.from('brands').select('id')
    expect(data).toHaveLength(0)
  })

  it('P-BR-5: customer_A com user_brand_access ativo vê brand_A publicada', async () => {
    await grantAccess(customerA.id, brandA.id, adminA.id)
    const client = await getUserClient(customerA.email, customerA.password)
    const { data } = await client.from('brands').select('id').eq('id', brandA.id)
    expect(data).toHaveLength(1)
    expect(data![0].id).toBe(brandA.id)
  })

  it('N-BR-5: customer_A com acesso revogado não vê brand_A', async () => {
    await revokeAccess(customerA.id, brandA.id)
    const client = await getUserClient(customerA.email, customerA.password)
    const { data } = await client.from('brands').select('id').eq('id', brandA.id)
    expect(data).toHaveLength(0)
  })

  it('N-BR-7: customer_A não consegue UPDATE em brand_A (sem policy de escrita)', async () => {
    await grantAccess(customerA.id, brandA.id, adminA.id)
    const client = await getUserClient(customerA.email, customerA.password)
    const { data } = await client
      .from('brands')
      .update({ name: 'Hacked by customer' })
      .eq('id', brandA.id)
      .select('id')
    expect(data).toHaveLength(0)
  })
})

describe('brands — brand não publicada', () => {
  it('N-BR-6: customer_A não vê brand não publicada mesmo com acesso ativo', async () => {
    const unpublishedBrand = await createTestBrand(adminA.id, 'brands-test-unpublished', false)
    await grantAccess(customerA.id, unpublishedBrand.id, adminA.id)
    const client = await getUserClient(customerA.email, customerA.password)
    const { data } = await client.from('brands').select('id').eq('id', unpublishedBrand.id)
    expect(data).toHaveLength(0)
    await supabaseAdmin.from('brands').delete().eq('id', unpublishedBrand.id)
  })
})
