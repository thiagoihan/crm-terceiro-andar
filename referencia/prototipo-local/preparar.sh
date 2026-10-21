#!/usr/bin/env bash
# Gera uma cópia do protótipo para abrir no navegador, fora do Claude (modo local).
# Uso: bash referencia/prototipo-local/preparar.sh   (a partir da raiz do pacote)
set -euo pipefail
cd "$(dirname "$0")"
SRC=../../fonte-original/crm.html
# 1) doctype + viewport (o Claude acrescenta isso ao publicar)
# 2) simula uma conta logada ("u1") para ver o "Meu dia" de Ana Carolina nos dados de demonstração
{ echo '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>';
  sed "s/let me={id:null,/let me={id:'u1',/" "$SRC"; } > index.html
node -e "
const d=require('../dados-demonstracao.json');
const js='localStorage.setItem(\"crm-mkt-local-v2\",'+JSON.stringify(JSON.stringify(d.data))+');localStorage.setItem(\"crm-updates-local\",'+JSON.stringify(JSON.stringify(d.ups))+');location.reload();';
require('fs').writeFileSync('carregar-demo.js',js);"
echo "Pronto. Abra referencia/prototipo-local/index.html no navegador."
echo "Para carregar os dados de demonstração: abra o console do navegador (F12), cole o conteúdo de carregar-demo.js e tecle Enter."
