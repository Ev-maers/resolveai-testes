/**
 * scripts/manutencao.js - Rotina diaria da politica de manutencao da TAS
 * (docs/tas.md, secao 9). Roda pelo workflow manutencao.yml.
 *
 * 1. Prazos: calcula o prazo de cada demanda de manutencao aberta e marca com
 *    o rotulo prazo-vencido (com um comentario) as que passaram dele.
 * 2. Testes instaveis: le o historico da regressao (branch metricas) e aponta
 *    os testes que alternaram entre aprovar e reprovar. Cada um vira uma issue
 *    de manutencao: instabilidade se corrige, nunca se reexecuta ate passar.
 * 3. Revisao periodica: nos dias 1 e 15 (ou com --revisao), abre a issue da
 *    revisao quinzenal ja preenchida com os dados que a squad vai discutir.
 *
 * Prazos (a primeira regra que se aplica vence):
 *   - linha "Prazo: AAAA-MM-DD" no corpo da issue (preenchida na triagem);
 *   - defeito conhecido: o prazo do registro (data/defeitos-conhecidos.js);
 *   - rotulo triagem: 2 dias corridos desde a abertura;
 *   - rotulo ambiente: 1 dia;
 *   - rotulo defeito-tas ou teste-instavel: 3 dias (7 se severidade:baixa);
 *   - qualquer outra demanda de manutencao: 7 dias.
 *
 * Uso:
 *   node scripts/manutencao.js [--historico metricas-historico/historico.jsonl]
 *        [--revisao] [--simulacao] [--hoje AAAA-MM-DD] [--saida evidencias/manutencao.md]
 * --simulacao (ou ausencia de GITHUB_TOKEN) so le e relata: nada e escrito no GitHub.
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const gh = require('./github');
const { REGISTRO, somarDias } = require('../data/defeitos-conhecidos');
const { verificar, nomesDeTeste } = require('./verificar-politica');

const RAIZ = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const opcao = (nome, padrao) => {
  const i = args.indexOf(nome);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : padrao;
};
const HOJE = opcao('--hoje', new Date().toISOString().slice(0, 10));
const SIMULACAO = args.includes('--simulacao') || !gh.TEM_TOKEN;
const REVISAO = args.includes('--revisao') || ['01', '15'].includes(HOJE.slice(8, 10));
const HISTORICO = opcao('--historico', null);
const SAIDA = path.resolve(RAIZ, opcao('--saida', 'evidencias/manutencao.md'));
const JANELA = 20; // execucoes da regressao consideradas na instabilidade

const { ROTULOS } = gh;
const tem = (issue, rotulo) => (issue.labels || []).some(l => (l.name || l) === rotulo.name);
const dataBr = iso => iso.split('-').reverse().join('/');
const acoes = [];

/** Prazo de uma issue de manutencao, pela regra do cabecalho. */
function prazoDe(issue) {
  const explicito = /prazo[^0-9\n]{0,20}(\d{4}-\d{2}-\d{2})/i.exec(issue.body || '');
  if (explicito && !tem(issue, ROTULOS.defeitoConhecido)) return { prazo: explicito[1], regra: 'definido na triagem' };
  const id = /^\[defeito (D-\d+)\]/.exec(issue.title)?.[1];
  const defeito = id && REGISTRO.find(d => d.id === id);
  if (defeito) return { prazo: defeito.prazo, regra: `registro de defeitos (${defeito.severidade})` };
  const criada = issue.created_at.slice(0, 10);
  if (tem(issue, ROTULOS.triagem)) return { prazo: somarDias(criada, 2), regra: 'triagem: 2 dias' };
  if (tem(issue, ROTULOS.ambiente)) return { prazo: somarDias(criada, 1), regra: 'ambiente: 1 dia' };
  if (tem(issue, ROTULOS.defeitoTas) || tem(issue, ROTULOS.instavel)) {
    const dias = tem(issue, ROTULOS.severidadeBaixa) ? 7 : 3;
    return { prazo: somarDias(criada, dias), regra: `defeito da TAS: ${dias} dias` };
  }
  return { prazo: somarDias(criada, 7), regra: 'manutencao: 7 dias' };
}

async function demandasAbertas() {
  const vistas = new Map();
  for (const r of [ROTULOS.falhaDeTeste, ROTULOS.defeitoConhecido, ROTULOS.manutencao, ROTULOS.instavel]) {
    for (const issue of await gh.listarIssues({ rotulo: r.name })) vistas.set(issue.number, issue);
  }
  return [...vistas.values()].sort((a, b) => a.number - b.number);
}

