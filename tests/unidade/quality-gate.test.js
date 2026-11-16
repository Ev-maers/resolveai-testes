/**
 * Nivel 1 - Unitario: verifica o QUALITY GATE da propria suite. Nao toca no SUT.
 *
 * O gate decide se um pull request pode ser mesclado. Se ele deixasse passar
 * uma falha nova, ou passasse a esconder uma regra que voltou a quebrar, a
 * esteira daria verde pelo motivo errado. Por isso a regra dele tem teste.
 *
 * Uma pergunta, um teste:
 *   U6  o gate so deixa passar o que esta no registro de defeitos conhecidos?
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { avaliar, validarRegistro, ALVO_REAL } = require('../../scripts/quality-gate');
const { REGISTRO } = require('../../data/defeitos-conhecidos');

/** Resultado sintetico de execucao: todos os testes do registro, com o status pedido. */
const execucaoCom = (status, extras = []) => [
  ...REGISTRO.flatMap(d => d.testes.map(nome => ({ nome, status, mensagem: 'esperado X; recebido Y' }))),
  ...extras,
];

test('U6 o gate so deixa passar defeito registrado: falha nova, defeito corrigido e alvo errado bloqueiam', () => {
  const problemas = [];
  const [primeiro] = REGISTRO;
  const testeNovo = { nome: `${primeiro.testes[0]} (variante fora do registro)`, status: 'reprovado', mensagem: 'x' };

  if (validarRegistro().length) problemas.push(`registro invalido: ${validarRegistro().join('; ')}`);

  const soConhecidos = avaliar({ casos: execucaoCom('reprovado'), alvo: ALVO_REAL });
  if (soConhecidos.bloqueia) problemas.push(`so defeitos conhecidos e o gate bloqueou: ${soConhecidos.motivos.join('; ')}`);
  if (soConhecidos.defeitosConhecidos.length !== REGISTRO.length) {
    problemas.push(`esperava ${REGISTRO.length} defeitos conhecidos no resultado, veio ${soConhecidos.defeitosConhecidos.length}`);
  }

  const comFalhaNova = avaliar({ casos: execucaoCom('reprovado', [testeNovo]), alvo: ALVO_REAL });
  if (!comFalhaNova.bloqueia) problemas.push('uma falha fora do registro passou pelo gate');

  const corrigido = execucaoCom('reprovado').map(c => (c.nome === primeiro.testes[0] ? { ...c, status: 'aprovado' } : c));
  if (!avaliar({ casos: corrigido, alvo: ALVO_REAL }).bloqueia) {
    problemas.push(`${primeiro.id} passou e o gate nao pediu para tirar a entrada do registro`);
  }

  if (!avaliar({ casos: execucaoCom('reprovado'), alvo: 'duplo de referencia' }).bloqueia) {
    problemas.push('contra o duplo de referencia o registro nao vale, mas o gate deixou passar');
  }

  const ambiente = [{ nome: 'HU-02 qualquer', status: 'reprovado', mensagem: 'SUT inacessivel em http://x (GET): fetch failed' }];
  if (!avaliar({ casos: ambiente, alvo: ALVO_REAL }).bloqueia) problemas.push('falha de ambiente passou pelo gate');

  if (!avaliar({ casos: [], alvo: ALVO_REAL }).bloqueia) problemas.push('execucao sem nenhum caso passou pelo gate');

  assert.deepEqual(problemas, [], `o gate falhou em ${problemas.length} regra(s):\n- ${problemas.join('\n- ')}`);
});
