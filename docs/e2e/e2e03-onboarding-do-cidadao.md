# E2E-03 — Onboarding do cidadão: da tela de cadastro ao primeiro chamado

| | |
| :--- | :--- |
| **Branch** | `branch3-Deyvison` |
| **Responsável** | Deyvison |
| **Arquivo de teste** | [`tests/e2e/e2e03-onboarding-do-cidadao.test.js`](../../tests/e2e/e2e03-onboarding-do-cidadao.test.js) |
| **Nível** | End-to-End (jornada funcional completa, atravessando várias rotas e perfis) |
| **SUT** | API do ResolveAí / Smart City |

---

## 1. Cenário automatizado

Alguém instala o ResolveAí, cria a conta, entra pela primeira vez, encontra o histórico vazio e registra a primeira demanda. É o primeiro minuto do usuário no produto — o trecho da jornada com maior taxa de abandono e, normalmente, o menos testado.

## 2. Fluxo percorrido

1. Cadastro tentando escolher o próprio perfil (o servidor deve ignorar o campo **ou** recusar o corpo; o que não pode é obedecer)
2. Primeiro login com a senha recém-escolhida
3. O app carrega o perfil dele (`/auth/me`)
4. "Minhas demandas" nasce vazio
5. Ele registra o primeiro chamado da vida dele
6. O histórico passa a ter exatamente aquele chamado
7. Nenhuma resposta da jornada devolveu senha ou hash

## 3. O que esta jornada protege

Dois riscos que só aparecem encadeados. **(1) Escalada no cadastro:** a tela pública é a única porta que um estranho atravessa sem credencial; se o servidor obedecer a um `role` vindo do cliente, qualquer pessoa se cadastra como admin. **(2) Histórico de outra pessoa:** uma listagem que ignora o filtro de autoria só fica visível numa conta nova — numa conta antiga, o próprio histórico disfarça o vazamento.

## 4. Como executar

A esteira executa esta jornada contra o back-end real em todo pull request (estágio `quality-gate / smoke-e2e`) e na regressão diária.

Localmente, contra o back-end real, com um comando só (clona, semeia e sobe o
back-end, roda a jornada e desliga o servidor; exige Python 3.10 ou mais):

```bash
npm run test:backend-real -- "tests/e2e/e2e03-*.test.js"
```

Contra um back-end que já está no ar, trocar de alvo é mudar uma variável;
nenhum arquivo de teste muda:

```bash
BASE_URL=http://localhost:5000 npm run diagnostico
BASE_URL=http://localhost:5000 node --test "tests/e2e/e2e03-*.test.js"
```

Os usuários de teste precisam existir com os perfis `cidadao`, `gestor` e
`admin` (seção 3 do [README](../../README.md)); `npm run diagnostico` diz qual
está faltando.

## 5. Resultado esperado

| Alvo | Resultado em 16/11/2026 |
| :--- | :--- |
| Back-end real (esteira) | **Passa.** |
| Duplo de referência (só na verificação de sensibilidade) | **Verde.** Prova que a jornada funciona; não prova nada sobre o produto. |

> Divergência entre os dois alvos exige a pergunta de três vias: o defeito está no back-end, no teste ou no próprio contrato? Ver [`docs/tas.md`](../tas.md), seção 4.

## 6. Oráculo

Todo valor esperado vem de [`data/contrato.js`](../../data/contrato.js) e [`data/matriz-autorizacao.js`](../../data/matriz-autorizacao.js). Não há nenhum literal de domínio dentro do teste: se a especificação mudar, muda-se o oráculo em um lugar só e a jornada acompanha.
