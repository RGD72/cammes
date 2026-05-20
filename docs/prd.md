# CAMMES — Catálogo Multimarcas com Extração Estruturada — Product Requirements Document (PRD)

> **Documento:** Product Requirements Document
> **Projeto:** CAMMES — Catálogo Multimarcas com Extração Estruturada
> **Versão:** 1.0
> **Data:** 2026-05-19
> **Autor:** Morgan (@pm)
> **Workflow:** greenfield-fullstack — Phase 2 (PRD Creation)
> **Insumo principal:** `docs/brief.md` (Project Brief 1.0 — Atlas/@analyst)
> **Próximo handoff:** @ux (frontend spec) e @architect (technical architecture)
> **Modo de execução:** YOLO autônomo

---

## 1. Goals and Background Context

### 1.1 Goals

- Permitir que um administrador-distribuidor transforme um PDF de catálogo de marca em uma vitrine digital publicável em menos de 60 minutos, eliminando o cadastro manual SKU a SKU.
- Padronizar a captura de pedidos B2B em formato tabular obrigatório de 8 colunas, reduzindo erros de referência para abaixo de 5%.
- Entregar isolamento estrito entre marcas (multitenancy via Supabase RLS) com zero vazamento de catálogo a usuários não autorizados.
- Validar a viabilidade técnica e econômica da extração via LLM Vision (OpenRouter + Gemini Flash 2.5 como modelo padrão) com TPE >= 85% e custo médio <R$ 50 por catálogo de até 100 SKUs.
- Operar um modelo bring-your-own-key (BYOK) para a API OpenRouter, deslocando custo de inferência ao administrador.
- Atingir, em 90 dias após lançamento do MVP, 1 distribuidor real operando >=3 marcas publicadas com >=50 pedidos estruturados enviados pela plataforma.
- Construir base de dados estruturada por marca (produtos + pedidos) que viabilize analytics e expansão multitenant em Phase 2.
- Preservar o ritual visual do lookbook permitindo download do PDF original e navegação visual rica nas vitrines.

### 1.2 Background Context

O varejo B2B de moda brasileiro opera hoje em um fluxo analógico-digital híbrido — marcas distribuem catálogos PDF por WhatsApp/Drive, lojistas devolvem pedidos em texto livre ou áudio, e distribuidores consolidam manualmente em planilhas. O resultado é alto retrabalho (10-25% dos pedidos exigem correção), pedidos perdidos (5-15% do volume) e ausência total de histórico estruturado por marca. Soluções existentes (e-commerces B2C, ERPs de representação, WhatsApp Catalog) falham porque exigem cadastro manual prévio ou não atendem o caso B2B sem checkout financeiro.

CAMMES inverte essa equação: o PDF do catálogo é a fonte da verdade, um modelo LLM Vision roteado via OpenRouter (padrão: Gemini Flash 2.5) extrai automaticamente referências, descrições, tamanhos, cores e preços, e o admin valida em uma tela de revisão antes de publicar. O lojista navega em uma vitrine digital sem perder o ritual visual do lookbook, monta um pedido tabular padronizado e recebe um PDF do pedido — sem pagamento online, pois a transação financeira segue offline com a marca. A janela de oportunidade é agora: LLMs multimodais ficaram custo-efetivos em 2025-2026, e a pressão por digitalização B2B pós-pandemia torna o status quo insustentável.

### 1.3 Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-05-19 | 1.0 | Versão inicial do PRD a partir do Project Brief 1.0 | Morgan (@pm) |
| 2026-05-19 | 1.1 | Substituição de OpenAI direto por OpenRouter como gateway LLM; modelo padrão inicial: `google/gemini-flash-2.5`; atualização de FR7, FR10, NFR8, NFR12, NFR20-22, NFR28, Technical Assumptions §4.2/§4.4, Epic 2, Stories 2.1-2.6, Dashboard 5.4, Audit eventos | Morgan (@pm) |
| 2026-05-19 | 1.2 | FR6 atualizado: limite de upload 50MB → 500MB; protocolo TUS resumível via Supabase Storage (`resumable: true`); atualização de §4.4 Technical Assumptions, Story 2.2 (descrição, AC3, AC4) | Morgan (@pm) |

---

## 2. Requirements

### 2.1 Functional Requirements

**Autenticação e Acesso (Auth)**

- **FR1:** O sistema DEVE exigir autenticação (login/senha) para 100% das rotas que exponham conteúdo de catálogo, produto, pedido ou painel administrativo — nenhuma rota pública pode revelar dados de marca, produto, preço, pedido ou cliente.
- **FR2:** O sistema DEVE suportar dois papéis de usuário distintos — `admin` (administrador-distribuidor) e `customer` (lojista-comprador) — com permissões e telas separadas, validadas em cada requisição.
- **FR3:** O sistema DEVE permitir recuperação de senha por e-mail e suportar magic links como mecanismo de primeiro acesso para o lojista.
- **FR4:** O sistema DEVE registrar todos os eventos de login, logout, falhas de autenticação e acessos a recursos não autorizados em um log de auditoria persistido.

**Gestão de Marcas e Catálogos (Admin)**

- **FR5:** O administrador DEVE poder criar uma nova marca/loja informando, no mínimo, nome, slug único e descrição opcional, com upload da identidade visual mínima (logo) opcional no MVP.
- **FR6:** O administrador DEVE poder fazer upload de um arquivo PDF de catálogo (até 500MB) associado a uma marca específica, usando o protocolo **TUS resumível** nativo do Supabase Storage — com barra de progresso em tempo real, retomada automática em caso de queda de conexão e validação de tipo, tamanho e bucket privado por marca.
- **FR7:** O administrador DEVE poder configurar e atualizar sua chave de API OpenRouter em uma tela dedicada, com criptografia em repouso (Supabase Vault ou pgcrypto), seleção do modelo padrão (default: `google/gemini-flash-2.5`) e botão de teste de conexão antes de salvar.
- **FR8:** O administrador DEVE poder alternar o estado de cada vitrine entre `published` (visível para clientes) e `unpublished` (oculta), com efeito imediato.
- **FR9:** O sistema DEVE expor a download do PDF original do catálogo dentro da vitrine via signed URL com TTL configurável (default 5 minutos).

**Pipeline de Extração via LLM Vision (OpenRouter)**

- **FR10:** Ao receber um upload de PDF, o sistema DEVE disparar de forma assíncrona um job de extração que converte cada página em imagem PNG e envia ao modelo configurado via OpenRouter (padrão: `google/gemini-flash-2.5`) com um prompt estruturado.
- **FR11:** O job de extração DEVE persistir, para cada produto identificado, ao menos os campos: `reference` (referência/código), `description` (descrição), `sizes` (lista de tamanhos disponíveis), `colors` (lista de cores), `price` (preço unitário em BRL), `image_crop_url` (recorte da imagem do produto no PDF), `look_group` (identificador opcional de LOOK), `source_page` (página de origem) e `extraction_confidence` (score 0-1 por campo).
- **FR12:** O sistema DEVE expor uma tela de revisão pós-extração listando todos os produtos extraídos, com a foto correspondente, permitindo ao admin: editar qualquer campo, marcar produto como "ignorar/excluir", reordenar a apresentação, agrupar produtos sob um mesmo LOOK e re-disparar a extração de uma página específica.
- **FR13:** O sistema DEVE estimar e exibir o custo estimado da extração (em USD e BRL) antes de iniciar o processamento, baseado no número de páginas e na tarifa vigente do modelo configurado, e exigir confirmação explícita do admin se o custo estimado exceder R$ 50.
- **FR14:** O sistema DEVE registrar, ao final de cada extração, o custo real (tokens consumidos × tarifa) e persistir em `extraction_jobs` para auditoria e relatórios.
- **FR15:** O pipeline de extração DEVE suportar reprocessamento (re-extração) de um catálogo já processado, preservando histórico básico do job anterior (timestamp, custo, contagem de produtos) sem necessariamente preservar produtos descartados.
- **FR16:** O sistema DEVE notificar o admin (em painel e opcionalmente por e-mail) quando um job de extração for concluído com sucesso, falhar ou exceder o timeout configurável (default 15 minutos).

