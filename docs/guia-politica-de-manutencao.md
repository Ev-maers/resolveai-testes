# Guia de estudo e apresentação — política de manutenção da TAS

Para quem vai estudar e apresentar o desafio **"Política de Manutenção"**
(Material de Estudo, cap. 13). O guia tem seis partes:

- **A)** a ideia em um minuto;
- **B)** a política, regra por regra, com o porquê de cada decisão;
- **C)** os mecanismos que a aplicam no GitHub;
- **D)** a demonstração, com as evidências;
- **E)** o roteiro da apresentação;
- **F)** as perguntas prováveis.

Documentos de referência:

- a política em si, com valor de norma: [`tas.md`](tas.md), seção 9;
- as evidências da demonstração, com links:
  [`evidencias/politica-de-manutencao.md`](evidencias/politica-de-manutencao.md).

---

## A) A ideia em um minuto

Sem uma política, cada execução vermelha vira uma decisão improvisada:
reexecutar até passar, marcar o teste como `skip`, ligar o `continue-on-error`,
dizer que "esse teste é instável mesmo". Cada uma dessas saídas esconde
informação, e a squad aprende a ignorar o vermelho.

A política responde, para qualquer falha, a quatro perguntas, e cada resposta
tem um mecanismo no repositório que a aplica sozinho:

| Pergunta | Regra da política | Quem aplica |
| :--- | :--- | :--- |
| A falha é nova ou já conhecida? | Falha nova bloqueia; defeito conhecido não bloqueia, mas fica visível | Quality gate (`scripts/quality-gate.js`) |
| Quem cuida, e até quando? | Toda falha vira issue com triagem, classificação, responsável e prazo | `scripts/abrir-issues.js`, comando `/triagem` |
| O prazo está sendo cumprido? | Rotina diária cobra os prazos vencidos | Workflow `manutencao.yml` |
| A suíte continua saudável? | Revisão quinzenal com dados; remoção de teste só com decisão registrada | `manutencao.yml` e `verificar-politica.js` (P1 a P6) |

A frase para abrir: *"A política tira a manutenção da memória das pessoas e
põe no repositório: toda falha vira um registro com dono e prazo, e a própria
esteira cobra."*

---

## B) A política, regra por regra, com o porquê

### 1. Tratamento de falhas: investigar, classificar, encaminhar

**Detecção e registro (automáticos).** Quando um teste reprova fora do
registro de defeitos conhecidos, o quality gate reprova o estágio, e a esteira
abre a issue `[pipeline] <nome do teste>` com os rótulos `falha-de-teste`,
`triagem` e `manutencao`. Ela traz a mensagem, o link da execução e os commits
da suíte e do back-end.

> *Por quê:* registrar é a etapa que mais se perde quando depende de alguém.
> Feita pela esteira, nenhuma falha fica sem rastro.

**Investigação: as cinco perguntas.** Estão no corpo de toda issue de falha,
como lista de verificação:

1. A mesma falha ocorreu em execuções anteriores?
2. Em que passo do teste ela ocorreu?
3. O estado do sistema corresponde ao esperado? Se sim, a falha está na TAS.
4. O ambiente estava disponível durante a execução?
5. A falha se repete quando o teste roda sozinho, sem mudança? Se não, é instabilidade.

> *Por quê:* a ordem vai do mais barato ao mais caro. As perguntas 3 e 5 são
> as que separam "o produto errou" de "o teste errou", a distinção central do
> cap. 13.

**Classificação: quatro destinos.**

| Classificação | Rótulo | Encaminhamento | Responsável |
| :--- | :--- | :--- | :--- |
| Defeito do SUT | `defeito-sut` | Repositório do produto e entrada no registro de defeitos, por pull request | Correção: squad do produto. Registro: QA da squad |
| Defeito da TAS | `defeito-tas` | Correção neste repositório | Quem mantém o teste |
| Ambiente | `ambiente` | Restabelecer e conferir o impacto em outros testes | Quem mantém a esteira |
| Variação esperada | `variacao-esperada` | Registrar e fechar | QA da squad |

> *Por quê:* cada destino tem um dono diferente. Classificar antes de
> corrigir evita o erro mais comum: "consertar" o teste para concordar com um
> defeito do produto, o que deixaria a suíte tautológica.

**Encerramento.** A issue de um teste fecha sozinha quando ele volta a passar
**na mesma branch em que a falha foi registrada**. Essa regra foi corrigida
durante a demonstração (parte D). A issue aberta pelo formulário
(`[falha] ...`) é de uma falha vista fora da esteira: quem fez a triagem a
fecha, com o link da execução em que o teste passou.

