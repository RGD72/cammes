# RLS Test Matrix — Cammes MVP

**Gerado em:** 2026-05-21
**Story:** 1.6 — RLS Audit Foundation
**Fonte canônica das políticas:** `supabase/migrations/`

---

## Sumário de Políticas por Tabela

| Tabela | Políticas | RLS ativo |
|--------|-----------|-----------|
| `users_profile` | 3 | Sim |
| `brands` | 2 | Sim |
| `user_brand_access` | 3 | Sim |

---

## Tabela: `users_profile`

### Políticas Implementadas

| Nome | Operação | Condição SQL |
|------|----------|-------------|
| `users_profile_self_read` | SELECT | `id = auth.uid()` |
| `users_profile_admin_read_customers` | SELECT | `EXISTS (SELECT 1 FROM users_profile WHERE id = auth.uid() AND role = 'admin') AND role = 'customer'` |
| `users_profile_self_update` | UPDATE | `id = auth.uid()` |

**Fonte:** `supabase/migrations/20260520000010_users_profile.sql`

### Casos Positivos

| # | Ator | Operação | Dado | Resultado Esperado |
|---|------|----------|------|--------------------|
| P-UP-1 | `customer_A` | SELECT | Próprio perfil (`id = customer_A.id`) | 1 row retornada |
| P-UP-2 | `admin_X` | SELECT | Próprio perfil | 1 row retornada |
| P-UP-3 | `admin_X` | SELECT | Perfis com `role = 'customer'` | Todos os customers listados |
| P-UP-4 | `customer_A` | UPDATE | Próprio `full_name` | UPDATE bem-sucedido |

### Casos Negativos

| # | Ator | Operação | Dado | Resultado Esperado |
|---|------|----------|------|--------------------|
| N-UP-1 | `customer_A` | SELECT | Perfil de `customer_B` | 0 rows |
| N-UP-2 | `customer_A` | SELECT | Perfil de `admin_X` | 0 rows |
| N-UP-3 | `customer_A` | UPDATE | Perfil de `customer_B` | 0 rows afetadas |
| N-UP-4 | `admin_X` | SELECT | Outros admins (`role = 'admin'`) | 0 rows (policy não cobre admin→admin) |

---

## Tabela: `brands`

### Políticas Implementadas

| Nome | Operação | Condição SQL |
|------|----------|-------------|
| `brands_admin_full` | ALL | `owner_admin_id = auth.uid() AND EXISTS (SELECT 1 FROM users_profile WHERE id = auth.uid() AND role = 'admin')` |
| `brands_customer_read_published` | SELECT | `published = true AND EXISTS (SELECT 1 FROM user_brand_access uba WHERE uba.brand_id = brands.id AND uba.user_id = auth.uid() AND uba.revoked_at IS NULL)` |

**Fonte:** `supabase/migrations/20260520000020_brands.sql`, `20260520000030_user_brand_access.sql`

### Casos Positivos

| # | Ator | Operação | Dado | Resultado Esperado |
|---|------|----------|------|--------------------|
| P-BR-1 | `admin_A` | SELECT | Própria `brand_A` (owner) | 1 row retornada |
| P-BR-2 | `admin_A` | UPDATE | Própria `brand_A` | UPDATE bem-sucedido |
| P-BR-3 | `admin_A` | DELETE | Própria `brand_A` | DELETE bem-sucedido |
| P-BR-4 | `admin_A` | INSERT | Nova brand com `owner_admin_id = admin_A.id` | INSERT bem-sucedido |
| P-BR-5 | `customer_A` | SELECT | `brand_A` publicada com `user_brand_access` ativo | 1 row retornada |

### Casos Negativos

