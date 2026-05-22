import Link from 'next/link'
import { listAdminBrands } from '@/lib/brands/actions'

export default async function BrandsPage() {
  const brands = await listAdminBrands()

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">Marcas</h1>
        <Link
          href="/admin/brands/new"
          className="rounded bg-foreground px-4 py-2 text-sm text-background hover:opacity-90 transition-opacity"
        >
          + Nova Marca
        </Link>
      </div>

      {brands.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <p className="text-sm text-foreground/60">Nenhuma marca cadastrada ainda.</p>
          <Link
            href="/admin/brands/new"
            className="mt-4 text-sm font-medium underline underline-offset-4"
          >
            Crie sua primeira marca
          </Link>
        </div>
      ) : (
        <div className="divide-y rounded-lg border">
          {brands.map((brand) => (
            <Link
              key={brand.id}
              href={`/admin/brands/${brand.id}`}
              className="flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors"
            >
              <div>
                <p className="text-sm font-medium">{brand.name}</p>
                <p className="text-xs text-foreground/50">/{brand.slug}</p>
              </div>
              <span className="text-xs text-foreground/40">→</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
