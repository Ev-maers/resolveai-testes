/**
 * E2E-07 — Continuidade de sessao: a renovacao nao pode trocar quem voce e,
 * e o logout precisa terminar a sessao de verdade.
 *
 * Branch: branch7-Luis
 *
 * FLUXO DO USUARIO
 * Um cidadao se cadastra, entra e registra uma demanda. No meio do uso, o
 * access token precisa ser renovado. Depois de renovar, ele continua vendo o
 * que criou antes e continua sendo ele mesmo. No fim, ele sai da conta — e
 * "sair" precisa significar que nem leitura nem escrita funcionam mais com o
 * token antigo.
 *
 * POR QUE ESTE E UM TESTE E2E, E NAO UM TESTE DE API
 * Cada caso da suite de servico (tests/api/) verifica uma regra isolada de
 * autenticacao. Aqui a cadeia inteira precisa se sustentar: o token emitido
 * no cadastro precisa servir para criar uma demanda, a renovacao precisa
 * preservar a identidade e o acesso ao recurso ja criado, e o logout precisa
 * encerrar a sessao para toda a API — nao so para uma rota. Um defeito de
 * integracao (o token renovado responde por outra conta; o logout invalida
 * leitura mas nao escrita) passa ileso por testes isolados e e pego aqui.
 *
 * ORACULO
 * Todo valor esperado vem de data/contrato.js. Nenhum literal neste arquivo.
 *
 * COMO EXECUTAR
 *   Terminal 1:  npm run sut:referencia
 *   Terminal 2:  node --test "tests/e2e/e2e07-*.test.js"
 *   Contra o back-end real:  BASE_URL=http://localhost:5000 node --test "tests/e2e/e2e07-*.test.js"
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');

const api = require('../../api/smart-city');
const insp = require('../../lib/inspecao');
const contrato = require('../../data/contrato');
const demandas = require('../../data/demandas');
const usuarios = require('../../data/usuarios');

test('E2E-07 a sessao atravessa a renovacao e termina de verdade no logout', async () => {
  // ---- PASSO 1 — o morador se cadastra e entra ---------------------------
  const dados = usuarios.novo();
  const cadastro = await api.registrar(dados);
  assert.equal(
    cadastro.status,
    201,
    `PASSO 1: cadastro respondeu ${insp.resumo(cadastro)}`,
  );

  const entrada = await api.login(dados.email, dados.password);
  assert.equal(
    entrada.status,
    200,
    `PASSO 1: login respondeu ${insp.resumo(entrada)}`,
  );

  const { accessToken, refreshToken } = api.extrairTokens(entrada.body);

  assert.ok(accessToken, 'PASSO 1: o login nao devolveu access token');
  assert.ok(
    refreshToken,
    'PASSO 1: o login nao devolveu refresh token. Sem ele, ou a sessao expira e derruba ' +
      'o usuario no meio do uso, ou o access precisa ser eterno — e as duas saidas sao ruins.',
  );
  assert.notEqual(
    accessToken,
    refreshToken,
    'PASSO 1: access e refresh vieram iguais. Sao credenciais com tempos de vida e ' +
      'superficies de exposicao diferentes; emitir o mesmo valor anula a distincao.',
  );

  // ---- PASSO 2 — ele registra uma demanda --------------------------------
  const criacao = await api.criarDemanda(accessToken, demandas.valida());
  assert.equal(
    criacao.status,
    201,
    `PASSO 2: registro respondeu ${insp.resumo(criacao)}`,
  );
  const demanda = insp.carga(criacao.body);

  // ---- PASSO 3 — o access token nao serve para renovar -------------------
  const renovacaoIndevida = await api.renovarToken(accessToken, {
    refresh_token: accessToken,
  });
  assert.equal(
    renovacaoIndevida.status,
    401,
    'PASSO 3 — CHAVE PERMANENTE: o access token foi aceito como refresh. O access viaja ' +
      'em toda chamada e mora no armazenamento do aparelho; se ele tambem renova a sessao, ' +
      `quem o capturar mantem acesso indefinidamente. Recebido: ${insp.resumo(renovacaoIndevida)}`,
  );

  // ---- PASSO 4 — o refresh token de verdade renova a sessao --------------
  const renovacao = await api.renovarToken(refreshToken);
  assert.equal(
    renovacao.status,
    200,
    `PASSO 4: o refresh token legitimo deveria renovar a sessao; respondeu ${insp.resumo(renovacao)}`,
  );

  const novoAccess = api.extrairTokens(renovacao.body).accessToken;
  assert.ok(
    novoAccess,
    'PASSO 4: a renovacao respondeu 200 mas nao devolveu access token novo',
  );

  // ---- PASSO 5 — a sessao renovada continua sendo a mesma identidade -----
  const depoisDaRenovacao = await api.obterDemanda(novoAccess, demanda.id);
  assert.equal(
    depoisDaRenovacao.status,
    200,
    'PASSO 5: depois de renovar, o usuario perdeu acesso ao que registrou antes. A ' +
      'renovacao precisa preservar a identidade, e nao so devolver um token novo. ' +
      `Recebido: ${insp.resumo(depoisDaRenovacao)}`,
  );
  assert.equal(
    insp.carga(depoisDaRenovacao.body).id,
    demanda.id,
    'PASSO 5: a sessao renovada devolveu outro recurso',
  );

  const perfilRenovado = await api.meuPerfil(novoAccess);
  assert.equal(
    perfilRenovado.status,
    200,
    `PASSO 5: /auth/me na sessao renovada respondeu ${insp.resumo(perfilRenovado)}`,
  );
  assert.equal(
    insp.carga(perfilRenovado.body).email,
    dados.email,
    'PASSO 5 — TROCA DE IDENTIDADE: a renovacao devolveu um token que responde por outra conta',
  );
  assert.equal(insp.carga(perfilRenovado.body).role, contrato.PERFIS.CIDADAO);

  // ---- PASSO 6 — ele sai da conta -----------------------------------------
  const saida = await api.logout(novoAccess);
  assert.ok(
    saida.status >= 200 && saida.status < 300,
    `PASSO 6: o logout respondeu ${insp.resumo(saida)}`,
  );

  // ---- PASSO 7 — o logout vale para leitura E para escrita ---------------
  const depoisDoLogout = await api.meuPerfil(novoAccess);
  assert.equal(
    depoisDoLogout.status,
    401,
    'PASSO 7 — LOGOUT DECORATIVO: o token continuou valido depois de sair. Num aparelho ' +
      'compartilhado, a proxima pessoa continua dentro da conta anterior. ' +
      `Recebido: ${insp.resumo(depoisDoLogout)}`,
  );
  assert.equal(
    insp.codigoDeErro(depoisDoLogout.body),
    contrato.ERROS.NAO_AUTENTICADO,
    'PASSO 7: a recusa pos-logout nao trouxe o codigo de erro do contrato',
  );

  const escritaDepoisDoLogout = await api.criarDemanda(novoAccess, demandas.valida());
  assert.equal(
    escritaDepoisDoLogout.status,
    401,
    'PASSO 7: a leitura foi bloqueada depois do logout, mas a ESCRITA nao. Invalidar a ' +
      'sessao precisa valer para toda a API, nao so para /auth/me. Recebido: ' +
      insp.resumo(escritaDepoisDoLogout),
  );
});
