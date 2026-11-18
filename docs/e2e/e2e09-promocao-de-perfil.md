# E2E-09 — Governança de perfis: só o administrador promove um gestor

| | |
| :--- | :--- |
| **Branch** | `branch9-Evellin` |
| **Responsável** | Evellin |
| **Arquivo de teste** | [`tests/e2e/e2e09-promocao-de-perfil.test.js`](../../tests/e2e/e2e09-promocao-de-perfil.test.js) |
| **Nível** | End-to-End (jornada funcional completa, atravessando várias rotas e perfis) |
| **SUT** | API do ResolveAí / Smart City |

---

## 1. Cenário automatizado

A prefeitura contrata um servidor novo. Ele se cadastra pela via pública, como qualquer morador, e antes de ser promovido não consegue triar chamado nenhum. O administrador o promove a gestor, e a partir desse instante ele passa a trabalhar na fila.

## 2. Fluxo percorrido

1. O servidor novo se cadastra como qualquer morador
2. Ele registra um chamado, ainda como morador
3. **Antes** da promoção, ele não tria (403)
4. Ninguém se promove sozinho (403) e o perfil não muda
5. O administrador promove
6. A sessão dele já reflete o novo papel
7. **Depois** da promoção, a mesma operação passa (200)
8. Promover continua sendo exclusividade do admin: nem o novo gestor promove

## 3. O que esta jornada protege

Autorização não é um estado, é uma transição. O teste verifica a **mesma** operação, pelo **mesmo** usuário, no **mesmo** recurso, antes e depois da promoção. Verificar só o "depois" passa verde num sistema que nunca bloqueou ninguém; verificar só o "antes" passa verde num sistema que nunca promove. O par é o que prova que a regra existe e que a promoção surte efeito.

O chamado usado no teste é do próprio usuário de propósito: com a demanda de outra pessoa, a recusa poderia vir da regra de propriedade (404) e não da de autorização (403), e o teste estaria verificando outra coisa sem avisar.

## 4. Como executar

A esteira executa esta jornada contra o back-end real na regressão diária (`regression / full-suite`).

Localmente, contra o back-end real, com um comando só (clona, semeia e sobe o
back-end, roda a jornada e desliga o servidor; exige Python 3.10 ou mais):

```bash
npm run test:backend-real -- "tests/e2e/e2e09-*.test.js"
```

Contra um back-end que já está no ar, trocar de alvo é mudar uma variável;
nenhum arquivo de teste muda:

```bash
BASE_URL=http://localhost:5000 npm run diagnostico
BASE_URL=http://localhost:5000 node --test "tests/e2e/e2e09-*.test.js"
```

Os usuários de teste precisam existir com os perfis `cidadao`, `gestor` e
`admin` (seção 3 do [README](../../README.md)); `npm run diagnostico` diz qual
está faltando.

## 5. Resultado esperado

| Alvo | Resultado em 16/11/2026 |
| :--- | :--- |
| Back-end real (esteira) | **Reprova no passo 5 por defeito conhecido do produto, D-04**: não existe rota para o admin promover um cidadão a gestor. A autopromoção do cidadão, que o back-end aceitava até outubro, agora é recusada. Acompanhado na issue #15. |
| Duplo de referência (só na verificação de sensibilidade) | **Verde.** Prova que a jornada funciona; não prova nada sobre o produto. |

> Divergência entre os dois alvos exige a pergunta de três vias: o defeito está no back-end, no teste ou no próprio contrato? Ver [`docs/tas.md`](../tas.md), seção 4.

## 6. Oráculo

Todo valor esperado vem de [`data/contrato.js`](../../data/contrato.js) e [`data/matriz-autorizacao.js`](../../data/matriz-autorizacao.js). Não há nenhum literal de domínio dentro do teste: se a especificação mudar, muda-se o oráculo em um lugar só e a jornada acompanha.
