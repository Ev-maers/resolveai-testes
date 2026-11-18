# Evidência: a política de manutenção aplicada, da identificação ao encaminhamento

**Data:** 16/11/2026
**Branch da entrega:** `feat/backend-real-e-notificacao`
**Branch de demonstração:** `demo/politica-defeito-tas` (só para a situação simulada)
**Política:** [`docs/tas.md`](../tas.md), seção 9
**Guia de estudo:** [`docs/guia-politica-de-manutencao.md`](../guia-politica-de-manutencao.md)

As execuções das seções 1 a 3 são do workflow `pipeline-de-testes`; as da
seção 4, do `e2e-app`. Todas rodaram contra o back-end real (commit
`d7b60aa`), e todas as issues foram abertas e fechadas pelo
`github-actions[bot]`.

---

## 1. Situação real: defeitos do back-end (D-02 a D-13)

| Etapa | Evidência |
| :--- | :--- |
| Identificação | Em toda execução, o quality gate separa as reprovações. Exemplo, na execução [#106](https://github.com/Ev-maers/resolveai-testes/actions/runs/43878199256): a anotação "Defeitos conhecidos do produto (nao bloqueiam o merge)" lista D-02, D-04 a D-12, com o número de testes e o prazo de cada um. |
| Classificação | 11 defeitos do SUT, cada um com severidade, triados em 16/11/2026 pelo QA da squad: `data/defeitos-conhecidos.js` (campos `classificacao`, `severidade`, `triagem`). |
| Registro | Issues [#14](https://github.com/Ev-maers/resolveai-testes/issues/14) a [#24](https://github.com/Ev-maers/resolveai-testes/issues/24), uma por defeito, com os rótulos `defeito-conhecido`, `defeito-sut` e `severidade:*`. |
| Encaminhamento | Squad de back-end (repositório `ndrfelipe/smart-city`), com prazo: 23/11 (alta), 30/11 (média) e 16/12 (baixa). O encaminhamento e o prazo estão no corpo de cada issue. |
| Acompanhamento | Rotina de manutenção simulada para 24/11/2026 (`node scripts/manutencao.js --simulacao --revisao --hoje 2026-11-24`): 12 demandas abertas, **6 com prazo vencido** (#12, #14, #16, #17, #18 e #19), nenhuma com responsável atribuído, nenhum teste instável. A rotina marcaria as 6 com `prazo-vencido` e comentaria em cada uma. |

O resultado completo e a recomendação estão em
[`relatorio-qualidade.md`](../relatorio-qualidade.md).

---

## 2. Situação real: teste instável (HU-14, issue #27)

Aconteceu durante o trabalho, sem ser provocada.

| Etapa | O que aconteceu | Evidência |
| :--- | :--- | :--- |
| Identificação | O `HU-14 cidadao exclui a propria demanda enquanto ela esta pendente` reprovou: "a API confirmou a exclusao mas a demanda continua acessivel (200)". O gate reprovou o estágio de API (falha nova). | Execução [#111](https://github.com/Ev-maers/resolveai-testes/actions/runs/43881978373), vermelha |
| Registro | Issue aberta pela esteira com `falha-de-teste`, `triagem` e `manutencao`, a mensagem, a branch, os commits e as cinco perguntas. | Issue [#27](https://github.com/Ev-maers/resolveai-testes/issues/27) |
| Investigação | **1.** Passava em todas as execuções anteriores contra o mesmo commit do back-end. **3.** O back-end apaga e confirma no banco (`db.session.delete` + `commit`). **5.** Não se repete sozinho, então é instabilidade. | Código do back-end, `services/demandas_service.py` |
| Causa | Reprodução local: depois de excluir a demanda de maior id, a próxima criada recebe **o mesmo id** (SQLite sem `AUTOINCREMENT`). Na esteira, outro arquivo de teste, rodando em paralelo com a mesma conta, criou uma demanda entre a exclusão e a consulta. | Saída abaixo |
| Classificação | Instabilidade por dado compartilhado entre testes: **defeito da TAS**, severidade média, prazo de 3 dias. Não é defeito do produto, porque em produção o banco é PostgreSQL, que não reaproveita ids. | `docs/tas.md`, seção 9.4 |
| Correção | Os arquivos de teste passaram a rodar um por vez (`--test-concurrency=1`). Sem reexecução, sem `skip` e sem afrouxar a asserção. Decisão registrada no `tas.md`, seção 8. | Commit `acdd053` |
| Encerramento | A issue fechou sozinha quando o teste voltou a passar na mesma branch. | Execução [#112](https://github.com/Ev-maers/resolveai-testes/actions/runs/43883331181), verde |

Reprodução local, contra o back-end real com SQLite (três tentativas, três
reaproveitamentos):

```
{"criada":1,"exclusao":200,"novaDemanda":1,"getDoIdExcluido":200,"mesmoTitulo":false}
{"criada":2,"exclusao":200,"novaDemanda":2,"getDoIdExcluido":200,"mesmoTitulo":false}
{"criada":3,"exclusao":200,"novaDemanda":3,"getDoIdExcluido":200,"mesmoTitulo":false}
```

`mesmoTitulo: false` prova que o 200 vem de **outra** demanda, que herdou o id.

---

## 3. Situação simulada: defeito da TAS no teste de paginação (HU-09)

Na branch `demo/politica-defeito-tas`, o teste de paginação deixou de enviar o
parâmetro `per_page`. O back-end devolve a página padrão, e a mensagem ("o
limite de 1 item por pagina foi ignorado") parece um defeito do produto.

### Primeira rodada: a demonstração revelou um defeito na própria esteira

| Etapa | Execução | O que aconteceu |
| :--- | :--- | :--- |
| Defeito introduzido (`5453fdf`) | [#106](https://github.com/Ev-maers/resolveai-testes/actions/runs/43878199256), vermelha | O gate reprovou com "1 falha nova, fora do registro de defeitos conhecidos". A esteira abriu a [#25](https://github.com/Ev-maers/resolveai-testes/issues/25) com `triagem`. |
| Fechamento indevido | [#107](https://github.com/Ev-maers/resolveai-testes/actions/runs/43880087332), verde, **outra branch** | A #25 foi fechada com "O teste voltou a passar" por uma execução da `feat/backend-real-e-notificacao`, onde o teste nunca esteve quebrado. |

Pela política, o achado é um **defeito da TAS** no mecanismo de encerramento:
uma execução verde de outra branch não prova a correção. A correção (commit
`924386b`) passou a exigir que a issue só feche quando o teste passar na mesma
branch em que a falha foi registrada. A regra foi atualizada no `tas.md`,
seção 9.2.

### Segunda rodada, com a regra corrigida

| Etapa | Execução | O que aconteceu |
| :--- | :--- | :--- |
| Identificação e registro (`cde06f3`) | [#110](https://github.com/Ev-maers/resolveai-testes/actions/runs/43880991892), vermelha | O gate reprovou o estágio de API, e a esteira abriu a [#26](https://github.com/Ev-maers/resolveai-testes/issues/26) com `falha-de-teste`, `triagem` e `manutencao`. O corpo diz: "Esta issue fecha sozinha quando o teste voltar a passar na branch `demo/politica-defeito-tas`". |
| A regra segura a issue | [#111](https://github.com/Ev-maers/resolveai-testes/actions/runs/43881978373) e [#112](https://github.com/Ev-maers/resolveai-testes/actions/runs/43883331181), outra branch | O HU-09 passou nas duas, mas a #26 continuou aberta. |
| Investigação e classificação | — | **Pergunta 3:** o back-end pagina corretamente quando recebe `per_page`. O estado do sistema é o esperado, então a falha está na TAS. Classificação: defeito da TAS, severidade média, prazo de 3 dias. |
| Correção e encerramento (`feabd8d`) | [#113](https://github.com/Ev-maers/resolveai-testes/actions/runs/43883368546), verde, mesma branch | A #26 fechou sozinha com "O teste voltou a passar" e o link da #113. |

**Classificação pelo comando `/triagem`.** O comando de triagem é disparado
por comentário, e o GitHub só executa esse tipo de workflow a partir da branch
padrão. Por isso ele não pôde ser usado antes do merge na `main`. Nesta
demonstração, a classificação ficou registrada nas mensagens de commit da
correção. Depois do merge, a mesma etapa é feita com um comentário na issue,
por exemplo `/triagem tas media @responsavel`, como mostra o guia, parte E.

---

## 4. Situação real: o E2E-13 encontra um defeito do app (D-14)

| Etapa | O que aconteceu | Evidência |
| :--- | :--- | :--- |
| Identificação | O E2E-13 passou pelos passos 1 a 3, mas a notificação não apareceu na gaveta. O gate reprovou como falha nova, e a esteira registrou a falha. | Execução [#8](https://github.com/Ev-maers/resolveai-testes/actions/runs/43877913470) do `e2e-app`; issue [#12](https://github.com/Ev-maers/resolveai-testes/issues/12) |
| Investigação | **3.** O status mudou no back-end e na lista do app. **4.** O diagnóstico publicado mostrou que o canal de notificação do app nunca foi criado e que a permissão nunca foi pedida. Uma execução de diagnóstico mostrou o erro que o app engolia. | Execução [#13](https://github.com/Ev-maers/resolveai-testes/actions/runs/43885374232); [`e2e13-notificacao.md`](e2e13-notificacao.md), seção 3 |
| Classificação | Defeito do SUT, **no app**, severidade média | `data/defeitos-conhecidos.js`, D-14 |
| Registro | Entrada D-14 com **assinatura** (só a falha em que a notificação não aparece) e issue do defeito | Issue [#28](https://github.com/Ev-maers/resolveai-testes/issues/28) |
| Encaminhamento | Squad do app (`PetersonNave/Smart-City`), prazo de 30/11/2026 | Corpo da #28 |
| Passagem de bastão | Na primeira execução com o registro, o gate reconheceu o D-14, o job ficou verde, e a issue do teste fechou apontando para a do defeito. | Execução [#14](https://github.com/Ev-maers/resolveai-testes/actions/runs/43888036400); comentário de fechamento da #12 |

A regra de passagem de bastão (a issue do teste fecha quando a falha passa a
ser defeito conhecido) foi criada durante este caso. Sem ela, a #12 ficaria
aberta para sempre, porque o teste continua reprovando pelo D-14.

---

## 5. Verificações automáticas da política

Simuladas localmente; os arquivos foram restaurados logo depois.

**Regra P2 (espera fixa).** Uma linha `await new Promise(r => setTimeout(r, 2000))`
acrescentada ao teste de paginação:

```
$ node scripts/verificar-politica.js
::error title=Politica de manutencao::P2 tests\api\hu09-consulta-demandas.test.js:64: espera por tempo fixo; espere por condicao
1 violacao(oes) da politica.
codigo de saida: 1
```

**Regra P6 (plano reduzido sem decisão registrada).** O total de testes de API
planejados mudou de 53 para 52, sem linha nova no histórico do plano:

```
$ node scripts/verificar-politica.js
::error title=Politica de manutencao::P6 data/plano-de-testes.js: o plano soma 70 casos, mas o historico do plano termina em 71; registre a mudanca
1 violacao(oes) da politica.
codigo de saida: 1
```

As duas regras rodam em todo push, no step *Verifica a TAS* dos jobs
`quality-gate / unit-and-api` e `regression / full-suite`.
