# Project Brief: CAMMES

> **Documento:** Project Brief
> **Projeto:** CAMMES — Catálogo Multimarcas com Extração Estruturada
> **Versão:** 1.0
> **Data:** 2026-05-19
> **Autor:** Atlas (@analyst)
> **Workflow:** greenfield-fullstack — Phase 1 (Discovery & Planning)
> **Próximo handoff:** @pm (Morgan) para criação do PRD
> **Modo de execução:** YOLO autônomo

---

## Executive Summary

**CAMMES** (Catálogo Multimarcas com Extração Estruturada) é uma plataforma B2B/B2B2C web onde administradores transformam **catálogos PDF de marcas de moda/produtos** em **vitrines digitais navegáveis** de forma quase-automática, usando um modelo LLM com visão (GPT-4o Vision) para extrair referências, descrições, tamanhos, cores e preços. Clientes autenticados navegam pelas vitrines, **selecionam produtos** (sem checkout financeiro online), montam um carrinho/pedido em formato tabular obrigatório e **enviam o pedido em PDF** para o administrador finalizar offline.

- **Conceito do produto:** Marketplace privado multimarcas alimentado por IA-extrator de PDFs, com fluxo de pedido B2B (sem pagamento online).
- **Problema central:** Marcas distribuem catálogos PDF estáticos por WhatsApp/e-mail — pedidos voltam por mensagens desestruturadas, gerando retrabalho, erros de referência, perda de pedidos e atrito de UX para o cliente final.
- **Mercado-alvo:** Distribuidores/representantes/showrooms multimarcas (moda, calçados, acessórios, decoração) que operam B2B com lojistas, e seus respectivos clientes finais (lojistas/compradoras).
- **Proposta de valor:** "Suba o PDF → tenha vitrine digital pesquisável e pedidos estruturados em 24h, sem ter que digitar produto a produto." Reduz tempo de cadastro de catálogo de **semanas para minutos**, padroniza pedidos e cria histórico estruturado por marca.

[AUTO-DECISION] Naming do projeto → "CAMMES = Catálogo Multimarcas com Extração Estruturada" (razão: termo "CAMMES" foi fornecido como nome-código; expansão proposta reflete os 3 atributos centrais: multimarca, extração via IA, dados estruturados).

---

## Problem Statement

### Estado atual e pontos de dor

Distribuidores, representantes comerciais e showrooms multimarcas (especialmente em moda, calçados, acessórios e decoração no mercado brasileiro) trabalham hoje com um fluxo predominantemente **analógico-digital híbrido**:

1. **Marcas produzem catálogos PDF** de coleção (lookbooks de alta resolução com fotos, referências, tamanhos e preços).
2. **Distribuidor recebe os PDFs** e os redistribui para sua carteira de lojistas via WhatsApp, e-mail ou Drive.
3. **Lojistas folheiam o PDF**, anotam referências em papel/planilha/WhatsApp e devolvem o pedido em texto livre ou foto de planilha.
4. **Distribuidor consolida pedidos manualmente** em planilha, valida referências contra o PDF, calcula totais e devolve para a marca.

### Impacto quantificável da dor

| Dimensão | Estimativa de impacto |
|---|---|
| Tempo de cadastro manual de um catálogo de 50-200 SKUs em uma plataforma | 8-40 horas-pessoa |
| Taxa de erro em pedidos por texto livre (referência errada, tamanho ausente) | 10-25% dos pedidos exigem retrabalho |
| Pedidos perdidos por desencontro de WhatsApp/e-mail | 5-15% do volume mensal |
| Tempo médio para consolidar pedidos de uma coleção | 3-10 dias úteis |
| Capacidade de análise de venda por SKU/marca pelo distribuidor | Praticamente inexistente — fica em planilhas isoladas |

> Nota: estes números são estimativas baseadas em padrões conhecidos do varejo B2B de moda no Brasil. Confiança: MÉDIA — recomenda-se validar com 5-10 entrevistas qualitativas com distribuidores reais antes do go-live (ver "Areas Needing Further Research").

### Por que soluções existentes falham

- **E-commerces tradicionais (Shopify, WooCommerce, Nuvemshop):** exigem cadastro manual SKU a SKU, sem upload-de-PDF-automatizado. São desenhados para B2C com pagamento online — não atendem o caso B2B sem checkout.
- **ERPs/sistemas de representação (Mercos, Meu Representante, etc.):** focados em força de vendas com cadastro estruturado prévio. Não resolvem o gap "catálogo PDF → vitrine".
- **WhatsApp Catalog/Business:** sem isolamento por marca, sem tabela de pedido padronizada, sem capacidade de download de catálogo original.
- **Planilhas/formulários customizados:** não escalam para múltiplas marcas e perdem a experiência visual do lookbook.

### Por que resolver agora (urgência)

1. **LLMs multimodais (GPT-4o, Claude Vision) ficaram custo-efetivos e suficientemente precisos em 2025-2026** para extrair dados estruturados de PDFs de moda — esse gatilho tecnológico não existia há 2 anos.
2. **Pressão pós-pandemia por digitalização B2B:** distribuidores que ainda operam por WhatsApp perdem competitividade frente a operações digitalizadas.
3. **Custo de oportunidade crescente:** cada coleção (2-4 por ano por marca) que passa sem digitalização é volume de dados estruturados perdido para análises futuras.

