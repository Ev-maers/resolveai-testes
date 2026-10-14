# Plano de Testes — Smart City / ResolveAí

**SUT:** API REST do Projeto Integrador (Flask) e o app mobile que a consome.
**Níveis automatizados:** unitário, API e E2E (sobre a API).
**Total:** 69 testes — 5 unitários, 53 de API, 11 E2E.

O catálogo, teste a teste e com o dono de cada regra, está em
[`matriz-de-cobertura.md`](matriz-de-cobertura.md). Este documento fixa o escopo.

---

## 1. Endpoints contemplados

Todos os endpoints do README do repositório [PetersonNave/Smart-City](https://github.com/PetersonNave/Smart-City), seção 6.

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
| `PATCH` | `/api/demandas/{id}` | `hu13-atualizacao-status.test.js` |
| `DELETE` | `/api/demandas/{id}` | `hu14-exclusao-demanda.test.js` |
| qualquer | rota inexistente, método errado, corpo malformado | `contrato-transversal.test.js` |

Fora desta lista, o app usa também `PUT /api/demandas/{id}/foto` e a busca
`?q=`. O upload de foto é coberto pelos testes `unittest` do próprio back-end
(`test_demandas.py`, `test_demandas_busca.py`), que rodam no workflow
`suite-contra-backend-real`.

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

## 3. Níveis de teste

| Nível | No plano? | Por quê |
| :--- | :--- | :--- |
| Componente (unitário) | Sim | O gabarito dos testes (U1 a U5) e os `unittest` do back-end |
| Integração de componentes | Sim | Os testes de API: uma regra do contrato por vez |
| Sistema | Sim | Os 11 E2E: jornadas completas encadeando várias rotas e perfis |
| Integração de sistemas | Não | O produto não depende de serviço de terceiros no escopo atual |
| Aceite | Não | Exige o usuário final |

## 4. Fora do escopo

| Item | Motivo |
| :--- | :--- |
| E2E pela interface do app | Decisão pendente de ferramenta (Appium na tabela da equipe, Maestro nas aulas); o app já expõe `testID` |
| Notificação | O app ainda não implementa; o fluxo "registrar, acompanhar, notificar" cobre hoje só "acompanhar" pela mudança de status |
| Câmera e GPS reais | Restrição de plataforma; verificação manual |
| Desempenho e carga | Fora da ementa |

## 5. Critérios de entrada e de saída

**Entrada:** alvo respondendo (`npm run diagnostico` verde) e os quatro usuários
de teste existentes com os perfis certos.

**Saída:** nenhuma falha nos níveis unitário e API contra o duplo de referência;
as falhas contra o back-end real classificadas como defeito, divergência de
contrato ou pendência (`relatorio-qualidade.md`).

## 6. Riscos

Ver `tas.md`, seção 4. Os dois que mais limitam o valor da informação:

- **R-02** — o contrato de payload e de erro não é documentado: os valores
  esperados continuam sendo hipótese ([B]) ou formato confirmado no código ([C]).
- **R-05** — verde contra o duplo de referência não é evidência sobre o produto.
