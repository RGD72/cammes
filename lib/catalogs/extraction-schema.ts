import { z } from 'zod'

export const ZodExtractionProduct = z.object({
  reference: z.string().optional(),
  description: z.string().optional(),
  sizes: z.array(z.string()).default([]),
  colors: z.array(z.string()).default([]),
  price_brl: z.number().optional(),
  image_crop_url: z.string().url().optional(),
  look_group: z.string().optional(),
  source_page: z.number().int(),
  extraction_confidence: z.record(z.number().min(0).max(1)).optional(),
})

export const ZodExtractionResult = z.object({
  products: z.array(ZodExtractionProduct),
})

export type ExtractionProduct = z.infer<typeof ZodExtractionProduct>
export type ExtractionResult = z.infer<typeof ZodExtractionResult>
