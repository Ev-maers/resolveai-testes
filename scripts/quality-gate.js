/**
 * scripts/quality-gate.js - A regra do quality gate, em codigo.
 *
 * Material de Estudo, cap. 8: "um quality gate e a materializacao, em codigo,
 * dos criterios de saida". Este modulo decide se uma execucao pode seguir,
 * a partir do resultado JUnit e do registro de defeitos conhecidos
 * (data/defeitos-conhecidos.js). As regras estao em docs/tas.md, secao 9.
 *
 * Bloqueia quando:
 *   1. um teste reprovou e nao e defeito conhecido (falha nova ou de ambiente);
 *   2. um teste de defeito conhecido passou (o registro ficou desatualizado e
 *      passaria a esconder uma regressao futura da mesma regra);
 *   3. o registro e invalido (campo faltando, teste em duas entradas, etc.);
 *   4. em modo completo (regressao), o registro cita um teste que nao existe.
 *
 * Nao bloqueia: teste reprovado por defeito conhecido do SUT. Ele continua
 * reprovado no JUnit, na anotacao, no relatorio e na issue do defeito.
 *
 * Uso como modulo: avaliar({ casos, alvo, completo })
 * Uso pela linha de comando: node scripts/quality-gate.js a.xml [b.xml ...] [--completo]
 */

'use strict';

const { lerRelatorios } = require('./junit');
const { REGISTRO } = require('../data/defeitos-conhecidos');

const ALVO_REAL = 'back-end real';
const SEVERIDADES = ['alta', 'media', 'baixa'];
const ehFalhaDeAmbiente = mensagem => /SUT inacessivel|fetch failed|ECONNREFUSED|ETIMEDOUT/i.test(mensagem || '');

/** Erros estruturais do registro (independem da execucao). */
function validarRegistro(registro = REGISTRO) {
  const erros = [];
  const ids = new Set();
  const donoDoTeste = new Map();
  for (const d of registro) {
    if (!d.id || !/^D-\d+$/.test(d.id)) erros.push(`entrada sem id no formato D-nn: ${JSON.stringify(d.titulo)}`);
    if (ids.has(d.id)) erros.push(`id repetido no registro: ${d.id}`);
    ids.add(d.id);
    if (!d.titulo) erros.push(`${d.id}: falta o titulo`);
    if (!SEVERIDADES.includes(d.severidade)) erros.push(`${d.id}: severidade invalida (${d.severidade})`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d.prazo || '')) erros.push(`${d.id}: prazo fora do formato AAAA-MM-DD`);
    if (!d.triagem?.em || !d.triagem?.por) erros.push(`${d.id}: falta quem fez a triagem e quando`);
    if (!d.encaminhamento) erros.push(`${d.id}: falta o encaminhamento`);
    if (!Array.isArray(d.testes) || d.testes.length === 0) erros.push(`${d.id}: nenhum teste associado`);
    for (const t of d.testes || []) {
      if (donoDoTeste.has(t)) erros.push(`o teste "${t}" aparece em ${donoDoTeste.get(t)} e em ${d.id}`);
      donoDoTeste.set(t, d.id);
    }
  }
  return erros;
}

/**
 * @param {{casos: Array<{nome:string,status:string,mensagem:string}>, alvo?:string, completo?:boolean, registro?:Array}} p
 */
