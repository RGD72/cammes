import { notFound, redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { listAdminBrands } from '@/lib/brands/actions'
import { deactivateCustomer } from '@/lib/customers/actions'
import { CustomerBrandManager } from '@/components/admin/customer-brand-manager'
import Link from 'next/link'

export const metadata = { title: 'Detalhe do Cliente — CAMMES Admin' }

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()

  const [profileResult, brandsResult, accessResult] = await Promise.all([
    supabase
      .from('users_profile')
      .select('id, full_name, email, is_active')
      .eq('id', id)
      .eq('role', 'customer')
      .single(),
    listAdminBrands(),
    supabase
      .from('user_brand_access')
      .select('brand_id, revoked_at, brands(id, name)')
      .eq('user_id', id),
  ])

  if (profileResult.error || !profileResult.data) notFound()

  const profile = profileResult.data
  const adminBrands = brandsResult
  type AccessRow = { brand_id: string; revoked_at: string | null; brands: { id: string; name: string }[] | null }
  const accesses = (accessResult.data as AccessRow[] ?? []).map((a) => ({
    id: a.brand_id,
    name: Array.isArray(a.brands) ? (a.brands[0]?.name ?? '') : (a.brands as { name: string } | null)?.name ?? '',
    revoked_at: a.revoked_at,
  }))

  const status = !profile.is_active ? 'Inativo' : 'Ativo'

  async function handleDeactivate() {
    'use server'
    await deactivateCustomer(id)
    redirect(`/admin/customers/${id}`)
  }

  return (
    <div className="p-6">
      <div className="mb-4">
        <Link href="/admin/customers" className="text-sm text-muted-foreground hover:underline">
          ← Clientes
        </Link>
      </div>

      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold">{profile.full_name}</h1>
          <p className="text-sm text-muted-foreground">{profile.email}</p>
        </div>
        <span
          className={`rounded-full px-2 py-0.5 text-xs ${
            status === 'Ativo'
              ? 'bg-green-100 text-green-700'
              : status === 'Inativo'
                ? 'bg-red-100 text-red-700'
                : 'bg-yellow-100 text-yellow-700'
          }`}
        >
          {status}
        </span>
      </div>

      <div className="mb-8 max-w-lg rounded border p-4">
        <CustomerBrandManager
          customerId={id}
          assigned={accesses}
          available={adminBrands.map((b) => ({ id: b.id, name: b.name }))}
        />
      </div>

      {profile.is_active && (
        <div className="max-w-lg rounded border border-destructive/30 p-4">
          <h3 className="mb-2 text-sm font-medium text-destructive">Desativar cliente</h3>
          <p className="mb-3 text-sm text-muted-foreground">
            O cliente perderá acesso à plataforma, mas seus pedidos históricos serão mantidos.
          </p>
          <form action={handleDeactivate}>
            <button
              type="submit"
              className="rounded border border-destructive px-3 py-1.5 text-sm text-destructive hover:bg-destructive/10"
            >
              Desativar cliente
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
