# E2E-10 — O atalho recusado: não se resolve o que nunca foi atendido

| | |
| :--- | :--- |
| **Branch** | `branch10-Peterson` |
| **Responsável** | Peterson |
| **Arquivo de teste** | [`tests/e2e/e2e10-atalho-no-ciclo-de-vida.test.js`](../../tests/e2e/e2e10-atalho-no-ciclo-de-vida.test.js) |
| **Nível** | End-to-End (jornada funcional completa, atravessando várias rotas e perfis) |
| **SUT** | API do ResolveAí / Smart City |

---

## 1. Cenário automatizado

Um gestor apressado tenta marcar como resolvido um chamado que ninguém chegou a assumir — o atalho que zera a fila sem zerar o problema. O sistema recusa, ele percorre o caminho de verdade, e depois de concluído o caso não volta mais para trás.

## 2. Fluxo percorrido

1. O chamado entra na fila
2. O contrato confirma que o atalho é proibido
3. O gestor tenta o atalho e é barrado (409), e o estado não muda
4. Status inexistente é 400, e não 409
5. O caminho de verdade: alguém assume
6. E só então conclui
7. Concluído não volta atrás (todas as transições de saída respondem 409)
8. O cidadão vê o desfecho correto

## 3. O que esta jornada protege

A máquina de estados é o que separa um indicador de atendimento de uma planilha de autodeclaração. Se der para pular de "ninguém assumiu" para "resolvido", o tempo médio de atendimento vira ficção.

O passo 4 separa dois erros que costumam ser confundidos: status que **não existe** no contrato é 400 (o cliente mandou lixo); status que existe mas cujo caminho não é permitido é 409 (conflito com o estado do recurso). Trocar um pelo outro manda o time procurar defeito de regra onde há erro de digitação.

## 4. Como executar

A esteira executa esta jornada contra o back-end real na regressão diária (`regression / full-suite`).

Localmente, contra o back-end real, com um comando só (clona, semeia e sobe o
back-end, roda a jornada e desliga o servidor; exige Python 3.10 ou mais):

```bash
npm run test:backend-real -- "tests/e2e/e2e10-*.test.js"
```

Contra um back-end que já está no ar, trocar de alvo é mudar uma variável;
nenhum arquivo de teste muda:

```bash
BASE_URL=http://localhost:5000 npm run diagnostico
BASE_URL=http://localhost:5000 node --test "tests/e2e/e2e10-*.test.js"
```

Os usuários de teste precisam existir com os perfis `cidadao`, `gestor` e
`admin` (seção 3 do [README](../../README.md)); `npm run diagnostico` diz qual
está faltando.

## 5. Resultado esperado

| Alvo | Resultado em 16/11/2026 |
| :--- | :--- |
| Back-end real (esteira) | **Reprova no passo 3 por defeito conhecido do produto, D-08**: o back-end aceita PENDING → RESOLVED, ou seja, o atalho existe. Acompanhado na issue #19. |
| Duplo de referência (só na verificação de sensibilidade) | **Verde.** Prova que a jornada funciona; não prova nada sobre o produto. |

> Divergência entre os dois alvos exige a pergunta de três vias: o defeito está no back-end, no teste ou no próprio contrato? Ver [`docs/tas.md`](../tas.md), seção 4.

## 6. Oráculo

Todo valor esperado vem de [`data/contrato.js`](../../data/contrato.js) e [`data/matriz-autorizacao.js`](../../data/matriz-autorizacao.js). Não há nenhum literal de domínio dentro do teste: se a especificação mudar, muda-se o oráculo em um lugar só e a jornada acompanha.
