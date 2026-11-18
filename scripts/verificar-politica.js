/**
 * scripts/verificar-politica.js - Verifica, a cada push, as regras da politica
 * de manutencao que podem ser conferidas no proprio codigo (docs/tas.md, sec. 9).
 *
 * Reprova (codigo de saida 1) quando encontra:
 *   P1. teste sem rastreabilidade: o nome nao comeca por U<n>, HU-<nn>, CT ou E2E-<nn>;
 *   P2. espera por tempo fixo dentro de teste ou da logica de negocio do teste;
 *   P3. reexecucao automatica de teste (retry) em fluxo, workflow ou package.json;
 *   P4. continue-on-error em qualquer workflow: um estagio que nunca reprova
 *       nao informa nada;
 *   P5. registro de defeitos conhecidos invalido;
 *   P6. plano de testes reduzido sem decisao registrada (remocao de teste).
 *
 * Prazo vencido de defeito conhecido nao bloqueia: vira aviso, porque o prazo e
 * do back-end e nao deve travar o trabalho da TAS. A cobranca e feita pela
 * rotina de manutencao (scripts/manutencao.js), que marca a issue do defeito.
 *
 * Uso: node scripts/verificar-politica.js
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const { validarRegistro } = require('./quality-gate');
const { REGISTRO } = require('../data/defeitos-conhecidos');
const { PLANEJADO, HISTORICO_DO_PLANO } = require('../data/plano-de-testes');

const RAIZ = path.resolve(__dirname, '..');
const PREFIXO = /^(U\d+|HU-\d{2}|CT|E2E-\d{2})\b/;

function listar(pasta, filtro) {
  const raiz = path.join(RAIZ, pasta);
  if (!fs.existsSync(raiz)) return [];
  const saida = [];
  for (const item of fs.readdirSync(raiz, { withFileTypes: true })) {
    const relativo = path.join(pasta, item.name);
    if (item.isDirectory()) saida.push(...listar(relativo, filtro));
    else if (filtro(item.name)) saida.push(relativo);
  }
  return saida;
}

const ler = arquivo => fs.readFileSync(path.join(RAIZ, arquivo), 'utf8');
const arquivosDeTeste = () => listar('tests', n => n.endsWith('.test.js') || n.endsWith('.app.js'));

/** Nomes declarados em test(), por arquivo (so a parte literal do inicio). */
function nomesDeTeste() {
  const nomes = [];
  for (const arquivo of arquivosDeTeste()) {
    for (const [, nome] of ler(arquivo).matchAll(/\btest\(\s*['`"]([^'`"]*)/g)) nomes.push({ arquivo, nome });
  }
  return nomes;
}

/** Aplica P1 a P6 e devolve { problemas, avisos }. */
function verificar(hoje = new Date().toISOString().slice(0, 10)) {
  const problemas = [];
  const avisos = [];

  // P1. Rastreabilidade: o nome do teste e a primeira coisa lida quando ele falha.
  for (const { arquivo, nome } of nomesDeTeste()) {
    if (!PREFIXO.test(nome)) problemas.push(`P1 ${arquivo}: teste sem prefixo rastreavel: "${nome.slice(0, 60)}"`);
  }

  // P2. Espera por tempo fixo: passa na maquina rapida e falha na esteira lenta.
  for (const arquivo of [...arquivosDeTeste(), ...listar('api', n => n.endsWith('.js'))]) {
    ler(arquivo).split('\n').forEach((linha, i) => {
      const comentario = /^\s*(\*|\/\/)/.test(linha);
      if (!comentario && /\bsetTimeout\s*\(|\bsleep\s*\(/.test(linha)) {
        problemas.push(`P2 ${arquivo}:${i + 1}: espera por tempo fixo; espere por condicao`);
      }
    });
  }
  for (const arquivo of listar('tests', n => n.endsWith('.yaml'))) {
    const texto = ler(arquivo);
    if (/^\s*-\s*waitFor\w*:\s*\d+/m.test(texto) || /^\s*-\s*wait:\s/m.test(texto)) {
      problemas.push(`P2 ${arquivo}: espera fixa no fluxo; use extendedWaitUntil`);
    }
  }

  // P3. Reexecucao automatica transforma a esteira num gerador de falso verde.
  const configuracoes = [...listar('.github', n => n.endsWith('.yml')), 'package.json'];
  for (const arquivo of [...configuracoes, ...listar('tests', n => n.endsWith('.yaml'))]) {
    if (/--test-rerun|--retries|\bretries:|^\s*-\s*retry:/m.test(ler(arquivo))) {
      problemas.push(`P3 ${arquivo}: reexecucao automatica de teste e proibida`);
    }
  }

  // P4. continue-on-error esconde o vermelho.
  for (const arquivo of listar('.github', n => n.endsWith('.yml'))) {
    ler(arquivo).split('\n').forEach((linha, i) => {
      if (/^\s*continue-on-error:\s*true/.test(linha)) problemas.push(`P4 ${arquivo}:${i + 1}: continue-on-error e proibido`);
    });
  }

  // P5. Registro de defeitos conhecidos.
  for (const erro of validarRegistro()) problemas.push(`P5 registro: ${erro}`);
  for (const d of REGISTRO) {
    if (d.prazo < hoje) avisos.push(`P5 ${d.id} (${d.severidade}) passou do prazo de ${d.prazo}: cobrar o encaminhamento (${d.encaminhamento})`);
  }

  // P6. O plano so diminui com decisao registrada (quem, quando, por que, risco).
  const total = Object.values(PLANEJADO).reduce((s, n) => s + n, 0);
  const ultimo = HISTORICO_DO_PLANO[HISTORICO_DO_PLANO.length - 1];
  if (!ultimo || ultimo.total !== total) {
    problemas.push(`P6 data/plano-de-testes.js: o plano soma ${total} casos, mas o historico do plano termina em ${ultimo?.total}; registre a mudanca`);
  }
  HISTORICO_DO_PLANO.forEach((entrada, i) => {
    const anterior = HISTORICO_DO_PLANO[i - 1];
    if (!entrada.data || !entrada.decisao || !entrada.registro) problemas.push(`P6 historico do plano, item ${i + 1}: faltam data, decisao ou registro`);
    if (anterior && entrada.total < anterior.total && !entrada.riscoAssumido) {
      problemas.push(`P6 historico do plano, ${entrada.data}: o plano diminuiu sem o risco assumido registrado`);
    }
  });

  return { problemas, avisos };
}

module.exports = { verificar, nomesDeTeste, PREFIXO };

if (require.main === module) {
  const { problemas, avisos } = verificar();
  console.log('Politica de manutencao da TAS (docs/tas.md, secao 9):');
  console.log(`  ${arquivosDeTeste().length} arquivo(s) de teste, ${REGISTRO.length} defeito(s) conhecido(s) registrado(s)`);
  for (const a of avisos) console.log(`::warning title=Politica de manutencao::${a}`);
  if (problemas.length) {
    for (const p of problemas) console.log(`::error title=Politica de manutencao::${p}`);
    console.error(`${problemas.length} violacao(oes) da politica.`);
    process.exitCode = 1;
  } else {
    console.log('  nenhuma violacao (P1 a P6).');
  }
}
