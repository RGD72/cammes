# Smoke Test — Epic 1: Foundation, Auth & Multitenancy Skeleton

**Data:** 2026-05-21
**Epic:** 1 — Foundation, Auth & Multitenancy Skeleton
**Stories cobertas:** 1.1, 1.2, 1.3, 1.4, 1.5

> **Nota:** Este documento é o artefato de qualidade manual do Epic 1. Execute antes de marcar o Epic 1 como Done e antes de iniciar o Epic 2.

---

## Pré-requisitos

- [ ] Supabase local rodando (`supabase start` ou projeto remoto configurado)
- [ ] Variáveis de ambiente configuradas (`.env.local`)
- [ ] Dois usuários criados no Supabase:
  - `admin@cammes.com` com role `admin` em `users_profile`
  - `cliente@cammes.com` com role `customer` em `users_profile`
- [ ] Ambos os usuários com `full_name` preenchido em `users_profile`
- [ ] App rodando (`npm run dev`)

---

## Fluxo 1 — Login Admin

| # | Ação | Resultado esperado | OK? |
|---|------|--------------------|-----|
| 1.1 | Acesse `/login` sem sessão ativa | Página de login exibida, sem redirect | ☐ |
| 1.2 | Digite e-mail e senha do admin | Campos aceitam input | ☐ |
| 1.3 | Clique em "Entrar" | Redirect para `/admin` | ☐ |
| 1.4 | Observe a URL | URL é `/admin` | ☐ |
| 1.5 | Observe o sidebar | Sidebar exibe "CAMMES Admin" e links: Marcas, Pedidos, Configurações | ☐ |
| 1.6 | Observe o conteúdo principal | Exibe "Bem-vindo, [nome real do admin]" (nome de `users_profile`) | ☐ |
| 1.7 | Observe os cards | Três cards placeholder: Marcas, Pedidos, Usuários | ☐ |
| 1.8 | Clique em "Sair" no rodapé do sidebar | Redirect para `/login` | ☐ |

---

## Fluxo 2 — Login Cliente

| # | Ação | Resultado esperado | OK? |
|---|------|--------------------|-----|
| 2.1 | Acesse `/login` sem sessão ativa | Página de login exibida | ☐ |
| 2.2 | Digite e-mail e senha do cliente | Campos aceitam input | ☐ |
| 2.3 | Clique em "Entrar" | Redirect para `/brands` | ☐ |
| 2.4 | Observe a URL | URL é `/brands` | ☐ |
| 2.5 | Observe o header | Header sticky com "CAMMES" à esquerda, nome do cliente e "Sair" à direita | ☐ |
| 2.6 | Confirme o nome exibido | Nome corresponde ao `full_name` em `users_profile` | ☐ |
| 2.7 | Observe o conteúdo principal | Mensagem: "Você ainda não tem marcas disponíveis." | ☐ |
| 2.8 | Observe a mensagem de orientação | "Entre em contato com seu distribuidor para liberar o acesso às marcas." | ☐ |
| 2.9 | Clique em "Sair" no header | Redirect para `/login` | ☐ |

---

## Fluxo 3 — Cross-Role (Guard de Middleware)

| # | Ação | Resultado esperado | OK? |
|---|------|--------------------|-----|
| 3.1 | Faça login como cliente (`/login`) | Redirect para `/brands` | ☐ |
| 3.2 | Tente acessar `/admin` manualmente na barra de endereço | Redirect automático para `/brands` | ☐ |
| 3.3 | Faça logout | Redirect para `/login` | ☐ |
| 3.4 | Sem sessão, tente acessar `/brands` | Redirect para `/login` | ☐ |
| 3.5 | Sem sessão, tente acessar `/admin` | Redirect para `/login` | ☐ |

---

## Fluxo 4 — Recuperação de Senha

| # | Ação | Resultado esperado | OK? |
|---|------|--------------------|-----|
| 4.1 | Acesse `/recover-password` | Formulário de recuperação exibido | ☐ |
| 4.2 | Envie o formulário com e-mail **inválido** | Erro de validação inline no campo | ☐ |
| 4.3 | Envie o formulário com e-mail **válido** | Mensagem de sucesso genérica (anti-enumeration) | ☐ |
| 4.4 | Abra o link de reset recebido por e-mail | Redirect para `/reset-password` | ☐ |
| 4.5 | Digite nova senha (< 8 chars) | Erro de validação inline | ☐ |
| 4.6 | Digite senhas que não coincidem | Erro de validação inline | ☐ |
| 4.7 | Digite nova senha válida (≥ 8 chars) e confirme | Redirect para `/login?message=password_updated` | ☐ |
| 4.8 | Observe banner na página de login | Banner de sucesso "Senha atualizada com sucesso" visível | ☐ |
| 4.9 | Faça login com a nova senha | Login funciona, redirect correto por role | ☐ |

---

## Fluxo 5 — Regressão de Rotas Públicas

| # | Ação | Resultado esperado | OK? |
|---|------|--------------------|-----|
| 5.1 | Acesse `/login` sem sessão | Página de login renderizada normalmente | ☐ |
| 5.2 | Acesse `/recover-password` sem sessão | Página de recuperação renderizada normalmente | ☐ |
| 5.3 | Acesse `/reset-password` sem sessão | Página de reset renderizada (sem token — comportamento aceitável) | ☐ |

---

## Resultado

| Fluxo | Total de itens | OK | Falhou |
|-------|---------------|-----|--------|
| Fluxo 1 — Login Admin | 8 | | |
| Fluxo 2 — Login Cliente | 9 | | |
| Fluxo 3 — Cross-Role | 5 | | |
| Fluxo 4 — Recuperação | 9 | | |
| Fluxo 5 — Regressão | 3 | | |
| **Total** | **34** | | |

**Veredicto:**
- ☐ APROVADO — todos os 34 itens OK
- ☐ APROVADO COM OBSERVAÇÕES — falhas menores documentadas abaixo
- ☐ REPROVADO — falha crítica encontrada (descrever abaixo)

**Observações:**

_[Preencher manualmente]_

**Executado por:** _______________
**Data de execução:** _______________

---

## Notas Conhecidas

- `/admin` é desktop-only no MVP — sidebar lateral quebra em telas pequenas (documentado, não é falha)
- `/reset-password` sem token de reset válido pode exibir estado inconsistente — comportamento aceitável no MVP
- Taxa de envio de e-mail de reset pode ser limitada pelo Supabase Auth (padrão: 3 por hora)