[AUTO-DECISION] Quantificação do problema → usar estimativas baseadas em padrões setoriais com nota de confiança MÉDIA (razão: spawn prompt não traz dados primários de mercado; o PRD/Market Research subsequente deve validar; é honesto sinalizar a incerteza agora).

---

## Proposed Solution

### Conceito central e abordagem

**CAMMES é uma plataforma web onde o administrador faz upload de PDFs de catálogo e o sistema, usando GPT-4o Vision, gera automaticamente uma vitrine digital por marca, com base de dados de produtos e fluxo de pedido estruturado.**

O fluxo end-to-end é:

```
[Admin sobe PDF da marca X]
          ↓
[GPT-4o Vision extrai produtos: referência, descrição, tamanhos, preços, cor]
          ↓
[Sistema cria DB isolada da marca X + vitrine com fotos do PDF + cards de produto]
          ↓
[Admin revisa extração, configura disponibilidade, PUBLICA a vitrine]
          ↓
[Cliente autenticado entra, escolhe produtos, monta carrinho tabular]
          ↓
[Cliente envia pedido → PDF gerado → DB de pedidos da marca X]
          ↓
[Admin recebe pedido estruturado, processa offline com a marca]
```

### Diferenciadores-chave

1. **PDF-first, não SKU-first:** competidores exigem cadastro manual; CAMMES inverte — o PDF é a fonte da verdade, a IA extrai, o admin valida.
2. **Multitenancy por marca dentro do mesmo painel:** cada catálogo cria uma "vitrine de marca" isolada (banco de produtos e pedidos separados), mas todas vivem no mesmo painel admin.
3. **Pedido estruturado obrigatório, sem pagamento online:** o formato tabular fixo (8 colunas) padroniza o pedido B2B, eliminando o ruído do texto livre — sem fricção de checkout/gateway.
4. **Catálogo original preservado:** cliente pode baixar o PDF da marca a qualquer momento — preserva o ritual visual do lookbook.
5. **Acesso 100% gated:** zero conteúdo público — toda navegação exige login, alinhado com modelos B2B fechados.
6. **LLM bring-your-own-key:** API key configurável pelo admin, deslocando custo de IA para o operador e permitindo escolha de modelo.

### Por que esta solução vai vencer onde outras não venceram

| Tentativa anterior | Por que falhou | Por que CAMMES é diferente |
|---|---|---|
| E-commerces B2C adaptados | Friccional para B2B sem checkout | Pedido sem pagamento, formato tabular |
| Apps de representação (Mercos) | Exigem cadastro manual prévio | Upload de PDF + IA |
| WhatsApp / e-mail | Não estrutura, não escala | Tabela obrigatória + DB por marca |
| Soluções de IA generalistas | Não conhecem domínio de catálogo de moda | Prompt + esquema de extração específicos de catálogo |

### Visão de alto nível do produto

CAMMES nasce como **ferramenta operacional de um distribuidor multimarca** (MVP single-tenant administrativo), mas tem trajetória clara para se tornar uma **plataforma SaaS multitenant** onde múltiplos distribuidores operam suas vitrines em ambientes isolados, com camada de analytics, integrações com ERPs e API pública.

[AUTO-DECISION] Estratégia de extração → usar Vision LLM puro (GPT-4o) com prompt estruturado em vez de OCR-tradicional + pós-processamento (razão: Vision LLM lida nativamente com layouts heterogêneos de lookbook, fotos sobrepostas, texto em curvas; OCR clássico falha; trade-off de custo aceito porque admin paga a API key).

[AUTO-DECISION] Multitenancy de marca → "uma loja por catálogo, todas no mesmo painel admin" (razão: simplifica MVP, atende o caso single-distribuidor; PostgreSQL+RLS no Supabase permite evoluir para multi-distribuidor sem refactor de schema).

---

## Target Users

### Primary User Segment: Administrador-Distribuidor (Buyer Operacional)

**Perfil demográfico/firmográfico:**

- Pequeno-médio distribuidor / representante / showroom multimarcas
- Empresa com 2-20 funcionários, sede comum em SP/MG/SC (polos do varejo de moda brasileiro)
- Faturamento estimado R$ 500k a R$ 10M/ano
- Trabalha com 5 a 50 marcas no portfólio
- Carteira de 50 a 500 lojistas-clientes
- Perfil etário do gestor: 35-55 anos
- Nível digital: usuário avançado de WhatsApp e Drive; iniciante-intermediário em ferramentas B2B

**Comportamentos e fluxos atuais:**

- Recebe PDFs das marcas no início de cada coleção (2-4 vezes/ano)
- Distribui PDFs por WhatsApp/e-mail para lojistas
- Recebe pedidos em texto livre, áudio do WhatsApp ou foto de papel
- Consolida em planilha Excel/Google Sheets
- Envia pedido consolidado para marca em PDF/planilha
- Usa CRM rudimentar ou agenda física para carteira

**Necessidades específicas:**

- Reduzir tempo de cadastro de catálogos novos
- Eliminar erros de referência em pedidos
- Ter histórico estruturado de pedidos por marca/lojista
- Profissionalizar a apresentação ao lojista (vitrine digital > PDF cru)
- Controle de quem viu o quê (login obrigatório, sem vazamento de coleção)