### 2. Critérios e prazos de correção

| Tipo | Alta | Média | Baixa |
| :--- | :--- | :--- | :--- |
| Triagem de falha nova | 2 dias | 2 dias | 2 dias |
| Defeito do SUT | 7 dias | 14 dias | 30 dias |
| Defeito da TAS | 3 dias | 3 dias | 7 dias |
| Ambiente | 1 dia | 1 dia | 1 dia |

**Severidade:**

- **alta:** afeta segurança, autorização ou integridade do dado (D-02, D-06, D-08);
- **média:** diverge do contrato sem expor dado (D-09, D-10);
- **baixa:** forma, sem efeito para o usuário (D-11).

> *Por quê estes números:*
> - **Triagem em 2 dias:** enquanto a falha não é classificada, ela bloqueia
>   o merge de toda a squad.
> - **TAS em 3 dias:** a automação é do time de testes, e uma suíte quebrada
>   perde a confiança depressa.
> - **SUT por severidade:** a correção depende de outra squad. A política não
>   manda nela, mas registra e cobra.
> - **Ambiente em 1 dia:** sem ambiente, nenhum resultado vale.

**Prioridade entre demandas:** primeiro o que bloqueia o merge (falha nova
e ambiente), depois por severidade, depois por prazo.

### 3. Testes instáveis, sem mascarar defeitos

- **Definição:** o teste alterna entre aprovar e reprovar pelo menos duas vezes
  nas últimas 20 execuções da regressão na `main`, sem mudança no produto.
- **Detecção:** a rotina diária lê o histórico (branch `metricas`) e abre a
  issue `[instavel] <teste>`.
- **Tratamento:** procurar a causa entre as três origens mais comuns: espera
  por tempo fixo, dependência entre testes ou dado compartilhado.
- **Proibido:** reexecutar até passar (regra P3), aumentar espera fixa (P2) e
  pular o teste com `skip`.

> *Por quê:* reexecutar até passar transforma um defeito intermitente
> verdadeiro em verde. A política exige achar a causa. O caso real da
> demonstração (HU-14, parte D) mostra a diferença: a causa estava na própria
> suíte e foi eliminada, sem afrouxar a asserção.

> *Por que um defeito conhecido não é confundido com instabilidade:* ele
> reprova sempre, de forma determinística, e está no registro.

### 4. Revisão periódica

**Frequência:** quinzenal, nos dias 1 e 15. A rotina diária abre a issue
"Revisão periódica da TAS" já preenchida com os dados, e a squad registra as
decisões como comentário.

| Critério (cap. 13) | Dado que a rotina traz |
| :--- | :--- |
| Instabilidade | Testes que alternaram nas últimas 20 execuções |
| Tempo de execução | Tendência das últimas 10 execuções; alerta acima de 30% |
| Duplicação de código | Nomes de teste repetidos; preparação repetida para a pauta |
| Rastreabilidade | Testes sem prefixo de história ou regra (P1) |
| Defeitos e demandas | Prazo, situação e responsável de cada um |

> *Por que quinzenal:* é o ritmo das entregas da squad. Mensal deixaria um
> teste instável sem tratamento por semanas; semanal teria pouca mudança para
> discutir.

### 5. Remoção de testes

**Critérios aceitos:**

- a regra deixou de existir no contrato;
- outro teste já é dono da mesma regra;
- o custo de manter supera o risco coberto;
- a instabilidade não tem causa corrigível no prazo.

**Três registros obrigatórios**, e a falta de qualquer um reprova a esteira:

1. issue "Remoção de teste" (formulário próprio) com motivo, evidência,
   **risco assumido** e **quem decidiu**, com pelo menos duas pessoas;
2. linha nova em `HISTORICO_DO_PLANO` (`data/plano-de-testes.js`); a regra P6
   reprova se o plano diminuir sem essa linha;
3. pull request aprovado por outra pessoa (proteção da `main`).

> *Por quê:* apagar um teste é a forma mais silenciosa de esconder um
> problema. Exigir o risco assumido por escrito obriga a decisão a ser
> consciente. Exemplo real no histórico: em 14/10/2026 o plano caiu de 106
> para 69 casos, com a decisão e o risco registrados.

### 6. A decisão central: registro de defeitos em vez de `continue-on-error`

