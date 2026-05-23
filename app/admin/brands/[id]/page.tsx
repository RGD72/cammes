import { notFound } from 'next/navigation'
import { getBrand } from '@/lib/brands/actions'
import { getCatalogByBrand } from '@/lib/catalogs/actions'
import { getOpenRouterStatus } from '@/lib/admin/openrouter-settings'
import { createServiceRoleSupabaseClient } from '@/lib/supabase/admin'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { BrandDetailView } from './brand-detail-view'

interface Props {
  params: Promise<{ id: string }>
}

async function getJobStatuses(
  catalogId: string,
  adminUserId: string,
): Promise<{ activeJobId?: string; failedJobId?: string }> {
  const supabase = createServiceRoleSupabaseClient()
  const { data } = await supabase
    .from('extraction_jobs')
    .select('id, status')
    .eq('catalog_id', catalogId)
    .eq('admin_user_id', adminUserId)
    .neq('status', 'superseded')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!data) return {}
  if (data.status === 'queued' || data.status === 'running') return { activeJobId: data.id }
  if (data.status === 'failed') return { failedJobId: data.id }
  return {}
}

export default async function BrandDetailPage({ params }: Props) {
  const { id } = await params

  const supabaseUser = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabaseUser.auth.getUser()

  const [brand, catalog, openRouterStatus, approvedResult, extractedResult] = await Promise.all([
    getBrand(id),
    getCatalogByBrand(id),
    getOpenRouterStatus(),
    supabaseUser
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('brand_id', id)
      .eq('status', 'approved'),
    supabaseUser
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('brand_id', id)
      .eq('status', 'extracted'),
  ])

  if (!brand) notFound()

  const approvedCount = approvedResult.count ?? 0
  const extractedCount = extractedResult.count ?? 0

  const { activeJobId, failedJobId } = catalog && user
    ? await getJobStatuses(catalog.id, user.id)
    : {}

  return (
    <BrandDetailView
      brand={brand}
      catalog={catalog}
      hasOpenRouterKey={openRouterStatus.hasKey}
      modelId={openRouterStatus.model}
      activeJobId={activeJobId}
      failedJobId={failedJobId}
      approvedCount={approvedCount}
      extractedCount={extractedCount}
    />
  )
}
