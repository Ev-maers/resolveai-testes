# E2E-12 — A jornada real: o usuário erra o caminho inteiro e chega lá assim mesmo

| | |
| :--- | :--- |
| **Branch** | `branch12-Victor` |
| **Responsável** | Victor |
| **Arquivo de teste** | [`tests/e2e/e2e12-jornada-com-erros-do-usuario.test.js`](../../tests/e2e/e2e12-jornada-com-erros-do-usuario.test.js) |
| **Nível** | End-to-End (jornada funcional completa, atravessando várias rotas e perfis) |
| **SUT** | API do ResolveAí / Smart City |

---

## 1. Cenário automatizado

A jornada que de fato acontece, e não a do roteiro. O morador toca em "entrar" sem preencher a senha, erra a senha, tenta se cadastrar com um e-mail que já usou, fica com um token velho no aparelho, envia o formulário pela metade, o app manda um corpo corrompido pela conexão ruim, e ele ainda abre um link antigo. Depois de tudo isso, ele consegue registrar o problema da rua dele.

## 2. Fluxo percorrido

1. "Entrar" com o formulário pela metade → 400 apontando o campo
2. Ele cria a conta e erra a senha → 401
3. A resposta não denuncia quais e-mails existem
4. Cadastro com e-mail já usado → 409, e não 400
5. O aparelho ainda tem um token velho → 401 em JSON
6. Ele entra e envia o chamado pela metade → 400 apontando o campo
7. A conexão ruim corrompe o corpo → 4xx, nunca 500
8. O app antigo chama a rota com o método errado → 405 com header `Allow`
9. Ele abre um link antigo → 404
10. Depois de tudo, o caminho certo funciona
11. Nenhum passo produziu erro interno
12. E toda recusa foi acionável pelo app

## 3. O que esta jornada protege

Duas promessas que só valem verificadas em conjunto: **erro do cliente nunca vira erro do servidor** (um 5xx em entrada inválida é exceção não tratada vazando para fora, além de ruído que esconde incidente real no monitoramento) e **a recusa é acionável** (um 400 sem `code` e sem o campo apontado obriga o app a interpretar mensagem em português para decidir onde pintar de vermelho).

E a terceira, que só a jornada verifica: depois de sete recusas seguidas a API ainda está sã e o caminho feliz conclui. Um servidor que degrada com entrada inválida só aparece quando os erros vêm em sequência.

## 4. Como executar

A esteira executa esta jornada contra o back-end real na regressão diária (`regression / full-suite`).

Localmente, contra o back-end real, com um comando só (clona, semeia e sobe o
back-end, roda a jornada e desliga o servidor; exige Python 3.10 ou mais):

```bash
npm run test:backend-real -- "tests/e2e/e2e12-*.test.js"
```

Contra um back-end que já está no ar, trocar de alvo é mudar uma variável;
nenhum arquivo de teste muda:

```bash
BASE_URL=http://localhost:5000 npm run diagnostico
BASE_URL=http://localhost:5000 node --test "tests/e2e/e2e12-*.test.js"
```

Os usuários de teste precisam existir com os perfis `cidadao`, `gestor` e
`admin` (seção 3 do [README](../../README.md)); `npm run diagnostico` diz qual
está faltando.

## 5. Resultado esperado

| Alvo | Resultado em 16/11/2026 |
| :--- | :--- |
| Back-end real (esteira) | **Reprova no passo 4 por defeito conhecido do produto, D-10**: e-mail já cadastrado responde 400, e não 409. Acompanhado na issue #21. |
| Duplo de referência (só na verificação de sensibilidade) | **Verde.** Prova que a jornada funciona; não prova nada sobre o produto. |

> Divergência entre os dois alvos exige a pergunta de três vias: o defeito está no back-end, no teste ou no próprio contrato? Ver [`docs/tas.md`](../tas.md), seção 4.

## 6. Oráculo

Todo valor esperado vem de [`data/contrato.js`](../../data/contrato.js) e [`data/matriz-autorizacao.js`](../../data/matriz-autorizacao.js). Não há nenhum literal de domínio dentro do teste: se a especificação mudar, muda-se o oráculo em um lugar só e a jornada acompanha.
