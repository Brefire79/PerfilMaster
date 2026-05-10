#!/usr/bin/env node
/**
 * bump-version.mjs
 *
 * Atualiza a versão do app em todos os lugares que precisam estar sincronizados:
 *   - package.json
 *   - public/version.json (com data de build)
 *   - public/sw.js (constante APP_VERSION)
 *   - src/hooks/usePwaUpdate.js (constante APP_VERSION)
 *
 * Uso:
 *   node scripts/bump-version.mjs            # patch (1.0.0 → 1.0.1)
 *   node scripts/bump-version.mjs minor      # minor (1.0.0 → 1.1.0)
 *   node scripts/bump-version.mjs major      # major (1.0.0 → 2.0.0)
 *   node scripts/bump-version.mjs 1.2.3      # versão específica
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

function readJSON(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}
function writeJSON(path, data) {
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
}

function bump(version, kind) {
  if (/^\d+\.\d+\.\d+$/.test(kind)) return kind;
  const [major, minor, patch] = version.split('.').map(Number);
  if (kind === 'major') return `${major + 1}.0.0`;
  if (kind === 'minor') return `${major}.${minor + 1}.0`;
  return `${major}.${minor}.${patch + 1}`;
}

function replaceVersionInFile(filePath, regex, replacer) {
  const content = readFileSync(filePath, 'utf8');
  const next = content.replace(regex, replacer);
  if (next === content) {
    console.warn(`⚠  Nenhuma substituição feita em ${filePath}`);
    return false;
  }
  writeFileSync(filePath, next);
  return true;
}

const kind = process.argv[2] || 'patch';

const pkgPath = resolve(ROOT, 'package.json');
const pkg = readJSON(pkgPath);
const oldVersion = pkg.version;
const newVersion = bump(oldVersion, kind);
const buildDate = new Date().toISOString();

console.log(`\n🚀 Bumping version: ${oldVersion} → ${newVersion}\n`);

// 1) package.json
pkg.version = newVersion;
writeJSON(pkgPath, pkg);
console.log('✓ package.json');

// 2) public/version.json
const versionJsonPath = resolve(ROOT, 'public/version.json');
let notes = '';
try {
  notes = readJSON(versionJsonPath).notes || '';
} catch {
  /* ignore */
}
writeJSON(versionJsonPath, { version: newVersion, buildDate, notes });
console.log('✓ public/version.json');

// 3) public/sw.js
replaceVersionInFile(
  resolve(ROOT, 'public/sw.js'),
  /const APP_VERSION = ['"][^'"]+['"];/,
  `const APP_VERSION = '${newVersion}';`
);
console.log('✓ public/sw.js');

// 4) src/hooks/usePwaUpdate.js
replaceVersionInFile(
  resolve(ROOT, 'src/hooks/usePwaUpdate.js'),
  /const APP_VERSION = ['"][^'"]+['"];/,
  `const APP_VERSION = '${newVersion}';`
);
console.log('✓ src/hooks/usePwaUpdate.js');

console.log(`\n✅ Versão ${newVersion} aplicada. Não esqueça de:`);
console.log(`   1. Editar public/version.json para colocar as 'notes' da release`);
console.log(`   2. npm run build`);
console.log(`   3. Deploy\n`);
