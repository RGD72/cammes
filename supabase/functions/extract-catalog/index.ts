import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { z } from 'npm:zod@3'

// PDF sent natively to Gemini Flash 2.5 via OpenRouter's document content type.
// No page rendering library needed here — the model processes all pages in a
// single call. Page images (for image_crop_url) are rendered client-side at
// upload time (lib/catalogs/render-pdf-pages.ts) and just looked up below.

// Global handlers ensure any rejection that escapes processExtraction's internal
// try/catch (e.g. failed DB update inside the catch block, or a throw before the
// try) surfaces in Edge Function logs instead of disappearing silently.
addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
  console.error('[extract-catalog] unhandledrejection:', event.reason)
  event.preventDefault()
})

addEventListener('error', (event: ErrorEvent) => {
  console.error('[extract-catalog] uncaught error:', event.error ?? event.message)
})

const EXTRACTION_PROMPT = `Você é um assistente especializado em extração de dados de catálogos de moda.

Analise o documento PDF fornecido e extraia TODOS os produtos de TODAS as páginas.

Para cada produto encontrado, retorne um objeto JSON com os seguintes campos:
- reference: código ou referência do produto (string ou null)
- description: descrição do produto (string ou null)
- sizes: tamanhos disponíveis (array de strings, ex: ["P", "M", "G", "GG"])
- colors: cores disponíveis (array de strings, ex: ["Preto", "Branco"])
- price_brl: preço em reais (número decimal ou null)
- look_group: grupo de look ou coleção (string ou null)
- source_page: número da página do PDF onde o produto aparece (inteiro, 1-indexed, ou null)

Retorne APENAS um objeto JSON válido no seguinte formato, sem markdown, sem explicações adicionais:

{
  "products": [
    {
      "reference": "REF-001",
      "description": "Blusa de seda manga curta",
      "sizes": ["P", "M", "G"],
      "colors": ["Preto", "Branco"],
      "price_brl": 129.90,
      "look_group": "Verão 2026",
      "source_page": 3
    }
  ]
}

Se o documento não contiver produtos, retorne:
{ "products": [] }

Regras: retorne null para campos ausentes; sizes e colors devem ser arrays; price_brl deve ser número decimal; source_page deve ser o número inteiro da página; responda APENAS com JSON válido, sem markdown.`

const MODEL_PRICING: Record<string, number> = {
  'google/gemini-2.5-flash': 0.0004,
  'google/gemini-pro-vision': 0.001,
  'openai/gpt-4o': 0.005,
  'openai/gpt-4o-mini': 0.00015,
}
const DEFAULT_PRICING = 0.0004

const ZodProduct = z.object({
  reference: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  sizes: z.array(z.string()).default([]),
  colors: z.array(z.string()).default([]),
  price_brl: z.number().optional().nullable(),
  look_group: z.string().optional().nullable(),
  source_page: z.number().int().optional().nullable(),
})

const ZodExtractionResult = z.object({
  products: z.array(ZodProduct),
})

async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn()
    } catch (err) {
      if (attempt === maxRetries - 1) throw err
      await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 2000))
    }
  }
  throw new Error('Max retries exceeded')
}

