export interface CsvRow {
  reference: string
  description: string
  color: string | null
  size: string | null
  quantity: number
  customer_name: string
  unit_price_brl: number
  total_brl: number
}

const CSV_HEADER = 'Referência;Descrição;Cor;Tamanho;Qtd;Nome do Cliente;Valor da Peça;Valor Total'

function formatDecimal(n: number): string {
  return n.toFixed(2).replace('.', ',')
}

function escapeCell(value: string): string {
  if (value.includes(';') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

export function generateCsv(rows: CsvRow[]): string {
  const BOM = '﻿'
  const lines = [CSV_HEADER]

  for (const row of rows) {
    const cells = [
      escapeCell(row.reference),
      escapeCell(row.description),
      escapeCell(row.color ?? ''),
      escapeCell(row.size ?? ''),
      String(row.quantity),
      escapeCell(row.customer_name),
      formatDecimal(row.unit_price_brl),
      formatDecimal(row.total_brl),
    ]
    lines.push(cells.join(';'))
  }

  return BOM + lines.join('\r\n') + '\r\n'
}
