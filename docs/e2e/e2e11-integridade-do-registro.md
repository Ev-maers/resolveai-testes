# E2E-11 — Integridade do registro: o servidor é quem carimba o chamado

| | |
| :--- | :--- |
| **Branch** | `branch11-Rhaldney` |
| **Responsável** | Rhaldney |
| **Arquivo de teste** | [`tests/e2e/e2e11-integridade-do-registro.test.js`](../../tests/e2e/e2e11-integridade-do-registro.test.js) |
| **Nível** | End-to-End (jornada funcional completa, atravessando várias rotas e perfis) |
| **SUT** | API do ResolveAí / Smart City |

---

## 1. Cenário automatizado

Um morador registra chamados por um cliente que não é o app oficial — um script, um Postman, um app modificado. Junto com os dados legítimos ele manda os campos que o servidor deveria controlar sozinho: identificador, estado inicial, autoria e datas.

## 2. Fluxo percorrido

1. Dois moradores: o autor e a vítima da falsificação
2. O registro vem com os campos do servidor forjados
3. Nada do que ele mandou foi obedecido (id, status e data), e o chamado ficou no histórico de quem o registrou
4. A vítima não vê nada no histórico dela
5. O registro guardado é auditável
6. Os dados legítimos que ele mandou foram preservados
7. Nenhuma resposta da jornada vazou credencial

## 3. O que esta jornada protege

Confiar no cliente é o defeito mais barato de cometer e o mais caro de descobrir, porque o app oficial nunca manda esses campos — o sistema parece correto durante todo o desenvolvimento. **Autoria forjada:** quem manda `usuarioId` registra denúncia em nome de outra pessoa, o que é problema jurídico. **Estado forjado:** o chamado nasce resolvido e some da fila sem ter sido atendido. **Data forjada:** quem controla `createdAt` controla a posição na fila e o tempo medido.

## 4. Como executar

A esteira executa esta jornada contra o back-end real na regressão diária (`regression / full-suite`).

Localmente, contra o back-end real, com um comando só (clona, semeia e sobe o
back-end, roda a jornada e desliga o servidor; exige Python 3.10 ou mais):

```bash
npm run test:backend-real -- "tests/e2e/e2e11-*.test.js"
```

Contra um back-end que já está no ar, trocar de alvo é mudar uma variável;
nenhum arquivo de teste muda:

```bash
BASE_URL=http://localhost:5000 npm run diagnostico
BASE_URL=http://localhost:5000 node --test "tests/e2e/e2e11-*.test.js"
```

Os usuários de teste precisam existir com os perfis `cidadao`, `gestor` e
`admin` (seção 3 do [README](../../README.md)); `npm run diagnostico` diz qual
está faltando.

## 5. Resultado esperado

| Alvo | Resultado em 16/11/2026 |
| :--- | :--- |
| Back-end real (esteira) | **Passa.** A autoria é provada pelo histórico de quem registrou, porque a resposta não expõe o autor. |
| Duplo de referência (só na verificação de sensibilidade) | **Verde.** Prova que a jornada funciona; não prova nada sobre o produto. |

> Divergência entre os dois alvos exige a pergunta de três vias: o defeito está no back-end, no teste ou no próprio contrato? Ver [`docs/tas.md`](../tas.md), seção 4.

## 6. Oráculo

Todo valor esperado vem de [`data/contrato.js`](../../data/contrato.js) e [`data/matriz-autorizacao.js`](../../data/matriz-autorizacao.js). Não há nenhum literal de domínio dentro do teste: se a especificação mudar, muda-se o oráculo em um lugar só e a jornada acompanha.
