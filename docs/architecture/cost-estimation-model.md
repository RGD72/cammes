# Cost Estimation Model

## Fórmula

```
estimatedCostUsd = pages × TOKENS_PER_IMAGE_ESTIMATE × (MODEL_PRICE_USD_PER_1K / 1000)
estimatedCostBrl = estimatedCostUsd × BRL_USD_RATE
```

## Constantes Padrão

| Constante | Valor Padrão | Fonte |
|-----------|-------------|-------|
| `TOKENS_PER_IMAGE_ESTIMATE` | `2000` | Estimativa conservadora por página (imagem + prompt de sistema) |
| `GEMINI_FLASH_25_PRICE_USD_PER_1K` | `0.0004` | OpenRouter — Gemini Flash 2.5 input vision, 2026-05 |
| `COST_THRESHOLD_BRL` | `50` | NFR21 — threshold de confirmação explícita |
| `BRL_USD_RATE` | `5.80` | Fallback configurável via env var |

## Preços por Modelo (MODEL_PRICING)

| Modelo | Preço USD/1K tokens input |
|--------|--------------------------|
| `google/gemini-flash-2.5` | `$0.0004` |
| `google/gemini-pro-2.5` | `$0.0015` |
| `openai/gpt-4o` | `$0.0025` |
| `anthropic/claude-3-5-sonnet` | `$0.003` |

Modelo não encontrado no mapa → fallback para `google/gemini-flash-2.5`.

## Override via Env Vars

| Variável | Descrição |
|----------|-----------|
| `BRL_USD_RATE` | Taxa de câmbio BRL/USD. Default: `5.80` |

As constantes `TOKENS_PER_IMAGE_ESTIMATE` e `GEMINI_FLASH_25_PRICE_USD_PER_1K` são configuráveis apenas em tempo de build (editar `lib/catalogs/cost-estimate.ts`).

## Exemplos

| Catálogo | Páginas | Custo USD (Gemini Flash 2.5) | Custo BRL (taxa 5.80) |
|----------|---------|-----------------------------|-----------------------|
| Pequeno  | 30      | $0.0024                     | R$ 0,01               |
| Médio    | 100     | $0.0080                     | R$ 0,05               |
| Grande   | 200     | $0.0160                     | R$ 0,09               |
| Threshold| ~10.817 | ~$0.867                     | ~R$ 50,00             |

O threshold de R$50 é atingido apenas com catálogos acima de ~10.800 páginas, tornando o modal de confirmação raro na prática para catálogos típicos de 30–200 páginas.

## Limitações

- Não considera tokens de **output** (response da IA)
- Não considera tokens do **prompt de sistema** além dos 2000 estimados por página
- Estimativa não varia por complexidade visual da página (imagem simples vs. densa)
- Preço real via OpenRouter pode variar sem aviso prévio
- Câmbio BRL/USD é fixo (env var) — não usa cotação em tempo real

## Referência de Código

- Constantes e funções: `lib/catalogs/cost-estimate.ts`
- Componente de exibição: `components/admin/extraction-estimate-card.tsx`
- Contagem de páginas: `lib/catalogs/page-count.ts`
