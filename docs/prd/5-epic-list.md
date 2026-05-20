# 5. Epic List

A decomposição em épicos segue ordenação por valor entregável e dependências técnicas. Cada épico entrega uma fatia vertical funcional, exceto Epic 1, que é o enabler de infraestrutura mas já entrega um canary funcional (login + dashboard vazio).

- **Epic 1 — Foundation, Auth & Multitenancy Skeleton:** Estabelecer projeto Next.js, Supabase, CI/CD, autenticação básica para admin e cliente, schema multitenant inicial com RLS, e um canary funcional (dashboard admin vazio + login do cliente).
- **Epic 2 — Catalog Upload & LLM Vision Extraction Pipeline (OpenRouter):** Implementar upload de PDF, pipeline assíncrono de extração via LLM Vision (OpenRouter + Gemini Flash 2.5), persistência de produtos por marca, estimativa de custo e gestão segura da chave OpenRouter.
- **Epic 3 — Admin Review & Brand Storefront Publishing:** Tela de revisão pós-extração para o admin, edição inline de produtos, agrupamento de LOOKs, alternância publicado/não publicado e a vitrine pública (autenticada) navegável pelo cliente.
- **Epic 4 — Cart, Order Submission & PDF Generation:** Modal ESCOLHER, carrinho tabular de 8 colunas server-side, envio de pedido, geração de PDF do pedido e notificação ao admin.
- **Epic 5 — Admin Operations, Telemetry & LGPD Compliance:** Painel de pedidos para admin, dashboard básico de métricas (catálogos, pedidos, custo OpenRouter), logs de auditoria, gestão de acessos cliente↔marca, e fluxos LGPD (consentimento, exclusão).

> Rationale para 5 épicos: a granularidade reflete os blocos verticais de valor distintos (auth/foundation → extração → publicação → pedido → operações). Não é viável compactar em 3-4 épicos sem comprometer a tese de "cada épico = release deployable". Cross-cutting concerns (logging, RLS, monitoramento) fluem dentro de cada épico, não no fim.

---
