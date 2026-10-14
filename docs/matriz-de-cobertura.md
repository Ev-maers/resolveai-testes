# Matriz de cobertura — o que cada teste responde

Este é o documento para explicar a suíte em poucos minutos. Ele responde três
perguntas: o que cada nível de teste faz, qual teste é o **dono** de cada regra,
e o que foi aposentado e por quê.

**69 testes no total:** 5 unitários, 53 de API e 11 de ponta a ponta (E2E).

---

## 1. A ideia em três frases

1. **Unitário** testa o *gabarito* dos outros testes (se o gabarito está errado,
   todo o resto aprova ou reprova pelo motivo errado).
2. **API** testa **uma regra de cada vez**, e cada regra tem **um único teste dono**.
3. **E2E** testa uma **jornada inteira**, onde o valor está na *sequência* (o
   resultado de um passo alimenta o próximo). Ele passa por regras que a API já
   testa, mas só para encadear a jornada.

### Como um teste é escrito

- **Um teste = uma regra.** Se a regra tem várias entradas (por exemplo, três
  campos obrigatórios), o teste percorre todas e, se falhar, lista **todas** as
  que falharam, e não só a primeira.
- **O gabarito vem da especificação** (`data/contrato.js`), nunca do comportamento
  do sistema testado. Copiar o comportamento do sistema como "certo" faria o teste
  nunca achar defeito.
- **Cada teste cria o que precisa** e não depende de outro ter rodado antes.
- **Teste que altera perfil de usuário usa uma conta recém-criada**, nunca os
  usuários compartilhados, porque os arquivos rodam em paralelo.

---

## 2. Os três níveis

| Nível | Qtde | Pergunta que responde | Onde |
| :--- | :--- | :--- | :--- |
| Unitário | 5 | O gabarito está completo e coerente? | `tests/unidade/` |
| API | 53 | Cada regra do contrato é cumprida? | `tests/api/` |
| E2E | 11 | A jornada completa funciona, do primeiro ao último passo? | `tests/e2e/` |

Além destes, o workflow `suite-contra-backend-real` roda os **27 testes
`unittest` do próprio back-end** (Python), que cobrem a regra dentro do Flask.

---

## 3. Unitário — 5 testes

| Teste | Pergunta |
| :--- | :--- |
| U1 | A tabela de transições de status tem os 16 pares, 4 permitidos e 12 recusados? |
| U2 | Todo par recusado tem exatamente uma razão, e estado final não tem saída? |
| U3 | Todo estado é alcançável a partir do inicial? (senão não há como montar o cenário) |
| U4 | A massa de dados respeita o contrato, é nova a cada chamada, e todo caso inválido aponta um campo real? |
| U5 | A matriz de autorização cobre os perfis, sem célula vazia, e as perguntas em aberto aparecem? |

---

## 4. API — 53 testes, cada regra com um dono

### Cadastro e sessão (HU-01, HU-02) — 16 testes

| Regra | Teste dono |
| :--- | :--- |
| Cadastro válido cria conta que entra | `HU-01 cadastro valido cria uma conta que consegue entrar` |
| E-mail repetido é conflito | `HU-01 e-mail ja cadastrado e recusado com 409` |
| Ninguém escolhe o próprio perfil no cadastro | `HU-01 o cadastro nao deixa o usuario escolher o proprio perfil` |
| Dados de cadastro inválidos são recusados | 3 testes: senha abaixo do mínimo, e-mail sem formato, campos obrigatórios ausentes |
| Valor limite da senha é aceito | `HU-01 senha com exatamente o tamanho minimo e aceita` |
| Login válido devolve dois tokens distintos | `HU-02 login valido devolve access e refresh token distintos` |
| Login inválido é 401 e não revela se a conta existe | `HU-02 login invalido responde 401 sem revelar se a conta existe` |
| Login sem campos é recusado apontando o campo | `HU-02 login sem os campos obrigatorios...` |
| **Toda rota protegida exige credencial** (8 rotas) | `HU-02 toda rota protegida exige credencial` |
| Credencial malformada é 401 | `HU-02 credencial malformada e recusada com 401` |
| Perfil devolve o próprio usuário | `HU-02 o perfil autenticado devolve os dados do proprio usuario` |
| Refresh renova e o token novo funciona | `HU-02 o refresh token renova a sessao...` |
| Access token não serve como refresh | `HU-02 access token nao serve como refresh token` |
| Logout encerra a sessão de verdade | `HU-02 logout encerra a sessao de verdade` |

