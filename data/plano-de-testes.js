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

/**
 * Casos planejados por nivel (docs/plano-de-testes.md).
 * `e2e` sao as jornadas pela API; `app` e o E2E pela interface do app.
 */
const PLANEJADO = Object.freeze({ unidade: 6, api: 53, e2e: 11, app: 1 });

/** Ordem e nome de exibicao dos niveis, usados por metricas e relatorios. */
const NIVEIS = Object.freeze(['unidade', 'api', 'e2e', 'app']);

/**
 * Historico do tamanho do plano. Toda mudanca no PLANEJADO acrescenta uma linha
 * aqui; se o plano diminuir, a linha precisa dizer o risco assumido. A
 * verificacao da politica (scripts/verificar-politica.js, regra P6) reprova se
 * o total acima nao bater com a ultima linha: e assim que nenhum teste some
 * sem decisao registrada (docs/tas.md, secao 9.6).
 */
const HISTORICO_DO_PLANO = Object.freeze([
  {
    data: '2026-09-09',
    total: 106,
    decisao: 'squad (entrega da U1)',
    registro: 'docs/entrega.md',
    mudanca: '98 testes de API e 8 de verificacao da TAS',
  },
  {
    data: '2026-10-14',
    total: 69,
    decisao: 'squad',
    registro: 'docs/matriz-de-cobertura.md, secao 6',
    mudanca: 'reorganizacao por regra: um teste por regra, mesma cobertura dos 16 pares e das validacoes',
    riscoAssumido: 'nenhuma regra ficou sem teste dono; testes repetidos e campos inexistentes no produto sairam',
  },
  {
    data: '2026-11-16',
    total: 71,
    decisao: 'QA da squad, a partir do feedback da professora',
    registro: 'docs/tas.md, secao 6 (itens 15 e 16 do backlog)',
    mudanca: '+U6 (regra do quality gate) e +E2E-13 (notificacao verificada pela interface do app)',
  },
]);

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

/**
 * Descobre o nivel e a historia de um caso. O teste pela interface e
 * reconhecido pela pasta (tests/app/), porque o nome dele tambem comeca por
 * E2E-; os demais, pelo prefixo do nome.
 */
function classificar(nome, arquivo = '') {
  if (/tests[\\/]app[\\/]/.test(arquivo)) return { nivel: 'app', historia: 'E2E' };
  if (/^U\d\b/.test(nome)) return { nivel: 'unidade', historia: 'TAS' };
  if (/^E2E-\d+/.test(nome)) return { nivel: 'e2e', historia: 'E2E' };
  const hu = /^(HU-\d+)/.exec(nome);
  if (hu) return { nivel: 'api', historia: hu[1] };
  if (/^CT\b/.test(nome)) return { nivel: 'api', historia: 'CT' };
  // Sem prefixo reconhecido: o caminho do arquivo decide o nivel.
  const pasta = /tests[\\/](unidade|api|e2e)[\\/]/.exec(arquivo);
  return { nivel: pasta ? pasta[1] : 'outro', historia: 'outra' };
}

module.exports = { PLANEJADO, NIVEIS, HISTORICO_DO_PLANO, HISTORIAS, classificar };
