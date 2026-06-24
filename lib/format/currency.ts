export function formatPriceBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

export function formatPriceInputBRL(value: number): string {
  return value.toFixed(2).replace('.', ',')
}

// Aceita apenas formato BR (vírgula decimal, ponto opcional como milhar) —
// o input editável sempre exibe/recebe valores nesse formato.
export function parsePriceInputBRL(raw: string): number | null {
  const normalized = raw.trim().replace(/\./g, '').replace(',', '.')
  if (normalized === '') return null
  const parsed = parseFloat(normalized)
  return isNaN(parsed) ? null : parsed
}
