'use client'

import { useTransition, useState } from 'react'
import {
  saveOpenRouterKey,
  saveOpenRouterModel,
  testOpenRouterKey,
  OPENROUTER_VISION_MODELS,
  type OpenRouterStatus,
} from '@/lib/admin/openrouter-settings'

interface Props {
  initialStatus: OpenRouterStatus
}

type Feedback = { type: 'success' | 'error'; message: string } | null

export function OpenRouterSettingsForm({ initialStatus }: Props) {
  const [status, setStatus] = useState<OpenRouterStatus>(initialStatus)
  const [keyInput, setKeyInput] = useState('')
  const [feedback, setFeedback] = useState<Feedback>(null)
  const [testResult, setTestResult] = useState<Feedback>(null)
  const [isPending, startTransition] = useTransition()

  const brlFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
  const usdFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

  function showFeedback(type: 'success' | 'error', message: string) {
    setFeedback({ type, message })
    setTimeout(() => setFeedback(null), 4000)
  }

  function handleSaveKey() {
    const fd = new FormData()
    fd.set('openrouter_key', keyInput)
    startTransition(async () => {
      const result = await saveOpenRouterKey(fd)
      if (result.success) {
        showFeedback('success', 'Chave salva com sucesso.')
        setKeyInput('')
        // Refresh masked key without full page reload
        setStatus((prev) => ({
          ...prev,
          hasKey: true,
          maskedKey: `sk-or-...${keyInput.slice(-4)}`,
        }))
      } else {
        showFeedback('error', result.error ?? 'Falha ao salvar chave.')
      }
    })
  }

  function handleTestKey() {
    const keyToTest = keyInput || ''
    startTransition(async () => {
      const result = await testOpenRouterKey(keyToTest)
      if (result.ok) {
        setTestResult({ type: 'success', message: `Conexão OK — ${result.latencyMs}ms` })
      } else {
        setTestResult({ type: 'error', message: result.error ?? 'Falha na conexão' })
      }
      setTimeout(() => setTestResult(null), 5000)
    })
  }

  function handleModelChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const model = e.target.value
    setStatus((prev) => ({ ...prev, model }))
    startTransition(async () => {
      const result = await saveOpenRouterModel(model)
      if (!result.success) {
        showFeedback('error', result.error ?? 'Falha ao salvar modelo.')
      }
    })
  }

  const canTest = keyInput.length > 0

  return (
    <div className="space-y-6">
      {/* Status atual da chave */}
      <div className="rounded-lg border p-6 space-y-4">
        <div>
          <h2 className="font-medium">Chave de API OpenRouter</h2>
          {status.hasKey && status.maskedKey && (
            <p className="mt-1 text-sm text-muted-foreground">
              Configurada:{' '}
              <span className="font-mono rounded bg-muted px-2 py-0.5 text-xs">
                {status.maskedKey}
              </span>
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="openrouter_key" className="text-sm font-medium">
            {status.hasKey ? 'Nova chave (deixe vazio para manter a atual)' : 'Colar chave OpenRouter'}
          </label>
          <input
            id="openrouter_key"
            type="password"
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            placeholder="sk-or-..."
            className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          />
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleSaveKey}
            disabled={isPending || (!keyInput && !status.hasKey)}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? 'Salvando…' : 'Salvar chave'}
          </button>
          <button
            type="button"
            onClick={handleTestKey}
            disabled={isPending || !canTest}
            className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Testar conexão
          </button>
        </div>

        {feedback && (
          <p
            role="status"
            className={`text-sm rounded-md px-3 py-2 ${
              feedback.type === 'success'
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}
          >
            {feedback.message}
          </p>
        )}
        {testResult && (
          <p
            role="status"
            className={`text-sm rounded-md px-3 py-2 ${
              testResult.type === 'success'
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}
          >
            {testResult.message}
          </p>
        )}
      </div>

      {/* Modelo padrão */}
      <div className="rounded-lg border p-6 space-y-3">
        <h2 className="font-medium">Modelo Vision padrão</h2>
        <select
          value={status.model}
          onChange={handleModelChange}
          disabled={isPending}
          className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 bg-background disabled:opacity-50"
        >
          {OPENROUTER_VISION_MODELS.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
      </div>

      {/* Custo mensal */}
      <div className="rounded-lg border p-6 space-y-1">
        <h2 className="font-medium">Custo OpenRouter — mês corrente</h2>
        <p className="text-2xl font-semibold">
          {brlFormatter.format(status.monthlyCostBrl)}
        </p>
        <p className="text-sm text-muted-foreground">
          {usdFormatter.format(status.monthlyCostUsd)} USD
        </p>
      </div>
    </div>
  )
}
