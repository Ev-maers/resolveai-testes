/**
 * HU-01 Autocadastro de usuario.
 *
 * Risco: Alto / Probabilidade: Media.
 * O cadastro e a porta de entrada do sistema. O caso de maior consequencia nao
 * e o caminho feliz: e a tentativa de escalonamento de privilegio no proprio
 * corpo do cadastro.
 *
 * Um teste por regra. Quando uma regra tem varias entradas (ex.: tres campos
 * obrigatorios), o teste percorre todas e lista todas que falharem.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');

const api = require('../../api/smart-city');
const insp = require('../../lib/inspecao');
const contrato = require('../../data/contrato');
const usuarios = require('../../data/usuarios');

test('HU-01 cadastro valido cria uma conta que consegue entrar', async () => {
  const novo = usuarios.novo();
  const cadastro = await api.registrar(novo);

  assert.equal(cadastro.status, 201, `esperado 201 no cadastro valido; recebido ${insp.resumo(cadastro)}`);
  const criado = insp.carga(cadastro.body);
  assert.equal(criado.email, novo.email, 'a conta criada nao tem o e-mail enviado');
  assert.ok(criado.id, 'a conta criada nao devolveu identificador');

  // Um 201 que nao produz conta utilizavel e um falso positivo: so o login prova.
  const entrada = await api.login(novo.email, novo.password);
  assert.equal(entrada.status, 200, 'a conta foi criada mas nao autentica');
});

test('HU-01 e-mail ja cadastrado e recusado com 409', async () => {
  const novo = usuarios.novo();
  const primeiro = await api.registrar(novo);
  assert.equal(primeiro.status, 201, 'preparacao: o primeiro cadastro precisava ter sido aceito');

  const repetido = await api.registrar(novo);

  assert.equal(
    repetido.status,
    409,
    `e-mail duplicado e conflito com o estado do recurso (409), nao erro de formato. ` +
    `Recebido: ${insp.resumo(repetido)}`,
  );
});

test('HU-01 o cadastro nao deixa o usuario escolher o proprio perfil', async () => {
  // Escalonamento de privilegio: se o `role` do corpo for aceito, qualquer
  // pessoa vira gestor pela tela publica de cadastro. Risco maximo e invisivel
  // pela interface. Pede GESTOR e nao ADMIN porque o schema real so aceita
  // 'cidadao'/'gestor'/'servidor' no cadastro ([C] em data/contrato.js).
  const novo = usuarios.novo({ role: contrato.PERFIS.GESTOR });
  const cadastro = await api.registrar(novo);
  assert.equal(cadastro.status, 201, 'preparacao: o cadastro precisava ter sido aceito');

  const token = await api.tokenDe({ email: novo.email, senha: novo.password });
  const perfil = insp.carga((await api.meuPerfil(token)).body).role;

  assert.equal(
    perfil,
    contrato.PERFIS.CIDADAO,
    `ESCALONAMENTO DE PRIVILEGIO: o corpo do cadastro pediu ${contrato.PERFIS.GESTOR} e a conta ` +
    `foi criada como ${perfil}. O perfil deve ser atribuido pelo servidor.`,
  );
});

// Uma regra de validacao por teste, gerada da massa (data/usuarios.js).
for (const regra of usuarios.regrasDeValidacao()) {
  test(`HU-01 cadastro recusado: ${regra.regra}`, async () => {
    const violacoes = [];

    for (const caso of regra.casos) {
      const { status, body } = await api.registrar(caso.corpo);

      if (!contrato.STATUS_VALIDACAO.includes(status)) {
        violacoes.push(`${caso.nome}: esperado ${contrato.STATUS_VALIDACAO.join(' ou ')}; recebido ${status}`);
        continue;
      }
      const apontados = insp.camposComErro(body);
      if (!apontados.some(c => c.includes(caso.campoEsperado))) {
        // Sem apontar o campo, o teste passaria se a API recusasse pelo motivo errado.
        violacoes.push(`${caso.nome}: deveria apontar "${caso.campoEsperado}"; apontou ${JSON.stringify(apontados)}`);
      }
    }

    assert.deepEqual(violacoes, [], `a regra "${regra.regra}" nao foi respeitada:\n${violacoes.join('\n')}`);
  });
}

test('HU-01 senha com exatamente o tamanho minimo e aceita', async () => {
  // Valor limite: a fronteira e inclusiva. Recusar o limite exato e o defeito
  // classico de "off by one", e so um caso na fronteira o encontra.
  const novo = usuarios.novo({ password: usuarios.senhaCom(contrato.LIMITES.senhaMin) });
  const { status, body } = await api.registrar(novo);

  assert.equal(
    status,
    201,
    `senha de ${contrato.LIMITES.senhaMin} caracteres e valida pelo contrato; recebido ${status}: ${JSON.stringify(body)}`,
  );
});
