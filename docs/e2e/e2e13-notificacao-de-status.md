# E2E-13 — Notificação da mudança de status, verificada pela interface

| | |
| :--- | :--- |
| **Origem** | Feedback da professora sobre a rubrica do Projeto Integrador: o fluxo "registrar, acompanhar e notificar" precisa de um cenário em que a notificação seja verificada pela interface |
| **Arquivo de teste** | [`tests/app/e2e13-notificacao-de-status.app.js`](../../tests/app/e2e13-notificacao-de-status.app.js) e os fluxos em [`tests/app/fluxos/`](../../tests/app/fluxos/) |
| **Nível** | End-to-End pela interface do app |
| **SUT** | App ResolveAí (Expo, rodando no Expo Go num emulador Android) integrado ao back-end real |
| **Ferramenta** | [Maestro](https://maestro.mobile.dev), dirigindo o app pelos `testID` |

---

## 1. Cenário automatizado

Uma moradora registrou uma demanda e está acompanhando o andamento pelo app. O
gestor público assume o atendimento e muda o status. Sem precisar procurar, ela
recebe no aparelho o aviso de que a demanda andou; ao tocar no aviso, o app
abre o detalhe da demanda com o status novo.

## 2. Fluxo percorrido

| Passo | Onde | O que acontece |
| :--- | :--- | :--- |
| Preparação | API | Uma conta nova de cidadã é criada e registra uma demanda, que nasce pendente. |
| 1 | Interface | A cidadã abre o app, entra com e-mail e senha, vai à aba Demandas e vê a demanda com o status "Pendente". |
| 2 | API | O gestor muda o status para `IN_PROGRESS`. |
| 3 | Interface | A cidadã puxa a lista para baixo, o gesto de atualizar do app, e vê o status "Em análise" no cartão. |
| 4 | Interface | Na gaveta de notificações do Android aparece "Sua demanda foi atualizada", com o título da demanda e o status novo. Tocar no aviso abre o detalhe da demanda, que mostra "Em análise". |

Cada passo de interface grava uma captura de tela, e a execução inteira é
gravada em vídeo no emulador.

## 3. O que este cenário protege

A notificação depende de três peças que nenhum teste de API alcança juntas: o
back-end que registra a mudança, o app que percebe a mudança e monta o aviso, e
o sistema operacional que o exibe. Se qualquer uma falhar, por exemplo o app
deixar de comparar o status antigo com o novo, ou o canal de notificação do
Android não ser criado, a API continua respondendo 200 e só a tela revela o
defeito.

**Por que o gestor age pela API.** O que está sob teste é o que a cidadã vê. O
gestor usar a interface exigiria trocar de conta no mesmo aparelho, e o logout
desliga as notificações da conta. A regra da mudança de status já tem teste
dono na API (HU-13).

**Por que notificação local, e não push remoto.** No Expo Go para Android, o
app usa notificação local: ao recarregar a lista e perceber que o status mudou,
ele mesmo avisa a cidadã (README do app, seção 2.4). O push remoto exigiria
aparelho com serviços do Google, credenciais do projeto EAS e o serviço da Expo
no ar. O envio do push pelo back-end é coberto pelos testes do próprio back-end
(`test_acompanhamento_notificacoes_metricas.py`), que rodam na regressão.

## 4. Como executar

**Na esteira:** workflow `e2e-app` (`.github/workflows/e2e-app.yml`), em todo
pull request para a `main`, todo dia às 12:45 de Brasília e sob demanda
(*Actions > e2e-app > Run workflow*). O workflow sobe o back-end real, instala o
app a partir de `PetersonNave/Smart-City`, sobe o Metro apontando para o
back-end, liga um emulador Android 14, instala o Expo Go do mesmo SDK do app e
roda o cenário. Leva de 15 a 25 minutos.

**Localmente**, com um emulador Android ligado, o Maestro instalado, o back-end
real no ar e o Metro do app rodando com `EXPO_PUBLIC_API_URL=http://10.0.2.2:5000`:

```bash
npm run test:app
```

## 5. Resultado esperado

| Alvo | Resultado |
| :--- | :--- |
| App real + back-end real (esteira) | Verde. Evidência da execução, com as capturas de cada passo, em [`docs/evidencias/e2e13-notificacao.md`](../evidencias/e2e13-notificacao.md). |

Quando o cenário reprova, a esteira publica como anotação o que estava na tela
do emulador e o fim dos logs do Maestro e do Metro, e as capturas vão para a
branch `metricas`. Não há reexecução automática (`tas.md`, seção 9.4).

## 6. Oráculo

O título e o corpo da notificação e os rótulos de status vêm de
[`data/contrato.js`](../../data/contrato.js) (`NOTIFICACAO_DE_STATUS`), marcados
`[A]/[C]`: o README do app documenta que o cidadão é avisado, e o texto exato
foi confirmado no código do back-end e do app, que montam a mesma mensagem.
Nenhum texto esperado está escrito dentro do teste ou dos fluxos: eles chegam
aos fluxos como variáveis.
