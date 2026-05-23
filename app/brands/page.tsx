import { getBrandsForCustomer } from '@/lib/brands/actions'
import { BrandCard } from '@/components/brands/brand-card'

export default async function BrandsPage() {
  const brands = await getBrandsForCustomer()

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6">Suas Marcas</h1>

      {brands.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center text-foreground/50">
          <p className="text-base font-medium">Você ainda não tem marcas disponíveis.</p>
          <p className="mt-2 text-sm">
            Entre em contato com seu distribuidor para liberar o acesso às marcas.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {brands.map((brand) => (
            <BrandCard key={brand.id} brand={brand} />
          ))}
        </div>
      )}
    </div>
  )
}
