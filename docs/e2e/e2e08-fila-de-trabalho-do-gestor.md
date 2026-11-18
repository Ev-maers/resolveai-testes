# E2E-08 — A fila de trabalho do gestor: achar o caso certo e tirá-lo da fila

| | |
| :--- | :--- |
| **Branch** | `branch8-Manuele` |
| **Responsável** | Manuele |
| **Arquivo de teste** | [`tests/e2e/e2e08-fila-de-trabalho-do-gestor.test.js`](../../tests/e2e/e2e08-fila-de-trabalho-do-gestor.test.js) |
| **Nível** | End-to-End (jornada funcional completa, atravessando várias rotas e perfis) |
| **SUT** | API do ResolveAí / Smart City |

---

## 1. Cenário automatizado

O gestor abre o painel no começo do expediente. A fila tem chamados de várias categorias. Ele filtra pelos que ninguém assumiu, restringe à categoria da equipe dele, encontra o caso, assume o atendimento — e o caso sai da fila de pendentes e entra na de em andamento.

## 2. Fluxo percorrido

1. O bairro abre três chamados de categorias diferentes
2. O gestor abre a fila do que ninguém assumiu (filtro por status)
3. Ele restringe à categoria da equipe dele
4. Ele assume o atendimento
5. O chamado troca de fila: sai de pendentes, entra em andamento
6. Os outros dois não foram arrastados junto

## 3. O que esta jornada protege

Filtro parece conveniência e são, na verdade, o que decide se o chamado vai ser atendido. Um filtro que devolve o conjunto errado não quebra nada visível: a tela desenha, a lista tem itens, e um chamado fica meses parado porque nunca apareceu para a equipe certa. O teste verifica o filtro **nas duas direções** — o alvo aparece no recorte a que pertence e some do recorte a que deixou de pertencer. Nenhuma asserção é sobre quantidade: em ambiente compartilhado isso seria teste intermitente.

## 4. Como executar

A esteira executa esta jornada contra o back-end real na regressão diária (`regression / full-suite`).

Localmente, contra o back-end real, com um comando só (clona, semeia e sobe o
back-end, roda a jornada e desliga o servidor; exige Python 3.10 ou mais):

```bash
npm run test:backend-real -- "tests/e2e/e2e08-*.test.js"
```

Contra um back-end que já está no ar, trocar de alvo é mudar uma variável;
nenhum arquivo de teste muda:

```bash
BASE_URL=http://localhost:5000 npm run diagnostico
BASE_URL=http://localhost:5000 node --test "tests/e2e/e2e08-*.test.js"
```

Os usuários de teste precisam existir com os perfis `cidadao`, `gestor` e
`admin` (seção 3 do [README](../../README.md)); `npm run diagnostico` diz qual
está faltando.

## 5. Resultado esperado

| Alvo | Resultado em 16/11/2026 |
| :--- | :--- |
| Back-end real (esteira) | **Passa.** O defeito de filtro que a fazia falhar foi corrigido pelo back-end em 24/09 (commit `a9feac1`). |
| Duplo de referência (só na verificação de sensibilidade) | **Verde.** Prova que a jornada funciona; não prova nada sobre o produto. |

> Divergência entre os dois alvos exige a pergunta de três vias: o defeito está no back-end, no teste ou no próprio contrato? Ver [`docs/tas.md`](../tas.md), seção 4.

## 6. Oráculo

Todo valor esperado vem de [`data/contrato.js`](../../data/contrato.js) e [`data/matriz-autorizacao.js`](../../data/matriz-autorizacao.js). Não há nenhum literal de domínio dentro do teste: se a especificação mudar, muda-se o oráculo em um lugar só e a jornada acompanha.
