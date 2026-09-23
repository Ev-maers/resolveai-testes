/**
 * scripts/rodar-tudo.js - Um comando so: sobe o alvo, espera responder,
 * roda a suite inteira, desliga o alvo.
 *
 * Sem este script, rodar a suite contra o duplo de referencia exige dois
 * terminais (um pro servidor, outro pros testes) e lembrar da ordem certa.
 * Este script faz os dois passos em sequencia, no mesmo terminal, e garante
 * que o servidor local nao fica pendurado depois que os testes terminam -
 * com falha ou sem falha.
 *
 * So sobe o duplo de referencia quando BASE_URL nao foi definido pelo
 * ambiente. Contra o back-end real, quem sobe o servidor e outro repositorio
 * - este script nao tenta substituir isso, so roda a suite contra o alvo
 * que voce ja apontou.
 *
 * Uso:
 *   npm run test:tudo                  contra o duplo de referencia local
 *   BASE_URL=http://localhost:5000 npm run test:tudo   contra outro alvo
 *   npm run test:tudo -- --relatorio   tambem grava evidencias/resultado.xml
 */

'use strict';

const { spawn } = require('node:child_process');
const path = require('node:path');

const RAIZ = path.resolve(__dirname, '..');
const PORTA = Number(process.env.PORT || 5000);
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORTA}`;
const ALVO_E_LOCAL = !process.env.BASE_URL;

const esperar = ms => new Promise(r => setTimeout(r, ms));

async function subirServidorLocal() {
  console.log(`-> subindo o duplo de referencia em ${BASE_URL} ...`);
  const servidor = spawn(process.execPath, ['sut-referencia/server.js'], {
    cwd: RAIZ,
    env: { ...process.env, PORT: String(PORTA) },
    stdio: 'inherit',
  });

  servidor.on('error', erro => {
    throw new Error(`nao foi possivel iniciar o duplo de referencia: ${erro.message}`);
  });

  for (let i = 0; i < 40; i++) {
    try {
      await fetch(`${BASE_URL}/api/demandas`, { signal: AbortSignal.timeout(500) });
      console.log('-> alvo respondeu.\n');
      return servidor;
    } catch {
      await esperar(150);
    }
  }

  servidor.kill();
  throw new Error(
    `o duplo de referencia nao respondeu em ${BASE_URL} depois de 6s. ` +
      `A porta ${PORTA} pode estar em uso por outro processo (no macOS, o ` +
      'AirPlay Receiver costuma usar a porta 5000) - tente PORT=5001 npm run test:tudo.',
  );
}

function executarSuite() {
  const comRelatorio = process.argv.includes('--relatorio');
  const args = comRelatorio
    ? [
        '--test',
        '--test-reporter=spec',
        '--test-reporter-destination=stdout',
        '--test-reporter=junit',
        '--test-reporter-destination=evidencias/resultado.xml',
        'tests/**/*.test.js',
      ]
    : ['--test', 'tests/**/*.test.js'];

  return new Promise(resolve => {
    const proc = spawn(process.execPath, args, {
      cwd: RAIZ,
      env: { ...process.env, BASE_URL },
      stdio: 'inherit',
    });
    proc.on('close', codigo => resolve(codigo ?? 1));
  });
}

async function main() {
  if (!ALVO_E_LOCAL) {
    console.log(`-> BASE_URL definido pelo ambiente (${BASE_URL}) - nao vou subir nenhum servidor local.\n`);
  }

  const servidor = ALVO_E_LOCAL ? await subirServidorLocal() : null;

  let codigo = 1;
  try {
    codigo = await executarSuite();
  } finally {
    if (servidor) {
      servidor.kill();
      await esperar(200);
    }
  }

  process.exitCode = codigo;
}

main().catch(erro => {
  console.error(erro.message);
  process.exitCode = 1;
});
