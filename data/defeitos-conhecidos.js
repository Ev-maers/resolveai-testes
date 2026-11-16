/**
 * data/defeitos-conhecidos.js - Registro dos defeitos do produto ja triados.
 *
 * Por que existe: a suite roda contra o back-end real, e o back-end tem
 * defeitos conhecidos. Sem este registro, o quality gate ficaria vermelho em
 * todo pull request por causa dos mesmos defeitos, a squad deixaria de ler o
 * vermelho, e uma regressao nova passaria despercebida no meio deles.
 *
 * O que o registro faz (scripts/quality-gate.js):
 *   - teste reprovado que consta aqui -> "defeito conhecido": nao bloqueia o
 *     merge, mas continua reprovado no relatorio, na anotacao e na issue;
 *   - teste reprovado que NAO consta aqui -> falha nova: bloqueia;
 *   - teste daqui que passou -> o defeito parece corrigido: bloqueia ate a
 *     entrada ser removida, para o registro nunca esconder uma regressao futura
 *     da mesma regra.
 *
 * Quem altera: so por pull request, revisado, depois da triagem descrita em
 * docs/tas.md, secao 9. Cada entrada e uma decisao registrada: o que foi
 * classificado, por quem, quando, com que severidade e prazo, e para quem foi
 * encaminhado. Os testes NAO mudam: o oraculo continua sendo o contrato.
 *
 * Vale so para o alvo "back-end real". Contra o duplo de referencia (verificacao
 * de sensibilidade) nenhum defeito e esperado.
 *
 * Prazos (docs/tas.md, secao 9): severidade alta, 7 dias; media, 14 dias;
 * baixa, 30 dias, contados da triagem.
 */

'use strict';

const ENCAMINHAMENTO = 'squad de back-end (repositorio ndrfelipe/smart-city)';
const TRIAGEM = { em: '2026-11-16', por: 'QA da squad (Evellin Rodrigues)' };

