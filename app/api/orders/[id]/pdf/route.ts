export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createServiceRoleSupabaseClient } from '@/lib/supabase/admin'
import { getOrder } from '@/lib/orders/actions'
import { renderOrderPdfBuffer } from '@/lib/pdf/order-pdf'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  // 1. Auth
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Fetch order (RLS-aware)
  const result = await getOrder(id)
  if (!result.ok) {
    const status = result.error.code === 'NOT_FOUND' ? 404 : 500
    return NextResponse.json({ error: result.error.message }, { status })
  }
  const { order, items } = result.data

  // 3. Auth guard: customer OR brand admin
  const admin = createServiceRoleSupabaseClient()
  const isCustomer = order.customer_user_id === user.id
  if (!isCustomer) {
    const { data: brand } = await admin
      .from('brands')
      .select('owner_admin_id')
      .eq('id', order.brand_id)
      .single()
    const isBrandAdmin = brand?.owner_admin_id === user.id
    if (!isBrandAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  const pdfPath = `${order.id}.pdf`

  // 4. Generate PDF if not cached
  if (!order.pdf_path) {
    const { data: brandData } = await admin
      .from('brands')
      .select('name, logo_url')
      .eq('id', order.brand_id)
      .single()

    const buffer = await renderOrderPdfBuffer({
      order,
      items,
      brandName: brandData?.name ?? '',
      brandLogoUrl: brandData?.logo_url ?? null,
    })

    const { error: uploadError } = await admin.storage
      .from('orders')
      .upload(pdfPath, buffer, { contentType: 'application/pdf', upsert: true })

    if (uploadError) {
      return NextResponse.json({ error: 'Erro ao armazenar PDF' }, { status: 500 })
    }

    await admin.from('orders').update({ pdf_path: pdfPath }).eq('id', order.id)
  }

  // 5. Signed URL
  const { data: signedData, error: signedError } = await admin.storage
    .from('orders')
    .createSignedUrl(pdfPath, 3600)

  if (signedError || !signedData?.signedUrl) {
    return NextResponse.json({ error: 'Erro ao gerar URL de download' }, { status: 500 })
  }

  // 6. Redirect to signed URL with Content-Disposition hint
  return NextResponse.redirect(signedData.signedUrl, {
    status: 302,
    headers: {
      'Content-Disposition': `attachment; filename="pedido-${order.order_number}.pdf"`,
    },
  })
}
