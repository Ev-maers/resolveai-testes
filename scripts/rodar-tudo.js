/**
 * scripts/rodar-tudo.js - Verificacao rapida da propria suite contra o duplo
 * de referencia, num comando so: sobe o duplo, espera responder, roda a suite
 * inteira e desliga o duplo, com falha ou sem falha.
 *
 * O duplo NAO e o produto: verde aqui prova que a suite funciona, e nao que o
 * Projeto Integrador funciona. Para testar o produto, use
 * `npm run test:backend-real` (scripts/backend-real.js), que e o que a esteira faz.
 *
 * So sobe o duplo quando BASE_URL nao foi definido pelo ambiente.
 *
 * Uso:
 *   npm run test:tudo                  contra o duplo de referencia local
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
