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
adb logcat -d -t 400 2>/dev/null | grep -i -E "ReactNativeJS|expo|exponent|AndroidRuntime" | tail -n 80 > evidencias/app/logcat.txt
anotar "Diagnostico E2E-13: logcat (app)" evidencias/app/logcat.txt
exit 0
