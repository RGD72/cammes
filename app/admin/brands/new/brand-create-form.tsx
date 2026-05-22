'use client'

import { useTransition, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrand } from '@/lib/brands/actions'
import { generateSlug } from '@/lib/brands/slug'

const SLUG_PATTERN = /^[a-z0-9-]*$/

export function BrandCreateForm() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugEdited, setSlugEdited] = useState(false)
  const [description, setDescription] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [error, setError] = useState<string | null>(null)

  function handleNameChange(value: string) {
    setName(value)
    if (!slugEdited) {
      setSlug(generateSlug(value))
    }
  }

  function handleSlugChange(value: string) {
    if (SLUG_PATTERN.test(value)) {
      setSlug(value)
      setSlugEdited(true)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!SLUG_PATTERN.test(slug) || slug.length === 0) {
      setError('Slug inválido — use apenas letras minúsculas, números e hífens.')
      return
    }

    startTransition(async () => {
      const result = await createBrand({ name, slug, description, logo_url: logoUrl })
      if (result.error) {
        setError(result.error)
        return
      }
      router.push(`/admin/brands/${result.brand!.id}`)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium mb-1">
          Nome da Marca <span className="text-red-500">*</span>
        </label>
        <input
          id="name"
          type="text"
          required
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          disabled={isPending}
          className="w-full rounded border px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-foreground disabled:opacity-50"
          placeholder="Ex: Moda Primavera"
        />
      </div>

      <div>
        <label htmlFor="slug" className="block text-sm font-medium mb-1">
          Slug <span className="text-red-500">*</span>
        </label>
        <input
          id="slug"
          type="text"
          required
          value={slug}
          onChange={(e) => handleSlugChange(e.target.value)}
          disabled={isPending}
          className="w-full rounded border px-3 py-2 text-sm font-mono outline-none focus:ring-1 focus:ring-foreground disabled:opacity-50"
          placeholder="moda-primavera"
        />
        <p className="mt-1 text-xs text-foreground/50">
          Apenas letras minúsculas, números e hífens.
        </p>
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium mb-1">
          Descrição <span className="text-foreground/40 font-normal">(opcional)</span>
        </label>
        <textarea
          id="description"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={isPending}
          className="w-full rounded border px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-foreground disabled:opacity-50 resize-none"
          placeholder="Breve descrição da marca..."
        />
      </div>

      <div>
        <label htmlFor="logo_url" className="block text-sm font-medium mb-1">
          URL do Logo <span className="text-foreground/40 font-normal">(opcional)</span>
        </label>
        <input
          id="logo_url"
          type="url"
          value={logoUrl}
          onChange={(e) => setLogoUrl(e.target.value)}
          disabled={isPending}
          className="w-full rounded border px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-foreground disabled:opacity-50"
          placeholder="https://..."
        />
      </div>

      {error && (
        <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending || !name.trim() || !slug.trim()}
        className="w-full rounded bg-foreground px-4 py-2 text-sm text-background hover:opacity-90 transition-opacity disabled:opacity-40"
      >
        {isPending ? 'Criando...' : 'Criar Marca'}
      </button>
    </form>
  )
}
