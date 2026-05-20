# 6. Epic Details

## Epic 1 — Foundation, Auth & Multitenancy Skeleton

**Goal:** Estabelecer toda a infraestrutura técnica do projeto (Next.js + Supabase + Vercel + CI/CD), autenticar admin e cliente em fluxos separados, e criar o esqueleto multitenant com RLS verificada por testes — entregando, ao final, um canary funcional que prova que login, sessão, redirecionamento por papel e isolamento de marca funcionam end-to-end.

### Story 1.1 — Bootstrap do Projeto Next.js + Supabase + Vercel

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

### Story 1.2 — Schema Inicial e Migrações Supabase

As a **dev fullstack**,
I want **um schema PostgreSQL inicial com tabelas `users_profile`, `brands`, `user_brand_access` e suas relações, todas migrationadas via `supabase migrations`**,
so that **futuras stories tenham um esqueleto multitenant para construir features de marca, produto e pedido**.

**Acceptance Criteria**

1. Migrações em `supabase/migrations/` criam tabelas: `users_profile` (id, role enum `admin|customer`, full_name, email, created_at), `brands` (id, slug unique, name, description, logo_url, published bool default false, owner_admin_id, created_at), `user_brand_access` (user_id, brand_id, granted_at, granted_by).
2. Cada tabela tem RLS habilitada (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`) e ao menos uma política inicial documentada.
3. Migração rodando localmente via `supabase db reset` aplica todas as migrações sem erro.
4. Documentação `docs/architecture/data-model-skeleton.md` lista as tabelas, colunas e relações.

### Story 1.3 — Autenticação Admin e Cliente (Login/Logout)

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

### Story 1.4 — Magic Link e Recuperação de Senha

As a **lojista-cliente**,
I want **acessar a plataforma pela primeira vez por um magic link recebido por e-mail e recuperar minha senha quando esquecer**,
so that **o onboarding seja livre de atrito e eu não fique bloqueado da plataforma**.

**Acceptance Criteria**

1. Admin pode (via CLI/manual no Supabase Studio no MVP — UI completa fica em Epic 5) enviar magic link para um cliente cadastrado.
2. Link de magic link autentica o usuário e o redireciona para `/brands`.
3. Página `/recover-password` permite ao usuário solicitar reset por e-mail.
4. Link de reset abre tela `/reset-password` que requer nova senha (>=8 caracteres) e confirma.
5. Após reset, usuário é redirecionado para login.

### Story 1.5 — Canary: Dashboards Vazios Funcionais por Papel

As a **stakeholder do projeto**,
I want **ver que um admin autenticado entra em um `/admin` (mesmo vazio) e um cliente autenticado entra em `/brands` (mesmo vazio), com layout e header diferenciados**,
so that **toda a base de autenticação, redirecionamento por papel e roteamento esteja comprovada antes de construir features**.

**Acceptance Criteria**

1. `/admin` renderiza header com nome do admin logado, navegação placeholder (Marcas, Pedidos, Configurações) e conteúdo principal com mensagem "Bem-vindo, [nome]".
2. `/brands` (área do cliente) renderiza header com nome do cliente logado e conteúdo principal com mensagem "Você ainda não tem marcas disponíveis".
3. Middleware de Next.js valida sessão em todas as rotas `/admin/*` e `/brands/*` (e `/cart`, `/orders/*`).
4. Layout admin (denso, sidebar) e layout cliente (mobile-first, header sticky) implementados como `layout.tsx` separados.
5. Teste E2E manual documentado em `docs/qa/smoke-epic-1.md`.

### Story 1.6 — RLS Audit Foundation: Matriz de Testes Cross-Tenant

As a **engenheiro de qualidade**,
I want **uma matriz documentada de testes RLS positivos e negativos cobrindo as tabelas `brands` e `user_brand_access`**,
so that **qualquer regressão de isolamento entre marcas seja detectada imediatamente e o R3 do brief seja mitigado desde o Epic 1**.

**Acceptance Criteria**

1. `docs/qa/rls-test-matrix.md` documenta para cada tabela: políticas existentes, casos positivos (acesso permitido) e casos negativos (acesso negado esperado).
2. Suite de integration tests em `tests/integration/rls/` cobre, no mínimo: cliente_A não lê brand_B sem `user_brand_access`; admin_X não lê brands de admin_Y; tentativa de UPDATE cross-tenant falha.
3. Testes rodam em CI; falha bloqueia merge.
4. ADR-002 (RLS strategy) escrito por @architect e linkado.

---

## Epic 2 — Catalog Upload & LLM Vision Extraction Pipeline (OpenRouter)

**Goal:** Permitir que o admin faça upload seguro de um PDF de catálogo, dispare um pipeline assíncrono de extração via LLM Vision (OpenRouter + Gemini Flash 2.5), configure sua chave OpenRouter com segurança, veja a estimativa de custo antes de processar e tenha produtos persistidos em uma estrutura pronta para revisão.

### Story 2.1 — Gestão Segura da Chave OpenRouter (BYOK)

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

### Story 2.2 — Criação de Marca e Upload de PDF de Catálogo

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

### Story 2.3 — Estimativa de Custo Pré-Extração

As a **admin-distribuidor**,
I want **ver, após o upload, a estimativa de custo da extração (em USD e BRL) baseada no número de páginas detectado e na tarifa do modelo selecionado via OpenRouter**,
so that **eu decida com consciência financeira se procedo com a extração**.

**Acceptance Criteria**

1. Após upload, sistema conta páginas do PDF (server-side) e calcula custo estimado: `pages × tokens_per_image_estimate × tariff_per_1k` (tarifa lida da tabela `model_pricing` ou via API OpenRouter `/models`).
2. Tela exibe: número de páginas, custo estimado USD, custo estimado BRL (câmbio configurável em env var ou tabela de configs).
3. Se custo estimado > R$ 50, exige confirmação explícita ("Sim, processar mesmo assim") antes de prosseguir.
4. Botão "Iniciar extração" dispara o job; cancelamento volta o catálogo para status `awaiting_extraction`.
5. Estimativa documentada em `docs/architecture/cost-estimation-model.md`.

### Story 2.4 — Pipeline Assíncrono de Extração via LLM Vision (OpenRouter)

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

### Story 2.5 — Persistência Estruturada de Produtos por Marca

As a **dev fullstack**,
I want **um schema `products` que armazene tudo o que o LLM via OpenRouter extrair, com RLS por `brand_id` e queries indexadas para a tela de revisão**,
so that **a revisão e a vitrine subsequentes consultem rapidamente os produtos com isolamento garantido**.

**Acceptance Criteria**

1. Tabela `products` criada com colunas: `id`, `brand_id` (FK), `catalog_id` (FK), `reference`, `description`, `sizes` (jsonb array), `colors` (jsonb array), `price_brl` (numeric), `image_crop_url`, `look_group`, `source_page` (int), `extraction_confidence` (jsonb por campo), `status` (`extracted|approved|hidden`), `display_order` (int), `created_at`, `updated_at`.
2. Índices: (`brand_id`, `status`), (`brand_id`, `look_group`), (`brand_id`, `display_order`).
3. RLS: cliente lê apenas se `status='approved'` E marca tem `published=true` E existe `user_brand_access` correspondente; admin lê/escreve apenas produtos cujo `brand_id` pertença ao seu portfólio.
4. Migration aplicada e testada localmente.
5. Testes de RLS estendidos com casos para `products`.

### Story 2.6 — Tratamento de Falhas e Idempotência da Extração

As a **admin-distribuidor**,
I want **poder re-disparar uma extração que falhou ou re-processar um catálogo, sem duplicar produtos e sem perder configurações**,
so that **falhas pontuais do LLM via OpenRouter não me forcem a refazer trabalho de revisão**.

**Acceptance Criteria**

1. Função de re-extração marca o job anterior como `superseded`, cria novo `extraction_jobs`, e remove produtos antigos com `status='extracted'` (preserva `approved` e `hidden` para evitar perda de revisão manual).
2. Pipeline é idempotente — falhas intermitentes não criam produtos duplicados.
3. Em caso de falha persistente, admin recebe notificação visual no painel e e-mail (se configurado).
4. Documentação `docs/architecture/extraction-failure-modes.md` lista cenários (timeout, key inválida, PDF corrompido, JSON inválido) e o comportamento esperado.

---

## Epic 3 — Admin Review & Brand Storefront Publishing

**Goal:** Dar ao admin a capacidade de revisar a extração da IA com excelência (edição inline, agrupamento de LOOK, descarte de falsos positivos), publicar a vitrine com um toggle confiável, e permitir que o cliente autenticado navegue pelos produtos da marca em uma vitrine visualmente rica com busca, filtros e download do PDF original.

### Story 3.1 — Tela de Revisão Pós-Extração (Grid Editável)

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

### Story 3.2 — Agrupamento de LOOK e Reordenação

As a **admin-distribuidor**,
I want **agrupar produtos sob um mesmo LOOK (ex.: blusa + saia + bolsa = LOOK 1) e reordenar livremente a exibição da vitrine**,
so that **a vitrine respeite a curadoria visual da marca**.

**Acceptance Criteria**

1. Cada produto tem campo `look_group` editável (texto livre ou seleção de LOOKs já existentes na marca).
2. Tela de revisão permite drag-and-drop para reordenar produtos (atualiza `display_order`).
3. Visualização "agrupado por LOOK" colapsa produtos do mesmo LOOK em um card-mestre com expand.
4. Mudanças persistem imediatamente; sem botão "salvar" obrigatório (mas com toast de confirmação).

### Story 3.3 — Estado Publicado / Não Publicado

As a **admin-distribuidor**,
I want **alternar a vitrine de uma marca entre `published` e `unpublished` com um toggle claro**,
so that **eu controle quando o cliente vê o catálogo finalizado e proteja coleções em revisão**.

**Acceptance Criteria**

1. Detalhe da marca expõe toggle "Publicar vitrine" com confirmação modal.
2. Toggle só habilita se: existe ao menos 1 produto `approved` e nenhum produto `extracted` pendente.
3. RLS reflete imediatamente — clientes só veem produtos de marcas `published=true`.
4. Log de auditoria registra `brand_published`/`brand_unpublished` com timestamp e admin.
5. Despublicar não deleta produtos nem pedidos históricos.

### Story 3.4 — Vitrine da Marca para o Cliente (Grid + Busca + Filtros)

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

### Story 3.5 — Lista de Marcas Disponíveis para o Cliente

As a **lojista-cliente**,
I want **uma página inicial após login que lista as marcas às quais tenho acesso, com logo e botão "Acessar vitrine"**,
so that **eu navegue rapidamente entre as coleções disponíveis**.

**Acceptance Criteria**

1. `/brands` lista todas as marcas onde existe `user_brand_access` para o cliente E `published=true`.
2. Cada item exibe: logo (ou placeholder), nome, descrição curta, contagem de produtos.
3. Clique navega para `/brands/{slug}`.
4. Estado vazio amigável: "Você ainda não tem marcas disponíveis. Entre em contato com seu distribuidor."

---

## Epic 4 — Cart, Order Submission & PDF Generation

**Goal:** Implementar o coração transacional do produto — modal de seleção (ESCOLHER → ESCOLHIDO), carrinho tabular server-side de 8 colunas, envio de pedido, geração e download do PDF do pedido, e notificação ao admin — fechando o ciclo cliente→admin.

### Story 4.1 — Modal de Seleção (ESCOLHER → ESCOLHIDO)

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

### Story 4.2 — Schema e API de Carrinho Server-Side

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

### Story 4.3 — Carrinho Tabular de 8 Colunas (Frontend)

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

### Story 4.4 — Envio do Pedido e Persistência

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

### Story 4.5 — Geração do PDF do Pedido

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

### Story 4.6 — Notificação ao Admin sobre Novo Pedido

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

## Epic 5 — Admin Operations, Telemetry & LGPD Compliance

**Goal:** Equipar o admin com as ferramentas operacionais necessárias para escalar o uso da plataforma — painel completo de pedidos, gestão de acessos de clientes a marcas, dashboard básico de métricas, exportações, telemetria de auditoria e fluxos de LGPD (consentimento, exclusão sob requisição) — fechando o ciclo operacional do MVP.

### Story 5.1 — Painel de Pedidos (Admin)

As a **admin-distribuidor**,
I want **ver todos os pedidos em uma lista filtrada por marca, cliente, data e status visualização, com paginação**,
so that **eu opere o pipeline de pedidos sem perder nenhum**.

**Acceptance Criteria**

1. `/admin/orders` lista pedidos com colunas: data, marca, cliente, total, status (`received|viewed`), ação (ver detalhe).
2. Filtros: marca (multi-select), cliente (autocomplete), data (range picker), status.
3. Paginação server-side (25 por página default).
4. Clique em linha abre `/admin/orders/{id}` com a tabela 8 colunas, botão download PDF e botão "Exportar CSV".
5. Marcar pedido como `viewed` é manual via toggle.

### Story 5.2 — Exportação de Pedidos em CSV

As a **admin-distribuidor**,
I want **exportar um pedido individual ou um conjunto filtrado em CSV**,
so that **eu importe no Excel ou empurre para sistemas terceiros**.

**Acceptance Criteria**

1. Botão "Exportar CSV" em `/admin/orders/{id}` gera CSV com as 8 colunas obrigatórias do pedido.
2. Botão "Exportar lista" em `/admin/orders` exporta o conjunto filtrado atual (max 1000 linhas no MVP).
3. CSV usa UTF-8 com BOM (compatibilidade Excel pt-BR), separador `;`, decimal `,`.
4. Nome do arquivo: `pedido-{id}-{YYYY-MM-DD}.csv` (individual) ou `pedidos-{YYYY-MM-DD}.csv` (lista).

### Story 5.3 — Gestão de Acessos: Convidar Cliente e Atribuir Marcas

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

### Story 5.4 — Dashboard Inicial Admin (Métricas Básicas)

As a **admin-distribuidor**,
I want **um dashboard ao entrar em `/admin` com contagens-chave: marcas publicadas, produtos extraídos, pedidos do mês, custo OpenRouter do mês**,
so that **eu tenha visão imediata da operação**.

**Acceptance Criteria**

1. `/admin` (raiz) renderiza 4 cards de KPI: marcas publicadas (total), produtos aprovados (total), pedidos do mês (vs mês anterior), custo OpenRouter do mês (USD + BRL).
2. Cada card linka para sua tela detalhada (ex.: card de pedidos → `/admin/orders` filtrado pelo mês).
3. Gráfico simples (line ou bar, biblioteca leve tipo `recharts`) de pedidos por dia nos últimos 30 dias.
4. Lista "Últimos 5 pedidos" e "Últimos 5 jobs de extração" abaixo dos KPIs.
5. KPIs cacheados server-side por 60s para evitar query pesada a cada visita.

### Story 5.5 — Log de Auditoria e Eventos de Produto

As a **engenheiro de qualidade / admin**,
I want **uma tabela `audit_logs` que registre eventos críticos com user_id, event_type, target_resource, payload e timestamp**,
so that **incidentes possam ser investigados e KPIs sejam mensuráveis**.

**Acceptance Criteria**

1. Tabela `audit_logs` (id, user_id, event_type, target_resource_type, target_resource_id, payload jsonb, ip_address, user_agent, created_at) com índice em (`user_id`, `created_at`) e em (`event_type`, `created_at`).
2. Helper server-side `logAuditEvent(eventType, payload)` invocado em: login success/fail, logout, openrouter_key_updated, brand_published, brand_unpublished, extraction_started, extraction_completed, extraction_failed, order_submitted, order_viewed, customer_invited, customer_brand_granted, customer_brand_revoked, pdf_downloaded.
3. RLS: apenas admins do tenant leem; clientes não leem.
4. Página `/admin/audit` (admin) lista logs com filtros por event_type e range de datas, paginação, exportação CSV.
5. Retenção mínima 90 dias (NFR16); política de purge automatizado via `pg_cron` documentada (rotina inicial: log permanente; cleanup automático fica para Phase 2).

### Story 5.6 — Consentimento LGPD no Cadastro e Política de Privacidade

As a **lojista-cliente cadastrando-se pela primeira vez**,
I want **aceitar explicitamente os termos de uso e a política de privacidade antes de concluir o cadastro**,
so that **a operação esteja em conformidade com a LGPD**.

**Acceptance Criteria**

1. Tela de aceite de convite/cadastro exige checkbox "Li e aceito os Termos de Uso e a Política de Privacidade" (link para páginas dedicadas) — não opt-in pré-marcado.
2. Aceite cria registro em `consent_log` (user_id, document_version, accepted_at, ip_address).
3. Páginas estáticas `/legal/terms` e `/legal/privacy` publicadas com versão 1.0 cobrindo: dados coletados, finalidade, base legal (consentimento + execução de contrato), direitos do titular (acesso, correção, exclusão), contato do DPO (placeholder do distribuidor).
4. Re-aceite obrigatório quando uma nova versão dos documentos for publicada.

### Story 5.7 — Direito ao Esquecimento (Exclusão de Conta sob Requisição)

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

### Story 5.8 — Telemetria de KPIs do MVP (Eventos de Produto)

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
