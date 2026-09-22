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

Nada a instalar: o runner e o cliente HTTP vêm do próprio Node (≥ 20.11.0).

```bash
# terminal 1 — sobe o alvo de referência (duplo do contrato)
npm run sut:referencia

# terminal 2 — confere contra quem a suíte vai falar e executa só esta jornada
npm run diagnostico
node --test "tests/e2e/e2e02-*.test.js"
```

Contra o back-end real do Projeto Integrador, **trocar de alvo é mudar uma variável** — nenhum arquivo de teste muda:

```bash
BASE_URL=http://localhost:5000 node --test "tests/e2e/e2e02-*.test.js"
```

`npm test` também já executa esta jornada: o glob da suíte é `tests/**/*.test.js`.

### Pré-requisitos contra o back-end real

Os usuários de teste precisam existir no ambiente com os perfis `cidadao`, `gestor` e `admin` (ver seção 3 do [README](../../README.md)). `npm run diagnostico` diz qual está faltando. O cidadão desta jornada é **criado pelo próprio teste** — ela não depende de histórico de execução anterior.

## 5. Resultado esperado

| Alvo | Resultado |
| :--- | :--- |
| Duplo de referência (`npm run sut:referencia`) | **Verde.** Prova que a jornada funciona — não prova nada sobre o produto. |
| Back-end real | **Falha no passo 5.** Achado D-08 (`docs/relatorio-qualidade.md`): não existe validação de transição no back-end real — os pares que deveriam ser recusados com 409 são aceitos. |

> Divergência entre os dois alvos exige a pergunta de três vias: o defeito está no back-end, no teste ou no próprio contrato? Ver [`docs/tas.md`](../tas.md), seção 4.

## 6. Oráculo

Todo valor esperado vem de [`data/contrato.js`](../../data/contrato.js). O teste não sabe, por si, quais transições são proibidas: ele pergunta ao contrato, par a par. Se a máquina de estados mudar na especificação, esta jornada acompanha sozinha.
