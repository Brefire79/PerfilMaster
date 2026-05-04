ÍCONES PWA — ProfileAI
======================

Esta pasta precisa conter dois arquivos PNG para o PWA funcionar:
  - icon-192x192.png
  - icon-512x512.png

COMO GERAR (escolha uma opção):

Opção A — Online (mais fácil, sem instalar nada):
  1. Acesse: https://maskable.app/editor
  2. Faça upload de: public/favicon.svg
  3. Exporte nos tamanhos 192x192 e 512x512
  4. Salve aqui como icon-192x192.png e icon-512x512.png

Opção B — Com sharp-cli:
  npx sharp-cli -i ../favicon.svg -o icon-192x192.png resize 192
  npx sharp-cli -i ../favicon.svg -o icon-512x512.png resize 512

Opção C — Script Node.js (requer módulo 'canvas'):
  npm install canvas
  node scripts/generate-icons.mjs

NOTA: Sem estes ícones o app ainda funciona, mas não terá
ícone personalizado ao ser instalado como PWA.
