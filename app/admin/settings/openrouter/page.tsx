import { getOpenRouterStatus } from '@/lib/admin/openrouter-settings'
import { OpenRouterSettingsForm } from './openrouter-settings-form'

export const metadata = { title: 'Configurações OpenRouter — CAMMES Admin' }

export default async function OpenRouterSettingsPage() {
  const status = await getOpenRouterStatus()

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-semibold">Configurações OpenRouter</h1>
      <p className="mt-2 mb-6 text-sm text-muted-foreground">
        Configure sua chave de API OpenRouter para habilitar a extração de dados de catálogos via IA.
        A chave é armazenada criptografada e nunca exibida em texto-claro.
      </p>
      <OpenRouterSettingsForm initialStatus={status} />
    </div>
  )
}
