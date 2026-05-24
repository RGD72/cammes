'use server'

import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createServiceRoleSupabaseClient } from '@/lib/supabase/admin'
import { logAuditEvent } from '@/lib/audit/log-event'
import type { Result } from '@/lib/types/index'
import type { Order, OrderItem } from '@/lib/types/index'

function permissionDenied(message = 'Não autenticado'): Result<never> {
  return {
    ok: false,
    error: {
      code: 'PERMISSION_DENIED',
      message,
      timestamp: new Date().toISOString(),
      requestId: crypto.randomUUID(),
    },
  }
}

function notFound(message = 'Não encontrado'): Result<never> {
  return {
    ok: false,
    error: {
      code: 'NOT_FOUND',
      message,
      timestamp: new Date().toISOString(),
      requestId: crypto.randomUUID(),
    },
  }
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
  }
}

const SubmitOrderSchema = z.object({
  brandId: z.string().uuid(),
  clientIdempotencyKey: z.string().uuid(),
})

async function generateOrderNumber(brandId: string): Promise<string> {
  const admin = createServiceRoleSupabaseClient()
  const now = new Date()
  const year = now.getUTCFullYear()
  const month = String(now.getUTCMonth() + 1).padStart(2, '0')
  const startOfMonth = `${year}-${month}-01T00:00:00.000Z`

  const { count } = await admin
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('brand_id', brandId)
    .gte('submitted_at', startOfMonth)

  const seq = String((count ?? 0) + 1).padStart(4, '0')
  return `CMM-${year}${month}-${seq}`
}

export async function submitOrder(
  brandId: string,
  clientIdempotencyKey: string,
): Promise<Result<{ order: Order; items: OrderItem[] }>> {
  // 1. Auth guard
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return permissionDenied()

  // 2. Zod validation
  const parsed = SubmitOrderSchema.safeParse({ brandId, clientIdempotencyKey })
  if (!parsed.success) {
    return {
      ok: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Dados inválidos',
        details: parsed.error.flatten().fieldErrors,
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
      },
    }
  }

  const admin = createServiceRoleSupabaseClient()

  // 3. Idempotency check: return existing order if same key
  const { data: existing } = await admin
    .from('orders')
    .select('*')
    .eq('customer_user_id', user.id)
    .eq('client_idempotency_key', clientIdempotencyKey)
    .maybeSingle()

  if (existing) {
    const { data: existingItems } = await admin
      .from('order_items')
      .select('*')
      .eq('order_id', existing.id)
      .order('display_order', { ascending: true })

    return {
      ok: true,
      data: {
        order: existing as Order,
        items: (existingItems ?? []) as OrderItem[],
      },
    }
  }

  // 4. Get cart — if empty, return NOT_FOUND
  const { data: cart } = await supabase
    .from('carts')
    .select('id, customer_name')
    .eq('user_id', user.id)
    .eq('brand_id', brandId)
    .maybeSingle()

  if (!cart) return notFound('Carrinho não encontrado')

  const { data: cartItems } = await supabase
    .from('cart_items')
    .select('*')
    .eq('cart_id', cart.id)
    .order('added_at', { ascending: true })

  if (!cartItems || cartItems.length === 0) return notFound('Carrinho vazio')

  // 5. Fetch brand for owner_admin_id
  const { data: brand } = await admin
    .from('brands')
    .select('owner_admin_id')
    .eq('id', brandId)
    .single()

  if (!brand) return notFound('Marca não encontrada')

  // 6. Enrich cart items with product reference + description
  const productIds = [...new Set(cartItems.map((i: { product_id: string }) => i.product_id))]
  const { data: products } = await admin
    .from('products')
    .select('id, reference, description')
    .in('id', productIds)

  const productMap = new Map((products ?? []).map((p: { id: string; reference: string; description: string }) => [p.id, p]))

  // 7. Calculate total_brl
  const totalBrl = cartItems.reduce(
    (sum: number, i: { total_brl: number }) => sum + Number(i.total_brl),
    0,
  )

  // 8. Generate order_number
  const orderNumber = await generateOrderNumber(brandId)

  // 9. INSERT INTO orders (service role — no INSERT policy for customers)
  const { data: order, error: orderError } = await admin
    .from('orders')
    .insert({
      order_number: orderNumber,
      brand_id: brandId,
      customer_user_id: user.id,
      customer_name: cart.customer_name,
      total_brl: Number(totalBrl.toFixed(2)),
      status: 'received',
      client_idempotency_key: clientIdempotencyKey,
    })
    .select('*')
    .single()

  if (orderError || !order) return internalError('Erro ao criar pedido')

  // 10. INSERT INTO order_items (snapshot of 8 columns per cart item)
  const orderItemsPayload = cartItems.map(
    (
      item: {
        product_id: string
        color: string | null
        size: string | null
        quantity: number
        unit_price_brl_snapshot: number
        total_brl: number
      },
      index: number,
    ) => {
      const product = productMap.get(item.product_id)
      return {
        order_id: order.id,
        product_id: item.product_id,
        reference: product?.reference ?? '',
        description: product?.description ?? '',
        color: item.color,
        size: item.size,
        quantity: item.quantity,
        customer_name: cart.customer_name,
        unit_price_brl: Number(item.unit_price_brl_snapshot),
        total_brl: Number(item.total_brl),
        display_order: index,
      }
    },
  )

  const { data: insertedItems, error: itemsError } = await admin
    .from('order_items')
    .insert(orderItemsPayload)
    .select('*')

  if (itemsError || !insertedItems) return internalError('Erro ao criar itens do pedido')

  // 11. DELETE cart_items (clear cart)
  await supabase.from('cart_items').delete().eq('cart_id', cart.id)

  // 12. INSERT admin_notification
  if (brand.owner_admin_id) {
    await admin.from('admin_notifications').insert({
      admin_user_id: brand.owner_admin_id,
      type: 'new_order',
      order_id: order.id,
      brand_id: brandId,
    })
  }

  // 13. Audit log
  await logAuditEvent('order_submitted', { order_id: order.id, brand_id: brandId })

  return {
    ok: true,
    data: {
      order: order as Order,
      items: insertedItems as OrderItem[],
    },
  }
}

export async function getOrder(
  orderId: string,
): Promise<Result<{ order: Order; items: OrderItem[] }>> {
  // 1. Auth guard
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return permissionDenied()

  // 2. SELECT orders — RLS: customer_own OR admin_own_brand
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .maybeSingle()

  if (orderError) return internalError('Erro ao buscar pedido')
  if (!order) return notFound('Pedido não encontrado')

  // 3. SELECT order_items
  const { data: items, error: itemsError } = await supabase
    .from('order_items')
    .select('*')
    .eq('order_id', orderId)
    .order('display_order', { ascending: true })

  if (itemsError) return internalError('Erro ao buscar itens do pedido')

  return {
    ok: true,
    data: {
      order: order as Order,
      items: (items ?? []) as OrderItem[],
    },
  }
}