| # | Ator | Operação | Dado | Resultado Esperado |
|---|------|----------|------|--------------------|
| N-BR-1 | `admin_A` | SELECT | `brand_B` de `admin_B` | 0 rows (cross-admin bloqueado) |
| N-BR-2 | `admin_A` | UPDATE | `brand_B` de `admin_B` | 0 rows afetadas |
| N-BR-3 | `admin_A` | DELETE | `brand_B` de `admin_B` | 0 rows afetadas |
| N-BR-4 | `customer_A` | SELECT | Qualquer brand sem `user_brand_access` | 0 rows |
| N-BR-5 | `customer_A` | SELECT | `brand_A` com acesso revogado (`revoked_at IS NOT NULL`) | 0 rows |
| N-BR-6 | `customer_A` | SELECT | `brand_A` não publicada (`published = false`) mesmo com acesso ativo | 0 rows |
| N-BR-7 | `customer_A` | UPDATE | Qualquer brand | 0 rows afetadas (sem policy de escrita) |

---

## Tabela: `user_brand_access`

### Políticas Implementadas

| Nome | Operação | Condição SQL |
|------|----------|-------------|
| `uba_admin_manage` | ALL | `EXISTS (SELECT 1 FROM brands b WHERE b.id = user_brand_access.brand_id AND b.owner_admin_id = auth.uid())` |
| `uba_self_read` | SELECT | `user_id = auth.uid()` |
| `brands_customer_read_published` | — | (política na tabela `brands`, referencia `user_brand_access`) |

**Fonte:** `supabase/migrations/20260520000030_user_brand_access.sql`

### Casos Positivos

| # | Ator | Operação | Dado | Resultado Esperado |
|---|------|----------|------|--------------------|
| P-UBA-1 | `admin_A` | INSERT | Acesso de `customer_A` para `brand_A` (owned by admin_A) | INSERT bem-sucedido |
| P-UBA-2 | `admin_A` | UPDATE | `revoked_at` de acesso em `brand_A` | UPDATE bem-sucedido |
| P-UBA-3 | `admin_A` | DELETE | Acesso em `brand_A` | DELETE bem-sucedido |
| P-UBA-4 | `customer_A` | SELECT | Próprio acesso (`user_id = customer_A.id`) | Row retornada |

### Casos Negativos

| # | Ator | Operação | Dado | Resultado Esperado |
|---|------|----------|------|--------------------|
| N-UBA-1 | `customer_A` | INSERT | Entrada em `user_brand_access` | 0 rows / erro RLS |
| N-UBA-2 | `admin_B` | INSERT | Acesso para `brand_A` (owned by admin_A) | 0 rows / erro RLS |
| N-UBA-3 | `admin_B` | SELECT | Acessos de `brand_A` (owned by admin_A) | 0 rows |
| N-UBA-4 | `customer_A` | SELECT | Acessos de `customer_B` | 0 rows |
| N-UBA-5 | `customer_A` | UPDATE | Próprio acesso | 0 rows (sem policy de UPDATE para customer) |

---

## Cobertura dos Cenários do AC2

| Cenário AC2 | Coberto por | Arquivo de Teste |
|-------------|-------------|-----------------|
| `customer_A` não lê `brand_B` sem `user_brand_access` ativo | N-BR-4 | `brands.test.ts` |
| `admin_X` não lê brands de `admin_Y` | N-BR-1 | `brands.test.ts` |
| UPDATE cross-tenant por admin errado falha | N-BR-2 | `brands.test.ts` |
| `uba_admin_manage` impede customer de inserir em `user_brand_access` | N-UBA-1 | `user-brand-access.test.ts` |
| Acesso revogado é negado em `brands_customer_read_published` | N-BR-5 | `brands.test.ts` |

---

## Referências

- Políticas RLS: `supabase/migrations/20260520000010_users_profile.sql`, `20260520000020_brands.sql`, `20260520000030_user_brand_access.sql`
- Data model: `docs/architecture/data-model-skeleton.md`
- ADR estratégia: `docs/architecture/project-decisions/ADR-002-rls-strategy.md`
- Integration tests: `tests/integration/rls/`
