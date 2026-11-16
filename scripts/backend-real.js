/**
 * scripts/backend-real.js - Roda a suite contra o back-end REAL, num comando so.
 *
 * Faz no computador o mesmo que a esteira faz (.github/actions/backend-real):
 *   1. clona (ou atualiza) ndrfelipe/smart-city em .backend-real/;
 *   2. cria um ambiente Python e instala as dependencias (sem psycopg2: usa SQLite);
 *   3. cria um banco novo e semeia os quatro usuarios de teste;
 *   4. sobe o Flask, espera responder e roda a suite pelo quality gate;
 *   5. desliga o servidor, com falha ou sem falha.
 *
 * Exige git e Python 3.10 ou mais.
 *
 * Uso:
 *   npm run test:backend-real                                  suite inteira
 *   npm run qualidade                                          suite + metricas + relatorios HTML
 *   npm run test:backend-real -- "tests/e2e/e2e01-*.test.js"   so uma parte
 *   PORT=5050 npm run test:backend-real                        outra porta
 *   BACKEND_REF=<branch ou commit> npm run test:backend-real   outra versao do back-end
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');

const RAIZ = path.resolve(__dirname, '..');
const PASTA = path.join(RAIZ, '.backend-real');
const BACKEND = path.join(PASTA, 'backend');
const REPOSITORIO = 'https://github.com/ndrfelipe/smart-city.git';
const PORTA = Number(process.env.PORT || 5000);
const BASE_URL = `http://127.0.0.1:${PORTA}`;
const WINDOWS = process.platform === 'win32';

const esperar = ms => new Promise(r => setTimeout(r, ms));

function rodar(comando, args, opcoes = {}) {
  console.log(`-> ${comando} ${args.join(' ')}`);
  const r = spawnSync(comando, args, { stdio: 'inherit', ...opcoes });
  if (r.error) throw new Error(`${comando}: ${r.error.message}`);
  if (r.status !== 0) throw new Error(`${comando} ${args[0]} terminou com codigo ${r.status}`);
}

function pythonDoSistema() {
  for (const candidato of WINDOWS ? ['python', 'py'] : ['python3', 'python']) {
    const r = spawnSync(candidato, ['-c', 'import sys; print(sys.version_info >= (3, 10))'], { encoding: 'utf8' });
    if (r.status === 0 && r.stdout.trim() === 'True') return candidato;
  }
  throw new Error('Python 3.10 ou mais nao encontrado no PATH (o back-end usa type hints "str | None").');
}

function prepararBackend() {
  if (!fs.existsSync(path.join(PASTA, '.git'))) {
    rodar('git', ['clone', '--quiet', REPOSITORIO, PASTA]);
  } else {
    rodar('git', ['-C', PASTA, 'fetch', '--quiet', 'origin']);
  }
  const ref = process.env.BACKEND_REF || 'origin/HEAD';
  rodar('git', ['-C', PASTA, 'checkout', '--quiet', '--detach', ref]);

  const venv = path.join(PASTA, '.venv');
  const python = path.join(venv, WINDOWS ? 'Scripts/python.exe' : 'bin/python');
  if (!fs.existsSync(python)) rodar(pythonDoSistema(), ['-m', 'venv', venv]);

  const requisitos = fs
    .readFileSync(path.join(BACKEND, 'requirements.txt'), 'utf8')
    .split(/\r?\n/)
    .filter(l => l.trim() && !/^psycopg2/i.test(l.trim()));
  const arquivo = path.join(PASTA, 'requirements-sem-postgres.txt');
  fs.writeFileSync(arquivo, requisitos.join('\n'));
  rodar(python, ['-m', 'pip', 'install', '--quiet', '--disable-pip-version-check', '-r', arquivo]);
  return python;
}

function ambiente() {
  const banco = path.join(PASTA, 'teste.db');
  fs.rmSync(banco, { force: true });
  return {
    ...process.env,
    DATABASE_URL: `sqlite:///${banco.replace(/\\/g, '/')}`,
    SECRET_KEY: 'chave-de-teste-nao-usar-em-producao',
    PUSH_NOTIFICATIONS_DISABLED: '1',
    PYTHONPATH: '.',
    PYTHONIOENCODING: 'utf-8',
  };
}

/** Algo ja responde na porta? Entao a suite falaria com ele, e nao com o back-end novo. */
async function portaOcupada() {
  try {
    await fetch(`${BASE_URL}/health`, { signal: AbortSignal.timeout(500) });
    return true;
  } catch {
    return false;
  }
}

