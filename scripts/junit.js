/**
 * scripts/junit.js - Le os relatorios JUnit que o runner do Node grava.
 *
 * E a unica porta de entrada dos resultados para metricas, issues e
 * relatorios: se o formato do runner mudar, muda-se aqui, em um lugar.
 *
 * Sem dependencias. O XML do Node e simples o bastante para expressoes
 * regulares, com um cuidado: valores de atributo podem conter ">" literal
 * (o runner so escapa "<" e aspas), entao o parser le atributo a atributo
 * respeitando as aspas, em vez de cortar no primeiro ">".
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const decodificar = s =>
  s
    .replace(/&#10;/g, '\n')
    .replace(/&#13;/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');

// O runner escapa duas vezes o nome do teste (&amp;quot;), por isso duas passagens.
const decodificarTudo = s => decodificar(decodificar(s));

// Atributos de uma tag: sequencia de "chave=valor" onde o valor fica entre aspas.
const ATRIBUTOS = /(\w+)="([^"]*)"/g;
const TESTCASE = /<testcase\s+((?:[^>"]|"[^"]*")*?)(?:\/>|>([\s\S]*?)<\/testcase>)/g;
const FAILURE = /<failure((?:[^>"]|"[^"]*")*)>/;
const SKIPPED = /<skipped((?:[^>"]|"[^"]*")*)\/?>/;

function lerAtributos(texto) {
  const atributos = {};
  for (const [, chave, valor] of texto.matchAll(ATRIBUTOS)) atributos[chave] = decodificarTudo(valor);
  return atributos;
}

/**
 * @returns {{casos: Array<{nome:string, status:'aprovado'|'reprovado'|'pulado', mensagem:string, tempoMs:number, arquivo:string, origem:string}>, duracaoMs: number|null}}
 */
function lerRelatorio(caminho) {
  const xml = fs.readFileSync(caminho, 'utf8');
  const origem = path.basename(caminho);
  const casos = [];

  for (const [, atributosBrutos, corpo] of xml.matchAll(TESTCASE)) {
    const atributos = lerAtributos(atributosBrutos);
    let status = 'aprovado';
    let mensagem = '';

    if (corpo) {
      const falha = FAILURE.exec(corpo);
      const pulado = SKIPPED.exec(corpo);
      if (falha) {
        status = 'reprovado';
        mensagem = (lerAtributos(falha[1]).message || '').replace(/\s+/g, ' ').trim();
      } else if (pulado) {
        status = 'pulado';
        mensagem = (lerAtributos(pulado[1]).message || '').trim();
      }
    }

    casos.push({
      nome: atributos.name || '(sem nome)',
      status,
      mensagem,
      tempoMs: Math.round((Number(atributos.time) || 0) * 1000),
      arquivo: atributos.file || '',
      origem,
    });
  }

  const duracao = /<!-- duration_ms ([\d.]+) -->/.exec(xml);
  return { casos, duracaoMs: duracao ? Math.round(Number(duracao[1])) : null };
}

/** Le varios arquivos e devolve os casos concatenados, ignorando os que nao existem. */
function lerRelatorios(caminhos) {
  const casos = [];
  const lidos = [];
  let duracaoMs = 0;
  for (const caminho of caminhos) {
    if (!fs.existsSync(caminho)) continue;
    const relatorio = lerRelatorio(caminho);
    casos.push(...relatorio.casos);
    duracaoMs += relatorio.duracaoMs || 0;
    lidos.push(caminho);
  }
  return { casos, duracaoMs, lidos };
}

module.exports = { lerRelatorio, lerRelatorios, decodificarTudo };
