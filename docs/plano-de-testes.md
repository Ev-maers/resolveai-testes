# Plano de Testes — Smart City / ResolveAí

**SUT:** a API REST do Projeto Integrador (Flask,
[ndrfelipe/smart-city](https://github.com/ndrfelipe/smart-city)) e o app mobile
que a consome (Expo,
[PetersonNave/Smart-City](https://github.com/PetersonNave/Smart-City)).
**Níveis automatizados:** unitário, API, E2E pela API e E2E pela interface do app.
**Total:** 71 testes: 6 unitários, 53 de API, 11 jornadas E2E pela API e 1 E2E
pela interface do app. A regressão diária roda também os 45 testes do próprio
back-end.
**Alvo:** o back-end real e o app real, em todos os estágios da esteira.

O catálogo, teste a teste e com o dono de cada regra, está em
[`matriz-de-cobertura.md`](matriz-de-cobertura.md). Este documento fixa o escopo.

---

## 1. Endpoints contemplados

Todos os endpoints do README do produto, seção 6.

| Método | Rota | Onde é testado |
| :--- | :--- | :--- |
| `POST` | `/auth/register` | `hu01-cadastro.test.js` |
| `POST` | `/auth/login` | `hu02-autenticacao.test.js` |
| `GET` | `/auth/me` | `hu02-autenticacao.test.js` |
| `PATCH` | `/auth/update` | `hu03-autorizacao.test.js` (promoção de perfil) |
| `POST` | `/auth/refresh` | `hu02-autenticacao.test.js` |
| `GET` | `/auth/logout` | `hu02-autenticacao.test.js` |
| `GET` | `/api/demandas` | `hu09-consulta-demandas.test.js` |
| `POST` | `/api/demandas` | `hu06-registro-demanda.test.js` |
| `GET` | `/api/demandas/{id}` | `hu09-consulta-demandas.test.js` |
| `PATCH` | `/api/demandas/{id}` | `hu13-atualizacao-status.test.js`; a notificação que a mudança de status dispara é verificada pela interface no E2E-13 |
| `DELETE` | `/api/demandas/{id}` | `hu14-exclusao-demanda.test.js` |
| qualquer | rota inexistente, método errado, corpo malformado | `contrato-transversal.test.js` |

Fora desta lista, o produto tem também `PUT /api/demandas/{id}/foto`, a busca
`?q=`, o filtro `?regiao=`, `PUT`/`DELETE /auth/push-token` e
`GET /api/demandas/metricas`. Eles são cobertos pelos testes do próprio
back-end (`test_demandas.py`, `test_demandas_busca.py` e
`test_acompanhamento_notificacoes_metricas.py`), que rodam na regressão diária.

## 2. O que é validado

| Dimensão | Onde |
| :--- | :--- |
| Código de status HTTP | todos os testes de API |
| Estrutura e conteúdo da resposta | detalhe, listagem e paginação (HU-09), registro (HU-06) |
| Cabeçalhos | `Allow` no 405; `content-type` JSON (CT) |
| Parâmetros de entrada | paginação e filtros (HU-09, HU-12) |
| Regras de negócio | máquina de estados (HU-13), exclusão por estado (HU-14) |
| Dados inválidos ou ausentes | HU-01, HU-02, HU-06, HU-13 |
| Autenticação | HU-02 |
| Autorização | HU-03, HU-14 |
| Contrato da API | CT |
| Notificação ao cidadão, na tela do aparelho | E2E-13 |

## 3. Níveis de teste

| Nível | No plano? | Por quê |
| :--- | :--- | :--- |
| Componente (unitário) | Sim | O gabarito e o quality gate da própria suíte (U1 a U6) e os 45 testes `unittest` do back-end |
| Integração de componentes | Sim | Os testes de API: uma regra do contrato por vez |
| Sistema | Sim | As 11 jornadas E2E pela API, encadeando várias rotas e perfis, e o E2E-13 pela interface do app |
| Integração de sistemas | Não | O produto não depende de serviço de terceiros no escopo testado; o push remoto da Expo fica fora (seção 4) |
| Aceite | Não | Exige o usuário final |

## 4. Fora do escopo

| Item | Motivo |
| :--- | :--- |
| Outros fluxos pela interface do app | Cada fluxo pela interface custa minutos de esteira; as regras já são verificadas pela API. Registrar pela interface é o item 17 do backlog (`tas.md`, seção 6). |
| Push remoto real até o aparelho | Exige aparelho com serviços do Google, credenciais do projeto EAS e o serviço da Expo no ar. O E2E-13 verifica a notificação local do Expo Go, e o envio pelo back-end é coberto pelos testes do próprio back-end. |
| Câmera e GPS reais | Restrição de plataforma; verificação manual |
| Desempenho e carga | Fora da ementa |

## 5. Critérios de entrada e de saída

**Entrada:** back-end real respondendo (`npm run diagnostico` verde) e os
quatro usuários de teste existentes com os perfis certos. Na esteira, os dois
são garantidos pela ação `.github/actions/backend-real` a cada execução.

**Saída:**

- nenhuma falha nova contra o back-end real: todo teste reprovado precisa ser
  um defeito conhecido, triado e registrado (`tas.md`, seção 9.5);
- nenhum defeito em aberto de severidade Crítica ou Alta;
- E2E-13 verde na `main`;
- resultados interpretados em [`relatorio-qualidade.md`](relatorio-qualidade.md).

Em 16/11/2026, o primeiro e o último critérios são atendidos, e os outros dois
não:

- cinco defeitos de severidade alta do back-end estão abertos (D-02, D-05,
  D-06, D-07 e D-08);
- o E2E-13 reprova no passo 4 por um defeito do app (D-14, severidade média):
  no Expo Go para Android, a notificação de mudança de status nunca aparece.

## 6. Riscos

Ver `tas.md`, seção 4. Os dois que mais limitam o valor da informação:

- **R-02**: o contrato de payload e de erro não é documentado. Os valores
  esperados continuam sendo hipótese (`[B]`) ou formato confirmado no código
  (`[C]`).
- **R-06**: a esteira testa a branch padrão do back-end, que muda sem aviso.
  Cada execução registra o commit testado.
