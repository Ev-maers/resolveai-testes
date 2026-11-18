# E2E-07 — Continuidade de sessão: renovar não pode trocar quem você é

| | |
| :--- | :--- |
| **Branch** | `branch7-Luis` |
| **Responsável** | Luís |
| **Arquivo de teste** | [`tests/e2e/e2e07-continuidade-de-sessao.test.js`](../../tests/e2e/e2e07-continuidade-de-sessao.test.js) |
| **Nível** | End-to-End (jornada funcional completa, atravessando várias rotas e perfis) |
| **SUT** | API do ResolveAí / Smart City |

---

## 1. Cenário automatizado

Um cidadão se cadastra, entra e registra uma demanda. No meio do uso, o access token precisa ser renovado. Depois de renovar, ele continua vendo o que criou antes e continua sendo ele mesmo. No fim, ele sai da conta — e "sair" precisa significar que nem leitura nem escrita funcionam mais com o token antigo.

## 2. Fluxo percorrido

1. O cidadão se cadastra e entra (recebe `accessToken` e `refreshToken`, distintos entre si)
2. Ele registra uma demanda
3. O `accessToken` **não** é aceito como token de renovação (401)
4. O `refreshToken` de verdade renova a sessão e devolve um `accessToken` novo
5. Com o token renovado, ele continua enxergando a demanda que criou e continua sendo reconhecido como o mesmo cidadão (`/auth/me`)
6. Ele faz logout
7. Depois do logout, tanto a leitura (`/auth/me`) quanto a escrita (criar demanda) são recusadas com 401 e o código de erro do contrato

## 3. O que esta jornada protege

Cada caso da suíte de serviço (`tests/api/`) verifica uma regra isolada de autenticação. Aqui a cadeia inteira precisa se sustentar: o token emitido no cadastro precisa servir para criar uma demanda, a renovação precisa preservar a identidade e o acesso ao recurso já criado, e o logout precisa encerrar a sessão para toda a API — não só para uma rota. Um defeito de integração (o token renovado responde por outra conta; o logout invalida leitura mas não escrita) passa ileso por testes isolados e é pego aqui.

## 4. Como executar

A esteira executa esta jornada contra o back-end real na regressão diária (`regression / full-suite`).

Localmente, contra o back-end real, com um comando só (clona, semeia e sobe o
back-end, roda a jornada e desliga o servidor; exige Python 3.10 ou mais):

```bash
npm run test:backend-real -- "tests/e2e/e2e07-*.test.js"
```

Contra um back-end que já está no ar, trocar de alvo é mudar uma variável;
nenhum arquivo de teste muda:

```bash
BASE_URL=http://localhost:5000 npm run diagnostico
BASE_URL=http://localhost:5000 node --test "tests/e2e/e2e07-*.test.js"
```

Os usuários de teste precisam existir com os perfis `cidadao`, `gestor` e
`admin` (seção 3 do [README](../../README.md)); `npm run diagnostico` diz qual
está faltando.

## 5. Resultado esperado

| Alvo | Resultado em 16/11/2026 |
| :--- | :--- |
| Back-end real (esteira) | **Reprova no passo 3 por defeito conhecido do produto, D-02**: o access token é aceito como refresh token. Acompanhado na issue #14. |
| Duplo de referência (só na verificação de sensibilidade) | **Verde.** Prova que a jornada funciona; não prova nada sobre o produto. |

> Divergência entre os dois alvos exige a pergunta de três vias: o defeito está no back-end, no teste ou no próprio contrato? Ver [`docs/tas.md`](../tas.md), seção 4.

## 6. Oráculo

Todo valor esperado vem de [`data/contrato.js`](../../data/contrato.js). Não há nenhum literal de domínio dentro do teste: se a especificação mudar, muda-se o oráculo em um lugar só e a jornada acompanha.