**Objetivos que está tentando alcançar:**

- Aumentar volume de pedidos da carteira existente
- Reduzir custo operacional de tirar pedidos
- Reter marcas no portfólio entregando "valor digital"
- Eventualmente escalar para vender online direto sem força de vendas física

### Secondary User Segment: Lojista-Comprador (Cliente Final B2B)

**Perfil:**

- Dono(a) ou compradora de loja física multimarcas (moda, calçados, acessórios)
- Empresa com 1-10 funcionários
- Faz pedidos sazonais para reposição de coleção
- Idade: 25-55 anos, predominantemente feminino no varejo de moda
- Usuário pesado de WhatsApp e Instagram; digitalização B2B em estágio inicial

**Comportamentos atuais:**

- Recebe PDFs no WhatsApp do representante
- Folheia no celular ou imprime para "marcar" produtos
- Devolve pedido em foto de papel, lista no WhatsApp ou áudio
- Frequentemente refaz/corrige pedido por confusão de referências

**Necessidades específicas:**

- Navegação visual mantida (não quer "tabela seca" — quer o lookbook)
- Conferência fácil do que pediu (carrinho claro)
- Comprovante do pedido (PDF) para arquivo
- Acesso mobile-first
- Velocidade — uma sessão de pedido de 30-60 minutos não pode travar

**Objetivos:**

- Montar mix de coleção rapidamente
- Errar menos referências
- Comparar coleções entre marcas
- Ter histórico do que pediu

[AUTO-DECISION] Definição dos segmentos → adotar modelo "Administrador-Distribuidor primário + Lojista-Comprador secundário" (razão: o spawn prompt descreve dois papéis assimétricos — admin é o pagante/operador, lojista é o consumidor; a hierarquia primário/secundário reflete quem decide a compra do produto).

---

## Goals & Success Metrics

### Business Objectives

- **B1 — Reduzir tempo de cadastro de catálogo:** atingir tempo médio de **<60 minutos** do upload do PDF à vitrine publicada (vs. baseline estimado de 8-40h manuais) até o final do 1º trimestre pós-lançamento.
- **B2 — Validar product-market fit operacional:** ter **>=3 distribuidores piloto** rodando coleção completa na plataforma dentro de 6 meses após o MVP.
- **B3 — Volume transacionado:** processar **>=500 pedidos** estruturados via plataforma em 6 meses, distribuídos em >=10 marcas ativas.
- **B4 — Margem operacional positiva:** custo de extração por catálogo (API GPT-4o Vision) **<R$ 50** em média por catálogo de até 100 SKUs, assegurando que o modelo bring-your-own-key seja viável.
- **B5 — Retenção de admin:** **>=80%** dos distribuidores piloto seguem usando 90 dias após onboarding.

### User Success Metrics

- **U1 — Admin: taxa de aceitação da extração:** **>=85%** dos produtos extraídos pela IA são aprovados pelo admin sem edição (mede precisão do prompt + modelo).
- **U2 — Lojista: taxa de conclusão do carrinho:** **>=70%** das sessões de carrinho não-vazio resultam em "Enviar Pedido" (vs. abandono).
- **U3 — Lojista: redução de retrabalho:** **<5%** dos pedidos enviados via CAMMES precisam de correção por confusão de referência (vs. 10-25% estimados no fluxo atual).
- **U4 — Lojista: NPS:** NPS >=40 após o 2º pedido pela plataforma.
- **U5 — Admin: tempo de processamento de pedido pós-envio:** **<10 minutos** entre receber o pedido na plataforma e repassar para a marca (vs. horas/dias na consolidação manual).

### Key Performance Indicators (KPIs)

- **KPI-1: Tempo Médio de Catálogo→Vitrine (TMCV):** Tempo da operação de upload até `published=true`. **Meta:** <60 min médios, p95 <2h.
- **KPI-2: Taxa de Precisão da Extração (TPE):** % de campos por produto extraídos corretamente (referência, descrição, tamanho, preço). **Meta:** >=90% por campo, >=85% por produto completo.
- **KPI-3: Pedidos Estruturados Enviados (PEE):** Contagem mensal de pedidos finalizados. **Meta:** crescimento 20% MoM nos primeiros 6 meses.
- **KPI-4: Custo Médio de Extração (CME):** Spend OpenAI / nº catálogos processados. **Meta:** <R$ 50 / catálogo de até 100 SKUs.
- **KPI-5: Active Brand Stores (ABS):** Nº de vitrines com `published=true` e pelo menos 1 pedido nos últimos 30 dias. **Meta:** >=10 ao fim do 6º mês.
- **KPI-6: Conversion to Order (CtO):** Sessões de cliente com produto adicionado / sessões com pedido enviado. **Meta:** >=70%.
- **KPI-7: Admin Active Daily (AAD):** Nº de logins admin/dia com ação relevante. **Meta:** >=50% dos admins ativos diariamente em semanas de coleção.

[AUTO-DECISION] Métricas SMART → operacionalizar todas via eventos de produto registrados no Supabase com timestamps server-side (razão: garantir mensuração honesta desde o dia 1, sem depender de Google Analytics; analytics pode ser adicionado em Phase 2).

---

## MVP Scope

### Core Features (Must Have)

