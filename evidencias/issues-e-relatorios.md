# Evidência: issues automáticas, artefatos e relatórios gerados pela pipeline

**Data:** 03/11/2026 (noite, horário de Recife; 04/11 em UTC)
**Branch:** `feat/metricas-e-relatorios`, PR #11
(<https://github.com/Ev-maers/resolveai-testes/pull/11>)
**Atividade:** QA-04/11/2026, itens 1 a 5.

## 1. Abertura e fechamento automático de issues

| Passo | Execução | O que a pipeline fez |
| :-- | :-- | :-- |
| Commit `55bf63b` quebra U1 de propósito (branch `test/evidencia-issue-automatica`) | [#77](https://github.com/Ev-maers/resolveai-testes/actions/runs/41748305794), vermelha | **Criou a issue #10** `[pipeline] U1 a tabela de transicoes cobre os 16 pares: 4 permitidos e 12 recusados`, rótulo `falha-de-teste`, com nível, história, mensagem, link da execução, commit, branch e evento. |
| Commit `c11a085` desfaz a quebra | [#78](https://github.com/Ev-maers/resolveai-testes/actions/runs/41748557113), verde | **Fechou a issue #10** com o comentário "O teste voltou a passar" e o link da execução #78. |

Issue: <https://github.com/Ev-maers/resolveai-testes/issues/10>
(estado `closed`, fechada em 2026-11-04T00:40:26Z pelo `github-actions[bot]`).

Lista de todas as issues abertas pela pipeline:
<https://github.com/Ev-maers/resolveai-testes/issues?q=label%3Afalha-de-teste>

## 2. Coleta de artefatos

Cada execução publica a pasta `evidencias/` inteira como artefato, com
`if: always()`:

| Execução | Artefato | Conteúdo |
| :-- | :-- | :-- |
| [#76](https://github.com/Ev-maers/resolveai-testes/actions/runs/41747999901) (push, quality gate) | `evidencias-unit-api-41747999901` | `unidade.xml`, `api.xml`, `unidade.log`, `api.log`, `sut.log`, `metricas.json`, `issues.json`, `resumo.md`, `relatorio-tecnico.html`, `relatorio-negocio.html` |
| [#79](https://github.com/Ev-maers/resolveai-testes/actions/runs/41748624501) (regressão manual, 3 níveis) | `evidencias-regressao-41748624501` | o mesmo, com `e2e.xml` e `e2e.log` |

Os steps novos, na ordem em que aparecem na página da execução #79:
`1. Testes Unitarios` → `2. Testes de API` → `3. Testes End-to-End (E2E)` →
`Calcula as metricas (com tendencia)` → `Registra as falhas como issues` →
`Gera os relatorios tecnico e de negocio` → `Anota os testes reprovados` →
`Publica evidencias da regressao` → `Registra o historico e publica os
relatorios (branch metricas)`. Todos verdes.

## 3. Métricas e histórico

- `metricas.json` de cada execução está no artefato.
- O histórico está na branch `metricas`:
  <https://github.com/Ev-maers/resolveai-testes/blob/metricas/historico.jsonl>.
  A execução #79 acrescentou a linha
  `{"runNumber":79,"evento":"workflow_dispatch","verde":true,"total":69,"aprovados":69,"reprovados":0,"taxaDeAprovacao":100,...}`
  no commit `b707ba5`, feito pelo `github-actions[bot]`.
- As métricas escolhidas e descartadas, com justificativa, estão em
  `docs/metricas-de-qualidade.md`.

## 4. Relatórios gerados pela pipeline

Os relatórios mais recentes, com link fixo, estão na branch `metricas`:

- <https://github.com/Ev-maers/resolveai-testes/blob/metricas/relatorio-tecnico.html>
- <https://github.com/Ev-maers/resolveai-testes/blob/metricas/relatorio-negocio.html>

O GitHub mostra o código-fonte; para ver renderizado, baixe o arquivo (botão
*Download raw file*) e abra no navegador, ou habilite o GitHub Pages na branch
`metricas` (Settings > Pages), o que exige permissão de administrador.

Resumo da execução #79, como aparece na aba *Summary*:

```
Qualidade: ESTAVEL (verde)
Taxa de aprovacao 100% (69/69) | Cobertura do plano 100% (69/69) | Reprovados 0
Historias com falha: nenhuma | Duracao 1.7 s | Estabilidade (main) 100% nas ultimas 10
Issues: 0 criadas, 0 atualizadas, 0 fechadas, 0 abertas | Alvo: duplo de referencia
```

## 5. Como reproduzir

```bash
npm run qualidade                      # verde
DEFEITO=403-em-vez-de-404 npm run qualidade   # vermelho: HU-03 e E2E-04 reprovam
```

Localmente as issues não são abertas (sem `GITHUB_TOKEN`); o passo avisa e segue.
