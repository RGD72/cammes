import { describe, it, expect } from 'vitest'
import { generateCsv } from '@/lib/csv/generate-csv'
import type { CsvRow } from '@/lib/csv/generate-csv'

const MOCK_ROW: CsvRow = {
  reference: 'REF-001',
  description: 'Camiseta Branca',
  color: 'Branco',
  size: 'M',
  quantity: 2,
  customer_name: 'Maria Silva',
  unit_price_brl: 89.9,
  total_brl: 179.8,
}

describe('generateCsv', () => {
  it('P-CSV-1: produz BOM + header correto + separador ;', () => {
    const csv = generateCsv([MOCK_ROW])

    expect(csv.startsWith('﻿')).toBe(true)
    expect(csv).toContain('Referência;Descrição;Cor;Tamanho;Qtd;Nome do Cliente;Valor da Peça;Valor Total')
    expect(csv).toContain(';')
  })

  it('P-CSV-2: decimal formatado com , (150.5 → "150,50")', () => {
    const row: CsvRow = { ...MOCK_ROW, unit_price_brl: 150.5, total_brl: 301.0 }
    const csv = generateCsv([row])

    expect(csv).toContain('150,50')
    expect(csv).toContain('301,00')
    expect(csv).not.toContain('150.50')
  })

  it('P-CSV-3: valores null renderizados como string vazia', () => {
    const row: CsvRow = { ...MOCK_ROW, color: null, size: null }
    const csv = generateCsv([row])

    const dataLine = csv.split('\r\n')[1]
    const cells = dataLine.split(';')
    expect(cells[2]).toBe('')
    expect(cells[3]).toBe('')
  })

  it('escapa células com ponto-e-vírgula em aspas duplas', () => {
    const row: CsvRow = { ...MOCK_ROW, description: 'Camiseta; Azul' }
    const csv = generateCsv([row])

    expect(csv).toContain('"Camiseta; Azul"')
  })

  it('gera linha vazia de dados corretamente quando rows é []', () => {
    const csv = generateCsv([])

    expect(csv.startsWith('﻿')).toBe(true)
    const lines = csv.split('\r\n').filter(Boolean)
    expect(lines).toHaveLength(1)
  })
})