- **Autenticação obrigatória (Supabase Auth):** Login/senha para admin e cliente. Sem qualquer rota pública de conteúdo. Logout, recuperação de senha. **Rationale:** requisito de negócio explícito ("acesso 100% restrito"); base de toda a navegação.

- **Upload de catálogo PDF (admin):** Interface drag-drop, validação de tamanho (limite inicial ~50MB), armazenamento em Supabase Storage com bucket privado por marca. **Rationale:** porta de entrada do fluxo; sem isto, não há produto.

- **Extração via GPT-4o Vision:** Pipeline assíncrono que envia páginas do PDF (convertidas em imagens) para o GPT-4o Vision com prompt estruturado, retornando JSON de produtos (referência, descrição, tamanhos, cor, preço, imagem-recorte). Persistência em tabela `products` particionada por `brand_id`. **Rationale:** núcleo diferenciador do produto; sem IA, é mais um CMS.

- **Tela de revisão pós-extração (admin):** Lista os produtos extraídos com a foto correspondente, permite editar campos, marcar como "ignorar", reordenar e mapear LOOKs. **Rationale:** ponte entre extração imperfeita e vitrine confiável; gate de qualidade humano obrigatório.

- **Gestão de chave OpenAI (admin):** Tela onde admin cola sua API key (criptografada em repouso no Supabase com `vault` ou coluna pgcrypto), com teste de conexão. **Rationale:** modelo BYOK explicitamente requerido; desloca custo de inferência.

- **Vitrine por marca (cliente):** Página `brands/{slug}` com grid de cards de produto, filtro por busca textual, botão "Baixar catálogo PDF original". **Rationale:** experiência principal do cliente; espelha o ritual atual do lookbook.

- **Estados PUBLICADO/NÃO PUBLICADO:** Toggle por marca; vitrines não publicadas invisíveis para clientes. **Rationale:** controle editorial do admin antes de expor extração.

- **Seleção de produto via popup ESCOLHER:** Modal mostra tamanhos/cores disponíveis (se houver >1 opção), input de quantidade, botão ESCOLHIDO que adiciona ao carrinho. **Rationale:** UX explicitamente descrito no spawn prompt; padroniza a captura do pedido.

- **Carrinho tabular (8 colunas obrigatórias):** Tabela com REFERÊNCIA, DESCRIÇÃO, COR, TAMANHO, QUANTIDADE, NOME DO CLIENTE, VALOR DA PEÇA, VALOR TOTAL. Edição inline de quantidade, remoção de item, persistência server-side por usuário+marca. **Rationale:** formato definido como obrigatório; itens de mesmo LOOK ficam separados.

- **Envio do pedido + geração de PDF:** Botão ENVIAR PEDIDO cria registro em `orders` (tabela específica por marca), gera PDF do pedido (server-side, ex.: `@react-pdf/renderer` ou Puppeteer em edge function), oferece download para cliente, dispara notificação ao admin. **Rationale:** fecha o ciclo de pedido; PDF é o "contrato" entre cliente e admin.

- **Painel de pedidos por marca (admin):** Lista de pedidos recebidos, filtro por marca/cliente/data, visualização e download do PDF de cada pedido. **Rationale:** sem isso, o admin não consegue operar; lado oposto necessário do envio.

- **Multitenancy por marca via RLS:** Cada `brand_id` isolado por Row-Level Security do Supabase; cliente só vê marcas publicadas; produtos e pedidos consultáveis apenas por contexto de marca. **Rationale:** decisão técnica já feita; pré-requisito de segurança.

### Out of Scope for MVP

- Checkout/pagamento online (Stripe, Pix, boleto) — fora por requisito de negócio
- Multitenancy de **distribuidor** (admin único no MVP, vários distribuidores em Phase 2)
- Aprovação/recusa de pedido pelo admin com fluxo automatizado de status (recebido → aceito → enviado)
- Notificações por e-mail/WhatsApp do admin para cliente (apenas notificação simples ao admin no MVP)
- Analytics dashboard (mais que contagens básicas)
- Versionamento de catálogo (re-upload do mesmo PDF reescreve)
- Multi-idiomas (pt-BR only)
- App mobile nativo (apenas web responsiva)
- Integração com ERPs ou força de vendas
- API pública para terceiros
- Editor visual de vitrine (cores de marca, logos customizadas) — apenas padrão neutro no MVP
- Suporte a múltiplos LLM providers (apenas OpenAI no MVP)
- Histórico de extrações / re-extração com modelo diferente
- Catálogos não-PDF (imagens soltas, Excel, etc.)
- Importação direta de Instagram/site da marca

### MVP Success Criteria

O MVP será considerado bem-sucedido se, em **90 dias após o lançamento**:

1. **1 distribuidor real** opera **>=3 marcas** publicadas com **>=5 lojistas reais** ativos
2. **TPE >=85%** medido em amostra de 5 catálogos processados
3. **>=50 pedidos** enviados pela plataforma com **<5% de retrabalho** (cliente ou admin pedindo correção)
4. **TMCV <60min médios** medido em todos os catálogos processados
5. **Zero incidentes de segurança** (vazamento de coleção a usuário não autorizado, credencial OpenAI exposta)
6. **Custo OpenAI/catálogo <R$ 50** confirmado pelo billing

