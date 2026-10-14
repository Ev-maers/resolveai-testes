# Evidências

Os arquivos desta pasta (`execucao-limpa.txt`, `resultado-backend-real.txt`,
`resultado.xml`, `sensibilidade.txt`) são **da entrega da U1 (09/09)**, de quando
a suíte tinha 106 casos e o back-end real ainda tinha o defeito de login com 500.
Ficam aqui como registro histórico.

A evidência **atual** são as execuções do GitHub Actions
(<https://github.com/Ev-maers/resolveai-testes/actions>): cada execução publica
o relatório JUnit de cada nível como artefato e o resumo na aba *Summary*.

Para gerar a evidência atual no seu computador: `npm run test:tudo -- --relatorio`
(grava `evidencias/resultado.xml`).
