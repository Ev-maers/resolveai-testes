/**
 * scripts/anotar-falhas.js - Publica cada teste reprovado como anotacao do job.
 *
 * O log de um job so e legivel por quem esta logado no GitHub. Anotacoes
 * aparecem na pagina da execucao e tambem na API publica de check-runs, entao
 * servem como resumo legivel por maquina do que falhou e por que.
 *
 * Le os relatorios JUnit em evidencias/*.xml e imprime comandos de workflow
 * (::error) no stdout. Sem dependencias.
 *
 * Uso: node scripts/anotar-falhas.js [pasta]
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const pasta = process.argv[2] || 'evidencias';
const LIMITE_INDIVIDUAIS = 8;
const LIMITE_MENSAGEM = 300;
const LIMITE_RESUMO = 30000;

const decodificar = s =>
  s
    .replace(/&#10;/g, '\n')
    .replace(/&#13;/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');

const decodificarTudo = s => decodificar(decodificar(s));

const dado = s => s.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
const titulo = s => dado(s).replace(/:/g, '%3A').replace(/,/g, '%2C');
const curto = (s, n) => (s.length > n ? `${s.slice(0, n - 3)}...` : s);

if (!fs.existsSync(pasta)) {
  console.log(`::notice::Nenhuma pasta ${pasta} para anotar.`);
  process.exit(0);
}

const falhas = [];
let total = 0;

for (const arquivo of fs.readdirSync(pasta).filter(f => f.endsWith('.xml')).sort()) {
  const xml = fs.readFileSync(path.join(pasta, arquivo), 'utf8');
  for (const [, nome, corpo] of xml.matchAll(/<testcase\s+name="([^"]*)"[^>]*?(?:\/>|>([\s\S]*?)<\/testcase>)/g)) {
    total++;
    if (!corpo) continue;
    const falha = /<failure[^>]*?message="([^"]*)"/.exec(corpo);
    if (!falha) continue;
    const motivo = decodificarTudo(falha[1]).replace(/\s+/g, ' ').trim();
    falhas.push({ arquivo, nome: decodificarTudo(nome), motivo });
  }
}

if (falhas.length === 0) {
  console.log(`::notice title=Testes::${total} casos, nenhuma falha.`);
  process.exit(0);
}

for (const f of falhas.slice(0, LIMITE_INDIVIDUAIS)) {
  console.log(`::error title=${titulo(curto(f.nome, 100))}::${dado(curto(f.motivo, LIMITE_MENSAGEM))}`);
}

const linhas = falhas.map(f => `[${f.arquivo}] ${f.nome} => ${curto(f.motivo, LIMITE_MENSAGEM)}`);
console.log(
  `::error title=${titulo(`Resumo: ${falhas.length} de ${total} reprovados`)}::${dado(curto(linhas.join('\n'), LIMITE_RESUMO))}`,
);