Se >=4 dos 6 critérios atingidos → seguir para Phase 2. Se <4 → revisar product-market fit antes de expandir.

[AUTO-DECISION] Geração de PDF do pedido → usar `@react-pdf/renderer` server-side via API route do Next.js (razão: integração nativa com Next.js, sem dependência de Chromium headless, custo computacional menor que Puppeteer; trade-off: layout mais simples — aceitável para pedido tabular).

[AUTO-DECISION] Estratégia de Vision para PDF → converter cada página do PDF em imagem PNG (via `pdfjs-dist` ou `pdf2pic`) e enviar como `image_url` para GPT-4o (razão: GPT-4o aceita imagens; PDFs nativos têm suporte limitado e oneroso; trade-off de upload bytes aceito).

---

## Post-MVP Vision

### Phase 2 Features

- **Multitenancy de distribuidor:** múltiplos admins/empresas operando em isolamento total, com plano/cobrança por catálogo.
- **Dashboard analytics:** vendas por marca/SKU/cliente, heatmap de produtos mais escolhidos, taxa de conversão por vitrine.
- **Workflow de pedido (status):** pedido recebido → em análise → aprovado/recusado → enviado → entregue, com notificações automáticas.
- **Notificações multicanal:** e-mail (Resend) + WhatsApp (Twilio/MetaWA Business API) para cliente e admin.
- **Editor de vitrine:** cores, logo, banner por marca; preview em desktop/mobile.
- **Suporte multi-LLM:** Claude Vision, Gemini, modelos open-source self-hosted; admin escolhe o provider.
- **Re-extração / versionamento:** preservar histórico de versões da mesma marca/coleção.
- **Catálogo Excel/imagens soltas:** ampliar formatos além de PDF.
- **App mobile (PWA aprimorada ou nativo Capacitor):** offline-first para lojista em viagem.
- **Histórico do cliente:** "meus pedidos anteriores", repetir pedido, sugestões.

### Long-term Vision (1-2 anos)

- **Marketplace federado:** distribuidores publicam suas marcas em um diretório opt-in; lojistas podem solicitar acesso a vitrines de novos distribuidores.
- **IA prescritiva para o lojista:** "com base na sua loja, sugerimos estas 20 peças da coleção".
- **API pública + integrações:** Bling, Tiny, Omie, SAP — empurrar pedidos para ERPs.
- **Capacidades de IA para o admin:** geração automática de descrições aprimoradas, tradução para outros mercados, montagem de "kits" sugeridos.
- **B2C white-label:** modo opcional onde a vitrine vira loja com checkout para o consumidor final (e nesse modo, sim, com pagamento online).

### Expansion Opportunities

- **Verticais adjacentes:** decoração (Mor, Camicado, fornecedores de utilidades), cosméticos profissionais, calçados infantis, joalheria — tudo que opera por catálogo PDF B2B.
- **Internacionalização:** mercados latino-americanos com perfil similar (México, Argentina, Chile, Colômbia).
- **Marketplace de templates de extração:** comunidade compartilha prompts otimizados por categoria de catálogo.
- **Serviço de "PDF-to-Catalog as a Service":** API endpoint para que terceiros (Shopify apps, ERPs) consumam a extração.
- **Camada de cross-merch:** insights agregados (anônimos) sobre tendências de pedido entre distribuidores.

---

## Technical Considerations

### Platform Requirements

- **Target Platforms:** Web responsiva (desktop + mobile). PWA opcional no MVP, app nativo fora do escopo MVP.
- **Browser/OS Support:** Chrome/Edge/Safari/Firefox versões dos últimos 24 meses; iOS Safari 15+; Android Chrome 100+. Sem suporte a IE.
- **Performance Requirements:**
  - First Contentful Paint <2.0s em 4G
  - Time to Interactive <3.5s em 4G
  - Página de vitrine com 100 produtos deve renderizar <3s com lazy-loading de imagens
  - Pipeline de extração de catálogo de 50 páginas: tempo total <10 min p95
  - Geração de PDF de pedido <5s p95

### Technology Preferences

- **Frontend:** **Next.js 14+** (App Router), React 18, TypeScript estrito, Tailwind CSS + shadcn/ui para componentes. Server Components onde possível para reduzir bundle do cliente.
- **Backend:** API Routes do Next.js + **Supabase Edge Functions** (Deno) para pipeline de extração assíncrona. Filas via Supabase `pg_cron` + `pg_net` ou Upstash Queue para jobs longos de extração.
- **Database:** **PostgreSQL via Supabase** com Row-Level Security. Schemas isolados por `brand_id`. `pgvector` opcional em Phase 2 para busca semântica.
- **Hosting/Infrastructure:** **Vercel** para Next.js (Edge Network), **Supabase Cloud** para DB+Auth+Storage+Edge Functions. CDN nativa Vercel para assets estáticos.

### Architecture Considerations

- **Repository Structure:** **Monorepo** com Turborepo ou estrutura simples Next.js. Diretórios: `app/`, `components/`, `lib/`, `supabase/migrations/`, `supabase/functions/`. ADR-001 a ser escrito por @architect sobre monorepo vs. single repo.
- **Service Architecture:**
  - Camada Next.js (UI + API REST/Server Actions)
  - Camada Supabase (Auth, DB, Storage, Edge Functions)
  - Worker assíncrono para extração (Edge Function disparada por trigger de upload)
  - OpenAI GPT-4o Vision como dependência externa (configurada por admin)
