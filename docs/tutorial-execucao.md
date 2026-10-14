# Guia da apresentação — como rodar e mostrar na aula

Para quem vai compartilhar a tela na aula. Tem duas partes: **A) a demonstração
no GitHub** (é o que a professora pediu) e **B) rodar no seu computador**
(plano B, ou para ensaiar sem depender do GitHub).

Repositório: https://github.com/Ev-maers/resolveai-testes

---

## O que a professora pediu

Mostrar a pipeline funcionando no GitHub Actions: o arquivo do workflow, o
acionamento, o job de regressão com os steps por nível de teste (unitário, API e
E2E) e o resultado.

---

## A) Demonstração no GitHub (o principal)

### Antes da aula (faça uma vez, 5 min)

1. **Confirme que você tem permissão de escrita no repositório.** Sem ela, o
   botão "Run workflow" não aparece. O dono do repositório (`Ev-maers`)
   adiciona em *Settings → Collaborators → Add people*.
2. Abra https://github.com/Ev-maers/resolveai-testes/actions e faça um ensaio
   completo (passos abaixo). A execução leva cerca de 1 minuto.
3. Deixe estas abas abertas: o arquivo `.github/workflows/testes.yml`, a aba
   *Actions* e, se quiser, a `docs/matriz-de-cobertura.md`.

### Durante a aula (passo a passo)

1. **Mostre o arquivo do workflow.** No repositório, abra
   `.github/workflows/testes.yml`. Aponte:
   - `on: workflow_dispatch` → pode ser acionado manualmente;
   - um único job, `regressao-completa`;
   - três steps separados por nível: **1. Testes Unitarios**,
     **2. Testes de API**, **3. Testes End-to-End (E2E)**.
2. **Acione a pipeline.** Clique em **Actions**, escolha **pipeline-de-testes**
   na lista da esquerda, clique em **Run workflow** (à direita) e confirme no
   botão verde **Run workflow**.
3. **Abra a execução** que aparecer no topo da lista (fica amarela, depois
   verde) e clique no job **regressao completa**.
4. **Mostre os steps por nível.** Clique em cada um e mostre o resultado:
   - *1. Testes Unitarios* → 5 testes
   - *2. Testes de API* → 53 testes
   - *3. Testes End-to-End (E2E)* → 11 jornadas
5. **Mostre o resumo.** Na página da execução (aba *Summary*) aparece a anotação
   **"69 casos, nenhuma falha"**. No fim da página ficam os artefatos com o
   relatório de cada nível.

> Se a execução demorar a começar, espere uns 10 segundos e atualize a página.

### Extra: a suíte contra o back-end real

Mostra que a automação acha defeitos de verdade. Em **Actions**, escolha
**suite-contra-backend-real** → **Run workflow**. Esse workflow sobe o back-end
Flask real e roda os 3 níveis contra ele.

Ele fica **vermelho de propósito**: enquanto o back-end tiver defeitos, o
resultado verdadeiro é vermelho. Na aba *Summary* aparece a lista do que falhou.

---

## B) Rodar no seu computador

### Instalar (uma vez)

- **Node.js 20.11 ou mais novo** (https://nodejs.org). Confira com `node --version`.
- **Git**.
- Não existe `npm install`: o projeto não usa dependências.

### Rodar tudo com um comando

```bash
git clone https://github.com/Ev-maers/resolveai-testes.git
cd resolveai-testes
npm run test:tudo
```

Esse comando sobe o servidor de referência, espera ele responder, roda os 3
níveis e desliga o servidor. **Resultado esperado: 69 testes, 69 aprovados,
0 falhas.**

### Rodar um nível por vez (bom para a demonstração)

| O que mostrar | Comando | Precisa do servidor? |
| :--- | :--- | :---: |
| Unitários (5) | `npm run test:unidade` | não |
| Tudo (unitário, API e E2E) | `npm run test:tudo` | sobe sozinho |
| Uma jornada E2E | `npm run sut:referencia` em um terminal e, em outro, `node --test "tests/e2e/e2e01-*.test.js"` | sim |

### Se der problema

| O que aparece | O que fazer |
| :--- | :--- |
| `EADDRINUSE` ou "o duplo de referencia nao respondeu" | A porta 5000 está ocupada (no Mac, costuma ser o AirPlay Receiver). Rode em outra porta: Mac/Linux `PORT=5001 npm run test:tudo`; Windows (PowerShell) `$env:PORT=5001; npm run test:tudo` |
| `node: command not found` | Instale o Node.js e abra um terminal novo |
| Testes falham em massa | Algo já está usando a porta, ou o terminal está em outra pasta. Confira com `pwd` que está dentro de `resolveai-testes` |

---

## O que dizer (5 pontos)

1. **O que é testado:** a API do ResolveAí (back-end Flask) e as jornadas do
   usuário sobre ela. O app mobile ainda não tem E2E de tela.
2. **Os 3 níveis:** *unitário* confere o gabarito dos testes; *API* testa uma
   regra de cada vez; *E2E* testa uma jornada inteira encadeada.
3. **Cada regra tem um único teste dono**, e cada teste responde uma pergunta.
   O catálogo está em `docs/matriz-de-cobertura.md`.
4. **O verde da pipeline é contra um servidor de referência**, que imita o
   contrato. Prova que a suíte funciona. Contra o back-end **real**, o workflow
   acha defeitos de verdade: o cidadão consegue se promover a gestor, não existe
   máquina de estados, o access token serve como refresh, entre outros.
5. **Limites, ditos com clareza:** a base unitária mora nos outros repositórios
   (o back-end tem 27 testes `unittest` e o app mobile tem 170 testes Jest); o
   fluxo "notificar" não foi testado porque o app ainda não tem notificação.

### Perguntas que a professora pode fazer

- **"Por que não usaram Maestro?"** A equipe comparou as ferramentas e escolheu
  Appium, com Maestro em segundo lugar. O E2E foi feito sobre a API porque o app
  só ficou navegável depois. Testar as telas com a ferramenta móvel é o próximo
  passo do backlog.
- **"Esses testes são do produto real?"** O verde da pipeline é contra o servidor
  de referência. O workflow `suite-contra-backend-real` roda contra o back-end
  real e é onde aparecem os defeitos.
- **"Por que o workflow real fica vermelho?"** Porque o back-end tem defeitos
  conhecidos. Vermelho ali é o resultado verdadeiro, e não um erro da pipeline.
