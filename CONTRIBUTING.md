# Contribuindo com o CAMMES

Obrigado por contribuir! Este documento descreve as convenções de código, commit e branch usadas no projeto.

---

## Sumário

- [Fluxo de trabalho](#fluxo-de-trabalho)
- [Convenções de branch](#convenções-de-branch)
- [Convenções de commit (Conventional Commits)](#convenções-de-commit-conventional-commits)
- [Convenções de pull request](#convenções-de-pull-request)
- [Padrões de código](#padrões-de-código)
- [Testes](#testes)
- [Quality gates](#quality-gates)

---

## Fluxo de trabalho

1. **Crie uma branch** a partir de `main` seguindo as [convenções de nomenclatura](#convenções-de-branch).
2. **Faça commits atômicos** seguindo [Conventional Commits](#convenções-de-commit-conventional-commits).
3. **Garanta que os checks locais passem**: `npm run lint && npm run typecheck && npm run test && npm run build`.
4. **Abra um Pull Request** contra `main` com descrição clara (ver [convenções de PR](#convenções-de-pull-request)).
5. **Aguarde a CI** ficar verde e ao menos um review aprovado.
6. **Merge** via squash (preferencial) ou rebase — nunca merge commit.

---

## Convenções de branch

Use o padrão `<tipo>/<descrição-em-kebab-case>`:

| Prefixo | Uso | Exemplos |
|---|---|---|
| `feature/` | Nova funcionalidade | `feature/login-supabase`, `feature/cart-checkout` |
| `fix/` | Correção de bug | `fix/quantity-overflow`, `fix/rls-cart-policy` |
| `chore/` | Tarefas de manutenção, deps, configs | `chore/upgrade-next-15.6`, `chore/eslint-rules` |
| `docs/` | Apenas documentação | `docs/readme-setup`, `docs/architecture-adr-006` |
| `refactor/` | Refatoração sem mudar comportamento | `refactor/extract-cart-hook` |
| `test/` | Adição/melhoria de testes | `test/rls-brand-policies` |
| `ci/` | Mudanças em pipelines CI/CD | `ci/cache-npm-deps` |

Regras adicionais:

- **Sempre incluir o ID da story** quando aplicável, no nome **ou** na descrição do PR: `feature/1.3-supabase-auth`.
- **Branches longas (>1 semana)** devem ser rebaseadas com frequência sobre `main`.
- **Nunca** push direto em `main` — sempre via PR.

---

## Convenções de commit (Conventional Commits)

Seguimos o padrão [Conventional Commits](https://www.conventionalcommits.org/pt-br/v1.0.0/).

### Formato

```text
<tipo>(<escopo>): <descrição em minúsculas, modo imperativo, sem ponto final>

[corpo opcional explicando o "porquê" da mudança]

[rodapé opcional: BREAKING CHANGE / Refs / Co-Authored-By]
```

### Tipos permitidos

| Tipo | Quando usar |
|---|---|
| `feat` | Nova funcionalidade visível ao usuário |
| `fix` | Correção de bug |
| `docs` | Apenas documentação (READMEs, comentários, JSDoc) |
| `style` | Formatação, ponto-e-vírgula, espaços — sem mudança de lógica |
| `refactor` | Refatoração sem mudar comportamento externo |
| `perf` | Melhoria de performance |
| `test` | Adição ou correção de testes |
| `build` | Mudanças no sistema de build ou deps externas |
| `ci` | Mudanças em CI/CD (GitHub Actions, scripts de release) |
| `chore` | Tarefas de manutenção que não se encaixam acima |
| `revert` | Reverte um commit anterior |

### Escopo (opcional, mas recomendado)

Use o nome do módulo, feature ou story:

- `feat(auth): add Supabase magic link`
- `fix(cart): correct quantity validation on optimistic update`
- `chore(deps): bump next to 15.6.0`
- `docs(readme): add setup instructions for Supabase local`
- `ci: cache npm deps to speed up build`

### Referência a stories

Inclua o ID da story no escopo ou no rodapé:

```text
feat(brands): list brands paginated [Story 2.2]
```

ou

```text
feat: implement brand listing with pagination

Implements AC 1-3 of Story 2.2.

Refs: docs/stories/2.2.story.md
```

### Breaking changes

Adicione `BREAKING CHANGE:` no rodapé **OU** um `!` após o tipo:

```text
feat(api)!: remove deprecated /v1/brands endpoint

BREAKING CHANGE: clients must migrate to /v2/brands. See migration guide
in docs/guides/api-v2-migration.md
```

---

## Convenções de pull request

### Título

Use o mesmo formato de Conventional Commits:

```text
feat(brands): paginated brand listing [Story 2.2]
```

### Descrição (template sugerido)

```markdown
## Summary
<1-3 bullets do que mudou>

## Story
- Story ID: 2.2
- Acceptance Criteria atendidos: AC 1, AC 2, AC 3

## How to test
<passos manuais para validar>

## Checklist
- [ ] Lint passa (`npm run lint`)
- [ ] Typecheck passa (`npm run typecheck`)
- [ ] Testes passam (`npm run test`)
- [ ] Build passa (`npm run build`)
- [ ] Documentação atualizada
- [ ] Variáveis de ambiente novas adicionadas a `.env.local.example`
```

### Tamanho

- **Prefira PRs pequenos** (<400 linhas alteradas) — mais fáceis de revisar.
- **PRs grandes** (>1000 linhas) devem ser divididos quando possível.

### Reviews

- **Pelo menos 1 approval** antes de merge.
- **CI verde** é obrigatório (lint + typecheck + test + build).
- **Resolva todas as conversas** antes de merge.

---

## Padrões de código

- **TypeScript estrito** (`strict: true`) — JavaScript puro proibido exceto em arquivos de configuração.
- **ESLint** + **Prettier** obrigatórios. Use `npm run lint` e `npm run format` antes de commitar.
- **Imports absolutos** usando o alias `@/` (ex.: `import { foo } from '@/lib/types'`) — preferir sobre paths relativos profundos.
- **Server Components** por padrão; use `'use client'` apenas quando necessário (interatividade, hooks de browser).
- **Funções pequenas e focadas** — uma responsabilidade por função.
- **Comentários explicam o "porquê"**, não o "o quê" — código deve ser auto-documentado.

---

## Testes

- **Unit tests**: localizados em `tests/unit/` ou colocados ao lado do arquivo (`lib/foo.test.ts`).
- **Integration tests**: localizados em `tests/integration/` (RLS, pipeline de extração).
- **Cobertura alvo**: >=70% em módulos de domínio críticos (a partir de stories com lógica de negócio).
- **Framework**: Vitest 2.1 + React Testing Library 16.

Comandos:

```bash
npm run test          # roda toda a suíte uma vez (modo CI)
npm run test:watch    # roda em modo watch (TDD)
```

---

## Quality gates

Toda mudança passa por:

1. **CI (GitHub Actions)** — `lint` + `typecheck` + `test` + `build` em todo PR.
2. **Code review** — pelo menos 1 approval.
3. **Preview deploy (Vercel)** — gerado automaticamente em cada PR para validação visual.

Mudanças que adicionam:

- **Novas variáveis de ambiente** → atualizar `.env.local.example` e documentar em `README.md`.
- **Novas migrações Supabase** → coordenar com a equipe e documentar em `docs/architecture/`.
- **Breaking changes** → marcar com `BREAKING CHANGE:` no commit e PR.

---

## Ajuda

Dúvidas? Abra uma issue ou peça revisão antes de implementar mudanças grandes.
