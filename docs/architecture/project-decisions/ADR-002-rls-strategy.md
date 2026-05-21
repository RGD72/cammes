# ADR-002: Supabase RLS como Camada Exclusiva de Isolamento Multi-Tenant

**Status:** Aceito
**Data:** 2026-05-21
**Story:** 1.6 — RLS Audit Foundation
**Autores:** Dex (@dev), validado por @qa

---

## Contexto

O Cammes é uma plataforma multi-tenant onde admins gerenciam marcas e clientes acessam catálogos de produtos por marca. O risco mais crítico identificado no Project Brief (R3) é o **vazamento cross-tenant de dados de marca**: um cliente da marca A nunca pode ver dados da marca B, e o admin A nunca pode ver dados do admin B.

As tabelas centrais de isolamento são:
- `brands` — propriedade exclusiva de cada admin (`owner_admin_id`)
- `user_brand_access` — autoriza clientes a acessar marcas específicas
- `users_profile` — dados de perfil, acesso isolado por usuário

O sistema usa Supabase (PostgreSQL) com Row Level Security disponível nativamente.

---

## Decisão

**Usar Supabase Row Level Security (RLS) como camada exclusiva de isolamento multi-tenant**, sem filtros de isolamento na camada de aplicação (código Next.js/API).

Todas as queries ao Supabase das APIs e Server Components usam o cliente anon/user (com JWT do usuário autenticado), garantindo que as políticas RLS se apliquem automaticamente em cada operação.

O service role key é usado exclusivamente para:
- Testes de integração (setup de fixtures)
- Operações administrativas de sistema (não expostas a usuários finais)

---

## Rationale

### Por que RLS e não filtros de aplicação?

| Critério | RLS no PostgreSQL | Filtros de Aplicação |
|----------|-------------------|----------------------|
| **Camada de enforcement** | PostgreSQL (banco) | Código da aplicação |
| **Bypass por bug de código** | Impossível | Possível (filter omitido = leak) |
| **Bypass por SQL injection** | Impossível (contexto auth.uid()) | Risco existe |
| **Auditabilidade** | `pg_policy` catalog consultável | Requer code review manual |
| **Performance com subquery** | Overhead em queries complexas | Sem overhead de subquery |
| **Cobertura de todas as rotas** | Automática (qualquer cliente) | Manual (cada rota precisa filtrar) |

O principal argumento é: **RLS não pode ser bypassado por bugs de código**. Um desenvolvedor que esquece um `.eq('owner_admin_id', userId)` em uma rota nova não cria um vazamento de dados — o PostgreSQL nega o acesso na camada de banco independente do que o código faz.

### Por que não dupla camada (RLS + filtros de aplicação)?

Dupla camada cria falsa segurança: desenvolvedores passam a confiar no filtro de aplicação e potencialmente relaxam os testes de RLS. A camada única no banco, com testes de integração automatizados, é mais auditável e mantém a responsabilidade clara.

---

## Políticas Implementadas

### Tabela `users_profile`

| Política | Operação | Quem acessa |
|----------|----------|-------------|
| `users_profile_self_read` | SELECT | Usuário lê próprio perfil |
| `users_profile_admin_read_customers` | SELECT | Admin lê perfis de customers |
| `users_profile_self_update` | UPDATE | Usuário atualiza próprio perfil |

### Tabela `brands`

| Política | Operação | Quem acessa |
|----------|----------|-------------|
| `brands_admin_full` | ALL | Admin tem controle total sobre suas próprias brands |
| `brands_customer_read_published` | SELECT | Customer com acesso ativo lê brands publicadas |

### Tabela `user_brand_access`

| Política | Operação | Quem acessa |
|----------|----------|-------------|
| `uba_admin_manage` | ALL | Admin gerencia acessos para suas brands |
| `uba_self_read` | SELECT | Customer lê próprios acessos |

**Referência completa:** `docs/qa/rls-test-matrix.md`

---

## Consequências

### Positivas

- **Impossível vazar dados por bug de aplicação** — o banco rejeita a query
- **Auditável** — políticas visíveis via `SELECT * FROM pg_policies WHERE tablename = 'brands'`
- **Cobertura universal** — qualquer cliente (API, SDK, SQL direto) obedece as políticas
- **Testes de regressão automáticos** — `npm run test:integration` detecta qualquer enfraquecimento de política

### Negativas e Mitigações

- **Performance com subquery em `brands_customer_read_published`:** a policy faz subquery em `user_brand_access`. Para MVP com volume baixo (< 1000 brands, < 100 customers simultâneos), o overhead é aceitável. Mitigação: índice `idx_uba_user_active` cobre o padrão de acesso. Reavaliação pós-MVP com `EXPLAIN ANALYZE`.

- **Testes precisam de banco real:** integration tests não podem usar mocks — a política RLS executa no PostgreSQL. O CI usa `supabase start` para banco local. Custo: ~60–90s adicionais no pipeline de CI.

- **Service role bypassa RLS:** qualquer operação com o service role key ignora políticas. Por isso, o service role key **nunca deve ter prefixo `NEXT_PUBLIC_`** e nunca deve ser usado em código exposto ao cliente.

---

## Alternativas Rejeitadas

### Filtros de aplicação (middleware/hooks)

Rejeitado porque:
1. Requer que todo desenvolvedor lembre de aplicar o filtro em cada nova rota
2. Um filtro omitido = vazamento de dados em produção
3. Não auditável sem code review completo

### RLS + filtros de aplicação (dupla camada)

Rejeitado porque:
1. Cria responsabilidade duplicada e confusa
2. Desenvolvedores tendem a testar apenas a camada de aplicação
3. Complexidade adicional sem ganho de segurança real (RLS já é suficiente)

---

## Referências

- Matriz de testes RLS: `docs/qa/rls-test-matrix.md`
- Data model: `docs/architecture/data-model-skeleton.md`
- Migrations: `supabase/migrations/20260520000020_brands.sql`, `20260520000030_user_brand_access.sql`
- Integration tests: `tests/integration/rls/`
- PRD — Technical Assumptions 4.3: "Integration tests obrigatórios para políticas RLS"
