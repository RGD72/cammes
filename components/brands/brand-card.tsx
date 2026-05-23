import Link from 'next/link'
import type { BrandForCustomer } from '@/lib/brands/actions'

interface Props {
  brand: BrandForCustomer
}

export function BrandCard({ brand }: Props) {
  return (
    <Link
      href={`/brands/${brand.slug}`}
      className="group flex flex-col rounded-lg border bg-card overflow-hidden hover:shadow-md transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="aspect-video bg-muted flex items-center justify-center overflow-hidden">
        {brand.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={brand.logo_url}
            alt={`Logo de ${brand.name}`}
            className="h-16 w-auto object-contain"
          />
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-12 w-12 text-muted-foreground/40"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
            />
          </svg>
        )}
      </div>

      <div className="p-4 flex flex-col gap-1 flex-1">
        <h2 className="font-semibold text-base group-hover:text-primary transition-colors">
          {brand.name}
        </h2>
        {brand.description && (
          <p className="text-sm text-foreground/60 line-clamp-2">{brand.description}</p>
        )}
        <p className="text-xs text-muted-foreground mt-auto pt-2">
          {brand.product_count} {brand.product_count === 1 ? 'produto' : 'produtos'}
        </p>
      </div>
    </Link>
  )
}
