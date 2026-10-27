'use strict';

const fs = require('node:fs');
const path = require('node:path');

const raiz = path.resolve(__dirname, '..');
const esperado = {
  unidade: { pasta: 'tests/unidade', arquivos: 1, declaracoesMinimas: 5 },
  api: { pasta: 'tests/api', arquivos: 8, declaracoesMinimas: 43 },
  e2e: { pasta: 'tests/e2e', arquivos: 11, declaracoesMinimas: 11 },
};

function listarTestes(pasta) {
  return fs.readdirSync(path.join(raiz, pasta))
    .filter(nome => nome.endsWith('.test.js'))
    .sort();
}

function contarCasos(arquivo) {
  const conteudo = fs.readFileSync(arquivo, 'utf8');
  return (conteudo.match(/\b(?:test|it)\s*\(/g) || []).length;
}

const resumo = [];
for (const [nivel, regra] of Object.entries(esperado)) {
  const arquivos = listarTestes(regra.pasta);
  const testes = arquivos.reduce(
    (total, nome) => total + contarCasos(path.join(raiz, regra.pasta, nome)),
    0,
  );
  resumo.push(`${nivel}: ${arquivos.length} arquivo(s), ${testes} declaracao(oes)`);
  if (arquivos.length !== regra.arquivos || testes < regra.declaracoesMinimas) {
    console.error(
      `Cobertura divergente em ${nivel}: esperado ${regra.arquivos} arquivo(s) e pelo ` +
      `menos ${regra.declaracoesMinimas} declaracao(oes), encontrado ${arquivos.length} e ${testes}.`,
    );
    process.exitCode = 1;
  }
}

console.log('Cobertura do backlog automatizado:');
console.log(resumo.join('\n'));
console.log('Total planejado em execucao: 69 casos (5 unitarios, 53 API, 11 E2E).');
