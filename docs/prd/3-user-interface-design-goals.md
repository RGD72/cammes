# 3. User Interface Design Goals

## 3.1 Overall UX Vision

A experiência CAMMES equilibra **densidade informacional B2B** (necessária para o admin operar dezenas de marcas e produtos) com **leveza visual de lookbook** (essencial para o lojista que está acostumado a folhear catálogos visuais no WhatsApp). A linha condutora é "transformar o ritual do PDF em uma navegação digital sem perder a alma visual do catálogo".

- **Para o admin:** funcional, denso, com atalhos de teclado, tabelas filtráveis e ações em massa — visual neutro tipo dashboard moderno (Linear/Vercel/Supabase studio).
- **Para o cliente:** visual generoso, cards com imagens grandes, transições suaves, foco em mobile — referência estética é Instagram Shop + lookbooks editoriais.
- **Tom de voz:** profissional, conciso, em pt-BR coloquial (não rebuscado). Microcopy clara e direta, sem jargão técnico.

## 3.2 Key Interaction Paradigms

- **Drag-and-drop** para upload de PDF no admin, com feedback de progresso e estado de processamento assíncrono.
- **Revisão por edição inline** na tela pós-extração — o admin clica em qualquer campo e edita diretamente, com salvamento otimista e diff visual entre extração e edição.
- **Modal de seleção (ESCOLHER → ESCOLHIDO)** como padrão central do cliente — popup compacto com tamanhos/cores em chips/pills e quantidade em stepper.
- **Carrinho como tabela editável** — não cards, não lista; tabela densa com edição inline de quantidade, ordenação por coluna e total dinâmico em rodapé fixo.
- **Estados sempre visíveis** — "publicado/não publicado", "extração em progresso", "pedido enviado" sempre com badges/chips coloridos e tooltips explicativos.
- **Mobile-first no fluxo do cliente** — touch targets >=44px, gestos de swipe em galerias de imagens, scroll vertical priorizado.

## 3.3 Core Screens and Views

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

## 3.4 Accessibility

**Accessibility: WCAG AA** — alvo formal para o MVP, com particular atenção a contraste (>=4.5:1), foco visível em elementos interativos, navegação 100% por teclado nas telas do cliente, e textos alternativos em imagens de produto extraídas (gerados a partir da descrição).

## 3.5 Branding

No MVP, a vitrine adota um **tema neutro/elegante** (paleta clara, tipografia sans-serif moderna — Inter ou Geist Sans, cantos arredondados sutis 8-12px, sombras suaves). Cada marca pode opcionalmente fazer upload do logo, exibido no header da sua vitrine. Editor visual avançado (cores customizadas por marca, banners, fontes da marca) fica para Phase 2.

O painel admin segue estética de dashboard moderno (cinzas neutros, acento azul/violeta, densidade média, monoespaçada para identificadores técnicos como referências e IDs).

## 3.6 Target Device and Platforms

**Target Device and Platforms: Web Responsive** — web responsiva única que atende desktop (admin majoritariamente) e mobile (cliente majoritariamente). Não há app nativo no MVP; PWA installable é opcional/post-MVP.

---