### Autorização por perfil (HU-03) — 5 testes

| Regra (README, seção 8) | Teste dono |
| :--- | :--- |
| Só o cidadão registra demanda | `HU-03 so o cidadao registra demanda...` |
| Cidadão não altera status | `HU-03 cidadao nao altera o status, nem da propria demanda` |
| Cidadão não se promove (e o perfil não muda) | `HU-03 cidadao nao se promove...` |
| O admin promove | `HU-03 o admin promove um cidadao a gestor` |
| Demanda de outro cidadão é invisível (404, não 403) | `HU-03 demanda de terceiro e invisivel...` |

### Registro de demanda (HU-06) — 9 testes

| Regra | Teste dono |
| :--- | :--- |
| Registro válido nasce pendente e guarda os dados | `HU-06 registro valido nasce pendente...` |
| O servidor ignora campos que só ele controla | `HU-06 o servidor ignora os campos que so ele controla` |
| Validação, uma regra por teste | 6 testes: título curto, categoria inválida, prioridade inválida, descrição fora dos limites, localização curta, campos obrigatórios ausentes |
| Valores exatamente no limite são aceitos | `HU-06 valores exatamente no limite sao aceitos` |

### Consulta (HU-09, HU-12) — 6 testes

| Regra | Teste dono |
| :--- | :--- |
| Cidadão lista só as próprias | `HU-09 cidadao lista apenas as proprias demandas` |
| Gestor vê as de todos | `HU-09 gestor enxerga demandas de qualquer cidadao` |
| A listagem é paginada e respeita o limite | `HU-09 a listagem e paginada...` |
| Filtros devolvem só o recorte pedido | `HU-12 filtros por status e por categoria...` |
| Inexistente é 404; id malformado não é erro interno | `HU-09 demanda inexistente responde 404...` |
| O detalhe traz os campos do contrato | `HU-09 o detalhe da demanda expoe os campos do contrato` |

### Status e prioridade (HU-13) — 7 testes

A máquina de estados tem **16 pares** (4 origens x 4 destinos): 4 permitidos e 12
recusados. Os 12 recusados se dividem em **4 regras**, e cada regra é um teste.
**Nenhum dos 16 pares fica sem verificação.**

| Teste | Pares cobertos |
| :--- | :---: |
| As transições permitidas são aplicadas | 4 |
| Recusada: repete o status atual | 4 |
| Recusada: pula uma etapa | 1 |
| Recusada: volta a um estado anterior | 1 |
| Recusada: sai de um estado final | 6 |
| Status e prioridade fora da lista são recusados como validação | — |
| Gestor atualiza a prioridade | — |

### Exclusão (HU-14) — 3 testes

| Regra | Teste dono |
| :--- | :--- |
| Cidadão exclui a própria demanda pendente | `HU-14 cidadao exclui a propria demanda enquanto ela esta pendente` |
| Cidadão não exclui depois que sai de pendente | `HU-14 cidadao nao exclui a propria demanda depois...` |
| Gestor não exclui demanda concluída | `HU-14 gestor nao exclui demanda ja concluida` |

### Contrato transversal — 7 testes

| Regra | Teste dono |
| :--- | :--- |
| Respostas (sucesso e erro) são JSON | `CT respostas de sucesso e de erro sao JSON...` |
| **Todo erro traz um `code`** (único teste que cobra isso) | `CT todo erro traz um code legivel por maquina` |
| Rota inexistente é 404 em JSON | `CT rota inexistente responde 404 em JSON` |
| Método errado é 405 com `Allow` | `CT metodo nao suportado responde 405...` |
| Corpo malformado é 4xx, nunca 500 | `CT corpo JSON malformado responde 4xx...` |
| **Nenhuma resposta vaza senha ou hash** (5 rotas) | `CT nenhuma resposta da API vaza senha ou hash` |
| A validação usa o mesmo status em todas as rotas | `CT a validacao usa o mesmo status...` |

---

## 5. E2E — 11 jornadas, cada uma com algo que só ela prova

Cada integrante entrega uma jornada. Elas passam por regras que a API já testa,
**de propósito**: o que se verifica aqui é a *costura* entre os passos.

