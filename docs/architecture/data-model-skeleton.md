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

## Diagrama de Relações (ASCII)

```
auth.users (Supabase Auth)
     │
     │ 1:1
     ▼
users_profile ──────────────────────────── brands
  (id, role, full_name, email, ...)         (id, slug, name, owner_admin_id, ...)
     │                                           │
     │ 1:N (user_id + brand_id)                 │ 1:N (brand_id)
     └──────────── user_brand_access ───────────┘
                   (user_id, brand_id,
                    granted_at, granted_by,
                    revoked_at)
```

---

## Arquivos de Migração

| Arquivo | Conteúdo |
|---------|----------|
| `supabase/migrations/20260520_0001_extensions.sql` | Extensões: pgcrypto, pgaudit, pg_cron, pg_net, uuid-ossp |
| `supabase/migrations/20260520_0010_users_profile.sql` | Tipo `user_role`, tabela `users_profile`, índice, 3 RLS policies |
| `supabase/migrations/20260520_0020_brands.sql` | Tabela `brands`, 2 índices, 1 RLS policy (`brands_admin_full`) |
| `supabase/migrations/20260520_0030_user_brand_access.sql` | Tabela `user_brand_access`, 2 índices, 2 RLS policies + policy `brands_customer_read_published` |

---

## Tabelas de Epics Futuros (não incluídas nesta story)

> As tabelas abaixo pertencem aos Epics 2-5 e serão criadas em stories futuras:
> `catalogs`, `extraction_jobs`, `products`, `carts`, `orders`, `audit_logs`, `consent_log`, `deletion_requests`, `admin_settings`
