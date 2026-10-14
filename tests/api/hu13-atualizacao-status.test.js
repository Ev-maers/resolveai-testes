/**
 * HU-13 Atualizacao de status e prioridade.
 *
 * Risco: Alto / Probabilidade: Media.
 * A maquina de estados e fechada: uma demanda que volta de RESOLVED para
 * IN_PROGRESS corrompe o historico e o calculo de tempo de atendimento.
 *
 * COMO A MAQUINA DE ESTADOS E TESTADA
 * Sao 16 pares possiveis (4 estados de origem x 4 de destino): 4 permitidos e
 * 12 recusados. Os 12 recusados se dividem em QUATRO regras (data/contrato.js,
 * motivoDaRecusa), e cada regra e um teste:
 *
 *   repete o status atual        4 pares
 *   pula uma etapa               1 par
 *   volta a um estado anterior   1 par
 *   sai de um estado final       6 pares
 *
 * Nenhum dos 16 pares fica sem verificacao; so deixam de ser 16 testes que
 * repetem a mesma pergunta.
 *
 * A exaustividade fica no nivel de API porque a regra vive no Flask, em Python,
 * e um runner Node nao alcanca aquele modulo.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');

const api = require('../../api/smart-city');
const { USUARIOS } = require('../../lib/config');
const insp = require('../../lib/inspecao');
const contrato = require('../../data/contrato');
const demandas = require('../../data/demandas');

/** Leva uma demanda ate `de`, pede a transicao para `para` e devolve o que aconteceu. */
async function tentarTransicao(de, para) {
  const { id } = await api.demandaNoEstado(de, demandas.valida());
  const tokenGestor = await api.tokenDe(USUARIOS.gestor);

  const resposta = await api.mudarStatus(tokenGestor, id, para);
  const depois = await api.obterDemanda(tokenGestor, id);

  return { resposta, estadoDepois: insp.carga(depois.body).status };
}

test('HU-13 as transicoes permitidas pelo contrato sao aplicadas', async () => {
  const violacoes = [];

  for (const { de, para } of contrato.paresDeTransicao().filter(p => p.permitida)) {
    const { resposta, estadoDepois } = await tentarTransicao(de, para);
    if (resposta.status !== 200) {
      violacoes.push(`${de} -> ${para}: esperado 200; recebido ${insp.resumo(resposta)}`);
    } else if (estadoDepois !== para) {
      // 200 sem aplicar o novo status: o codigo HTTP certo com o estado errado.
      violacoes.push(`${de} -> ${para}: respondeu 200 mas a demanda ficou em ${estadoDepois}`);
    }
  }

  assert.deepEqual(violacoes, [], `transicoes permitidas que nao funcionaram:\n${violacoes.join('\n')}`);
});

for (const [motivo, pares] of Object.entries(contrato.paresRecusadosPorMotivo())) {
  test(`HU-13 transicao recusada com 409: ${motivo}`, async () => {
    const violacoes = [];

    for (const { de, para } of pares) {
      const { resposta, estadoDepois } = await tentarTransicao(de, para);
      if (resposta.status !== 409) {
        violacoes.push(`${de} -> ${para}: esperado 409; recebido ${insp.resumo(resposta)}`);
      } else if (estadoDepois !== de) {
        // Recusar com 409 e alterar o estado assim mesmo seria o pior dos mundos.
        violacoes.push(`${de} -> ${para}: recusou com 409 mas o estado mudou para ${estadoDepois}`);
      }
    }

    assert.deepEqual(violacoes, [], `a regra "${motivo}" nao foi respeitada:\n${violacoes.join('\n')}`);
  });
}

test('HU-13 status e prioridade fora da lista fechada sao recusados como validacao', async () => {
  const { id } = await api.demandaNoEstado(contrato.STATUS_INICIAL, demandas.valida());
  const tokenGestor = await api.tokenDe(USUARIOS.gestor);

  // Valor que nem existe e erro de validacao; 409 seria dizer "transicao
  // invalida" para algo que nao e sequer um estado.
  const casos = [
    ['status', await api.mudarStatus(tokenGestor, id, 'CONCLUIDO_TALVEZ')],
    ['prioridade', await api.atualizarDemanda(tokenGestor, id, { prioridade: 'URGENTISSIMA' })],
  ];

  const violacoes = [];
  for (const [campo, { status, body }] of casos) {
    if (!contrato.STATUS_VALIDACAO.includes(status)) {
      violacoes.push(`${campo}: esperado ${contrato.STATUS_VALIDACAO.join(' ou ')}; recebido ${status}`);
    } else if (!insp.camposComErro(body).some(c => c.includes(campo))) {
      violacoes.push(`${campo}: o erro deveria apontar o campo; apontou ${JSON.stringify(insp.camposComErro(body))}`);
    }
  }

  assert.deepEqual(violacoes, [], violacoes.join('\n'));
});

test('HU-13 gestor atualiza a prioridade da demanda', async () => {
  const { id } = await api.demandaNoEstado(contrato.STATUS_INICIAL, demandas.valida());
  const tokenGestor = await api.tokenDe(USUARIOS.gestor);
  const novaPrioridade = contrato.PRIORIDADES.at(-1);

  const { status, body } = await api.atualizarDemanda(tokenGestor, id, { prioridade: novaPrioridade });

  assert.equal(status, 200, `esperado 200 ao atualizar prioridade; recebido ${status}`);
  assert.equal(insp.carga(body).priority, novaPrioridade, 'a prioridade nao foi aplicada');
});
