'use client'

import { useState, useRef, useTransition } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { getCatalogStoragePath } from '@/lib/supabase/storage'
import { createCatalogRecord, checkUploadRateLimit, type Catalog } from '@/lib/catalogs/actions'
import { countPdfPagesAndUpdateStatus } from '@/lib/catalogs/page-count'

const MAX_SIZE_BYTES = 500 * 1024 * 1024 // 500 MB
const ALLOWED_MIME = 'application/pdf'
const ALLOWED_EXT = '.pdf'

interface Props {
  brandId: string
  onUploadComplete?: (catalog: Catalog) => void
}

type UploadState = 'idle' | 'uploading' | 'success' | 'error'

function validateFile(file: File): string | null {
  if (!file.name.toLowerCase().endsWith(ALLOWED_EXT)) {
    return 'Apenas arquivos .pdf são aceitos.'
  }
  if (file.type !== ALLOWED_MIME) {
    return 'Tipo de arquivo inválido — apenas application/pdf é aceito.'
  }
  if (file.size > MAX_SIZE_BYTES) {
    return `Arquivo muito grande. Tamanho máximo: 500MB.`
  }
  return null
}

async function uploadWithProgress(
  file: File,
  path: string,
  accessToken: string,
  onProgress: (pct: number) => void,
): Promise<{ error: string | null }> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !anonKey) return { error: 'Configuração de ambiente ausente.' }

  const url = `${supabaseUrl}/storage/v1/object/catalogs/${path}`

  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', url)
    xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`)
    xhr.setRequestHeader('apikey', anonKey)
    xhr.setRequestHeader('x-upsert', 'false')
    xhr.setRequestHeader('Content-Type', ALLOWED_MIME)

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100))
      }
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve({ error: null })
      } else {
        console.log('[CatalogUpload] upload error', {
          status: xhr.status,
          statusText: xhr.statusText,
          responseText: xhr.responseText,
          responseHeaders: xhr.getAllResponseHeaders(),
        })
        let msg = `Upload falhou (HTTP ${xhr.status}).`
        try {
          const body = JSON.parse(xhr.responseText)
          if (body?.error) msg = body.error
        } catch {}
        resolve({ error: msg })
      }
    }

    xhr.onerror = () => {
      console.log('[CatalogUpload] network error', {
        status: xhr.status,
        statusText: xhr.statusText,
        responseText: xhr.responseText,
      })
      resolve({ error: 'Erro de rede durante o upload.' })
    }
    xhr.onabort = () => resolve({ error: 'Upload cancelado.' })

    xhr.send(file)
  })
}

export function CatalogUploadZone({ brandId, onUploadComplete }: Props) {
  const [isDragging, setIsDragging] = useState(false)
  const [progress, setProgress] = useState(0)
  const [uploadState, setUploadState] = useState<UploadState>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    const validationError = validateFile(file)
    if (validationError) {
      setErrorMessage(validationError)
      return
    }

    setErrorMessage(null)
    setUploadState('uploading')
    setProgress(0)

    // Verificar rate limit via Server Action
    const rateLimit = await checkUploadRateLimit()
    if (!rateLimit.allowed) {
      setUploadState('error')
      setErrorMessage(
        `Limite de uploads atingido (${rateLimit.limit} por hora). Tente novamente em breve.`,
      )
      return
    }

    // Obter sessão do usuário para o token de acesso
    const supabase = createSupabaseBrowserClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      setUploadState('error')
      setErrorMessage('Sessão expirada. Faça login novamente.')
      return
    }

    const path = getCatalogStoragePath(brandId, file.name)
    const { error: uploadError } = await uploadWithProgress(file, path, session.access_token, setProgress)

    if (uploadError) {
      setUploadState('error')
      setErrorMessage(uploadError)
      return
    }

    // Registrar catálogo no banco via Server Action
    startTransition(async () => {
      const { catalog, error: recordError } = await createCatalogRecord({ brandId, filePath: path })
      if (recordError || !catalog) {
        setUploadState('error')
        setErrorMessage(recordError ?? 'Erro ao registrar catálogo.')
        return
      }

      setUploadState('success')
      setProgress(100)

      // Contar páginas e avançar status → awaiting_extraction
      const { pageCount } = await countPdfPagesAndUpdateStatus(catalog.id, path)
      const updatedCatalog: Catalog = pageCount !== null
        ? { ...catalog, page_count: pageCount, status: 'awaiting_extraction' }
        : catalog
      onUploadComplete?.(updatedCatalog)
    })
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }

  const isLoading = uploadState === 'uploading' || isPending

  return (
    <div className="space-y-3">
      <div
        role="button"
        tabIndex={0}
        aria-label="Zona de upload de PDF — clique ou arraste um arquivo"
        onClick={() => !isLoading && inputRef.current?.click()}
        onKeyDown={(e) => e.key === 'Enter' && !isLoading && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-10 text-center transition-colors cursor-pointer select-none
          ${isDragging ? 'border-foreground bg-muted' : 'border-foreground/20 hover:border-foreground/40'}
          ${isLoading ? 'pointer-events-none opacity-60' : ''}
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,application/pdf"
          className="hidden"
          onChange={handleInputChange}
          aria-hidden="true"
        />
        <p className="text-sm font-medium">
          {isLoading ? 'Fazendo upload...' : 'Arraste um PDF aqui ou clique para selecionar'}
        </p>
        <p className="mt-1 text-xs text-foreground/50">Apenas .pdf · Máximo 500MB</p>
      </div>

      {uploadState === 'uploading' && (
        <div className="space-y-1">
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-foreground transition-all duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-foreground/50 text-right">{progress}%</p>
        </div>
      )}

      {uploadState === 'success' && (
        <p className="text-sm text-green-700 bg-green-50 rounded border border-green-200 px-3 py-2">
          Upload concluído com sucesso.
        </p>
      )}

      {errorMessage && (
        <p className="text-sm text-red-700 bg-red-50 rounded border border-red-200 px-3 py-2">
          {errorMessage}
        </p>
      )}
    </div>
  )
}
