/**
 * HU-06 Registro da demanda urbana.
 *
 * Risco: Alto / Probabilidade: Alta.
 * Fluxo principal do produto, com validacoes numerosas e mudancas frequentes.
 * Todas as variacoes de validacao ficam AQUI, no nivel de API: repetir cada uma
 * no E2E multiplicaria o tempo por dezenas sem acrescentar informacao nova.
 *
 * Um teste por regra de validacao (data/demandas.js). Cada regra percorre os
 * seus casos e lista todos os que falharem.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');

const api = require('../../api/smart-city');
const { USUARIOS } = require('../../lib/config');
const insp = require('../../lib/inspecao');
const contrato = require('../../data/contrato');
const demandas = require('../../data/demandas');

test('HU-06 registro valido nasce pendente e guarda os dados enviados', async () => {
  const token = await api.tokenDe(USUARIOS.cidadao);
  const enviado = demandas.valida();
  const { status, body } = await api.criarDemanda(token, enviado);

  assert.equal(status, 201, `esperado 201 no registro valido; recebido ${status}`);

  // O teste nao se contenta com 201: a demanda poderia ser criada com a
  // categoria errada e o codigo HTTP continuaria verde.
  const criada = insp.carga(body);
  assert.ok(criada.id, 'a demanda criada nao devolveu identificador');
  assert.equal(criada.status, contrato.STATUS_INICIAL, `toda demanda nasce em ${contrato.STATUS_INICIAL}`);
  assert.equal(criada.category, enviado.categoria, 'a categoria enviada nao foi guardada');
  assert.equal(criada.priority, enviado.prioridade, 'a prioridade enviada nao foi guardada');
});

test('HU-06 o servidor ignora os campos que so ele controla', async () => {
  // Mass assignment: se o cliente definir o status, a demanda nasce resolvida
  // sem ninguem ter feito nada; se definir o autor, registra em nome de outro.
  const autor = await api.novoCidadao();
  const vitima = await api.novoCidadao();
  const idDaVitima = insp.carga((await api.meuPerfil(vitima.token)).body).id;

  const dataForjada = '1999-01-01T00:00:00Z';
  const forjado = demandas.com({
    id: 'id-escolhido-pelo-cliente',
    status: contrato.STATUS.RESOLVIDA,
    usuarioId: idDaVitima,
    createdAt: dataForjada,
    updatedAt: dataForjada,
  });

  const { status, body } = await api.criarDemanda(autor.token, forjado);
  assert.equal(status, 201, `os campos extras devem ser IGNORADOS, nao derrubar a chamada; recebido ${status}`);

  const criada = insp.carga(body);
  assert.notEqual(criada.id, forjado.id, 'MASS ASSIGNMENT: o cliente escolheu o identificador');
  assert.equal(criada.status, contrato.STATUS_INICIAL, `MASS ASSIGNMENT: o cliente definiu o status (${criada.status})`);
  assert.notEqual(String(criada.createdAt), dataForjada, 'MASS ASSIGNMENT: o cliente definiu a data de criacao');

  // A autoria nao e um campo da resposta: prova-se por quem enxerga a demanda.
  const doAutor = (await api.percorrerListagem(autor.token)).map(d => d.id);
  const daVitima = (await api.percorrerListagem(vitima.token)).map(d => d.id);
  assert.ok(doAutor.includes(criada.id), 'a demanda nao ficou no nome de quem a registrou');
  assert.ok(!daVitima.includes(criada.id), 'AUTORIA FORJADA: a demanda apareceu para a pessoa indicada no corpo');
});

for (const regra of demandas.regrasDeValidacao()) {
  test(`HU-06 registro recusado: ${regra.regra}`, async () => {
    const token = await api.tokenDe(USUARIOS.cidadao);
    const violacoes = [];

    for (const caso of regra.casos) {
      const { status, body } = await api.criarDemanda(token, caso.corpo);

      if (!contrato.STATUS_VALIDACAO.includes(status)) {
        violacoes.push(`${caso.nome}: esperado ${contrato.STATUS_VALIDACAO.join(' ou ')}; recebido ${status}`);
        continue;
      }
      const apontados = insp.camposComErro(body);
      if (!apontados.some(c => c.includes(caso.campoEsperado))) {
        // Sem apontar o campo, o teste passaria se a API recusasse pelo motivo errado.
        violacoes.push(`${caso.nome}: deveria apontar "${caso.campoEsperado}"; apontou ${JSON.stringify(apontados)}`);
      }
    }

    assert.deepEqual(violacoes, [], `a regra "${regra.regra}" nao foi respeitada:\n${violacoes.join('\n')}`);
  });
}

test('HU-06 valores exatamente no limite sao aceitos', async () => {
  // Valor limite: a fronteira e inclusiva. Recusar o limite exato e o defeito
  // classico de "off by one", e so um caso na fronteira o encontra.
  const token = await api.tokenDe(USUARIOS.cidadao);
  const violacoes = [];

  for (const caso of demandas.limitesAceitos()) {
    const { status, body } = await api.criarDemanda(token, caso.corpo);
    if (status !== 201) violacoes.push(`${caso.nome}: esperado 201; recebido ${status} ${JSON.stringify(body).slice(0, 150)}`);
  }

  assert.deepEqual(violacoes, [], `limites que o contrato aceita mas a API recusou:\n${violacoes.join('\n')}`);
});