A professora pediu para remover o `continue-on-error`. Sem ele, e com o
back-end real cheio de defeitos, toda execução ficaria vermelha, e um vermelho
permanente é ignorado. A saída foi o **registro de defeitos conhecidos**
(`data/defeitos-conhecidos.js`):

| Situação | Efeito |
| :--- | :--- |
| Teste reprovado que está no registro | Não bloqueia; continua reprovado no relatório, na anotação e na issue do defeito |
| Teste reprovado fora do registro | **Bloqueia** (falha nova) |
| Teste do registro que passou | **Bloqueia** até a entrada sair do registro |
| Registro inválido | **Bloqueia** |

> *Por que é diferente do `continue-on-error`:* o `continue-on-error`
> deixaria passar **qualquer** falha, inclusive uma regressão nova. O registro
> só tolera o que já foi triado, com dono e prazo. A terceira linha impede que
> o registro esconda uma regressão futura da mesma regra.

---

## C) Os mecanismos no GitHub

| Mecanismo | Arquivo | O que faz |
| :--- | :--- | :--- |
| Quality gate | `scripts/quality-gate.js`, `scripts/executar-suite.js` | Aplica o registro de defeitos em cada estágio. Tem teste próprio (U6). |
| Issues automáticas | `scripts/abrir-issues.js` | Abre, comenta, reabre e fecha issues de falha e de defeito |
| Rótulos da política | `scripts/github.js` | 16 rótulos: classificação, severidade, `triagem`, `prazo-vencido`, `teste-instavel`… |
| Comando de triagem | `.github/workflows/triagem.yml`, `scripts/triagem.js` | Um comentário `/triagem tas media @fulano` aplica rótulos, responsável e prazo |
| Formulários | `.github/ISSUE_TEMPLATE/` | Falha de teste, remoção de teste e manutenção da TAS |
| Checklist do PR | `.github/pull_request_template.md` | Lembra as regras da política em cada pull request |
| Rotina diária | `.github/workflows/manutencao.yml`, `scripts/manutencao.js` | Cobra prazos (`prazo-vencido`), detecta instabilidade e abre a revisão quinzenal |
| Verificação da política | `scripts/verificar-politica.js` | Em todo push: P1 rastreabilidade, P2 sem espera fixa, P3 sem retry, P4 sem `continue-on-error`, P5 registro válido, P6 plano só diminui com decisão |
| Proteção da `main` | *Settings → Branches* | Checks obrigatórios e revisão aprovada por outra pessoa |

**Como o comando `/triagem` funciona.** Quem tem acesso de escrita comenta na
issue:

```
/triagem <sut|tas|ambiente|variacao> [alta|media|baixa] [@responsavel] [prazo AAAA-MM-DD]
```

O workflow troca o rótulo `triagem` pelos da classificação e da severidade,
atribui o responsável e acrescenta ao corpo da issue a seção "Triagem" com a
linha `Prazo: AAAA-MM-DD`, que a rotina diária lê. Depois confirma num
comentário. `variacao` fecha a issue.

> **Atenção:** workflows disparados por comentário só rodam a partir da branch
> padrão. O comando passa a funcionar depois do merge na `main`.

---

## D) A demonstração

Quatro situações, todas com evidência no GitHub. Os links estão em
[`evidencias/politica-de-manutencao.md`](evidencias/politica-de-manutencao.md)
e, para o E2E-13, em
[`evidencias/e2e13-notificacao.md`](evidencias/e2e13-notificacao.md).

### Situação 1 (real): os defeitos do back-end

A suíte, contra o back-end real, reprova 19 testes e mais 2 testes do próprio
back-end:

1. **Identificação:** o quality gate separa as reprovações por causa.
2. **Classificação:** são 11 defeitos (D-02 a D-13), todos do SUT (back-end),
   cada um com severidade, triados em 16/11.
3. **Registro:** entradas em `data/defeitos-conhecidos.js` e issues #14 a #24,
   abertas pela esteira com os rótulos `defeito-conhecido`, `defeito-sut` e a
   severidade.
4. **Encaminhamento:** squad de back-end, com prazo de 23/11 (alta), 30/11
   (média) ou 16/12 (baixa).
5. **Acompanhamento:** a rotina de manutenção, simulada para 24/11, marca os
   seis itens vencidos e aponta que nenhum tem responsável atribuído. Esse é o
   próximo passo da triagem com `/triagem ... @responsavel`.

### Situação 2 (real): um teste instável, o HU-14

Aconteceu durante o trabalho, sem ninguém provocar:

