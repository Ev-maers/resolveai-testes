# E2E-01 — Ciclo de vida completo da demanda

| | |
| :--- | :--- |
| **Branch** | `branch1-Andre` |
| **Responsável** | André |
| **Arquivo de teste** | [`tests/e2e/e2e01-ciclo-de-vida-da-demanda.test.js`](../../tests/e2e/e2e01-ciclo-de-vida-da-demanda.test.js) |
| **Nível** | End-to-End (jornada funcional completa, atravessando várias rotas e perfis) |
| **SUT** | API do ResolveAí / Smart City |

---

## 1. Cenário automatizado

Um morador que nunca usou o ResolveAí abre a conta, relata um buraco na rua, acompanha o andamento e vê o caso encerrado. Do outro lado, o gestor público recebe a demanda na fila, assume o atendimento e conclui o serviço.

## 2. Fluxo percorrido

1. O morador se cadastra pela via pública
2. A conta é reconhecida como dele (`/auth/me`), com perfil de cidadão
3. Ele registra a demanda e ela nasce com o status inicial
4. A demanda aparece no histórico dele (é assim que se prova a autoria)
5. A demanda chega à fila do gestor
6. O gestor assume o atendimento (PENDING → IN_PROGRESS)
7. O gestor conclui o serviço (IN_PROGRESS → RESOLVED) 
8. O morador vê o caso encerrado
9. Ele sai da conta e o token deixa de valer

## 3. O que esta jornada protege

A costura entre cadastro, sessão, autoria, visibilidade e máquina de estados. Um defeito de integração — o token do cadastro não serve para criar demanda, a demanda do cidadão não chega na fila do gestor, resolver não muda o estado visto pelo cidadão — passa ileso por teste de unidade e por teste de rota, e é pego aqui.

## 4. Como executar

A esteira executa esta jornada contra o back-end real em todo pull request (estágio `quality-gate / smoke-e2e`) e na regressão diária.

Localmente, contra o back-end real, com um comando só (clona, semeia e sobe o
back-end, roda a jornada e desliga o servidor; exige Python 3.10 ou mais):

```bash
npm run test:backend-real -- "tests/e2e/e2e01-*.test.js"
```

Contra um back-end que já está no ar, trocar de alvo é mudar uma variável;
nenhum arquivo de teste muda:

```bash
BASE_URL=http://localhost:5000 npm run diagnostico
BASE_URL=http://localhost:5000 node --test "tests/e2e/e2e01-*.test.js"
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
