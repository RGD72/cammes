import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createServiceRoleSupabaseClient } from '@/lib/supabase/admin'
import { getAllKpis } from '@/lib/kpis/queries'
import { KpiDashboardView } from './_components/kpi-dashboard'

export const revalidate = 60

export default async function KpiReportPage() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const serviceSupabase = createServiceRoleSupabaseClient()
  const { data: profile } = await serviceSupabase
    .from('users_profile')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/login')

  const kpis = await getAllKpis()

  return <KpiDashboardView data={kpis} />
}
