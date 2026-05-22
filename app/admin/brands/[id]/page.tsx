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

async function getActiveJobId(catalogId: string, adminUserId: string): Promise<string | undefined> {
  const supabase = createServiceRoleSupabaseClient()
  const { data } = await supabase
    .from('extraction_jobs')
    .select('id')
    .eq('catalog_id', catalogId)
    .eq('admin_user_id', adminUserId)
    .in('status', ['queued', 'running'])
    .order('created_at', { ascending: false })
    .limit(1)
    .single()
  return data?.id ?? undefined
}

export default async function BrandDetailPage({ params }: Props) {
  const { id } = await params

  const supabaseUser = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabaseUser.auth.getUser()

  const [brand, catalog, openRouterStatus] = await Promise.all([
    getBrand(id),
    getCatalogByBrand(id),
    getOpenRouterStatus(),
  ])

  if (!brand) notFound()

  const activeJobId = catalog && user
    ? await getActiveJobId(catalog.id, user.id)
    : undefined

  return (
    <BrandDetailView
      brand={brand}
      catalog={catalog}
      hasOpenRouterKey={openRouterStatus.hasKey}
      modelId={openRouterStatus.model}
      activeJobId={activeJobId}
    />
  )
}