**Vitrine por Marca (Customer)**

- **FR17:** O cliente autenticado DEVE poder navegar em uma página de vitrine por marca (`/brands/{slug}`) que exiba apenas marcas com `published=true` às quais o cliente tem acesso.
- **FR18:** A vitrine DEVE renderizar produtos em formato de grid responsivo de cards, contendo imagem, referência, descrição curta e preço, com lazy-loading de imagens e paginação ou scroll infinito.
- **FR19:** O cliente DEVE poder filtrar e buscar produtos dentro de uma marca por texto livre (referência ou descrição), por tamanho disponível e por LOOK.
- **FR20:** O cliente DEVE poder baixar o PDF original do catálogo da marca via botão dedicado na vitrine, gerando uma signed URL temporária.

**Seleção e Carrinho de Pedido**

- **FR21:** Cada card de produto DEVE expor um botão "ESCOLHER" que abre um modal listando tamanhos e cores disponíveis (ou apenas quantidade, se não houver variantes) e um botão "ESCOLHIDO" que adiciona o item ao carrinho da marca atual.
- **FR22:** O carrinho DEVE ser persistido server-side (não apenas em localStorage) por combinação `user_id + brand_id`, sobrevivendo a logout e troca de dispositivo.
- **FR23:** O carrinho DEVE ser renderizado em formato de tabela contendo, na ordem e obrigatoriamente, as colunas: **REFERÊNCIA, DESCRIÇÃO DO PRODUTO, COR, TAMANHO, QUANTIDADE, NOME DO CLIENTE, VALOR DA PEÇA, VALOR TOTAL**.
- **FR24:** Produtos pertencentes a um mesmo LOOK DEVEM aparecer como linhas separadas na tabela (não agrupadas) — cada combinação produto/cor/tamanho/quantidade é uma linha.
- **FR25:** O cliente DEVE poder editar a quantidade de qualquer linha do carrinho, remover linhas individuais e limpar o carrinho inteiro, com recalculo automático do VALOR TOTAL.
- **FR26:** O campo NOME DO CLIENTE DEVE ser preenchido automaticamente com o nome do usuário logado, com possibilidade de edição manual pelo cliente para indicar nome do cliente final da loja se aplicável.
- **FR27:** O cliente DEVE manter carrinhos independentes por marca — não há cross-brand cart no MVP.

**Envio do Pedido e Geração de PDF**

- **FR28:** O carrinho DEVE expor um botão "ENVIAR PEDIDO" que cria um registro permanente em `orders` (associado ao `brand_id`), gera um PDF do pedido com layout tabular e oferece download imediato ao cliente.
- **FR29:** O PDF de pedido DEVE conter cabeçalho com nome da marca, nome do cliente, data/hora de envio, número do pedido, e a tabela completa de itens com as 8 colunas obrigatórias e linha de total geral.
- **FR30:** Após o envio do pedido, o carrinho DEVE ser limpo automaticamente e o cliente DEVE receber confirmação visual e link para download do PDF.
- **FR31:** O envio do pedido DEVE disparar uma notificação ao admin (no painel admin e opcionalmente por e-mail) com link para visualizar o pedido.
- **FR32:** Não DEVE existir, no MVP, qualquer integração com gateway de pagamento, cálculo de frete, validação de CNPJ ou geração de nota fiscal.

**Painel Administrativo de Pedidos**

- **FR33:** O admin DEVE ter acesso a um painel de pedidos consolidando todos os pedidos recebidos, com filtros por marca, cliente, faixa de datas e status básico (recebido/visualizado).
- **FR34:** O admin DEVE poder visualizar o detalhe de cada pedido, fazer download do PDF gerado e exportar a tabela do pedido em CSV.
- **FR35:** O admin DEVE poder marcar pedidos como `viewed` (sem fluxo de aceitação/rejeição automatizado no MVP — apenas controle visual).

**Multitenancy por Marca (RLS)**

- **FR36:** Toda tabela do banco que contenha `brand_id` (products, orders, extraction_jobs, carts, brand_assets) DEVE ter políticas Row-Level Security ativas garantindo que: (a) clientes só leiam dados de marcas publicadas que lhes foram concedidas; (b) admins só leiam/escrevam dados das marcas pertencentes ao seu tenant; (c) operações cross-brand sejam impossíveis via cliente.
- **FR37:** O sistema DEVE manter uma tabela `user_brand_access` (ou equivalente) mapeando quais clientes podem acessar quais marcas, com gestão pelo admin (convite, revogação).

**Telemetria e Auditoria**

- **FR38:** O sistema DEVE registrar, com timestamp server-side e identificador de usuário, eventos de produto chave: upload de catálogo, conclusão de extração, publicação/despublicação de vitrine, adição de item ao carrinho, envio de pedido, download de PDF do catálogo, falhas de autenticação.
- **FR39:** O admin DEVE poder consultar um dashboard básico (no MVP) com contagens: número de marcas publicadas, número de produtos extraídos por marca, número de pedidos por marca/mês, custo total via OpenRouter no mês.

### 2.2 Non-Functional Requirements

**Performance**

- **NFR1:** First Contentful Paint (FCP) das páginas de vitrine DEVE ser <2.0s em conexão 4G simulada (Lighthouse mobile, p75).
- **NFR2:** Time to Interactive (TTI) das páginas de vitrine DEVE ser <3.5s em conexão 4G simulada.
- **NFR3:** Uma página de vitrine com 100 produtos DEVE renderizar em <3s com lazy-loading de imagens (medido na rede simulada Slow 4G).
- **NFR4:** O pipeline de extração de um catálogo de até 50 páginas DEVE completar em <10 min p95 (do upload à disponibilidade na tela de revisão).
- **NFR5:** A geração do PDF do pedido DEVE completar em <5s p95.
- **NFR6:** As operações de adicionar/remover/editar item do carrinho DEVEM completar com latência server <500ms p95.

**Segurança**

- **NFR7:** Toda comunicação DEVE usar HTTPS com HSTS habilitado; o CSP DEVE ser restritivo, sem `unsafe-inline` em scripts.
- **NFR8:** A chave de API OpenRouter do admin DEVE ser armazenada criptografada em repouso (Supabase Vault ou pgcrypto com chave gerida via variável de ambiente protegida); a chave NUNCA DEVE ser retornada em texto-claro via API após salva (apenas mascarada).
- **NFR9:** Cookies de sessão DEVEM ter atributos `HttpOnly`, `Secure` e `SameSite=Lax` (ou `Strict` quando viável).
- **NFR10:** O sistema DEVE aplicar rate limiting nas rotas de autenticação (max 5 tentativas/minuto/IP), upload de catálogo (max 3 uploads/hora/admin) e disparo de extração.
- **NFR11:** Todas as URLs assinadas (Supabase Storage) DEVEM ter TTL <=10 minutos para PDFs originais e <=1 hora para imagens de produto.
- **NFR12:** O sistema DEVE bloquear o pipeline de extração se o admin não tiver chave OpenRouter válida configurada e nunca DEVE expor a chave em logs ou mensagens de erro.
- **NFR13:** RLS DEVE ser auditada por @qa antes do go-live com matriz explícita de testes negativos (tentativas de acesso cross-tenant que devem falhar).

**Privacidade e Compliance**

- **NFR14:** O sistema DEVE estar em conformidade com a LGPD: minimização de dados (apenas PII essencial — nome, e-mail, telefone opcional), consentimento explícito no cadastro, política de privacidade publicada, mecanismo de exclusão de conta sob requisição em até 15 dias.
- **NFR15:** O termo de uso DEVE definir os papéis de controlador (distribuidor) e operador (CAMMES) de dados pessoais, e a custódia dos catálogos (responsabilidade do distribuidor por direitos autorais da marca).
- **NFR16:** O sistema DEVE manter logs de acesso a catálogos não publicados por pelo menos 90 dias para investigação de incidentes.

**Disponibilidade e Confiabilidade**

