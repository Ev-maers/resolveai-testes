# Guia da apresentação — como rodar e mostrar na aula

Para quem vai compartilhar a tela na aula. Tem duas partes: **A) a demonstração
no GitHub** (o principal) e **B) rodar no seu computador** (plano B, ou para
ensaiar sem depender do GitHub).

Repositório: <https://github.com/Ev-maers/resolveai-testes>

Guias complementares:

- métricas, issues e relatórios: [`guia-metricas-e-relatorios.md`](guia-metricas-e-relatorios.md);
- política de manutenção: [`guia-politica-de-manutencao.md`](guia-politica-de-manutencao.md).

---

## O que a professora pediu

Mostrar a esteira funcionando no GitHub Actions **contra o produto real**: o
arquivo do workflow, o acionamento, os estágios por nível de teste, o quality
gate e o resultado. E o cenário pela interface em que o gestor muda o status e
o cidadão vê a notificação (E2E-13).

---

## A) Demonstração no GitHub

### Antes da aula (faça uma vez, 10 minutos)

1. **Confirme que você tem permissão de escrita no repositório.** Sem ela, o
   botão *Run workflow* não aparece. O dono do repositório (`Ev-maers`)
   adiciona em *Settings → Collaborators → Add people*.
2. Em <https://github.com/Ev-maers/resolveai-testes/actions>, faça um ensaio
   completo (passos abaixo). A regressão leva alguns minutos, porque sobe o
   back-end real antes dos testes.
3. Deixe abertas: `.github/workflows/testes.yml`, a aba *Actions*, a aba
   *Issues* e a [`matriz-de-cobertura.md`](matriz-de-cobertura.md).

### Durante a aula (passo a passo)

1. **Mostre o arquivo do workflow.** Abra `.github/workflows/testes.yml` e
   aponte:
   - os quatro gatilhos em `on:`: `push`, `pull_request` para a `main`,
     `schedule` (diário, 15:15 UTC = 12:15 em Brasília) e `workflow_dispatch`
     (manual);
   - o comentário do topo: **todos os estágios rodam contra o back-end real**,
     subido dentro da esteira pela ação `.github/actions/backend-real`, com
     banco novo a cada execução. Não existe `continue-on-error`;
   - os três jobs, cada um com um `if` que diz em qual evento roda:

     | Job | Quando | O que roda |
     | :--- | :--- | :--- |
     | `quality-gate / unit-and-api` | push e PR | verificação da TAS, 6 unitários e 53 de API |
     | `quality-gate / smoke-e2e` | PR | as jornadas E2E-01, 02 e 03 |
     | `regression / full-suite` | agendado e manual | **1.** unitários, **2.** API, **3.** E2E pela API, **4.** testes do próprio back-end e o quality gate de todos os níveis |

2. **Acione a regressão.** Em *Actions*, escolha **pipeline-de-testes**, clique
   em **Run workflow** e confirme no botão verde. Os dois jobs de quality gate
   aparecem como *skipped*, porque só rodam em push e PR.
3. **Abra a execução** e o job **regression / full-suite**. Mostre os steps
   *Sobe o back-end real* e os quatro níveis de teste, cada um com o seu
   resultado.
4. **Explique por que o job fica verde com testes reprovados.** Abra o step
   *2. Testes de API*: aparecem 13 reprovações, e no fim o quality gate diz
   que todas são defeitos conhecidos. Na aba *Summary*, as anotações listam
   cada reprovação com o id do defeito (D-02, D-08…). A frase: *"o verde do
   gate quer dizer 'nenhuma falha nova', não 'produto sem defeito'; os
   defeitos conhecidos continuam visíveis e cobrados"*.
5. **Mostre o resumo e o semáforo.** Na aba *Summary*, o semáforo do
   relatório de negócio diz **NÃO ENTREGAR**, por causa dos defeitos de
   severidade alta. No fim da página, o artefato
   `evidencias-regressao-<id>` traz o JUnit, os logs, as métricas e os dois
   relatórios HTML.
6. **Mostre as issues dos defeitos.** Na aba *Issues*, filtre por
   `label:defeito-conhecido`: uma issue por defeito, aberta pela esteira, com
   severidade, prazo e encaminhamento.
7. **Mostre o quality gate bloqueando o merge.** Abra o PR #8
   (`[NAO MESCLAR] Evidencia de bloqueio do quality gate`): o check
   `quality-gate / unit-and-api` está vermelho e o merge, bloqueado. O
   registro completo está em
   [`evidencias/bloqueio-de-merge.md`](evidencias/bloqueio-de-merge.md).
