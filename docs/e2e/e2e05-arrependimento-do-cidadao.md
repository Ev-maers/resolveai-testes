# E2E-05 — Arrependimento do cidadão: desfazer o chamado enquanto dá tempo

| | |
| :--- | :--- |
| **Branch** | `branch5-Leticia` |
| **Responsável** | Letícia |
| **Arquivo de teste** | [`tests/e2e/e2e05-arrependimento-do-cidadao.test.js`](../../tests/e2e/e2e05-arrependimento-do-cidadao.test.js) |
| **Nível** | End-to-End (jornada funcional completa, atravessando várias rotas e perfis) |
| **SUT** | API do ResolveAí / Smart City |

---

## 1. Cenário automatizado

Um morador registra dois chamados, percebe que abriu um deles por engano e desiste antes que a prefeitura assuma o atendimento. Ele volta ao histórico e apaga só aquele.

## 2. Fluxo percorrido

1. O morador abre dois chamados
2. Os dois aparecem no histórico dele
3. A janela de arrependimento está aberta (o chamado ainda está pendente)
4. Ele exclui o chamado aberto por engano
5. O chamado sumiu do acesso direto (404)
6. E sumiu do histórico, sem levar o outro junto
7. Tocar de novo no botão responde 404, e não erro interno
8. O chamado mantido segue íntegro

## 3. O que esta jornada protege

Exclusão é a operação mais destrutiva do produto e a que menos perdoa erro de escopo. Três coisas precisam valer juntas: o chamado certo some **das duas visões** (exclusão lógica mal feita tira da lista e mantém o GET respondendo 200); o outro chamado permanece; e repetir a exclusão não explode — dedo duplo no botão e tela com cache velho são o caso comum.

## 4. Como executar

A esteira executa esta jornada contra o back-end real na regressão diária (`regression / full-suite`).

Localmente, contra o back-end real, com um comando só (clona, semeia e sobe o
back-end, roda a jornada e desliga o servidor; exige Python 3.10 ou mais):

```bash
npm run test:backend-real -- "tests/e2e/e2e05-*.test.js"
```

Contra um back-end que já está no ar, trocar de alvo é mudar uma variável;
nenhum arquivo de teste muda:

```bash
BASE_URL=http://localhost:5000 npm run diagnostico
BASE_URL=http://localhost:5000 node --test "tests/e2e/e2e05-*.test.js"
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
