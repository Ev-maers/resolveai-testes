# Pipeline de CI e Quality Gate

## Alinhamento com o backlog

O plano de testes define 69 casos automatizados: 5 unitarios, 53 de API e
11 jornadas E2E. O passo `Verifica cobertura do backlog` confere essa
quantidade e a quantidade de arquivos antes da execucao da regressao.
Assim, a pipeline falha se um conjunto previsto for removido ou reduzido.

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

## Configuracao do Quality Gate

Em **Settings > Branches > Branch protection rules**, crie ou edite a regra
da branch `main` e habilite:

1. **Require a pull request before merging**;
2. **Require status checks to pass before merging**;
3. adicione exatamente `quality-gate / unit-and-api`;
4. adicione exatamente `quality-gate / smoke-e2e`;
5. habilite **Require branches to be up to date before merging**;
6. opcionalmente, habilite a exigencia de aprovacao de um revisor.

Os dois checks devem ser obrigatorios porque representam os testes de entrada
antes do merge. A regressao diaria e uma verificacao de acompanhamento e nao
deve bloquear um PR por ser executada em outro evento.

## Evidencias

Em cada execucao, os arquivos JUnit ficam disponiveis como artefatos:

- `evidencias-unit-api-<run_id>`;
- `evidencias-e2e-smoke-<run_id>`;
- `evidencias-regressao-<run_id>`.

Quando um teste falha, `scripts/anotar-falhas.js` cria anotacoes na execucao e
os artefatos continuam sendo publicados por causa de `if: always()`. No PR,
o bloqueio e evidenciado pelo check vermelho e pelo botao de merge desabilitado
enquanto um dos dois checks obrigatorios estiver falhando.
