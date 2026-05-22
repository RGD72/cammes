import { describe, it, expect } from 'vitest'
import { ZodExtractionProduct, ZodExtractionResult } from '@/lib/catalogs/extraction-schema'

describe('ZodExtractionProduct', () => {
  it('parseia produto com todos os campos', () => {
    const product = ZodExtractionProduct.parse({
      reference: 'REF-001',
      description: 'Blusa de seda',
      sizes: ['P', 'M', 'G'],
      colors: ['Preto'],
      price_brl: 129.9,
      image_crop_url: 'https://example.com/image.png',
      look_group: 'Verão',
      source_page: 1,
      extraction_confidence: { reference: 0.95, description: 0.8 },
    })
    expect(product.reference).toBe('REF-001')
    expect(product.price_brl).toBe(129.9)
    expect(product.sizes).toEqual(['P', 'M', 'G'])
    expect(product.source_page).toBe(1)
  })

  it('aceita produto com campos opcionais ausentes', () => {
    const product = ZodExtractionProduct.parse({
      sizes: [],
      colors: [],
      source_page: 3,
    })
    expect(product.reference).toBeUndefined()
    expect(product.price_brl).toBeUndefined()
    expect(product.image_crop_url).toBeUndefined()
    expect(product.look_group).toBeUndefined()
    expect(product.sizes).toEqual([])
  })

  it('usa default [] para sizes e colors quando ausentes', () => {
    const product = ZodExtractionProduct.parse({ source_page: 2 })
    expect(product.sizes).toEqual([])
    expect(product.colors).toEqual([])
  })

  it('rejeita produto com sizes não sendo array', () => {
    expect(() =>
      ZodExtractionProduct.parse({ source_page: 1, sizes: 'M' }),
    ).toThrow()
  })

  it('rejeita produto com colors não sendo array', () => {
    expect(() =>
      ZodExtractionProduct.parse({ source_page: 1, colors: 'Preto' }),
    ).toThrow()
  })

  it('rejeita produto sem source_page', () => {
    expect(() =>
      ZodExtractionProduct.parse({ reference: 'REF-001' }),
    ).toThrow()
  })
})

describe('ZodExtractionResult', () => {
  it('parseia resultado com array de produtos', () => {
    const result = ZodExtractionResult.parse({
      products: [
        { source_page: 1, reference: 'REF-001' },
        { source_page: 1, description: 'Calça jeans' },
      ],
    })
    expect(result.products).toHaveLength(2)
  })

  it('aceita array vazio de produtos', () => {
    const result = ZodExtractionResult.parse({ products: [] })
    expect(result.products).toHaveLength(0)
  })

  it('lança ZodError quando products não é array', () => {
    expect(() =>
      ZodExtractionResult.parse({ products: 'not-an-array' }),
    ).toThrow()
  })

  it('lança ZodError quando products está ausente', () => {
    expect(() => ZodExtractionResult.parse({})).toThrow()
  })

  it('lança ZodError para entrada undefined', () => {
    expect(() => ZodExtractionResult.parse(undefined)).toThrow()
  })
})
