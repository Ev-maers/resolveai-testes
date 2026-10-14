/**
 * HU-09 / HU-12 Consulta, isolamento, paginacao e filtros.
 *
 * Risco: Alto (isolamento) e Medio (consulta).
 * O caso de maior consequencia aqui nao e a listagem funcionar: e o cidadao
 * enxergar somente o proprio historico. Um filtro de visibilidade que afrouxa
 * nao quebra nada visivel na tela de quem testa.
 *
 * A regra "demanda de OUTRO cidadao e invisivel (404)" pertence a HU-03: aqui
 * fica o que a LISTAGEM mostra.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');

const api = require('../../api/smart-city');
const { USUARIOS } = require('../../lib/config');
const insp = require('../../lib/inspecao');
const contrato = require('../../data/contrato');
const demandas = require('../../data/demandas');

test('HU-09 cidadao lista apenas as proprias demandas', async () => {
  // Cada teste prepara o que precisa: nada depende de execucao anterior.
  const tokenA = await api.tokenDe(USUARIOS.cidadao);
  const tokenB = await api.tokenDe(USUARIOS.cidadaoSecundario);

  const deA = insp.carga((await api.criarDemanda(tokenA, demandas.valida())).body);
  const deB = insp.carga((await api.criarDemanda(tokenB, demandas.valida())).body);

  // Percorre a listagem INTEIRA, e nao a primeira pagina: uma assercao de
  // ausencia sobre uma pagina passaria verde tanto com isolamento correto
  // quanto com vazamento na pagina 2.
  const ids = (await api.percorrerListagem(tokenA)).map(d => d.id);

  assert.ok(ids.includes(deA.id), 'o cidadao nao enxergou a propria demanda: o isolamento nao pode esconder do dono');
  assert.ok(
    !ids.includes(deB.id),
    `VAZAMENTO ENTRE CIDADAOS: a listagem de ${USUARIOS.cidadao.email} incluiu a demanda ${deB.id}, ` +
    `registrada por ${USUARIOS.cidadaoSecundario.email}`,
  );
});

test('HU-09 gestor enxerga demandas de qualquer cidadao', async () => {
  const tokenCidadao = await api.tokenDe(USUARIOS.cidadao);
  const criada = insp.carga((await api.criarDemanda(tokenCidadao, demandas.valida())).body);

  const tokenGestor = await api.tokenDe(USUARIOS.gestor);

  // Procura em toda a listagem: "nao esta na pagina 1" nao e "o gestor nao enxerga".
  const encontrada = await api.localizarNaListagem(tokenGestor, criada.id);

  assert.ok(
    encontrada,
    'o gestor nao enxergou a demanda recem-registrada: o README diz que ele atualiza "qualquer demanda"',
  );
});

test('HU-09 a listagem e paginada: declara a paginacao e respeita o limite por pagina', async () => {
  const token = await api.tokenDe(USUARIOS.cidadao);
  await api.criarDemanda(token, demandas.valida());
  await api.criarDemanda(token, demandas.valida());

  // `per_page` e o nome real do parametro; o duplo de referencia aceita os dois.
  const { status, body } = await api.listarDemandas(token, { page: 1, pageSize: 1, per_page: 1 });
  assert.equal(status, 200);

  const pag = insp.paginacaoNormalizada(body);
  assert.ok(pag, `a resposta nao trouxe bloco de paginacao: ${JSON.stringify(body).slice(0, 250)}`);

  const ausentes = ['pagina', 'porPagina', 'total', 'totalPaginas'].filter(c => pag[c] === undefined);
  assert.deepEqual(ausentes, [], `a paginacao nao informa: ${ausentes.join(', ')}`);

  assert.equal(insp.lista(body).length, 1, 'o limite de 1 item por pagina foi ignorado');
  assert.ok(pag.total >= 2, `o total (${pag.total}) deveria contar as demandas alem da pagina devolvida`);
});

test('HU-12 filtros por status e por categoria devolvem so o recorte pedido', async () => {
  const token = await api.tokenDe(USUARIOS.cidadao);
  const categoria = contrato.CATEGORIAS[0];
  const criada = insp.carga((await api.criarDemanda(token, demandas.com({ categoria }))).body);

  const filtros = [
    ['status', { status: contrato.STATUS_INICIAL }, d => d.status === contrato.STATUS_INICIAL],
    ['categoria', { categoria }, d => d.category === categoria],
  ];

  const violacoes = [];
  for (const [nome, parametro, pertence] of filtros) {
    const itens = await api.percorrerListagem(token, parametro);
    const fora = itens.filter(d => !pertence(d)).map(d => d.id);
    if (fora.length) violacoes.push(`filtro por ${nome} devolveu itens de fora do recorte: ${fora.join(', ')}`);
    // Um filtro que devolve lista vazia passaria no teste acima: o alvo tem que aparecer.
    if (!itens.some(d => d.id === criada.id)) violacoes.push(`filtro por ${nome} nao devolveu a demanda recem-criada`);
  }

  assert.deepEqual(violacoes, [], violacoes.join('\n'));
});

test('HU-09 demanda inexistente responde 404 e identificador malformado nao gera erro interno', async () => {
  const token = await api.tokenDe(USUARIOS.cidadao);
  const inexistente = '00000000-0000-0000-0000-000000000000';

  const leitura = await api.obterDemanda(token, inexistente);
  const exclusao = await api.excluirDemanda(token, inexistente);
  const malformado = await api.obterDemanda(token, 'nao-e-um-id-valido');

  const violacoes = [];
  if (leitura.status !== 404) violacoes.push(`ler inexistente: esperado 404; recebido ${leitura.status}`);
  if (exclusao.status !== 404) violacoes.push(`excluir inexistente: esperado 404; recebido ${exclusao.status}`);
  // 400 ou 404 sao legitimos; 500 e excecao nao tratada vazando para o cliente.
  if (![400, 404].includes(malformado.status)) {
    violacoes.push(`id malformado: esperado 400 ou 404; recebido ${insp.resumo(malformado)}`);
  }

  assert.deepEqual(violacoes, [], violacoes.join('\n'));
});

test('HU-09 o detalhe da demanda expoe os campos do contrato', async () => {
  const { id, tokenCidadao } = await api.demandaNoEstado(contrato.STATUS_INICIAL, demandas.valida());

  const { status, body } = await api.obterDemanda(tokenCidadao, id);
  assert.equal(status, 200);

  const ausentes = insp.camposAusentes(body, contrato.CAMPOS_DO_DETALHE);
  assert.deepEqual(ausentes, [], `o detalhe da demanda nao trouxe os campos: ${ausentes.join(', ')}`);
});
