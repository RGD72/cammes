import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createServiceRoleSupabaseClient: vi.fn(),
}))

vi.mock('@/lib/orders/actions', () => ({
  getOrder: vi.fn(),
}))

vi.mock('@/lib/pdf/order-pdf', () => ({
  renderOrderPdfBuffer: vi.fn().mockResolvedValue(Buffer.from('PDF')),
}))

import { GET } from '@/app/api/orders/[id]/pdf/route'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createServiceRoleSupabaseClient } from '@/lib/supabase/admin'
import { getOrder } from '@/lib/orders/actions'
import type { Order } from '@/lib/types/index'

// ---- fixtures ---------------------------------------------------------------

const ORDER_ID = '00000000-0000-0000-0000-000000000050'
const BRAND_ID = '00000000-0000-0000-0000-000000000001'
const USER_ID = '00000000-0000-0000-0000-000000000099'
const ADMIN_USER_ID = '00000000-0000-0000-0000-000000000070'
const OTHER_USER_ID = '00000000-0000-0000-0000-000000000088'
const SIGNED_URL = 'https://storage.example.com/signed/pedido.pdf?token=abc'

const MOCK_ORDER: Order = {
  id: ORDER_ID,
  order_number: 'CMM-202605-0001',
  brand_id: BRAND_ID,
  customer_user_id: USER_ID,
  customer_name: 'Ana Silva',
  total_brl: 100.0,
  status: 'received',
  client_idempotency_key: '00000000-0000-0000-0000-000000000011',
  submitted_at: '2026-05-25T00:00:00Z',
  viewed_at: null,
  pdf_path: null,
}

const MOCK_ITEMS = [
  {
    id: '00000000-0000-0000-0000-000000000060',
    order_id: ORDER_ID,
    product_id: '00000000-0000-0000-0000-000000000002',
    reference: 'REF-001',
    description: 'Camiseta Básica',
    color: 'Azul',
    size: 'M',
    quantity: 2,
    customer_name: 'Ana Silva',
    unit_price_brl: 50.0,
    total_brl: 100.0,
    display_order: 0,
  },
]

function makeRequest(orderId = ORDER_ID) {
  return {
    req: new Request(`http://localhost/api/orders/${orderId}/pdf`),
    context: { params: Promise.resolve({ id: orderId }) },
  }
}

function makeServerClient(userId: string | null) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: userId ? { id: userId } : null } }),
    },
  }
}

function makeAdminClient({
  brandOwnerId = ADMIN_USER_ID,
  uploadError = null,
  signedUrl = SIGNED_URL,
  signedError = null,
}: {
  brandOwnerId?: string
  uploadError?: unknown
  signedUrl?: string
  signedError?: unknown
} = {}) {
  const fromFn = vi.fn().mockImplementation((table: string) => {
    if (table === 'brands') {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { owner_admin_id: brandOwnerId, name: 'Marca Teste', logo_url: null },
          error: null,
        }),
      }
    }
    if (table === 'orders') {
      return {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      }
    }
    return {}
  })

  return {
    from: fromFn,
    storage: {
      from: vi.fn().mockReturnValue({
        upload: vi.fn().mockResolvedValue({ error: uploadError }),
        createSignedUrl: vi
          .fn()
          .mockResolvedValue({ data: { signedUrl }, error: signedError }),
      }),
    },
  }
}

// ---- tests ------------------------------------------------------------------

describe('GET /api/orders/[id]/pdf', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('N-PDF-1: não autenticado → 401', async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue(makeServerClient(null) as never)

    const { req, context } = makeRequest()
    const res = await GET(req, context)

    expect(res.status).toBe(401)
  })

  it('N-PDF-2: order_id inexistente → 404', async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue(makeServerClient(USER_ID) as never)
    vi.mocked(getOrder).mockResolvedValue({
      ok: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Pedido não encontrado',
        timestamp: new Date().toISOString(),
        requestId: 'req-1',
      },
    })

    const { req, context } = makeRequest('nonexistent-id')
    const res = await GET(req, context)

    expect(res.status).toBe(404)
  })

  it('N-PDF-3: order pertence a outro usuário → 403', async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue(
      makeServerClient(OTHER_USER_ID) as never,
    )
    vi.mocked(getOrder).mockResolvedValue({
      ok: true,
      data: { order: MOCK_ORDER, items: MOCK_ITEMS },
    })
    vi.mocked(createServiceRoleSupabaseClient).mockReturnValue(
      makeAdminClient({ brandOwnerId: ADMIN_USER_ID }) as never,
    )

    const { req, context } = makeRequest()
    const res = await GET(req, context)

    expect(res.status).toBe(403)
  })

  it('P-PDF-1: autenticado sem pdf_path → gera PDF, faz upload, atualiza orders, redireciona', async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue(makeServerClient(USER_ID) as never)
    vi.mocked(getOrder).mockResolvedValue({
      ok: true,
      data: { order: { ...MOCK_ORDER, pdf_path: null }, items: MOCK_ITEMS },
    })

    const adminClient = makeAdminClient()
    vi.mocked(createServiceRoleSupabaseClient).mockReturnValue(adminClient as never)

    const { req, context } = makeRequest()
    const res = await GET(req, context)

    // Should upload
    expect(adminClient.storage.from).toHaveBeenCalledWith('orders')
    // Should redirect
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toBe(SIGNED_URL)
  })

  it('P-PDF-2: autenticado com pdf_path preenchido → pula geração, retorna signed URL', async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue(makeServerClient(USER_ID) as never)
    vi.mocked(getOrder).mockResolvedValue({
      ok: true,
      data: {
        order: { ...MOCK_ORDER, pdf_path: `${ORDER_ID}.pdf` },
        items: MOCK_ITEMS,
      },
    })

    const adminClient = makeAdminClient()
    vi.mocked(createServiceRoleSupabaseClient).mockReturnValue(adminClient as never)

    const { req, context } = makeRequest()
    const res = await GET(req, context)

    // Should NOT upload (skip generation)
    const storageMock = adminClient.storage.from()
    expect(storageMock.upload).not.toHaveBeenCalled()
    // Should still redirect
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toBe(SIGNED_URL)
  })
})
