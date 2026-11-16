/**
 * E2E-13 - Notificacao de mudanca de status, verificada pela interface do app.
 *
 * Fecha o fluxo "registrar, acompanhar e notificar": o gestor muda o status de
 * uma demanda e o cidadao ve a notificacao correspondente no aparelho.
 *
 * Onde cada coisa acontece:
 *   - preparacao (API): uma conta nova de cidadao e uma demanda pendente;
 *   - acao do gestor (API): a mudanca de status. O gestor nao usa o app do
 *     cidadao, e a regra da mudanca ja e verificada em tests/api/;
 *   - verificacao (interface): tudo o que o cidadao ve, no app real (Expo Go)
 *     rodando num emulador Android, contra o back-end real.
 *
 * Nao entra no `npm test` de proposito: exige emulador, Expo Go e Maestro. A
 * extensao .app.js fica fora do padrao tests/**\/*.test.js. Execucao: workflow
 * e2e-app (.github/workflows/e2e-app.yml) ou `npm run test:app` com o
 * emulador ligado. Ficha do cenario: docs/e2e/e2e13-notificacao-de-status.md.
 */

'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const api = require('../../api/smart-city');
const app = require('../../api/app');
const insp = require('../../lib/inspecao');
const { USUARIOS } = require('../../lib/config');
const contrato = require('../../data/contrato');
const demandas = require('../../data/demandas');

/** Os ultimos trechos do log do Maestro, para o motivo caber na anotacao. */
const fimDoLog = saida => saida.trim().split('\n').slice(-25).join('\n');

test('E2E-13 o gestor muda o status e o cidadao ve a notificacao no app', async () => {
  // PREPARACAO: conta nova (nunca um usuario compartilhado) e demanda pendente.
  const { dados: cidadao, token } = await api.novoCidadao();
  const corpo = demandas.valida();
  const criacao = await api.criarDemanda(token, corpo);
  assert.equal(criacao.status, 201, `PREPARACAO: a demanda nao foi criada: ${criacao.raw.slice(0, 200)}`);
  const demanda = insp.carga(criacao.body);
  const statusNovo = contrato.STATUS.EM_ANDAMENTO;
  const rotulos = contrato.NOTIFICACAO_DE_STATUS.rotulos;

  try {
    // PASSO 1 (interface): o cidadao entra no app e acompanha a demanda pendente.
    const entrada = app.cidadaoEntraEAcompanha({
      email: cidadao.email,
      senha: cidadao.password,
      demandaId: demanda.id,
      titulo: corpo.titulo,
      rotuloAtual: rotulos[contrato.STATUS_INICIAL],
    });
    assert.equal(entrada.codigo, 0, `PASSO 1: o cidadao nao chegou a demanda na lista do app.\n${fimDoLog(entrada.saida)}`);

    // PASSO 2 (API): o gestor assume o atendimento.
    const tokenGestor = await api.tokenDe(USUARIOS.gestor);
    const mudanca = await api.mudarStatus(tokenGestor, demanda.id, statusNovo);
    assert.equal(mudanca.status, 200, `PASSO 2: o gestor nao conseguiu mudar o status: ${mudanca.raw.slice(0, 200)}`);

    // PASSO 3 (interface): o cidadao atualiza a lista e ve o status novo.
    const recarga = app.cidadaoRecarregaALista({ demandaId: demanda.id, rotuloNovo: rotulos[statusNovo] });
    assert.equal(recarga.codigo, 0, `PASSO 3: a lista do app nao mostrou o status novo.\n${fimDoLog(recarga.saida)}`);

    // PASSO 4 (interface): a notificacao esta na gaveta, com a demanda e o status
    // certos, e tocar nela abre o detalhe da demanda.
    const gaveta = app.abrirGavetaDeNotificacoes();
    assert.equal(gaveta.codigo, 0, `PASSO 4: a gaveta de notificacoes nao abriu: ${gaveta.saida}`);
    const aviso = app.cidadaoVeANotificacao({
      tituloDaNotificacao: contrato.NOTIFICACAO_DE_STATUS.titulo,
      corpoDaNotificacao: contrato.NOTIFICACAO_DE_STATUS.corpo(corpo.titulo, statusNovo),
      titulo: corpo.titulo,
      rotuloNovo: rotulos[statusNovo],
    });
    assert.equal(
      aviso.codigo,
      0,
      'PASSO 4: o cidadao nao recebeu a notificacao da mudanca de status, ou ela nao levou ao detalhe. ' +
        `Esperado: "${contrato.NOTIFICACAO_DE_STATUS.titulo}" com ` +
        `"${contrato.NOTIFICACAO_DE_STATUS.corpo(corpo.titulo, statusNovo)}".\n${fimDoLog(aviso.saida)}`,
    );
  } finally {
    app.fecharApp();
  }
});
