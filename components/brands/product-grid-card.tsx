import type { Product } from '@/lib/products/actions'

const priceFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

interface Props {
  product: Product
  onSelect?: (product: Product) => void
}

export function ProductGridCard({ product, onSelect }: Props) {
  return (
    <article
      tabIndex={0}
      className="rounded-lg border bg-card overflow-hidden flex flex-col focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      onClick={() => onSelect?.(product)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onSelect?.(product)
      }}
    >
      <div className="aspect-square bg-muted flex items-center justify-center overflow-hidden">
        {product.image_crop_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.image_crop_url}
            alt={product.reference ?? 'Produto'}
            loading="lazy"
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="flex flex-col items-center gap-1 text-muted-foreground">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-10 w-10"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <span className="text-xs">Sem imagem</span>
          </div>
        )}
      </div>

      <div className="p-3 flex flex-col gap-1 flex-1">
        {product.look_group && (
          <span className="self-start text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
            {product.look_group}
          </span>
        )}
        {product.reference && (
          <p className="text-sm font-mono font-medium">{product.reference}</p>
        )}
        {product.description && (
          <p className="text-sm text-foreground/70 line-clamp-2">{product.description}</p>
        )}
        {product.price_brl != null && (
          <p className="text-sm font-semibold mt-auto">{priceFormatter.format(product.price_brl)}</p>
        )}
      </div>
    </article>
  )
}