1. **Identificação:** na execução #111, o `HU-14 cidadao exclui a propria
   demanda enquanto ela esta pendente` reprovou. A API confirmou a exclusão,
   mas a demanda continuou acessível. O gate bloqueou e abriu a issue #27 com
   `triagem`.
2. **Investigação:**
   - *Pergunta 1:* passava em todas as execuções anteriores contra o mesmo
     commit do back-end.
   - *Pergunta 3:* o back-end apaga e confirma a exclusão no banco.
   - *Pergunta 5:* não se repete sozinho, então é instabilidade.

   A reprodução local mostrou a causa: o SQLite reaproveita o id da demanda
   excluída, e outro arquivo de teste, rodando **em paralelo** com a mesma
   conta, criou uma demanda com esse id entre a exclusão e a consulta.
3. **Classificação:** instabilidade por dado compartilhado entre testes, ou
   seja, **defeito da TAS**. Não é defeito do produto, porque em produção o
   banco é PostgreSQL, que não reaproveita ids.
4. **Encaminhamento e correção:** a própria TAS. Os arquivos de teste passaram
   a rodar um por vez (`--test-concurrency=1`). A causa foi eliminada sem
   reexecução, sem `skip` e sem afrouxar a asserção, e a decisão ficou
   registrada no `tas.md`, seções 8 e 9.4.
5. **Encerramento:** a issue #27 fecha sozinha quando o teste volta a passar
   na mesma branch.

### Situação 3 (simulada): um defeito da TAS, que revelou outro

1. Na branch `demo/politica-defeito-tas`, o teste de paginação (HU-09) deixou
   de enviar o parâmetro `per_page`. Para quem olha só a mensagem ("o limite
   de 1 item por página foi ignorado"), parece defeito do produto.
2. A execução #106 reprovou o estágio de API (o gate apontou "1 falha nova"),
   e a esteira abriu a issue #25 com `triagem`.
3. *Pergunta 3:* o back-end pagina corretamente quando recebe `per_page`.
   Logo, **defeito da TAS**.
4. **O achado:** a issue #25 foi fechada pela execução #107 de **outra
   branch**, onde o teste nunca esteve quebrado. A demonstração revelou um
   defeito no próprio mecanismo de encerramento.
5. Esse defeito também foi tratado pela política. Foi classificado como
   defeito da TAS, e a correção (o commit `924386b`) passou a exigir que a
   issue só feche com o teste verde na mesma branch.
6. A demonstração foi repetida: a issue #26 ficou aberta enquanto só outras
   branches passavam, e fechou com a correção na própria branch.

### Situação 4 (real): o E2E-13 encontra um defeito do app (D-14)

1. **Identificação:** o E2E-13 passa pelos passos 1 a 3 (login, lista,
   mudança de status, lista atualizada), mas a notificação nunca aparece na
   gaveta do Android.
2. **Investigação:**
   - *Pergunta 3:* o back-end mudou o status, e a lista do app mostra o status
     novo, então o estado do sistema está certo até ali.
   - *Pergunta 4:* o diagnóstico publicado pela esteira mostrou que o canal de
     notificação do app nunca foi criado.
   - O app engolia o erro, então foi preciso uma execução de diagnóstico, com
     um registro temporário no log (já removido). Ela mostrou a causa: no Expo
     Go para Android, a criação do canal é rejeitada com um erro nativo, e o
     app desiste do aviso em silêncio.
3. **Classificação:** defeito do SUT, **no app**, severidade média (função
   central sem aviso ao usuário, mas sem expor nem corromper dado).
4. **Registro e encaminhamento:**
   - entrada D-14 em `data/defeitos-conhecidos.js`, encaminhada à squad do app
     (`PetersonNave/Smart-City`), com prazo de 30/11;
   - a entrada tem **assinatura**: só conta como D-14 a falha em que a
     notificação não aparece; se o E2E-13 falhar no login, por exemplo,
     continua bloqueando como falha nova.
5. **Passagem para a issue do defeito:** na execução #14, o gate reconheceu
   o D-14 e o job ficou verde. A issue do teste (#12) fechou sozinha,
   apontando para a issue do defeito (#28), que segue o acompanhamento.

> *O ponto para destacar:* nenhum teste de API acharia esse defeito. A API
> responde 200, a lista mostra o status certo, e só a tela revela que o aviso
> não chega. É o motivo de a professora ter pedido a verificação pela
> interface.

### Verificações automáticas, simuladas localmente

- Uma espera fixa (`setTimeout`) acrescentada a um teste reprova a verificação
  da política com a regra **P2**.
- Reduzir o plano de 53 para 52 testes de API sem registrar a decisão reprova
  com a regra **P6**.

---

## E) Roteiro da apresentação (10 a 12 minutos)

### Antes

1. Deixe abertos:
   - a [`tas.md`](tas.md), na seção 9;
   - a aba *Issues*;
   - a aba *Actions*;
   - a [evidência](evidencias/politica-de-manutencao.md);
   - este guia.
2. Se o PR já estiver na `main`, prepare a demonstração ao vivo do `/triagem`
   (passo 5).

### Durante

1. **O problema (1 min).** Leia a parte A: o que acontece sem política.
2. **A política (3 min).** Na `tas.md`, seção 9, mostre:
   - 9.2, as cinco perguntas e a tabela de classificação;
   - 9.3, os prazos e o porquê;
   - 9.4, o caso real do HU-14;
   - 9.7, a remoção com risco assumido.
3. **O gate (2 min).** Abra uma execução recente do `pipeline-de-testes`.
   - Mostre a anotação "Defeitos conhecidos do produto (não bloqueiam o
     merge)".
   - Explique a tabela da parte B6 (registro em vez de `continue-on-error`).
4. **As issues (2 min).**
   - Filtre por `label:defeito-conhecido` e abra a #19 (D-08): severidade,
     prazo e encaminhamento.
   - Depois abra a #27: a falha real do HU-14, com as cinco perguntas e o
     fechamento automático.
5. **A triagem ao vivo (2 min, se o PR já estiver na `main`).**
   - Numa issue com `triagem`, comente `/triagem tas media @<seu-login>`.
   - Em menos de um minuto aparecem os rótulos, o responsável, a seção
     "Triagem" com o prazo e o comentário de confirmação.
6. **Os achados (2 min).**
   - Situação 3: a política pegou um defeito no próprio mecanismo, e a
     correção seguiu a política.
   - Situação 4: o E2E-13 pela interface achou um defeito que nenhum teste de
     API acharia, e ele foi encaminhado à squad do app.
7. **Fechamento (1 min).** Toda decisão fica registrada (issue ou PR), toda
   demanda tem prazo e a esteira cobra.

---

## F) Perguntas prováveis

- **"Por que não reexecutar o teste instável automaticamente?"** Porque a
  reexecução transforma em verde um defeito intermitente real. No HU-14, a
  causa estava na própria suíte; se fosse no produto, a reexecução a teria
  escondido. A regra P3 reprova qualquer configuração de retry.
- **"O registro de defeitos não é um jeito de esconder falhas?"** Não. O teste
  continua reprovado no relatório, na anotação e na issue. O registro só
  impede que um defeito **já triado** bloqueie o merge de todo mundo. E se o
  defeito for corrigido, o gate reprova até a entrada sair, o que impede o
  registro de ficar desatualizado.
- **"Quem decide a severidade?"** Quem faz a triagem, pelo critério da seção
  9.3: segurança, autorização ou integridade do dado é alta. A decisão fica
  registrada no comando `/triagem` ou na entrada do registro, revisada por
  pull request.
- **"E se a squad do produto não cumprir o prazo?"** A política não manda na
  outra squad, mas a cobrança fica visível. A issue ganha `prazo-vencido`, a
  verificação da política mostra o aviso e a revisão quinzenal leva o item
  para a pauta.
- **"Por que a revisão é quinzenal e não a cada execução?"** As verificações
  que podem ser automáticas (P1 a P6) já rodam a cada push. A revisão trata do
  que exige julgamento: duplicação de preparação, custo e valor de um teste,
  remoção.
- **"Por que o E2E pela interface não bloqueia o merge?"** Porque depende de
  emulador e é o mais sujeito a instabilidade de ambiente (risco R-07). Ele
  informa no pull request e bloqueia a entrega, não o merge, e segue as
  mesmas regras: sem reexecução e com diagnóstico publicado quando reprova.
- **"Se o E2E-13 está registrado como defeito conhecido, ele não fica cego
  para outras falhas?"** Não, por causa da assinatura. Só a falha em que a
  notificação não aparece conta como D-14. Se o login ou a lista quebrarem, o
  gate trata como falha nova. O teste U6 verifica essa regra.
- **"Rodar um arquivo por vez não deixa a suíte lenta?"** A suíte de API
  passou para cerca de 40 segundos, dentro do objetivo O1 (resultado em menos
  de 5 minutos). A troca de velocidade por confiabilidade está registrada na
  seção 8 do `tas.md`.