| Jornada | O que só ela prova | Regra-dona na API |
| :--- | :--- | :--- |
| E2E-01 | O caminho feliz inteiro, entre dois perfis: cadastro, registro, fila do gestor, status, visão do cidadão, logout | — (é a integração) |
| E2E-02 | O ramo de **rejeição**: priorizar, rejeitar, e a decisão não pode ser desfeita | HU-13 sai de estado final |
| E2E-03 | O **primeiro uso**: conta nova nasce com histórico vazio, e a senha não volta em nenhuma resposta da jornada | HU-09, CT vazamento |
| E2E-04 | **Privacidade nos dois sentidos** entre dois cidadãos, e o dono continua com acesso | HU-03 terceiro invisível |
| E2E-05 | **Arrependimento**: apaga um de dois chamados sem afetar o outro; apagar de novo não quebra | HU-14 |
| E2E-07 | **Sessão**: a renovação preserva a identidade e os dados; o logout bloqueia leitura *e* escrita | HU-02 refresh e logout |
| E2E-08 | **Fila do gestor**: o filtro vale nos dois sentidos e o chamado muda de fila ao ser assumido | HU-12 filtros |
| E2E-09 | **Promoção**: a mesma operação é recusada antes e aceita depois; gestor não promove | HU-03 promoção |
| E2E-10 | **Atalho recusado**: o caminho válido conclui | HU-13 transições |
| E2E-11 | **Integridade**: campos forjados no registro são ignorados e o chamado fica na conta certa | HU-06 campos do servidor |
| E2E-12 | **Sequência de erros**: depois de várias recusas seguidas, a API continua saudável e a jornada correta conclui | CT e HU-01/02/09 |

Duas jornadas têm proximidade e vale saber explicar: **E2E-02** e **E2E-10**
tocam em estado final. A diferença é o caminho: a 02 é o ramo da *rejeição*; a 10
é o do *atalho recusado e conclusão*.

---

## 6. O que foi aposentado e por quê

A suíte tinha 117 testes. Estes saíram ou foram incorporados:

| Antes | Depois | Por quê |
| :--- | :--- | :--- |
| 16 testes, um por par de transição | 5 testes, um por regra | Mesma cobertura dos 16 pares, sem repetir a mesma pergunta 12 vezes |
| Validação: 10 + 5 testes de uma entrada | 6 + 3, uma regra cada | Mesma cobertura; regras agrupadas |
| Sem token, 3 testes em 3 arquivos | 1 teste, 8 rotas | Era a mesma regra copiada |
| Vazamento de senha em 3 testes | 1 teste, 5 rotas | Idem |
| Células "permitido" da matriz (4) | cobertas por HU-06, HU-09, HU-13 | Já eram verificadas como efeito dos testes de regra |
| `C54` "nenhum 5xx" | removido | Cada teste já exige um status específico, que exclui 5xx |
| Excluir terceiro, excluir inexistente | incorporados a HU-03 e HU-09 | Eram a mesma regra de outro arquivo |
| `error.code` cobrado em ~19 testes | só em `CT` | O back-end real não tem o campo: todos reprovavam juntos e escondiam se o status estava certo |
| `protocol`, `author`, `resolvedAt` | removidos | **Campos que o produto real não tem.** O protocolo é calculado pelo app (`#ano-id`) e testado nos testes do próprio app |
| 8 testes unitários | 5 | Repetir o status e sair de estado final viraram um só (U2); massa, instância nova e campos dos casos inválidos viraram um só (U4) |

### Perguntas em aberto (não viraram teste porque o contrato não responde)

- A API não tem campo de **data de conclusão** (`resolvedAt`). O indicador de
  *tempo de atendimento*, que Dados e Negócios usam, depende dele.
- As três células da matriz de autorização que o README não decide estão em
  `data/matriz-autorizacao.js` e aparecem a cada execução do teste U5.

---

## 7. Dois alvos, dois significados do "verde"

| Alvo | O que o verde prova |
| :--- | :--- |
| **Duplo de referência** (`sut-referencia/`), workflow `pipeline-de-testes` | Que a **suíte** funciona. Não diz nada sobre o produto |
| **Back-end Flask real**, workflow `suite-contra-backend-real` | O que o **produto** faz. Enquanto houver defeito conhecido, este workflow fica vermelho, e isso é o resultado verdadeiro |
