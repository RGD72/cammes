export type SizeFormat = 'letter' | 'numeric'

export const LETTER_SIZES = ['PP', 'P', 'M', 'G'] as const
export const NUMERIC_SIZES = ['36', '38', '40', '42', '44'] as const

// Termos que, quando presentes na descrição, indicam peças vendidas em PP/P/M/G.
// Qualquer outra peça (calças, vestidos, etc.) usa o padrão numérico 36-44.
const LETTER_FORMAT_STEMS = ['jaqueta', 'casaco', 'camiseta', 'camisa']

export function defaultSizeFormatForDescription(description: string | null): SizeFormat {
  const normalized = (description ?? '').toLowerCase()
  return LETTER_FORMAT_STEMS.some((stem) => normalized.includes(stem)) ? 'letter' : 'numeric'
}

export function sizesForFormat(format: SizeFormat): string[] {
  return format === 'letter' ? [...LETTER_SIZES] : [...NUMERIC_SIZES]
}

// Infere o formato atualmente publicado a partir do conteúdo de sizes — usado
// para destacar a opção ativa no toggle do admin.
export function detectSizeFormat(sizes: string[] | null): SizeFormat | null {
  if (!sizes || sizes.length === 0) return null
  const upper = sizes.map((s) => s.toUpperCase())
  if (upper.every((s) => (LETTER_SIZES as readonly string[]).includes(s))) return 'letter'
  if (upper.every((s) => (NUMERIC_SIZES as readonly string[]).includes(s))) return 'numeric'
  return null
}
