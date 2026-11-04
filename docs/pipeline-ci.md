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

## Evidencias

Em cada execucao, os arquivos JUnit ficam disponiveis como artefatos:

- `evidencias-unit-api-<run_id>`;
- `evidencias-e2e-smoke-<run_id>`;
- `evidencias-regressao-<run_id>` (contem `unidade.xml`, `api.xml` e `e2e.xml`).

Quando um teste falha, `scripts/anotar-falhas.js` cria anotacoes na execucao e
os artefatos continuam sendo publicados por causa de `if: always()`. No PR,
o bloqueio e evidenciado pelo check vermelho e pelo botao de merge desabilitado
enquanto um dos dois checks obrigatorios estiver falhando.

**Evidencia do bloqueio:** o PR #8
(<https://github.com/Ev-maers/resolveai-testes/pull/8>) quebrou de proposito o
teste U1 e ficou com o merge bloqueado. O registro, com a resposta da API do
GitHub, esta em `evidencias/bloqueio-de-merge.md`.
