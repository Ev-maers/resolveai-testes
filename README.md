# TAS ResolveAí — solução de automação de testes do Projeto Integrador

Solução de automação de testes (**TAS**) da squad **ResolveAí** para o
**Smart City**, o Projeto Integrador do 5º período (renomeado ResolveAí),
disciplina Testes Automatizados (ADS033), 2026.2, CESAR School.

---

## 1. O que este repositório é, e o que ele não é

| É | Não é |
| :--- | :--- |
| A solução de automação: testes, camadas, massa de dados, esteira, métricas, relatórios e política de manutenção. | O produto. Não há aqui nenhuma linha de código de produção. |
| Testes de **API**, jornadas **E2E pela API** e um **E2E pela interface do app**, todos contra o produto real. | O back-end Flask ([ndrfelipe/smart-city](https://github.com/ndrfelipe/smart-city)) e o app Expo ([PetersonNave/Smart-City](https://github.com/PetersonNave/Smart-City)), que vivem nos repositórios deles. |

> **O SUT é o produto real do Projeto Integrador.** A esteira sobe o back-end
> a partir do repositório dele em toda execução, e o E2E pela interface roda o
> app real num emulador Android. O servidor em
> [`sut-referencia/`](sut-referencia/server.js) **não é o SUT**: é um duplo que
> implementa o contrato ao pé da letra e só serve para a verificação de
> sensibilidade da própria suíte.

---

## 2. Como executar

### 2.1 Pré-requisitos

- **Node.js 20.11 ou mais novo** (validado em v24.20.0). Não há `npm install`:
  o runner e o cliente HTTP vêm do próprio Node (decisão em
  [`docs/tas.md`](docs/tas.md), seção 8).
- **Git** e **Python 3.10 ou mais novo**, para subir o back-end real.

### 2.2 Contra o back-end real (o que a esteira faz)

```bash
git clone https://github.com/Ev-maers/resolveai-testes.git
cd resolveai-testes

npm run test:backend-real   # clona e sobe o back-end real, roda a suíte, desliga
npm run qualidade           # o mesmo, e gera métricas e relatórios HTML
```

O comando clona o back-end em `.backend-real/`, cria um banco SQLite novo,
semeia os quatro usuários de teste, sobe o Flask, roda a suíte pelo quality
gate e desliga o servidor. Hoje 19 testes reprovam por defeitos conhecidos do
produto: eles aparecem no resultado, mas não reprovam o comando (ver
[`docs/tas.md`](docs/tas.md), seção 9.5). Qualquer outra falha reprova.

Para rodar só uma parte: `npm run test:backend-real -- "tests/api/**/*.test.js"`.

### 2.3 Contra um back-end que já está no ar

Trocar de alvo é **mudar uma variável**; nenhum arquivo de teste muda:

```bash
BASE_URL=http://localhost:5000 npm run diagnostico
BASE_URL=http://localhost:5000 npm test
```

### 2.4 E2E pela interface do app (E2E-13)

Roda na esteira (workflow `e2e-app`). Localmente, exige um emulador Android, o
[Maestro](https://maestro.mobile.dev) e o Metro do app rodando com
`EXPO_PUBLIC_API_URL=http://10.0.2.2:5000`; depois, `npm run test:app`. Passo a
passo em [`docs/e2e/e2e13-notificacao-de-status.md`](docs/e2e/e2e13-notificacao-de-status.md).

### 2.5 Todos os comandos

| Comando | O que faz |
| :--- | :--- |
| `npm run test:backend-real` | Sobe o back-end real, roda a suíte pelo quality gate e desliga o servidor. **Comando único da entrega.** |
| `npm run qualidade` | O mesmo, e gera `evidencias/metricas.json`, `relatorio-tecnico.html` e `relatorio-negocio.html`. |
| `npm test` | Suíte completa contra o alvo de `BASE_URL`, que precisa estar no ar. |
| `npm run test:unidade` / `test:api` / `test:smoke` | Um nível só. Os unitários não usam rede. |
| `npm run test:app` | O E2E-13 pela interface do app (exige emulador e Maestro). |
| `npm run verificar` | Confere a cobertura do plano e as regras automáticas da política de manutenção (P1 a P6). |
| `npm run manutencao` | Simula a rotina de manutenção: prazos, testes instáveis e a pauta da revisão quinzenal. Não escreve nada no GitHub. |
| `npm run diagnostico` | Diz **contra quem** a suíte vai falar e se os usuários de teste existem. |
| `npm run test:tudo` | Verificação rápida da própria suíte contra o duplo de referência (não testa o produto). |
| `npm run sensibilidade` | Injeta defeitos no duplo e confere se a suíte os detecta. |
| `npm run metricas` / `relatorios` / `issues` | As etapas pós-teste separadas, a partir de um JUnit já gravado. `issues` só age na esteira (precisa de `GITHUB_TOKEN`). |

> **Rode `npm run diagnostico` antes de interpretar qualquer falha.** O valor
> padrão de `BASE_URL` é conveniência e é dívida técnica consciente: um dia
> alguém vai rodar contra o alvo errado sem perceber.

---

## 3. Configuração

Copie `.env.example` e ajuste. O `.env` **não é versionado**: segredo
versionado permanece no histórico mesmo depois de apagado.

```bash
cp .env.example .env
```

| Variável | Descrição | Padrão |
| :--- | :--- | :--- |
| `BASE_URL` | Endereço do SUT. | `http://localhost:5000` |
| `PREFIXO_AUTH` / `PREFIXO_API` | Prefixos das rotas. | `/auth` · `/api` |
| `TIMEOUT_MS` | Espera máxima por resposta. | `15000` |
| `USUARIO_CIDADAO` / `USUARIO_CIDADAO_2` | Dois cidadãos distintos; o segundo existe para verificar o isolamento entre contas. | `ana@` · `bruno@` |
| `USUARIO_GESTOR` / `USUARIO_ADMIN` | Um gestor e um admin. | `gestor@` · `admin@` |
| `SENHA_PADRAO` | Senha dos usuários de teste. | `senha123` |
| `ALVO_DOS_TESTES` | `back-end real` aplica o registro de defeitos conhecidos no quality gate. | `duplo de referencia` |
| `APP_URL`, `MAESTRO_BIN`, `ADB_BIN` | Endereço do app no Expo Go e ferramentas do E2E pela interface. | `exp://10.0.2.2:8081`, `maestro`, `adb` |

Contra o back-end real, **os quatro usuários precisam existir** com os perfis
`cidadao`, `cidadao`, `gestor` e `admin`. O `npm run test:backend-real` e a
esteira os criam com `scripts/semear-backend-real.py`; `npm run diagnostico`
diz qual está faltando.

---

## 4. Estrutura e regra de dependência

As setas apontam sempre para a direita. Um teste **nunca** chama a biblioteca
base diretamente.

```
tests/  ->  api/  ->  lib/
tests/  ->  data/
```

| Camada | Sabe | Não sabe | Nunca contém |
| :--- | :--- | :--- | :--- |
| `lib/` | fetch, cabeçalhos, status, JSON; executar um fluxo do Maestro | o que é uma demanda | asserções |
| `api/` | caminhos e formatos do contrato; telas e fluxos do app | como HTTP ou o Maestro funcionam | asserções |
| `data/` | o contrato, a massa, o plano e os defeitos conhecidos | como a chamada é feita | asserções |
| `tests/` | o comportamento esperado | como a chamada é feita | dados literais |

```
resolveai-testes/
├── .github/
│   ├── actions/backend-real/   sobe o back-end real em cada job
│   ├── workflows/              testes.yml · e2e-app.yml · sensibilidade.yml · manutencao.yml
│   ├── ISSUE_TEMPLATE/         falha de teste · remocao de teste · manutencao da TAS
│   └── pull_request_template.md
├── docs/                       toda a documentacao (ver o indice abaixo)
├── lib/                        http.js · config.js · inspecao.js · diagnostico.js · maestro.js
├── api/                        smart-city.js (API) · app.js (telas do app)
├── data/                       contrato.js (ORACULO) · demandas.js · usuarios.js · matriz-autorizacao.js
│                               plano-de-testes.js · defeitos-conhecidos.js
├── tests/
│   ├── unidade/                verificacao da propria TAS (oraculo e quality gate), sem rede
│   ├── api/                    nivel de servico, por historia de usuario
│   ├── e2e/                    jornadas ponta a ponta pela API
│   └── app/                    E2E-13 pela interface do app (fluxos do Maestro)
├── scripts/                    esteira, quality gate, metricas, relatorios, issues e manutencao
├── sut-referencia/             duplo do contrato, so para a verificacao de sensibilidade
└── evidencias/                 saidas geradas a cada execucao (nao versionadas)
```

**Onde colocar um arquivo novo**

- Precisa falar HTTP ou dirigir a tela de um jeito que ainda não existe? → `lib/`
- Traduz vocabulário de domínio em caminho do contrato ou em fluxo do app? → `api/`
- É valor esperado, regra, massa ou registro de decisão? → `data/`
- Afirma alguma coisa? → `tests/`, e só ali.
- É documentação? → `docs/`.

### Índice da documentação

| Documento | Para quê |
| :--- | :--- |
| [`docs/tas.md`](docs/tas.md) | Decisões da TAS: SUT, objetivos, riscos, backlog, pipeline e **política de manutenção** (seção 9) |
| [`docs/plano-de-testes.md`](docs/plano-de-testes.md) | Escopo: endpoints, níveis, o que fica fora, critérios de entrada e saída |
| [`docs/matriz-de-cobertura.md`](docs/matriz-de-cobertura.md) | O que cada teste responde e qual é o dono de cada regra |
| [`docs/pipeline-ci.md`](docs/pipeline-ci.md) | Esteira, quality gate, proteção da `main` e evidências |
| [`docs/metricas-de-qualidade.md`](docs/metricas-de-qualidade.md) | Métricas escolhidas e descartadas, com justificativa |
| [`docs/relatorio-qualidade.md`](docs/relatorio-qualidade.md) | Resultado atual contra o produto real, defeitos e recomendação |
| [`docs/e2e/`](docs/e2e/) | Uma ficha por jornada E2E, incluindo o E2E-13 pela interface |
| [`docs/guia-politica-de-manutencao.md`](docs/guia-politica-de-manutencao.md) | Guia de estudo e apresentação da política de manutenção |
| [`docs/guia-metricas-e-relatorios.md`](docs/guia-metricas-e-relatorios.md) | Guia de estudo e apresentação de métricas, issues e relatórios |
| [`docs/tutorial-execucao.md`](docs/tutorial-execucao.md) | Roteiro para quem vai demonstrar a esteira na aula |
| [`docs/evidencias/`](docs/evidencias/) | Registros de evidência: bloqueio de merge, issues, E2E-13, política |
| [`docs/historico/`](docs/historico/) | Entregas anteriores (U1), mantidas como registro |

---

## 5. Convenções

- **O oráculo vem da especificação, nunca do objeto testado.** Todo valor
  esperado mora em [`data/contrato.js`](data/contrato.js). Um teste que
  importasse a regra do SUT passaria mesmo com a regra errada, porque estaria
  comparando o código consigo mesmo.
- **O nome do teste começa pela história** (`HU-13 transicao recusada com 409:
  ...`) e diz a regra que ele protege. Quando falhar na esteira, o nome sozinho
  dirá qual regra quebrou. A verificação da política (regra P1) reprova teste
  sem esse prefixo.
- **Um teste = uma regra, e cada regra tem um único teste dono**
  ([`docs/matriz-de-cobertura.md`](docs/matriz-de-cobertura.md)).
- **Nunca asserte sobre a mensagem.** A mensagem em português muda a cada ajuste
  de redação. O campo `error.code` só é cobrado em `CT todo erro traz um code`.
- **Cada teste prepara o que precisa e roda sozinho.**
- **Nenhum dado literal dentro de teste.** Tudo vem de `data/`.
- **Nenhuma espera por tempo fixo e nenhuma reexecução automática.** Espera é
  sempre por condição (regras P2 e P3).

---

## 6. Estado do contrato

O README do produto documenta **endpoints, métodos e regras de autorização por
perfil**. Não documenta **payloads, códigos de erro nem limites de campo**.

Por isso `data/contrato.js` marca cada bloco com sua origem:

- **`[A]` confirmado**: README do produto, seções 6 a 8.
- **`[B]` hipótese**: transcrito do contrato do SUT didático *Cidade
  Conectada* (Material de Estudo ADS033), porque é a única fonte com tabela de
  transições e códigos de erro fechada.
- **`[C]` confirmado no código-fonte do back-end real**: usado só para fatos
  de formato (nomes de campo, valores aceitos, limites).

**Todo item `[B]` é risco declarado, não verdade.** Divergências entre esta
suíte e o back-end real podem estar no back-end, no teste ou no próprio
contrato, e a pergunta de três vias precisa ser feita caso a caso (ver
`docs/tas.md`, seção 4).

---

## 7. Time e uso de IA

A composição da squad e o registro do uso de IA na entrega da U1 estão em
[`docs/historico/entrega-u1.md`](docs/historico/entrega-u1.md), seções 8 e 9.