/**
 * Encerra o servidor. No Windows, o python.exe de um venv e um lancador que
 * abre o interpretador como processo filho; matar so o lancador deixaria o
 * Flask vivo, ocupando a porta. Por isso la a arvore inteira e encerrada.
 */
function encerrar(servidor) {
  if (WINDOWS) spawnSync('taskkill', ['/pid', String(servidor.pid), '/T', '/F'], { stdio: 'ignore' });
  else servidor.kill();
}

async function subir(python, env) {
  if (await portaOcupada()) {
    throw new Error(
      `Ja existe um servidor respondendo em ${BASE_URL}. Desligue-o ou use outra porta ` +
        '(PORT=5050 npm run test:backend-real), para a suite nao falar com o alvo errado.',
    );
  }
  rodar(python, [path.join(RAIZ, 'scripts', 'semear-backend-real.py')], { cwd: BACKEND, env });
  const log = fs.openSync(path.join(PASTA, 'backend.log'), 'w');
  const servidor = spawn(
    python,
    ['-c', `from config.config import create_app; create_app().run(host='127.0.0.1', port=${PORTA})`],
    { cwd: BACKEND, env, stdio: ['ignore', log, log] },
  );
  for (let i = 0; i < 60; i++) {
    try {
      await fetch(`${BASE_URL}/health`, { signal: AbortSignal.timeout(500) });
      console.log(`-> back-end real respondeu em ${BASE_URL}\n`);
      return servidor;
    } catch {
      await esperar(500);
    }
  }
  encerrar(servidor);
  throw new Error(`o back-end nao respondeu em ${BASE_URL} em 30s; veja .backend-real/backend.log`);
}

function executarSuite(padroes) {
  const args = [
    path.join(RAIZ, 'scripts', 'executar-suite.js'),
    '--nivel', 'backend-real',
    '--junit', 'evidencias/resultado.xml',
    ...(padroes.length ? padroes : ['tests/**/*.test.js']),
  ];
  return new Promise(resolve => {
    const env = { ...process.env, BASE_URL, ALVO_DOS_TESTES: 'back-end real' };
    spawn(process.execPath, args, { cwd: RAIZ, env, stdio: 'inherit' }).on('close', c => resolve(c ?? 1));
  });
}

/** --qualidade: metricas e relatorios HTML, como a esteira gera (sem abrir issues). */
function gerarRelatorios() {
  const env = { ...process.env, BASE_URL, ALVO_DOS_TESTES: 'back-end real' };
  for (const [script, args] of [['scripts/metricas.js', ['evidencias/resultado.xml']], ['scripts/relatorios.js', []]]) {
    spawnSync(process.execPath, [path.join(RAIZ, script), ...args], { cwd: RAIZ, env, stdio: 'inherit' });
  }
  console.log('\nRelatorios: evidencias/relatorio-tecnico.html e evidencias/relatorio-negocio.html');
}

async function main() {
  const args = process.argv.slice(2);
  const comQualidade = args.includes('--qualidade');
  const padroes = args.filter(a => a !== '--qualidade');

  const python = prepararBackend();
  const servidor = await subir(python, ambiente());
  let codigo = 1;
  try {
    codigo = await executarSuite(padroes);
  } finally {
    encerrar(servidor);
  }
  if (comQualidade) gerarRelatorios();
  process.exitCode = codigo;
}

main().catch(erro => {
  console.error(erro.message);
  process.exitCode = 1;
});
