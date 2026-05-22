import { notFound } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createServiceRoleSupabaseClient } from '@/lib/supabase/admin'
import { ExtractionProgressView } from '@/components/admin/extraction-progress'

interface Props {
  params: Promise<{ id: string; jobId: string }>
}

export interface ExtractionJob {
  id: string
  catalog_id: string
  brand_id: string
  admin_user_id: string
  status: 'queued' | 'running' | 'done' | 'failed' | 'superseded'
  model_id: string
  pages_total: number
  pages_processed: number
  products_count: number
  actual_cost_usd: number | null
  actual_cost_brl: number | null
  error_message: string | null
  started_at: string | null
  completed_at: string | null
  created_at: string
}

export default async function ExtractionProgressPage({ params }: Props) {
  const { id: brandId, jobId } = await params

  const supabaseUser = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabaseUser.auth.getUser()
  if (!user) notFound()

  const supabase = createServiceRoleSupabaseClient()

  // Verificar que o job pertence a uma marca do admin autenticado
  const { data: job } = await supabase
    .from('extraction_jobs')
    .select('*')
    .eq('id', jobId)
    .eq('brand_id', brandId)
    .eq('admin_user_id', user.id)
    .single()

  if (!job) notFound()

  return <ExtractionProgressView initialJob={job as ExtractionJob} brandId={brandId} catalogId={job.catalog_id} />
}
