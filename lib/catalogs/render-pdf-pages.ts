'use client'

// Renders PDF pages to JPEG in the browser (canvas) and uploads them to
// the catalogs bucket. Runs client-side to avoid the bundle-size limits we
// hit trying to render PDFs inside the Supabase Edge Function (Deno).

import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { getCatalogPageImagePath } from '@/lib/supabase/storage'

export interface RenderPagesProgress {
  current: number
  total: number
}

export async function renderAndUploadCatalogPages(
  file: File,
  brandId: string,
  catalogId: string,
  onProgress?: (progress: RenderPagesProgress) => void,
): Promise<{ renderedPages: number; failedPages: number }> {
  const pdfjsLib = await import('pdfjs-dist')
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).toString()

  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise

  const supabase = createSupabaseBrowserClient()
  let renderedPages = 0
  let failedPages = 0

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    onProgress?.({ current: pageNumber, total: pdf.numPages })
    try {
      const page = await pdf.getPage(pageNumber)
      const viewport = page.getViewport({ scale: 1.5 })
      const canvas = document.createElement('canvas')
      canvas.width = viewport.width
      canvas.height = viewport.height
      const context = canvas.getContext('2d')
      if (!context) throw new Error('Canvas 2D context indisponível.')
      await page.render({ canvas, canvasContext: context, viewport }).promise

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error('Falha ao gerar JPEG da página.'))),
          'image/jpeg',
          0.82,
        )
      })

      const path = getCatalogPageImagePath(brandId, catalogId, pageNumber)
      const { error } = await supabase.storage
        .from('catalogs')
        .upload(path, blob, { contentType: 'image/jpeg', upsert: true })

      if (error) throw error
      renderedPages++
    } catch (err) {
      failedPages++
      console.error('[render-pdf-pages] página', pageNumber, 'falhou:', err)
    }
  }

  return { renderedPages, failedPages }
}
