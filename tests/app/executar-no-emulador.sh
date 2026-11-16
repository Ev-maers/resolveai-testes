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
# A permissao de notificacao (Android 13+) e concedida antes, para o teste nao
# depender do dialogo do sistema. Conceder permissao e preparacao, nao o que
# esta sob teste.
adb shell pm grant host.exp.exponent android.permission.POST_NOTIFICATIONS || true

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

if [ "$CODIGO" -ne 0 ]; then
  bash tests/app/diagnosticar.sh
fi

exit "$CODIGO"