/** 1. Prazos. */
async function verificarPrazos(issues) {
  const linhas = [];
  for (const issue of issues) {
    const { prazo, regra } = prazoDe(issue);
    const vencida = prazo < HOJE;
    const responsavel = issue.assignees?.length ? issue.assignees.map(a => `@${a.login}`).join(', ') : '(sem responsavel)';
    linhas.push({ issue, prazo, regra, vencida, responsavel });
    if (vencida && !tem(issue, ROTULOS.prazoVencido)) {
      acoes.push(`#${issue.number}: marcar prazo-vencido (prazo ${prazo}, ${regra})`);
      if (!SIMULACAO) {
        await gh.adicionarRotulos(issue.number, [ROTULOS.prazoVencido.name]);
        await gh.comentar(
          issue.number,
          `Prazo da politica de manutencao vencido em ${dataBr(prazo)} (${regra}). ` +
            'Atualize o andamento nesta issue ou registre um novo prazo com a justificativa (linha "Prazo: AAAA-MM-DD").',
        );
      }
    }
  }
  return linhas;
}

/** 2. Instabilidade, a partir do historico da regressao na main. */
function lerHistorico() {
  if (!HISTORICO || !fs.existsSync(path.resolve(RAIZ, HISTORICO))) return [];
  return fs
    .readFileSync(path.resolve(RAIZ, HISTORICO), 'utf8')
    .split('\n')
    .filter(Boolean)
    .map(l => {
      try {
        return JSON.parse(l);
      } catch {
        return null;
      }
    })
    .filter(h => h && h.detalhado && h.branch === 'main');
}

function detectarInstaveis(historico) {
  const porAlvo = new Map();
  for (const h of historico) {
    const alvo = h.alvo || 'duplo de referencia';
    if (!porAlvo.has(alvo)) porAlvo.set(alvo, []);
    porAlvo.get(alvo).push(h);
  }
  const instaveis = [];
  for (const [alvo, execucoes] of porAlvo) {
    const janela = execucoes.slice(-JANELA);
    const nomes = new Set(janela.flatMap(h => h.falhas || []));
    for (const nome of nomes) {
      const sequencia = janela.map(h => ((h.falhas || []).includes(nome) ? 'R' : 'A'));
      let trocas = 0;
      for (let i = 1; i < sequencia.length; i++) if (sequencia[i] !== sequencia[i - 1]) trocas++;
      const reprovacoes = sequencia.filter(s => s === 'R').length;
      // Alternou ao menos duas vezes: reprovou, voltou a passar e reprovou de novo
      // (ou o inverso). Defeito conhecido reprova sempre e nao entra aqui.
      if (trocas >= 2) instaveis.push({ nome, alvo, trocas, reprovacoes, execucoes: janela.length, sequencia: sequencia.join('') });
    }
  }
  return instaveis;
}

async function registrarInstaveis(instaveis, abertas) {
  for (const t of instaveis) {
    const titulo = `[instavel] ${t.nome}`.slice(0, 240);
    if (abertas.some(i => i.title === titulo)) continue;
    acoes.push(`abrir issue de teste instavel: ${t.nome} (${t.sequencia})`);
    if (SIMULACAO) continue;
    await gh.criarIssue(
      titulo,
      [
        `O teste alternou entre aprovar (A) e reprovar (R) nas ultimas ${t.execucoes} execucoes da regressao na main, contra ${t.alvo}:`,
        '',
        `\`${t.sequencia}\` (${t.trocas} trocas, ${t.reprovacoes} reprovacoes)`,
        '',
        'Politica (docs/tas.md, secao 9.3): **reexecutar ate passar e proibido**. Diagnosticar a causa: espera por tempo fixo, dependencia entre testes ou dado compartilhado mutavel. Se a causa estiver no produto, reclassificar como defeito-sut.',
        '',
        `Prazo: ${somarDias(HOJE, 3)}`,
      ].join('\n'),
      [ROTULOS.instavel.name, ROTULOS.manutencao.name, ROTULOS.defeitoTas.name],
    );
  }
}

/** 3. Revisao periodica: os dados que a squad discute a cada duas semanas. */
function tendenciaDeTempo(historico) {
  const recentes = historico.filter(h => h.duracaoMs).slice(-10);
  if (recentes.length < 2) return 'historico insuficiente (menos de duas execucoes detalhadas na main)';
  const meio = Math.floor(recentes.length / 2);
  const media = l => Math.round(l.reduce((s, h) => s + h.duracaoMs, 0) / l.length);
  const antes = media(recentes.slice(0, meio));
  const depois = media(recentes.slice(meio));
  const variacao = Math.round(((depois - antes) / antes) * 100);
  return `${(antes / 1000).toFixed(1)} s -> ${(depois / 1000).toFixed(1)} s (${variacao >= 0 ? '+' : ''}${variacao}%) nas ultimas ${recentes.length} execucoes`;
}

function duplicacoes() {
  const vistos = new Map();
  for (const { arquivo, nome } of nomesDeTeste()) {
    if (!vistos.has(nome)) vistos.set(nome, []);
    vistos.get(nome).push(arquivo);
  }
  return [...vistos.entries()].filter(([, arquivos]) => arquivos.length > 1);
}

