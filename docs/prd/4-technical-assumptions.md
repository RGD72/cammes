# 4. Technical Assumptions

> **Nota:** As decisões abaixo derivam diretamente do Project Brief (que já consolidou a stack escolhida pelo PO) e tornam-se restrições para o @architect na Phase 3.

## 4.1 Repository Structure

**Repository Structure: Monorepo (single Next.js repository)** — começamos com um único repositório Next.js (não monorepo multi-package no MVP), por simplicidade. A estrutura interna será: `app/` (App Router), `components/`, `lib/`, `supabase/migrations/`, `supabase/functions/`, `tests/`. Quando Phase 2 introduzir pacotes compartilhados (mobile, API SDK), migrar para Turborepo. ADR-001 (a ser escrito por @architect) documenta a decisão e o ponto de gatilho da migração.

## 4.2 Service Architecture

**CRITICAL DECISION — Service Architecture:** **Serverless híbrido sobre Next.js + Supabase.**

- Frontend e Server Actions/API Routes hospedados na **Vercel** (Next.js 14+, App Router, React Server Components onde possível).
- Persistência, autenticação e storage no **Supabase** (PostgreSQL com RLS, Supabase Auth, Supabase Storage com buckets privados por marca).
- Pipeline de extração assíncrona em **Supabase Edge Functions** (Deno), disparado por trigger de upload, com job queue inicial baseada em tabela `extraction_jobs` + `pg_cron`. Promoção para Upstash QStash apenas se filas excederem 100 jobs/dia.
- **OpenRouter** como gateway LLM do pipeline de IA, com chave fornecida pelo admin (BYOK). Modelo padrão inicial: `google/gemini-flash-2.5`. Outros modelos com suporte a visão disponíveis no OpenRouter podem ser selecionados pelo admin.
- Geração de PDF do pedido via `@react-pdf/renderer` em API Route do Next.js (server-side, sem dependência de Chromium headless).

## 4.3 Testing Requirements

**CRITICAL DECISION — Testing Requirements:** **Unit + Integration testing (sem E2E completo no MVP, com smoke tests manuais documentados).**

- **Unit tests obrigatórios** para módulos de domínio: parser de extração, validação de carrinho, helpers de RLS, lógica de cálculo de totais, gerador de PDF. Alvo: >=70% cobertura nos módulos críticos.
- **Integration tests obrigatórios** para: políticas RLS (matriz de testes positivos e negativos cross-tenant), pipeline de extração com mock de LLM via OpenRouter, geração de PDF do pedido com renderização real.
- **E2E (Playwright) opcional** no MVP — recomendado para fluxos críticos pós-MVP (login → seleção → envio de pedido), mas não bloqueia release.
- **Manual smoke testing** documentado em `docs/qa/manual-smoke-checklist.md` para release: criação de marca, upload de PDF, extração com catálogo real, revisão, publicação, fluxo de cliente até envio de pedido.
- **Testes negativos de RLS** são obrigatórios antes do go-live — auditoria por @qa com matriz explícita.

## 4.4 Additional Technical Assumptions and Requests

- **Linguagem:** TypeScript estrito em toda a base (frontend, server actions, edge functions); JavaScript puro proibido exceto em arquivos de configuração.
- **UI Components:** Tailwind CSS + shadcn/ui (Radix Primitives) como base. Componentes derivados ficam em `components/ui/`.
- **State management cliente:** Zustand para estado global mínimo (carrinho UI, sessão, toasts); React Query/TanStack Query para fetch e cache de dados server.
- **PDF → imagem (server-side, para envio ao LLM via OpenRouter):** `pdf-to-png-converter` (Node) ou `pdfjs-dist` (Deno) na Edge Function — decisão final do @architect baseada em performance no ambiente da Supabase Edge.
- **Geração do PDF de pedido:** `@react-pdf/renderer` em API Route do Next.js. Layout simples tabular, com identidade visual neutra no MVP.
- **Upload direto para Supabase Storage via TUS:** uploads de catálogo PDF (até 500MB) DEVEM usar o endpoint TUS resumível do Supabase Storage (`/storage/v1/upload/resumable`) **diretamente do cliente**, bypassando o limite de 4.5MB de Vercel Functions. TUS garante retomada automática em caso de queda de conexão sem reiniciar o upload do zero.
- **Internacionalização:** somente **pt-BR no MVP**. Estrutura de copy pronta para i18n via `next-intl` ou similar fica como recomendação ao @architect (não obrigatória no MVP).
- **Migrações de banco:** todas via `supabase migrations` em `supabase/migrations/`, versionadas em Git. Proibido alterar schema diretamente pelo Supabase Studio em produção.
- **Secrets management:** Vercel Environment Variables para chaves de plataforma (Supabase URL/keys, secrets de criptografia); chave OpenRouter do admin é dado do usuário, persistida criptografada no Supabase.
- **Logging:** logs estruturados via `pino` no Next.js; logs do Supabase via `pgaudit` + `analytics`. Sem provider de APM no MVP (Sentry recomendado para Phase 2).
- **Feature flags:** simples via tabela `feature_flags` no Supabase no MVP; sem provider externo (LaunchDarkly fica para Phase 2).
- **Abstração de LLM:** **mesmo no MVP**, a camada de extração DEVE ser implementada atrás de uma interface (`LLMExtractionProvider`) que roteie requisições via OpenRouter. A troca de modelo (Gemini Flash 2.5 → outro modelo com visão) DEVE ocorrer via configuração, sem refactor estrutural — mitiga R4 do Project Brief. O OpenRouter elimina a necessidade de integrar providers individuais diretamente.
- **PWA:** configuração básica de manifest e service worker para installable PWA é opcional no MVP; recomendado para garantir UX mobile premium no cliente.
- **CI/CD:** GitHub Actions com pipelines mínimos no MVP — `lint`, `typecheck`, `test`, `build`; deploy via integração nativa Vercel↔GitHub. @devops define ADR-CI.
- **POC obrigatório no Sprint 1 (pré-Epic 2):** rodar Gemini Flash 2.5 via OpenRouter em 5 catálogos reais e medir TPE, custo médio, tempo de extração — validar NFR21 e a assunção crítica do Project Brief antes de comprometer escopo.

---