- **Integration Requirements:**
  - **OpenAI API** (GPT-4o Vision) — credencial fornecida pelo admin, armazenada criptografada
  - **Supabase Storage** para PDFs originais e imagens extraídas (buckets privados, signed URLs)
  - PDF→Image: `pdfjs-dist` (cliente) ou `pdf-to-png-converter` (server)
  - PDF de pedido: `@react-pdf/renderer`
  - Email transacional (opcional MVP): Resend ou Supabase SMTP
- **Security/Compliance:**
  - LGPD: dados de clientes lojistas são PII básica (nome, e-mail) — necessário consentimento de cadastro, política de privacidade, DPO designado pelo distribuidor.
  - Criptografia da API key OpenAI em repouso (Supabase Vault ou pgcrypto com chave gerida via env var)
  - RLS obrigatório em todas as tabelas que contêm `brand_id` ou `user_id`
  - HTTPS-only, HSTS, CSP estrita
  - Rate limiting nas rotas de auth e extração
  - Auditoria de acessos a catálogos não publicados
  - **Article IV (No Invention):** todo recurso implementado deve rastrear a FR/NFR/CON do PRD

[AUTO-DECISION] Estratégia de fila para extração → começar com Supabase `pg_cron` + tabela `extraction_jobs` simples; promover para Upstash QStash apenas se filas atingirem >100 jobs/dia (razão: simplicidade no MVP, evita dependência extra; trade-off de throughput aceito).

[AUTO-DECISION] Repo structure → single Next.js repository no MVP (não monorepo) (razão: complexidade desnecessária para escopo MVP, sem packages compartilháveis; decisão revisitada quando Phase 2 introduzir mobile app ou pacotes shared).

---

## Constraints & Assumptions

### Constraints

- **Budget:** **Não declarado explicitamente no spawn prompt.** [AUTO-DECISION] Assumir orçamento de bootstrap (R$ 0-50k para MVP, excluindo custo de tempo do dev), com infra dimensionada para Supabase free→Pro (R$ ~125/mês) e Vercel Hobby→Pro (R$ ~100/mês). API OpenAI: BYOK pelo admin (custo do admin, não da plataforma). Confiança: BAIXA — recomenda-se confirmar com stakeholder antes de Phase 2.
- **Timeline:** Não declarada. [AUTO-DECISION] Assumir MVP em **8-12 semanas** com 1 dev full-stack +0.5 designer +0.25 PM, baseado em escopo de ~12 features core. Revisar após PRD definir granularidade real.
- **Resources:** Equipe presumida mínima viável: 1 fullstack senior, acesso a designer part-time, PO/PM atuando. Sem time de QA dedicado no MVP — @qa atua via AIOX no fluxo de stories.
- **Technical:**
  - Dependência crítica em disponibilidade e estabilidade da API OpenAI GPT-4o Vision
  - Limites de upload do Vercel (4.5MB para função serverless padrão) podem forçar uso de Supabase Storage com upload direto cliente→Supabase (signed URL), bypassando Vercel
  - Supabase free tier tem limite de 500MB DB e 1GB Storage — produção exigirá Pro ($25/mês) desde o lançamento
  - Tempo de cold start de Edge Functions Supabase pode impactar UX em ações pouco frequentes
  - Custo por catálogo (input tokens de imagem) escala linear com nº de páginas — catálogos >100 páginas podem exceder R$ 50/extração

### Key Assumptions

- O administrador-distribuidor tem disposição e capacidade de **gerar e gerenciar uma API key OpenAI** (cobrança em USD no cartão de crédito).
- GPT-4o Vision atinge **>=85% de precisão** na extração de produtos de catálogos típicos do segmento (PDFs com fotos claras, referências textuais visíveis, layout consistente dentro de cada catálogo). **Esta é a assunção mais crítica** — deve ser validada por POC no primeiro sprint.
- Catálogos PDF típicos do segmento têm **<=200 produtos e <=100 páginas** (catálogos maiores serão exceção e podem exigir tratamento especial).
- Distribuidores estão dispostos a investir tempo na **revisão pós-extração** (15-30 min por catálogo) — não esperam 100% automatizado.
- Lojistas-clientes têm acesso confiável à internet em horário comercial (não há requisito offline-first no MVP).
- O modelo de **um pedido por marca por sessão** (carrinho separado por marca) é aceitável para o lojista; não há pedido cross-brand.
- Supabase RLS é suficiente para isolamento de tenant por marca (não precisa de schemas/databases separados).
- O mercado-alvo (varejo de moda B2B Brasil) tem dor real e disposição-a-pagar compatível com um SaaS de R$ 200-500/mês por distribuidor em Phase 2.
- O modelo "sem pagamento online" continuará válido — distribuidores não vão exigir checkout integrado no MVP.
- Não há requisito legal/regulatório de retenção fiscal sobre o pedido (não é nota fiscal, é "intenção de compra").
- Conteúdo dos catálogos não tem material restrito (NSFW, regulado) que precise de moderação extra do LLM.

---

## Risks & Open Questions

### Key Risks

