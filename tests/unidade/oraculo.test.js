/**
 * Nivel 1 - Unitario: verifica o ORACULO da propria suite. Nao toca no SUT.
 *
 * O que esta camada protege: um gabarito incoerente faz a suite aprovar ou
 * reprovar o produto pelo motivo errado, e essa e a falha mais cara de
 * descobrir porque nao aparece como falha. Por isso estes testes rodam antes de
 * qualquer servidor subir.
 *
 * A regra de negocio do back-end (a maquina de estados real) NAO e verificada
 * aqui: ela vive no Flask, em Python. Os testes unittest do proprio back-end
 * rodam no workflow "suite-contra-backend-real".
 *
 * Cinco perguntas, uma por teste:
 *   U1  a tabela de transicoes esta completa?
 *   U2  toda transicao recusada tem uma razao, e os estados finais nao tem saida?
 *   U3  todo estado e alcancavel (senao nao ha como preparar o cenario)?
 *   U4  a massa de dados e coerente com o contrato?
 *   U5  a matriz de autorizacao esta completa e rastreavel?
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');

const contrato = require('../../data/contrato');
const matriz = require('../../data/matriz-autorizacao');
const demandas = require('../../data/demandas');
const usuarios = require('../../data/usuarios');
const api = require('../../api/smart-city');

test('U1 a tabela de transicoes cobre os 16 pares: 4 permitidos e 12 recusados', () => {
  const pares = contrato.paresDeTransicao();

  assert.equal(pares.length, 16, 'deveria cobrir 4 estados de origem x 4 de destino');
  assert.equal(pares.filter(p => p.permitida).length, 4, 'o contrato permite exatamente 4 transicoes');
  assert.equal(pares.filter(p => !p.permitida).length, 12, 'logo, 12 pares sao recusados');
});

test('U2 toda recusa tem exatamente uma razao, e estado final nao tem saida', () => {
  const grupos = contrato.paresRecusadosPorMotivo();
  const razoes = Object.values(contrato.MOTIVOS_DE_RECUSA);

  // As quatro razoes particionam os 12 pares: nenhum fica sem razao, nenhum tem duas.
  assert.deepEqual(Object.keys(grupos).sort(), [...razoes].sort(), 'toda razao deveria ter ao menos um par');
  assert.equal(Object.values(grupos).flat().length, 12, 'as razoes deveriam cobrir os 12 pares recusados');

  // Estado final nao sai para lugar nenhum.
  for (const final of contrato.ESTADOS_FINAIS) {
    const saidas = contrato.ESTADOS.filter(destino => contrato.transicaoPermitida(final, destino));
    assert.deepEqual(saidas, [], `${final} e estado final, mas o oraculo permite sair para ${saidas}`);
  }
});

test('U3 todo estado e alcancavel a partir do estado inicial', () => {
  // Sem isso, os testes que partem de um estado inalcancavel reprovariam por
  // impossibilidade de montar o cenario, e nao por defeito do produto.
  for (const estado of contrato.ESTADOS) {
    assert.doesNotThrow(
      () => api.caminhoAte(estado),
      `nao ha caminho de transicoes validas do estado inicial ate ${estado}`,
    );
  }
});

test('U4 a massa de dados e coerente com o contrato', () => {
  const d = demandas.valida();
  assert.ok(contrato.CATEGORIAS.includes(d.categoria), 'categoria da massa valida fora da lista fechada');
  assert.ok(contrato.PRIORIDADES.includes(d.prioridade), 'prioridade da massa valida fora da lista fechada');
  assert.ok(
    d.descricao.length >= contrato.LIMITES.descricaoMin && d.descricao.length <= contrato.LIMITES.descricaoMax,
    'descricao da massa valida fora dos limites',
  );
  assert.ok(
    d.localizacao.length >= contrato.LIMITES.localizacaoMin && d.localizacao.length <= contrato.LIMITES.localizacaoMax,
    'localizacao da massa valida fora dos limites',
  );

  // Objeto compartilhado entre testes contamina quem roda depois.
  const primeira = demandas.valida();
  primeira.categoria = 'CONTAMINADA';
  assert.notEqual(demandas.valida().categoria, 'CONTAMINADA', 'valida() esta devolvendo a mesma instancia');
  assert.notEqual(demandas.valida().titulo, demandas.valida().titulo, 'titulos repetidos colidem no back-end real');

  // Todo caso invalido aponta um campo que existe no contrato.
  const camposDeDemanda = new Set(Object.keys(demandas.valida()));
  for (const caso of demandas.invalidas()) {
    assert.ok(camposDeDemanda.has(caso.campoEsperado), `caso "${caso.nome}" aponta campo inexistente`);
  }
  const camposDeCadastro = new Set(Object.keys(usuarios.novo()));
  for (const regra of usuarios.regrasDeValidacao()) {
    for (const caso of regra.casos) {
      assert.ok(camposDeCadastro.has(caso.campoEsperado), `caso "${caso.nome}" aponta campo inexistente`);
    }
  }
});

test('U5 a matriz de autorizacao cobre os perfis, e as pendencias ficam visiveis', () => {
  const celulas = matriz.celulas();
  assert.ok(celulas.length > 0, 'matriz de autorizacao vazia');

  for (const celula of celulas) {
    assert.equal(typeof celula.permitido, 'boolean', `celula ${celula.id} sem veredito`);
    assert.ok(celula.origem, `celula ${celula.id} sem origem: nao e rastreavel ao contrato`);
    assert.ok(
      Object.values(contrato.PERFIS).includes(celula.perfil),
      `celula ${celula.id} usa um perfil que nao existe no contrato`,
    );
  }

  // O que o contrato NAO decide nao e inventado: aparece a cada execucao.
  assert.ok(matriz.NAO_DOCUMENTADO.length > 0);
  for (const pendencia of matriz.NAO_DOCUMENTADO) {
    console.log(`  [PENDENCIA DE CONTRATO ${pendencia.id}] ${pendencia.pergunta}`);
  }
});
