/**
 * scripts/metricas.js - Transforma os relatorios JUnit em metricas de qualidade.
 *
 * Entrada:  um ou mais XML do runner (padrao: evidencias/unidade.xml, api.xml,
 *           e2e.xml; se nenhum existir, evidencias/resultado.xml).
 * Saida:    evidencias/metricas.json, lido por abrir-issues.js e relatorios.js.
 *
 * As metricas, e o porque de cada uma, estao em docs/metricas-de-qualidade.md.
 * Este script so calcula; nao interpreta nem decide.
 *
 * Uso:
 *   node scripts/metricas.js [arquivo.xml ...] [--historico metricas/historico.jsonl]
 *                            [--alvo "duplo de referencia"] [--saida evidencias/metricas.json]
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const { lerRelatorios } = require('./junit');
const { PLANEJADO, HISTORIAS, classificar } = require('../data/plano-de-testes');

const RAIZ = path.resolve(__dirname, '..');
const NIVEIS = ['unidade', 'api', 'e2e'];
const TAMANHO_DA_JANELA = 10; // execucoes consideradas no indicador de estabilidade

// --- argumentos ---------------------------------------------------------------

const args = process.argv.slice(2);
const opcao = (nome, padrao) => {
  const i = args.indexOf(nome);
  return i >= 0 && args[i + 1] ? args[i + 1] : padrao;
};
const arquivosInformados = args.filter((a, i) => !a.startsWith('--') && !args[i - 1]?.startsWith('--'));
const caminhoHistorico = opcao('--historico', null);
const saida = path.resolve(RAIZ, opcao('--saida', 'evidencias/metricas.json'));

let arquivos = arquivosInformados.length
  ? arquivosInformados
  : ['evidencias/unidade.xml', 'evidencias/api.xml', 'evidencias/e2e.xml'].filter(f => fs.existsSync(path.join(RAIZ, f)));
if (arquivos.length === 0) arquivos = ['evidencias/resultado.xml'];
arquivos = arquivos.map(f => path.resolve(RAIZ, f));

// --- contexto da execucao -----------------------------------------------------

function git(...argumentos) {
  try {
    return execFileSync('git', argumentos, { cwd: RAIZ, encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
}

const env = process.env;
const noGitHub = Boolean(env.GITHUB_RUN_ID);
const servidor = env.GITHUB_SERVER_URL || 'https://github.com';
const repositorio = env.GITHUB_REPOSITORY || '';
const execucao = {
  plataforma: noGitHub ? 'github-actions' : 'local',
  repositorio,
  workflow: env.GITHUB_WORKFLOW || '',
  job: env.GITHUB_JOB || '',
  runId: env.GITHUB_RUN_ID || null,
  runNumber: env.GITHUB_RUN_NUMBER ? Number(env.GITHUB_RUN_NUMBER) : null,
  url: noGitHub ? `${servidor}/${repositorio}/actions/runs/${env.GITHUB_RUN_ID}` : null,
  evento: env.GITHUB_EVENT_NAME || 'local',
  branch: env.GITHUB_HEAD_REF || env.GITHUB_REF_NAME || git('rev-parse', '--abbrev-ref', 'HEAD'),
  commit: (env.GITHUB_SHA || git('rev-parse', 'HEAD')).slice(0, 7),
  alvo: opcao('--alvo', env.ALVO_DOS_TESTES || 'duplo de referencia'),
  baseUrl: env.BASE_URL || 'http://localhost:5000',
  node: process.version,
  dataHora: new Date().toISOString(),
};

// --- leitura ------------------------------------------------------------------

const { casos: brutos, duracaoMs, lidos } = lerRelatorios(arquivos);
const casos = brutos.map(c => ({ ...c, ...classificar(c.nome, c.arquivo) }));

if (casos.length === 0) {
  console.error(`Nenhum caso encontrado em: ${arquivos.join(', ')}`);
  process.exitCode = 1;
}

// --- agregacoes ---------------------------------------------------------------

const resumir = lista => {
  const total = lista.length;
  const aprovados = lista.filter(c => c.status === 'aprovado').length;
  const reprovados = lista.filter(c => c.status === 'reprovado').length;
  const pulados = lista.filter(c => c.status === 'pulado').length;
  const avaliados = total - pulados;
  return {
    total,
    aprovados,
    reprovados,
    pulados,
    taxaDeAprovacao: avaliados ? Math.round((aprovados / avaliados) * 1000) / 10 : null,
    duracaoMs: lista.reduce((s, c) => s + c.tempoMs, 0),
  };
};

const niveis = {};
for (const nivel of NIVEIS) {
  const doNivel = casos.filter(c => c.nivel === nivel);
  niveis[nivel] = {
    ...resumir(doNivel),
    planejados: PLANEJADO[nivel],
    executado: doNivel.length > 0,
    coberturaDoPlano: doNivel.length ? Math.min(100, Math.round((doNivel.length / PLANEJADO[nivel]) * 1000) / 10) : null,
  };
}

const total = resumir(casos);
total.duracaoMs = duracaoMs || total.duracaoMs;

const niveisExecutados = NIVEIS.filter(n => niveis[n].executado);
const planejadoNosNiveisExecutados = niveisExecutados.reduce((s, n) => s + PLANEJADO[n], 0);
const cobertura = {
  niveisExecutados,
  niveisNaoExecutados: NIVEIS.filter(n => !niveis[n].executado),
  executados: casos.length,
  planejados: planejadoNosNiveisExecutados,
  planejadosNoTotal: Object.values(PLANEJADO).reduce((s, v) => s + v, 0),
  percentual: planejadoNosNiveisExecutados ? Math.min(100, Math.round((casos.length / planejadoNosNiveisExecutados) * 1000) / 10) : 0,
};

// Falha de ambiente (G3 em docs/tas.md): o alvo nao respondeu. Nao e defeito do produto.
const ehFalhaDeAmbiente = c => /SUT inacessivel|fetch failed|ECONNREFUSED|ETIMEDOUT/i.test(c.mensagem);

const falhas = casos
  .filter(c => c.status === 'reprovado')
  .map(c => ({
    nome: c.nome,
    nivel: c.nivel,
    historia: c.historia,
    tipo: ehFalhaDeAmbiente(c) ? 'ambiente' : 'funcional',
    mensagem: c.mensagem.slice(0, 500),
    origem: c.origem,
  }));

const porHistoria = Object.entries(HISTORIAS)
  .map(([id, info]) => {
    const doGrupo = casos.filter(c => c.historia === id);
    const r = resumir(doGrupo);
    return { id, titulo: info.titulo, impacto: info.impacto, ...r };
  })
  .filter(h => h.total > 0);

const maisLentos = [...casos]
  .sort((a, b) => b.tempoMs - a.tempoMs)
  .slice(0, 5)
  .map(c => ({ nome: c.nome, nivel: c.nivel, tempoMs: c.tempoMs }));

// --- tendencia (precisa do historico) ------------------------------------------

function lerHistorico(caminho) {
  if (!caminho || !fs.existsSync(caminho)) return [];
  return fs
    .readFileSync(caminho, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map(linha => {
      try {
        return JSON.parse(linha);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

const historico = lerHistorico(caminhoHistorico);
const atual = {
  dataHora: execucao.dataHora,
  runId: execucao.runId,
  runNumber: execucao.runNumber,
  url: execucao.url,
  evento: execucao.evento,
  branch: execucao.branch,
  alvo: execucao.alvo,
  verde: total.reprovados === 0 && casos.length > 0,
  total: total.total,
  reprovados: total.reprovados,
  taxaDeAprovacao: total.taxaDeAprovacao,
  duracaoMs: total.duracaoMs,
  falhas: falhas.map(f => f.nome),
  detalhado: true,
  atual: true,
};

// A tendencia considera so a linha principal (main) e o mesmo alvo: execucoes em
// branches de trabalho medem a mudanca, nao o produto.
const comparaveis = historico.filter(h => h.branch === 'main' && (h.alvo || 'duplo de referencia') === execucao.alvo);
const serie = [...comparaveis, ...(execucao.branch === 'main' ? [atual] : [])].slice(-30);
const janela = serie.slice(-TAMANHO_DA_JANELA);
const verdesNaJanela = janela.filter(h => h.verde).length;

const contagemDeFalhas = {};
for (const h of [...comparaveis, atual]) {
  for (const nome of h.falhas || []) {
    contagemDeFalhas[nome] = contagemDeFalhas[nome] || { nome, vezes: 0, ultimaVez: null };
    contagemDeFalhas[nome].vezes += 1;
    contagemDeFalhas[nome].ultimaVez = h.dataHora;
  }
}
const falhasRecorrentes = Object.values(contagemDeFalhas)
  .filter(f => f.vezes >= 2)
  .sort((a, b) => b.vezes - a.vezes)
  .slice(0, 10);

const tendencia = {
  historicoDisponivel: historico.length > 0,
  execucoesConsideradas: serie.length,
  serie: serie.map(h => ({
    dataHora: h.dataHora,
    runNumber: h.runNumber,
    url: h.url,
    evento: h.evento,
    verde: h.verde,
    taxaDeAprovacao: h.taxaDeAprovacao ?? null,
    reprovados: h.reprovados ?? null,
    duracaoMs: h.duracaoMs ?? null,
    atual: Boolean(h.atual),
  })),
  estabilidade: {
    janela: janela.length,
    verdes: verdesNaJanela,
    percentual: janela.length ? Math.round((verdesNaJanela / janela.length) * 1000) / 10 : null,
  },
  falhasRecorrentes,
};

// --- saida --------------------------------------------------------------------

const metricas = {
  versao: 1,
  geradoEm: execucao.dataHora,
  execucao,
  arquivosLidos: lidos.map(f => path.relative(RAIZ, f)),
  planejado: { ...PLANEJADO, total: cobertura.planejadosNoTotal },
  total,
  niveis,
  cobertura,
  falhas,
  falhasDeAmbiente: falhas.filter(f => f.tipo === 'ambiente').length,
  porHistoria,
  maisLentos,
  tendencia,
  casos: casos.map(c => ({ nome: c.nome, nivel: c.nivel, historia: c.historia, status: c.status, tempoMs: c.tempoMs })),
};

fs.mkdirSync(path.dirname(saida), { recursive: true });
fs.writeFileSync(saida, JSON.stringify(metricas, null, 2));

console.log(`Metricas gravadas em ${path.relative(RAIZ, saida)}`);
console.log(`  alvo: ${execucao.alvo} | evento: ${execucao.evento} | branch: ${execucao.branch}`);
console.log(`  casos: ${total.total} | aprovados: ${total.aprovados} | reprovados: ${total.reprovados} | pulados: ${total.pulados}`);
console.log(`  taxa de aprovacao: ${total.taxaDeAprovacao ?? '-'}% | cobertura do plano: ${cobertura.percentual}% (${cobertura.executados}/${cobertura.planejados})`);
console.log(`  duracao: ${total.duracaoMs} ms | estabilidade (${tendencia.estabilidade.janela} exec.): ${tendencia.estabilidade.percentual ?? '-'}%`);
if (falhas.length) {
  console.log('  falhas:');
  for (const f of falhas) console.log(`    - [${f.tipo}] ${f.nome}`);
}
