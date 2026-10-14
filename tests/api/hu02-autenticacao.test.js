/**
 * HU-02 Autenticacao e sessao.
 *
 * Risco: Alto / Probabilidade: Media.
 * Sem login nenhuma outra funcao existe. Token com validade e logout que de
 * fato invalida o token sao os pontos mais sensiveis a regressao.
 *
 * Este arquivo e o DONO de duas regras que valem para a API toda: "toda rota
 * protegida exige credencial" e "credencial malformada e recusada". Os outros
 * arquivos nao as repetem.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');

const api = require('../../api/smart-city');
const { USUARIOS, ROTAS } = require('../../lib/config');
const http = require('../../lib/http');
const insp = require('../../lib/inspecao');
const contrato = require('../../data/contrato');

test('HU-02 login valido devolve access e refresh token distintos', async () => {
  const { status, body } = await api.login(USUARIOS.cidadao.email, USUARIOS.cidadao.senha);

  assert.equal(status, 200, `esperado 200 no login valido; recebido ${status}`);

  const tokens = api.extrairTokens(body);
  assert.ok(tokens.accessToken, `resposta sem access token: ${JSON.stringify(body)}`);
  assert.ok(tokens.refreshToken, `resposta sem refresh token: ${JSON.stringify(body)}`);
  assert.notEqual(
    tokens.accessToken,
    tokens.refreshToken,
    'access e refresh token identicos: um deles nao esta cumprindo sua funcao',
  );
});

test('HU-02 login invalido responde 401 sem revelar se a conta existe', async () => {
  const senhaErrada = await api.login(USUARIOS.cidadao.email, 'senha-obviamente-errada');
  const inexistente = await api.login('ninguem.aqui.existe@exemplo.com', 'qualquer-senha');

  assert.equal(senhaErrada.status, 401, `senha errada deveria responder 401; recebido ${insp.resumo(senhaErrada)}`);
  assert.equal(inexistente.status, 401, `conta inexistente deveria responder 401; recebido ${insp.resumo(inexistente)}`);

  // Resposta distinta entre "nao existe" e "senha errada" permite descobrir
  // quais contas existem. E defeito de seguranca, nao de usabilidade.
  const mensagem = r => r.body?.error?.message ?? r.body?.message;
  assert.equal(
    mensagem(inexistente),
    mensagem(senhaErrada),
    'a mensagem difere entre conta inexistente e senha errada: permite enumerar usuarios',
  );
});

test('HU-02 login sem os campos obrigatorios e recusado apontando o campo', async () => {
  // Manda a senha SEM o e-mail. Um corpo totalmente vazio cai numa ramificacao
  // a parte de alguns back-ends ("nenhum dado fornecido") que nao aponta campo.
  const { status, body } = await http.post(ROTAS.login, { password: 'qualquer-senha' });

  assert.ok(
    contrato.STATUS_VALIDACAO.includes(status),
    `esperado ${contrato.STATUS_VALIDACAO.join(' ou ')} sem credenciais; recebido ${status}`,
  );
  assert.ok(
    insp.camposComErro(body).includes('email'),
    `o erro deveria apontar o campo email; apontou ${JSON.stringify(insp.camposComErro(body))}`,
  );
});

test('HU-02 toda rota protegida exige credencial', async () => {
  const rotas = [
    ['GET', ROTAS.eu],
    ['GET', ROTAS.logout],
    ['PATCH', ROTAS.atualizarPerfil],
    ['GET', ROTAS.demandas],
    ['POST', ROTAS.demandas],
    ['GET', ROTAS.demanda(1)],
    ['PATCH', ROTAS.demanda(1)],
    ['DELETE', ROTAS.demanda(1)],
  ];

  const violacoes = [];
  for (const [metodo, caminho] of rotas) {
    const corpo = metodo === 'POST' || metodo === 'PATCH' ? {} : undefined;
    const r = await http.requisitar(metodo, caminho, corpo === undefined ? {} : { corpo });
    if (r.status !== 401) violacoes.push(`${metodo} ${caminho} -> ${r.status}`);
  }

  assert.deepEqual(violacoes, [], `rotas que aceitaram (ou trataram mal) uma chamada sem token:\n${violacoes.join('\n')}`);
});

test('HU-02 credencial malformada e recusada com 401', async () => {
  const tokenValido = await api.tokenDe(USUARIOS.cidadao);

  const casos = [
    ['token que nunca foi emitido', await api.meuPerfil('token-que-nunca-foi-emitido')],
    // Token valido, esquema ausente: aceitar isso e aceitar um formato de
    // credencial que o contrato nao preve.
    ['token valido sem o esquema "Bearer"', await http.get(ROTAS.eu, { autorizacaoBruta: tokenValido })],
  ];

  const violacoes = casos.filter(([, r]) => r.status !== 401).map(([rotulo, r]) => `${rotulo} -> ${r.status}`);
  assert.deepEqual(violacoes, [], `credenciais malformadas que nao foram recusadas com 401:\n${violacoes.join('\n')}`);
});

test('HU-02 o perfil autenticado devolve os dados do proprio usuario', async () => {
  const token = await api.tokenDe(USUARIOS.cidadao);
  const { status, body } = await api.meuPerfil(token);

  assert.equal(status, 200);
  const eu = insp.carga(body);
  assert.equal(eu.email, USUARIOS.cidadao.email, 'a API devolveu o perfil de outro usuario');
  assert.equal(eu.role, contrato.PERFIS.CIDADAO);
});

test('HU-02 o refresh token renova a sessao e o token novo funciona', async () => {
  const { refreshToken } = await api.autenticar(USUARIOS.cidadao);
  const { status, body } = await api.renovarToken(refreshToken);

  assert.equal(status, 200, `esperado 200 ao renovar; recebido ${status}`);

  const novo = api.extrairTokens(body).accessToken;
  assert.ok(novo, `renovacao nao devolveu access token: ${JSON.stringify(body)}`);

  // Renovar e devolver algo inutil seria um 200 mentiroso.
  const perfil = await api.meuPerfil(novo);
  assert.equal(perfil.status, 200, 'o access token renovado nao autentica');
});

test('HU-02 access token nao serve como refresh token', async () => {
  const { accessToken } = await api.autenticar(USUARIOS.cidadao);
  const { status } = await api.renovarToken(accessToken, { refresh_token: accessToken });

  // Aceitar um access token aqui alonga a sessao indefinidamente e anula a
  // razao de existir de dois tokens.
  assert.equal(
    status,
    401,
    `o access token foi aceito como refresh token (status ${status}): a distincao entre os dois nao e verificada`,
  );
});

test('HU-02 logout encerra a sessao de verdade', async () => {
  const token = await api.tokenDe(USUARIOS.cidadao);

  const antes = await api.meuPerfil(token);
  assert.equal(antes.status, 200, 'preparacao: o token deveria estar valido antes do logout');

  const saida = await api.logout(token);
  assert.ok([200, 204].includes(saida.status), `esperado 200 ou 204 no logout; recebido ${saida.status}`);

  const depois = await api.meuPerfil(token);
  assert.equal(depois.status, 401, 'o token continuou valido apos o logout: a sessao nao foi encerrada');
});
