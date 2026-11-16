#!/usr/bin/env bash
# Diagnostico do E2E-13 quando ele reprova. Publica como anotacao do GitHub
# Actions (leitura publica, sem login) o que estava na tela do emulador, o fim
# do log do Maestro e o fim do log do Metro. Sem isso, entender a falha exigiria
# baixar o artefato da execucao.
set -uo pipefail

anotar() { # titulo, arquivo
  [ -s "$2" ] || return 0
  local corpo
  corpo=$(tail -c 6000 "$2" | sed -e 's/%/%25/g' | sed -e ':a;N;$!ba;s/\r//g;s/\n/%0A/g')
  echo "::notice title=$1::$corpo"
}

mkdir -p evidencias/app
adb shell uiautomator dump /sdcard/tela.xml >/dev/null 2>&1 && adb pull /sdcard/tela.xml evidencias/app/tela-final.xml >/dev/null 2>&1
if [ -s evidencias/app/tela-final.xml ]; then
  # Textos e ids visiveis, um por linha: o retrato da tela no momento da falha.
  grep -o -E '(text|resource-id|content-desc)="[^"]+"' evidencias/app/tela-final.xml | sort -u > evidencias/app/tela-final.txt
  anotar "Diagnostico E2E-13: o que estava na tela" evidencias/app/tela-final.txt
fi
anotar "Diagnostico E2E-13: fim do log do Maestro" evidencias/app/maestro.log
anotar "Diagnostico E2E-13: fim do log do Metro" evidencias/app/metro.log
# Notificacoes no aparelho: permissao do Expo Go, canais criados pelo app e
# notificacoes postadas. Diz se o app chegou a criar o aviso.
{
  echo "## permissao POST_NOTIFICATIONS do Expo Go"
  adb shell dumpsys package host.exp.exponent | grep -i "POST_NOTIFICATIONS" | head -n 5
  echo "## notificacoes postadas"
  adb shell cmd notification list 2>/dev/null | head -n 20
  echo "## canais de notificacao criados"
  adb shell dumpsys notification --noredact | grep -i "NotificationChannel{" | grep -i -E "demandas|expo" | cut -c1-200 | head -n 20
  echo "## notificacoes do Expo Go"
  adb shell dumpsys notification --noredact | grep -i -E "Sua demanda|pkg=host.exp.exponent" | cut -c1-300 | head -n 20
} > evidencias/app/notificacoes.txt 2>&1
anotar "Diagnostico E2E-13: notificacoes no aparelho" evidencias/app/notificacoes.txt
# Logcat sem o ruido do Maestro e do uiautomator (que tambem citam o pacote).
adb logcat -d 2>/dev/null | grep -v -E " (Maestro|AccessibilityNodeInfoDumper|AndroidRuntime) " \
  | grep -i -E "ReactNativeJS|Notif|Permission|exponent|expo" | tail -n 150 > evidencias/app/logcat.txt
anotar "Diagnostico E2E-13: logcat (app)" evidencias/app/logcat.txt
exit 0
