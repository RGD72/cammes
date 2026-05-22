import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import * as pdfjs from 'npm:pdfjs-dist@4'
import { z } from 'npm:zod@3'

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
    const doc = await pdfjs.getDocument({ data: pdfArrayBuffer }).promise

    for (let pageIndex = 1; pageIndex <= pagesTotal; pageIndex++) {
      let pageProducts = 0
      let pageError: string | null = null

      try {
        const page = await doc.getPage(pageIndex)
        const naturalViewport = page.getViewport({ scale: 1 })
        const scale = 1024 / naturalViewport.width
        const viewport = page.getViewport({ scale })
        const canvas = new OffscreenCanvas(Math.floor(viewport.width), Math.floor(viewport.height))
        const ctx = canvas.getContext('2d')
        if (!ctx) throw new Error('Falha ao criar 2D rendering context')
        await page.render({ canvasContext: ctx as unknown as CanvasRenderingContext2D, viewport }).promise
        const blob = await canvas.convertToBlob({ type: 'image/png' })
        const bytes = new Uint8Array(await blob.arrayBuffer())
        let base64Png = ''
        for (let i = 0; i < bytes.length; i += 8192) {
          base64Png += String.fromCharCode(...bytes.subarray(i, i + 8192))
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
          const { error: insertErr } = await supabase.from('products').insert(rows)
          if (!insertErr) pageProducts = rows.length
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
  const authHeader = req.headers.get('Authorization')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!authHeader || authHeader !== `Bearer ${serviceRoleKey}`) {
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
