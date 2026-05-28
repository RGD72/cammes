# KPI Mapping — CAMMES MVP

> Fonte: `docs/brief.md#success-metrics` + `docs/prd/6-epic-details.md#story-58`
> Criado em: Story 5.8

Cada KPI do brief tem um evento ou agregação correspondente neste documento.
Todas as queries assumem acesso via `service_role` (sem RLS).

---

## Janelas Temporais

| Janela | Definição SQL |
|--------|--------------|
| Rolling 30d | `created_at > now() - interval '30 days'` |
| MTD | `DATE_TRUNC('month', created_at) = DATE_TRUNC('month', now())` |
| Ano corrente | `DATE_TRUNC('year', created_at) = DATE_TRUNC('year', now())` |

---

## KPI-1 — TMCV (Tempo Médio de Catálogo→Vitrine)

**Nome completo:** Tempo Médio de Catálogo→Vitrine
**Meta do brief:** <60 min médios; p95 <2h
**Tabela fonte:** `extraction_jobs`

**Fórmula:**
```sql
SELECT
  AVG(EXTRACT(EPOCH FROM (completed_at - created_at)) / 60.0) AS tmcv_minutes
FROM extraction_jobs
WHERE
  status = 'done'
  AND completed_at IS NOT NULL
  AND created_at > now() - interval '30 days';
```

**Nota:** Mede o tempo de extração do pipeline (desde a criação do job até a conclusão). Conforme PRD AC4 de Story 5.8. O tempo total upload→publicação inclui etapas manuais de revisão admin e está fora do escopo desta métrica automatizada no MVP.

---

## KPI-2 — TPE (Taxa de Precisão da Extração)

**Nome completo:** Taxa de Precisão da Extração
**Meta do brief:** >=85% por produto completo; >=90% por campo
**Tabela fonte:** `products`

**Fórmula (aproximação MVP):**
```sql
SELECT
  COUNT(*) FILTER (WHERE status = 'approved') * 100.0
  / NULLIF(
      COUNT(*) FILTER (WHERE status IN ('approved', 'extracted', 'hidden')),
      0
    ) AS tpe_pct
FROM products;
```

**Nota:** Esta é uma **aproximação**: mede a taxa de aprovação de produtos pelo admin como proxy da precisão de extração. A TPE real exige comparação manual produto-a-produto com o PDF original. Exibir sempre com disclaimer: "Aproximação — validação manual necessária para precisão real". Janela: acumulado total (não temporal) pois reflete o estado atual do catálogo.

---

## KPI-3 — PEE (Pedidos Estruturados Enviados)

**Nome completo:** Pedidos Estruturados Enviados
**Meta do brief:** crescimento 20% MoM nos primeiros 6 meses
**Tabela fonte:** `orders`

**Fórmula:**
```sql
SELECT COUNT(*) AS pee_count
FROM orders
WHERE created_at > now() - interval '30 days';
```

**Fórmula MoM (Phase 2):**
```sql
SELECT
  DATE_TRUNC('month', created_at) AS month,
  COUNT(*) AS orders_count
FROM orders
WHERE created_at > now() - interval '3 months'
GROUP BY 1
ORDER BY 1 DESC;
```

**Nota:** Meta de crescimento 20% MoM requer comparação com mês anterior — implementar em Phase 2. No MVP exibir contagem absoluta dos últimos 30 dias.

---

## KPI-4 — CME (Custo Médio de Extração)

**Nome completo:** Custo Médio de Extração (OpenRouter)
**Meta do brief:** <R$50 por catálogo de até 100 SKUs
**Tabela fonte:** `extraction_jobs`

**Fórmula:**
```sql
SELECT
  AVG(actual_cost_brl) AS cme_brl
FROM extraction_jobs
WHERE
  status = 'done'
  AND actual_cost_brl IS NOT NULL
  AND created_at > now() - interval '30 days';
```

