# Branch `metricas` — dados da pipeline, nao codigo

Esta branch e escrita **pela pipeline** (`.github/workflows/testes.yml` e
`backend-real.yml`), nunca a mao. Ela existe porque a `main` e protegida e nao
deve receber commit de robo.

| Arquivo | O que e | Quem grava |
| :-- | :-- | :-- |
| `historico.jsonl` | Uma linha por execucao da regressao completa contra o duplo de referencia (data, evento, branch, verde/vermelha, totais, nomes dos testes reprovados). | `regression / full-suite` |
| `historico-backend-real.jsonl` | O mesmo, para as execucoes contra o back-end Flask real. | `suite-contra-backend-real` |
| `relatorio-tecnico.html`, `relatorio-negocio.html` | Os relatorios da execucao mais recente (link fixo). | `regression / full-suite` |
| `relatorio-tecnico-backend-real.html`, `relatorio-negocio-backend-real.html` | Idem, contra o back-end real. | `suite-contra-backend-real` |
| `ultima-execucao.json`, `ultima-execucao-backend-real.json` | As metricas completas da execucao mais recente. | idem |

As primeiras 37 linhas de `historico.jsonl` foram importadas da API do GitHub
Actions em 03/11/2026 (execucoes #1 a #70 da `main`), com `detalhado: false`:
tem data, evento e resultado, mas nao o detalhe por teste. A partir dai, cada
linha e gravada pela propria execucao, com detalhe.

Para ver os relatorios no navegador, habilite o GitHub Pages apontando para
esta branch (Settings > Pages > Branch: `metricas`, pasta `/`). Sem Pages,
baixe o HTML ou abra pelo artefato da execucao.
