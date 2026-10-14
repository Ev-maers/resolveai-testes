/**
 * HU-14 Exclusao de demanda.
 *
 * Risco: Alto / Probabilidade: Media.
 * Exclusao e a operacao irreversivel do produto. As duas regras do README
 * ("cidadao exclui apenas as proprias, enquanto pendentes" e "gestor nao pode
 * excluir demandas ja concluidas") sao restricoes de ESTADO, e restricao de
 * estado e o tipo de regra que passa a valer para todos quando alguem
 * simplifica o handler.
 *
 * Fora daqui, por terem dono em outro arquivo: excluir demanda de outro
 * cidadao (HU-03), excluir sem token (HU-02), excluir id inexistente (HU-09).
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');

const api = require('../../api/smart-city');
const { USUARIOS } = require('../../lib/config');
const insp = require('../../lib/inspecao');
const contrato = require('../../data/contrato');
const demandas = require('../../data/demandas');

test('HU-14 cidadao exclui a propria demanda enquanto ela esta pendente', async () => {
  const { id, tokenCidadao } = await api.demandaNoEstado(contrato.STATUS_INICIAL, demandas.valida());

  const resposta = await api.excluirDemanda(tokenCidadao, id);
  assert.ok(
    [200, 204].includes(resposta.status),
    `esperado 200 ou 204 ao excluir demanda propria e pendente; recebido ${insp.resumo(resposta)}`,
  );

  // Um 204 que nao exclui e pior que um erro: o cidadao acredita que apagou.
  const depois = await api.obterDemanda(tokenCidadao, id);
  assert.equal(depois.status, 404, `a API confirmou a exclusao mas a demanda continua acessivel (${depois.status})`);
});

test('HU-14 cidadao nao exclui a propria demanda depois de ela sair de pendente', async () => {
  // Uma vez em atendimento, o gestor ja trabalha nela e o cidadao nao pode
  // mais apagar o rastro.
  const { id, tokenCidadao } = await api.demandaNoEstado(contrato.STATUS.EM_ANDAMENTO, demandas.valida());

  const resposta = await api.excluirDemanda(tokenCidadao, id);
  assert.equal(resposta.status, 403, `esperado 403 fora do estado pendente; recebido ${insp.resumo(resposta)}`);

  const depois = await api.obterDemanda(tokenCidadao, id);
  assert.equal(depois.status, 200, 'a demanda foi excluida apesar da recusa');
});

test('HU-14 gestor nao exclui demanda ja concluida', async () => {
  const { id } = await api.demandaNoEstado(contrato.STATUS.RESOLVIDA, demandas.valida());
  const tokenGestor = await api.tokenDe(USUARIOS.gestor);

  const resposta = await api.excluirDemanda(tokenGestor, id);
  assert.equal(
    resposta.status,
    403,
    `README secao 8: o gestor "nao pode excluir demandas ja concluidas". A API respondeu ${insp.resumo(resposta)}`,
  );

  const depois = await api.obterDemanda(tokenGestor, id);
  assert.equal(depois.status, 200, 'a demanda concluida foi excluida apesar da recusa');
});
