/**
 * scripts/triagem.js - Comando de triagem por comentario de issue.
 *
 * Quem tem acesso de escrita ao repositorio comenta numa issue de falha:
 *
 *   /triagem <tipo> [severidade] [@responsavel] [prazo AAAA-MM-DD]
 *
 *   tipo:        sut | tas | ambiente | variacao
 *   severidade:  alta | media | baixa            (padrao: media)
 *   responsavel: @login de quem corrige          (padrao: quem comentou)
 *   prazo:       data explicita                  (padrao: o da politica)
 *
 * Exemplos:
 *   /triagem tas media
 *   /triagem sut alta @fulano
 *   /triagem ambiente
 *   /triagem tas baixa prazo 2026-11-30
 *
 * O workflow triagem.yml roda este script, que aplica a politica (docs/tas.md,
 * secao 9): troca o rotulo `triagem` pelo da classificacao e da severidade,
 * atribui o responsavel, acrescenta ao corpo da issue a secao "Triagem" com a
 * linha "Prazo: AAAA-MM-DD" (lida pela rotina de manutencao) e confirma num
 * comentario. "variacao" fecha a issue; "sut" lembra o registro do defeito.
 *
 * Entradas (variaveis de ambiente, nunca interpoladas no script do workflow):
 *   COMENTARIO, ISSUE, AUTOR, GITHUB_TOKEN, GITHUB_REPOSITORY
 */

'use strict';

const gh = require('./github');
const { somarDias } = require('../data/defeitos-conhecidos');

const { ROTULOS } = gh;
const TIPOS = {
  sut: { rotulo: ROTULOS.defeitoSut, nome: 'defeito do SUT', prazo: { alta: 7, media: 14, baixa: 30 } },
  tas: { rotulo: ROTULOS.defeitoTas, nome: 'defeito da TAS', prazo: { alta: 3, media: 3, baixa: 7 } },
  ambiente: { rotulo: ROTULOS.ambiente, nome: 'ambiente', prazo: { alta: 1, media: 1, baixa: 1 } },
  variacao: { rotulo: ROTULOS.variacaoEsperada, nome: 'variacao esperada', prazo: null },
};
const SEVERIDADES = ['alta', 'media', 'baixa'];
const USO = 'Uso: `/triagem <sut|tas|ambiente|variacao> [alta|media|baixa] [@responsavel] [prazo AAAA-MM-DD]`';

/** Interpreta o comando; devolve { erro } ou a triagem. */
function interpretar(texto, autor, hoje) {
  const linha = (texto || '').trim().split('\n')[0];
  const partes = linha.split(/\s+/).slice(1);
  const tipo = (partes.shift() || '').toLowerCase();
  if (!TIPOS[tipo]) return { erro: `tipo invalido ou ausente: "${tipo}". ${USO}` };

  let severidade = 'media';
  let responsavel = autor;
  let prazo = null;
  for (let i = 0; i < partes.length; i++) {
    const p = partes[i];
    if (SEVERIDADES.includes(p.toLowerCase())) severidade = p.toLowerCase();
    else if (p.startsWith('@')) responsavel = p.slice(1);
    else if (p.toLowerCase() === 'prazo' && /^\d{4}-\d{2}-\d{2}$/.test(partes[i + 1] || '')) prazo = partes[++i];
    else return { erro: `nao entendi "${p}". ${USO}` };
  }
  const dias = TIPOS[tipo].prazo?.[severidade];
  if (!prazo && dias) prazo = somarDias(hoje, dias);
  if (prazo && prazo < hoje) return { erro: `o prazo ${prazo} ja passou.` };
  return { tipo, severidade, responsavel, prazo };
}

/**
 * Texto do proximo passo, conforme a classificacao e a origem da issue.
 * A esteira so fecha sozinha as issues que ela mesma abre ("[pipeline] ...",
 * scripts/abrir-issues.js). A issue do formulario ("[falha] ...") registra uma
 * falha vista fora da esteira e e fechada por quem fez a triagem (docs/tas.md, 9.2).
 */
