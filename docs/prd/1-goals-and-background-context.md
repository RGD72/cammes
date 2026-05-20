# 1. Goals and Background Context

## 1.1 Goals

- Permitir que um administrador-distribuidor transforme um PDF de catálogo de marca em uma vitrine digital publicável em menos de 60 minutos, eliminando o cadastro manual SKU a SKU.
- Padronizar a captura de pedidos B2B em formato tabular obrigatório de 8 colunas, reduzindo erros de referência para abaixo de 5%.
- Entregar isolamento estrito entre marcas (multitenancy via Supabase RLS) com zero vazamento de catálogo a usuários não autorizados.
- Validar a viabilidade técnica e econômica da extração via LLM Vision (OpenRouter + Gemini Flash 2.5 como modelo padrão) com TPE >= 85% e custo médio <R$ 50 por catálogo de até 100 SKUs.
- Operar um modelo bring-your-own-key (BYOK) para a API OpenRouter, deslocando custo de inferência ao administrador.
- Atingir, em 90 dias após lançamento do MVP, 1 distribuidor real operando >=3 marcas publicadas com >=50 pedidos estruturados enviados pela plataforma.
- Construir base de dados estruturada por marca (produtos + pedidos) que viabilize analytics e expansão multitenant em Phase 2.
- Preservar o ritual visual do lookbook permitindo download do PDF original e navegação visual rica nas vitrines.

## 1.2 Background Context

O varejo B2B de moda brasileiro opera hoje em um fluxo analógico-digital híbrido — marcas distribuem catálogos PDF por WhatsApp/Drive, lojistas devolvem pedidos em texto livre ou áudio, e distribuidores consolidam manualmente em planilhas. O resultado é alto retrabalho (10-25% dos pedidos exigem correção), pedidos perdidos (5-15% do volume) e ausência total de histórico estruturado por marca. Soluções existentes (e-commerces B2C, ERPs de representação, WhatsApp Catalog) falham porque exigem cadastro manual prévio ou não atendem o caso B2B sem checkout financeiro.

CAMMES inverte essa equação: o PDF do catálogo é a fonte da verdade, um modelo LLM Vision roteado via OpenRouter (padrão: Gemini Flash 2.5) extrai automaticamente referências, descrições, tamanhos, cores e preços, e o admin valida em uma tela de revisão antes de publicar. O lojista navega em uma vitrine digital sem perder o ritual visual do lookbook, monta um pedido tabular padronizado e recebe um PDF do pedido — sem pagamento online, pois a transação financeira segue offline com a marca. A janela de oportunidade é agora: LLMs multimodais ficaram custo-efetivos em 2025-2026, e a pressão por digitalização B2B pós-pandemia torna o status quo insustentável.

## 1.3 Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-05-19 | 1.0 | Versão inicial do PRD a partir do Project Brief 1.0 | Morgan (@pm) |
| 2026-05-19 | 1.1 | Substituição de OpenAI direto por OpenRouter como gateway LLM; modelo padrão inicial: `google/gemini-flash-2.5`; atualização de FR7, FR10, NFR8, NFR12, NFR20-22, NFR28, Technical Assumptions §4.2/§4.4, Epic 2, Stories 2.1-2.6, Dashboard 5.4, Audit eventos | Morgan (@pm) |
| 2026-05-19 | 1.2 | FR6 atualizado: limite de upload 50MB → 500MB; protocolo TUS resumível via Supabase Storage (`resumable: true`); atualização de §4.4 Technical Assumptions, Story 2.2 (descrição, AC3, AC4) | Morgan (@pm) |

---
