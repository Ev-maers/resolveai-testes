/**
 * scripts/abrir-issues.js - Registra cada falha da pipeline como issue no GitHub.
 *
 * Regras (docs/metricas-de-qualidade.md, secao "Registro de falhas"):
 *   - uma issue por teste reprovado, com o titulo "[pipeline] <nome do teste>";
 *   - se ja existe uma issue aberta com esse titulo, comenta nela em vez de
 *     abrir outra (sem duplicata a cada execucao);
 *   - falhas de ambiente (alvo inacessivel) viram UMA issue so, porque nao sao
 *     defeito do produto (G3 em docs/tas.md);
 *   - quando um teste que tinha issue aberta volta a passar, a issue e fechada
 *     com um comentario apontando a execucao verde.
 *
 * Usa a API REST do GitHub com o token da propria execucao (GITHUB_TOKEN) e o
 * fetch nativo do Node: nenhuma dependencia. Sem token, o script so avisa e
 * grava evidencias/issues.json com ativo=false, para que os relatorios saibam.
 *
 * Uso: GITHUB_TOKEN=... GITHUB_REPOSITORY=dono/repo node scripts/abrir-issues.js
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const RAIZ = path.resolve(__dirname, '..');
const ENTRADA = path.join(RAIZ, 'evidencias', 'metricas.json');
const SAIDA = path.join(RAIZ, 'evidencias', 'issues.json');
const ROTULO = 'falha-de-teste';
const PREFIXO = '[pipeline] ';
const TITULO_AMBIENTE = `${PREFIXO}ambiente: o alvo dos testes nao respondeu`;

const env = process.env;
const token = env.GITHUB_TOKEN;
const repositorio = env.GITHUB_REPOSITORY;
const api = env.GITHUB_API_URL || 'https://api.github.com';

const resultado = { ativo: false, rotulo: ROTULO, criadas: [], comentadas: [], fechadas: [], abertasAoFinal: [], avisos: [] };

function gravar() {
  fs.mkdirSync(path.dirname(SAIDA), { recursive: true });
  fs.writeFileSync(SAIDA, JSON.stringify(resultado, null, 2));
}

if (!fs.existsSync(ENTRADA)) {
  console.error('evidencias/metricas.json nao existe. Rode scripts/metricas.js antes.');
  gravar();
  process.exit(1);
}

if (!token || !repositorio) {
  resultado.avisos.push('Sem GITHUB_TOKEN ou GITHUB_REPOSITORY: nenhuma issue foi aberta (execucao local).');
  console.log('::notice title=Issues::' + resultado.avisos[0]);
  gravar();
  process.exit(0);
}

const metricas = JSON.parse(fs.readFileSync(ENTRADA, 'utf8'));
const { execucao } = metricas;

async function chamar(metodo, caminho, corpo) {
  const resposta = await fetch(`${api}${caminho}`, {
    method: metodo,
    headers: {
      authorization: `Bearer ${token}`,
      accept: 'application/vnd.github+json',
      'x-github-api-version': '2022-11-28',
      ...(corpo ? { 'content-type': 'application/json' } : {}),
    },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  const texto = await resposta.text();
  let dados = null;
  try {
    dados = texto ? JSON.parse(texto) : null;
  } catch {
    dados = null;
  }
  return { status: resposta.status, dados };
}

const titulo = nome => (PREFIXO + nome).slice(0, 240);
const diasDesde = iso => Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);

const contexto = () =>
  [
    `- Execucao: ${execucao.url ? `[#${execucao.runNumber}](${execucao.url})` : 'local'}`,
    `- Evento: \`${execucao.evento}\` | Branch: \`${execucao.branch}\` | Commit: \`${execucao.commit}\``,
    `- Alvo: ${execucao.alvo} (\`${execucao.baseUrl}\`)`,
    `- Data: ${execucao.dataHora}`,
  ].join('\n');

const corpoDaFalha = f =>
  [
    `Teste reprovado na pipeline.`,
    '',
    `**Teste:** \`${f.nome}\``,
    `**Nivel:** ${f.nivel} | **Historia:** ${f.historia} | **Tipo:** ${f.tipo}`,
    '',
    '**Mensagem:**',
    '```',
    f.mensagem || '(sem mensagem)',
    '```',
    '',
    contexto(),
    '',
    '---',
    'Politica de manutencao (docs/tas.md, secao 9): classificar como **defeito do SUT**, **defeito da TAS**, **ambiente** ou **variacao esperada** antes de agir. ',
    'Esta issue e fechada automaticamente quando o teste voltar a passar na pipeline.',
  ].join('\n');

const corpoDeAmbiente = falhas =>
  [
    'O alvo dos testes nao respondeu durante a execucao. Isso **nao e defeito do produto** (G3, docs/tas.md): e falha de ambiente.',
    '',
    `Testes afetados (${falhas.length}):`,
    ...falhas.map(f => `- \`${f.nome}\``),
    '',
    contexto(),
    '',
    'Esta issue e fechada automaticamente quando uma execucao voltar a alcancar o alvo.',
  ].join('\n');

async function garantirRotulo() {
  const r = await chamar('POST', `/repos/${repositorio}/labels`, {
    name: ROTULO,
    color: 'd73a4a',
    description: 'Aberta automaticamente pela pipeline de testes',
  });
  if (r.status !== 201 && r.status !== 422) resultado.avisos.push(`Nao consegui criar o rotulo ${ROTULO} (HTTP ${r.status}).`);
}

async function listarAbertas() {
  const abertas = [];
  for (let pagina = 1; pagina <= 5; pagina++) {
    const r = await chamar('GET', `/repos/${repositorio}/issues?state=open&labels=${encodeURIComponent(ROTULO)}&per_page=100&page=${pagina}`);
    if (r.status !== 200 || !Array.isArray(r.dados)) {
      resultado.avisos.push(`Nao consegui listar as issues abertas (HTTP ${r.status}).`);
      break;
    }
    abertas.push(...r.dados.filter(i => !i.pull_request));
    if (r.dados.length < 100) break;
  }
  return abertas;
}

async function comentar(issue, texto) {
  const r = await chamar('POST', `/repos/${repositorio}/issues/${issue.number}/comments`, { body: texto });
  if (r.status !== 201) resultado.avisos.push(`Nao consegui comentar na issue #${issue.number} (HTTP ${r.status}).`);
}

async function criar(tituloDaIssue, corpo) {
  const r = await chamar('POST', `/repos/${repositorio}/issues`, { title: tituloDaIssue, body: corpo, labels: [ROTULO] });
  if (r.status !== 201) {
    resultado.avisos.push(`Nao consegui criar a issue "${tituloDaIssue}" (HTTP ${r.status}).`);
    return null;
  }
  return r.dados;
}

async function fechar(issue, motivo) {
  await comentar(issue, motivo);
  const r = await chamar('PATCH', `/repos/${repositorio}/issues/${issue.number}`, { state: 'closed', state_reason: 'completed' });
  if (r.status !== 200) resultado.avisos.push(`Nao consegui fechar a issue #${issue.number} (HTTP ${r.status}).`);
}

async function main() {
  resultado.ativo = true;
  await garantirRotulo();
  const abertas = await listarAbertas();
  const porTitulo = new Map(abertas.map(i => [i.title, i]));

  const funcionais = metricas.falhas.filter(f => f.tipo === 'funcional');
  const deAmbiente = metricas.falhas.filter(f => f.tipo === 'ambiente');
  const aprovados = new Set(metricas.casos.filter(c => c.status === 'aprovado').map(c => c.nome));

  // 1. Falhas funcionais: uma issue por teste.
  for (const falha of funcionais) {
    const t = titulo(falha.nome);
    const existente = porTitulo.get(t);
    if (existente) {
      await comentar(existente, `Voltou a reprovar.\n\n\`\`\`\n${falha.mensagem || '(sem mensagem)'}\n\`\`\`\n\n${contexto()}`);
      resultado.comentadas.push({ numero: existente.number, url: existente.html_url, titulo: t });
    } else {
      const nova = await criar(t, corpoDaFalha(falha));
      if (nova) {
        porTitulo.set(t, nova);
        resultado.criadas.push({ numero: nova.number, url: nova.html_url, titulo: t });
      }
    }
  }

  // 2. Falhas de ambiente: uma issue so, agrupando os testes afetados.
  const issueDeAmbiente = porTitulo.get(TITULO_AMBIENTE);
  if (deAmbiente.length) {
    if (issueDeAmbiente) {
      await comentar(issueDeAmbiente, `O alvo voltou a nao responder (${deAmbiente.length} teste(s) afetado(s)).\n\n${contexto()}`);
      resultado.comentadas.push({ numero: issueDeAmbiente.number, url: issueDeAmbiente.html_url, titulo: TITULO_AMBIENTE });
    } else {
      const nova = await criar(TITULO_AMBIENTE, corpoDeAmbiente(deAmbiente));
      if (nova) {
        porTitulo.set(TITULO_AMBIENTE, nova);
        resultado.criadas.push({ numero: nova.number, url: nova.html_url, titulo: TITULO_AMBIENTE });
      }
    }
  } else if (issueDeAmbiente && metricas.total.total > 0) {
    await fechar(issueDeAmbiente, `O alvo respondeu normalmente nesta execucao.\n\n${contexto()}`);
    resultado.fechadas.push({ numero: issueDeAmbiente.number, url: issueDeAmbiente.html_url, titulo: TITULO_AMBIENTE });
    porTitulo.delete(TITULO_AMBIENTE);
  }

  // 3. Fecha o que voltou a passar: so quando o teste de fato rodou e aprovou.
  for (const [t, issue] of porTitulo) {
    if (!t.startsWith(PREFIXO) || t === TITULO_AMBIENTE) continue;
    const nome = t.slice(PREFIXO.length);
    if (aprovados.has(nome)) {
      await fechar(issue, `O teste voltou a passar.\n\n${contexto()}`);
      resultado.fechadas.push({ numero: issue.number, url: issue.html_url, titulo: t });
      porTitulo.delete(t);
    }
  }

  // 4. Retrato final: o que continua aberto e ha quantos dias.
  resultado.abertasAoFinal = [...porTitulo.values()]
    .map(i => ({ numero: i.number, url: i.html_url, titulo: i.title, criadaEm: i.created_at, dias: diasDesde(i.created_at) }))
    .sort((a, b) => b.dias - a.dias);

  gravar();

  const linha = `criadas ${resultado.criadas.length} | comentadas ${resultado.comentadas.length} | fechadas ${resultado.fechadas.length} | abertas ao final ${resultado.abertasAoFinal.length}`;
  console.log(`Issues: ${linha}`);
  console.log(`::notice title=Issues de falha::${linha}`);
  for (const i of resultado.criadas) console.log(`  criada  #${i.numero} ${i.url}`);
  for (const i of resultado.comentadas) console.log(`  comentada #${i.numero} ${i.url}`);
  for (const i of resultado.fechadas) console.log(`  fechada #${i.numero} ${i.url}`);
  for (const a of resultado.avisos) console.log(`::warning title=Issues::${a}`);
}

main().catch(erro => {
  resultado.avisos.push(erro.message);
  gravar();
  console.log(`::warning title=Issues::${erro.message}`);
});
