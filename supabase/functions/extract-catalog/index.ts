import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import mupdf from 'https://esm.sh/mupdf@1'
import { z } from 'npm:zod@3'

// mupdf replaces npm:pdfjs-dist@4 (28MB bundled → WASM loaded at runtime via esm.sh).
// No browser APIs needed: mupdf renders PDF pages natively in WASM and outputs PNG bytes directly.

const EXTRACTION_PROMPT = `Você é um assistente especializado em extração de dados de catálogos de moda.

Analise a imagem fornecida (uma página de catálogo) e extraia todos os produtos visíveis.

Para cada produto encontrado, retorne um objeto JSON com os seguintes campos:
- reference: código ou referência do produto (string ou null)
- description: descrição do produto (string ou null)
- sizes: tamanhos disponíveis (array de strings, ex: ["P", "M", "G", "GG"])
- colors: cores disponíveis (array de strings, ex: ["Preto", "Branco"])
- price_brl: preço em reais (número decimal ou null)
- look_group: grupo de look ou coleção (string ou null)

Retorne APENAS um objeto JSON válido no seguinte formato, sem markdown, sem explicações adicionais:

{
  "products": [
    {
      "reference": "REF-001",
      "description": "Blusa de seda manga curta",
      "sizes": ["P", "M", "G"],
      "colors": ["Preto", "Branco"],
      "price_brl": 129.90,
      "look_group": "Verão 2026"
    }
  ]
}

Se a página não contiver produtos (ex: página de capa, editorial sem produtos), retorne:
{ "products": [] }

Regras: retorne null para campos ausentes; sizes e colors devem ser arrays; price_brl deve ser número decimal; responda APENAS com JSON válido, sem markdown.`

const MODEL_PRICING: Record<string, number> = {
  'google/gemini-flash-2.5': 0.0004,
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
})

const ZodPageResult = z.object({
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

  await supabase
    .from('extraction_jobs')
    .update({ status: 'running', started_at: new Date().toISOString() })
    .eq('id', jobId)

  let totalCostUsd = 0
  let totalProducts = 0

  try {
    const { data: pdfBlob, error: downloadError } = await supabase.storage
      .from('catalogs')
      .download(filePath)

    if (downloadError || !pdfBlob) {
      throw new Error(`Falha ao baixar PDF: ${downloadError?.message ?? 'blob vazio'}`)
    }

    const pdfArrayBuffer = await pdfBlob.arrayBuffer()
    const doc = mupdf.Document.openDocument(new Uint8Array(pdfArrayBuffer), 'application/pdf')

    try {
      for (let pageIndex = 1; pageIndex <= pagesTotal; pageIndex++) {
        let pageProducts = 0
        let pageError: string | null = null

        try {
          // mupdf uses 0-based page indexes
          const page = doc.loadPage(pageIndex - 1)
          let pixmap: typeof mupdf.Pixmap | null = null

          try {
            const bounds = page.getBounds() // [x0, y0, x1, y1] in PDF points (72 DPI)
            const naturalWidth = bounds[2] - bounds[0]
            const scale = 1024 / naturalWidth
            pixmap = page.toPixmap(
              mupdf.Matrix.scale(scale, scale),
              mupdf.ColorSpace.DeviceRGB,
              false, // no alpha channel
            )
            const pngBytes = pixmap.asPNG() // Uint8Array — no OffscreenCanvas needed

            // Chunked base64 to avoid stack overflow on large pages
            let base64Png = ''
            for (let i = 0; i < pngBytes.length; i += 8192) {
              base64Png += String.fromCharCode(...pngBytes.subarray(i, i + 8192))
            }
            base64Png = btoa(base64Png)

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
                        { type: 'image_url', image_url: { url: `data:image/png;base64,${base64Png}` } },
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
            totalCostUsd += tokensUsed * (pricing / 1000)

            let pageResult: { products: Array<Record<string, unknown>> } = { products: [] }
            try {
              const raw = JSON.parse(orResponse.choices?.[0]?.message?.content ?? '{}')
              pageResult = ZodPageResult.parse(raw)
            } catch (parseErr) {
              pageError = `Página ${pageIndex}: JSON inválido — ${parseErr instanceof Error ? parseErr.message : String(parseErr)}`
            }

            if (pageResult.products.length > 0) {
              const rows = pageResult.products.map((p) => ({
                brand_id: brandId,
                catalog_id: catalogId,
                extraction_job_id: jobId,
                reference: p.reference ?? null,
                description: p.description ?? null,
                sizes: p.sizes ?? [],
                colors: p.colors ?? [],
                price_brl: p.price_brl ?? null,
                look_group: p.look_group ?? null,
                source_page: pageIndex,
              }))
              // Idempotent upsert: ON CONFLICT (extraction_job_id, source_page, reference) DO NOTHING
              const { error: insertErr } = await supabase
                .from('products')
                .upsert(rows, { onConflict: 'extraction_job_id,source_page,reference', ignoreDuplicates: true })
              if (!insertErr) pageProducts = rows.length
            }
          } finally {
            // Free WASM memory per page to avoid accumulation across large PDFs
            pixmap?.destroy()
            page.destroy()
          }

          totalProducts += pageProducts
        } catch (pageErr) {
          pageError = `Página ${pageIndex}: ${pageErr instanceof Error ? pageErr.message : String(pageErr)}`
        }

        const update: Record<string, unknown> = {
          pages_processed: pageIndex,
          products_count: totalProducts,
          actual_cost_usd: totalCostUsd,
          actual_cost_brl: totalCostUsd * brlRate,
        }
        if (pageError) update.error_message = pageError

        await supabase.from('extraction_jobs').update(update).eq('id', jobId)
      }
    } finally {
      doc.destroy()
    }

    await supabase
      .from('extraction_jobs')
      .update({
        status: 'done',
        completed_at: new Date().toISOString(),
        actual_cost_usd: totalCostUsd,
        actual_cost_brl: totalCostUsd * brlRate,
      })
      .eq('id', jobId)

    await supabase.from('catalogs').update({ status: 'ready_for_review' }).eq('id', catalogId)
  } catch (err) {
    await supabase
      .from('extraction_jobs')
      .update({
        status: 'failed',
        error_message: err instanceof Error ? err.message : 'Erro interno',
        completed_at: new Date().toISOString(),
      })
      .eq('id', jobId)
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

  const payload = await req.json()

  // Responde 200 imediatamente; processamento ocorre em background
  EdgeRuntime.waitUntil(processExtraction({ ...payload, openrouterKey }))

  return new Response(JSON.stringify({ status: 'accepted' }), {
    headers: { 'Content-Type': 'application/json' },
    status: 200,
  })
})