- **NFR17:** O sistema DEVE alvejar disponibilidade mensal >=99.5% (excluindo manutenções programadas comunicadas com 48h de antecedência).
- **NFR18:** O pipeline de extração DEVE ser idempotente — re-disparar o mesmo job não deve duplicar produtos no banco e deve respeitar estado prévio.
- **NFR19:** O carrinho server-side DEVE sobreviver a falhas de sessão e estar disponível na próxima autenticação do mesmo usuário.
- **NFR20:** Falhas do LLM via OpenRouter (timeout, 5xx, rate limit) DEVEM ser tratadas com retry exponencial (max 3 tentativas) e, na exaustão, registrar o job como `failed` com mensagem clara ao admin — sem perda de dados intermediários.

**Custo (Economic Constraints)**

- **NFR21:** O custo médio de extração por catálogo de até 100 SKUs (média de páginas e produtos por página) DEVE permanecer <R$ 50 (≈ US$ 10 a câmbio R$ 5,00) com modelo Gemini Flash 2.5 via OpenRouter na tarifa vigente em 2026-05.
- **NFR22:** O sistema DEVE expor o custo real consumido na tela de gestão de chave OpenRouter, agregado por mês, para o admin acompanhar o consumo.

**Acessibilidade**

- **NFR23:** As páginas voltadas ao cliente (vitrine, carrinho, login) DEVEM atender ao nível **WCAG 2.1 AA** em contraste, tamanho de fonte mínimo (16px base), foco visível, navegação por teclado e textos alternativos em imagens de produto.
- **NFR24:** Componentes interativos DEVEM ter rótulos ARIA apropriados e o fluxo de pedido DEVE ser completamente navegável por teclado.

**Compatibilidade**

- **NFR25:** O sistema DEVE funcionar nas últimas duas versões major de Chrome, Edge, Firefox, Safari (desktop), iOS Safari 15+ e Android Chrome 100+. Sem suporte a Internet Explorer.
- **NFR26:** A experiência DEVE ser mobile-first responsiva — o fluxo de cliente DEVE ser totalmente operacional em viewports a partir de 360px.

**Observabilidade**

- **NFR27:** O sistema DEVE emitir logs estruturados (JSON) para todos os erros de servidor, com correlação por `request_id` e `user_id` (anonimizado).
- **NFR28:** O sistema DEVE manter métricas server-side de: latência p95/p99 por rota, taxa de erro por rota, número de jobs de extração por status, custo de inferência via OpenRouter por dia.

**Manutenibilidade**

- **NFR29:** O código DEVE seguir TypeScript estrito (`strict: true` em tsconfig) e linting com ESLint + Prettier; cobertura de testes mínima de 70% para módulos de domínio (extração, carrinho, RLS helpers).
- **NFR30:** Todas as decisões arquiteturais materiais DEVEM ser documentadas como ADRs em `docs/architecture/project-decisions/`.

**Princípio Constitucional (Article IV — No Invention)**

- **NFR31:** Toda feature implementada DEVE rastrear a um FR-* ou NFR-* deste PRD ou a uma necessidade documentada via ADR/research. Funcionalidades não rastreáveis são proibidas no escopo do MVP.

---

## 3. User Interface Design Goals

### 3.1 Overall UX Vision

A experiência CAMMES equilibra **densidade informacional B2B** (necessária para o admin operar dezenas de marcas e produtos) com **leveza visual de lookbook** (essencial para o lojista que está acostumado a folhear catálogos visuais no WhatsApp). A linha condutora é "transformar o ritual do PDF em uma navegação digital sem perder a alma visual do catálogo".

- **Para o admin:** funcional, denso, com atalhos de teclado, tabelas filtráveis e ações em massa — visual neutro tipo dashboard moderno (Linear/Vercel/Supabase studio).
- **Para o cliente:** visual generoso, cards com imagens grandes, transições suaves, foco em mobile — referência estética é Instagram Shop + lookbooks editoriais.
- **Tom de voz:** profissional, conciso, em pt-BR coloquial (não rebuscado). Microcopy clara e direta, sem jargão técnico.

### 3.2 Key Interaction Paradigms

- **Drag-and-drop** para upload de PDF no admin, com feedback de progresso e estado de processamento assíncrono.
- **Revisão por edição inline** na tela pós-extração — o admin clica em qualquer campo e edita diretamente, com salvamento otimista e diff visual entre extração e edição.
- **Modal de seleção (ESCOLHER → ESCOLHIDO)** como padrão central do cliente — popup compacto com tamanhos/cores em chips/pills e quantidade em stepper.
- **Carrinho como tabela editável** — não cards, não lista; tabela densa com edição inline de quantidade, ordenação por coluna e total dinâmico em rodapé fixo.
- **Estados sempre visíveis** — "publicado/não publicado", "extração em progresso", "pedido enviado" sempre com badges/chips coloridos e tooltips explicativos.
- **Mobile-first no fluxo do cliente** — touch targets >=44px, gestos de swipe em galerias de imagens, scroll vertical priorizado.

### 3.3 Core Screens and Views

**Admin (Distribuidor):**

- Login Admin
- Dashboard Inicial (visão geral: marcas, jobs em progresso, últimos pedidos)
- Lista de Marcas (com filtros e estado publicado/não)
- Detalhe da Marca / Upload de Catálogo
- Tela de Progresso da Extração (com estimativa de custo, status em tempo real)
- Tela de Revisão Pós-Extração (grid editável de produtos)
- Lista de Pedidos (filtros, paginação, exportação)
- Detalhe do Pedido (com download de PDF e CSV)
- Configurações da Conta (incluindo gestão da API key OpenRouter e seleção de modelo)
- Gestão de Clientes/Acessos (convidar lojistas, atribuir marcas)

**Cliente (Lojista):**

- Login Cliente / Magic Link
- Lista de Marcas Disponíveis
- Vitrine da Marca (grid de produtos + busca + filtro + download PDF original)
- Modal de Seleção (ESCOLHER)
- Carrinho Tabular (8 colunas obrigatórias)
- Confirmação de Pedido Enviado + Download do PDF
- Histórico de Pedidos (visualização básica no MVP)

### 3.4 Accessibility

**Accessibility: WCAG AA** — alvo formal para o MVP, com particular atenção a contraste (>=4.5:1), foco visível em elementos interativos, navegação 100% por teclado nas telas do cliente, e textos alternativos em imagens de produto extraídas (gerados a partir da descrição).

### 3.5 Branding

No MVP, a vitrine adota um **tema neutro/elegante** (paleta clara, tipografia sans-serif moderna — Inter ou Geist Sans, cantos arredondados sutis 8-12px, sombras suaves). Cada marca pode opcionalmente fazer upload do logo, exibido no header da sua vitrine. Editor visual avançado (cores customizadas por marca, banners, fontes da marca) fica para Phase 2.

O painel admin segue estética de dashboard moderno (cinzas neutros, acento azul/violeta, densidade média, monoespaçada para identificadores técnicos como referências e IDs).

### 3.6 Target Device and Platforms

**Target Device and Platforms: Web Responsive** — web responsiva única que atende desktop (admin majoritariamente) e mobile (cliente majoritariamente). Não há app nativo no MVP; PWA installable é opcional/post-MVP.

---

## 4. Technical Assumptions

> **Nota:** As decisões abaixo derivam diretamente do Project Brief (que já consolidou a stack escolhida pelo PO) e tornam-se restrições para o @architect na Phase 3.

### 4.1 Repository Structure

**Repository Structure: Monorepo (single Next.js repository)** — começamos com um único repositório Next.js (não monorepo multi-package no MVP), por simplicidade. A estrutura interna será: `app/` (App Router), `components/`, `lib/`, `supabase/migrations/`, `supabase/functions/`, `tests/`. Quando Phase 2 introduzir pacotes compartilhados (mobile, API SDK), migrar para Turborepo. ADR-001 (a ser escrito por @architect) documenta a decisão e o ponto de gatilho da migração.

### 4.2 Service Architecture

**CRITICAL DECISION — Service Architecture:** **Serverless híbrido sobre Next.js + Supabase.**

