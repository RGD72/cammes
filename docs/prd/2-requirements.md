# 2. Requirements

## 2.1 Functional Requirements

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

## 2.2 Non-Functional Requirements

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
