/**
 * scripts/verificar-cobertura.js - Confere se a suite ainda cobre o plano.
 *
 * Para cada nivel, confere o numero de arquivos de teste e um minimo de
 * declaracoes test(). Alguns testes de API sao gerados em laco, por isso 43
 * declaracoes cobrem 53 casos; a contagem exata de casos aparece no relatorio
 * do runner. Remover um teste sem atualizar o plano (data/plano-de-testes.js)
 * reprova este passo, o que obriga a remocao a passar pela politica de
 * manutencao (docs/tas.md, secao 9).
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { PLANEJADO } = require('../data/plano-de-testes');

const raiz = path.resolve(__dirname, '..');
const esperado = {
  unidade: { pasta: 'tests/unidade', sufixo: '.test.js', arquivos: 2, declaracoesMinimas: 6 },
  api: { pasta: 'tests/api', sufixo: '.test.js', arquivos: 8, declaracoesMinimas: 43 },
  e2e: { pasta: 'tests/e2e', sufixo: '.test.js', arquivos: 11, declaracoesMinimas: 11 },
  app: { pasta: 'tests/app', sufixo: '.app.js', arquivos: 1, declaracoesMinimas: 1 },
};

function listarTestes(pasta, sufixo) {
  return fs.readdirSync(path.join(raiz, pasta))
    .filter(nome => nome.endsWith(sufixo))
    .sort();
}

function contarCasos(arquivo) {
  const conteudo = fs.readFileSync(arquivo, 'utf8');
  return (conteudo.match(/\b(?:test|it)\s*\(/g) || []).length;
}

const resumo = [];
for (const [nivel, regra] of Object.entries(esperado)) {
  const arquivos = listarTestes(regra.pasta, regra.sufixo);
  const testes = arquivos.reduce(
    (total, nome) => total + contarCasos(path.join(raiz, regra.pasta, nome)),
    0,
  );
  resumo.push(`${nivel}: ${arquivos.length} arquivo(s), ${testes} declaracao(oes), ${PLANEJADO[nivel]} caso(s) planejado(s)`);
  if (arquivos.length !== regra.arquivos || testes < regra.declaracoesMinimas) {
    console.error(
      `Cobertura divergente em ${nivel}: esperado ${regra.arquivos} arquivo(s) e pelo ` +
      `menos ${regra.declaracoesMinimas} declaracao(oes), encontrado ${arquivos.length} e ${testes}.`,
    );
    process.exitCode = 1;
  }
}

const total = Object.values(PLANEJADO).reduce((s, n) => s + n, 0);
console.log('Cobertura do backlog automatizado:');
console.log(resumo.join('\n'));
console.log(
  `Total planejado: ${total} casos (${PLANEJADO.unidade} unitarios, ${PLANEJADO.api} de API, ` +
  `${PLANEJADO.e2e} jornadas E2E pela API e ${PLANEJADO.app} E2E pela interface do app).`,
);
