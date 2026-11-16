# Pipeline de CI e quality gate

Como a esteira executa os testes, contra qual alvo, o que bloqueia o merge e
onde ficam as evidências. As decisões por trás de cada escolha estão em
[`tas.md`](tas.md), seções 7 a 9.

---

## 1. Contra quem a esteira testa

Todos os estágios rodam contra o **produto real** do Projeto Integrador:

| Alvo | Origem | Como entra na esteira |
| :--- | :--- | :--- |
| Back-end Flask | [ndrfelipe/smart-city](https://github.com/ndrfelipe/smart-city), branch padrão | Ação `.github/actions/backend-real`: clona o repositório, instala as dependências, cria um banco SQLite novo, semeia os quatro usuários de teste e sobe o servidor na porta 5000. Cada execução tem um back-end limpo e exclusivo. |
| App Expo | [PetersonNave/Smart-City](https://github.com/PetersonNave/Smart-City), branch padrão | Workflow `e2e-app`: instala o app, sobe o Metro apontando para o back-end real e abre o app no Expo Go, num emulador Android. |

O commit do back-end e o do app testados aparecem no log de cada execução e
nas issues abertas pela esteira.

O duplo de referência (`sut-referencia/`) **não é alvo de entrega**. Ele só é
usado pela verificação de sensibilidade, que injeta defeitos conhecidos para
confirmar que a suíte sabe ficar vermelha. Fazer isso com o produto real seria
quebrar o produto de propósito.

---

## 2. Gatilhos e estágios

| Evento | Check | Escopo | Bloqueia o merge? |
| :--- | :--- | :--- | :--- |
| `push` em qualquer branch | `quality-gate / unit-and-api` | verificação da TAS, 6 unitários e 53 de API | sim |
| `pull_request` para `main` | `quality-gate / unit-and-api` | idem | sim |
| `pull_request` para `main` | `quality-gate / smoke-e2e` | E2E-01, E2E-02 e E2E-03 pela API | sim |
| `pull_request` para `main` | `e2e / app-notificacao` | E2E-13 pela interface do app | não (bloqueia a entrega) |
| diário, 12:15 em Brasília, e manual | `regression / full-suite` | todos os níveis e os 45 testes do próprio back-end | não (acompanhamento) |
| diário, 12:45 em Brasília, e manual | `e2e / app-notificacao` | E2E-13 | não |
| `push` na `main` | `verificacao de sensibilidade` | 6 defeitos injetados no duplo | não (bloqueia a entrega) |
| diário, 09:00 em Brasília, e manual | `manutencao / prazos-instabilidade-revisao` | política de manutenção | não |

O GitHub Actions interpreta o cron em UTC e executa o agendamento quando há
capacidade. Entre 28/10 e 02/11/2026, as execuções agendadas atrasaram de 4 a
8 horas. Quem precisar do resultado em horário certo deve disparar o workflow
manualmente (*Run workflow*).

O job `regression / full-suite` roda cada nível num step separado (`1. Testes
unitarios`, `2. Testes de API`, `3. Testes End-to-End (E2E) pela API` e `4.
Testes de componente do proprio back-end`), para que o resultado de cada um
apareça separado na página da execução.

---

## 3. Como o quality gate decide

Cada estágio roda pelo `scripts/executar-suite.js`, que executa o nível,
grava o JUnit e o log e aplica a regra do gate (`scripts/quality-gate.js`).

| Resultado do teste | Decisão |
| :--- | :--- |
| Aprovado | segue |
| Reprovado e registrado em `data/defeitos-conhecidos.js` | segue; o teste continua reprovado no relatório, na anotação e na issue do defeito |
| Reprovado fora do registro (falha nova) | **reprova o estágio** |
| Reprovado porque o back-end não respondeu | **reprova o estágio**, classificado como ambiente |
| Teste de defeito conhecido que passou | **reprova o estágio** até a entrada sair do registro |

Contra o back-end real, hoje, 21 testes reprovam por 11 defeitos conhecidos do
produto (D-02 a D-13). Eles aparecem como anotação amarela em toda execução,
com severidade e prazo. Qualquer outra falha deixa o check vermelho e trava o
merge.

Não há `continue-on-error` em nenhum workflow, e a verificação da política
(`scripts/verificar-politica.js`, regra P4) reprova quem tentar acrescentá-lo.

---

## 4. Configuração da proteção da `main`

**Ativada em 03/11/2026.** A API do GitHub
(`GET /repos/Ev-maers/resolveai-testes/branches/main`) confirma
`protected: true`, com `quality-gate / unit-and-api` e `quality-gate /
smoke-e2e` como checks obrigatórios e uma revisão aprovada exigida.

Em **Settings > Branches > Branch protection rules**, a regra da `main` tem:

1. **Require a pull request before merging**;
2. **Require status checks to pass before merging**;
3. exatamente `quality-gate / unit-and-api`;
4. exatamente `quality-gate / smoke-e2e`;
5. **Require branches to be up to date before merging**;
6. aprovação de um revisor.

O nível de aplicação registrado é `non_admins`: o dono do repositório ainda
consegue contornar a regra. Para fechar essa brecha, marque **Do not allow
bypassing the above settings** na mesma regra.

O `e2e / app-notificacao` não é obrigatório de propósito. Ele leva de 15 a 25
minutos e depende de emulador, e um check frágil no merge ensina a squad a
contornar o gate (Material, cap. 8). Ele bloqueia a entrega: a `main` precisa
estar verde nele para a squad declarar a entrega.

---

## 5. Depois dos testes: métricas, issues e relatórios

Todo job executa a mesma sequência depois dos testes, sempre com
`if: always()`, porque é na execução vermelha que ela mais importa. O detalhe
de cada métrica está em [`metricas-de-qualidade.md`](metricas-de-qualidade.md).

| Step | Script | Produz |
| :-- | :-- | :-- |
| Calcula as métricas | `scripts/metricas.js` | `evidencias/metricas.json`: taxa de aprovação, cobertura do plano, falhas por história, tipo de cada falha (nova, ambiente ou defeito conhecido), tempo e tendência |
| Registra as falhas como issues | `scripts/abrir-issues.js` | issue por teste com falha nova, issue por defeito conhecido, issue única de ambiente; fecha a issue do teste que voltou a passar |
| Gera os relatórios | `scripts/relatorios.js` | `relatorio-tecnico.html`, `relatorio-negocio.html` e `resumo.md`, que vai para a aba *Summary* |
| Registra o histórico (só na regressão) | `scripts/registrar-historico.js` | uma linha em `historico.jsonl` e os relatórios mais recentes na branch `metricas` |

Permissões: `issues: write` em todos os jobs, com o token da própria execução,
e `contents: write` só no job que escreve na branch `metricas`. A `main`
continua protegida e nunca recebe commit da esteira.

---

## 6. Evidências

Em cada execução, a pasta `evidencias/` inteira vira artefato:

| Artefato | Conteúdo |
| :--- | :--- |
| `evidencias-unit-api-<run_id>` | `unidade.xml`, `api.xml`, logs, decisão do gate (`*.gate.json`), log do back-end, métricas e relatórios |
| `evidencias-e2e-smoke-<run_id>` | `e2e-smoke.xml` e os mesmos complementos |
| `evidencias-e2e-app-<run_id>` | `app.xml`, capturas de tela de cada passo, vídeo da execução no emulador, logs do Maestro e do Metro |
| `evidencias-regressao-<run_id>` | os quatro níveis, incluindo `backend-componente.xml` |

Quando um teste falha, `scripts/anotar-falhas.js` cria anotações na página da
execução. Elas são públicas, inclusive pela API de check-runs, e trazem o nome
do teste e o motivo. Quando o E2E-13 falha, a esteira publica também, como
anotação, o que estava na tela do emulador e o fim dos logs do Maestro e do
Metro.

Registros de evidência que ficam no repositório, em `docs/evidencias/`:

- [`bloqueio-de-merge.md`](evidencias/bloqueio-de-merge.md): o PR #8 quebrou
  um teste de propósito e ficou com o merge bloqueado;
- [`issues-e-relatorios.md`](evidencias/issues-e-relatorios.md): issues
  abertas e fechadas pela esteira, artefatos e relatórios;
- [`e2e13-notificacao.md`](evidencias/e2e13-notificacao.md): execução do
  E2E-13 no emulador, com as capturas de cada passo;
- [`politica-de-manutencao.md`](evidencias/politica-de-manutencao.md):
  aplicação da política a uma situação real e a uma simulada.
