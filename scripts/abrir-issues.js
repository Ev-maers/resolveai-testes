/**
 * scripts/abrir-issues.js - Registra as falhas da pipeline como issues, seguindo
 * a politica de manutencao (docs/tas.md, secao 9).
 *
 * Entrada: evidencias/metricas.json (scripts/metricas.js), onde cada falha ja
 * vem com o tipo decidido pela regra do quality gate.
 *
 *   falha nova (tipo "funcional")
 *     -> uma issue por teste, "[pipeline] <nome do teste>", rotulos
 *        falha-de-teste + triagem + manutencao. A triagem classifica (SUT, TAS,
 *        ambiente ou variacao esperada) e da o prazo. Se a issue ja existe,
 *        recebe um comentario "voltou a reprovar".
 *   falha de ambiente
 *     -> UMA issue so, rotulo ambiente, fechada quando o alvo voltar a responder.
 *   defeito conhecido (registrado em data/defeitos-conhecidos.js)
 *     -> uma issue por DEFEITO (nao por teste), "[defeito D-nn] <titulo>",
 *        com severidade, prazo e encaminhamento. Nao recebe comentario a cada
 *        execucao; se alguem a fechar com o defeito ainda presente, ela e
 *        reaberta. Se os testes do defeito passarem, recebe o rotulo
 *        possivelmente-corrigido e um aviso para sair do registro.
 *   teste com issue aberta que voltou a passar
 *     -> a issue e fechada com o link da execucao verde, se a execucao for da
 *        mesma branch em que a falha foi registrada.
 *
 * Sem GITHUB_TOKEN (execucao local), nada e escrito: o script so avisa.
 * Uso: GITHUB_TOKEN=... GITHUB_REPOSITORY=dono/repo node scripts/abrir-issues.js
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const gh = require('./github');
const { REGISTRO } = require('../data/defeitos-conhecidos');

const RAIZ = path.resolve(__dirname, '..');
const ENTRADA = path.join(RAIZ, 'evidencias', 'metricas.json');
const SAIDA = path.join(RAIZ, 'evidencias', 'issues.json');
const PREFIXO = '[pipeline] ';
const TITULO_AMBIENTE = `${PREFIXO}ambiente: o alvo dos testes nao respondeu`;
const tituloDoDefeito = d => `[defeito ${d.id}] ${d.titulo}`;
const { ROTULOS } = gh;

const resultado = { ativo: false, rotulo: ROTULOS.falhaDeTeste.name, criadas: [], comentadas: [], fechadas: [], reabertas: [], abertasAoFinal: [], avisos: [] };

function gravar() {
  fs.mkdirSync(path.dirname(SAIDA), { recursive: true });
  fs.writeFileSync(SAIDA, JSON.stringify(resultado, null, 2));
}

if (!fs.existsSync(ENTRADA)) {
  console.error('evidencias/metricas.json nao existe. Rode scripts/metricas.js antes.');
  gravar();
  process.exit(1);
}

if (!gh.TEM_TOKEN || !process.env.GITHUB_REPOSITORY) {
  resultado.avisos.push('Sem GITHUB_TOKEN ou GITHUB_REPOSITORY: nenhuma issue foi aberta (execucao local).');
  console.log('::notice title=Issues::' + resultado.avisos[0]);
  gravar();
  process.exit(0);
}

const metricas = JSON.parse(fs.readFileSync(ENTRADA, 'utf8'));
const { execucao } = metricas;
const hoje = execucao.dataHora.slice(0, 10);

const contexto = () =>
  [
    `- Execucao: ${execucao.url ? `[#${execucao.runNumber}](${execucao.url})` : 'local'}`,
    `- Evento: \`${execucao.evento}\` | Branch: \`${execucao.branch}\` | Commit da suite: \`${execucao.commit}\``,
    `- Alvo: ${execucao.alvo} (\`${execucao.baseUrl}\`)${process.env.BACKEND_COMMIT ? ` | Commit do back-end: \`${process.env.BACKEND_COMMIT}\`` : ''}`,
    `- Data: ${execucao.dataHora}`,
  ].join('\n');

const corpoDaFalha = f =>
  [
    'Teste reprovado na pipeline, **fora do registro de defeitos conhecidos**. Por isso o quality gate reprovou o estagio.',
    '',
    `**Teste:** \`${f.nome}\``,
    `**Nivel:** ${f.nivel} | **Historia:** ${f.historia}`,
    '',
    '**Mensagem:**',
    '```',
    f.mensagem || '(sem mensagem)',
    '```',
    '',
    contexto(),
    '',
    '### Triagem (politica de manutencao, docs/tas.md, secao 9)',
    'Prazo da triagem: **2 dias corridos** a partir da abertura.',
    '',
    '- [ ] 1. A mesma falha ocorreu em execucoes anteriores? (relatorio tecnico, secao 5)',
    '- [ ] 2. Em que passo do teste ela ocorreu? (mensagem acima)',
    '- [ ] 3. O estado do sistema corresponde ao esperado? Se sim, a falha esta na TAS.',
    '- [ ] 4. O ambiente estava disponivel? (log do back-end no artefato da execucao)',
    '- [ ] 5. A falha se repete quando o teste roda sozinho, sem mudanca? Se nao, e instabilidade.',
    '',
    'Depois do diagnostico, registre a classificacao com **um comentario** nesta issue (a esteira aplica rotulos, responsavel e prazo):',
    '',
    '```',
    '/triagem <sut|tas|ambiente|variacao> [alta|media|baixa] [@responsavel] [prazo AAAA-MM-DD]',
    '```',
    '',
    '- `sut`: defeito do produto. Encaminhar ao repositorio do back-end ou do app e registrar em `data/defeitos-conhecidos.js` (por pull request). Prazo: 7, 14 ou 30 dias por severidade.',
    '- `tas`: defeito da automacao. Corrigir em ate 3 dias (alta ou media) ou 7 dias (baixa).',
    '- `ambiente`: o alvo ou o runner falharam. Registrar e conferir se afetou outros testes. Prazo: 1 dia.',
    '- `variacao`: so para comportamento nao deterministico declarado. Registra a medida e fecha.',
    '',
    `Reexecutar ate passar e proibido. Esta issue fecha sozinha quando o teste voltar a passar na branch \`${execucao.branch}\`.`,
  ].join('\n');

const corpoDeAmbiente = falhas =>
  [
    'O alvo dos testes nao respondeu durante a execucao. Isso **nao e defeito do produto** (G3, docs/tas.md): e falha de ambiente, e o quality gate reprovou porque sem alvo nao ha informacao.',
    '',
    `Testes afetados (${falhas.length}):`,
    ...falhas.map(f => `- \`${f.nome}\``),
    '',
    contexto(),
    '',
    'Prazo: 1 dia. Esta issue fecha sozinha quando uma execucao voltar a alcancar o alvo.',
  ].join('\n');

const corpoDoDefeito = d =>
  [
    `Defeito do produto **ja triado** e registrado em \`data/defeitos-conhecidos.js\`. Os testes abaixo continuam reprovando em toda execucao contra o back-end real, mas **nao bloqueiam o merge**: o quality gate os reconhece como defeito conhecido. Qualquer outra falha bloqueia.`,
    '',
    '| Campo | Valor |',
    '| :-- | :-- |',
    `| Id | ${d.id} |`,
    `| Classificacao | defeito do SUT: ${d.tipo} |`,
    `| Severidade | ${d.severidade} |`,
    `| Prazo da correcao | ${d.prazo} |`,
    `| Encaminhado para | ${d.encaminhamento} |`,
    `| Triagem | ${d.triagem.por}, em ${d.triagem.em} |`,
    `| Evidencia | ${d.evidencia} |`,
    '',
    'Testes que reproduzem o defeito:',
    ...d.testes.map(t => `- \`${t}\``),
    '',
    'Primeiro registro desta issue pela pipeline:',
    contexto(),
    '',
    '**Quando o back-end corrigir:** os testes passam, a pipeline marca esta issue com `possivelmente-corrigido` e o quality gate pede para tirar a entrada do registro. Tirar a entrada por pull request e fechar esta issue e o encerramento.',
  ].join('\n');

const titulo = nome => (PREFIXO + nome).slice(0, 240);

async function processar() {
  resultado.ativo = true;
  resultado.avisos.push(...(await gh.garantirRotulos()));

  const abertasDeFalha = await gh.listarIssues({ rotulo: ROTULOS.falhaDeTeste.name });
  const porTitulo = new Map(abertasDeFalha.map(i => [i.title, i]));
  const defeitosTodos = await gh.listarIssues({ rotulo: ROTULOS.defeitoConhecido.name, estado: 'all' });
  const defeitoPorTitulo = new Map(defeitosTodos.map(i => [i.title, i]));

  const novas = metricas.falhas.filter(f => f.tipo === 'funcional');
  const deAmbiente = metricas.falhas.filter(f => f.tipo === 'ambiente');
  const aprovados = new Set(metricas.casos.filter(c => c.status === 'aprovado').map(c => c.nome));

  // 1. Falhas novas: uma issue por teste, aguardando triagem.
  for (const falha of novas) {
    const t = titulo(falha.nome);
    const existente = porTitulo.get(t);
    if (existente) {
      await gh.comentar(existente.number, `Voltou a reprovar.\n\n\`\`\`\n${falha.mensagem || '(sem mensagem)'}\n\`\`\`\n\n${contexto()}`);
      resultado.comentadas.push({ numero: existente.number, url: existente.html_url, titulo: t });
    } else {
      const nova = await gh.criarIssue(t, corpoDaFalha(falha), [ROTULOS.falhaDeTeste.name, ROTULOS.triagem.name, ROTULOS.manutencao.name]);
      porTitulo.set(t, nova);
      resultado.criadas.push({ numero: nova.number, url: nova.html_url, titulo: t });
    }
  }

  // 2. Falhas de ambiente: uma issue so.
  const issueDeAmbiente = porTitulo.get(TITULO_AMBIENTE);
  if (deAmbiente.length) {
    if (issueDeAmbiente) {
      await gh.comentar(issueDeAmbiente.number, `O alvo voltou a nao responder (${deAmbiente.length} teste(s) afetado(s)).\n\n${contexto()}`);
      resultado.comentadas.push({ numero: issueDeAmbiente.number, url: issueDeAmbiente.html_url, titulo: TITULO_AMBIENTE });
    } else {
      const nova = await gh.criarIssue(TITULO_AMBIENTE, corpoDeAmbiente(deAmbiente), [ROTULOS.falhaDeTeste.name, ROTULOS.ambiente.name]);
      porTitulo.set(TITULO_AMBIENTE, nova);
      resultado.criadas.push({ numero: nova.number, url: nova.html_url, titulo: TITULO_AMBIENTE });
    }
  } else if (issueDeAmbiente && metricas.total.total > 0) {
    await gh.mudarEstado(issueDeAmbiente.number, 'closed', `O alvo respondeu normalmente nesta execucao.\n\n${contexto()}`);
    resultado.fechadas.push({ numero: issueDeAmbiente.number, url: issueDeAmbiente.html_url, titulo: TITULO_AMBIENTE });
    porTitulo.delete(TITULO_AMBIENTE);
  }

  // 3a. Cada entrada do registro tem a sua issue. Sincronizado so pelos jobs que
  // marcam SINCRONIZAR_DEFEITOS=1 (um por evento), para dois jobs paralelos nao
  // abrirem a mesma issue duas vezes.
  if (process.env.SINCRONIZAR_DEFEITOS === '1') {
    for (const d of REGISTRO) {
      const t = tituloDoDefeito(d);
      if (defeitoPorTitulo.has(t)) continue;
      const nova = await gh.criarIssue(t, corpoDoDefeito(d), [
        ROTULOS.defeitoConhecido.name,
        ROTULOS.defeitoSut.name,
        gh.rotuloDaSeveridade(d.severidade),
      ]);
      defeitoPorTitulo.set(t, nova);
      resultado.criadas.push({ numero: nova.number, url: nova.html_url, titulo: t });
    }
  }

  // 3b. Defeito que reprovou nesta execucao com a issue fechada: reabre.
  for (const reprovado of metricas.defeitosConhecidos || []) {
    const d = REGISTRO.find(x => x.id === reprovado.id);
    if (!d) continue;
    const t = tituloDoDefeito(d);
    const existente = defeitoPorTitulo.get(t);
    if (existente && existente.state === 'closed') {
      await gh.mudarEstado(
        existente.number,
        'open',
        `A issue foi fechada, mas o defeito continua reproduzindo: ${reprovado.testes.length} teste(s) reprovaram.\n\n${contexto()}`,
      );
      resultado.reabertas.push({ numero: existente.number, url: existente.html_url, titulo: t });
    }
  }

  // 4. Defeitos que parecem corrigidos: aviso unico, pelo rotulo.
  for (const corrigido of metricas.gate?.corrigidos || []) {
    const d = REGISTRO.find(x => x.id === corrigido.id);
    const existente = d && defeitoPorTitulo.get(tituloDoDefeito(d));
    if (!existente || existente.state !== 'open') continue;
    if ((existente.labels || []).some(l => l.name === ROTULOS.possivelmenteCorrigido.name)) continue;
    await gh.comentar(
      existente.number,
      `Os testes deste defeito passaram:\n${corrigido.testes.map(t => `- \`${t}\``).join('\n')}\n\n` +
        `Se a correcao for real, tire a entrada ${d.id} de \`data/defeitos-conhecidos.js\` por pull request e feche esta issue. ` +
        `Enquanto a entrada existir, o quality gate reprova, para o registro nunca esconder uma regressao futura da mesma regra.\n\n${contexto()}`,
    );
    await gh.adicionarRotulos(existente.number, [ROTULOS.possivelmenteCorrigido.name]);
    resultado.comentadas.push({ numero: existente.number, url: existente.html_url, titulo: existente.title });
  }

  // 5. Fecha a issue de teste que voltou a passar (so quando o teste de fato rodou)
  // na mesma branch em que a falha foi registrada. Uma execucao verde de outra
  // branch, onde o teste nunca quebrou, nao prova a correcao. Se a triagem
  // classificou a falha como defeito do produto e ela entrou no registro, a
  // issue do teste da lugar a issue do defeito, que segue o acompanhamento.
  const defeitoReprovadoPorTeste = new Map();
  for (const g of metricas.defeitosConhecidos || []) for (const nome of g.testes) defeitoReprovadoPorTeste.set(nome, g.id);
  for (const [t, issue] of porTitulo) {
    if (!t.startsWith(PREFIXO) || t === TITULO_AMBIENTE) continue;
    const branchDaFalha = /Branch: `([^`]+)`/.exec(issue.body || '')?.[1];
    if (branchDaFalha && branchDaFalha !== execucao.branch) continue;
    const nomeDoTeste = t.slice(PREFIXO.length);
    const idDoDefeito = defeitoReprovadoPorTeste.get(nomeDoTeste);
    if (aprovados.has(nomeDoTeste)) {
      await gh.mudarEstado(issue.number, 'closed', `O teste voltou a passar.\n\n${contexto()}`);
    } else if (idDoDefeito) {
      const d = REGISTRO.find(x => x.id === idDoDefeito);
      const issueDoDefeito = d && defeitoPorTitulo.get(tituloDoDefeito(d));
      await gh.mudarEstado(
        issue.number,
        'closed',
        `Triagem concluida: defeito do produto, registrado como ${idDoDefeito} em \`data/defeitos-conhecidos.js\`. ` +
          `O acompanhamento segue ${issueDoDefeito ? `na issue #${issueDoDefeito.number}` : 'na issue do defeito'}.\n\n${contexto()}`,
      );
    } else continue;
    resultado.fechadas.push({ numero: issue.number, url: issue.html_url, titulo: t });
    porTitulo.delete(t);
  }

  // 6. Retrato final: o que continua aberto e ha quantos dias.
  const defeitosAbertos = [...defeitoPorTitulo.values()].filter(i => i.state !== 'closed' || resultado.reabertas.some(r => r.numero === i.number));
  resultado.abertasAoFinal = [...porTitulo.values(), ...defeitosAbertos]
    .map(i => ({ numero: i.number, url: i.html_url, titulo: i.title, criadaEm: i.created_at, dias: gh.diasEntre(i.created_at, hoje) }))
    .sort((a, b) => b.dias - a.dias);

  gravar();

  const linha = `criadas ${resultado.criadas.length} | comentadas ${resultado.comentadas.length} | fechadas ${resultado.fechadas.length} | reabertas ${resultado.reabertas.length} | abertas ao final ${resultado.abertasAoFinal.length}`;
  console.log(`Issues: ${linha}`);
  console.log(`::notice title=Issues de manutencao::${linha}`);
  for (const i of resultado.criadas) console.log(`  criada    #${i.numero} ${i.url}`);
  for (const i of resultado.comentadas) console.log(`  comentada #${i.numero} ${i.url}`);
  for (const i of resultado.fechadas) console.log(`  fechada   #${i.numero} ${i.url}`);
  for (const i of resultado.reabertas) console.log(`  reaberta  #${i.numero} ${i.url}`);
  for (const a of resultado.avisos) console.log(`::warning title=Issues::${a}`);
}

processar().catch(erro => {
  resultado.avisos.push(erro.message);
  gravar();
  console.log(`::warning title=Issues::${erro.message}`);
});
