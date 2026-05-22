# Extraction Failure Modes — CAMMES MVP

> Documento de referência para falhas no pipeline de extração via LLM Vision (OpenRouter).
> Atualizado em: Story 2.6

---

## Visão Geral

O pipeline de extração (`supabase/functions/extract-catalog/index.ts`) executa retry exponencial de até 3 tentativas por página. Quando todas as tentativas de uma página falham, o erro é registrado em `extraction_jobs.error_message` e o pipeline continua para as próximas páginas. Se o job não consegue completar, o status final fica em `failed`.

O admin pode re-disparar a extração via botão "Tentar novamente" na tela de progresso, o que invoca `retriggerExtraction` (Story 2.6).

---

## Cenários de Falha

### 1. Timeout da Edge Function

**Quando ocorre:** A Edge Function do Supabase tem um timeout máximo. Se o catálogo tem muitas páginas ou o modelo responde lentamente, o processo pode ser interrompido antes de concluir.

**Comportamento atual:**
- A Edge Function é abortada pelo runtime do Supabase
- O `extraction_jobs.status` fica preso em `running` (não transita automaticamente para `failed`)
- Páginas processadas antes do timeout têm produtos persistidos normalmente

**Mensagem de erro esperada em `error_message`:**
```
Edge Function timeout após X páginas processadas de Y total
```
_(a mensagem pode estar ausente se o timeout ocorreu antes do catch block)_

**Ação do admin:**
1. Aguardar ~5 minutos para confirmar que o job não avançou
2. Usar o botão "Tentar novamente" na tela de progresso do job
3. O `retriggerExtraction` remove apenas produtos com `status='extracted'` — produtos já aprovados/ocultos são preservados
4. Considerar reduzir o número de páginas por catálogo ou contatar suporte Supabase para aumentar o limite de timeout

---

### 2. Chave OpenRouter Inválida ou Expirada

**Quando ocorre:** A chave de API OpenRouter está incorreta, expirou, foi revogada, ou o saldo da conta OpenRouter esgotou.

**Comportamento atual:**
- A chamada à API OpenRouter retorna HTTP 401 ou HTTP 402
- O retry exponencial (3x) é esgotado na primeira página
- O job transita para `failed`

**Mensagem de erro esperada em `error_message`:**
```
Página 1: OpenRouter API error 401: Invalid API key
```
ou
```
Página 1: OpenRouter API error 402: Insufficient credits
```

**Ação do admin:**
1. Acessar `/admin/settings/openrouter`
2. Atualizar a chave OpenRouter ou verificar o saldo da conta
3. Usar o botão "Testar conexão" para confirmar que a nova chave funciona
4. Voltar à marca e usar "Tentar novamente"

---

### 3. PDF Corrompido ou Ilegível

**Quando ocorre:** O arquivo PDF enviado está corrompido, protegido por senha, ou contém apenas imagens em resolução muito baixa para o modelo processar.

**Comportamento atual:**
- A conversão de página para PNG falha (via `pdfjs-dist`)
- O erro é capturado por página e registrado em `error_message`
- Páginas corrompidas geram zero produtos; o pipeline continua para as próximas páginas
- Se todas as páginas falham, o job transita para `failed`

**Mensagem de erro esperada em `error_message`:**
```
Página 3: Failed to render page: Invalid PDF structure at offset 0x1234
```
ou
```
Página 1: PasswordException: Password required
```

**Ação do admin:**
1. Verificar o PDF localmente (abrir no Adobe Reader ou equivalente)
2. Se protegido por senha: remover a proteção antes do upload
3. Se corrompido: solicitar o arquivo original ao distribuidor
4. Re-fazer upload com o arquivo corrigido
5. Iniciar nova extração (não usar "Tentar novamente" — o arquivo precisa ser substituído primeiro)

---

### 4. JSON Inválido Retornado pelo LLM

**Quando ocorre:** O modelo de LLM (Gemini Flash 2.5 via OpenRouter) retorna uma resposta que não é JSON válido, ou retorna JSON que não respeita o schema Zod esperado.

**Comportamento atual:**
- A resposta do modelo é parseada via `JSON.parse()` e validada pelo schema Zod
- Se o parse ou a validação falha, a página é ignorada (zero produtos extraídos)
- O erro é registrado em `error_message` e o pipeline continua para as próximas páginas
- O job **não** vai a `failed` por isso — apenas registra o erro parcial

**Mensagem de erro esperada em `error_message`:**
```
Página 7: JSON inválido — Unexpected token 'M' at position 0
```
ou
```
Página 12: JSON inválido — [ZodError: invalid_type at products[0].price_brl]
```

**Ação do admin:**
1. Este é o cenário mais comum em páginas com layout complexo (tabelas, collages)
2. Verificar quantas páginas falharam olhando `pages_processed` vs `products_count`
3. Se a maioria das páginas foi processada com sucesso, o job conclui como `done`
4. Os produtos da página com JSON inválido precisarão ser cadastrados manualmente na tela de revisão
5. Se o problema é recorrente em muitas páginas, usar "Tentar novamente" — às vezes o modelo produz JSON válido em uma segunda tentativa

---

## Matriz de Resolução Rápida

| Cenário | Status Final | Re-disparar resolve? | Ação prioritária |
|---------|-------------|---------------------|------------------|
| Timeout Edge Function | `running` (preso) | ✅ Sim | Aguardar 5min → Tentar novamente |
| Chave inválida/sem saldo | `failed` | ✅ Após correção | Atualizar chave → Tentar novamente |
| PDF corrompido | `failed` ou `done` parcial | ❌ Não | Re-upload do arquivo → Nova extração |
| JSON inválido (parcial) | `done` (parcial) | ✅ Sim (às vezes) | Revisar produtos → Tentar novamente se necessário |

---

## Referências

- Pipeline de extração: `supabase/functions/extract-catalog/index.ts`
- Action de re-disparo: `lib/catalogs/retrigger-actions.ts`
- Schema de extraction_jobs: `supabase/migrations/20260522000002_extraction_jobs.sql`
- PRD NFR4: catálogo de até 50 páginas extraído em <10 min p95