async function processExtraction(payload: {
  jobId: string
  catalogId: string
  brandId: string
  filePath: string
  modelId: string
  pagesTotal: number
  openrouterKey: string
}) {
  const { jobId, catalogId, brandId, filePath, modelId, pagesTotal, openrouterKey } = payload

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })
  const pricing = MODEL_PRICING[modelId] ?? DEFAULT_PRICING
  const brlRate = parseFloat(Deno.env.get('BRL_USD_RATE') ?? '5.80')

  // Outside the main try so a DB failure here doesn't mask the real error —
  // but wrapped so it can't escape as an unhandled rejection.
  try {
    await supabase
      .from('extraction_jobs')
      .update({ status: 'running', started_at: new Date().toISOString() })
      .eq('id', jobId)
  } catch (initErr) {
    console.error('[extract-catalog] failed to set running status:', initErr)
  }

  try {
    const { data: pdfBlob, error: downloadError } = await supabase.storage
      .from('catalogs')
      .download(filePath)

    if (downloadError || !pdfBlob) {
      throw new Error(`Falha ao baixar PDF: ${downloadError?.message ?? 'blob vazio'}`)
    }

    const pdfBytes = new Uint8Array(await pdfBlob.arrayBuffer())

    // Chunked base64 to avoid stack overflow on large PDFs
    let base64Pdf = ''
    for (let i = 0; i < pdfBytes.length; i += 8192) {
      base64Pdf += String.fromCharCode(...pdfBytes.subarray(i, i + 8192))
    }
    base64Pdf = btoa(base64Pdf)

    const orResponse = await withRetry(async () => {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${openrouterKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: modelId,
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: EXTRACTION_PROMPT },
                {
                  type: 'file',
                  file: {
                    filename: 'catalog.pdf',
                    file_data: `data:application/pdf;base64,${base64Pdf}`,
                  },
                },
              ],
            },
          ],
          response_format: { type: 'json_object' },
        }),
      })
      if (!res.ok) {
        const body = await res.text()
        throw new Error(`OpenRouter ${res.status}: ${body}`)
      }
      return res.json()
    })

    const usage = orResponse.usage ?? {}
    const tokensUsed = (usage.prompt_tokens ?? 0) + (usage.completion_tokens ?? 0)
    const totalCostUsd = tokensUsed * (pricing / 1000)

    let products: z.infer<typeof ZodProduct>[] = []
    let parseError: string | null = null
    try {
      const raw = JSON.parse(orResponse.choices?.[0]?.message?.content ?? '{}')
      products = ZodExtractionResult.parse(raw).products
    } catch (parseErr) {
      parseError = `JSON inválido: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}`
    }

    if (products.length > 0) {
      // Página renderizada client-side no upload (ver render-pdf-pages.ts) e
      // armazenada em {brandId}/{catalogId}/pages/page-{n}.jpg. Lista o que
      // existe de fato — best-effort, nunca bloqueia a extração se faltar.
      const availablePages = new Set<number>()
      try {
        const { data: pageFiles } = await supabase.storage
          .from('catalogs')
          .list(`${brandId}/${catalogId}/pages`, { limit: 1000 })
        for (const file of pageFiles ?? []) {
          const match = /^page-(\d+)\.jpg$/.exec(file.name)
          if (match) availablePages.add(parseInt(match[1], 10))
        }
      } catch (listErr) {
        console.error('[extract-catalog] failed to list page images:', listErr)
      }

      const rows = products.map((p) => ({
        brand_id: brandId,
        catalog_id: catalogId,
        extraction_job_id: jobId,
        reference: p.reference ?? null,
        description: p.description ?? null,
        sizes: p.sizes ?? [],
        colors: p.colors ?? [],
        price_brl: p.price_brl ?? null,
        look_group: p.look_group ?? null,
        source_page: p.source_page ?? null,
        image_crop_url:
          p.source_page && availablePages.has(p.source_page)
            ? `${brandId}/${catalogId}/pages/page-${p.source_page}.jpg`
            : null,
      }))
      // Idempotent upsert: ON CONFLICT (extraction_job_id, source_page, reference) DO NOTHING
      // Requires a non-partial unique index — see migration fix_products_upsert_index.
      const { error: upsertErr } = await supabase
        .from('products')
        .upsert(rows, { onConflict: 'extraction_job_id,source_page,reference', ignoreDuplicates: true })
      if (upsertErr) {
        console.error('[extract-catalog] upsert failed:', upsertErr)
        parseError = parseError ?? `Erro ao salvar produtos: ${upsertErr.message}`
      }
    }

    const doneUpdate: Record<string, unknown> = {
      status: 'done',
      completed_at: new Date().toISOString(),
      pages_processed: pagesTotal,
      products_count: products.length,
      actual_cost_usd: totalCostUsd,
      actual_cost_brl: totalCostUsd * brlRate,
    }
    if (parseError) doneUpdate.error_message = parseError

    await supabase.from('extraction_jobs').update(doneUpdate).eq('id', jobId)
    await supabase.from('catalogs').update({ status: 'ready_for_review' }).eq('id', catalogId)
  } catch (err) {
    console.error('[extract-catalog] extraction failed:', err)
    try {
      await supabase
        .from('extraction_jobs')
        .update({
          status: 'failed',
          error_message: err instanceof Error ? err.message : 'Erro interno',
          completed_at: new Date().toISOString(),
        })
        .eq('id', jobId)
    } catch (updateErr) {
      console.error('[extract-catalog] failed to persist error status:', updateErr)
    }
  }
}

Deno.serve(async (req) => {
  // Gateway receives Authorization: Bearer {anonKey} — validated by Supabase infra.
  // We validate server-to-server trust via X-Service-Role-Key, which is never
  // forwarded to the client and only set by the Next.js server action.
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const incomingServiceKey = req.headers.get('X-Service-Role-Key')
  if (!incomingServiceKey || incomingServiceKey !== serviceRoleKey) {
    return new Response('Unauthorized', { status: 401 })
  }

  const openrouterKey = req.headers.get('X-OpenRouter-Key')
  if (!openrouterKey) {
    return new Response('Missing X-OpenRouter-Key header', { status: 400 })
  }

  let payload: Record<string, unknown>
  try {
    payload = await req.json()
  } catch {
    return new Response('Invalid JSON body', { status: 400 })
  }

  // Responde 200 imediatamente; processamento ocorre em background
  EdgeRuntime.waitUntil(processExtraction({ ...payload, openrouterKey } as Parameters<typeof processExtraction>[0]))

  return new Response(JSON.stringify({ status: 'accepted' }), {
    headers: { 'Content-Type': 'application/json' },
    status: 200,
  })
})