8. **Mostre o E2E-13 (gestor muda o status, cidadão vê a notificação).** Em
   *Actions*, abra a última execução do workflow **e2e-app**. Roteiro e
   capturas em [`evidencias/e2e13-notificacao.md`](evidencias/e2e13-notificacao.md).

> Se a execução demorar a começar, espere uns 10 segundos e atualize a página.

---

## B) Rodar no seu computador

### Instalar (uma vez)

- **Node.js 20.11 ou mais novo** (<https://nodejs.org>). Confira com `node --version`.
- **Git** e **Python 3.10 ou mais novo** (para subir o back-end real).
- Não existe `npm install`: o projeto não usa dependências.

### Rodar contra o back-end real (o mesmo que a esteira faz)

```bash
git clone https://github.com/Ev-maers/resolveai-testes.git
cd resolveai-testes
npm run test:backend-real
```

O comando clona o back-end, cria um banco novo, sobe o servidor, roda a suíte
pelo quality gate e desliga o servidor. **Resultado esperado:** 19 testes
reprovados, todos defeitos conhecidos, e o gate aprovando. `npm run qualidade`
faz o mesmo e ainda gera os relatórios em `evidencias/`.

### Outros comandos úteis na demonstração

| O que mostrar | Comando | Precisa do back-end? |
| :--- | :--- | :---: |
| Unitários (6) | `npm run test:unidade` | não |
| Regras automáticas da política (P1 a P6) | `npm run verificar` | não |
| Rotina de manutenção, sem escrever no GitHub | `npm run manutencao` | não |
| Verificação rápida da própria suíte contra o duplo | `npm run test:tudo` | não (sobe o duplo) |

### Se der problema

| O que aparece | O que fazer |
| :--- | :--- |
| "a porta 5000 esta ocupada" | Outro programa usa a porta (no Mac, costuma ser o AirPlay Receiver). Rode em outra: Mac/Linux `PORT=5001 npm run test:backend-real`; Windows (PowerShell) `$env:PORT=5001; npm run test:backend-real` |
| `python` não encontrado | Instale o Python 3.10+ e abra um terminal novo |
| `node: command not found` | Instale o Node.js e abra um terminal novo |
| Testes falham em massa com "SUT inacessivel" | O back-end não subiu. Leia `.backend-real/backend.log` |

---

## O que dizer (5 pontos)

1. **O que é testado:** o produto real do Projeto Integrador. A API do
   back-end Flask, as jornadas do usuário sobre ela e uma jornada pela
   interface do app (E2E-13).
2. **Os níveis:** *unitário* confere o gabarito e o próprio quality gate;
   *API* testa uma regra de cada vez; *E2E pela API* encadeia uma jornada;
   *E2E pela interface* mostra o que o cidadão vê na tela.
3. **Cada regra tem um único teste dono**, e cada teste responde uma pergunta.
   O catálogo está em [`matriz-de-cobertura.md`](matriz-de-cobertura.md).
4. **O gate separa falha nova de defeito conhecido.** Falha nova bloqueia o
   merge. Defeito já triado não bloqueia, mas continua no relatório, na
   anotação e numa issue com prazo. Se o defeito for corrigido, o gate pede a
   retirada do registro, para não esconder uma regressão futura.
5. **Limites, ditos com clareza:** o E2E pela interface roda num estágio
   próprio, que informa no PR mas não bloqueia o merge, porque depende de
   emulador (risco R-07 do [`tas.md`](tas.md)). E o produto ainda não pode ser
   entregue: cinco defeitos de severidade alta estão abertos
   ([`relatorio-qualidade.md`](relatorio-qualidade.md)).

### Perguntas que a professora pode fazer

- **"A esteira roda contra o produto real?"** Sim. Os três jobs sobem o
  back-end a partir do repositório dele, em toda execução. O duplo de
  referência só serve à verificação de sensibilidade da suíte.
- **"Se há testes reprovando, por que o job está verde?"** Porque todas as
  reprovações são defeitos conhecidos, registrados com triagem, severidade e
  prazo em `data/defeitos-conhecidos.js`. Qualquer falha fora desse registro
  reprova o job. É o contrário do `continue-on-error`, que deixaria passar
  também as falhas novas.
- **"Por que Maestro no E2E-13?"** Lê os `testID` do app, enxerga a gaveta de
  notificações do Android e roda pela linha de comando, sem dependência npm. A
  comparação com as alternativas está no [`tas.md`](tas.md), seção 8.
- **"Por que o gestor muda o status pela API no E2E-13?"** O que está sob
  teste é o que o cidadão vê. Trocar de conta no mesmo aparelho desligaria as
  notificações do cidadão, e a regra da mudança de status já é testada pela API.
