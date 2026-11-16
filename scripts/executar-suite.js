/**
 * scripts/executar-suite.js - Executa um nivel da suite e aplica o quality gate.
 *
 * E o comando que cada estagio da esteira usa. Ele:
 *   1. roda o node --test com dois relatores: spec (log legivel) e JUnit
 *      (legivel por maquina), e grava o log ao lado do XML;
 *   2. aplica o quality gate (scripts/quality-gate.js) ao resultado;
 *   3. termina com codigo 1 se o gate reprovar, e 0 se aprovar.
 *
 * Por que nao basta o codigo de saida do node --test: contra o back-end real,
 * os defeitos conhecidos do produto reprovam testes em toda execucao. O gate
 * separa o que e conhecido e rastreado (registro em data/defeitos-conhecidos.js,
 * com issue e prazo) do que e falha nova. A falha nova reprova o estagio; o
 * defeito conhecido continua reprovado no relatorio, mas nao trava o merge.
 * Nao ha continue-on-error nem reexecucao automatica.
 *
 * Uso:
 *   node scripts/executar-suite.js --nivel api --junit evidencias/api.xml "tests/api/**\/*.test.js"
 *   node scripts/executar-suite.js --nivel regressao --junit evidencias/regressao.xml --completo "tests/**\/*.test.js"
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

const { lerRelatorio } = require('./junit');
const { avaliar, descrever, anotar } = require('./quality-gate');

const RAIZ = path.resolve(__dirname, '..');

function lerArgs(argv) {
  const opcoes = { nivel: 'suite', junit: null, completo: false, padroes: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--nivel') opcoes.nivel = argv[++i];
    else if (a === '--junit') opcoes.junit = argv[++i];
    else if (a === '--completo') opcoes.completo = true;
    else opcoes.padroes.push(a);
  }
  if (!opcoes.junit) opcoes.junit = `evidencias/${opcoes.nivel}.xml`;
  return opcoes;
}

function executar({ junit, padroes }) {
  const xml = path.resolve(RAIZ, junit);
  const log = xml.replace(/\.xml$/, '.log');
  fs.mkdirSync(path.dirname(xml), { recursive: true });
  const saidaLog = fs.createWriteStream(log);

  const args = [
    '--test',
    '--test-reporter=spec',
    '--test-reporter-destination=stdout',
    '--test-reporter=junit',
    `--test-reporter-destination=${xml}`,
    ...padroes,
  ];

  return new Promise(resolve => {
    const proc = spawn(process.execPath, args, { cwd: RAIZ, env: process.env });
    for (const fluxo of [proc.stdout, proc.stderr]) {
      fluxo.on('data', parte => {
        process.stdout.write(parte);
        saidaLog.write(parte);
      });
    }
    proc.on('close', codigo => saidaLog.end(() => resolve({ codigo: codigo ?? 1, xml })));
  });
}

async function main() {
  const opcoes = lerArgs(process.argv.slice(2));
  if (opcoes.padroes.length === 0) throw new Error('informe ao menos um arquivo ou padrao de teste');

  const { codigo, xml } = await executar(opcoes);
  if (!fs.existsSync(xml)) {
    console.error(`::error title=Execucao::o runner terminou com codigo ${codigo} sem gerar ${opcoes.junit}`);
    process.exitCode = 1;
    return;
  }

  const { casos } = lerRelatorio(xml);
  const resultado = avaliar({ casos, completo: opcoes.completo });
  console.log(`\n${descrever(resultado)}`);
  anotar(resultado);
  fs.writeFileSync(xml.replace(/\.xml$/, '.gate.json'), JSON.stringify({ nivel: opcoes.nivel, ...resultado }, null, 2));
  process.exitCode = resultado.bloqueia ? 1 : 0;
}

main().catch(erro => {
  console.error(`::error title=Execucao::${erro.message}`);
  process.exitCode = 1;
});