function avaliar({ casos, alvo = process.env.ALVO_DOS_TESTES || 'duplo de referencia', completo = false, registro = REGISTRO }) {
  const aplicaRegistro = alvo === ALVO_REAL;
  const ativos = aplicaRegistro ? registro : [];
  const defeitoDe = nome => ativos.find(d => d.testes.includes(nome)) ?? null;

  const resultado = {
    alvo,
    total: casos.length,
    falhasNovas: [],
    falhasDeAmbiente: [],
    defeitosConhecidos: [],
    corrigidos: [],
    ausentes: [],
    registroInvalido: validarRegistro(registro),
    bloqueia: false,
    motivos: [],
  };

  const porDefeito = new Map();
  for (const c of casos) {
    const defeito = defeitoDe(c.nome);
    if (c.status === 'reprovado') {
      if (ehFalhaDeAmbiente(c.mensagem)) resultado.falhasDeAmbiente.push(c);
      else if (defeito) {
        if (!porDefeito.has(defeito.id)) porDefeito.set(defeito.id, { defeito, reprovados: [], aprovados: [] });
        porDefeito.get(defeito.id).reprovados.push(c.nome);
      } else resultado.falhasNovas.push(c);
    } else if (c.status === 'aprovado' && defeito) {
      if (!porDefeito.has(defeito.id)) porDefeito.set(defeito.id, { defeito, reprovados: [], aprovados: [] });
      porDefeito.get(defeito.id).aprovados.push(c.nome);
    }
  }

  for (const grupo of porDefeito.values()) {
    if (grupo.reprovados.length) resultado.defeitosConhecidos.push(grupo);
    if (grupo.aprovados.length) resultado.corrigidos.push(grupo);
  }

  if (completo) {
    const executados = new Set(casos.map(c => c.nome));
    for (const d of ativos) for (const t of d.testes) if (!executados.has(t)) resultado.ausentes.push({ defeito: d, teste: t });
  }

  if (casos.length === 0) resultado.motivos.push('nenhum caso foi executado');
  if (resultado.falhasNovas.length) resultado.motivos.push(`${resultado.falhasNovas.length} falha(s) nova(s), fora do registro de defeitos conhecidos`);
  if (resultado.falhasDeAmbiente.length) resultado.motivos.push(`${resultado.falhasDeAmbiente.length} falha(s) de ambiente: o alvo nao respondeu`);
  if (resultado.corrigidos.length) resultado.motivos.push(`defeito(s) que parecem corrigidos e continuam no registro: ${resultado.corrigidos.map(g => g.defeito.id).join(', ')}`);
  if (resultado.registroInvalido.length) resultado.motivos.push('registro de defeitos conhecidos invalido');
  if (resultado.ausentes.length) resultado.motivos.push('o registro cita teste(s) que nao existem mais');
  resultado.bloqueia = resultado.motivos.length > 0;
  return resultado;
}

/** Texto do resultado, para o log e para o resumo da execucao. */
function descrever(r) {
  const linhas = [];
  linhas.push(`Quality gate (${r.alvo}): ${r.bloqueia ? 'REPROVADO' : 'APROVADO'} - ${r.total} caso(s) avaliado(s)`);
  for (const f of r.falhasNovas) linhas.push(`  [falha nova]  ${f.nome}`);
  for (const f of r.falhasDeAmbiente) linhas.push(`  [ambiente]    ${f.nome}`);
  for (const g of r.defeitosConhecidos) {
    linhas.push(`  [conhecido]   ${g.defeito.id} (${g.defeito.severidade}, prazo ${g.defeito.prazo}): ${g.reprovados.length} teste(s) - ${g.defeito.titulo}`);
  }
  for (const g of r.corrigidos) {
    linhas.push(`  [corrigido?]  ${g.defeito.id}: passou em ${g.aprovados.join('; ')}. Se a correcao for real, remova a entrada de data/defeitos-conhecidos.js e feche a issue.`);
  }
  for (const a of r.ausentes) linhas.push(`  [registro]    ${a.defeito.id} cita um teste que nao existe: "${a.teste}"`);
  for (const e of r.registroInvalido) linhas.push(`  [registro]    ${e}`);
  if (r.motivos.length) linhas.push(`  Motivo: ${r.motivos.join('; ')}.`);
  return linhas.join('\n');
}

/** Anotacoes do GitHub Actions: aparecem na pagina da execucao e no PR. */
function anotar(r) {
  const esc = s => String(s).replace(/%/g, '%25').replace(/\r/g, '').replace(/\n/g, '%0A');
  if (r.bloqueia) console.log(`::error title=Quality gate reprovado::${esc(r.motivos.join('; '))}`);
  if (r.defeitosConhecidos.length) {
    const lista = r.defeitosConhecidos.map(g => `${g.defeito.id} ${g.defeito.titulo} (${g.reprovados.length} teste(s), prazo ${g.defeito.prazo})`);
    console.log(`::warning title=Defeitos conhecidos do produto (nao bloqueiam o merge)::${esc(lista.join('\n'))}`);
  }
}

module.exports = { avaliar, descrever, anotar, validarRegistro, ALVO_REAL };

if (require.main === module) {
  const args = process.argv.slice(2);
  const completo = args.includes('--completo');
  const arquivos = args.filter(a => !a.startsWith('--'));
  const { casos } = lerRelatorios(arquivos);
  const r = avaliar({ casos, completo });
  console.log(descrever(r));
  anotar(r);
  process.exitCode = r.bloqueia ? 1 : 0;
}
