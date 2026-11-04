/**
 * data/plano-de-testes.js - O plano de testes em forma legivel por maquina.
 *
 * Espelha docs/plano-de-testes.md (total planejado por nivel) e docs/tas.md,
 * secao 4.1 (impacto de cada historia na matriz de risco). As metricas e os
 * relatorios leem daqui para dizer "quanto do plano foi executado" e "em qual
 * historia a falha caiu, e quanto isso pesa".
 *
 * Quando o plano mudar, muda-se aqui e no documento, nos dois lugares.
 */

'use strict';

/** Casos planejados por nivel (docs/plano-de-testes.md). */
const PLANEJADO = Object.freeze({ unidade: 5, api: 53, e2e: 11 });

/**
 * Historias de usuario e grupos de teste. `impacto` vem da matriz de risco;
 * "-" significa que o grupo nao e uma historia do produto (verificacao da TAS).
 */
const HISTORIAS = Object.freeze({
  'HU-01': { titulo: 'Autocadastro', impacto: 'Alto' },
  'HU-02': { titulo: 'Autenticacao e sessao', impacto: 'Alto' },
  'HU-03': { titulo: 'Autorizacao por perfil', impacto: 'Alto' },
  'HU-06': { titulo: 'Registro de demanda', impacto: 'Alto' },
  'HU-09': { titulo: 'Consulta de demandas', impacto: 'Medio' },
  'HU-12': { titulo: 'Filtros da consulta', impacto: 'Medio' },
  'HU-13': { titulo: 'Atualizacao de status e prioridade', impacto: 'Alto' },
  'HU-14': { titulo: 'Exclusao de demanda', impacto: 'Alto' },
  CT: { titulo: 'Contrato transversal da API', impacto: 'Medio' },
  E2E: { titulo: 'Jornadas ponta a ponta', impacto: 'Alto' },
  TAS: { titulo: 'Verificacao da propria suite (oraculo)', impacto: '-' },
});

/** Descobre o nivel e a historia de um caso pelo nome, que sempre comeca pelo prefixo. */
function classificar(nome, arquivo = '') {
  if (/^U\d\b/.test(nome)) return { nivel: 'unidade', historia: 'TAS' };
  if (/^E2E-\d+/.test(nome)) return { nivel: 'e2e', historia: 'E2E' };
  const hu = /^(HU-\d+)/.exec(nome);
  if (hu) return { nivel: 'api', historia: hu[1] };
  if (/^CT\b/.test(nome)) return { nivel: 'api', historia: 'CT' };
  // Sem prefixo reconhecido: o caminho do arquivo decide o nivel.
  const pasta = /tests[\\/](unidade|api|e2e)[\\/]/.exec(arquivo);
  return { nivel: pasta ? pasta[1] : 'outro', historia: 'outra' };
}

module.exports = { PLANEJADO, HISTORIAS, classificar };
