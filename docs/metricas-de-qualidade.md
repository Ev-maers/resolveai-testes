# Métricas de qualidade — o que a pipeline mede, e por quê

A pipeline deixou de ser só um detector de falhas: a cada execução ela calcula
indicadores, registra cada falha como issue e gera dois relatórios. Este
documento fixa **quais métricas** entram, **por que** cada uma foi escolhida ou
descartada, **como** são calculadas e **onde** os resultados ficam.

Implementação: [`scripts/metricas.js`](../scripts/metricas.js) (cálculo),
[`scripts/abrir-issues.js`](../scripts/abrir-issues.js) (registro de falhas),
[`scripts/relatorios.js`](../scripts/relatorios.js) (relatórios),
[`scripts/registrar-historico.js`](../scripts/registrar-historico.js) (tendência).
Nenhuma dependência externa, como o resto da suíte.

---

## 1. Critério de seleção

Uma métrica entra se responder **sim** às quatro perguntas:

1. **Responde a uma pergunta que alguém faz de verdade?** Técnica ("o que quebrou e onde?") ou de negócio ("dá para entregar?").
2. **Sai sozinha da pipeline?** Sem planilha, sem alguém copiar número. Se exige intervenção manual, não é acompanhamento contínuo.
3. **Está ligada aos objetivos da TAS** (`tas.md`, seção 2: O1 feedback em menos de 5 minutos, O2 regressão sem intervenção, O3 autorização sempre verificada) **ou à matriz de risco** (`tas.md`, seção 4.1)?
4. **Não é vaidade?** Um número que só cresce e não muda decisão nenhuma fica de fora.

## 2. Métricas selecionadas

| # | Métrica | Pergunta que responde | Como é calculada | Para quem |
| :-- | :-- | :-- | :-- | :-- |
| M1 | **Taxa de aprovação** por nível e total | A suíte está verde? Em qual nível quebrou? | aprovados ÷ (executados − pulados), a partir do JUnit | ambos |
| M2 | **Cobertura do plano** | Tudo que foi planejado rodou? | executados ÷ planejados no nível (`data/plano-de-testes.js`: 5 + 53 + 11) | ambos |
| M3 | **Falhas por história de usuário**, com o impacto da matriz de risco | Onde está o risco? A falha é em HU de impacto alto? | cada caso tem prefixo (`HU-03`, `CT`, `E2E-`, `U`); agrupa e cruza com `tas.md` 4.1 | negócio |
| M4 | **Tipo da falha: funcional ou ambiente** | A falha é do produto ou o alvo caiu? | mensagem contém `SUT inacessivel`/`fetch failed` ⇒ ambiente (G3 em `tas.md`) | técnico |
| M5 | **Tempo de execução** por nível e total, com os 5 testes mais lentos | O1 está sendo cumprido (menos de 5 min)? O que está engordando a suíte? | atributo `time` do JUnit e `duration_ms` do runner | técnico |
| M6 | **Estabilidade**: % de execuções verdes nas últimas 10 da `main` | Dá para confiar no verde, ou a pipeline oscila? | histórico na branch `metricas` (`historico.jsonl`) | ambos |
| M7 | **Falhas recorrentes**: testes que reprovaram 2+ vezes no histórico | Qual defeito é crônico ou intermitente? | contagem por nome de teste no histórico | técnico |
| M8 | **Issues de falha**: criadas, atualizadas, fechadas e **idade das abertas** (dias) | As falhas estão sendo tratadas, ou acumulando? | API do GitHub, rótulo `falha-de-teste` | ambos |
| M9 | **Semáforo** (verde, amarelo, vermelho) | Em uma palavra: pode seguir? | regra derivada de M1 a M8 (seção 4) | negócio |

### Por que estas

- **M1 e M2 juntas** evitam o falso verde: 100% de aprovação com 60% do plano executado não é verde. Os jobs de quality gate rodam subconjuntos de propósito (push: unitário + API; PR: também smoke E2E), por isso a cobertura é medida **sobre os níveis executados naquele evento** e o relatório diz quais níveis não rodaram.
- **M3** é a métrica que fala com o negócio sem traduzir: "falha em autorização por perfil, impacto alto" diz mais que "1 de 69 falhou". A matriz de risco já existia; a métrica só a usa.
- **M4** vem direto da política G3: alvo fora do ar não é reprovação de produto. Sem essa separação, uma queda do duplo de referência viraria 60 issues de defeito.
- **M5** mede o objetivo O1 e protege contra o crescimento silencioso do tempo (revisão quinzenal, `tas.md` seção 9).
- **M6 e M7** são as únicas que precisam de memória entre execuções, por isso existe a branch `metricas`. A política proíbe reexecução automática; a intermitência tem de aparecer no histórico, não ser escondida por retry.
- **M8** fecha o ciclo: detectar sem registrar vira ruído. A idade das issues abertas é o indicador mais honesto de "o time está corrigindo?".

## 3. Métricas descartadas, e por quê

