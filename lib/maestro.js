/**
 * lib/maestro.js - Biblioteca base. Adaptacao ao SUT pela interface do app.
 *
 * Sabe: executar um fluxo do Maestro, passar variaveis e falar com o emulador
 * pelo adb.
 * Nao sabe: o que e uma demanda ou uma notificacao.
 * Nunca contem: assercoes. Devolve o codigo de saida e o log do fluxo; quem
 * decide se aquilo e falha e o teste.
 *
 * O Maestro e uma ferramenta de linha de comando, e nao uma dependencia npm:
 * a suite continua sem nenhum pacote instalado. Na esteira ele e instalado
 * pelo workflow (.github/workflows/e2e-app.yml).
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { APP } = require('./config');

const RAIZ = path.resolve(__dirname, '..');

/**
 * Executa um fluxo YAML do Maestro.
 * @param {string} arquivo   caminho do fluxo, relativo a raiz do repositorio
 * @param {object} variaveis viram `-e CHAVE=valor` e sao lidas no fluxo como ${CHAVE}
 * @returns {{codigo:number, saida:string, comando:string}}
 */
function executarFluxo(arquivo, variaveis = {}) {
  const pastaSaida = path.resolve(RAIZ, APP.pastaEvidencias);
  fs.mkdirSync(pastaSaida, { recursive: true });

  const args = ['test', path.resolve(RAIZ, arquivo)];
  for (const [chave, valor] of Object.entries({ APP_URL: APP.url, ...variaveis })) {
    args.push('-e', `${chave}=${valor}`);
  }

  // cwd = pasta de evidencias: e ali que o takeScreenshot do fluxo grava as imagens.
  const r = spawnSync(APP.maestro, args, { cwd: pastaSaida, encoding: 'utf8', timeout: 15 * 60 * 1000 });
  if (r.error) {
    return {
      codigo: 127,
      saida: `Nao foi possivel executar o Maestro (${APP.maestro}): ${r.error.message}. ` +
        'Ele esta instalado e no PATH? Ver docs/tutorial-execucao.md.',
      comando: `${APP.maestro} ${args.join(' ')}`,
    };
  }

  const saida = `${r.stdout || ''}${r.stderr || ''}`;
  fs.appendFileSync(path.join(pastaSaida, 'maestro.log'), `\n### ${arquivo}\n${saida}`);
  return { codigo: r.status ?? 1, saida, comando: `${APP.maestro} ${args.join(' ')}` };
}

/** Executa um comando adb no emulador (ex.: abrir a gaveta de notificacoes). */
function adb(...args) {
  const r = spawnSync(APP.adb, args, { encoding: 'utf8', timeout: 60 * 1000 });
  return { codigo: r.status ?? 1, saida: `${r.stdout || ''}${r.stderr || ''}`.trim() };
}

module.exports = { executarFluxo, adb };
