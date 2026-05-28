import { listAdminCustomers } from '@/lib/customers/actions'
import { listAdminBrands } from '@/lib/brands/actions'
import { listPendingDeletionRequests } from '@/lib/deletion/actions'
import { InviteCustomerModal } from '@/components/admin/invite-customer-modal'
import Link from 'next/link'

export const metadata = { title: 'Clientes — CAMMES Admin' }

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`
}

export default async function AdminCustomersPage() {
  const [result, brands, deletionResult] = await Promise.all([
    listAdminCustomers(),
    listAdminBrands(),
    listPendingDeletionRequests(),
  ])

  const customers = result.ok ? result.data : []
  const pendingDeletionIds = new Set(
    (deletionResult.ok ? deletionResult.data : []).map((r) => r.user_id).filter(Boolean),
  )

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Clientes</h1>
        <InviteCustomerModal brands={brands.map((b) => ({ id: b.id, name: b.name }))} />
      </div>

      {!result.ok && (
        <p className="text-sm text-destructive">Erro ao carregar clientes: {result.error.message}</p>
      )}

      {customers.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhum cliente ainda. Convide o primeiro lojista.
        </p>
      ) : (
        <div className="overflow-x-auto rounded border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Nome</th>
                <th className="px-4 py-3 text-left font-medium">E-mail</th>
                <th className="px-4 py-3 text-left font-medium">Marcas</th>
                <th className="px-4 py-3 text-left font-medium">Último login</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {customers.map((c) => {
                const activeBrands = c.brands.filter((b) => !b.revoked_at)
                const status = !c.is_active ? 'Inativo' : 'Ativo'
                return (
                  <tr key={c.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">{c.full_name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{c.email}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {activeBrands.length === 0 ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          activeBrands.map((b) => (
                            <span
                              key={b.id}
                              className="rounded-full bg-muted px-2 py-0.5 text-xs"
                            >
                              {b.name}
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDate(c.last_sign_in_at)}
                    </td>
                    <td className="px-4 py-3">
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
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {pendingDeletionIds.has(c.id) && (
                          <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs text-orange-700">
                            Exclusão pendente
                          </span>
                        )}
                        <Link
                          href={`/admin/customers/${c.id}`}
                          className="text-xs underline hover:no-underline"
                        >
                          Ver
                        </Link>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
