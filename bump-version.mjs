/**
 * bump-version.mjs
 * Atualiza public/version.json e APP_VERSION em usePwaUpdate.js.
 *
 * Uso:
 *   node bump-version.mjs                        → bump patch (1.0.4 → 1.0.5)
 *   node bump-version.mjs --minor                → bump minor (1.0.4 → 1.1.0)
 *   node bump-version.mjs --major                → bump major (1.0.4 → 2.0.0)
 *   node bump-version.mjs --notes "Fix: bug X"  → adiciona nota de release
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const args = process.argv.slice(2);
const isMinor = args.includes('--minor');
const isMajor = args.includes('--major');
const notesIdx = args.indexOf('--notes');
const notes = notesIdx !== -1 ? args[notesIdx + 1] : '';

// ── Lê versão atual ──────────────────────────────────────────────────────────
const versionPath = resolve(__dirname, 'public/version.json');
const current = JSON.parse(readFileSync(versionPath, 'utf-8'));
const [major, minor, patch] = current.version.split('.').map(Number);

// ── Calcula nova versão ───────────────────────────────────────────────────────
let newVersion;
if (isMajor)       newVersion = `${major + 1}.0.0`;
else if (isMinor)  newVersion = `${major}.${minor + 1}.0`;
else               newVersion = `${major}.${minor}.${patch + 1}`;

const buildDate = new Date().toISOString();

// ── Atualiza public/version.json ─────────────────────────────────────────────
const nextJson = { version: newVersion, buildDate, notes: notes || current.notes };
writeFileSync(versionPath, JSON.stringify(nextJson, null, 2) + '\n');
console.log(`✅ public/version.json → ${newVersion}`);

// ── Atualiza APP_VERSION em usePwaUpdate.js ───────────────────────────────────
const hookPath = resolve(__dirname, 'src/hooks/usePwaUpdate.js');
const hookContent = readFileSync(hookPath, 'utf-8');
const updated = hookContent.replace(
  /const APP_VERSION = '[^']+';/,
  `const APP_VERSION = '${newVersion}';`
);
writeFileSync(hookPath, updated);
console.log(`✅ usePwaUpdate.js APP_VERSION → '${newVersion}'`);

console.log(`\n📦 Versão ${current.version} → ${newVersion}`);
if (notes) console.log(`📝 Notas: ${notes}`);
console.log(`🕒 Build date: ${buildDate}`);
