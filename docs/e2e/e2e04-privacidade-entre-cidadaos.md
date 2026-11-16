# E2E-04 — Privacidade entre cidadãos: o chamado do vizinho não é meu

| | |
| :--- | :--- |
| **Branch** | `branch4-Jeniffer` |
| **Responsável** | Jeniffer |
| **Arquivo de teste** | [`tests/e2e/e2e04-privacidade-entre-cidadaos.test.js`](../../tests/e2e/e2e04-privacidade-entre-cidadaos.test.js) |
| **Nível** | End-to-End (jornada funcional completa, atravessando várias rotas e perfis) |
| **SUT** | API do ResolveAí / Smart City |

---

## 1. Cenário automatizado

Dois moradores da mesma cidade usam o ResolveAí ao mesmo tempo, cada um com o seu problema. A jornada verifica o que cada um consegue — e o que não consegue — enxergar e fazer com o chamado do outro.

## 2. Fluxo percorrido

1. Dois moradores, duas contas novas
2. Cada um registra o próprio problema
3. O histórico de A tem o de A, e só ele (verificado em **todas** as páginas)
4. A tenta abrir o chamado de B pelo identificador → deve ser 404, nunca 403
5. A tenta apagar o chamado de B → 404
6. O chamado de B continua intacto para B
7. O isolamento vale nas duas direções

## 3. O que esta jornada protege

Pela tela, 403 e 404 produzem a mesma mensagem genérica — e a diferença entre os dois é a regra de maior consequência aqui. Responder 403 a um recurso de terceiro **confirma que ele existe**; repetindo a chamada com um identificador por vez, um curioso mapeia todas as denúncias da cidade sem nunca ler nenhuma. A ausência é verificada percorrendo a listagem inteira: "não está na página 1" passa verde tanto com isolamento correto quanto com vazamento na página 2.

## 4. Como executar

A esteira executa esta jornada contra o back-end real na regressão diária (`regression / full-suite`).

Localmente, contra o back-end real, com um comando só (clona, semeia e sobe o
back-end, roda a jornada e desliga o servidor; exige Python 3.10 ou mais):

```bash
npm run test:backend-real -- "tests/e2e/e2e04-*.test.js"
```

Contra um back-end que já está no ar, trocar de alvo é mudar uma variável;
nenhum arquivo de teste muda:

```bash
BASE_URL=http://localhost:5000 npm run diagnostico
BASE_URL=http://localhost:5000 node --test "tests/e2e/e2e04-*.test.js"
```

Os usuários de teste precisam existir com os perfis `cidadao`, `gestor` e
`admin` (seção 3 do [README](../../README.md)); `npm run diagnostico` diz qual
está faltando.

## 5. Resultado esperado

| Alvo | Resultado em 16/11/2026 |
| :--- | :--- |
| Back-end real (esteira) | **Reprova no passo 4 por defeito conhecido do produto, D-06**: a demanda de outro cidadão responde 403, e não 404, o que permite a enumeração. Acompanhado na issue #17. |
| Duplo de referência (só na verificação de sensibilidade) | **Verde.** Prova que a jornada funciona; não prova nada sobre o produto. |

> Divergência entre os dois alvos exige a pergunta de três vias: o defeito está no back-end, no teste ou no próprio contrato? Ver [`docs/tas.md`](../tas.md), seção 4.

## 6. Oráculo

Todo valor esperado vem de [`data/contrato.js`](../../data/contrato.js) e [`data/matriz-autorizacao.js`](../../data/matriz-autorizacao.js). Não há nenhum literal de domínio dentro do teste: se a especificação mudar, muda-se o oráculo em um lugar só e a jornada acompanha.
