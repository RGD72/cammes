'use server'

import { PDFDocument } from 'pdf-lib'
import { createServiceRoleSupabaseClient } from '@/lib/supabase/admin'

export async function countPdfPagesAndUpdateStatus(
  catalogId: string,
  filePath: string,
): Promise<{ pageCount: number | null; error: string | null }> {
  try {
    const supabase = createServiceRoleSupabaseClient()

    const { data: blob, error: downloadError } = await supabase.storage
      .from('catalogs')
      .download(filePath)

    if (downloadError || !blob) {
      return { pageCount: null, error: 'Não foi possível contar as páginas do PDF.' }
    }

    const arrayBuffer = await blob.arrayBuffer()
    const doc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true })
    const pageCount = doc.getPageCount()

    const { error: updateError } = await supabase
      .from('catalogs')
      .update({ page_count: pageCount, status: 'awaiting_extraction' })
      .eq('id', catalogId)

    if (updateError) {
      return { pageCount: null, error: 'Não foi possível contar as páginas do PDF.' }
    }

    return { pageCount, error: null }
  } catch {
    return { pageCount: null, error: 'Não foi possível contar as páginas do PDF.' }
  }
}
