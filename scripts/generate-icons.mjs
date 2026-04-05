/**
 * ProfileAI — AMB FUSI
 * Script: Gera ícones PNG para o PWA a partir do favicon.svg
 *
 * Pré-requisito: npm install -g sharp-cli  OU  use o conversor online abaixo
 *
 * Como usar (opção 1 — sharp-cli):
 *   npx sharp-cli -i public/favicon.svg -o public/icons/icon-192x192.png resize 192
 *   npx sharp-cli -i public/favicon.svg -o public/icons/icon-512x512.png resize 512
 *
 * Como usar (opção 2 — online, sem instalar nada):
 *   1. Acesse https://maskable.app/editor  ou  https://realfavicongenerator.net
 *   2. Faça upload do arquivo public/favicon.svg
 *   3. Baixe os ícones nos tamanhos 192x192 e 512x512
 *   4. Salve como public/icons/icon-192x192.png e public/icons/icon-512x512.png
 *
 * Como usar (opção 3 — Node.js com canvas, se tiver o módulo canvas instalado):
 *   node scripts/generate-icons.mjs
 */

import { createCanvas } from 'canvas';
import { writeFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const iconsDir = join(__dirname, '../public/icons');

try {
  mkdirSync(iconsDir, { recursive: true });

  for (const size of [192, 512]) {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');

    // Fundo degradê
    const grad = ctx.createLinearGradient(0, 0, size, size);
    grad.addColorStop(0, '#4338ca');
    grad.addColorStop(1, '#6366f1');

    // Cantos arredondados
    const r = size * 0.22;
    ctx.beginPath();
    ctx.moveTo(r, 0);
    ctx.lineTo(size - r, 0);
    ctx.quadraticCurveTo(size, 0, size, r);
    ctx.lineTo(size, size - r);
    ctx.quadraticCurveTo(size, size, size - r, size);
    ctx.lineTo(r, size);
    ctx.quadraticCurveTo(0, size, 0, size - r);
    ctx.lineTo(0, r);
    ctx.quadraticCurveTo(0, 0, r, 0);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Letra "P"
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${size * 0.55}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('P', size / 2, size / 2 + size * 0.04);

    const buffer = canvas.toBuffer('image/png');
    const outPath = join(iconsDir, `icon-${size}x${size}.png`);
    writeFileSync(outPath, buffer);
    console.log(`✅ Gerado: ${outPath}`);
  }

  console.log('\n✅ Ícones PWA gerados com sucesso!');
} catch (err) {
  console.error('❌ Erro ao gerar ícones:', err.message);
  console.log('\nUse a opção manual descrita no topo deste arquivo.');
  process.exit(1);
}
