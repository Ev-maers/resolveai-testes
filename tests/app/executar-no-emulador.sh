#!/usr/bin/env bash
# Roda o E2E-13 dentro do emulador Android ja ligado (chamado pelo workflow
# e2e-app). Fica num arquivo so porque o android-emulator-runner executa cada
# linha do `script` num shell separado.
set -euo pipefail

: "${EXPO_GO_APK:?defina EXPO_GO_APK com o caminho do APK do Expo Go}"

adb wait-for-device
echo "emulador: $(adb shell getprop ro.build.version.release) (API $(adb shell getprop ro.build.version.sdk))"

adb install -r "$EXPO_GO_APK"
export MAESTRO_CLI_NO_ANALYTICS=1
# Buffer maior para o logcat guardar a execucao inteira (usado no diagnostico).
adb logcat -G 16M || true
# Estado de primeiro uso: sem dados do Expo Go e sem a permissao de notificacao.
# O cidadao a concede na tela, no dialogo do Android, como qualquer pessoa no
# primeiro uso (fluxo 01). Conceder antes pelo adb nao serve: o Expo Go guarda
# a permissao por projeto, e o pedido do app cairia num caminho que a pessoa
# real nunca percorre.
adb shell pm clear host.exp.exponent || true
adb shell pm revoke host.exp.exponent android.permission.POST_NOTIFICATIONS 2>/dev/null || true

mkdir -p evidencias/app
# Video da execucao inteira, como evidencia (limite do Android: 3 minutos).
adb shell screenrecord --time-limit 180 /sdcard/e2e13.mp4 &
GRAVACAO=$!

set +e
node scripts/executar-suite.js --nivel app --junit evidencias/app.xml \
  tests/app/e2e13-notificacao-de-status.app.js
CODIGO=$?
set -e

adb shell pkill -INT screenrecord 2>/dev/null || true
wait "$GRAVACAO" 2>/dev/null || true
adb pull /sdcard/e2e13.mp4 evidencias/app/e2e13-execucao.mp4 || true
adb exec-out screencap -p > evidencias/app/estado-final.png || true
# Folha de quadros do video (um quadro a cada 3 s): mostra a execucao inteira
# numa imagem so, inclusive dialogos que aparecem e somem entre dois comandos.
if command -v ffmpeg >/dev/null && [ -s evidencias/app/e2e13-execucao.mp4 ]; then
  ffmpeg -loglevel error -y -i evidencias/app/e2e13-execucao.mp4 \
    -vf "fps=1/3,scale=128:-1,tile=10x6:padding=2" -frames:v 1 \
    evidencias/app/e2e13-quadros.png || true
fi

if [ "$CODIGO" -ne 0 ]; then
  bash tests/app/diagnosticar.sh
fi

# Capturas que o Maestro grava sozinho quando um comando falha.
if [ -d "$HOME/.maestro/tests" ]; then
  mkdir -p evidencias/app/maestro-debug
  find "$HOME/.maestro/tests" -name '*.png' -exec cp {} evidencias/app/maestro-debug/ \; 2>/dev/null || true
fi

exit "$CODIGO"