- Frontend e Server Actions/API Routes hospedados na **Vercel** (Next.js 14+, App Router, React Server Components onde possível).
- Persistência, autenticação e storage no **Supabase** (PostgreSQL com RLS, Supabase Auth, Supabase Storage com buckets privados por marca).
- Pipeline de extração assíncrona em **Supabase Edge Functions** (Deno), disparado por trigger de upload, com job queue inicial baseada em tabela `extraction_jobs` + `pg_cron`. Promoção para Upstash QStash apenas se filas excederem 100 jobs/dia.
- **OpenRouter** como gateway LLM do pipeline de IA, com chave fornecida pelo admin (BYOK). Modelo padrão inicial: `google/gemini-flash-2.5`. Outros modelos com suporte a visão disponíveis no OpenRouter podem ser selecionados pelo admin.
- Geração de PDF do pedido via `@react-pdf/renderer` em API Route do Next.js (server-side, sem dependência de Chromium headless).

### 4.3 Testing Requirements

**CRITICAL DECISION — Testing Requirements:** **Unit + Integration testing (sem E2E completo no MVP, com smoke tests manuais documentados).**

- **Unit tests obrigatórios** para módulos de domínio: parser de extração, validação de carrinho, helpers de RLS, lógica de cálculo de totais, gerador de PDF. Alvo: >=70% cobertura nos módulos críticos.
- **Integration tests obrigatórios** para: políticas RLS (matriz de testes positivos e negativos cross-tenant), pipeline de extração com mock de LLM via OpenRouter, geração de PDF do pedido com renderização real.
- **E2E (Playwright) opcional** no MVP — recomendado para fluxos críticos pós-MVP (login → seleção → envio de pedido), mas não bloqueia release.
- **Manual smoke testing** documentado em `docs/qa/manual-smoke-checklist.md` para release: criação de marca, upload de PDF, extração com catálogo real, revisão, publicação, fluxo de cliente até envio de pedido.
- **Testes negativos de RLS** são obrigatórios antes do go-live — auditoria por @qa com matriz explícita.

### 4.4 Additional Technical Assumptions and Requests

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

## 5. Epic List

A decomposição em épicos segue ordenação por valor entregável e dependências técnicas. Cada épico entrega uma fatia vertical funcional, exceto Epic 1, que é o enabler de infraestrutura mas já entrega um canary funcional (login + dashboard vazio).

- **Epic 1 — Foundation, Auth & Multitenancy Skeleton:** Estabelecer projeto Next.js, Supabase, CI/CD, autenticação básica para admin e cliente, schema multitenant inicial com RLS, e um canary funcional (dashboard admin vazio + login do cliente).
- **Epic 2 — Catalog Upload & LLM Vision Extraction Pipeline (OpenRouter):** Implementar upload de PDF, pipeline assíncrono de extração via LLM Vision (OpenRouter + Gemini Flash 2.5), persistência de produtos por marca, estimativa de custo e gestão segura da chave OpenRouter.
- **Epic 3 — Admin Review & Brand Storefront Publishing:** Tela de revisão pós-extração para o admin, edição inline de produtos, agrupamento de LOOKs, alternância publicado/não publicado e a vitrine pública (autenticada) navegável pelo cliente.
- **Epic 4 — Cart, Order Submission & PDF Generation:** Modal ESCOLHER, carrinho tabular de 8 colunas server-side, envio de pedido, geração de PDF do pedido e notificação ao admin.
- **Epic 5 — Admin Operations, Telemetry & LGPD Compliance:** Painel de pedidos para admin, dashboard básico de métricas (catálogos, pedidos, custo OpenRouter), logs de auditoria, gestão de acessos cliente↔marca, e fluxos LGPD (consentimento, exclusão).

> Rationale para 5 épicos: a granularidade reflete os blocos verticais de valor distintos (auth/foundation → extração → publicação → pedido → operações). Não é viável compactar em 3-4 épicos sem comprometer a tese de "cada épico = release deployable". Cross-cutting concerns (logging, RLS, monitoramento) fluem dentro de cada épico, não no fim.

---

## 6. Epic Details

### Epic 1 — Foundation, Auth & Multitenancy Skeleton

**Goal:** Estabelecer toda a infraestrutura técnica do projeto (Next.js + Supabase + Vercel + CI/CD), autenticar admin e cliente em fluxos separados, e criar o esqueleto multitenant com RLS verificada por testes — entregando, ao final, um canary funcional que prova que login, sessão, redirecionamento por papel e isolamento de marca funcionam end-to-end.

#### Story 1.1 — Bootstrap do Projeto Next.js + Supabase + Vercel

As a **dev fullstack do CAMMES**,
I want **um projeto Next.js 14+ inicializado com Supabase, Tailwind, shadcn/ui, CI básico e deploy automático no Vercel**,
so that **toda a equipe tenha uma base versionada e deployável a partir da qual evoluir todas as features sem retrabalho de setup**.

**Acceptance Criteria**

1. Repositório criado com Next.js 14+ (App Router), TypeScript estrito (`strict: true`), Tailwind CSS e shadcn/ui inicializados.
2. Projeto Supabase criado, com URL e chaves configuradas em `.env.local` e em Environment Variables da Vercel.
3. Pipeline GitHub Actions executa `lint`, `typecheck` e `test` em PRs; build é validado em cada push.
4. Deploy automático no Vercel a partir de `main` está funcional, com URL pública (gated por autenticação ainda não existe — só uma página `/` placeholder).
5. README contém instruções de setup local (env vars, supabase start, npm install, npm run dev).
6. Convenções de commit (`feat:`, `fix:`, `chore:` etc.) e branch (`feature/*`, `fix/*`) documentadas em `CONTRIBUTING.md`.

#### Story 1.2 — Schema Inicial e Migrações Supabase

As a **dev fullstack**,
I want **um schema PostgreSQL inicial com tabelas `users_profile`, `brands`, `user_brand_access` e suas relações, todas migrationadas via `supabase migrations`**,
so that **futuras stories tenham um esqueleto multitenant para construir features de marca, produto e pedido**.

**Acceptance Criteria**

