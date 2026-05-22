import { describe, it, expect } from 'vitest'
import { generateSlug } from '@/lib/brands/slug'

describe('generateSlug', () => {
  it('converte espaços em hífens e lowercaseia', () => {
    expect(generateSlug('Moda Verão')).toBe('moda-verao')
  })

  it('remove caracteres especiais e mantém números', () => {
    expect(generateSlug('BRAND 2024!')).toBe('brand-2024')
  })

  it('remove acentos de ç, ã, ê, ó, etc.', () => {
    expect(generateSlug('Coleção Inverno')).toBe('colecao-inverno')
  })

  it('retorna string vazia para entrada vazia', () => {
    expect(generateSlug('')).toBe('')
  })

  it('colapsa múltiplos espaços e hífens', () => {
    expect(generateSlug('Moda  -  Verão')).toBe('moda-verao')
  })

  it('remove hífens no início e no fim', () => {
    expect(generateSlug('  Marca  ')).toBe('marca')
  })

  it('lida com caracteres mistos', () => {
    expect(generateSlug('Moda & Estilo!')).toBe('moda-estilo')
  })
})
