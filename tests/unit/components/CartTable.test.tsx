import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CartTable } from '@/components/customer/CartTable'
import type { CartItemEnriched } from '@/components/customer/CartTable'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}))

const ITEM_1: CartItemEnriched = {
  id: 'item-1',
  cart_id: 'cart-1',
  product_id: 'prod-1',
  reference: 'REF-001',
  description: 'Camiseta Básica',
  color: 'Azul',
  size: 'M',
  quantity: 2,
  unit_price_brl_snapshot: 50.0,
  total_brl: 100.0,
  added_at: '2026-05-23T00:00:00Z',
}

const ITEM_2: CartItemEnriched = {
  id: 'item-2',
  cart_id: 'cart-1',
  product_id: 'prod-2',
  reference: 'REF-002',
  description: 'Calça Slim',
  color: 'Preto',
  size: 'G',
  quantity: 1,
  unit_price_brl_snapshot: 120.0,
  total_brl: 120.0,
  added_at: '2026-05-23T00:01:00Z',
}

const DEFAULT_PROPS = {
  items: [ITEM_1, ITEM_2],
  customerName: 'Maria Santos',
  brandId: 'brand-1',
  onChangeQty: vi.fn().mockResolvedValue({ ok: true }),
  onRemove: vi.fn().mockResolvedValue({ ok: true }),
}

beforeEach(() => {
  vi.clearAllMocks()
  DEFAULT_PROPS.onChangeQty = vi.fn().mockResolvedValue({ ok: true })
  DEFAULT_PROPS.onRemove = vi.fn().mockResolvedValue({ ok: true })
})

describe('CartTable', () => {
  it('P-CT-1: renderiza as 8 colunas obrigatórias na ordem exata', () => {
    render(<CartTable {...DEFAULT_PROPS} />)

    const headers = screen.getAllByRole('columnheader').map((th) => th.textContent?.trim())
    const expected = [
      'REFERÊNCIA',
      'DESCRIÇÃO DO PRODUTO',
      'COR',
      'TAMANHO',
      'QUANTIDADE',
      'NOME DO CLIENTE',
      'VALOR DA PEÇA',
      'VALOR TOTAL',
    ]
    // Headers contain the 8 required columns (plus AÇÕES at end)
    expected.forEach((col) => {
      expect(headers).toContain(col)
    })
    // Verify order: each required column appears before the next
    for (let i = 0; i < expected.length - 1; i++) {
      const idxCurrent = headers.indexOf(expected[i])
      const idxNext = headers.indexOf(expected[i + 1])
      expect(idxCurrent).toBeLessThan(idxNext)
    }
  })

  it('P-CT-2: stepper chama onChangeQty com nova quantidade', async () => {
    const user = userEvent.setup()
    const onChangeQty = vi.fn().mockResolvedValue({ ok: true })
    render(<CartTable {...DEFAULT_PROPS} onChangeQty={onChangeQty} />)

    const plusButtons = screen.getAllByLabelText('Aumentar quantidade')
    await user.click(plusButtons[0])

    expect(onChangeQty).toHaveBeenCalledWith(ITEM_1.id, ITEM_1.quantity + 1)
  })

  it('P-CT-3: botão remover chama onRemove com itemId correto', async () => {
    const user = userEvent.setup()
    const onRemove = vi.fn().mockResolvedValue({ ok: true })
    render(<CartTable {...DEFAULT_PROPS} onRemove={onRemove} />)

    const removeButtons = screen.getAllByLabelText('Remover item')
    await user.click(removeButtons[0])

    expect(onRemove).toHaveBeenCalledWith(ITEM_1.id)
  })

  it('P-CT-4: rodapé exibe soma de VALOR TOTAL correta', () => {
    render(<CartTable {...DEFAULT_PROPS} />)

    // total = 100 + 120 = 220 — query tfoot directly to avoid locale formatting
    const tfoot = document.querySelector('tfoot')
    expect(tfoot?.textContent).toContain('220')
  })

  it('N-CT-1: botão + desabilitado quando quantity = 99', () => {
    const itemAtMax: CartItemEnriched = { ...ITEM_1, quantity: 99 }
    render(<CartTable {...DEFAULT_PROPS} items={[itemAtMax]} />)

    const plusButtons = screen.getAllByLabelText('Aumentar quantidade')
    expect((plusButtons[0] as HTMLButtonElement).disabled).toBe(true)
  })

  it('N-CT-2: botão − desabilitado quando quantity = 1', () => {
    const itemAtMin: CartItemEnriched = { ...ITEM_1, quantity: 1 }
    render(<CartTable {...DEFAULT_PROPS} items={[itemAtMin]} />)

    const minusButtons = screen.getAllByLabelText('Diminuir quantidade')
    expect((minusButtons[0] as HTMLButtonElement).disabled).toBe(true)
  })

  it('A-CT-1: botões de stepper e remover têm aria-label acessível', () => {
    render(<CartTable {...DEFAULT_PROPS} />)

    expect(screen.getAllByLabelText('Aumentar quantidade').length).toBeGreaterThan(0)
    expect(screen.getAllByLabelText('Diminuir quantidade').length).toBeGreaterThan(0)
    expect(screen.getAllByLabelText('Remover item').length).toBeGreaterThan(0)
  })
})