function proximoPasso(tipo, tituloDaIssue) {
  const daEsteira = (tituloDaIssue || '').startsWith('[pipeline] ');
  const passos = {
    sut: 'Proximo passo: encaminhar ao repositorio do produto e registrar o defeito em `data/defeitos-conhecidos.js` por pull request.' +
      (daEsteira ? ' Ate la, o quality gate continua bloqueando.' : ''),
    tas: 'Proximo passo: corrigir o teste ou a camada da TAS.' +
      (daEsteira ? ' A issue fecha sozinha quando o teste voltar a passar.' : ''),
    ambiente: 'Proximo passo: restabelecer o ambiente e conferir se outros testes foram afetados.',
    variacao: 'Variacao esperada registrada; a issue sera fechada.',
  };
  const fechamentoManual = {
    sut: 'Feche-a quando o defeito entrar no registro, apontando a issue do defeito.',
    tas: 'Feche-a depois da correcao, com o link da execucao em que o teste passou.',
    ambiente: 'Feche-a quando o ambiente voltar, com o link de uma execucao que alcancou o alvo.',
  };
  if (daEsteira || !fechamentoManual[tipo]) return passos[tipo];
  return `${passos[tipo]}\n\nEsta issue foi aberta pelo formulario, e a esteira so fecha sozinha as issues \`[pipeline]\` que ela mesma abre. ${fechamentoManual[tipo]}`;
}

async function main() {
  const numero = Number(process.env.ISSUE);
  const autor = process.env.AUTOR;
  const hoje = new Date().toISOString().slice(0, 10);
  const t = interpretar(process.env.COMENTARIO, autor, hoje);
  if (t.erro) {
    await gh.comentar(numero, `Triagem nao aplicada: ${t.erro}`);
    console.log(`::warning title=Triagem::${t.erro}`);
    return;
  }

  const lida = await gh.chamar('GET', `/repos/${gh.REPOSITORIO}/issues/${numero}`);
  if (lida.status !== 200) throw new Error(`nao consegui ler a issue #${numero} (HTTP ${lida.status})`);
  const issue = lida.dados;
  const info = TIPOS[t.tipo];

  // Troca o rotulo de triagem pelo da classificacao e da severidade.
  for (const aviso of await gh.garantirRotulos()) console.log(`::warning title=Rotulos::${aviso}`);
  const atuais = (issue.labels || []).map(l => l.name);
  const removidos = [ROTULOS.triagem, ...Object.values(TIPOS).map(x => x.rotulo), ROTULOS.severidadeAlta, ROTULOS.severidadeMedia, ROTULOS.severidadeBaixa].map(r => r.name);
  const novos = [...atuais.filter(n => !removidos.includes(n)), info.rotulo.name, gh.rotuloDaSeveridade(t.severidade)];
  const rotulada = await gh.chamar('PUT', `/repos/${gh.REPOSITORIO}/issues/${numero}/labels`, { labels: novos });
  if (rotulada.status !== 200) throw new Error(`nao consegui aplicar os rotulos na #${numero} (HTTP ${rotulada.status})`);

  // Responsavel: so funciona para quem tem acesso ao repositorio; se falhar, fica registrado no texto.
  const atribuicao = await gh.chamar('POST', `/repos/${gh.REPOSITORIO}/issues/${numero}/assignees`, { assignees: [t.responsavel] });
  const atribuido = atribuicao.status === 201 && (atribuicao.dados?.assignees || []).some(a => a.login === t.responsavel);

  const secao = [
    '',
    '---',
    '### Triagem',
    `- Classificacao: **${info.nome}**`,
    `- Severidade: ${t.severidade}`,
    `- Responsavel: @${t.responsavel}`,
    `- Registrada por @${autor} em ${hoje}`,
    t.prazo ? `- Prazo: ${t.prazo}` : '- Prazo: nao se aplica (variacao esperada)',
  ].join('\n');
  const editada = await gh.chamar('PATCH', `/repos/${gh.REPOSITORIO}/issues/${numero}`, { body: `${issue.body || ''}\n${secao}` });
  if (editada.status !== 200) throw new Error(`nao consegui registrar a triagem no corpo da #${numero} (HTTP ${editada.status})`);

  await gh.comentar(
    numero,
    `Triagem registrada (docs/tas.md, secao 9): **${info.nome}**, severidade ${t.severidade}, ` +
      `responsavel @${t.responsavel}${atribuido ? '' : ' (nao foi possivel atribuir na issue; confira o acesso)'}` +
      `${t.prazo ? `, prazo ${t.prazo}` : ''}.\n\n${proximoPasso(t.tipo, issue.title)}`,
  );
  if (t.tipo === 'variacao') await gh.mudarEstado(numero, 'closed');
  console.log(`triagem aplicada na #${numero}: ${t.tipo} ${t.severidade} @${t.responsavel} ${t.prazo || ''}`);
}

module.exports = { interpretar, proximoPasso };

if (require.main === module) {
  main().catch(erro => {
    console.error(`::error title=Triagem::${erro.message}`);
    process.exitCode = 1;
  });
}
