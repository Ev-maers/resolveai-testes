# Relatório de qualidade — ResolveAí (Smart City)

**Data:** 16/11/2026 · **Squad:** ResolveAí · **Elaborado por:** QA da squad

**Alvo:** back-end real do Projeto Integrador
([`ndrfelipe/smart-city`](https://github.com/ndrfelipe/smart-city), branch
padrão, commit `d7b60aa`), subido dentro da esteira com banco SQLite novo a
cada execução. O E2E-13 usa também o app
([`PetersonNave/Smart-City`](https://github.com/PetersonNave/Smart-City),
commit `32ff0a8`) no Expo Go, num emulador Android.

**Ambiente:** GitHub Actions (`ubuntu-latest`), Node.js 22, Python 3.12;
emulador Android API 34 com Maestro para o E2E-13.

O relatório da entrega anterior (U1, 09/09/2026) está em
[`historico/relatorio-qualidade-u1.md`](historico/relatorio-qualidade-u1.md).

---

## 1. Resumo para quem decide

- **A suíte está completa:** os 71 casos planejados existem e rodam na esteira.
- **O produto ainda não atende ao critério de saída.** Cinco defeitos de
  severidade alta continuam abertos: D-02 (sessão), D-05 e D-06 (autorização),
  D-07 e D-08 (regras de negócio).
- **A notificação ao cidadão não funciona no Expo Go para Android (D-14).** O
  E2E-13 encontrou o defeito pela interface: o gestor muda o status, a lista
  mostra o status novo, mas o aviso nunca chega.
- **Nenhuma falha nova.** Todas as reprovações correspondem a defeitos já
  triados, registrados, encaminhados à squad responsável (back-end ou app) e
  com prazo (seção 3).
- **Recomendação: não entregar enquanto os defeitos de severidade alta
  estiverem abertos** (seção 7).

---

## 2. Resultado por suíte

| Suíte | Casos | Aprovados | Reprovados | Taxa | Reprovações |
| :--- | ---: | ---: | ---: | ---: | :--- |
| Unitários da TAS (oráculo, massa, matriz, gate) | 6 | 6 | 0 | 100% | — |
| API (regra por regra) | 53 | 40 | 13 | 75% | todas por defeito conhecido |
| E2E pela API (jornadas) | 11 | 5 | 6 | 45% | todas por defeito conhecido |
| E2E pela interface do app (E2E-13) | 1 | 0 | 1 | 0% | defeito conhecido do app (D-14), no passo 4 |
| Testes de componente do próprio back-end (`pytest`) | 45 | 43 | 2 | 96% | defeito conhecido (D-13) |

**Leitura.** As 13 reprovações de API e as 6 de E2E vêm de 10 defeitos do
produto. Uma única causa pode derrubar vários testes: o D-08 (falta de máquina
de estados) reprova 4 testes de API e 2 jornadas. As 19 reprovações não são
19 problemas, e sim 10 causas, cada uma com uma issue.

**E2E-13.** Os passos 1 a 3 passam: a cidadã entra, acompanha a demanda, o
gestor muda o status e a lista mostra o status novo. O passo 4 reprova: a
notificação nunca aparece, por um defeito do app no Expo Go para Android
(D-14). Detalhes em
[`evidencias/e2e13-notificacao.md`](evidencias/e2e13-notificacao.md).

**Quality gate.** O gate aprova as execuções porque toda reprovação está no
registro de defeitos conhecidos (`data/defeitos-conhecidos.js`). Isso **não**
significa que o produto está bom: significa que nenhuma regressão nova
apareceu. O gate continua bloqueando qualquer falha nova e também bloqueia se
um defeito registrado passar a ser aprovado sem sair do registro
([`tas.md`](tas.md), seção 9.5).

**Defeitos corrigidos desde a U1.** O D-01 (login inválido respondia 500) e o
D-03 (o cidadão se autopromovia a gestor) foram corrigidos no back-end. Os
testes `HU-02 login invalido responde 401 sem revelar se a conta existe` e
`HU-03 cidadao nao se promove: pedido recusado e perfil inalterado` passam.

---

## 3. Defeitos abertos

Cada defeito tem uma issue aberta pela própria esteira com os rótulos
`defeito-conhecido`, `defeito-sut` e a severidade. Encaminhamento: squad de
back-end (repositório `ndrfelipe/smart-city`), exceto o D-14, que é da squad
do app (`PetersonNave/Smart-City`). Triagem em 16/11/2026.

| Id | Severidade | Defeito | Testes que reprovam | Prazo | Issue |
| :--- | :--- | :--- | :--- | :--- | :--- |
| D-02 | alta | O access token é aceito como refresh token | `HU-02`, `E2E-07` | 23/11 | [#14](https://github.com/Ev-maers/resolveai-testes/issues/14) |
| D-05 | alta | Gestor consegue registrar demanda | `HU-03` | 23/11 | [#16](https://github.com/Ev-maers/resolveai-testes/issues/16) |
| D-06 | alta | Demanda de outro cidadão responde 403 em vez de 404 | `HU-03`, `E2E-04` | 23/11 | [#17](https://github.com/Ev-maers/resolveai-testes/issues/17) |
| D-07 | alta | Gestor exclui demanda já concluída | `HU-14` | 23/11 | [#18](https://github.com/Ev-maers/resolveai-testes/issues/18) |
| D-08 | alta | Não existe máquina de estados: transições inválidas são aceitas | 4 × `HU-13`, `E2E-02`, `E2E-10` | 23/11 | [#19](https://github.com/Ev-maers/resolveai-testes/issues/19) |
| D-04 | média | Não existe rota para o admin promover um cidadão a gestor | `HU-03`, `E2E-09` | 30/11 | [#15](https://github.com/Ev-maers/resolveai-testes/issues/15) |
| D-09 | média | Respostas de erro não trazem código legível por máquina | `CT` | 30/11 | [#20](https://github.com/Ev-maers/resolveai-testes/issues/20) |
| D-10 | média | E-mail já cadastrado responde 400 em vez de 409 | `HU-01`, `E2E-12` | 30/11 | [#21](https://github.com/Ev-maers/resolveai-testes/issues/21) |
| D-14 | média | O app não avisa o cidadão da mudança de status no Expo Go para Android | `E2E-13`, passo 4 | 30/11 | aberta pela esteira com o rótulo `defeito-conhecido` |
| D-11 | baixa | Resposta 405 sem o cabeçalho `Allow` | `CT` | 16/12 | [#22](https://github.com/Ev-maers/resolveai-testes/issues/22) |
| D-12 | baixa | Erros de validação usam 400 numa rota e 422 em outra | `CT` | 16/12 | [#23](https://github.com/Ev-maers/resolveai-testes/issues/23) |
| D-13 | baixa | Testes `unittest` do próprio back-end desatualizados (cadastro) | 2 testes do `pytest` | 16/12 | [#24](https://github.com/Ev-maers/resolveai-testes/issues/24) |

O D-13 não é um comportamento errado do produto: dois testes do próprio
back-end esperam o formato antigo do cadastro. Está registrado como baixa
porque deixa a suíte de componente do produto vermelha sem motivo real.

O D-14 foi encontrado pelo E2E-13. No Expo Go para Android, a criação do canal
de notificação "demandas" é rejeitada no código nativo
(`NullPointerException`). O app engole o erro, não pede a permissão e nunca
liga o aviso local. A causa provável está na plataforma (Expo Go), mas o
efeito é do produto: no ambiente que o README do app declara suportado, a
cidadã não é avisada, e nada na tela indica o problema. A squad do app pode
tratar a falha do canal (seguir com o canal padrão) ou validar o aviso numa
build de desenvolvimento.

A descrição completa de cada defeito, com a evidência, está no próprio
registro (`data/defeitos-conhecidos.js`) e na issue correspondente.

---

## 4. Instabilidade

Nenhum teste instável. A rotina de manutenção procura testes que alternaram
entre aprovar e reprovar pelo menos duas vezes nas últimas 20 execuções da
regressão na `main` e não encontrou nenhum. Os defeitos conhecidos reprovam
sempre, de forma determinística.

O E2E-13 é o teste mais sujeito a instabilidade (emulador, Expo Go e Metro) e,
por isso, roda num estágio próprio e publica o diagnóstico da tela quando
reprova (risco R-07 do [`tas.md`](tas.md)).

---

## 5. Riscos para o produto

| Risco | Defeito | Efeito para o usuário |
| :--- | :--- | :--- |
| Sessão que não expira | D-02 | Um token de acesso vazado renova a sessão indefinidamente. |
| Enumeração de demandas | D-06 | O 403 revela que a demanda de outra pessoa existe. |
| Histórico corrompido | D-08 | Uma demanda concluída ou recusada pode voltar a "pendente"; o tempo de atendimento deixa de fazer sentido. |
| Regra de perfil violada | D-05, D-07 | Gestor registra demanda e apaga demanda concluída, o que o README do produto proíbe. |
| Funcionalidade documentada inexistente | D-04 | O admin não tem como promover um cidadão a gestor pela API. |
| Cidadão sem aviso | D-14 | A demanda anda e a cidadã não fica sabendo, a menos que abra o app e atualize a lista. |
| Cliente dependente de texto | D-09, D-10, D-12 | O app precisa interpretar mensagens em português para tratar erros. |

---

## 6. Situação do backlog de automação

| Item | Situação |
| :--- | :--- |
| Suíte de API e de E2E contra o back-end real, sem `continue-on-error` | Feito (16/11/2026) |
| Quality gate por registro de defeitos conhecidos | Feito, com teste próprio (U6) |
| E2E pela interface: o gestor muda o status e o cidadão vê a notificação | Feito (E2E-13); reprova por D-14 |
| Política de manutenção com registro, prazos e revisão periódica | Feito ([`tas.md`](tas.md), seção 9) |
| Máquina de estados no nível de componente (item 1 do backlog) | A fazer, depende da squad de back-end |

O backlog completo está em [`tas.md`](tas.md), seção 6.

---

## 7. Recomendação

**Não entregar** o produto enquanto D-02, D-05, D-06, D-07 e D-08 estiverem
abertos. Três deles afetam segurança ou autorização e dois corrompem regras de
negócio centrais. O critério de saída do plano não admite defeito aberto de
severidade crítica ou alta ([`plano-de-testes.md`](plano-de-testes.md), seção 5).
O plano também exige o E2E-13 verde, e hoje ele reprova pelo D-14: sem a
notificação, o fluxo "registrar, acompanhar e notificar" fica incompleto.

**Pode seguir:** a própria automação. A suíte está completa, estável e
rastreável. Quando a squad de back-end corrigir um defeito, o teste
correspondente passa a ser aprovado, o gate pede a retirada da entrada do
registro e a issue do defeito é marcada como `possivelmente-corrigido`.

**Como reproduzir:**

```bash
npm run qualidade      # sobe o back-end real, roda a suíte e gera os relatórios
```

Detalhes em [`pipeline-ci.md`](pipeline-ci.md).
