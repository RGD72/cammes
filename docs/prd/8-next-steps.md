# 8. Next Steps

## 8.1 UX Expert Prompt

> **Para @ux (Uma — UX Design Expert):**
>
> Este PRD está pronto para a Phase 3 do workflow greenfield-fullstack. Sua missão é gerar o **Front-End Specification** (`docs/front-end-spec.md`) a partir das seções 3 (UI Design Goals) e 6 (Epics/Stories) deste PRD, com foco em:
>
> 1. **Especificar o sistema de design mínimo viável** (paleta neutra, tipografia, spacing, tokens shadcn/ui adotados) — sem inventar identidade visual de marca (cada marca trará o seu logo apenas).
> 2. **Wireframes/protótipos de baixa fidelidade** das 10 telas core listadas em 3.3, com atenção especial a: tela de revisão pós-extração (Epic 3), modal ESCOLHER (Epic 4), carrinho tabular de 8 colunas (FR23, responsive layout mobile incluído).
> 3. **Especificação WCAG 2.1 AA** com matriz de contraste, foco visível, navegação por teclado e textos alternativos para imagens extraídas.
> 4. **Microcopy em pt-BR** para os fluxos críticos: login, upload de PDF, confirmação de extração com custo, ESCOLHER → ESCOLHIDO, ENVIAR PEDIDO.
> 5. **Definir o comportamento responsivo mobile-first** (breakpoints 360px, 768px, 1024px, 1440px) — fluxo do cliente prioritário em mobile.
>
> Não invente requisitos. Toda decisão de UX rastreia a um FR/NFR deste PRD ou é registrada como suposição UX para validação com PM e stakeholder.

## 8.2 Architect Prompt

> **Para @architect (Aria — Solution Architect):**
>
> Este PRD está pronto para a Phase 3 do workflow greenfield-fullstack. Sua missão é gerar o **Technical Architecture Document** (`docs/architecture.md`) a partir das seções 2 (Requirements) e 4 (Technical Assumptions) deste PRD, com foco em:
>
> 1. **ADR-001 (Repo Structure):** confirmar single-repo Next.js como ponto de partida e documentar gatilho de migração para Turborepo.
> 2. **ADR-002 (Multitenancy & RLS Strategy):** desenhar políticas RLS por tabela (brands, products, orders, carts, audit_logs), matriz de testes positivos/negativos, e estratégia de `user_brand_access`.
> 3. **ADR-003 (Extraction Pipeline Architecture):** arquitetura completa do pipeline LLM Vision via OpenRouter (PDF → PNG → OpenRouter API → JSON → Zod → Postgres), incluindo escolha entre Supabase Edge Functions vs. Vercel Functions vs. Worker externo, estratégia de retry/idempotência e abstração `LLMExtractionProvider`.
> 4. **ADR-004 (Cost Estimation Model):** modelo matemático para estimar custo pré-extração via OpenRouter (`/models` endpoint para tarifas) e medir custo real (FR13, FR14, NFR21).
> 5. **Data Model completo** (DDL Postgres com índices, FKs, RLS, constraints) — alinhar com @data-engineer Dara em sub-task dedicada.
> 6. **Security architecture:** criptografia da OpenRouter key (Vault vs pgcrypto), CSP, rate limiting, signed URLs, auditoria de RLS.
> 7. **Deployment topology:** Vercel + Supabase + secrets, ambientes (dev/staging/prod), CI/CD GitHub Actions.
> 8. **Performance budget:** alinhamento com NFR1-NFR6, estratégias de cache, image optimization, lazy loading.
> 9. **POC Plan obrigatório (Sprint 1):** 5 catálogos reais variados, métricas a coletar (TPE por campo, custo médio, tempo p95), critérios de GO/NO-GO antes de comprometer Epic 2.
>
> Constrição forte: Article IV (No Invention) — toda decisão arquitetural traceia a um FR/NFR deste PRD. Caso identifique requisitos faltantes durante a arquitetura, **escalonar ao PM (@pm)** antes de inventar.

---

*PRD gerado por Morgan (@pm) em modo YOLO autônomo. Decisões `[AUTO-DECISION]` herdadas do Project Brief foram preservadas; novas decisões deste PRD seguem o mesmo padrão e devem ser revisadas por @po como parte da Phase 2 de validação.*

---

## Apêndice A — Rastreabilidade FR/NFR → Brief

Tabela de rastreio rápido para Article IV (No Invention) compliance:

| Bloco do PRD | Origem no Brief |
|---|---|
| FR1-FR4 (Auth) | Core Features → "Autenticação obrigatória"; Risks → R3, R5 |
| FR5-FR9 (Marcas/Catálogos) | Core Features → "Upload de catálogo PDF", "Estados PUBLICADO" |
| FR10-FR16 (Extração) | Core Features → "Extração via LLM Vision (OpenRouter)"; Risks → R1, R2, R4; Proposed Solution → Vision LLM via gateway |
| FR17-FR20 (Vitrine) | Core Features → "Vitrine por marca"; Target Users → Lojista-Comprador necessidades |
| FR21-FR27 (Carrinho/Seleção) | Core Features → "Carrinho tabular (8 colunas obrigatórias)", "Seleção de produto via popup ESCOLHER" |
| FR28-FR32 (Envio/PDF) | Core Features → "Envio do pedido + geração de PDF"; AUTO-DECISION → @react-pdf/renderer |
| FR33-FR35 (Painel Admin) | Core Features → "Painel de pedidos por marca" |
| FR36-FR37 (RLS) | Core Features → "Multitenancy por marca via RLS"; Risks → R3 |
| FR38-FR39 (Telemetria) | Goals & Success Metrics → KPI-1 a KPI-7; AUTO-DECISION → eventos server-side |
| NFR1-NFR6 (Performance) | Technical Considerations → Performance Requirements |
| NFR7-NFR13 (Segurança) | Technical Considerations → Security/Compliance; Risks → R3 |
| NFR14-NFR16 (LGPD) | Technical Considerations → LGPD; Risks → R7 |
| NFR17-NFR20 (Confiabilidade) | Risks → R1, R10; Open Questions |
| NFR21-NFR22 (Custo) | Goals → B4; Risks → R2; KPI-4 |
| NFR23-NFR24 (a11y) | Areas Needing Further Research → Acessibilidade |
| NFR25-NFR26 (Compatibilidade) | Technical Considerations → Browser/OS Support |
| NFR27-NFR30 (Observabilidade/Manutenibilidade) | Technical Considerations → infra-implícito |
| NFR31 (Article IV) | AIOX Constitution |
