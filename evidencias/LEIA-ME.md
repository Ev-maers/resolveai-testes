# Evidências

Os arquivos desta pasta (`execucao-limpa.txt`, `resultado-backend-real.txt`,
`resultado.xml`, `sensibilidade.txt`) são **da entrega da U1 (09/09)**, de quando
a suíte tinha 106 casos e o back-end real ainda tinha o defeito de login com 500.
Ficam aqui como registro histórico.

A evidência **atual** são as execuções do GitHub Actions
(<https://github.com/Ev-maers/resolveai-testes/actions>): cada execução publica
o relatório JUnit de cada nível como artefato e o resumo na aba *Summary*.

Para gerar a evidência atual no seu computador: `npm run qualidade` (roda a
suíte, grava `resultado.xml`, calcula `metricas.json` e gera
`relatorio-tecnico.html` e `relatorio-negocio.html`). Esses arquivos gerados são
ignorados pelo git: a versão oficial é a que a pipeline publica como artefato e
na branch `metricas`.

**Issues automáticas e relatórios da pipeline:** `issues-e-relatorios.md`
registra a execução em que a pipeline abriu e fechou issues sozinha, os
artefatos publicados e onde os relatórios ficam.

**Bloqueio de merge pelo quality gate:** `bloqueio-de-merge.md` e
`bloqueio-de-merge-pr8.jpg` registram o PR #8, que quebrou um teste de
propósito e ficou com o merge bloqueado depois da ativação da proteção da
branch `main` (03/11/2026).
