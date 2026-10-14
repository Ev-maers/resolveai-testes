/**
 * Contrato transversal: o que vale para TODA a API.
 *
 * Estes testes nao pertencem a uma historia de usuario. Verificam as promessas
 * que o contrato faz em todas as rotas: tipo de midia, formato de erro,
 * semantica dos metodos HTTP, ausencia de vazamento e consistencia entre rotas.
 *
 * Sao baratos, estaveis e pegam a classe de defeito mais chata de descobrir em
 * producao: a que aparece no cliente como "erro inesperado".
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');

const api = require('../../api/smart-city');
const http = require('../../lib/http');
const { USUARIOS, ROTAS } = require('../../lib/config');
const insp = require('../../lib/inspecao');
const contrato = require('../../data/contrato');
const demandas = require('../../data/demandas');
const usuarios = require('../../data/usuarios');

test('CT respostas de sucesso e de erro sao JSON, nunca HTML', async () => {
  // Muitos frameworks devolvem pagina de erro em HTML. O app tenta JSON.parse
  // e estoura com uma mensagem que nao ajuda ninguem a diagnosticar nada.
  const token = await api.tokenDe(USUARIOS.cidadao);

  const respostas = [
    ['sucesso (listagem)', await api.listarDemandas(token)],
    ['erro (401 sem token)', await http.get(ROTAS.eu)],
  ];

  const violacoes = respostas
    .filter(([, r]) => !r.ehJson || insp.tipoDeMidia(r.headers) !== 'application/json')
    .map(([rotulo, r]) => `${rotulo}: tipo "${insp.tipoDeMidia(r.headers)}", JSON valido: ${r.ehJson}`);

  assert.deepEqual(violacoes, [], `respostas fora de application/json:\n${violacoes.join('\n')}`);
});

test('CT todo erro traz um code legivel por maquina', async () => {
  const token = await api.tokenDe(USUARIOS.cidadao);

  const respostas = [
    ['401 sem token', await http.get(ROTAS.eu)],
    ['validacao', await api.criarDemanda(token, {})],
    ['404 inexistente', await api.obterDemanda(token, '00000000-0000-0000-0000-000000000000')],
  ];

  // Este e o UNICO teste que cobra o campo `code`: os demais verificam o status
  // HTTP e o campo apontado, para nao reprovarem todos pelo mesmo motivo.
  const semCode = respostas.filter(([, r]) => typeof insp.codigoDeErro(r.body) !== 'string' || !insp.codigoDeErro(r.body));

  assert.deepEqual(
    semCode.map(([rotulo, r]) => `${rotulo}: ${r.raw.slice(0, 120)}`),
    [],
    'respostas de erro sem "code". Sem ele o cliente depende da mensagem em portugues, que muda a cada ajuste de redacao',
  );
});

test('CT rota inexistente responde 404 em JSON', async () => {
  const token = await api.tokenDe(USUARIOS.cidadao);
  const resposta = await http.get('/api/rota-que-nao-existe', { token });

  assert.equal(resposta.status, 404, `esperado 404 em rota inexistente; recebido ${resposta.status}`);
  assert.ok(resposta.ehJson, `rota inexistente devolveu corpo nao-JSON: ${resposta.raw.slice(0, 200)}`);
});

test('CT metodo nao suportado responde 405 com o header Allow', async () => {
  const token = await api.tokenDe(USUARIOS.cidadao);
  // /auth/login existe e aceita POST. Um GET ali e metodo errado em rota
  // certa, e a semantica REST distingue isso de rota inexistente.
  const resposta = await http.get(ROTAS.login, { token });

  assert.equal(resposta.status, 405, `GET em rota que so aceita POST deveria responder 405; recebido ${insp.resumo(resposta)}`);
  assert.ok(resposta.headers.get('allow'), 'a resposta 405 nao trouxe o header Allow (metodos aceitos)');
});

test('CT corpo JSON malformado responde 4xx, nunca 500', async () => {
  const token = await api.tokenDe(USUARIOS.cidadao);

  // Erro do cliente nunca deve virar erro interno: 500 aqui e excecao nao
  // tratada, que alem de defeito e superficie de ataque.
  const resposta = await http.requisitar('POST', ROTAS.demandas, {
    token,
    corpoBruto: '{"titulo": "Buraco",,,}',
  });

  assert.ok(
    resposta.status >= 400 && resposta.status < 500,
    `corpo malformado deveria produzir erro 4xx; a API respondeu ${insp.resumo(resposta)}`,
  );
});

test('CT nenhuma resposta da API vaza senha ou hash', async () => {
  const token = await api.tokenDe(USUARIOS.cidadao);
  const { id } = await api.demandaNoEstado(contrato.STATUS_INICIAL, demandas.valida());

  const respostas = [
    ['POST /auth/register', await api.registrar(usuarios.novo())],
    ['POST /auth/login', await api.login(USUARIOS.cidadao.email, USUARIOS.cidadao.senha)],
    ['GET /auth/me', await api.meuPerfil(token)],
    ['GET /api/demandas', await api.listarDemandas(token)],
    ['GET /api/demandas/{id}', await api.obterDemanda(token, id)],
  ];

  const vazamentos = respostas.flatMap(([rotulo, r]) =>
    insp.camposProibidos(r.body, contrato.CAMPOS_PROIBIDOS_EM_RESPOSTA).map(caminho => `${rotulo} em ${caminho}`),
  );
  assert.deepEqual(vazamentos, [], `credencial exposta:\n${vazamentos.join('\n')}`);
});

test('CT a validacao usa o mesmo status em todas as rotas', async () => {
  // O contrato aceita 400 ou 422 para dado invalido; o que ele nao aceita e que
  // duas rotas respondam diferente ao mesmo tipo de erro, porque o cliente
  // passa a precisar de um tratamento por rota.
  const token = await api.tokenDe(USUARIOS.cidadao);
  const { id } = await api.demandaNoEstado(contrato.STATUS_INICIAL, demandas.valida());
  const tokenGestor = await api.tokenDe(USUARIOS.gestor);

  const respostas = [
    ['cadastro invalido', await api.registrar(usuarios.novo({ email: 'nao-e-um-email' }))],
    ['login sem campos', await http.post(ROTAS.login, {})],
    ['demanda invalida', await api.criarDemanda(token, {})],
    ['status invalido', await api.mudarStatus(tokenGestor, id, 'CONCLUIDO_TALVEZ')],
  ];

  const usados = [...new Set(respostas.map(([, r]) => r.status))];
  assert.equal(
    usados.length,
    1,
    `a mesma classe de erro respondeu com status diferentes: ${respostas.map(([n, r]) => `${n}=${r.status}`).join(', ')}`,
  );
});
