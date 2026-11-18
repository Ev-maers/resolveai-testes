/**
 * scripts/baixar-expo-go.js - Baixa o Expo Go compativel com o SDK do app.
 *
 * O Expo Go so abre projetos do mesmo SDK. A versao vem do proprio app
 * (node_modules/expo/package.json) e o endereco do APK vem da API publica de
 * versoes da Expo, a mesma que o `expo` CLI consulta.
 *
 * Uso: node scripts/baixar-expo-go.js <pasta-do-app> <destino.apk>
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

async function main() {
  const [pastaDoApp, destino] = process.argv.slice(2);
  if (!pastaDoApp || !destino) {
    throw new Error('uso: node scripts/baixar-expo-go.js <pasta-do-app> <destino.apk>');
  }

  const { version } = JSON.parse(
    fs.readFileSync(path.join(pastaDoApp, 'node_modules', 'expo', 'package.json'), 'utf8'),
  );
  const sdk = `${version.split('.')[0]}.0.0`;

  const resposta = await fetch('https://api.expo.dev/v2/versions/latest');
  if (!resposta.ok) throw new Error(`a API de versoes da Expo respondeu ${resposta.status}`);
  const versoes = await resposta.json();
  const dados = versoes?.data?.sdkVersions?.[sdk];
  if (!dados?.androidClientUrl) {
    throw new Error(`nao ha Expo Go para Android publicado para o SDK ${sdk} (expo ${version})`);
  }

  console.log(`app usa expo ${version} (SDK ${sdk}); Expo Go ${dados.androidClientVersion ?? '?'}`);
  const apk = await fetch(dados.androidClientUrl);
  if (!apk.ok) throw new Error(`download do Expo Go respondeu ${apk.status}`);
  fs.mkdirSync(path.dirname(path.resolve(destino)), { recursive: true });
  fs.writeFileSync(destino, Buffer.from(await apk.arrayBuffer()));
  console.log(`Expo Go salvo em ${destino} (${fs.statSync(destino).size} bytes)`);
}

main().catch(erro => {
  console.error(erro.message);
  process.exitCode = 1;
});
