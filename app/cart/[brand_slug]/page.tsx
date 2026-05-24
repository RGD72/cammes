import { notFound } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getCart, updateQuantity, removeItem, clearCart } from '@/lib/carts/actions'
import { CartTable } from '@/components/customer/CartTable'
import { CustomerNameEditor } from '@/components/customer/CustomerNameEditor'
import { SubmitOrderSection } from '@/components/customer/SubmitOrderSection'
import type { CartItemEnriched } from '@/components/customer/CartTable'

interface Props {
  params: Promise<{ brand_slug: string }>
}

export default async function CartPage({ params }: Props) {
  const { brand_slug } = await params
  const supabase = await createServerSupabaseClient()

  const { data: brand } = await supabase
    .from('brands')
    .select('id, name, slug')
    .eq('slug', brand_slug)
    .single()

  if (!brand) return notFound()

  const cartResult = await getCart(brand.id)

  if (!cartResult.ok || cartResult.data.items.length === 0) {
    return (
      <div className="p-4 md:p-8 max-w-5xl mx-auto">
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
          <p className="text-base font-medium text-muted-foreground">
            Seu carrinho está vazio. Volte à vitrine e escolha produtos.
          </p>
          <a
            href={`/brands/${brand_slug}`}
            className="mt-4 text-sm font-medium text-primary underline"
          >
            Ver vitrine
          </a>
        </div>
      </div>
    )
  }

  const { cart, items } = cartResult.data

  const brandId = brand.id
  const brandName = brand.name

  const productIds = [...new Set(items.map((i) => i.product_id))]
  const { data: products } = await supabase
    .from('products')
    .select('id, reference, description')
    .in('id', productIds)

  const productMap = new Map((products ?? []).map((p) => [p.id, p]))
  const enrichedItems: CartItemEnriched[] = items.map((item) => ({
    ...item,
    reference: productMap.get(item.product_id)?.reference ?? null,
    description: productMap.get(item.product_id)?.description ?? null,
  }))

  async function handleChangeQty(itemId: string, quantity: number) {
    'use server'
    await updateQuantity({ itemId, quantity })
  }

  async function handleClearCart() {
    'use server'
    await clearCart(brandId)
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Carrinho — {brandName}</h1>
        <form action={handleClearCart}>
          <button type="submit" className="text-sm text-destructive hover:underline">
            Limpar carrinho
          </button>
        </form>
      </div>

      <CustomerNameEditor brandId={brandId} initialName={cart.customer_name} />

      <CartTable
        items={enrichedItems}
        customerName={cart.customer_name}
        brandId={brandId}
        onChangeQty={handleChangeQty}
        onRemove={removeItem}
      />

      <SubmitOrderSection
        brandId={brandId}
        itemCount={items.length}
        totalBrl={cartResult.data.total}
      />
    </div>
  )
}
