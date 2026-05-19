# CAMMES

> **Catálogo Multimarcas com Extração Estruturada**
> Plataforma Next.js + Supabase para gestão de catálogos multimarcas com pipeline de extração assistida por IA.

[![CI](https://github.com/your-org/cammes/actions/workflows/ci.yml/badge.svg)](.github/workflows/ci.yml)

---

## Visão geral

CAMMES é uma aplicação fullstack construída sobre:

- **Next.js 15** (App Router, React Server Components, Server Actions)
- **TypeScript** estrito (`strict: true`)
- **Supabase** (Postgres + Auth + RLS + Edge Functions)
- **Tailwind CSS** + **shadcn/ui** (acessível, WCAG AA)
- **Vitest** (testes unitários e de integração)
- **GitHub Actions** (CI: lint + typecheck + test + build)
- **Vercel** (deploy contínuo a partir de `main`)

> Esta story (1.1) entrega o **bootstrap** do projeto. Funcionalidades de domínio (auth, marcas, extração) são adicionadas nas stories subsequentes do Epic 1+.

---

## Pré-requisitos

| Ferramenta | Versão mínima | Como instalar |
|---|---|---|
| Node.js | 20.x LTS | https://nodejs.org/ ou `nvm install 20` |
| npm | 10+ (vem com Node 20) | — |
| Supabase CLI | 1.200+ | `npm install -g supabase` ou https://supabase.com/docs/guides/cli |
| Git | 2.40+ | https://git-scm.com/ |

Opcional:

- **Docker** — necessário se você quiser rodar o Supabase local (`supabase start`).
- **GitHub CLI (`gh`)** — facilita criação de PRs.

---

## Setup local

### 1. Clonar o repositório

```bash
git clone <repo-url> cammes
cd cammes
```

### 2. Instalar dependências

```bash
npm install
```

### 3. Configurar variáveis de ambiente

Copie o template e preencha com os valores do seu projeto Supabase:

```bash
cp .env.local.example .env.local
```

Edite `.env.local` com:

| Variável | Onde obter |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard → Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Dashboard → Project Settings → API → `anon` `public` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Project Settings → API → `service_role` (**secreta**) |

> Em produção, configure as mesmas variáveis em **Vercel → Settings → Environment Variables**.

### 4. (Opcional) Inicializar Supabase local

Se você quiser rodar Postgres + Auth + Studio localmente (requer Docker):

```bash
supabase start
```

Isso expõe Postgres em `localhost:54322`, Studio em `localhost:54323`, e Auth em `localhost:54321`.
Atualize `NEXT_PUBLIC_SUPABASE_URL` para `http://localhost:54321` ao trabalhar com a instância local.

### 5. Rodar o servidor de desenvolvimento

```bash
npm run dev
```

Abra http://localhost:3000 — você deve ver **"CAMMES — em construção"**.

---

## Scripts disponíveis

| Comando | O que faz |
|---|---|
| `npm run dev` | Inicia o servidor de desenvolvimento (HMR) em `http://localhost:3000` |
| `npm run build` | Compila a aplicação para produção (`.next/`) |
| `npm run start` | Roda o build de produção localmente |
| `npm run lint` | Roda ESLint (`eslint-config-next`) em todo o código |
| `npm run typecheck` | Roda `tsc --noEmit` (verifica tipos sem emitir arquivos) |
| `npm run test` | Roda a suíte de testes Vitest uma vez (modo CI) |
| `npm run test:watch` | Roda Vitest em modo watch (TDD) |
| `npm run format` | Formata todo o código com Prettier |
| `npm run format:check` | Verifica formatação sem alterar arquivos |

---

## Estrutura de pastas (ADR-001)

```
.
├── app/                  # Next.js App Router (rotas + layouts)
│   ├── layout.tsx
│   ├── page.tsx          # `/` — placeholder
│   └── globals.css
├── components/
│   └── ui/               # shadcn/ui components (adicionados sob demanda)
├── lib/                  # Domínio (TypeScript)
│   ├── types/            # Barrel de tipos compartilhados
│   ├── auth/             # Helpers de autenticação (Story 1.3)
│   └── brands/           # Repositório de marcas (Story 2.2+)
├── supabase/
│   ├── migrations/       # SQL migrations (Story 1.2)
│   └── functions/        # Edge Functions Deno (Story 2.4+)
├── tests/
│   ├── unit/             # Testes unitários (Vitest + RTL)
│   └── integration/      # Testes de integração (RLS, pipeline)
├── public/               # Assets estáticos servidos como-estão
├── docs/                 # PRD, architecture, stories, guides
└── .github/
    └── workflows/
        └── ci.yml        # GitHub Actions: lint + typecheck + test + build
```

---

## Deploy

- **Produção:** push para `main` dispara deploy automático no Vercel.
- **Preview:** todo PR gera uma preview deployment (URL única por PR).
- **Região Vercel:** `gru1` (São Paulo) — minimiza latência ao Supabase.
- **Região Supabase:** `sa-east-1` (São Paulo) preferencial; fallback `us-east-1`.

---

## Links

- **Vercel Dashboard:** (configurar após criação do projeto)
- **Supabase Dashboard:** (configurar após criação do projeto)
- **Documentação interna:** [`docs/`](./docs/)
  - [PRD](./docs/prd.md)
  - [Architecture](./docs/architecture.md)
  - [Stories](./docs/stories/)

---

## Contribuindo

Veja [CONTRIBUTING.md](./CONTRIBUTING.md) para convenções de commit, branch e fluxo de PR.

---

## Licença

Privado — todos os direitos reservados.
