/**
 * scripts/github.js - Acesso a API do GitHub para a politica de manutencao.
 *
 * Um lugar so para: chamar a API REST (fetch nativo, token da propria
 * execucao), listar e escrever issues, e manter o catalogo de rotulos que
 * classificam as demandas de manutencao (docs/tas.md, secao 9).
 *
 * Sem GITHUB_TOKEN, as leituras ainda funcionam (repositorio publico) e as
 * escritas sao recusadas com mensagem clara: isso permite simular a rotina de
 * manutencao localmente sem alterar nada.
 */

'use strict';

const env = process.env;
const API = env.GITHUB_API_URL || 'https://api.github.com';
const REPOSITORIO = env.GITHUB_REPOSITORY || 'Ev-maers/resolveai-testes';
const TOKEN = env.GITHUB_TOKEN || '';

/** Catalogo de rotulos da politica. Cor e descricao aparecem na aba Issues. */
const ROTULOS = {
  falhaDeTeste: { name: 'falha-de-teste', color: 'd73a4a', description: 'Aberta pela pipeline: teste reprovado fora do registro de defeitos conhecidos' },
  triagem: { name: 'triagem', color: 'fbca04', description: 'Aguardando classificacao (SUT, TAS, ambiente ou variacao esperada)' },
  defeitoSut: { name: 'defeito-sut', color: 'b60205', description: 'Classificada: defeito do produto (back-end ou app)' },
  defeitoTas: { name: 'defeito-tas', color: '5319e7', description: 'Classificada: defeito da propria automacao' },
  ambiente: { name: 'ambiente', color: 'c5def5', description: 'Classificada: falha de ambiente (alvo fora do ar, rede, runner)' },
  variacaoEsperada: { name: 'variacao-esperada', color: 'bfdadc', description: 'Classificada: variacao esperada, sem acao de correcao' },
  defeitoConhecido: { name: 'defeito-conhecido', color: '8b0000', description: 'Defeito do produto registrado em data/defeitos-conhecidos.js' },
  severidadeAlta: { name: 'severidade:alta', color: 'e11d21', description: 'Prazo de 7 dias (SUT) ou 3 dias (TAS)' },
  severidadeMedia: { name: 'severidade:media', color: 'f9a825', description: 'Prazo de 14 dias (SUT) ou 3 dias (TAS)' },
  severidadeBaixa: { name: 'severidade:baixa', color: '0e8a16', description: 'Prazo de 30 dias (SUT) ou 7 dias (TAS)' },
  prazoVencido: { name: 'prazo-vencido', color: '000000', description: 'Passou do prazo da politica de manutencao' },
  instavel: { name: 'teste-instavel', color: 'f0a3ff', description: 'Teste que alterna entre aprovar e reprovar sem mudanca no produto' },
  manutencao: { name: 'manutencao', color: '1d76db', description: 'Demanda de manutencao da TAS' },
  remocao: { name: 'remocao-de-teste', color: '7057ff', description: 'Pedido de remocao de teste: exige decisao e risco registrados' },
  revisao: { name: 'revisao-periodica', color: '0052cc', description: 'Revisao quinzenal da TAS (docs/tas.md, secao 9)' },
  possivelmenteCorrigido: { name: 'possivelmente-corrigido', color: 'c2e0c6', description: 'Os testes do defeito passaram: confirmar e tirar do registro' },
};

const rotuloDaSeveridade = s => ({ alta: ROTULOS.severidadeAlta, media: ROTULOS.severidadeMedia, baixa: ROTULOS.severidadeBaixa })[s]?.name;

async function chamar(metodo, caminho, corpo) {
  if (metodo !== 'GET' && !TOKEN) {
    return { status: 0, dados: null, erro: `escrita recusada sem GITHUB_TOKEN (${metodo} ${caminho})` };
  }
  const resposta = await fetch(`${API}${caminho}`, {
    method: metodo,
    headers: {
      accept: 'application/vnd.github+json',
      'x-github-api-version': '2022-11-28',
      ...(TOKEN ? { authorization: `Bearer ${TOKEN}` } : {}),
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

/** Cria os rotulos que faltam (422 = ja existe). Devolve os avisos. */
async function garantirRotulos(rotulos = Object.values(ROTULOS)) {
  const avisos = [];
  for (const r of rotulos) {
    const resposta = await chamar('POST', `/repos/${REPOSITORIO}/labels`, r);
    if (![201, 422].includes(resposta.status)) avisos.push(`rotulo ${r.name}: HTTP ${resposta.status}${resposta.erro ? ` (${resposta.erro})` : ''}`);
  }
  return avisos;
}

/** Lista issues (sem pull requests) por rotulo e estado. */
async function listarIssues({ rotulo, estado = 'open' } = {}) {
  const issues = [];
  for (let pagina = 1; pagina <= 10; pagina++) {
    const filtro = rotulo ? `&labels=${encodeURIComponent(rotulo)}` : '';
    const r = await chamar('GET', `/repos/${REPOSITORIO}/issues?state=${estado}${filtro}&per_page=100&page=${pagina}`);
    if (r.status !== 200 || !Array.isArray(r.dados)) throw new Error(`nao consegui listar issues (HTTP ${r.status})`);
    issues.push(...r.dados.filter(i => !i.pull_request));
    if (r.dados.length < 100) break;
  }
  return issues;
}

async function criarIssue(titulo, corpo, rotulos) {
  const r = await chamar('POST', `/repos/${REPOSITORIO}/issues`, { title: titulo.slice(0, 240), body: corpo, labels: rotulos });
  if (r.status !== 201) throw new Error(`nao consegui criar "${titulo}" (HTTP ${r.status}${r.erro ? `, ${r.erro}` : ''})`);
  return r.dados;
}

async function comentar(numero, texto) {
  const r = await chamar('POST', `/repos/${REPOSITORIO}/issues/${numero}/comments`, { body: texto });
  if (r.status !== 201) throw new Error(`nao consegui comentar na #${numero} (HTTP ${r.status})`);
}

async function adicionarRotulos(numero, rotulos) {
  const r = await chamar('POST', `/repos/${REPOSITORIO}/issues/${numero}/labels`, { labels: rotulos });
  if (r.status !== 200) throw new Error(`nao consegui rotular a #${numero} (HTTP ${r.status})`);
}

async function mudarEstado(numero, estado, motivo) {
  if (motivo) await comentar(numero, motivo);
  const corpo = estado === 'closed' ? { state: 'closed', state_reason: 'completed' } : { state: 'open' };
  const r = await chamar('PATCH', `/repos/${REPOSITORIO}/issues/${numero}`, corpo);
  if (r.status !== 200) throw new Error(`nao consegui mudar o estado da #${numero} (HTTP ${r.status})`);
}

const diasEntre = (deIso, ateIso) => Math.floor((new Date(ateIso) - new Date(deIso)) / 86_400_000);

module.exports = {
  REPOSITORIO,
  TEM_TOKEN: Boolean(TOKEN),
  ROTULOS,
  rotuloDaSeveridade,
  chamar,
  garantirRotulos,
  listarIssues,
  criarIssue,
  comentar,
  adicionarRotulos,
  mudarEstado,
  diasEntre,
};