/** @type {Array<{id:string, titulo:string, classificacao:'sut', tipo:string, severidade:'alta'|'media'|'baixa', prazo:string, encaminhamento:string, triagem:{em:string, por:string}, evidencia:string, testes:string[]}>} */
const DEFEITOS = [
  {
    id: 'D-02',
    titulo: 'O access token e aceito como refresh token',
    tipo: 'defeito confirmado (seguranca)',
    severidade: 'alta',
    evidencia: 'auth_service.refresh nao confere o tipo do token; docs/relatorio-qualidade.md, D-02',
    testes: [
      'HU-02 access token nao serve como refresh token',
      'E2E-07 a sessao atravessa a renovacao e termina de verdade no logout',
    ],
  },
  {
    id: 'D-04',
    titulo: 'Nao existe rota para o admin promover um cidadao a gestor',
    tipo: 'divergencia de contrato (README, secao 8.2)',
    severidade: 'media',
    evidencia: 'PATCH /auth/update responde 403 "O perfil de acesso nao pode ser alterado por esta rota"',
    testes: [
      'HU-03 o admin promove um cidadao a gestor',
      'E2E-09 o admin promove o servidor novo a gestor e a permissao muda de verdade',
    ],
  },
  {
    id: 'D-05',
    titulo: 'Gestor consegue registrar demanda',
    tipo: 'defeito confirmado (autorizacao)',
    severidade: 'alta',
    evidencia: 'POST /api/demandas nao restringe o perfil; README, secao 8.2',
    testes: ['HU-03 so o cidadao registra demanda: os demais perfis recebem 403'],
  },
  {
    id: 'D-06',
    titulo: 'Demanda de outro cidadao responde 403 em vez de 404',
    tipo: 'defeito confirmado (seguranca: enumeracao)',
    severidade: 'alta',
    evidencia: 'GET e DELETE /api/demandas/{id} de terceiro respondem 403 "Acesso negado."',
    testes: [
      'HU-03 demanda de terceiro e invisivel: leitura e exclusao respondem 404',
      'E2E-04 dois cidadaos usam o sistema e nenhum alcanca o chamado do outro',
    ],
  },
  {
    id: 'D-07',
    titulo: 'Gestor exclui demanda ja concluida',
    tipo: 'defeito confirmado (regra de negocio)',
    severidade: 'alta',
    evidencia: 'demandas_service.deletar_demanda so restringe o cidadao; README, secao 8.2',
    testes: ['HU-14 gestor nao exclui demanda ja concluida'],
  },
  {
    id: 'D-08',
    titulo: 'Nao existe maquina de estados: transicoes invalidas sao aceitas',
    tipo: 'defeito confirmado (regra de negocio)',
    severidade: 'alta',
    evidencia: 'demandas_service.atualizar_demanda aplica qualquer status da lista fechada',
    testes: [
      'HU-13 transicao recusada com 409: repete o status atual',
      'HU-13 transicao recusada com 409: pula uma etapa',
      'HU-13 transicao recusada com 409: volta a um estado anterior',
      'HU-13 transicao recusada com 409: sai de um estado final',
      'E2E-02 o gestor rejeita a demanda e a decisao nao pode ser desfeita',
      'E2E-10 o atalho para resolvido e recusado, o caminho valido conclui e nao ha volta',
    ],
  },
  {
    id: 'D-09',
    titulo: 'Respostas de erro nao trazem codigo legivel por maquina',
    tipo: 'divergencia de contrato (hipotese [B])',
    severidade: 'media',
    evidencia: 'o envelope de erro tem so message e status_code',
    testes: ['CT todo erro traz um code legivel por maquina'],
  },
  {
    id: 'D-10',
    titulo: 'E-mail ja cadastrado responde 400 em vez de 409',
    tipo: 'divergencia de contrato',
    severidade: 'media',
    evidencia: 'POST /auth/register trata duplicidade como erro de validacao',
    testes: [
      'HU-01 e-mail ja cadastrado e recusado com 409',
      'E2E-12 a API recusa todos os erros do usuario sem quebrar, e a jornada conclui',
    ],
  },
  {
    id: 'D-11',
    titulo: 'Resposta 405 sem o cabecalho Allow',
    tipo: 'divergencia de contrato (HTTP, RFC 9110)',
    severidade: 'baixa',
    evidencia: 'os metodos aceitos so aparecem no corpo JSON',
    testes: ['CT metodo nao suportado responde 405 com o header Allow'],
  },
  {
    id: 'D-12',
    titulo: 'Erros de validacao usam 400 numa rota e 422 em outra',
    tipo: 'divergencia de contrato',
    severidade: 'baixa',
    evidencia: 'cadastro e login respondem 400; demandas respondem 422',
    testes: ['CT a validacao usa o mesmo status em todas as rotas'],
  },
  {
    id: 'D-13',
    titulo: 'Testes unittest do proprio back-end desatualizados (cadastro)',
    tipo: 'defeito nos testes do produto, nao no comportamento',
    severidade: 'baixa',
    evidencia: 'test_register.py le data.username, mas a resposta do cadastro mudou de formato (KeyError)',
    testes: ['test_register_success', 'test_register_duplicate_username_allowed'],
  },
];

const PRAZO_EM_DIAS = { alta: 7, media: 14, baixa: 30 };

function somarDias(dataIso, dias) {
  const d = new Date(`${dataIso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

const REGISTRO = DEFEITOS.map(d => ({
  classificacao: 'sut',
  encaminhamento: ENCAMINHAMENTO,
  triagem: TRIAGEM,
  prazo: somarDias(TRIAGEM.em, PRAZO_EM_DIAS[d.severidade]),
  alvo: 'back-end real',
  ...d,
}));

/** Defeito registrado para um teste, ou null. */
const defeitoDoTeste = nome => REGISTRO.find(d => d.testes.includes(nome)) ?? null;

module.exports = { REGISTRO, PRAZO_EM_DIAS, defeitoDoTeste, somarDias };