**Nota:** Exclui jobs sem `actual_cost_brl` (jobs anteriores à instrumentação de custo, ou jobs com `actual_cost_brl = NULL`). Conforme PRD AC5 de Story 5.8.

---

## KPI-5 — ABS (Active Brand Stores)

**Nome completo:** Active Brand Stores
**Meta do brief:** >=10 ao fim do 6º mês após lançamento
**Tabelas fonte:** `brands`, `orders`

**Fórmula:**
```sql
SELECT COUNT(DISTINCT b.id) AS abs_count
FROM brands b
JOIN orders o ON o.brand_id = b.id
WHERE
  b.published = true
  AND o.created_at > now() - interval '30 days';
```

**Nota:** "Ativa" = marca publicada que recebeu ao menos 1 pedido nos últimos 30 dias. Marcas publicadas sem pedidos no período não contam.

---

## KPI-6 — CtO (Conversion to Order)

**Nome completo:** Conversion to Order
**Meta do brief:** >=70%
**Tabela fonte:** `audit_logs`
**Eventos necessários:** `cart_item_added` (numerador), `order_submitted` (denominador)

**Fórmula:**
```sql
SELECT
  COUNT(DISTINCT CASE WHEN event_type = 'order_submitted' THEN user_id END) * 100.0
  / NULLIF(
      COUNT(DISTINCT CASE WHEN event_type = 'cart_item_added' THEN user_id END),
      0
    ) AS cto_pct
FROM audit_logs
WHERE
  event_type IN ('cart_item_added', 'order_submitted')
  AND created_at > now() - interval '30 days';
```

**Nota:** Mede a proporção de usuários únicos que adicionaram item ao carrinho e também enviaram um pedido nos últimos 30 dias. O evento `cart_item_added` foi instrumentado em Story 5.8 (`lib/carts/actions.ts#addItem`). Retorna `NULL` se nenhum evento `cart_item_added` foi registrado (dados insuficientes).

---

## KPI-7 — AAD (Admin Active Daily)

**Nome completo:** Admin Active Daily
**Meta do brief:** >=50% dos admins ativos diariamente em semanas de coleção
**Tabela fonte:** `audit_logs` + `users_profile`

**Fórmula:**
```sql
SELECT COUNT(DISTINCT DATE(al.created_at)) AS aad_days
FROM audit_logs al
JOIN users_profile up ON up.id = al.user_id
WHERE
  al.event_type = 'login_success'
  AND up.role = 'admin'
  AND al.created_at > now() - interval '30 days';
```

**Nota:** Conta o número de dias distintos com pelo menos um login de admin nos últimos 30 dias. A meta de ">=50% dos admins ativos diariamente" requer saber o total de admins ativos — implementar comparação em Phase 2. No MVP exibir número de dias com atividade admin (máximo possível: 30).

---

## Mapa de Cobertura de Eventos

| Evento | Instrumentado desde | KPIs afetados |
|--------|--------------------|-----------| 
| `login_success` | Story 1.3 | KPI-7 (AAD) |
| `order_submitted` | Story 4.4 | KPI-3 (PEE), KPI-6 (CtO denominador) |
| `extraction_started` | Story 2.3 | Não diretamente |
| `extraction_completed` | Story 2.3 | KPI-1 via `extraction_jobs` |
| `brand_published` | Story 3.1 | Não diretamente |
| `cart_item_added` | **Story 5.8** | KPI-6 (CtO numerador) |

---

## Dados de Tabelas (não audit_logs)

| Tabela | KPIs afetados | Campo chave |
|--------|--------------|-------------|
| `extraction_jobs` | KPI-1 (TMCV), KPI-4 (CME) | `status`, `created_at`, `completed_at`, `actual_cost_brl` |
| `orders` | KPI-3 (PEE), KPI-5 (ABS) | `brand_id`, `created_at` |
| `brands` | KPI-5 (ABS) | `published` |
| `products` | KPI-2 (TPE) | `status` |
