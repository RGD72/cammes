'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  calculateExtractionCost,
  exceedsThreshold,
  TOKENS_PER_IMAGE_ESTIMATE,
} from '@/lib/catalogs/cost-estimate'
import { startExtractionJob } from '@/lib/catalogs/extraction-actions'
import type { Catalog } from '@/lib/catalogs/actions'

interface Props {
  catalog: Catalog
  hasOpenRouterKey: boolean
  modelId: string
  onExtractConfirmed?: () => void
}

export function ExtractionEstimateCard({ catalog, hasOpenRouterKey, modelId }: Props) {
  const router = useRouter()
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const pages = catalog.page_count ?? 0
  const { estimatedCostUsd, estimatedCostBrl } = calculateExtractionCost(pages, modelId)
  const needsConfirmation = exceedsThreshold(estimatedCostBrl)

  const brlFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
  const usdFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 4 })

  async function handleExtractConfirmed() {
    setLoading(true)
    setError(null)
    const { jobId, error: err } = await startExtractionJob(
      catalog.id,
      catalog.brand_id,
      catalog.page_count ?? 0,
    )
    if (err || !jobId) {
      setError(err ?? 'Erro desconhecido.')
      setLoading(false)
      return
    }
    router.push(`/admin/brands/${catalog.brand_id}/extraction/${jobId}`)
  }

  function handleExtractClick() {
    if (!hasOpenRouterKey || loading) return
    if (needsConfirmation) {
      setShowModal(true)
    } else {
      handleExtractConfirmed()
    }
  }

  function handleConfirm() {
    setShowModal(false)
    handleExtractConfirmed()
  }

  return (
    <>
      <div className="rounded-lg border p-6 space-y-4">
        <h2 className="text-base font-medium">Estimativa de custo de extração</h2>

        <div className="flex flex-wrap gap-6 text-sm">
          <div>
            <span className="text-foreground/50">Páginas</span>
            <p className="text-lg font-semibold">{pages}</p>
          </div>
          <div>
            <span className="text-foreground/50">Custo estimado USD</span>
            <p className="text-lg font-semibold">{usdFormatter.format(estimatedCostUsd)}</p>
          </div>
          <div>
            <span className="text-foreground/50">Custo estimado BRL</span>
            <p className="text-lg font-semibold">{brlFormatter.format(estimatedCostBrl)}</p>
          </div>
        </div>

        <p className="text-xs text-foreground/40">
          Estimativa baseada em ~{TOKENS_PER_IMAGE_ESTIMATE} tokens/página. Custo real pode variar.
        </p>

        <button
          type="button"
          onClick={handleExtractClick}
          disabled={!hasOpenRouterKey || loading}
          title={!hasOpenRouterKey ? 'Configure sua chave OpenRouter primeiro' : undefined}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Iniciando...' : 'Iniciar extração'}
        </button>

        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background rounded-lg border p-6 max-w-sm w-full mx-4 space-y-4 shadow-lg">
            <h3 className="font-semibold">Confirmar extração</h3>
            <p className="text-sm text-foreground/70">
              Custo estimado {brlFormatter.format(estimatedCostBrl)} excede R${' '}
              {new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 0 }).format(50)}. Confirma extração?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Sim, processar mesmo assim
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
