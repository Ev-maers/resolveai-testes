# Pipeline de CI e Quality Gate

## Alinhamento com o backlog

O plano de testes define 69 casos automatizados: 5 unitarios, 53 de API e
11 jornadas E2E. O passo `Verifica cobertura do backlog` confere o numero de
arquivos (1 unitario, 8 API, 11 E2E) e um minimo de declaracoes `test(` (5, 43 e
11; alguns testes de API sao gerados em laco, por isso 43 declaracoes cobrem 53
casos). A contagem exata de 69 casos aparece no relatorio do runner.

O duplo em `sut-referencia/` e usado para manter a execucao reproduzivel da
TAS. Isso nao substitui a validacao contra o back-end Flask real, que continua
disponivel no workflow `suite-contra-backend-real`.

## Gatilhos e etapas

| Evento | Check | Escopo |
| --- | --- | --- |
| `push` | `quality-gate / unit-and-api` | 5 unitarios + 53 API |
| `pull_request` para `main` | `quality-gate / unit-and-api` | 5 unitarios + 53 API |
| `pull_request` para `main` | `quality-gate / smoke-e2e` | E2E-01, E2E-02 e E2E-03 |
| diario, 12:15 BRT | `regression / full-suite` | 69 casos |
| manual | `regression / full-suite` | 69 casos |

O agendamento esta em `15 15 * * *`, pois o GitHub Actions interpreta o cron
em UTC. O horario e best-effort e pode sofrer atraso ou ser pulado em
periodos de alta demanda.

**Atraso observado na pratica.** Na semana de 28/10 a 02/11/2026, nenhuma
execucao agendada comecou perto das 15:15 UTC: o atraso variou de 4 a 8 horas
(a de 02/11 so rodou as 23:06 UTC). Todas concluiram verdes, mas quem precisar
do resultado em horario certo deve acionar manualmente (`workflow_dispatch`).

O job `regression / full-suite` roda os tres niveis em steps separados
(`1. Testes Unitarios`, `2. Testes de API`, `3. Testes End-to-End (E2E)`),
cada um com o proprio relatorio JUnit, para que o resultado por nivel fique
visivel na pagina da execucao.

## Configuracao do Quality Gate

**Ativada em 03/11/2026.** A API do GitHub
(`GET /repos/Ev-maers/resolveai-testes/branches/main`) confirma
`protected: true`, com `quality-gate / smoke-e2e` e `quality-gate / unit-and-api`
como checks obrigatorios. O nivel de aplicacao registrado e `non_admins`: o
dono do repositorio ainda consegue contornar a regra. Para fechar essa brecha,
marque **Do not allow bypassing the above settings** na mesma regra.

Em **Settings > Branches > Branch protection rules**, a regra da branch `main`
deve ter:

1. **Require a pull request before merging**;
2. **Require status checks to pass before merging**;
3. exatamente `quality-gate / unit-and-api`;
4. exatamente `quality-gate / smoke-e2e`;
5. **Require branches to be up to date before merging**;
6. opcionalmente, a exigencia de aprovacao de um revisor.

Os dois checks devem ser obrigatorios porque representam os testes de entrada
antes do merge. A regressao diaria e uma verificacao de acompanhamento e nao
deve bloquear um PR por ser executada em outro evento.

## Depois dos testes: metricas, issues e relatorios

Todo job executa a mesma sequencia depois dos testes, sempre com `if: always()`
(na execucao vermelha e que ela mais importa). O detalhe de cada metrica, e o
que foi descartado, esta em `metricas-de-qualidade.md`.

| Step | Script | Produz |
| :-- | :-- | :-- |
| Calcula as metricas | `scripts/metricas.js` | `evidencias/metricas.json` (taxa, cobertura do plano, falhas por historia, tipo de falha, tempo, tendencia) |
| Registra as falhas como issues | `scripts/abrir-issues.js` | uma issue por teste reprovado (rotulo `falha-de-teste`); comenta se ja existe; fecha quando o teste volta a passar; `evidencias/issues.json` |
| Gera os relatorios | `scripts/relatorios.js` | `relatorio-tecnico.html`, `relatorio-negocio.html` e `resumo.md` (vai para a aba *Summary*) |
| Registra o historico (so regressao completa e back-end real) | `scripts/registrar-historico.js` | acrescenta uma linha em `historico.jsonl` e publica os relatorios mais recentes na branch `metricas` |

Permissoes: `issues: write` em todos os jobs (token da propria execucao);
`contents: write` so nos jobs que escrevem na branch `metricas`. A `main`
continua protegida e nunca recebe commit da pipeline. O gatilho `push` ignora
a branch `metricas` (`branches-ignore`), que nao tem testes.

## Evidencias

Em cada execucao, a pasta `evidencias/` inteira vira artefato:

- `evidencias-unit-api-<run_id>`;
- `evidencias-e2e-smoke-<run_id>`;
- `evidencias-regressao-<run_id>`.

Cada um contem os JUnit por nivel (`unidade.xml`, `api.xml`, `e2e.xml` ou
`e2e-smoke.xml`), os logs (`<nivel>.log` com a saida do runner e `sut.log` com a
do servidor alvo), `metricas.json`, `issues.json`, `resumo.md` e os dois
relatorios HTML.

Quando um teste falha, `scripts/anotar-falhas.js` cria anotacoes na execucao e
os artefatos continuam sendo publicados por causa de `if: always()`. No PR,
o bloqueio e evidenciado pelo check vermelho e pelo botao de merge desabilitado
enquanto um dos dois checks obrigatorios estiver falhando.

**Evidencia das issues e dos relatorios gerados pela pipeline:**
`evidencias/issues-e-relatorios.md`.

**Evidencia do bloqueio:** o PR #8
(<https://github.com/Ev-maers/resolveai-testes/pull/8>) quebrou de proposito o
teste U1 e ficou com o merge bloqueado. O registro, com a resposta da API do
GitHub, esta em `evidencias/bloqueio-de-merge.md`.
