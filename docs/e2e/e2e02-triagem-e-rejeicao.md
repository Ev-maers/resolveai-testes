# E2E-02 — Triagem com rejeição: o desfecho negativo também é um desfecho

| | |
| :--- | :--- |
| **Branch** | `branch2-Dayvid` |
| **Responsável** | Dayvid |
| **Arquivo de teste** | [`tests/e2e/e2e02-triagem-e-rejeicao.test.js`](../../tests/e2e/e2e02-triagem-e-rejeicao.test.js) |
| **Nível** | End-to-End (jornada funcional completa, atravessando várias rotas e perfis) |
| **SUT** | API do ResolveAí / Smart City |

---

## 1. Cenário automatizado

Um morador relata algo que a prefeitura decide não atender (endereço fora do município, duplicidade, competência de outro órgão). O gestor prioriza o caso, rejeita formalmente, e o morador vê a recusa no próprio histórico. A partir daí o caso está encerrado: ninguém reabre uma demanda rejeitada sem abrir uma nova.

## 2. Fluxo percorrido

1. O morador registra o chamado
2. O gestor prioriza o caso antes de decidir (ajusta a prioridade)
3. O gestor rejeita formalmente (transição para o estado final `REJEITADA`)
4. O morador vê a recusa no próprio histórico
5. Nenhuma transição de saída de `REJEITADA` é aceita — o oráculo é consultado par a par, para todos os estados do contrato
6. Depois das tentativas recusadas, o estado da demanda continua sendo o da decisão original

## 3. O que esta jornada protege

O caminho feliz costuma ser o único automatizado, e o desfecho negativo é onde mora o dano reputacional: uma demanda rejeitada que volta sozinha para a fila, ou que pode ser reaberta por qualquer chamada, corrompe o indicador de atendimento da prefeitura e apaga o registro da decisão. A ponta crítica aqui não é a rejeição — é a **irreversibilidade** dela. A jornada também confirma que recusar uma transição com 409 e não aplicar a mudança são duas garantias distintas, e as duas precisam valer juntas.

## 4. Como executar

A esteira executa esta jornada contra o back-end real em todo pull request (estágio `quality-gate / smoke-e2e`) e na regressão diária.

Localmente, contra o back-end real, com um comando só (clona, semeia e sobe o
back-end, roda a jornada e desliga o servidor; exige Python 3.10 ou mais):

```bash
npm run test:backend-real -- "tests/e2e/e2e02-*.test.js"
```

Contra um back-end que já está no ar, trocar de alvo é mudar uma variável;
nenhum arquivo de teste muda:

```bash
BASE_URL=http://localhost:5000 npm run diagnostico
BASE_URL=http://localhost:5000 node --test "tests/e2e/e2e02-*.test.js"
```

Os usuários de teste precisam existir com os perfis `cidadao`, `gestor` e
`admin` (seção 3 do [README](../../README.md)); `npm run diagnostico` diz qual
está faltando.

## 5. Resultado esperado

| Alvo | Resultado em 16/11/2026 |
| :--- | :--- |
| Back-end real (esteira) | **Reprova no passo 5 por defeito conhecido do produto, D-08**: não existe máquina de estados, e a demanda rejeitada volta a pendente. Não trava o merge e é acompanhado na issue #19. |
| Duplo de referência (só na verificação de sensibilidade) | **Verde.** Prova que a jornada funciona; não prova nada sobre o produto. |

> Divergência entre os dois alvos exige a pergunta de três vias: o defeito está no back-end, no teste ou no próprio contrato? Ver [`docs/tas.md`](../tas.md), seção 4.

## 6. Oráculo

Todo valor esperado vem de [`data/contrato.js`](../../data/contrato.js). O teste não sabe, por si, quais transições são proibidas: ele pergunta ao contrato, par a par. Se a máquina de estados mudar na especificação, esta jornada acompanha sozinha.
