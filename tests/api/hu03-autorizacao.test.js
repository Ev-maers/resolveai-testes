/**
 * HU-03 Segregacao por perfil.
 *
 * Risco: Alto / Probabilidade: ALTA.
 * Autorizacao e facil de quebrar sem que ninguem perceba: uma refatoracao
 * afrouxa a regra e nada visivel quebra. E o perfil de risco que a automacao
 * combate melhor. A matriz esta em data/matriz-autorizacao.js (README, secao 8).
 *
 * Um teste por regra da matriz. Os testes que tentam ALTERAR perfil usam uma
 * conta recem-criada e nunca os usuarios compartilhados: os arquivos rodam em
 * paralelo, e um perfil alterado no meio da execucao quebraria os demais.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');

const api = require('../../api/smart-city');
const { USUARIOS } = require('../../lib/config');
const insp = require('../../lib/inspecao');
const contrato = require('../../data/contrato');
const demandas = require('../../data/demandas');
const matriz = require('../../data/matriz-autorizacao');

/** Traduz o perfil do contrato no usuario de teste correspondente. */
const usuarioCom = perfil =>
  ({
    [contrato.PERFIS.CIDADAO]: USUARIOS.cidadao,
    [contrato.PERFIS.GESTOR]: USUARIOS.gestor,
    [contrato.PERFIS.ADMIN]: USUARIOS.admin,
  })[perfil];

/** Perfis que a matriz proibe para a operacao `id`. */
const perfisProibidos = id =>
  Object.entries(matriz.MATRIZ.find(linha => linha.id === id).permissoes)
    .filter(([, permitido]) => !permitido)
    .map(([perfil]) => perfil);

test('HU-03 so o cidadao registra demanda: os demais perfis recebem 403', async () => {
  const proibidos = perfisProibidos('A1');
  assert.ok(proibidos.length > 0, 'a matriz deveria proibir ao menos um perfil nesta operacao');

  const violacoes = [];
  for (const perfil of proibidos) {
    const token = await api.tokenDe(usuarioCom(perfil));
    const resposta = await api.criarDemanda(token, demandas.valida());
    if (resposta.status !== 403) violacoes.push(`${perfil}: esperado 403; recebido ${insp.resumo(resposta)}`);
  }

  assert.deepEqual(violacoes, [], `perfis que conseguiram registrar demanda:\n${violacoes.join('\n')}`);
});

test('HU-03 cidadao nao altera o status, nem da propria demanda', async () => {
  const { id, tokenCidadao } = await api.demandaNoEstado(contrato.STATUS_INICIAL, demandas.valida());

  const resposta = await api.mudarStatus(tokenCidadao, id, contrato.STATUS.EM_ANDAMENTO);
  assert.equal(resposta.status, 403, `esperado 403 para cidadao alterando status; recebido ${insp.resumo(resposta)}`);

  // Recusar com 403 e mudar o estado assim mesmo seria um 403 mentiroso.
  const depois = await api.obterDemanda(tokenCidadao, id);
  assert.equal(insp.carga(depois.body).status, contrato.STATUS_INICIAL, 'o status mudou apesar da recusa');
});

test('HU-03 cidadao nao se promove: pedido recusado e perfil inalterado', async () => {
  const { dados, token } = await api.novoCidadao();

  const violacoes = [];
  for (const perfilPedido of [contrato.PERFIS.GESTOR, contrato.PERFIS.ADMIN]) {
    const resposta = await api.atualizarPerfil(token, { email: dados.email, role: perfilPedido });
    if (resposta.status !== 403) {
      violacoes.push(`pedir ${perfilPedido}: esperado 403; recebido ${insp.resumo(resposta)}`);
    }

    // Recusar e deixar o perfil mudar seria um 403 mentiroso.
    const perfil = insp.carga((await api.meuPerfil(token)).body).role;
    if (perfil !== contrato.PERFIS.CIDADAO) {
      violacoes.push(`pedir ${perfilPedido}: o perfil virou ${perfil}`);
    }
  }

  assert.deepEqual(
    violacoes,
    [],
    `ESCALONAMENTO DE PRIVILEGIO: um cidadao conseguiu alterar o proprio perfil:\n${violacoes.join('\n')}`,
  );
});

test('HU-03 o admin promove um cidadao a gestor', async () => {
  const { dados, token: tokenAlvo } = await api.novoCidadao();
  const tokenAdmin = await api.tokenDe(USUARIOS.admin);

  const promocao = await api.atualizarPerfil(tokenAdmin, { email: dados.email, role: contrato.PERFIS.GESTOR });
  assert.ok(
    promocao.status >= 200 && promocao.status < 300,
    `o admin deveria conseguir promover (README secao 8); a API respondeu ${insp.resumo(promocao)}`,
  );

  // 2xx sem efeito seria uma promocao de mentira.
  const perfil = insp.carga((await api.meuPerfil(tokenAlvo)).body).role;
  assert.equal(perfil, contrato.PERFIS.GESTOR, 'a promocao respondeu sucesso mas o perfil do alvo nao mudou');
});

test('HU-03 demanda de terceiro e invisivel: leitura e exclusao respondem 404', async () => {
  // 403 confirmaria que a demanda existe, e isso permite enumerar as demandas
  // de outros cidadaos um identificador por vez. Pela interface, 403 e 404
  // produzem a mesma tela de erro, e por isso a regra so e vista no nivel de API.
  const { id } = await api.demandaNoEstado(contrato.STATUS_INICIAL, demandas.valida());
  const tokenOutro = await api.tokenDe(USUARIOS.cidadaoSecundario);

  const leitura = await api.obterDemanda(tokenOutro, id);
  const exclusao = await api.excluirDemanda(tokenOutro, id);

  const violacoes = [];
  if (leitura.status !== 404) violacoes.push(`ler: esperado 404; recebido ${insp.resumo(leitura)}`);
  if (exclusao.status !== 404) violacoes.push(`excluir: esperado 404; recebido ${insp.resumo(exclusao)}`);
  assert.deepEqual(violacoes, [], `a demanda de outro cidadao nao esta invisivel:\n${violacoes.join('\n')}`);

  const tokenGestor = await api.tokenDe(USUARIOS.gestor);
  const intacta = await api.obterDemanda(tokenGestor, id);
  assert.equal(intacta.status, 200, 'PERDA DE DADOS: a demanda alheia foi excluida');
});
