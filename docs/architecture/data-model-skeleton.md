# Data Model Skeleton — CAMMES MVP

> Fonte canônica: `docs/architecture.md#9-database-schema` e `docs/architecture.md#4-data-models`
> Gerado em: Story 1.2

## Tabelas do Epic 1 (Schema Inicial)

---

## users_profile

Perfis de usuários do sistema. Sincronizado com `auth.users` (Supabase Auth).

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| id | UUID | NO | — | PK + FK → auth.users(id) ON DELETE CASCADE |
| role | user_role | NO | — | Enum: `admin` / `customer` |
| full_name | TEXT | NO | — | Nome completo |
| email | TEXT | NO | — | Único; espelho de auth.users.email |
| phone | TEXT | YES | NULL | PII opcional |
| is_active | BOOLEAN | NO | true | Soft deactivation |
| created_at | TIMESTAMPTZ | NO | now() | — |
| updated_at | TIMESTAMPTZ | NO | now() | — |

**Tipo enum:** `user_role ENUM ('admin', 'customer')`

**Índices:** `idx_users_profile_role ON users_profile(role)`

**RLS Policies:**
| Policy | Operação | Condição |
|--------|----------|----------|
| users_profile_self_read | SELECT | `id = auth.uid()` |
| users_profile_admin_read_customers | SELECT | `role = 'customer' AND caller é admin` |
| users_profile_self_update | UPDATE | `id = auth.uid()` |

**Relacionamentos:**
- 1:N com `brands` (owner_admin_id)
- 1:N com `user_brand_access` (user_id, granted_by)

---

## brands

Marcas de moda cadastradas por admins. Cada marca pertence a um admin.

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| id | UUID | NO | gen_random_uuid() | PK |
| slug | TEXT | NO | — | Único; regex `^[a-z0-9-]+$` |
| name | TEXT | NO | — | Nome da marca |
| description | TEXT | YES | NULL | Descrição opcional |
| logo_url | TEXT | YES | NULL | URL do logotipo |
| published | BOOLEAN | NO | false | Visibilidade pública |
| owner_admin_id | UUID | NO | — | FK → users_profile(id) |
| published_at | TIMESTAMPTZ | YES | NULL | Data de publicação |
| created_at | TIMESTAMPTZ | NO | now() | — |
| updated_at | TIMESTAMPTZ | NO | now() | — |

**Índices:**
- `idx_brands_owner ON brands(owner_admin_id)`
- `idx_brands_published ON brands(published) WHERE published = true` (partial)

**RLS Policies:**
| Policy | Operação | Condição |
|--------|----------|----------|
| brands_admin_full | ALL | `owner_admin_id = auth.uid() AND caller é admin` |
| brands_customer_read_published | SELECT | `published = true AND user tem acesso ativo via user_brand_access` |

> `brands_customer_read_published` criada em `0030_user_brand_access.sql` por forward-reference constraint.

**Relacionamentos:**
- N:1 com `users_profile` (owner_admin_id)
- 1:N com `user_brand_access` (brand_id)

---

## user_brand_access

Tabela de acesso M:N entre usuários (customers) e marcas. Suporta revogação.

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| user_id | UUID | NO | — | PK + FK → users_profile(id) ON DELETE CASCADE |
| brand_id | UUID | NO | — | PK + FK → brands(id) ON DELETE CASCADE |
| granted_at | TIMESTAMPTZ | NO | now() | Data de concessão do acesso |
| granted_by | UUID | NO | — | FK → users_profile(id); admin que concedeu |
| revoked_at | TIMESTAMPTZ | YES | NULL | NULL = acesso ativo; preenchido = revogado |

**PK composta:** `(user_id, brand_id)`

**Índices:**
- `idx_uba_user_active ON user_brand_access(user_id) WHERE revoked_at IS NULL` (partial)
- `idx_uba_brand_active ON user_brand_access(brand_id) WHERE revoked_at IS NULL` (partial)

**RLS Policies:**
| Policy | Operação | Condição |
|--------|----------|----------|
| uba_admin_manage | ALL | `admin da marca é o caller (via brands.owner_admin_id)` |
| uba_self_read | SELECT | `user_id = auth.uid()` |

**Relacionamentos:**
- N:1 com `users_profile` (user_id, granted_by)
- N:1 com `brands` (brand_id)

---

## products

