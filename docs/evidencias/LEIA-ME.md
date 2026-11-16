# Evidências

Registros de evidência que ficam no repositório. A evidência de cada execução
(JUnit, logs, métricas e relatórios) é publicada pela própria esteira, como
artefato da execução no GitHub Actions
(<https://github.com/Ev-maers/resolveai-testes/actions>), e os relatórios mais
recentes e o histórico ficam na branch `metricas`.

| Registro | O que mostra |
| :--- | :--- |
| [`politica-de-manutencao.md`](politica-de-manutencao.md) | A política de manutenção aplicada da identificação ao encaminhamento: defeitos do produto, um teste instável real (HU-14) e um defeito da TAS simulado (16/11/2026) |
| [`e2e13-notificacao.md`](e2e13-notificacao.md) | O E2E-13 pela interface do app: o gestor muda o status e o cidadão vê a notificação (16/11/2026) |
| [`bloqueio-de-merge.md`](bloqueio-de-merge.md) e [`bloqueio-de-merge-pr8.jpg`](bloqueio-de-merge-pr8.jpg) | O PR #8, que quebrou um teste de propósito e ficou com o merge bloqueado pela proteção da `main` (03/11/2026) |
| [`issues-e-relatorios.md`](issues-e-relatorios.md) | A primeira issue aberta e fechada pela esteira, os artefatos e os relatórios (03/11/2026) |
| [`u1-2026-09-09/`](u1-2026-09-09/) | Arquivos da entrega da U1 (09/09/2026), quando a suíte tinha 106 casos. Registro histórico |

Para gerar a evidência atual no seu computador: `npm run qualidade`. O comando
sobe o back-end real, roda a suíte e grava em `evidencias/` (na raiz do
repositório) o `resultado.xml`, o `metricas.json`, o `relatorio-tecnico.html`
e o `relatorio-negocio.html`. Esses arquivos são gerados e ignorados pelo git.