function relatorioDaRevisao({ prazos, instaveis, historico }) {
  const { problemas, avisos } = verificar(HOJE);
  const dup = duplicacoes();
  const linha = (rotulo, valor) => `| ${rotulo} | ${valor} |`;
  return [
    `Revisao quinzenal da TAS, gerada automaticamente em ${dataBr(HOJE)} pela rotina de manutencao (\`scripts/manutencao.js\`). Os dados abaixo sao o ponto de partida; as decisoes sao da squad.`,
    '',
    '### 1. Instabilidade (ultimas execucoes da regressao na main)',
    instaveis.length
      ? instaveis.map(t => `- \`${t.nome}\`: ${t.sequencia} (${t.trocas} trocas)`).join('\n')
      : '- Nenhum teste alternou entre aprovar e reprovar.',
    '',
    '### 2. Tempo de execucao',
    `- Suite completa: ${tendenciaDeTempo(historico)}.`,
    '- Meta O1: resultado em menos de 5 minutos.',
    '',
    '### 3. Duplicacao entre casos',
    dup.length ? dup.map(([nome, arquivos]) => `- "${nome}" em ${arquivos.join(', ')}`).join('\n') : '- Nenhum nome de teste repetido.',
    '- Conferir na reuniao: passos de preparacao repetidos que deveriam estar em `api/` ou `data/`.',
    '',
    '### 4. Rastreabilidade e regras automaticas (P1 a P6)',
    problemas.length ? problemas.map(p => `- ${p}`).join('\n') : '- Nenhuma violacao.',
    ...(avisos.length ? ['', ...avisos.map(a => `- Aviso: ${a}`)] : []),
    '',
    '### 5. Defeitos conhecidos do produto',
    '| Defeito | Severidade | Prazo | Situacao |',
    '| :-- | :-- | :-- | :-- |',
    ...REGISTRO.map(d => linha(`${d.id} ${d.titulo}`, `${d.severidade} | ${dataBr(d.prazo)} | ${d.prazo < HOJE ? '**vencido**' : 'no prazo'}`)),
    '',
    '### 6. Demandas de manutencao abertas',
    '| Issue | Prazo | Regra | Responsavel |',
    '| :-- | :-- | :-- | :-- |',
    ...prazos.map(p => linha(`#${p.issue.number} ${p.issue.title.slice(0, 70)}`, `${dataBr(p.prazo)}${p.vencida ? ' **vencido**' : ''} | ${p.regra} | ${p.responsavel}`)),
    '',
    '### Pauta da reuniao',
    '- [ ] Cada teste instavel tem causa diagnosticada e responsavel?',
    '- [ ] O tempo da suite ainda cabe na meta O1?',
    '- [ ] Ha duplicacao a extrair para `api/` ou `data/`?',
    '- [ ] Cada defeito vencido foi cobrado do responsavel no repositorio do produto?',
    '- [ ] Algum teste deve ser removido? Se sim, abrir uma issue "Remocao de teste".',
    '- [ ] Registrar as decisoes desta revisao como comentario nesta issue.',
  ].join('\n');
}

async function main() {
  if (!SIMULACAO) {
    const avisos = await gh.garantirRotulos();
    for (const a of avisos) console.log(`::warning title=Rotulos::${a}`);
  }

  const abertas = await demandasAbertas();
  const prazos = await verificarPrazos(abertas);
  const historico = lerHistorico();
  const instaveis = detectarInstaveis(historico);
  await registrarInstaveis(instaveis, abertas);

  const vencidas = prazos.filter(p => p.vencida);
  const resumo = [
    `## Rotina de manutencao da TAS (${dataBr(HOJE)})${SIMULACAO ? ' - simulacao, nada foi escrito' : ''}`,
    '',
    `| Indicador | Valor |`,
    `| :-- | :-- |`,
    `| Demandas de manutencao abertas | ${prazos.length} |`,
    `| Com prazo vencido | ${vencidas.length} |`,
    `| Sem responsavel atribuido | ${prazos.filter(p => p.responsavel.startsWith('(')).length} |`,
    `| Testes instaveis detectados | ${instaveis.length} |`,
    `| Execucoes detalhadas no historico (main) | ${historico.length} |`,
    '',
    acoes.length ? `Acoes${SIMULACAO ? ' que seriam tomadas' : ' tomadas'}:\n${acoes.map(a => `- ${a}`).join('\n')}` : 'Nenhuma acao necessaria hoje.',
    '',
  ].join('\n');

  let texto = resumo;
  if (REVISAO) {
    const corpo = relatorioDaRevisao({ prazos, instaveis, historico });
    const titulo = `Revisao periodica da TAS - ${dataBr(HOJE)}`;
    texto += `\n## ${titulo}\n\n${corpo}\n`;
    const jaExiste = (await gh.listarIssues({ rotulo: ROTULOS.revisao.name, estado: 'all' })).some(i => i.title === titulo);
    if (!jaExiste && !SIMULACAO) {
      const issue = await gh.criarIssue(titulo, corpo, [ROTULOS.revisao.name, ROTULOS.manutencao.name]);
      console.log(`revisao periodica aberta: #${issue.number} ${issue.html_url}`);
    }
  }

  fs.mkdirSync(path.dirname(SAIDA), { recursive: true });
  fs.writeFileSync(SAIDA, texto);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, texto);
  console.log(texto);
}

main().catch(erro => {
  console.error(`::error title=Manutencao::${erro.message}`);
  process.exitCode = 1;
});
