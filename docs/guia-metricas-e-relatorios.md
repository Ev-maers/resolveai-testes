# Guia de estudo e apresentação — métricas, issues e relatórios

Para quem vai explicar a atividade "QA-04/11/2026" para a professora. Tem três
partes: **A) a ideia em um minuto**, **B) o passo a passo do que a pipeline faz**
(para entender cada etapa), e **C) o roteiro da demonstração**, com as perguntas
prováveis.

Documento de referência das decisões: [`metricas-de-qualidade.md`](metricas-de-qualidade.md).

---

## A) A ideia em um minuto

Antes, a pipeline respondia uma pergunta: **"quebrou?"**. Agora ela responde
mais quatro, sem ninguém fazer nada:

| Pergunta | Quem responde | Onde aparece |
| :-- | :-- | :-- |
| O que quebrou, onde, e por quê? | `metricas.js` | relatório técnico, aba Summary |
| Alguém está cuidando disso? | `abrir-issues.js` | aba Issues (rótulo `falha-de-teste`) |
| Dá para entregar? Onde está o risco? | `relatorios.js` | relatório de negócio (semáforo) |
| Está melhorando ou piorando? | `registrar-historico.js` + branch `metricas` | gráfico de tendência nos dois relatórios |

A frase para abrir: *"A pipeline deixou de ser um alarme e virou um painel:
cada execução vira números, issues e dois relatórios, um para quem corrige e
outro para quem decide."*

---

## B) O que acontece em cada etapa (para entender, não para decorar)

Toda execução, em qualquer um dos três jobs, segue a mesma sequência depois
dos testes. Está em `.github/workflows/testes.yml`.

### 1. Os testes gravam JUnit e log

Cada nível roda pelo `scripts/executar-suite.js`, com dois relatores: `spec`
(para o log, legível) e `junit` (XML, legível por máquina). A saída fica em
`evidencias/<nivel>.log`, e o back-end real grava `evidencias/backend.log`.
**Esses são os artefatos de teste**: XML para análise automática, log para
análise humana. No mesmo passo, o quality gate separa falha nova de defeito
conhecido e decide se o estágio reprova.

### 2. `metricas.js` transforma XML em números

Lê os XML, classifica cada caso pelo **prefixo do nome** (`U1` é unitário,
`HU-03` é API da história 3, `E2E-04` é jornada) e calcula as nove métricas
de `metricas-de-qualidade.md`. O resultado é `evidencias/metricas.json`.

Ponto para explicar: a classificação por nome só funciona porque a suíte tem a
convenção "o nome do teste começa pela história" desde o início
(`README.md`, seção 5). Uma convenção de nomes virou dado.

### 3. `abrir-issues.js` registra cada falha

Para cada **falha nova**, procura uma issue aberta com o título
`[pipeline] <nome do teste>`. Se existe, comenta; se não, cria, com o rótulo
`triagem` e as cinco perguntas da política de manutenção. Falha de ambiente
(alvo fora do ar) vira **uma** issue só. Cada defeito conhecido do produto tem
a sua issue `[defeito D-nn]`, com severidade e prazo. E quando um teste que
tinha issue **volta a passar na mesma branch, a issue é fechada sozinha**, com
link da execução verde.

Ponto para explicar: o ciclo completo (abrir, atualizar, fechar) é o que torna
a lista de issues confiável. Se só abrisse, em um mês haveria 200 issues e
ninguém leria.

### 4. `relatorios.js` gera os dois HTML e o resumo

- **Técnico**: por nível, falhas com mensagem e link da issue, por história,
  tempo (os 5 mais lentos), tendência, falhas recorrentes, issues, artefatos.
- **Negócio**: semáforo, seis indicadores, risco por história com impacto,
  tendência, "o que este verde significa" e recomendação.
- **Resumo**: tabela em Markdown que vai para a aba *Summary* da execução.

Os HTML são autocontidos (CSS e gráfico SVG embutidos): abrem offline e podem
ser anexados em e-mail.

### 5. `registrar-historico.js` guarda a execução para a próxima

Só na regressão completa (agendada ou manual). Faz checkout da branch `metricas`, acrescenta uma linha em `historico.jsonl`,
copia os relatórios mais recentes e dá push. A próxima execução lê esse
arquivo para calcular estabilidade e falhas recorrentes.

Ponto para explicar: por que uma branch e não a `main`? Porque a `main` é
protegida pelo quality gate e não deve receber commit de robô. A branch
`metricas` é só dados.

### 6. Artefatos e anotações

`upload-artifact` publica a pasta `evidencias/` inteira (XML, logs, JSON, HTML)
com `if: always()`, ou seja, **também quando falha**, que é quando mais
precisamos. `anotar-falhas.js` transforma cada reprovação em anotação na
página da execução.

---

## C) Roteiro da demonstração (10 minutos)

### Antes

