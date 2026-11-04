/**
 * scripts/relatorios.js - Gera os dois relatorios de qualidade a partir das metricas.
 *
 *   evidencias/relatorio-tecnico.html  para quem corrige: falhas, mensagens,
 *                                      tempo por nivel, issues, tendencia.
 *   evidencias/relatorio-negocio.html  para quem decide: semaforo, indicadores,
 *                                      riscos por historia, recomendacao.
 *   evidencias/resumo.md               resumo curto para a aba Summary do GitHub.
 *
 * Entrada: evidencias/metricas.json (scripts/metricas.js) e, se existir,
 * evidencias/issues.json (scripts/abrir-issues.js).
 *
 * HTML autocontido: CSS e SVG embutidos, nenhum recurso externo. Abre offline,
 * e anexa num e-mail, e nao depende de CDN que pode sumir.
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const RAIZ = path.resolve(__dirname, '..');
const PASTA = path.join(RAIZ, 'evidencias');

const metricas = JSON.parse(fs.readFileSync(path.join(PASTA, 'metricas.json'), 'utf8'));
const issues = fs.existsSync(path.join(PASTA, 'issues.json'))
  ? JSON.parse(fs.readFileSync(path.join(PASTA, 'issues.json'), 'utf8'))
  : { ativo: false, criadas: [], comentadas: [], fechadas: [], abertasAoFinal: [], avisos: [] };

const { execucao, total, niveis, cobertura, falhas, porHistoria, tendencia, maisLentos, planejado } = metricas;

// --- utilidades ---------------------------------------------------------------

const esc = s =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const pct = v => (v === null || v === undefined ? '-' : `${v}%`);
const ms = v => (v === null || v === undefined ? '-' : v >= 1000 ? `${(v / 1000).toFixed(1)} s` : `${v} ms`);
const dataLegivel = iso =>
  new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Recife', dateStyle: 'short', timeStyle: 'short' });
const NOME_DO_NIVEL = { unidade: 'Unitario', api: 'API', e2e: 'E2E (jornadas)' };
const link = (url, texto) => (url ? `<a href="${esc(url)}">${esc(texto)}</a>` : esc(texto));

// --- semaforo (regra em docs/metricas-de-qualidade.md) --------------------------

const falhasFuncionais = falhas.filter(f => f.tipo === 'funcional');
const historiasComFalha = porHistoria.filter(h => h.reprovados > 0);
const falhaEmImpactoAlto = historiasComFalha.some(h => h.impacto === 'Alto');
const estabilidade = tendencia.estabilidade.percentual;

let semaforo;
if (total.total === 0) {
  semaforo = { cor: 'vermelho', rotulo: 'SEM RESULTADO', frase: 'A pipeline nao produziu resultado de teste. Trate como falha ate que uma execucao conclua.' };
} else if (falhaEmImpactoAlto) {
  semaforo = { cor: 'vermelho', rotulo: 'ATENCAO', frase: `Ha ${falhasFuncionais.length} falha(s) em historia(s) de impacto alto. Nao entregar antes de classificar e corrigir.` };
} else if (falhasFuncionais.length > 0 || metricas.falhasDeAmbiente > 0) {
  semaforo = { cor: 'amarelo', rotulo: 'OBSERVAR', frase: falhasFuncionais.length ? `Ha ${falhasFuncionais.length} falha(s) em historia(s) de impacto medio.` : 'Houve falha de ambiente (o alvo nao respondeu). O resultado nao diz nada sobre o produto.' };
} else if (estabilidade !== null && estabilidade < 80) {
  semaforo = { cor: 'amarelo', rotulo: 'OBSERVAR', frase: `Esta execucao passou, mas so ${estabilidade}% das ultimas ${tendencia.estabilidade.janela} execucoes ficaram verdes.` };
} else if (cobertura.percentual < 100) {
  semaforo = { cor: 'amarelo', rotulo: 'OBSERVAR', frase: `Tudo que rodou passou, mas apenas ${cobertura.percentual}% do plano foi executado.` };
} else {
  semaforo = { cor: 'verde', rotulo: 'ESTAVEL', frase: 'Todos os casos planejados para este evento foram executados e aprovados.' };
}

const significadoDoAlvo =
  execucao.alvo === 'duplo de referencia'
    ? 'Esta execucao rodou contra o <strong>duplo de referencia</strong> (um servidor que implementa o contrato ao pe da letra). Verde aqui prova que a <strong>suite</strong> funciona e que o contrato continua fechado. <strong>Nao prova nada sobre o produto real.</strong> O retrato do produto vem do workflow <code>suite-contra-backend-real</code>.'
    : 'Esta execucao rodou contra o <strong>back-end real</strong> do Projeto Integrador. Cada falha aqui e um achado sobre o produto, ja classificado em <code>docs/relatorio-qualidade.md</code> como defeito, divergencia de contrato ou pendencia.';

// --- SVG da tendencia -------------------------------------------------------------

function svgTendencia(serie) {
  if (!serie.length) return '<p class="mudo">Sem historico disponivel nesta execucao.</p>';
  const largura = Math.max(320, serie.length * 22 + 40);
  const altura = 120;
  const base = 95;
  const barras = serie
    .map((p, i) => {
      const x = 30 + i * 22;
      const h = p.taxaDeAprovacao === null ? (p.verde ? 80 : 20) : Math.max(4, (p.taxaDeAprovacao / 100) * 80);
      const cor = p.verde ? '#2e8b57' : '#c0392b';
      const borda = p.atual ? ' stroke="#111" stroke-width="2"' : '';
      const titulo = `#${p.runNumber ?? '?'} ${p.verde ? 'verde' : 'vermelha'} ${p.taxaDeAprovacao !== null ? p.taxaDeAprovacao + '%' : ''} ${p.dataHora ? dataLegivel(p.dataHora) : ''}`;
      return `<g><title>${esc(titulo)}</title><rect x="${x}" y="${base - h}" width="16" height="${h}" fill="${cor}"${borda} rx="2"/></g>`;
    })
    .join('');
  return `<svg viewBox="0 0 ${largura} ${altura}" width="100%" height="${altura}" role="img" aria-label="Tendencia das execucoes">
  <line x1="28" y1="${base}" x2="${largura - 8}" y2="${base}" stroke="#999"/>
  <text x="2" y="20" font-size="10" fill="#666">100%</text>
  <text x="2" y="${base + 3}" font-size="10" fill="#666">0%</text>
  ${barras}
  <text x="30" y="${altura - 8}" font-size="10" fill="#666">mais antiga</text>
  <text x="${largura - 60}" y="${altura - 8}" font-size="10" fill="#666">mais recente</text>
</svg>`;
}

// --- CSS compartilhado --------------------------------------------------------------

const CSS = `
  :root { --verde:#2e8b57; --amarelo:#d4a017; --vermelho:#c0392b; --cinza:#666; --fundo:#fff; --borda:#ddd; }
  * { box-sizing: border-box; }
  body { font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 24px 16px; color: #1b1b1b; background: var(--fundo); line-height: 1.45; }
  main { max-width: 980px; margin: 0 auto; }
  h1 { font-size: 1.6rem; margin: 0 0 4px; }
  h2 { font-size: 1.15rem; margin: 32px 0 8px; border-bottom: 1px solid var(--borda); padding-bottom: 4px; }
  .sub { color: var(--cinza); margin: 0 0 16px; font-size: .95rem; }
  .semaforo { display: flex; align-items: center; gap: 16px; padding: 16px; border-radius: 10px; border: 2px solid; margin: 16px 0; }
  .semaforo .luz { width: 44px; height: 44px; border-radius: 50%; flex: none; }
  .verde { border-color: var(--verde); } .verde .luz { background: var(--verde); }
  .amarelo { border-color: var(--amarelo); } .amarelo .luz { background: var(--amarelo); }
  .vermelho { border-color: var(--vermelho); } .vermelho .luz { background: var(--vermelho); }
  .semaforo strong { font-size: 1.2rem; display: block; }
  .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; margin: 12px 0; }
  .card { border: 1px solid var(--borda); border-radius: 8px; padding: 12px; }
  .card .valor { font-size: 1.7rem; font-weight: 700; display: block; }
  .card .legenda { color: var(--cinza); font-size: .85rem; }
  table { border-collapse: collapse; width: 100%; font-size: .92rem; margin: 8px 0; }
  th, td { border: 1px solid var(--borda); padding: 6px 8px; text-align: left; vertical-align: top; }
  th { background: #f4f4f4; }
  td.num, th.num { text-align: right; white-space: nowrap; }
  table.falhas td:first-child { min-width: 220px; }
  .ok { color: var(--verde); font-weight: 600; } .falha { color: var(--vermelho); font-weight: 600; } .aviso { color: var(--amarelo); font-weight: 600; }
  .mudo { color: var(--cinza); }
  code { background: #f4f4f4; padding: 1px 4px; border-radius: 3px; font-size: .9em; }
  pre { background: #f4f4f4; padding: 8px; border-radius: 6px; overflow-x: auto; font-size: .85rem; white-space: pre-wrap; }
  .pill { display: inline-block; padding: 1px 8px; border-radius: 999px; font-size: .8rem; background: #eee; }
  .pill.Alto { background: #fde8e6; color: #8e1b12; } .pill.Medio { background: #fff4d6; color: #7a5a00; }
  footer { margin-top: 40px; color: var(--cinza); font-size: .85rem; border-top: 1px solid var(--borda); padding-top: 8px; }
  @media print { body { padding: 0; } a { color: inherit; text-decoration: none; } }
`;

const cabecalho = (titulo, subtitulo) => `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(titulo)}</title><style>${CSS}</style></head><body><main>
<h1>${esc(titulo)}</h1><p class="sub">${subtitulo}</p>`;

const rodape = () => `<footer>
  Gerado automaticamente por <code>scripts/relatorios.js</code> em ${esc(dataLegivel(metricas.geradoEm))} (horario de Recife) a partir de
  ${metricas.arquivosLidos.map(a => `<code>${esc(a)}</code>`).join(', ')}.
  Execucao ${execucao.url ? link(execucao.url, `#${execucao.runNumber}`) : 'local'} ·
  evento <code>${esc(execucao.evento)}</code> · branch <code>${esc(execucao.branch)}</code> · commit <code>${esc(execucao.commit)}</code> ·
  alvo ${esc(execucao.alvo)} · Node ${esc(execucao.node)}.
</footer></main></body></html>`;

const linhaExecucao = `Execucao ${execucao.url ? link(execucao.url, `#${execucao.runNumber}`) : 'local'} · ${esc(dataLegivel(execucao.dataHora))} · evento <code>${esc(execucao.evento)}</code> · branch <code>${esc(execucao.branch)}</code> · alvo <strong>${esc(execucao.alvo)}</strong>`;

// --- relatorio tecnico --------------------------------------------------------------

function relatorioTecnico() {
  const linhasNiveis = ['unidade', 'api', 'e2e']
    .map(n => {
      const v = niveis[n];
      if (!v.executado) return `<tr><td>${NOME_DO_NIVEL[n]}</td><td colspan="6" class="mudo">nao executado neste evento (planejados: ${v.planejados})</td></tr>`;
      return `<tr><td>${NOME_DO_NIVEL[n]}</td><td class="num">${v.total} / ${v.planejados}</td><td class="num ok">${v.aprovados}</td><td class="num ${v.reprovados ? 'falha' : ''}">${v.reprovados}</td><td class="num">${v.pulados}</td><td class="num">${pct(v.taxaDeAprovacao)}</td><td class="num">${ms(v.duracaoMs)}</td></tr>`;
    })
    .join('');

  const issuePorTitulo = new Map();
  for (const lista of [issues.criadas, issues.comentadas]) for (const i of lista) issuePorTitulo.set(i.titulo, i);

  const linhasFalhas = falhas.length
    ? falhas
        .map(f => {
          const i = issuePorTitulo.get(`[pipeline] ${f.nome}`) || (f.tipo === 'ambiente' ? issuePorTitulo.get('[pipeline] ambiente: o alvo dos testes nao respondeu') : null);
          return `<tr><td>${esc(f.nome)}</td><td>${NOME_DO_NIVEL[f.nivel] || f.nivel}</td><td>${esc(f.historia)}</td><td>${f.tipo === 'ambiente' ? '<span class="aviso">ambiente</span>' : 'funcional'}</td><td><pre>${esc(f.mensagem || '(sem mensagem)')}</pre></td><td>${i ? link(i.url, `#${i.numero}`) : '<span class="mudo">-</span>'}</td></tr>`;
        })
        .join('')
    : '<tr><td colspan="6" class="ok">Nenhuma falha nesta execucao.</td></tr>';

  const linhasHistorias = porHistoria
    .map(h => `<tr><td>${esc(h.id)}</td><td>${esc(h.titulo)}</td><td><span class="pill ${esc(h.impacto)}">${esc(h.impacto)}</span></td><td class="num">${h.total}</td><td class="num ${h.reprovados ? 'falha' : 'ok'}">${h.reprovados}</td><td class="num">${pct(h.taxaDeAprovacao)}</td></tr>`)
    .join('');

  const linhasLentos = maisLentos.map(c => `<tr><td>${esc(c.nome)}</td><td>${NOME_DO_NIVEL[c.nivel] || c.nivel}</td><td class="num">${ms(c.tempoMs)}</td></tr>`).join('');

  const linhasRecorrentes = tendencia.falhasRecorrentes.length
    ? tendencia.falhasRecorrentes.map(f => `<tr><td>${esc(f.nome)}</td><td class="num">${f.vezes}</td><td>${esc(dataLegivel(f.ultimaVez))}</td></tr>`).join('')
    : '<tr><td colspan="3" class="mudo">Nenhum teste reprovou duas ou mais vezes no historico considerado.</td></tr>';

  const blocoIssues = issues.ativo
    ? `<div class="cards">
        <div class="card"><span class="valor">${issues.criadas.length}</span><span class="legenda">issues criadas</span></div>
        <div class="card"><span class="valor">${issues.comentadas.length}</span><span class="legenda">issues atualizadas (ja existiam)</span></div>
        <div class="card"><span class="valor">${issues.fechadas.length}</span><span class="legenda">issues fechadas (teste voltou a passar)</span></div>
        <div class="card"><span class="valor">${issues.abertasAoFinal.length}</span><span class="legenda">issues abertas ao final</span></div>
      </div>
      ${issues.abertasAoFinal.length ? `<table><tr><th>Issue</th><th>Titulo</th><th class="num">Dias em aberto</th></tr>${issues.abertasAoFinal.map(i => `<tr><td>${link(i.url, `#${i.numero}`)}</td><td>${esc(i.titulo)}</td><td class="num">${i.dias}</td></tr>`).join('')}</table>` : ''}
      ${issues.avisos.length ? `<p class="aviso">${issues.avisos.map(esc).join('<br>')}</p>` : ''}`
    : `<p class="mudo">Registro automatico de issues inativo nesta execucao (sem token do GitHub). ${issues.avisos.map(esc).join(' ')}</p>`;

  return `${cabecalho('Relatorio tecnico da pipeline de testes', linhaExecucao)}
<div class="cards">
  <div class="card"><span class="valor ${total.reprovados ? 'falha' : 'ok'}">${pct(total.taxaDeAprovacao)}</span><span class="legenda">taxa de aprovacao</span></div>
  <div class="card"><span class="valor">${total.total}</span><span class="legenda">casos executados (${cobertura.planejados} planejados para este evento)</span></div>
  <div class="card"><span class="valor ${total.reprovados ? 'falha' : ''}">${total.reprovados}</span><span class="legenda">reprovados${metricas.falhasDeAmbiente ? ` (${metricas.falhasDeAmbiente} de ambiente)` : ''}</span></div>
  <div class="card"><span class="valor">${ms(total.duracaoMs)}</span><span class="legenda">duracao da suite</span></div>
  <div class="card"><span class="valor">${pct(cobertura.percentual)}</span><span class="legenda">cobertura do plano</span></div>
  <div class="card"><span class="valor">${pct(estabilidade)}</span><span class="legenda">execucoes verdes nas ultimas ${tendencia.estabilidade.janela || '-'} (main)</span></div>
</div>

<h2>1. Resultado por nivel</h2>
<table><tr><th>Nivel</th><th class="num">Executados / planejados</th><th class="num">Aprovados</th><th class="num">Reprovados</th><th class="num">Pulados</th><th class="num">Taxa</th><th class="num">Duracao</th></tr>${linhasNiveis}</table>
${cobertura.niveisNaoExecutados.length ? `<p class="mudo">Niveis nao executados neste evento: ${cobertura.niveisNaoExecutados.map(n => NOME_DO_NIVEL[n]).join(', ')}. Isso e esperado nos jobs de quality gate; a regressao diaria roda os tres.</p>` : ''}

<h2>2. Falhas (${falhas.length})</h2>
<table class="falhas"><tr><th>Teste</th><th>Nivel</th><th>Historia</th><th>Tipo</th><th>Mensagem</th><th>Issue</th></tr>${linhasFalhas}</table>
${metricas.falhasDeAmbiente ? '<p class="aviso">Falha de ambiente: o alvo nao respondeu. Nao e defeito do produto (G3 em docs/tas.md). Verifique o log do servidor nos artefatos.</p>' : ''}

<h2>3. Resultado por historia de usuario</h2>
<table><tr><th>Id</th><th>Historia</th><th>Impacto</th><th class="num">Casos</th><th class="num">Reprovados</th><th class="num">Taxa</th></tr>${linhasHistorias}</table>

<h2>4. Tempo de execucao</h2>
<p>Objetivo O1 (docs/tas.md): resposta em menos de 5 minutos. Suite inteira: <strong>${ms(total.duracaoMs)}</strong>.</p>
<table><tr><th>Teste mais lento</th><th>Nivel</th><th class="num">Tempo</th></tr>${linhasLentos}</table>

<h2>5. Tendencia (branch main, mesmo alvo, ate 30 execucoes)</h2>
${svgTendencia(tendencia.serie)}
<p class="mudo">${tendencia.historicoDisponivel ? `Historico lido da branch <code>metricas</code>. Barra com contorno escuro = esta execucao.` : 'Sem historico nesta execucao (jobs de quality gate nao leem o historico; a regressao diaria le e grava).'}</p>
<table><tr><th>Teste que mais reprovou</th><th class="num">Vezes</th><th>Ultima vez</th></tr>${linhasRecorrentes}</table>

<h2>6. Issues abertas pela pipeline</h2>
${blocoIssues}

<h2>7. Artefatos desta execucao</h2>
<ul>
  <li>Relatorios JUnit: ${metricas.arquivosLidos.map(a => `<code>${esc(a)}</code>`).join(', ')}</li>
  <li>Logs: <code>evidencias/*.log</code> (saida de cada nivel e do servidor alvo)</li>
  <li>Metricas em JSON: <code>evidencias/metricas.json</code>; issues: <code>evidencias/issues.json</code></li>
  <li>Este relatorio e o de negocio: <code>evidencias/relatorio-tecnico.html</code>, <code>evidencias/relatorio-negocio.html</code></li>
  ${execucao.url ? `<li>Pagina da execucao, com anotacoes e artefatos: ${link(execucao.url, execucao.url)}</li>` : ''}
</ul>
${rodape()}`;
}

// --- relatorio de negocio -------------------------------------------------------------

function relatorioNegocio() {
  const riscos = porHistoria
    .filter(h => h.impacto !== '-')
    .sort((a, b) => (b.reprovados - a.reprovados) || (a.impacto === 'Alto' ? -1 : 1))
    .map(h => {
      const estado = h.reprovados ? `<span class="falha">${h.reprovados} falha(s)</span>` : '<span class="ok">ok</span>';
      return `<tr><td>${esc(h.titulo)} <span class="mudo">(${esc(h.id)})</span></td><td><span class="pill ${esc(h.impacto)}">${esc(h.impacto)}</span></td><td class="num">${h.total}</td><td>${estado}</td></tr>`;
    })
    .join('');

  const defeitosAbertos = issues.ativo ? issues.abertasAoFinal : [];
  const maisAntigo = defeitosAbertos[0];

  const recomendacoes = [];
  if (semaforo.cor === 'vermelho') recomendacoes.push('Nao avancar para entrega enquanto houver falha em historia de impacto alto. Cada falha tem uma issue; classificar (defeito do produto, da suite ou do ambiente) e corrigir.');
  if (metricas.falhasDeAmbiente) recomendacoes.push('Corrigir o ambiente antes de interpretar qualquer outro numero: sem alvo no ar, o resultado nao informa nada sobre o produto.');
  if (estabilidade !== null && estabilidade < 80) recomendacoes.push('A pipeline oscila. Investigar os testes que mais reprovam (relatorio tecnico, secao 5) antes de confiar no verde.');
  if (defeitosAbertos.length) recomendacoes.push(`Ha ${defeitosAbertos.length} issue(s) de falha em aberto; a mais antiga tem ${maisAntigo.dias} dia(s). Priorizar as de impacto alto.`);
  if (execucao.alvo === 'duplo de referencia') recomendacoes.push('Para decidir sobre o produto, consultar o relatorio do workflow contra o back-end real, onde os defeitos conhecidos aparecem.');
  if (!recomendacoes.length) recomendacoes.push('Manter o ritmo: a regressao diaria segue acompanhando e qualquer regressao abre issue automaticamente.');

  return `${cabecalho('Relatorio de qualidade para o negocio', linhaExecucao)}
<div class="semaforo ${semaforo.cor}"><div class="luz"></div><div><strong>${semaforo.rotulo}</strong>${esc(semaforo.frase)}</div></div>

<h2>1. Indicadores desta execucao</h2>
<div class="cards">
  <div class="card"><span class="valor ${total.reprovados ? 'falha' : 'ok'}">${pct(total.taxaDeAprovacao)}</span><span class="legenda">dos casos aprovados</span></div>
  <div class="card"><span class="valor">${pct(cobertura.percentual)}</span><span class="legenda">do plano executado (${cobertura.executados} de ${cobertura.planejados})</span></div>
  <div class="card"><span class="valor ${historiasComFalha.length ? 'falha' : 'ok'}">${historiasComFalha.length}</span><span class="legenda">historias com falha, de ${porHistoria.filter(h => h.impacto !== '-').length} verificadas</span></div>
  <div class="card"><span class="valor">${issues.ativo ? defeitosAbertos.length : '-'}</span><span class="legenda">issues de falha em aberto${maisAntigo ? ` (a mais antiga ha ${maisAntigo.dias} dia(s))` : ''}</span></div>
  <div class="card"><span class="valor">${pct(estabilidade)}</span><span class="legenda">execucoes verdes nas ultimas ${tendencia.estabilidade.janela || '-'}</span></div>
  <div class="card"><span class="valor">${ms(total.duracaoMs)}</span><span class="legenda">para saber o resultado (meta: menos de 5 min)</span></div>
</div>

<h2>2. Onde esta o risco</h2>
<p>Cada historia de usuario tem um impacto definido na matriz de risco do projeto. Falha em historia de impacto <strong>alto</strong> (autorizacao, cadastro, sessao, registro e ciclo de vida da demanda) para a entrega; em impacto <strong>medio</strong> entra em observacao.</p>
<table><tr><th>Historia</th><th>Impacto</th><th class="num">Casos</th><th>Situacao</th></tr>${riscos}</table>

<h2>3. Tendencia</h2>
${svgTendencia(tendencia.serie)}
<p class="mudo">Cada barra e uma execucao da regressao na linha principal; verde passou, vermelha teve falha. ${tendencia.historicoDisponivel ? '' : 'O historico so e lido pela regressao diaria.'}</p>

<h2>4. O que este resultado significa</h2>
<p>${significadoDoAlvo}</p>
<p>A suite cobre <strong>${planejado.total} verificacoes</strong>: ${planejado.unidade} do proprio gabarito, ${planejado.api} regras da API (uma regra por teste) e ${planejado.e2e} jornadas completas do cidadao e do gestor. O que esta fora do escopo (telas do aplicativo, notificacao, camera e GPS, desempenho) esta declarado em <code>docs/plano-de-testes.md</code>.</p>

<h2>5. Recomendacao</h2>
<ul>${recomendacoes.map(r => `<li>${esc(r)}</li>`).join('')}</ul>
${rodape()}`;
}

// --- resumo em markdown (aba Summary do GitHub) ------------------------------------------

function resumoMarkdown() {
  const linhas = [
    `## Qualidade: ${semaforo.rotulo} (${semaforo.cor})`,
    '',
    semaforo.frase,
    '',
    '| Indicador | Valor |',
    '| :-- | :-- |',
    `| Taxa de aprovacao | ${pct(total.taxaDeAprovacao)} (${total.aprovados}/${total.total}) |`,
    `| Cobertura do plano neste evento | ${pct(cobertura.percentual)} (${cobertura.executados}/${cobertura.planejados}) |`,
    `| Reprovados | ${total.reprovados}${metricas.falhasDeAmbiente ? ` (${metricas.falhasDeAmbiente} de ambiente)` : ''} |`,
    `| Historias com falha | ${historiasComFalha.map(h => h.id).join(', ') || 'nenhuma'} |`,
    `| Duracao | ${ms(total.duracaoMs)} |`,
    `| Estabilidade (main) | ${pct(estabilidade)} nas ultimas ${tendencia.estabilidade.janela || '-'} |`,
    `| Issues | ${issues.ativo ? `${issues.criadas.length} criadas, ${issues.comentadas.length} atualizadas, ${issues.fechadas.length} fechadas, ${issues.abertasAoFinal.length} abertas` : 'inativo'} |`,
    `| Alvo | ${execucao.alvo} |`,
    '',
  ];
  if (falhas.length) {
    linhas.push('### Falhas', '');
    for (const f of falhas) linhas.push(`- [${f.tipo}] ${f.nome}`);
    linhas.push('');
  }
  linhas.push('Relatorios completos (`relatorio-tecnico.html`, `relatorio-negocio.html`) estao no artefato desta execucao.');
  return linhas.join('\n');
}

// --- grava ------------------------------------------------------------------------------

fs.writeFileSync(path.join(PASTA, 'relatorio-tecnico.html'), relatorioTecnico());
fs.writeFileSync(path.join(PASTA, 'relatorio-negocio.html'), relatorioNegocio());
fs.writeFileSync(path.join(PASTA, 'resumo.md'), resumoMarkdown());

console.log(`Relatorios gravados em evidencias/: relatorio-tecnico.html, relatorio-negocio.html, resumo.md`);
console.log(`Semaforo: ${semaforo.rotulo} (${semaforo.cor}) - ${semaforo.frase}`);
