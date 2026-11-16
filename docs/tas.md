# TAS — Projeto Integrador Smart City / ResolveAí

Memória das decisões da solução de automação. Cada seção registra o que foi
decidido, com base em quê, e o que se perdeu com a escolha.

---

## 1. Ficha do SUT

| Item | Situação |
| :--- | :--- |
| **Produto** | Plataforma de gestão de demandas urbanas: app mobile Expo/React Native para o cidadão e o gestor ([PetersonNave/Smart-City](https://github.com/PetersonNave/Smart-City)) e **API REST Flask** ([ndrfelipe/smart-city](https://github.com/ndrfelipe/smart-city)), compartilhada com um cliente web. |
| **SUT desta TAS** | **A API Flask**, nos níveis de API e de jornada, e **o app**, no cenário de notificação pela interface (E2E-13). Os dois rodam a partir dos repositórios do produto, dentro da esteira, a cada execução. |
| **Perfis** | `cidadao`, `gestor` e `admin` (grafia real do back-end). |
| **Recurso central** | Demanda urbana, com status `PENDING`, `IN_PROGRESS`, `RESOLVED` e `REJECTED`. |
| **Contrato** | REST, JSON. Endpoints e regras de autorização documentados no README do produto; **payloads e códigos de erro não documentados** (ver seção 4, R-02). |
| **Notificação** | Quando o gestor muda o status, o back-end avisa o autor por push (Expo Push API). No Expo Go para Android, o app usa notificação local: ao recarregar a lista e perceber a mudança, ele avisa o cidadão. |
| **Identificadores de teste** | O app expõe `testID` nos campos e telas usados pelo E2E-13 (`login-email-input`, `tab-demandas`, `demand-card-<id>`, `detalhe-card`). |
| **Recursos de dispositivo** | Câmera, GPS e notificação. |
| **Dados** | Sintéticos. |

---

## 2. Objetivos da automação (2026.2)

Três, e cada um verificável em dezembro com evidência ao lado.

- **O1** — Qualquer pessoa da squad sabe, em **menos de 5 minutos**, se a
  mudança que acabou de fazer quebrou o registro de demanda, a autenticação ou
  a autorização por perfil.
  *Evidência: o estágio `quality-gate / unit-and-api` leva cerca de 1 minuto,
  incluindo subir o back-end real.*
- **O2** — A regressão dos fluxos principais roda **sem intervenção manual**,
  por comando único e por gatilho de esteira.
  *Evidência: `.github/workflows/testes.yml` (push, pull request e agendamento).*
- **O3** — Nenhuma alteração chega à `main` sem que as **regras de autorização
  por perfil** tenham sido verificadas **contra o back-end real**.
  *Evidência: `tests/api/hu03-autorizacao.test.js`, no check obrigatório
  `quality-gate / unit-and-api`.*

---

## 3. Fora do escopo da automação neste semestre

| Item | Motivo | Como será verificado |
| :--- | :--- | :--- |
| Outros fluxos pela interface do app (cadastro, formulário de registro, painel do gestor) | Cada fluxo pela interface custa minutos de esteira e é o nível mais frágil. As regras desses fluxos já são verificadas pela API, e as 11 jornadas E2E pela API cobrem a costura entre as rotas. | Um cenário pela interface por fluxo de maior valor: hoje, o E2E-13 (notificar). Registrar pela interface é o item 17 do backlog. |
| Push remoto real (Expo Push API até o aparelho) | Exige aparelho com serviços do Google, credenciais do projeto EAS e o serviço da Expo no ar: três dependências externas fora do controle da squad. | O E2E-13 verifica a notificação local no Expo Go, que é o caminho que o app usa sem push remoto. O envio pelo back-end é coberto pelos testes do próprio back-end (`test_acompanhamento_notificacoes_metricas.py`), que rodam na regressão. |
| Captura real de foto pela câmera | Restrição de plataforma, custo alto e instabilidade. | Verificação manual por entrega. |
| Legibilidade de mensagens e aparência | Julgamento humano. | Revisão em squad. |
| Desempenho e carga | Fora da ementa da disciplina. | — |
| Expiração real de token por decurso de prazo | Dependência longa de tempo. | Reavaliar se o back-end expuser emissão de token expirado em ambiente de teste. |

> "Fora da automação" **não** significa "não verificado".

---

## 4. Riscos e condições de teste

### 4.1 Matriz de risco

| História | Impacto | Prob. | Justificativa da nota | Nível |
| :--- | :--- | :--- | :--- | :--- |
| HU-03 Autorização por perfil | Alto | **Alta** | Regra transversal a quase todos os endpoints; qualquer refatoração pode afrouxá-la **sem quebrar nada visível**. É o perfil de risco que a automação combate melhor. | API |
| HU-06 Registro de demanda | Alto | Alta | Fluxo principal do produto, com validações numerosas e mudanças frequentes durante o semestre. | API |
| HU-02 Autenticação e sessão | Alto | Média | Sem login, nenhuma outra função existe; logout que não invalida o token é falha silenciosa. | API |
| HU-13 Atualização de status | Alto | Média | Máquina de estados fechada; transição indevida corrompe o histórico e o cálculo do tempo de atendimento. | API (ver R-01) |
| HU-14 Exclusão de demanda | Alto | Média | Operação irreversível, restrita por estado. | API |
| HU-01 Autocadastro | Alto | Média | Porta de entrada; o caso grave é o escalonamento de privilégio pelo corpo do cadastro. | API |
| HU-09/12 Consulta e filtros | Médio | Média | A falha é visível ao cidadão, mas o isolamento entre contas é de risco alto. | API |
| Notificação da mudança de status | Alto | Média | É a única forma de o cidadão saber, sem abrir o app, que a demanda andou. Depende de três peças (back-end, app e sistema operacional), e só a interface mostra se elas se encaixam. | Interface do app (E2E-13) |

### 4.2 Riscos da própria solução

| ID | Risco | Mitigação adotada |
| :--- | :--- | :--- |
| **R-01** | A exaustividade dos 16 pares da máquina de estados está no nível de serviço, não no de componente, onde custaria milissegundos. | Assumido conscientemente: a regra vive no Flask. A exaustividade revelou que **nenhuma** das 12 recusas é aplicada (defeito D-08). O item 1 do backlog leva a regra ao nível de componente. |
| **R-02** | **Payloads, códigos de erro e limites de campo não estão documentados.** | Confirmado por leitura do código-fonte real e marcado `[C]` em `data/contrato.js`. Fatos de formato (`[C]`) nunca decidem regra de negócio (`[A]`/`[B]`). |
| **R-03** | Vocabulário de status divergente entre as fontes. | Resolvido: o enum real tem 4 estados. A tabela de transições continua sendo hipótese adaptada, e o back-end não aplica nenhuma (D-08). |
| **R-04** | Três células da matriz de autorização não são decididas pelo README. | Não inventadas: registradas em `data/matriz-autorizacao.js` e impressas a cada execução como pendência de contrato. |
| **R-05** | Suíte verde contra o duplo de referência não é evidência sobre o produto. | **Resolvido.** Todos os estágios da esteira rodam contra o back-end real. O duplo só serve à verificação de sensibilidade da própria suíte. |
| **R-06** | O alvo muda sem aviso: a esteira testa a branch padrão do back-end, que a squad de back-end altera a qualquer momento. | Cada execução registra o commit do back-end testado. Uma mudança que quebra uma regra aparece como falha nova, que é a informação que a esteira existe para dar. Para reproduzir uma execução antiga, o disparo manual aceita o commit do back-end. |
| **R-07** | O E2E pela interface depende de emulador, Expo Go e Metro, e por isso é o teste mais sujeito a instabilidade. | Fica num estágio próprio, que informa no pull request e bloqueia a entrega, não o merge (Material, cap. 8). Sem reexecução automática; quando reprova, a esteira publica o que estava na tela, o log do Maestro e o do Metro. |

---

## 5. Candidatos e não candidatos

Filtro de seis perguntas aplicado às condições de risco alto: é tecnicamente
possível? É repetível? Vale executar com frequência? O retorno compensa? É
fácil de manter? Cobre fluxo de negócio relevante?

**Candidatos automatizados**: 71 casos, sendo 6 de verificação da própria TAS,
53 de API, 11 jornadas E2E pela API e 1 E2E pela interface do app (ver
`docs/matriz-de-cobertura.md`).

**Não candidatos**, com motivo: ver seção 3.

---

## 6. Backlog de automação

Ordenado por **risco** e, dentro de cada faixa, por **custo crescente**.

| # | Item | HU | Nível | Risco | Custo | Status |
| :-- | :--- | :-- | :--- | :--- | :--- | :--- |
| 1 | Extrair a regra de transição do handler Flask para módulo puro e cobrir os 16 pares em suíte Python de unidade, **implementando a validação, que hoje não existe (D-08)** | 13 | Unid | Alto | Baixo | **a fazer**: encaminhado à squad de back-end (issue do D-08) |
| 2 | Executar a suíte contra o back-end Flask real e classificar as divergências | todas | API | Alto | Baixo | feito |
| 3 | Autorização por perfil (matriz) | 03 | API | Alto | Baixo | feito |
| 4 | Registro de demanda: caminho feliz, validações e limites | 06 | API | Alto | Baixo | feito |
| 5 | Autenticação, sessão, logout e refresh | 02 | API | Alto | Baixo | feito |
| 6 | Máquina de estados: 16 pares | 13 | API | Alto | Médio | feito |
| 7 | Exclusão por estado e por autoria | 14 | API | Alto | Baixo | feito |
| 8 | Isolamento entre cidadãos (403 × 404) | 03 | API | Alto | Baixo | feito |
| 9 | Cadastro e escalonamento de privilégio | 01 | API | Alto | Baixo | feito |
| 10 | Contrato transversal (mídia, `code`, 405, corpo malformado) | — | API | Médio | Baixo | feito |
| 11 | Consulta, paginação e filtros | 09/12 | API | Médio | Baixo | feito |
| 12 | Confirmar as 3 células não documentadas da matriz com o back-end | 03 | — | Alto | Baixo | **a fazer** |
| 13 | Rate limiting / bloqueio após N tentativas de login | 02 | API | Médio | Médio | a fazer: a regra não existe no contrato |
| 14 | E2E pela interface: o gestor muda o status e o cidadão vê a notificação (E2E-13) | 06/13 | Interface | Alto | Alto | feito |
| 15 | Quality gate contra o back-end real, com registro de defeitos conhecidos | todas | — | Alto | Médio | feito |
| 16 | Política de manutenção operacionalizada (issues, prazos, instabilidade, revisão) | — | — | Alto | Médio | feito |
| 17 | E2E pela interface: o cidadão registra a demanda pelo formulário do app | 06 | Interface | Alto | Alto | a fazer |

---

## 7. Especificação da pipeline

A implementação está em `.github/workflows/`. O detalhe operacional (nomes dos
checks, proteção da branch, evidências) está em `pipeline-ci.md`.

### Alvo

Todos os estágios de teste rodam contra o **back-end real**, subido dentro da
esteira a partir de `ndrfelipe/smart-city`, com banco SQLite novo e os quatro
usuários de teste semeados (`.github/actions/backend-real`). O E2E-13 roda
também contra o **app real**, a partir de `PetersonNave/Smart-City`.

### Gatilhos

- `push` em qualquer branch → estágio 1.
- `pull request` para `main` → estágios 1, 2 e 3.
- Diário (15:15 UTC) e manual → estágio 4; diário (15:45 UTC) e manual → estágio 3.
- `push` na `main` → estágio 5.

### Estágios

| # | Estágio | Check / workflow | Suíte | Duração alvo | Bloqueia? |
| :-- | :--- | :--- | :--- | :--- | :--- |
| 1 | verificação da TAS + unitários + API | `quality-gate / unit-and-api` | política, `tests/unidade`, `tests/api` | < 2 min | sim (merge) |
| 2 | smoke E2E pela API | `quality-gate / smoke-e2e` | E2E-01, 02 e 03 | < 2 min | sim (merge) |
| 3 | E2E pela interface do app | `e2e / app-notificacao` | E2E-13 | < 25 min | não (merge); sim (entrega) |
| 4 | regressão completa | `regression / full-suite` | todos os níveis + testes do próprio back-end | < 5 min | não (acompanhamento) |
| 5 | sensibilidade | workflow `sensibilidade` | 6 defeitos injetados no duplo | < 3 min | sim (entrega) |

### Quality gates

- **G1** — nos estágios 1 e 2, **nenhuma falha nova**: todo teste reprovado
  precisa ser um defeito conhecido do produto, registrado em
  `data/defeitos-conhecidos.js` com issue, severidade e prazo. Obrigatório para
  o merge na `main` (proteção de branch desde 03/11/2026). Defeito conhecido
  cujos testes passaram também reprova, até sair do registro.
- **G2** — para declarar a entrega: estágio 3 verde na `main` e estágio 5 sem
  ponto cego.
- **G3** — falha de ambiente (alvo fora do ar) reprova o estágio, mas é
  classificada como ambiente, nunca como defeito do produto.

A regra do gate é código (`scripts/quality-gate.js`) e tem teste próprio (U6).
Nenhum estágio usa `continue-on-error`, e a verificação da política (regra P4)
reprova se alguém o acrescentar.

### Critérios de entrada

- Alvo disponível e respondendo (`npm run diagnostico` verde).
- Os quatro usuários de teste existentes, com os perfis corretos.

### Critérios de saída

- 100% dos itens de risco alto do backlog executados.
- Nenhum defeito em aberto de severidade Crítica ou Alta.
- Resultados interpretados em `docs/relatorio-qualidade.md`.

---

## 8. Decisões centrais

| Decisão | Alternativas descartadas | Por quê |
| :--- | :--- | :--- |
| Rede de proteção dos fluxos críticos, e não cobertura máxima | Cobertura máxima; experimentação de ferramenta | Cobertura ampla sobre sistema instável produz suíte que quebra o tempo todo e que a squad aprende a ignorar. |
| Runner nativo do Node + `fetch` | Jest/Vitest; biblioteca HTTP dedicada; ferramenta de baixo código | Sustenta todos os níveis sem acrescentar **nenhuma** dependência npm. |
| Autorização verificada no nível de serviço | Pela interface; nos dois níveis | A regra vive no servidor. Pela tela, 403 e 404 produzem a mesma mensagem, e essa distinção é a regra de maior consequência. |
| Oráculo em arquivo único (`data/contrato.js`) | Valores literais nos testes | Confirmar um item pendente vira uma edição, em um lugar. |
| **Back-end real como alvo de todos os estágios** | Duplo de referência no gate e back-end real só em disparo manual | Feedback da professora: verde contra o duplo prova que a suíte funciona, não que o produto funciona. Cada execução sobe um back-end limpo e exclusivo (Material, cap. 9.6, alternativa A). |
| **Registro de defeitos conhecidos no quality gate** | `continue-on-error`; marcar testes como `skip`/`todo`; gate vermelho permanente | Com o gate vermelho em todo pull request, a squad deixaria de ler o vermelho. `continue-on-error` e `skip` escondem a falha. O registro mantém o defeito reprovado e visível, com issue e prazo, e reprova qualquer falha nova. |
| **Maestro + Expo Go + emulador Android para o E2E pela interface** | Appium; Playwright na versão web do app; APK nativo compilado na esteira; build na nuvem (EAS) | O app guarda o token com `expo-secure-store`, que não existe na web. Appium exige servidor e cliente adicionais. Compilar o APK leva mais de 15 minutos por execução, e o EAS exige credenciais do projeto. O Maestro é uma ferramenta de linha de comando (nenhuma dependência npm), lê os `testID` do app e enxerga a gaveta de notificações do Android. |
| Gestor muda o status pela API no E2E-13 | Gestor pela interface, no mesmo aparelho | O que está sob teste é o que o cidadão vê. Trocar de conta no aparelho desligaria as notificações do cidadão (o logout as desativa), e a regra da mudança de status já é verificada pela API. |
| Duplo de referência do contrato no repositório | Nenhum alvo local | Hoje serve só à verificação de sensibilidade: um alvo que podemos quebrar de propósito para ver a suíte ficar vermelha, o que ninguém deve fazer com o produto. |
| Defeitos injetáveis por variável de ambiente | Alterar o servidor à mão a cada verificação | Torna a verificação de sensibilidade **repetível e versionada**. |

---

## 9. Política de manutenção da automação

A política existe para que a manutenção da TAS deixe de depender de decisões
improvisadas. Cada regra abaixo diz **o que** fazer, **quem** faz, **em quanto
tempo** e **qual mecanismo** do repositório a aplica. O guia de estudo, com a
demonstração passo a passo, está em
[`guia-politica-de-manutencao.md`](guia-politica-de-manutencao.md).

### 9.1 Princípios

1. **O vermelho sempre informa.** Nenhum estágio reprova "às vezes por nada":
   ou a falha é nova e bloqueia, ou é um defeito conhecido, rastreado e com
   prazo. Por isso não há `continue-on-error`, `skip` nem reexecução automática.
2. **Classificar antes de corrigir.** A primeira decisão diante de uma falha é
   de quem ela é: do produto, da automação, do ambiente ou uma variação
   esperada (Material, cap. 13).
3. **Toda decisão fica registrada.** Classificação, prazo, encaminhamento e
   remoção de teste viram issue ou pull request revisado, nunca conversa
   informal.

### 9.2 Tratamento de falhas

**Detecção e registro (automáticos).** Quando um teste reprova fora do
registro de defeitos conhecidos, o quality gate reprova o estágio e a esteira
abre uma issue `[pipeline] <nome do teste>` com os rótulos `falha-de-teste`,
`triagem` e `manutencao`, a mensagem, o link da execução e os commits da suíte
e do back-end. Se a issue já existe, ela recebe o comentário "voltou a
reprovar". Falha de ambiente vira uma issue única, rotulada `ambiente`.

**Diagnóstico (triagem).** Quem faz a triagem responde, nesta ordem, às cinco
perguntas da issue:

1. A mesma falha ocorreu em execuções anteriores?
2. Em que passo do teste ela ocorreu?
3. O estado do sistema corresponde ao esperado? Se sim, a falha está na TAS.
4. O ambiente estava disponível durante a execução?
5. A falha se repete quando o teste roda sozinho, sem mudança? Se não, é instabilidade.

**Classificação e encaminhamento.** Quem faz a triagem registra a decisão com
um comentário na própria issue, e a esteira (workflow `triagem.yml`) aplica os
rótulos, atribui o responsável, acrescenta a seção "Triagem" com o prazo ao
corpo da issue e confirma:

```
/triagem <sut|tas|ambiente|variacao> [alta|media|baixa] [@responsavel] [prazo AAAA-MM-DD]
```

Só quem tem acesso de escrita ao repositório pode usar o comando. Sem prazo
explícito, vale o da tabela da seção 9.3.

| Classificação | Rótulo | Encaminhamento | Responsável |
| :--- | :--- | :--- | :--- |
| Defeito do SUT | `defeito-sut` | Issue no repositório do back-end ou do app e entrada em `data/defeitos-conhecidos.js`, por pull request | Correção: squad do produto. Registro: QA da squad. |
| Defeito da TAS | `defeito-tas` | Correção no próprio repositório de testes | Quem escreveu ou mantém o teste |
| Ambiente | `ambiente` | Registrar e verificar se afetou outros testes | Quem mantém a esteira |
| Variação esperada | `variacao-esperada` | Registrar a medida e fechar. Só vale para comportamento não determinístico declarado; hoje, nenhuma suíte da TAS tem esse perfil | QA da squad |

**Encerramento.** A issue de um teste fecha sozinha quando ele volta a passar
na esteira, com o link da execução verde. A issue de um defeito conhecido
fecha quando a entrada sai do registro, depois que os testes passam.

### 9.3 Prioridades, prazos e responsáveis

| Tipo | Severidade alta | Severidade média | Severidade baixa |
| :--- | :--- | :--- | :--- |
| Triagem de falha nova | 2 dias corridos | 2 dias corridos | 2 dias corridos |
| Defeito do SUT (correção pelo produto) | 7 dias | 14 dias | 30 dias |
| Defeito da TAS | 3 dias | 3 dias | 7 dias |
| Ambiente | 1 dia | 1 dia | 1 dia |

**Severidade.** Alta: afeta segurança, autorização ou a integridade do dado
(por exemplo, D-02, D-06, D-08). Média: diverge do contrato sem expor dado nem
corromper estado (D-09, D-10). Baixa: forma, sem efeito para o usuário (D-11).

**Por que estes prazos.** A triagem tem prazo curto porque, enquanto a falha
não é classificada, ela bloqueia o merge de toda a squad. Defeito da TAS tem
3 dias porque a automação é do time de testes e uma suíte quebrada perde a
confiança rapidamente. Defeito do SUT tem prazo por severidade porque a
correção depende de outra squad; a política não manda nela, mas cobra e
registra. O prazo de cada issue aparece na linha "Prazo: AAAA-MM-DD" ou vem do
registro de defeitos.

**Cobrança automática.** A rotina diária `manutencao.yml` marca com
`prazo-vencido`, e comenta, toda demanda que passou do prazo. Prazo vencido de
defeito do produto também aparece como aviso na verificação da política.

### 9.4 Testes instáveis

**Definição.** Um teste é instável quando alterna entre aprovar e reprovar
(pelo menos duas trocas nas últimas 20 execuções da regressão na `main`) sem
mudança correspondente no produto.

**Detecção.** A rotina diária lê o histórico da regressão (branch `metricas`)
e abre uma issue `[instavel] <nome do teste>` com a sequência observada,
rótulos `teste-instavel`, `manutencao` e `defeito-tas`, e prazo de 3 dias.
Defeito conhecido reprova sempre e por isso não é confundido com instabilidade.

**Tratamento.** Diagnosticar a causa pelas três origens mais comuns: espera
por tempo fixo, dependência entre testes ou dado compartilhado mutável. Se a
causa estiver no produto, a issue é reclassificada como `defeito-sut`.

**Proibido**, porque esconde a causa em vez de eliminá-la:

- reexecutar o teste até passar (regra P3 da verificação automática);
- aumentar uma espera fixa (regra P2: toda espera é por condição);
- pular o teste com `skip`.

O E2E pela interface (E2E-13), o mais sujeito a instabilidade, fica num
estágio que não bloqueia o merge, mas segue as mesmas regras: sem reexecução
automática e com diagnóstico publicado quando reprova.

### 9.5 Registro de defeitos conhecidos

O arquivo `data/defeitos-conhecidos.js` lista os defeitos do produto já
triados. Cada entrada traz id, título, tipo, severidade, prazo, encaminhamento,
quem fez a triagem e quando, a evidência e os testes que o reproduzem. O
quality gate (`scripts/quality-gate.js`) usa o registro assim:

| Situação | Efeito no gate |
| :--- | :--- |
| Teste reprovado que está no registro | Não bloqueia; continua reprovado no relatório, na anotação e na issue do defeito |
| Teste reprovado fora do registro | Bloqueia (falha nova) |
| Teste do registro que passou | Bloqueia até a entrada sair do registro, para nunca esconder uma regressão futura da mesma regra |
| Registro inválido ou citando teste inexistente | Bloqueia |

Uma entrada só entra ou sai por pull request revisado. Cada defeito tem uma
issue `[defeito D-nn]`, aberta pela esteira, com os rótulos `defeito-conhecido`,
`defeito-sut` e a severidade. Se alguém a fechar com o defeito ainda presente,
a esteira a reabre. Se os testes passarem, a esteira a marca como
`possivelmente-corrigido`.

### 9.6 Revisão periódica

**Frequência:** quinzenal, nos dias 1 e 15 de cada mês. A rotina diária abre a
issue "Revisão periódica da TAS" já preenchida, e a squad discute e registra
as decisões como comentário.

**Critérios avaliados:**

| Critério | Dado que a rotina traz | Sinal de alerta |
| :--- | :--- | :--- |
| Instabilidade | Testes que alternaram nas últimas 20 execuções | Qualquer teste instável |
| Tempo de execução | Tendência da duração da suíte nas últimas 10 execuções | Crescimento acima de 30% ou estágio fora da duração alvo |
| Duplicação | Nomes de teste repetidos; preparação repetida para a pauta | Qualquer repetição |
| Rastreabilidade | Testes sem prefixo de história ou regra (P1) | Qualquer teste sem rastreabilidade |
| Defeitos conhecidos | Prazo de cada um | Prazo vencido |
| Demandas abertas | Prazo, regra aplicada e responsável | Prazo vencido ou sem responsável |

### 9.7 Remoção de testes

Remover um teste é o último recurso. Critérios aceitos: a regra deixou de
existir no contrato; outro teste já é dono da mesma regra; o custo de manter
supera o risco coberto; ou a instabilidade não tem causa corrigível no prazo.

A remoção exige três registros, e a falta de qualquer um reprova a esteira:

1. issue "Remoção de teste" com motivo, evidência, **risco assumido** e **quem
   decidiu** (pelo menos duas pessoas da squad);
2. linha nova em `HISTORICO_DO_PLANO` (`data/plano-de-testes.js`) com data,
   decisão, registro e risco assumido (regra P6);
3. pull request aprovado por outra pessoa (proteção da `main`).

Sem o passo 2, a verificação de cobertura reprova, porque o número de testes
fica abaixo do plano.

### 9.8 Mecanismos que aplicam a política

| Regra | Mecanismo | Onde |
| :--- | :--- | :--- |
| Falha nova bloqueia; defeito conhecido não | Quality gate em código, com teste próprio (U6) | `scripts/quality-gate.js`, `scripts/executar-suite.js` |
| Registro automático de falhas e defeitos | Issues abertas, comentadas, reabertas e fechadas pela esteira | `scripts/abrir-issues.js` |
| Classificação, responsável e prazo | Comando `/triagem` num comentário da issue, rótulos da política e formulários de issue | `.github/workflows/triagem.yml`, `scripts/triagem.js`, `scripts/github.js`, `.github/ISSUE_TEMPLATE/` |
| Prazos cobrados | Rotina diária marca `prazo-vencido` | `.github/workflows/manutencao.yml`, `scripts/manutencao.js` |
| Instabilidade detectada | Rotina diária lê o histórico da regressão | `scripts/manutencao.js` |
| Revisão quinzenal com dados | Issue aberta nos dias 1 e 15 | `scripts/manutencao.js` |
| Sem espera fixa, retry ou `continue-on-error`; testes rastreáveis; plano só diminui com decisão | Verificação da política em todo push (P1 a P6) | `scripts/verificar-politica.js` |
| Remoção com decisão registrada | Formulário de remoção, histórico do plano e checklist do pull request | `.github/ISSUE_TEMPLATE/2-remocao-de-teste.yml`, `.github/pull_request_template.md` |