1. Migrações em `supabase/migrations/` criam tabelas: `users_profile` (id, role enum `admin|customer`, full_name, email, created_at), `brands` (id, slug unique, name, description, logo_url, published bool default false, owner_admin_id, created_at), `user_brand_access` (user_id, brand_id, granted_at, granted_by).
2. Cada tabela tem RLS habilitada (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`) e ao menos uma política inicial documentada.
3. Migração rodando localmente via `supabase db reset` aplica todas as migrações sem erro.
4. Documentação `docs/architecture/data-model-skeleton.md` lista as tabelas, colunas e relações.

#### Story 1.3 — Autenticação Admin e Cliente (Login/Logout)

As a **usuário (admin ou cliente)**,
I want **fazer login com e-mail/senha, ser redirecionado conforme meu papel e poder sair com segurança**,
so that **eu acesse apenas a área que me corresponde e minha sessão seja protegida**.

**Acceptance Criteria**

1. Página `/login` exibe formulário com e-mail e senha, validações inline e mensagens de erro claras.
2. Após login bem-sucedido, o sistema lê o `role` em `users_profile` e redireciona: `admin → /admin`, `customer → /brands`.
3. Sessões usam cookies `HttpOnly`, `Secure`, `SameSite=Lax`.
4. Botão de logout em qualquer área autenticada encerra a sessão e redireciona para `/login`.
5. Tentativa de acesso a `/admin` por usuário `customer` (ou vice-versa) retorna 403 ou redireciona para a área correta.
6. Falhas de login >5 por minuto/IP retornam 429 (rate limit, NFR10).

#### Story 1.4 — Magic Link e Recuperação de Senha

As a **lojista-cliente**,
I want **acessar a plataforma pela primeira vez por um magic link recebido por e-mail e recuperar minha senha quando esquecer**,
so that **o onboarding seja livre de atrito e eu não fique bloqueado da plataforma**.

**Acceptance Criteria**

1. Admin pode (via CLI/manual no Supabase Studio no MVP — UI completa fica em Epic 5) enviar magic link para um cliente cadastrado.
2. Link de magic link autentica o usuário e o redireciona para `/brands`.
3. Página `/recover-password` permite ao usuário solicitar reset por e-mail.
4. Link de reset abre tela `/reset-password` que requer nova senha (>=8 caracteres) e confirma.
5. Após reset, usuário é redirecionado para login.

#### Story 1.5 — Canary: Dashboards Vazios Funcionais por Papel

As a **stakeholder do projeto**,
I want **ver que um admin autenticado entra em um `/admin` (mesmo vazio) e um cliente autenticado entra em `/brands` (mesmo vazio), com layout e header diferenciados**,
so that **toda a base de autenticação, redirecionamento por papel e roteamento esteja comprovada antes de construir features**.

**Acceptance Criteria**

1. `/admin` renderiza header com nome do admin logado, navegação placeholder (Marcas, Pedidos, Configurações) e conteúdo principal com mensagem "Bem-vindo, [nome]".
2. `/brands` (área do cliente) renderiza header com nome do cliente logado e conteúdo principal com mensagem "Você ainda não tem marcas disponíveis".
3. Middleware de Next.js valida sessão em todas as rotas `/admin/*` e `/brands/*` (e `/cart`, `/orders/*`).
4. Layout admin (denso, sidebar) e layout cliente (mobile-first, header sticky) implementados como `layout.tsx` separados.
5. Teste E2E manual documentado em `docs/qa/smoke-epic-1.md`.

#### Story 1.6 — RLS Audit Foundation: Matriz de Testes Cross-Tenant

As a **engenheiro de qualidade**,
I want **uma matriz documentada de testes RLS positivos e negativos cobrindo as tabelas `brands` e `user_brand_access`**,
so that **qualquer regressão de isolamento entre marcas seja detectada imediatamente e o R3 do brief seja mitigado desde o Epic 1**.

**Acceptance Criteria**

1. `docs/qa/rls-test-matrix.md` documenta para cada tabela: políticas existentes, casos positivos (acesso permitido) e casos negativos (acesso negado esperado).
2. Suite de integration tests em `tests/integration/rls/` cobre, no mínimo: cliente_A não lê brand_B sem `user_brand_access`; admin_X não lê brands de admin_Y; tentativa de UPDATE cross-tenant falha.
3. Testes rodam em CI; falha bloqueia merge.
4. ADR-002 (RLS strategy) escrito por @architect e linkado.

---

### Epic 2 — Catalog Upload & LLM Vision Extraction Pipeline (OpenRouter)

**Goal:** Permitir que o admin faça upload seguro de um PDF de catálogo, dispare um pipeline assíncrono de extração via LLM Vision (OpenRouter + Gemini Flash 2.5), configure sua chave OpenRouter com segurança, veja a estimativa de custo antes de processar e tenha produtos persistidos em uma estrutura pronta para revisão.

#### Story 2.1 — Gestão Segura da Chave OpenRouter (BYOK)

As a **admin-distribuidor**,
I want **cadastrar minha chave de API OpenRouter em uma tela dedicada, selecionar o modelo padrão, testá-la, vê-la sempre mascarada e atualizá-la a qualquer momento**,
so that **a plataforma possa usar minha chave para extração sem nunca a expor e eu mantenha controle do meu consumo**.

**Acceptance Criteria**

1. Tela `/admin/settings/openrouter` permite colar chave OpenRouter (input password), selecionar modelo padrão (dropdown com modelos Vision do OpenRouter; pré-selecionado: `google/gemini-flash-2.5`) e botão "Testar conexão" que faz uma chamada mínima ao endpoint OpenRouter e retorna sucesso/falha.
2. Chave persistida em coluna criptografada (`pgcrypto` ou Supabase Vault) com chave-mãe em env var (`OPENROUTER_KEY_ENCRYPTION_SECRET`).
3. Endpoint de leitura retorna sempre a chave mascarada (`sk-or-...XXXX`), nunca em texto claro.
4. Pipeline de extração bloqueia com erro claro se a chave não estiver configurada.
5. Tela exibe o custo OpenRouter acumulado do mês corrente (consultado a partir de `extraction_jobs`).
6. Auditoria registra evento `openrouter_key_updated` no log.

#### Story 2.2 — Criação de Marca e Upload de PDF de Catálogo

As a **admin-distribuidor**,
I want **criar uma marca informando nome e slug, e fazer upload de um PDF de catálogo (drag-drop, até 500MB, com upload TUS resumível resiliente a quedas de conexão) associado à marca**,
so that **eu inicie o ciclo de digitalização daquela coleção**.

**Acceptance Criteria**

1. Tela `/admin/brands/new` permite criar marca (nome, slug auto-gerado editável, descrição opcional, logo opcional).
2. Detalhe da marca `/admin/brands/{id}` mostra zona drag-drop para upload de PDF + status atual ("Nenhum catálogo" / "Em processamento" / "Pronto para revisão" / "Publicado").
3. Upload acontece via **protocolo TUS resumível** (`@supabase/storage-js` com opção `resumable: true`) diretamente cliente→Supabase Storage (bucket privado por `brand_id`), não passa por Vercel Function. Barra de progresso em tempo real; em caso de queda de conexão, o upload retoma do último byte confirmado sem reiniciar.
4. Validações no cliente e no servidor: extensão `.pdf`, MIME `application/pdf`, tamanho <=500MB.
5. Conclusão do upload cria registro em `catalogs` (id, brand_id, file_path, page_count, status, uploaded_at, uploaded_by).
6. Rate limit: max 3 uploads/hora/admin (NFR10).

#### Story 2.3 — Estimativa de Custo Pré-Extração

As a **admin-distribuidor**,
I want **ver, após o upload, a estimativa de custo da extração (em USD e BRL) baseada no número de páginas detectado e na tarifa do modelo selecionado via OpenRouter**,
so that **eu decida com consciência financeira se procedo com a extração**.

**Acceptance Criteria**

1. Após upload, sistema conta páginas do PDF (server-side) e calcula custo estimado: `pages × tokens_per_image_estimate × tariff_per_1k` (tarifa lida da tabela `model_pricing` ou via API OpenRouter `/models`).
2. Tela exibe: número de páginas, custo estimado USD, custo estimado BRL (câmbio configurável em env var ou tabela de configs).
3. Se custo estimado > R$ 50, exige confirmação explícita ("Sim, processar mesmo assim") antes de prosseguir.
4. Botão "Iniciar extração" dispara o job; cancelamento volta o catálogo para status `awaiting_extraction`.
5. Estimativa documentada em `docs/architecture/cost-estimation-model.md`.

#### Story 2.4 — Pipeline Assíncrono de Extração via LLM Vision (OpenRouter)

As a **admin-distribuidor**,
I want **que, ao iniciar a extração, o sistema processe o PDF em background e me informe o progresso, sem travar minha tela**,
so that **eu possa continuar trabalhando enquanto a IA cadastra os produtos**.

**Acceptance Criteria**

1. Disparo da extração cria registro em `extraction_jobs` com status `queued`, e função Edge / processo assíncrono inicia o processamento.
2. Pipeline converte cada página do PDF em PNG (resolução configurável, default 1024px largura) e envia ao modelo configurado via OpenRouter (padrão: `google/gemini-flash-2.5`) com prompt estruturado documentado em `docs/architecture/extraction-prompt.md`.
3. Resposta JSON é validada contra schema Zod; produtos válidos são persistidos em `products` com `brand_id`, `catalog_id`, `extraction_confidence` por campo.
4. Tela de progresso `/admin/brands/{id}/extraction/{jobId}` mostra: status (queued/running/done/failed), páginas processadas / total, contagem parcial de produtos, custo real acumulado.
5. Polling ou Supabase Realtime mantém a tela atualizada sem reload manual.
6. Em caso de falha (timeout, rate limit, JSON inválido), retry exponencial até 3x; após esgotamento, status `failed` com mensagem clara em `error_message`.
7. NFR4: catálogo de até 50 páginas extraído em <10 min p95 com prompt otimizado.
8. Custo real (tokens consumidos × tarifa) registrado em `extraction_jobs.actual_cost_usd` e `actual_cost_brl`.

#### Story 2.5 — Persistência Estruturada de Produtos por Marca

As a **dev fullstack**,
I want **um schema `products` que armazene tudo o que o LLM via OpenRouter extrair, com RLS por `brand_id` e queries indexadas para a tela de revisão**,
so that **a revisão e a vitrine subsequentes consultem rapidamente os produtos com isolamento garantido**.

**Acceptance Criteria**

1. Tabela `products` criada com colunas: `id`, `brand_id` (FK), `catalog_id` (FK), `reference`, `description`, `sizes` (jsonb array), `colors` (jsonb array), `price_brl` (numeric), `image_crop_url`, `look_group`, `source_page` (int), `extraction_confidence` (jsonb por campo), `status` (`extracted|approved|hidden`), `display_order` (int), `created_at`, `updated_at`.
2. Índices: (`brand_id`, `status`), (`brand_id`, `look_group`), (`brand_id`, `display_order`).
3. RLS: cliente lê apenas se `status='approved'` E marca tem `published=true` E existe `user_brand_access` correspondente; admin lê/escreve apenas produtos cujo `brand_id` pertença ao seu portfólio.
4. Migration aplicada e testada localmente.
5. Testes de RLS estendidos com casos para `products`.

#### Story 2.6 — Tratamento de Falhas e Idempotência da Extração

As a **admin-distribuidor**,
I want **poder re-disparar uma extração que falhou ou re-processar um catálogo, sem duplicar produtos e sem perder configurações**,
so that **falhas pontuais do LLM via OpenRouter não me forcem a refazer trabalho de revisão**.

**Acceptance Criteria**

1. Função de re-extração marca o job anterior como `superseded`, cria novo `extraction_jobs`, e remove produtos antigos com `status='extracted'` (preserva `approved` e `hidden` para evitar perda de revisão manual).
2. Pipeline é idempotente — falhas intermitentes não criam produtos duplicados.
3. Em caso de falha persistente, admin recebe notificação visual no painel e e-mail (se configurado).
4. Documentação `docs/architecture/extraction-failure-modes.md` lista cenários (timeout, key inválida, PDF corrompido, JSON inválido) e o comportamento esperado.

---

### Epic 3 — Admin Review & Brand Storefront Publishing

**Goal:** Dar ao admin a capacidade de revisar a extração da IA com excelência (edição inline, agrupamento de LOOK, descarte de falsos positivos), publicar a vitrine com um toggle confiável, e permitir que o cliente autenticado navegue pelos produtos da marca em uma vitrine visualmente rica com busca, filtros e download do PDF original.

#### Story 3.1 — Tela de Revisão Pós-Extração (Grid Editável)

As a **admin-distribuidor**,
I want **uma tela com todos os produtos extraídos do catálogo, em grid editável com foto, referência, descrição, tamanhos, cores e preço, com edição inline campo-a-campo**,
so that **eu corrija e valide rapidamente o que a IA extraiu antes de publicar**.

**Acceptance Criteria**

1. `/admin/brands/{id}/review` lista todos os produtos `status='extracted'` em grid responsivo.
2. Cada card mostra: imagem-recorte (com fallback se ausente), referência, descrição, tamanhos (chips), cores (chips), preço, badge de `extraction_confidence` (alta/média/baixa).
3. Clique em qualquer campo abre edição inline; salvamento otimista com revert em caso de erro.
4. Filtros: por confiança (baixa primeiro), por LOOK, por status, por busca textual.
5. Bulk actions: marcar selecionados como `approved`, `hidden` ou re-extrair.
6. Indicador de progresso "X de Y produtos revisados" e bloqueio do botão "Publicar" enquanto houver produtos `status='extracted'` (não aprovados).

#### Story 3.2 — Agrupamento de LOOK e Reordenação

As a **admin-distribuidor**,
I want **agrupar produtos sob um mesmo LOOK (ex.: blusa + saia + bolsa = LOOK 1) e reordenar livremente a exibição da vitrine**,
so that **a vitrine respeite a curadoria visual da marca**.

**Acceptance Criteria**

1. Cada produto tem campo `look_group` editável (texto livre ou seleção de LOOKs já existentes na marca).
2. Tela de revisão permite drag-and-drop para reordenar produtos (atualiza `display_order`).
3. Visualização "agrupado por LOOK" colapsa produtos do mesmo LOOK em um card-mestre com expand.
4. Mudanças persistem imediatamente; sem botão "salvar" obrigatório (mas com toast de confirmação).

#### Story 3.3 — Estado Publicado / Não Publicado

As a **admin-distribuidor**,
I want **alternar a vitrine de uma marca entre `published` e `unpublished` com um toggle claro**,
so that **eu controle quando o cliente vê o catálogo finalizado e proteja coleções em revisão**.

**Acceptance Criteria**

1. Detalhe da marca expõe toggle "Publicar vitrine" com confirmação modal.
2. Toggle só habilita se: existe ao menos 1 produto `approved` e nenhum produto `extracted` pendente.
3. RLS reflete imediatamente — clientes só veem produtos de marcas `published=true`.
4. Log de auditoria registra `brand_published`/`brand_unpublished` com timestamp e admin.
5. Despublicar não deleta produtos nem pedidos históricos.

#### Story 3.4 — Vitrine da Marca para o Cliente (Grid + Busca + Filtros)

As a **lojista-cliente**,
I want **acessar a página da marca e ver todos os produtos em um grid responsivo, com busca textual, filtros por tamanho e por LOOK, e download do PDF original**,
so that **eu monte meu pedido com a mesma visualidade do catálogo original mas com agilidade digital**.

**Acceptance Criteria**

1. `/brands/{slug}` lista produtos `status='approved'` da marca `published=true` (RLS garante).
2. Grid responsivo: 2 colunas mobile, 3-4 desktop, lazy-load de imagens.
3. Cada card exibe: imagem, referência, descrição curta (truncada), preço, badge LOOK opcional.
4. Busca textual (debounced 300ms) filtra por referência ou descrição.
5. Filtro por tamanho (multi-select de tamanhos disponíveis na marca) e por LOOK.
6. Botão "Baixar catálogo PDF original" gera signed URL com TTL 5 min e dispara download.
7. NFR1/NFR3: FCP <2s, render de 100 produtos <3s em Slow 4G simulado.
8. Página é totalmente navegável por teclado (NFR23/NFR24).

#### Story 3.5 — Lista de Marcas Disponíveis para o Cliente

As a **lojista-cliente**,
I want **uma página inicial após login que lista as marcas às quais tenho acesso, com logo e botão "Acessar vitrine"**,
so that **eu navegue rapidamente entre as coleções disponíveis**.

**Acceptance Criteria**

1. `/brands` lista todas as marcas onde existe `user_brand_access` para o cliente E `published=true`.
2. Cada item exibe: logo (ou placeholder), nome, descrição curta, contagem de produtos.
3. Clique navega para `/brands/{slug}`.
4. Estado vazio amigável: "Você ainda não tem marcas disponíveis. Entre em contato com seu distribuidor."

---

### Epic 4 — Cart, Order Submission & PDF Generation

**Goal:** Implementar o coração transacional do produto — modal de seleção (ESCOLHER → ESCOLHIDO), carrinho tabular server-side de 8 colunas, envio de pedido, geração e download do PDF do pedido, e notificação ao admin — fechando o ciclo cliente→admin.

#### Story 4.1 — Modal de Seleção (ESCOLHER → ESCOLHIDO)

As a **lojista-cliente**,
I want **clicar em "ESCOLHER" em um produto e abrir um modal compacto onde escolho tamanho, cor e quantidade, e ao clicar em "ESCOLHIDO" o item entra no meu carrinho**,
so that **a captura do pedido seja rápida, sem fricção e respeitando as variantes do produto**.

**Acceptance Criteria**

1. Botão "ESCOLHER" em cada card do grid abre modal centralizado responsivo.
2. Modal exibe: imagem grande do produto, descrição, preço, chips de tamanhos disponíveis (seleção única), chips de cores (seleção única), stepper de quantidade (default 1, min 1, max 99).
3. Se produto não tem múltiplos tamanhos ou cores, omite o respectivo seletor.
4. Botão "ESCOLHIDO" é habilitado apenas quando todos os campos obrigatórios estão preenchidos.
5. Confirmação cria item no carrinho server-side e fecha modal com toast "Adicionado ao carrinho".
6. Modal é totalmente acessível por teclado (focus trap, ESC para fechar).

#### Story 4.2 — Schema e API de Carrinho Server-Side

As a **dev fullstack**,
I want **tabelas `carts` e `cart_items` com RLS, e API REST/Server Actions para adicionar, editar quantidade, remover item e limpar carrinho**,
so that **o carrinho sobreviva a sessões e dispositivos do cliente, com isolamento garantido por marca**.

**Acceptance Criteria**

1. Tabela `carts` (id, user_id, brand_id, customer_name, created_at, updated_at) com unique (user_id, brand_id).
2. Tabela `cart_items` (id, cart_id, product_id, color, size, quantity, unit_price_brl_snapshot, total_brl, added_at).
3. RLS: usuário só vê/edita seus próprios carrinhos; cliente não pode adicionar item de produto cuja marca não tem `user_brand_access` ativa.
4. Server Actions: `addItem`, `updateQuantity`, `removeItem`, `clearCart`, `getCart(brand_id)`.
5. Snapshot do preço (`unit_price_brl_snapshot`) é capturado na adição para evitar surpresa se admin alterar preço depois.
6. NFR6: operações <500ms p95.

#### Story 4.3 — Carrinho Tabular de 8 Colunas (Frontend)

As a **lojista-cliente**,
I want **uma página `/cart/{brand_slug}` que mostre meu carrinho como tabela com as 8 colunas obrigatórias, com edição inline de quantidade, remoção e linha de total**,
so that **eu confira o que pedi exatamente no formato que será enviado**.

**Acceptance Criteria**

1. Tabela com colunas, **na ordem exata**: REFERÊNCIA, DESCRIÇÃO DO PRODUTO, COR, TAMANHO, QUANTIDADE, NOME DO CLIENTE, VALOR DA PEÇA, VALOR TOTAL.
2. Cada item é uma linha; produtos de mesmo LOOK aparecem em linhas separadas (FR24).
3. Quantidade editável inline com stepper +/-, atualizando VALOR TOTAL automaticamente.
4. Botão remover por linha; botão "Limpar carrinho" no topo.
5. Campo NOME DO CLIENTE: pré-preenchido com nome do usuário logado, editável por linha **ou** global do carrinho (decisão de UX no Phase 1 do design — default é editável globalmente).
6. Linha de "Total Geral" fixa no rodapé com soma de VALOR TOTAL.
7. Tabela responsiva: em mobile, alterna para layout de "cards empilhados" preservando os 8 campos como linhas chave-valor (alternativa acessível).
8. Estado vazio: ilustração + "Seu carrinho está vazio. Volte à vitrine e escolha produtos.".

#### Story 4.4 — Envio do Pedido e Persistência

As a **lojista-cliente**,
I want **clicar em "ENVIAR PEDIDO", ter o pedido salvo permanentemente, receber um PDF para download e ver meu carrinho zerado**,
so that **eu finalize a intenção de compra e tenha um comprovante**.

**Acceptance Criteria**

1. Botão "ENVIAR PEDIDO" no rodapé do carrinho exige confirmação modal "Confirmar envio de N itens — Total R$ X,XX?".
2. Confirmação cria registro em `orders` (id, brand_id, customer_user_id, customer_name, total_brl, status `received`, submitted_at) e em `order_items` (snapshot completo dos 8 campos por item).
3. Após persistir, gera PDF (Story 4.5) e retorna URL de download.
4. Carrinho da marca é limpo (cart_items removidos; carts row pode ser preservada vazia ou removida — decisão técnica do @architect).
5. Cliente é redirecionado para tela de confirmação `/orders/{id}/success` com botão "Baixar PDF" e "Voltar à vitrine".
6. Tela `/orders/{id}` exibe detalhe do pedido com a mesma tabela 8 colunas, read-only.
7. Notificação interna ao admin: badge no `/admin` indica "N novos pedidos".

#### Story 4.5 — Geração do PDF do Pedido

As a **lojista-cliente**,
I want **fazer download de um PDF profissional do meu pedido com cabeçalho, tabela tabular e total**,
so that **eu tenha um documento arquivável e compartilhável (com a marca, com minha equipe)**.

**Acceptance Criteria**

1. PDF gerado server-side via `@react-pdf/renderer` em API Route `/api/orders/{id}/pdf`.
2. Layout: cabeçalho com logo da marca (se houver) e nome, nome do cliente, número do pedido, data/hora, marca de água sutil "CAMMES" no rodapé.
3. Tabela completa com as 8 colunas obrigatórias (FR23) — quebra de página automática.
4. Linha de "Total Geral" em destaque ao final da tabela.
5. NFR5: geração <5s p95.
6. PDF é armazenado em Supabase Storage (bucket privado `orders/{order_id}.pdf`) e signed URL é servida ao cliente com TTL 1h.
7. PDF re-acessível por cliente e admin a qualquer momento via `/orders/{id}/pdf`.

#### Story 4.6 — Notificação ao Admin sobre Novo Pedido

As a **admin-distribuidor**,
I want **ser notificado quando um cliente envia um pedido, com link direto para visualizar e baixar o PDF**,
so that **eu processe o pedido com a marca rapidamente**.

**Acceptance Criteria**

1. Envio de pedido grava notificação na tabela `admin_notifications` (id, admin_user_id, type `new_order`, order_id, brand_id, read bool, created_at).
2. Header do admin exibe badge com contagem de notificações não lidas.
3. Clique no badge abre dropdown com últimas 10 notificações, cada uma linkando para `/admin/orders/{id}`.
4. Marcar como lida via clique ou ação "marcar todas como lidas".
5. Notificação por e-mail é **opcional** no MVP (implementar apenas se admin habilitar em settings — caso contrário, apenas in-app).

---

### Epic 5 — Admin Operations, Telemetry & LGPD Compliance

**Goal:** Equipar o admin com as ferramentas operacionais necessárias para escalar o uso da plataforma — painel completo de pedidos, gestão de acessos de clientes a marcas, dashboard básico de métricas, exportações, telemetria de auditoria e fluxos de LGPD (consentimento, exclusão sob requisição) — fechando o ciclo operacional do MVP.

#### Story 5.1 — Painel de Pedidos (Admin)

As a **admin-distribuidor**,
I want **ver todos os pedidos em uma lista filtrada por marca, cliente, data e status visualização, com paginação**,
so that **eu opere o pipeline de pedidos sem perder nenhum**.

**Acceptance Criteria**

1. `/admin/orders` lista pedidos com colunas: data, marca, cliente, total, status (`received|viewed`), ação (ver detalhe).
2. Filtros: marca (multi-select), cliente (autocomplete), data (range picker), status.
3. Paginação server-side (25 por página default).
4. Clique em linha abre `/admin/orders/{id}` com a tabela 8 colunas, botão download PDF e botão "Exportar CSV".
5. Marcar pedido como `viewed` é manual via toggle.

#### Story 5.2 — Exportação de Pedidos em CSV

As a **admin-distribuidor**,
I want **exportar um pedido individual ou um conjunto filtrado em CSV**,
so that **eu importe no Excel ou empurre para sistemas terceiros**.

**Acceptance Criteria**

1. Botão "Exportar CSV" em `/admin/orders/{id}` gera CSV com as 8 colunas obrigatórias do pedido.
2. Botão "Exportar lista" em `/admin/orders` exporta o conjunto filtrado atual (max 1000 linhas no MVP).
3. CSV usa UTF-8 com BOM (compatibilidade Excel pt-BR), separador `;`, decimal `,`.
4. Nome do arquivo: `pedido-{id}-{YYYY-MM-DD}.csv` (individual) ou `pedidos-{YYYY-MM-DD}.csv` (lista).

#### Story 5.3 — Gestão de Acessos: Convidar Cliente e Atribuir Marcas

As a **admin-distribuidor**,
I want **convidar um lojista por e-mail, atribuir-lhe acesso a marcas específicas e revogar acesso quando necessário**,
so that **eu controle quem vê quais coleções**.

**Acceptance Criteria**

1. `/admin/customers` lista clientes do tenant com nome, e-mail, marcas atribuídas, último login.
2. Botão "Convidar cliente" abre modal: e-mail, nome, marcas (multi-select). Envia magic link/convite ao e-mail.
3. Cliente convidado completa cadastro via link (senha inicial), com aceite explícito de termos LGPD.
4. Admin pode adicionar/remover marcas de um cliente existente; remoção é imediata (RLS revoga acesso).
5. Botão "Desativar cliente" suspende acesso sem deletar o usuário (mantém histórico de pedidos).
6. Auditoria: eventos `customer_invited`, `customer_brand_granted`, `customer_brand_revoked`, `customer_deactivated`.

#### Story 5.4 — Dashboard Inicial Admin (Métricas Básicas)

As a **admin-distribuidor**,
I want **um dashboard ao entrar em `/admin` com contagens-chave: marcas publicadas, produtos extraídos, pedidos do mês, custo OpenRouter do mês**,
so that **eu tenha visão imediata da operação**.

**Acceptance Criteria**

1. `/admin` (raiz) renderiza 4 cards de KPI: marcas publicadas (total), produtos aprovados (total), pedidos do mês (vs mês anterior), custo OpenRouter do mês (USD + BRL).
2. Cada card linka para sua tela detalhada (ex.: card de pedidos → `/admin/orders` filtrado pelo mês).
3. Gráfico simples (line ou bar, biblioteca leve tipo `recharts`) de pedidos por dia nos últimos 30 dias.
4. Lista "Últimos 5 pedidos" e "Últimos 5 jobs de extração" abaixo dos KPIs.
5. KPIs cacheados server-side por 60s para evitar query pesada a cada visita.

#### Story 5.5 — Log de Auditoria e Eventos de Produto

As a **engenheiro de qualidade / admin**,
I want **uma tabela `audit_logs` que registre eventos críticos com user_id, event_type, target_resource, payload e timestamp**,
so that **incidentes possam ser investigados e KPIs sejam mensuráveis**.

**Acceptance Criteria**

1. Tabela `audit_logs` (id, user_id, event_type, target_resource_type, target_resource_id, payload jsonb, ip_address, user_agent, created_at) com índice em (`user_id`, `created_at`) e em (`event_type`, `created_at`).
2. Helper server-side `logAuditEvent(eventType, payload)` invocado em: login success/fail, logout, openrouter_key_updated, brand_published, brand_unpublished, extraction_started, extraction_completed, extraction_failed, order_submitted, order_viewed, customer_invited, customer_brand_granted, customer_brand_revoked, pdf_downloaded.
3. RLS: apenas admins do tenant leem; clientes não leem.
4. Página `/admin/audit` (admin) lista logs com filtros por event_type e range de datas, paginação, exportação CSV.
5. Retenção mínima 90 dias (NFR16); política de purge automatizado via `pg_cron` documentada (rotina inicial: log permanente; cleanup automático fica para Phase 2).

#### Story 5.6 — Consentimento LGPD no Cadastro e Política de Privacidade

As a **lojista-cliente cadastrando-se pela primeira vez**,
I want **aceitar explicitamente os termos de uso e a política de privacidade antes de concluir o cadastro**,
so that **a operação esteja em conformidade com a LGPD**.

**Acceptance Criteria**

1. Tela de aceite de convite/cadastro exige checkbox "Li e aceito os Termos de Uso e a Política de Privacidade" (link para páginas dedicadas) — não opt-in pré-marcado.
2. Aceite cria registro em `consent_log` (user_id, document_version, accepted_at, ip_address).
3. Páginas estáticas `/legal/terms` e `/legal/privacy` publicadas com versão 1.0 cobrindo: dados coletados, finalidade, base legal (consentimento + execução de contrato), direitos do titular (acesso, correção, exclusão), contato do DPO (placeholder do distribuidor).
4. Re-aceite obrigatório quando uma nova versão dos documentos for publicada.

#### Story 5.7 — Direito ao Esquecimento (Exclusão de Conta sob Requisição)

As a **lojista-cliente**,
I want **solicitar a exclusão da minha conta e ter meus dados pessoais removidos em até 15 dias**,
so that **eu exerça meu direito previsto na LGPD**.

**Acceptance Criteria**

1. Tela `/account/delete` (autenticado) permite ao cliente solicitar exclusão, com confirmação por e-mail.
2. Solicitação cria registro em `deletion_requests` (user_id, requested_at, status `pending|in_review|completed`).
3. Admin recebe notificação e tem 15 dias para processar; UI admin permite executar exclusão.
4. Exclusão remove PII (nome, e-mail, telefone) e anonimiza histórico de pedidos (`customer_name` substituído por "Cliente removido"), preservando integridade contábil dos pedidos.
5. Cliente recebe e-mail de confirmação após exclusão.
6. Auditoria registra `account_deletion_requested` e `account_deletion_completed`.

#### Story 5.8 — Telemetria de KPIs do MVP (Eventos de Produto)

As a **PM / stakeholder**,
I want **eventos server-side que permitam calcular os KPIs do MVP (TMCV, TPE, PEE, CME, ABS, CtO, AAD) sem depender de Google Analytics**,
so that **o sucesso do MVP seja mensurável desde o dia 1 (NFR31 + Goals do brief)**.

**Acceptance Criteria**

1. Cada KPI do brief tem um evento ou agregação correspondente documentado em `docs/qa/kpi-mapping.md`.
2. Eventos persistidos em `audit_logs` ou tabela dedicada `product_events`.
3. Endpoint admin `/admin/reports/kpis` exibe os 7 KPIs do brief com janela 30 dias e ano corrente.
4. Tempo de extração (TMCV) calculado a partir de `extraction_jobs.created_at → completed_at`.
5. Custo (CME) calculado a partir de `extraction_jobs.actual_cost_brl` médio por catálogo concluído.
6. Documentação clara de fórmulas e janelas (rolling 7d, 30d, MTD).

---

## 7. Checklist Results Report

> _Esta seção é populada após execução do `pm-checklist.md`. No modo YOLO autônomo, executei mentalmente os principais itens da checklist e registro abaixo o resumo. A execução formal completa deve ser disparada por @po como parte do `*validate-story-draft` para cada story do Epic 1._

**Resumo da auto-verificação (PM mode):**

| Categoria | Status | Notas |
|-----------|--------|-------|
| Goals claros e alinhados ao brief | ✅ PASS | 8 goals derivados diretamente dos objetivos do brief |
| Background context conciso e não redundante | ✅ PASS | 2 parágrafos, sem repetição com goals |
| FRs numerados, testáveis, rastreáveis | ✅ PASS | 39 FRs com prefixo, cada um rastreável ao brief |
| NFRs numerados e mensuráveis | ✅ PASS | 31 NFRs com critérios quantitativos |
| UX goals capturam visão sem virar spec | ✅ PASS | Foco em paradigmas, sem detalhar componentes |
| Technical assumptions completas e consistentes com brief | ✅ PASS | Stack, repo, testing, e additional assumptions cobertos |
| Epic list sequenciada e cada epic = release deployable | ✅ PASS | 5 épicos com ordem clara, Epic 1 com canary |
| Stories são vertical slices, dimensionadas para 2-4h de agente | ✅ PASS | 26 stories totais, escopo focado |
| ACs precisos, testáveis, sem "como" técnico em excesso | ✅ PASS | ACs evitam implementação detalhada |
| Cross-cutting concerns distribuídos (não no fim) | ✅ PASS | RLS desde Epic 1, telemetria desde Epic 2, LGPD desde Epic 5 |
| Riscos do brief refletidos no PRD | ✅ PASS | R1-R10 endereçados (POC, custo estimado, RLS audit, abstração LLM, idempotência, etc.) |
| Article IV (No Invention) respeitado | ✅ PASS | Todo FR/NFR ancora no brief ou em decisão técnica explícita |

**Itens a confirmar com @po e stakeholder antes de Epic 2:**

- Confirmação das 10 Open Questions do brief (especialmente formato do PDF de pedido e política de mínimos).
- Aceite do critério "4-de-6" para sucesso do MVP.
- Definição final da forma de gestão do campo NOME DO CLIENTE no carrinho (por linha vs. global) — recomendação atual: global do carrinho com possibilidade de override por linha em Phase 2.

---

## 8. Next Steps

### 8.1 UX Expert Prompt

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

### 8.2 Architect Prompt

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

### Apêndice A — Rastreabilidade FR/NFR → Brief

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
