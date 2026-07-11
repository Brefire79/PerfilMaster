import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
const srcDir = new URL('../src/', import.meta.url);

async function walk(url) {
  const entries = await readdir(url, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const child = new URL(`${entry.name}${entry.isDirectory() ? '/' : ''}`, url);
    if (entry.isDirectory()) files.push(...await walk(child));
    else files.push(child);
  }
  return files;
}

for (const file of await walk(srcDir)) {
  if (!/\.(js|jsx|ts|tsx)$/.test(file.pathname)) continue;
  const source = await readFile(file, 'utf8');
  assert.ok(!/SUPABASE_SERVICE_ROLE_KEY|DEEPSEEK_API_KEY|AI_API_KEY/.test(source), `Secret de servidor referenciado no frontend: ${file.pathname}`);
  assert.ok(!/VITE_(?:SUPABASE_)?SERVICE/.test(source), `Variável service-role exposta via VITE_: ${file.pathname}`);
}

const functionsSource = await readFile(new URL('../src/firebase/functions.js', import.meta.url), 'utf8');
assert.ok(functionsSource.includes("callFunction('deleteAccount'"), 'deleteAccount deve passar pela Edge Function.');
const deleteSource = await readFile(new URL('../supabase/functions/deleteAccount/index.ts', import.meta.url), 'utf8');
assert.ok(deleteSource.includes('getAuthenticatedUser(req)'), 'deleteAccount deve validar o JWT.');
assert.ok(deleteSource.includes("confirmation !== 'EXCLUIR MINHA CONTA'"), 'deleteAccount deve exigir confirmação explícita.');
assert.ok(deleteSource.includes('account/has-dependencies'), 'Admins com tenant ativo devem ser protegidos.');

const migrations = await readdir(new URL('../supabase/migrations/', import.meta.url));
const latestSecurity = migrations.find((name) => name.endsWith('_harden_security_definer.sql'));
assert.ok(latestSecurity, 'Migração de hardening ausente.');
const migrationSource = await readFile(new URL(`../supabase/migrations/${latestSecurity}`, import.meta.url), 'utf8');
assert.ok(migrationSource.includes('REVOKE EXECUTE ON ALL FUNCTIONS'), 'Execução pública de funções deve ser revogada.');
assert.ok(migrationSource.includes('REVOKE CREATE ON SCHEMA public'), 'Roles não confiáveis não podem criar objetos em public.');

console.log('Contrato de segurança validado.');
