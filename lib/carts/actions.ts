'use server'

import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { Result } from '@/lib/types/index'

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

const AddItemSchema = z.object({
  brandId: z.string().uuid(),
  productId: z.string().uuid(),
  color: z.string().nullable(),
  size: z.string().nullable(),
  quantity: z.number().int().min(1).max(99),
  unitPriceBrl: z.number().min(0),
})

export type AddItemInput = z.infer<typeof AddItemSchema>

export async function addItem(input: AddItemInput): Promise<Result<CartItem>> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return {
      ok: false,
      error: {
        code: 'PERMISSION_DENIED',
        message: 'Não autenticado',
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
      },
    }
  }
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
  // NOTE: implementação real em Story 4.2 (tabelas carts + cart_items com RLS)
  return {
    ok: false,
    error: {
      code: 'INTERNAL',
      message: 'Carrinho não implementado — Story 4.2 necessária',
      timestamp: new Date().toISOString(),
      requestId: crypto.randomUUID(),
    },
  }
}