Produtos extraídos de catálogos por marca. Suporta isolamento RLS por `brand_id`.

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| id | UUID | NO | gen_random_uuid() | PK |
| brand_id | UUID | NO | — | FK → brands(id) ON DELETE CASCADE |
| catalog_id | UUID | YES | NULL | FK → catalogs(id) ON DELETE SET NULL |
| reference | TEXT | YES | NULL | Referência/código do produto |
| description | TEXT | YES | NULL | Descrição do produto |
| sizes | JSONB | YES | NULL | Array de tamanhos disponíveis |
| colors | JSONB | YES | NULL | Array de cores disponíveis |
| price_brl | NUMERIC(10,2) | YES | NULL | Preço em BRL |
| image_crop_url | TEXT | YES | NULL | URL da imagem recortada (FR11) |
| look_group | TEXT | YES | NULL | Agrupamento de look para vitrine |
| source_page | INTEGER | YES | NULL | Página do catálogo de origem |
| extraction_confidence | JSONB | YES | NULL | Confiança por campo (FR36) |
| status | product_status | NO | 'extracted' | Enum: `extracted` / `approved` / `hidden` |
| display_order | INTEGER | YES | NULL | Ordem de exibição na tela de revisão |
| created_at | TIMESTAMPTZ | NO | now() | — |
| updated_at | TIMESTAMPTZ | NO | now() | Gerenciado por trigger |

**Tipo enum:** `product_status ENUM ('extracted', 'approved', 'hidden')`

**Índices:**
- `idx_products_brand_catalog ON products(brand_id, catalog_id)` — Story 2.4
- `idx_products_brand_status ON products(brand_id, status)` — Story 2.4
- `idx_products_brand_look_group ON products(brand_id, look_group)` — Story 2.5 (FR19)
- `idx_products_brand_display_order ON products(brand_id, display_order)` — Story 2.5

**RLS Policies:**
| Policy | Operação | Condição |
|--------|----------|----------|
| products_admin_manage | ALL | `admin dono da marca é o caller AND current_user_is_admin()` |
| products_customer_read | SELECT | `status = 'approved' AND user_has_active_brand_access(brand_id) AND marca tem published = true` |

**Relacionamentos:**
- N:1 com `brands` (brand_id)
- N:1 com `catalogs` (catalog_id)

---

## Diagrama de Relações (ASCII)

```
auth.users (Supabase Auth)
     │
     │ 1:1
     ▼
users_profile ──────────────────────────── brands ──────────── catalogs
  (id, role, full_name, email, ...)         (id, slug, ...)    (id, brand_id, ...)
     │                                           │                    │
     │ 1:N (user_id + brand_id)                 │ 1:N (brand_id)     │ 1:N (catalog_id)
     └──────────── user_brand_access             └──── products ──────┘
                   (user_id, brand_id,                 (id, brand_id, catalog_id,
                    granted_at, granted_by,              reference, status,
                    revoked_at)                          display_order, ...)
```

---

## Arquivos de Migração

| Arquivo | Conteúdo |
|---------|----------|
| `supabase/migrations/20260520000001_extensions.sql` | Extensões: pgcrypto, pgaudit, pg_cron, pg_net, uuid-ossp |
| `supabase/migrations/20260520000010_users_profile.sql` | Tipo `user_role`, tabela `users_profile`, índice, 3 RLS policies |
| `supabase/migrations/20260520000020_brands.sql` | Tabela `brands`, 2 índices, 1 RLS policy (`brands_admin_full`) |
| `supabase/migrations/20260520000030_user_brand_access.sql` | Tabela `user_brand_access`, 2 índices, 2 RLS policies + policy `brands_customer_read_published` |
| `supabase/migrations/20260521000001_rls_fix_infinite_recursion.sql` | Funções SECURITY DEFINER: `current_user_is_admin()`, `user_has_active_brand_access()` |
| `supabase/migrations/20260521000002_admin_settings.sql` | Tabela `admin_settings`, RLS, helpers `pgp_encrypt_text` / `pgp_decrypt_text` |
| `supabase/migrations/20260521000003_catalogs.sql` | Tabela `catalogs`, índices, RLS |
| `supabase/migrations/20260522000001_catalogs_awaiting_extraction.sql` | Coluna `awaiting_extraction` em catalogs |
| `supabase/migrations/20260522000002_extraction_jobs.sql` | Tabela `extraction_jobs`, índices, RLS |
| `supabase/migrations/20260522000003_products_basic.sql` | Enum `product_status`, tabela `products`, 2 índices, 2 RLS policies, trigger |
| `supabase/migrations/20260522000004_products_indexes_rls.sql` | Índices `look_group` e `display_order`; refinamento `products_customer_read` (Story 2.5) |

---

## Tabelas de Epics Futuros (não incluídas nesta story)

> As tabelas abaixo pertencem aos Epics 3-5 e serão criadas em stories futuras:
> `carts`, `orders`, `audit_logs`, `consent_log`, `deletion_requests`