- **R1 — Precisão da extração abaixo do esperado:** GPT-4o Vision pode falhar em catálogos com layouts atípicos, fotos pequenas, fontes estilizadas. **Impacto:** alto retrabalho de admin, derrota da proposta de valor. **Mitigação:** POC obrigatório no Sprint 1 com 5 catálogos reais variados; prompt engineering iterativo; fallback de edição manual sempre disponível.

- **R2 — Custo de extração inviável:** catálogos grandes podem custar muito (input de 100 imagens HD em GPT-4o ~= US$ 5-15 por catálogo). **Impacto:** distribuidor abandona a plataforma quando vê fatura OpenAI. **Mitigação:** estimar custo antes de extrair e mostrar pré-visualização; estratégia de redução de resolução de imagem; processamento em batch.

- **R3 — Vazamento de catálogo (segurança):** falha em RLS ou em rotas autenticadas pode expor coleção da marca a usuário não autorizado. **Impacto:** crítico — quebra de contrato com marca, possível ação judicial. **Mitigação:** auditoria de RLS por @architect e @qa; pen-test antes do go-live; logs de acesso completos; signed URLs com TTL curto para PDFs.

- **R4 — Dependência de fornecedor único (OpenAI):** alteração de preço, deprecação de modelo ou indisponibilidade impacta todo o produto. **Impacto:** alto. **Mitigação:** abstração da camada de extração para permitir trocar provider (mesmo no MVP, deixar a interface preparada); monitorar Claude Vision e Gemini.

- **R5 — Adoção pelo lojista lenta:** lojistas habituados a WhatsApp resistem a "ter que logar em outro app". **Impacto:** baixo volume de pedidos via plataforma. **Mitigação:** onboarding facilitado (link de WhatsApp para a vitrine, primeiro acesso com magic link), UX mobile excelente, treinamento do distribuidor.

- **R6 — Distribuidor não confia em "deixar a IA cadastrar":** sensação de perda de controle, medo de erros de preço. **Impacto:** baixa adesão. **Mitigação:** UX da revisão pós-extração deve ser excelente (diff visual produto×PDF, edição em massa); permitir desativar IA e cadastrar manual em casos críticos.

- **R7 — LGPD e custódia de PII:** distribuidores podem não estar preparados para responsabilidade de dados de seus clientes. **Impacto:** médio (CAMMES como operador, distribuidor como controlador). **Mitigação:** termo de uso claro definindo papéis; minimização de PII coletada; suporte a exclusão sob requisição.

- **R8 — Lock-in com Supabase/Vercel:** dependência de PaaS pode encarecer em escala. **Impacto:** baixo no MVP, crescente. **Mitigação:** usar padrões portáveis (SQL puro, Next.js standalone, não recursos exclusivos do Vercel); ADR documentando estratégia de saída.

- **R9 — Catálogos com layouts radicalmente diferentes entre marcas:** prompt único pode não generalizar. **Impacto:** TPE cai por marca específica. **Mitigação:** templates de extração por marca opcional em Phase 2; flag de qualidade no produto extraído.

- **R10 — Carrinho perdido / sincronização cliente-servidor:** lojista perde sessão e perde 30+ min de seleção. **Impacto:** UX crítica, abandono. **Mitigação:** persistência server-side do carrinho do início; recuperação no próximo login.

### Open Questions

- Qual é o **distribuidor-piloto inicial**? Há contrato/letter of intent?
- Quantos catálogos/coleção típicos no portfólio do piloto? Tamanho médio (páginas/SKUs)?
- Há **acordo legal explícito** das marcas para que seus catálogos sejam processados por IA externa (OpenAI)?
- O **PDF de pedido** precisa ter formato específico (logo do distribuidor? CNPJ? termos legais)?
- Como o **nome do cliente** entra no carrinho — é o usuário logado (cliente final) ou o admin colocando em nome de um cliente B2B do lojista? O spawn prompt sugere que é campo da tabela — clarificar se é editável ou auto-preenchido.
- Há requisito de **multi-usuário por lojista** (vários compradores na mesma loja com o mesmo login)?
- Política de **expiração de coleção** — vitrine some automaticamente após N dias?
- Há **mínimos de pedido por marca** (valor mínimo, quantidade mínima de peças)?
- **Quem paga pela infra Supabase/Vercel** no MVP — CAMMES (gratuito para pilotos) ou os distribuidores?
- Modelo de monetização pós-MVP — SaaS mensal? Por catálogo? Comissão sobre pedido?

### Areas Needing Further Research

- **Validação primária do problema:** entrevistas com 5-10 distribuidores reais (não apenas o piloto) para confirmar magnitude da dor e disposição a pagar.
- **Benchmark competitivo profundo:** Mercos, Meu Representante, Linx, Bling, Catálogo Online — features, preço, gaps reais.
- **POC de extração:** rodar GPT-4o Vision em 5 catálogos reais de tipos variados (moda feminina, calçados, decoração, acessórios, infantil) e medir TPE empírico.
- **Análise de custo OpenAI por catálogo real:** medir tokens de input/output em catálogos reais para calibrar custo médio.
- **Pesquisa de UX com lojistas:** observar 3-5 lojistas fazendo pedido pelo fluxo atual (WhatsApp) e prototipar o fluxo CAMMES com eles.
- **Análise jurídica:** custódia de catálogos (direitos autorais das marcas), LGPD, termos de uso necessários.
- **Análise de viabilidade técnica do Vercel + Supabase para volume estimado:** verificar limites de banda/Storage/Edge Functions.
- **Acessibilidade (a11y):** lojistas idosas no varejo de moda exigem atenção a contraste, tamanho de fonte, navegação por teclado.

