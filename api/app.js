/**
 * api/app.js - Logica de negocio do teste pela interface do app.
 *
 * Sabe: quais telas e fluxos o cidadao percorre no app (fluxos do Maestro em
 * tests/app/fluxos/).
 * Nao sabe: como o Maestro e chamado (quem sabe e lib/maestro.js).
 * Nunca contem: assercoes. Cada funcao devolve o resultado do fluxo; o teste
 * decide o que e falha. As verificacoes visuais (o texto que aparece na tela)
 * ficam dentro dos proprios fluxos, que sao a parte "script de teste" da
 * camada de interface.
 *
 * O sentido das dependencias e o mesmo do resto da TAS:
 *   tests/ -> api/ -> lib/
 */

'use strict';

const { executarFluxo, adb } = require('../lib/maestro');
const { APP } = require('../lib/config');

const FLUXOS = {
  entrarEAcompanhar: 'tests/app/fluxos/01-cidadao-entra-e-acompanha.yaml',
  recarregarLista: 'tests/app/fluxos/02-cidadao-recarrega-a-lista.yaml',
  verNotificacao: 'tests/app/fluxos/03-cidadao-ve-a-notificacao.yaml',
};

/** O cidadao abre o app, entra com e-mail e senha e encontra a demanda na lista. */
const cidadaoEntraEAcompanha = ({ email, senha, demandaId, titulo, rotuloAtual }) =>
  executarFluxo(FLUXOS.entrarEAcompanhar, {
    EMAIL: email,
    SENHA: senha,
    DEMANDA_ID: demandaId,
    TITULO: titulo,
    ROTULO_ATUAL: rotuloAtual,
  });

/** O cidadao puxa a lista para baixo, que e o gesto de atualizar do app. */
const cidadaoRecarregaALista = ({ demandaId, rotuloNovo }) =>
  executarFluxo(FLUXOS.recarregarLista, { DEMANDA_ID: demandaId, ROTULO_NOVO: rotuloNovo });

/**
 * Abre a gaveta de notificacoes do Android. E o mesmo gesto do usuario de
 * puxar a barra de status; pelo adb ele nao depende da resolucao da tela.
 */
const abrirGavetaDeNotificacoes = () => adb('shell', 'cmd', 'statusbar', 'expand-notifications');

/** O cidadao le a notificacao, toca nela e cai no detalhe da demanda. */
const cidadaoVeANotificacao = ({ tituloDaNotificacao, corpoDaNotificacao, titulo, rotuloNovo }) =>
  executarFluxo(FLUXOS.verNotificacao, {
    TITULO_NOTIFICACAO: tituloDaNotificacao,
    CORPO_NOTIFICACAO: corpoDaNotificacao,
    TITULO: titulo,
    ROTULO_NOVO: rotuloNovo,
  });

/** Fecha o app ao fim do cenario, para o proximo comecar do zero. */
const fecharApp = () => adb('shell', 'am', 'force-stop', APP.pacote);

module.exports = {
  FLUXOS,
  cidadaoEntraEAcompanha,
  cidadaoRecarregaALista,
  abrirGavetaDeNotificacoes,
  cidadaoVeANotificacao,
  fecharApp,
};
