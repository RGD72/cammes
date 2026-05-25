import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
  renderToBuffer,
} from '@react-pdf/renderer'
import type { Order, OrderItem } from '@/lib/types/index'

export interface OrderPdfProps {
  order: Order
  items: OrderItem[]
  brandName: string
  brandLogoUrl: string | null
}

function brl(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 8,
    paddingTop: 30,
    paddingBottom: 40,
    paddingHorizontal: 30,
    color: '#1a1a1a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerLeft: {
    flexDirection: 'column',
    gap: 2,
  },
  logo: {
    width: 60,
    height: 30,
    objectFit: 'contain',
  },
  brandName: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: '#111827',
  },
  headerRight: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 2,
  },
  labelText: {
    color: '#6b7280',
  },
  valueText: {
    fontFamily: 'Helvetica-Bold',
  },
  table: {
    marginTop: 8,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e5e7eb',
    paddingVertical: 5,
    paddingHorizontal: 4,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  tableRowAlt: {
    backgroundColor: '#f9fafb',
  },
  totalRow: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderTopWidth: 2,
    borderTopColor: '#e5e7eb',
    paddingVertical: 5,
    paddingHorizontal: 4,
  },
  colRef: { width: '10%' },
  colDesc: { width: '22%' },
  colColor: { width: '9%' },
  colSize: { width: '7%' },
  colQty: { width: '7%', textAlign: 'right' },
  colClient: { width: '20%' },
  colUnit: { width: '12%', textAlign: 'right' },
  colTotal: { width: '13%', textAlign: 'right' },
  headerCell: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 7,
    color: '#374151',
    textTransform: 'uppercase',
  },
  totalLabel: {
    fontFamily: 'Helvetica-Bold',
    textAlign: 'right',
    flex: 1,
    paddingRight: 4,
  },
  totalValue: {
    fontFamily: 'Helvetica-Bold',
    width: '13%',
    textAlign: 'right',
  },
  footer: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 9,
    color: '#d1d5db',
    letterSpacing: 4,
  },
})

function OrderDocument({ order, items, brandName, brandLogoUrl }: OrderPdfProps) {
  const totalBrl = items.reduce((sum, i) => sum + Number(i.total_brl), 0)

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page} wrap>
        {/* Header */}
        <View style={styles.header} fixed>
          <View style={styles.headerLeft}>
            {brandLogoUrl ? (
              // eslint-disable-next-line jsx-a11y/alt-text
              <Image src={brandLogoUrl} style={styles.logo} />
            ) : (
              <Text style={styles.brandName}>{brandName}</Text>
            )}
            {brandLogoUrl && <Text style={styles.brandName}>{brandName}</Text>}
          </View>
          <View style={styles.headerRight}>
            <Text>
              <Text style={styles.labelText}>Cliente: </Text>
              <Text style={styles.valueText}>{order.customer_name}</Text>
            </Text>
            <Text>
              <Text style={styles.labelText}>Pedido: </Text>
              <Text style={styles.valueText}>{order.order_number}</Text>
            </Text>
            <Text>
              <Text style={styles.labelText}>Data: </Text>
              <Text>{formatDate(order.submitted_at)}</Text>
            </Text>
          </View>
        </View>

        {/* Table */}
        <View style={styles.table}>
          {/* Table header */}
          <View style={styles.tableHeader} fixed>
            <Text style={[styles.colRef, styles.headerCell]}>Referência</Text>
            <Text style={[styles.colDesc, styles.headerCell]}>Descrição do Produto</Text>
            <Text style={[styles.colColor, styles.headerCell]}>Cor</Text>
            <Text style={[styles.colSize, styles.headerCell]}>Tamanho</Text>
            <Text style={[styles.colQty, styles.headerCell]}>Qtd</Text>
            <Text style={[styles.colClient, styles.headerCell]}>Nome do Cliente</Text>
            <Text style={[styles.colUnit, styles.headerCell]}>Valor da Peça</Text>
            <Text style={[styles.colTotal, styles.headerCell]}>Valor Total</Text>
          </View>

          {/* Table rows */}
          {items.map((item, index) => (
            <View
              key={item.id}
              style={[styles.tableRow, index % 2 === 1 ? styles.tableRowAlt : {}]}
              wrap={false}
            >
              <Text style={styles.colRef}>{item.reference}</Text>
              <Text style={styles.colDesc}>{item.description}</Text>
              <Text style={styles.colColor}>{item.color ?? '—'}</Text>
              <Text style={styles.colSize}>{item.size ?? '—'}</Text>
              <Text style={styles.colQty}>{item.quantity}</Text>
              <Text style={styles.colClient}>{item.customer_name}</Text>
              <Text style={styles.colUnit}>{brl(Number(item.unit_price_brl))}</Text>
              <Text style={styles.colTotal}>{brl(Number(item.total_brl))}</Text>
            </View>
          ))}

          {/* Total row */}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Geral</Text>
            <Text style={styles.totalValue}>{brl(totalBrl)}</Text>
          </View>
        </View>

        {/* Footer watermark */}
        <Text style={styles.footer} fixed>
          CAMMES
        </Text>
      </Page>
    </Document>
  )
}

export async function renderOrderPdfBuffer(props: OrderPdfProps): Promise<Buffer> {
  const buffer = await renderToBuffer(<OrderDocument {...props} />)
  return Buffer.from(buffer)
}