---

## Appendices

### A. Research Summary

Pesquisa primária ainda **não realizada** no momento deste brief. Insumos atuais derivam de:

- Descrição funcional fornecida pelo Product Owner no spawn prompt (fluxo admin/cliente, regras de negócio, decisões técnicas)
- Conhecimento setorial geral sobre varejo B2B de moda brasileiro (estimativas com confiança MÉDIA)
- Best practices conhecidas de Next.js + Supabase + LLM-as-extractor

**Recomendação:** antes da Phase 2 do workflow greenfield-fullstack (criação do PRD), encomendar tasks subsequentes do @analyst:

1. `market-research` — dimensionamento de mercado e segmentação
2. `competitor-analysis` — Mercos, Meu Representante, Catálogo Online, alternativas
3. `deep-research` — viabilidade técnica do GPT-4o Vision em catálogos de moda

### B. Stakeholder Input

- **Product Owner (spawn prompt):** Especificação funcional inicial fornecida, incluindo decisões técnicas (Next.js, Supabase, GPT-4o Vision, Vercel) e regras de negócio (sem checkout online, acesso 100% gated, formato tabular obrigatório).
- **Outros stakeholders:** ainda não consultados.

### C. References

- Documentação Next.js: https://nextjs.org/docs
- Documentação Supabase (Auth, Storage, RLS): https://supabase.com/docs
- OpenAI GPT-4o Vision (API): https://platform.openai.com/docs/guides/vision
- AIOX Framework Constitution: `.aiox-core/constitution.md`
- AIOX Workflow Greenfield Fullstack: (referência implícita do mission)
- @react-pdf/renderer: https://react-pdf.org/
- pdfjs-dist: https://github.com/mozilla/pdfjs-dist
- LGPD (Lei 13.709/2018) — diretrizes da ANPD

---

## Next Steps

### Immediate Actions

1. **@pm (Morgan) recebe este brief e inicia criação do PRD** usando template `prd-tmpl.yaml`, transformando seções deste brief em FR (Functional Requirements), NFR (Non-Functional Requirements) e CON (Constraints) numerados.
2. **@analyst (Atlas) executa, em paralelo ao PRD, as pesquisas complementares** (`market-research`, `competitor-analysis`, `deep-research` sobre viabilidade GPT-4o Vision).
3. **@architect (Aria) inicia rascunho de arquitetura técnica** com base nas decisões técnicas declaradas (Next.js, Supabase, Vercel) — produzir ADR-001 (repo structure), ADR-002 (extração pipeline), ADR-003 (multitenancy strategy).
4. **@po (Pax) prepara epic skeleton** para os blocos: Auth & Multitenancy, Catalog Upload & Extraction, Brand Storefront, Cart & Order, Admin Operations.
5. **POC obrigatório no Sprint 0:** rodar GPT-4o Vision em 5 catálogos reais variados; medir TPE; calibrar custo médio; validar a assunção mais crítica do projeto antes de comprometer escopo.
6. **Validação primária com piloto:** entrevista de descoberta com o distribuidor-piloto inicial para confirmar fluxos descritos e capturar requisitos não-funcionais (formato do PDF de pedido, política de mínimos, etc.).
7. **Estabelecer baseline de métricas:** instrumentar telemetria mínima (Supabase logs + eventos customizados) já no MVP para que KPIs sejam mensuráveis desde o dia 1.

### PM Handoff

This Project Brief provides the full context for **CAMMES — Catálogo Multimarcas com Extração Estruturada**. Please start in 'PRD Generation Mode', review the brief thoroughly to work with the user to create the PRD section by section as the template indicates, asking for any necessary clarification or suggesting improvements.

**Prioridades para o PRD:**
- Detalhar Functional Requirements (FR-*) para cada feature listada em "Core Features (Must Have)" — especialmente o pipeline de extração e o carrinho tabular de 8 colunas
- Estabelecer NFRs explícitos para performance, segurança (RLS), LGPD e custo de extração
- Numerar Constraints (CON-*) refletindo as decisões técnicas e os limites de orçamento/timeline
- Identificar gaps de informação que demandam pesquisa do @analyst antes de avançar
- Validar com o usuário as 10 Open Questions deste brief
- Confirmar ou ajustar os critérios de sucesso do MVP (4-de-6 ou outro)
- Especificar fluxos de erro e recuperação (falha na extração, sessão expirada, etc.)
- Reforçar Article IV (No Invention) — todo FR deve traçar a um item deste brief ou a uma pesquisa documentada

> **Próximo workflow:** Phase 2 — PRD Creation (@pm) → Phase 3 — Architecture (@architect) → Phase 4 — Epic/Story decomposition (@po + @sm) → Phase 5 — Implementation (@dev + @qa).

---

*Documento gerado por Atlas (@analyst) em modo YOLO autônomo. Decisões `[AUTO-DECISION]` estão marcadas no corpo do documento e devem ser revisadas pelo Product Owner antes do PRD.*
