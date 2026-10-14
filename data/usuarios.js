/**
 * data/usuarios.js - Massa de dados de cadastro.
 *
 * Os identificadores dos usuarios que ja existem no ambiente ficam em
 * lib/config.js, porque sao configuracao. Aqui ficam apenas os dados de
 * usuarios NOVOS, criados pelo proprio teste.
 */

const contrato = require('./contrato');

/**
 * E-mail unico por execucao. Sem isso, o teste de cadastro passa na primeira
 * execucao e falha em todas as seguintes por e-mail duplicado, e o time
 * aprende a ignorar o vermelho.
 */
const emailNovo = (prefixo = 'qa') =>
  `${prefixo}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}@exemplo.com`;

/**
 * Cadastro que satisfaz todas as regras do contrato.
 *
 * Campo `username` (nao `name`): confirmado em schemas/user_schema.py do
 * back-end real [C] em data/contrato.js.
 */
const novo = (extra = {}) => ({
  username: 'Usuario de Teste QA',
  email: emailNovo(),
  password: 'SenhaValida123',
  ...extra,
});

const senhaCom = n => 'a'.repeat(n);

const semCampo = campo => {
  const u = novo();
  delete u[campo];
  return u;
};

/**
 * Regras de validacao do cadastro, cada uma com os casos que a exercitam e o
 * campo que a API deve apontar.
 */
const regrasDeValidacao = () => [
  {
    regra: 'senha abaixo do minimo',
    casos: [
      {
        nome: `senha com ${contrato.LIMITES.senhaMin - 1} caracteres`,
        corpo: novo({ password: senhaCom(contrato.LIMITES.senhaMin - 1) }),
        campoEsperado: 'password',
      },
    ],
  },
  {
    regra: 'e-mail sem formato valido',
    casos: [{ nome: 'e-mail sem arroba', corpo: novo({ email: 'nao-e-um-email' }), campoEsperado: 'email' }],
  },
  {
    regra: 'campos obrigatorios ausentes',
    casos: ['username', 'email', 'password'].map(campo => ({
      nome: `sem ${campo}`,
      corpo: semCampo(campo),
      campoEsperado: campo,
    })),
  },
];

module.exports = { emailNovo, novo, senhaCom, regrasDeValidacao };
