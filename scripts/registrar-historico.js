/**
 * scripts/registrar-historico.js - Guarda a execucao de hoje para a tendencia de amanha.
 *
 * O historico vive na branch `metricas` do repositorio, em um arquivo JSON
 * Lines (uma linha por execucao). A pipeline faz checkout dessa branch numa
 * pasta, este script acrescenta a linha e copia os relatorios mais recentes,
 * e o workflow faz commit e push. Nada manual.
 *
 * Por que uma branch e nao a main: a main e protegida (quality gate) e nao
 * deve receber commit de robo. A branch `metricas` e so dados.
 *
 * Uso: node scripts/registrar-historico.js --pasta metricas-historico [--sufixo backend-real]
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const RAIZ = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const opcao = (nome, padrao) => {
  const i = args.indexOf(nome);
  return i >= 0 && args[i + 1] ? args[i + 1] : padrao;
};

const pasta = path.resolve(RAIZ, opcao('--pasta', 'metricas-historico'));
const sufixo = opcao('--sufixo', '');
const nome = base => (sufixo ? `${base}-${sufixo}` : base);

const metricas = JSON.parse(fs.readFileSync(path.join(RAIZ, 'evidencias', 'metricas.json'), 'utf8'));
const { execucao, total, falhas } = metricas;

const linha = {
  dataHora: execucao.dataHora,
  runId: execucao.runId,
  runNumber: execucao.runNumber,
  url: execucao.url,
  evento: execucao.evento,
  branch: execucao.branch,
  alvo: execucao.alvo,
  verde: total.reprovados === 0 && total.total > 0,
  total: total.total,
  aprovados: total.aprovados,
  reprovados: total.reprovados,
  pulados: total.pulados,
  taxaDeAprovacao: total.taxaDeAprovacao,
  duracaoMs: total.duracaoMs,
  falhas: falhas.map(f => f.nome),
  detalhado: true,
};

fs.mkdirSync(pasta, { recursive: true });
const historico = path.join(pasta, `${nome('historico')}.jsonl`);
fs.appendFileSync(historico, JSON.stringify(linha) + '\n');

// Os relatorios mais recentes ficam sempre com o mesmo nome, para ter um link fixo.
const copias = [
  ['relatorio-tecnico.html', `${nome('relatorio-tecnico')}.html`],
  ['relatorio-negocio.html', `${nome('relatorio-negocio')}.html`],
  ['metricas.json', `${nome('ultima-execucao')}.json`],
];
for (const [origem, destino] of copias) {
  const de = path.join(RAIZ, 'evidencias', origem);
  if (fs.existsSync(de)) fs.copyFileSync(de, path.join(pasta, destino));
}

console.log(`Historico atualizado: ${path.relative(RAIZ, historico)} (+1 linha, execucao #${execucao.runNumber ?? 'local'})`);
