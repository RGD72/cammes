# Prompt de Extração de Catálogo

## Constante EXTRACTION_PROMPT (usada na Edge Function)

```
Você é um assistente especializado em extração de dados de catálogos de moda.

Analise a imagem fornecida (uma página de catálogo) e extraia todos os produtos visíveis.

Para cada produto encontrado, retorne um objeto JSON com os seguintes campos:
- reference: código ou referência do produto (string ou null)
- description: descrição do produto (string ou null)
- sizes: tamanhos disponíveis (array de strings, ex: ["P", "M", "G", "GG"])
- colors: cores disponíveis (array de strings, ex: ["Preto", "Branco"])
- price_brl: preço em reais (número decimal ou null)
- look_group: grupo de look ou coleção (string ou null)

Retorne APENAS um objeto JSON válido no seguinte formato, sem markdown, sem explicações adicionais:

{
  "products": [
    {
      "reference": "REF-001",
      "description": "Blusa de seda manga curta",
      "sizes": ["P", "M", "G"],
      "colors": ["Preto", "Branco"],
      "price_brl": 129.90,
      "look_group": "Verão 2026"
    }
  ]
}

Se a página não contiver produtos (ex: página de capa, editorial sem produtos, página em branco), retorne:
{ "products": [] }

Regras importantes:
- Retorne null para campos ausentes (não omita as chaves)
- sizes e colors devem ser arrays (array vazio [] se não houver informação)
- price_brl deve ser número decimal, não string (ex: 129.90 e não "R$ 129,90")
- Responda APENAS com JSON válido, sem formatação markdown, sem texto adicional
```

## Formato JSON esperado na resposta

```json
{
  "products": [
    {
      "reference": "REF-001",
      "description": "Blusa de seda manga curta",
      "sizes": ["P", "M", "G"],
      "colors": ["Preto"],
      "price_brl": 129.90,
      "look_group": "Coleção Verão"
    },
    {
      "reference": null,
      "description": "Calça jeans skinny",
      "sizes": ["36", "38", "40", "42"],
      "colors": ["Azul", "Preto"],
      "price_brl": 249.90,
      "look_group": null
    }
  ]
}
```

## Campos extraídos vs campos injetados pelo pipeline

| Campo | Origem |
|-------|--------|
| `reference` | LLM Vision |
| `description` | LLM Vision |
| `sizes` | LLM Vision |
| `colors` | LLM Vision |
| `price_brl` | LLM Vision |
| `look_group` | LLM Vision |
| `source_page` | Pipeline (índice 1-based da página) |
| `extraction_confidence` | Reservado para uso futuro |
| `brand_id` | Payload do job |
| `catalog_id` | Payload do job |
| `extraction_job_id` | Payload do job |

## Validação

A resposta JSON é validada contra `ZodExtractionResult` em `lib/catalogs/extraction-schema.ts`.

Itens com JSON inválido ou que falhem na validação são contabilizados em `extraction_jobs.error_message` mas não interrompem o processamento das demais páginas.

## Modelo padrão

`google/gemini-flash-2.5` — selecionável na tela de configuração OpenRouter (Story 2.1).

A chamada usa `response_format: { type: 'json_object' }` para garantir resposta em JSON puro.
