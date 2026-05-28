'use server'

import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { logAuditEvent } from '@/lib/audit/log-event'
import type { Result } from '@/lib/types/index'

export interface Cart {
  id: string
  user_id: string
  brand_id: string
  customer_name: string
  created_at: string
  updated_at: string
}

export interface CartItem {
  id: string
  cart_id: string
  product_id: string
  color: string | null
  size: string | null
  quantity: number
  unit_price_brl_snapshot: number
  total_brl: number
  added_at: string
}

export interface CartResult {
  cart: Cart
  items: CartItem[]
  total: number
}

const AddItemSchema = z.object({
  brandId: z.string().uuid(),
  productId: z.string().uuid(),
  color: z.string().nullable(),
  size: z.string().nullable(),
  quantity: z.number().int().min(1).max(99),
  unitPriceBrl: z.number().min(0),
})

export type AddItemInput = z.infer<typeof AddItemSchema>

const UpdateQuantitySchema = z.object({
  itemId: z.string().uuid(),
  quantity: z.number().int().min(1).max(99),
})

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

export async function addItem(input: AddItemInput): Promise<Result<CartItem>> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return permissionDenied()

  const parsed = AddItemSchema.safeParse(input)
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

  const { brandId, productId, color, size, quantity } = parsed.data

  // Verify user has active brand access (AC3)
  const { data: hasAccess } = await supabase.rpc('user_has_active_brand_access', {
    p_brand_id: brandId,
  })
  if (!hasAccess) return permissionDenied('Sem acesso a esta marca')

  // Snapshot price from product
  const { data: product, error: productError } = await supabase
    .from('products')
    .select('price_brl')
    .eq('id', productId)
    .single()
  if (productError || !product) return notFound('Produto não encontrado')
  if (product.price_brl == null) {
    return {
      ok: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Produto sem preço cadastrado',
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
      },
    }
  }

  const unitPrice = Number(product.price_brl)
  const totalBrl = Number((unitPrice * quantity).toFixed(2))

  // Get or create cart — preserve customer_name on conflict
  const { data: existingCart } = await supabase
    .from('carts')
    .select('*')
    .eq('user_id', user.id)
    .eq('brand_id', brandId)
    .maybeSingle()

  let cartId: string
  if (existingCart) {
    cartId = existingCart.id
  } else {
    // Fetch profile for customer_name
    const { data: profile } = await supabase
      .from('users_profile')
      .select('full_name')
      .eq('id', user.id)
      .single()

    const { data: newCart, error: cartError } = await supabase
      .from('carts')
      .insert({ user_id: user.id, brand_id: brandId, customer_name: profile?.full_name ?? '' })
      .select('*')
      .single()
    if (cartError || !newCart) return internalError('Erro ao criar carrinho')
    cartId = newCart.id
  }

  // Insert cart item
  const { data: item, error: itemError } = await supabase
    .from('cart_items')
    .insert({
      cart_id: cartId,
      product_id: productId,
      color,
      size,
      quantity,
      unit_price_brl_snapshot: unitPrice,
      total_brl: totalBrl,
    })
    .select('*')
    .single()

  if (itemError || !item) return internalError('Erro ao adicionar item')

  void logAuditEvent('cart_item_added', {
    userId: user.id,
    brandId,
    productId,
    quantity,
  })

  return { ok: true, data: item as CartItem }
}

export async function getCart(brandId: string): Promise<Result<CartResult>> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return permissionDenied()

  const { data: cart, error: cartError } = await supabase
    .from('carts')
    .select('*')
    .eq('user_id', user.id)
    .eq('brand_id', brandId)
    .maybeSingle()

  if (cartError) return internalError('Erro ao buscar carrinho')
  if (!cart) return notFound('Carrinho não encontrado')

  const { data: items, error: itemsError } = await supabase
    .from('cart_items')
    .select('*')
    .eq('cart_id', cart.id)
    .order('added_at', { ascending: true })

  if (itemsError) return internalError('Erro ao buscar itens do carrinho')

  const cartItems = (items ?? []) as CartItem[]
  const total = cartItems.reduce((sum, i) => sum + Number(i.total_brl), 0)

  return { ok: true, data: { cart: cart as Cart, items: cartItems, total } }
}

export async function updateQuantity(input: {
  itemId: string
  quantity: number
}): Promise<Result<CartItem>> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return permissionDenied()

  const parsed = UpdateQuantitySchema.safeParse(input)
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

  const { itemId, quantity } = parsed.data

  // Fetch current item to recalculate total_brl (RLS ensures ownership)
  const { data: current, error: fetchError } = await supabase
    .from('cart_items')
    .select('unit_price_brl_snapshot')
    .eq('id', itemId)
    .maybeSingle()

  if (fetchError) return internalError('Erro ao buscar item')
  if (!current) return notFound('Item não encontrado')

  const totalBrl = Number((Number(current.unit_price_brl_snapshot) * quantity).toFixed(2))

  const { data: updated, error: updateError } = await supabase
    .from('cart_items')
    .update({ quantity, total_brl: totalBrl })
    .eq('id', itemId)
    .select('*')
    .maybeSingle()

  if (updateError || !updated) return internalError('Erro ao atualizar item')
  return { ok: true, data: updated as CartItem }
}

export async function removeItem(itemId: string): Promise<Result<void>> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return permissionDenied()

  // RLS enforces ownership; if 0 rows deleted → item not found or not owned
  const { error, count } = await supabase
    .from('cart_items')
    .delete({ count: 'exact' })
    .eq('id', itemId)

  if (error) return internalError('Erro ao remover item')
  if (count === 0) return notFound('Item não encontrado')
  return { ok: true, data: undefined }
}

export async function clearCart(brandId: string): Promise<Result<void>> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return permissionDenied()

  // Idempotent: if no cart exists, succeed silently (SF-1 decision)
  const { data: cart } = await supabase
    .from('carts')
    .select('id')
    .eq('user_id', user.id)
    .eq('brand_id', brandId)
    .maybeSingle()

  if (!cart) return { ok: true, data: undefined }

  const { error } = await supabase.from('cart_items').delete().eq('cart_id', cart.id)
  if (error) return internalError('Erro ao limpar carrinho')
  return { ok: true, data: undefined }
}

const SetCustomerNameSchema = z.object({
  brandId: z.string().uuid(),
  name: z.string().min(1).max(100),
})

export async function setCustomerName(brandId: string, name: string): Promise<Result<void>> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return permissionDenied()

  const parsed = SetCustomerNameSchema.safeParse({ brandId, name })
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

  const { error, count } = await supabase
    .from('carts')
    .update(
      { customer_name: parsed.data.name, updated_at: new Date().toISOString() },
      { count: 'exact' }
    )
    .eq('user_id', user.id)
    .eq('brand_id', parsed.data.brandId)

  if (error) return internalError('Erro ao atualizar nome do cliente')
  if (!count || count === 0) return notFound('Carrinho não encontrado')
  return { ok: true, data: undefined }
}