1. Confirme que tem permissão de escrita no repositório (para o botão
   *Run workflow*).
2. Deixe abertas: a aba *Actions*, a aba *Issues* filtrada por
   `label:falha-de-teste`, a branch `metricas` e este guia.
3. Tenha à mão as evidências registradas em
   [`evidencias/issues-e-relatorios.md`](evidencias/issues-e-relatorios.md)
   (execuções #77 e #78 e a issue #10) e em
   [`evidencias/politica-de-manutencao.md`](evidencias/politica-de-manutencao.md)
   (issues #25 a #27). Se quiser mostrar ao vivo, crie uma branch, troque um
   `16` por `17` em `tests/unidade/oraculo.test.js`, dê push e espere alguns
   minutos: a issue aparece. Desfaça e dê push de novo **na mesma branch**: a
   issue fecha.

### Durante

1. **Workflow.** Abra `.github/workflows/testes.yml` e mostre, no job
   `regression / full-suite`, a sequência depois dos três steps de teste:
   *Calcula as metricas*, *Registra as falhas como issues*, *Gera os relatorios*,
   *Publica evidencias*, *Registra o historico*. Diga que os três jobs têm a
   mesma sequência.
2. **Execução da regressão.** Em *Actions*, abra a última execução agendada.
   Mostre a aba *Summary*: o semáforo diz **NAO ENTREGAR (vermelho)**, porque o
   produto tem defeitos de severidade alta em aberto, embora o job esteja
   verde (nenhuma falha nova). No fim da página, o artefato
   `evidencias-regressao-<id>` traz `unidade.xml`, `api.xml`, `e2e.xml`,
   `backend-componente.xml`, os `*.log`, `metricas.json`,
   `relatorio-tecnico.html` e `relatorio-negocio.html`.
3. **Relatórios.** Abra os dois HTML (do artefato baixado, ou pelo GitHub
   Pages se estiver habilitado). No de negócio, aponte o semáforo, os
   indicadores, a tabela de defeitos conhecidos e o risco por história. No
   técnico, a tabela de falhas, com o tipo de cada uma (nova, defeito
   conhecido ou ambiente), e o gráfico de tendência.
4. **Issue automática.** Abra a execução #77 (vermelha) e, na aba *Issues*,
   a issue #10 `[pipeline] U1 ...` criada pela pipeline, com mensagem, link da
   execução e commit. Depois mostre que a execução #78 (correção) **fechou** a
   mesma issue com o comentário "O teste voltou a passar". Para os defeitos do
   produto, filtre por `label:defeito-conhecido`.
5. **Tendência.** Abra a branch `metricas`, mostre `historico.jsonl` (uma linha
   por execução) e explique que o gráfico dos relatórios vem dali.
6. **Métricas escolhidas e descartadas.** Abra `metricas-de-qualidade.md`,
   seções 2 e 3. Leia duas selecionadas (falhas por história com impacto;
   idade das issues abertas) e duas descartadas (cobertura de código; número de
   testes), com o motivo.

### Perguntas prováveis

- **"Por que não cobertura de código?"** O código de produção está em outro
  repositório, em Python. Aqui não há uma linha de produção para cobrir; a
  cobertura que faz sentido aqui é **do plano de testes** (M2).
- **"Como a pipeline sabe que a falha é de ambiente?"** Pela mensagem: a camada
  `lib/http.js` produz um texto próprio ("SUT inacessivel") quando o alvo não
  responde. A métrica M4 reconhece esse texto. É a regra G3 do `tas.md`.
- **"E se o mesmo teste falhar todo dia?"** A issue não duplica: a pipeline
  comenta na existente. E o teste aparece em "falhas recorrentes" (M7).
- **"O relatório de negócio pode dizer 'verde' com o produto quebrado?"**
  Não. A esteira roda contra o back-end real, e o semáforo separa as duas
  perguntas: o job verde diz "nenhuma falha nova"; o semáforo **NAO ENTREGAR**
  diz "há defeitos de severidade alta em aberto". Os dois aparecem juntos na
  aba *Summary*.
- **"Cada defeito do back-end real abre uma issue a cada execução?"** Não. É
  uma issue por **defeito** (não por teste e não por execução), aberta uma vez,
  com severidade, prazo e encaminhamento. Ela é reaberta se alguém a fechar com
  o defeito ainda presente, e marcada como `possivelmente-corrigido` se os
  testes passarem. Assim, 19 testes reprovados viram 10 issues, e não 19 por
  dia.
- **"Onde fica o histórico?"** Na branch `metricas`, escrita só pela pipeline.
  As 37 primeiras linhas foram importadas das execuções antigas via API do
  GitHub (sem detalhe por teste); dali em diante, cada execução grava a sua.
- **"Precisa instalar algo?"** Não. Tudo é Node puro (`fetch`, `node:test`,
  `node:fs`), coerente com a decisão de zero dependências da suíte.