| Métrica | Motivo do descarte |
| :-- | :-- |
| **Cobertura de código** (linhas, ramos) | O código de produção vive em outro repositório (Flask, Python). Este repositório não tem uma linha de produção; cobrir o código da própria suíte seria medir o termômetro. Pertence ao repositório do back-end, com `coverage.py`. |
| **Densidade de defeitos por KLOC** | Exige o tamanho do produto, que a pipeline não enxerga, e KLOC é um denominador que premia código inchado. |
| **Número absoluto de testes** | Vaidade: a suíte **diminuiu** de 117 para 69 testes de propósito (um por regra, `matriz-de-cobertura.md`) e ficou melhor. Um indicador que puniria essa decisão está errado. |
| **Taxa de flakiness por reexecução** | Medir flakiness reexecutando o teste contradiz a política "proibido reexecução automática". A intermitência aparece em M7 pelo histórico. |
| **MTTR (tempo médio de correção)** | Valioso, mas a correção acontece no repositório do produto, fora do alcance desta pipeline. O que dá para medir aqui, sem inventar, é a **idade da issue aberta** (M8), que é o lado visível do MTTR. Fica como evolução quando os repositórios se integrarem. |
| **Desempenho e latência da API** | Fora do escopo do plano (`plano-de-testes.md`, seção 4). O tempo medido em M5 é o da suíte, não do produto. |
| **Score de mutação** | A verificação de sensibilidade (`scripts/sensibilidade.js`, 6 defeitos injetados, 0 pontos cegos) já cumpre esse papel de forma barata e roda a cada push na `main`. Formalizar um score exigiria ferramenta externa, contra a decisão de zero dependências. |
| **Casos por integrante** | Não diz nada sobre qualidade do produto; incentiva volume. |

## 4. Regra do semáforo (M9)

Avaliada nesta ordem; a primeira que casar vence.

| Cor | Condição | O que o negócio deve ler |
| :-- | :-- | :-- |
| **Vermelho** | nenhum caso executado | a pipeline não produziu resultado; tratar como falha |
| **Vermelho** | falha funcional em história de impacto **Alto** (HU-01, 02, 03, 06, 13, 14, E2E) | não entregar antes de classificar e corrigir |
| **Amarelo** | falha só em impacto **Médio** (HU-09, 12, CT) **ou** falha de ambiente | observar; o resultado pode não dizer nada sobre o produto |
| **Amarelo** | estabilidade (M6) abaixo de 80% | o verde de hoje não é confiável ainda |
| **Amarelo** | cobertura do plano (M2) abaixo de 100% nos níveis executados | passou, mas não rodou tudo |
| **Verde** | nada acima | estável |

## 5. Registro de falhas como issues (M8)

Regras em `scripts/abrir-issues.js`:

1. **Uma issue por teste reprovado**, título `[pipeline] <nome do teste>`, rótulo `falha-de-teste`, corpo com nível, história, mensagem, link da execução, commit, branch e evento.
2. **Sem duplicata**: se já existe issue aberta com o mesmo título, a pipeline comenta nela ("voltou a reprovar") em vez de abrir outra.
3. **Falha de ambiente vira uma issue só** (`[pipeline] ambiente: o alvo dos testes nao respondeu`), listando os testes afetados, porque não é defeito do produto.
4. **Fecha sozinha**: quando um teste com issue aberta **roda e passa**, a issue recebe um comentário com a execução verde e é fechada. Só fecha se o teste de fato rodou; um job que não executa aquele nível não fecha nada.
5. **Não roda contra o back-end real**: os defeitos do produto já estão catalogados em `relatorio-qualidade.md` e pertencem ao repositório do back-end. Abrir 30 issues aqui a cada execução manual seria ruído.

Usa o `GITHUB_TOKEN` da própria execução (`permissions: issues: write`) e o `fetch` nativo do Node. Em execução local, sem token, o passo só avisa.

## 6. Onde cada coisa fica

| Artefato | Onde | Quando |
| :-- | :-- | :-- |
| `metricas.json`, `issues.json`, `resumo.md` | artefato `evidencias-*-<run_id>` de cada execução | toda execução |
| `relatorio-tecnico.html`, `relatorio-negocio.html` | mesmo artefato; aba *Summary* traz o resumo | toda execução |
| `unidade.xml`, `api.xml`, `e2e.xml` (JUnit) e `*.log` (saída dos testes e do servidor alvo) | mesmo artefato | toda execução |
| Issues de falha | aba *Issues*, rótulo `falha-de-teste` | quando há reprovação |
| `historico.jsonl` e os relatórios mais recentes com link fixo | branch [`metricas`](https://github.com/Ev-maers/resolveai-testes/tree/metricas) | regressão completa (agendada ou manual) e back-end real |

Para ver os relatórios no navegador sem baixar nada, o dono do repositório pode habilitar o GitHub Pages na branch `metricas` (Settings > Pages). Os endereços ficariam `https://ev-maers.github.io/resolveai-testes/relatorio-negocio.html` e `.../relatorio-tecnico.html`.

## 7. Como reproduzir localmente

```bash
npm run qualidade        # sobe o duplo, roda os 69 casos, calcula metricas e gera os relatorios
# abre evidencias/relatorio-tecnico.html e evidencias/relatorio-negocio.html
```

Para ver a versão vermelha, injete um defeito conhecido no duplo:

```bash
DEFEITO=403-em-vez-de-404 npm run qualidade       # Mac/Linux
$env:DEFEITO='403-em-vez-de-404'; npm run qualidade   # Windows (PowerShell)
```

Os arquivos gerados em `evidencias/` são ignorados pelo git: a versão oficial é a que a pipeline publica.
