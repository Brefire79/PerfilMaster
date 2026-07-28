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

// M4 (auditoria 27/07/2026): changePassword recebia a senha atual e a ignorava.
const authSource = await readFile(new URL('../src/firebase/auth.js', import.meta.url), 'utf8');
assert.ok(
  /export async function changePassword\(currentPassword, newPassword\)/.test(authSource),
  'changePassword deve receber e USAR a senha atual (não `_currentPassword`).'
);
assert.ok(
  /await verifyPassword\(currentPassword\)/.test(authSource),
  'changePassword deve reautenticar com verifyPassword antes de trocar a senha.'
);
assert.ok(
  authSource.includes('export async function definirSenhaAposRecuperacao'),
  'O fluxo de recuperação precisa de função própria (não pode burlar changePassword com senha vazia).'
);

// C1: a camada de rede com timeout não pode ser contornada por fetch direto.
const httpSource = await readFile(new URL('../src/firebase/http.js', import.meta.url), 'utf8');
assert.ok(httpSource.includes('AbortController'), 'fetchComTimeout deve usar AbortController.');
for (const nome of ['firestore.js', 'functions.js', 'auth.js']) {
  const source = await readFile(new URL(`../src/firebase/${nome}`, import.meta.url), 'utf8');
  assert.ok(
    source.includes("from './http.js'"),
    `${nome} deve fazer rede por http.js (timeout), não por fetch direto.`
  );
}

// A4 (Sprint 3): Edge públicas com rate limit e sem vazar erro interno.
// Antes, o catch devolvia (err as Error).message para um chamador ANÔNIMO —
// mensagem do Postgres com nome de tabela, coluna e constraint.
for (const fn of ['buscarPorToken', 'atualizarStatus', 'validateInviteToken']) {
  const source = await readFile(
    new URL(`../supabase/functions/${fn}/index.ts`, import.meta.url), 'utf8'
  );
  assert.ok(
    source.includes('checarRateLimit'),
    `${fn} e publica e precisa de rate limit (_shared/rateLimit.ts).`
  );
  assert.ok(
    !/jsonResponse\(\s*\{[^}]*\(err as Error\)\.message/.test(source),
    `${fn} nao pode devolver err.message para o cliente anonimo.`
  );
}

// O identificador do rate limit nunca pode guardar IP em claro.
const rateSource = await readFile(new URL('../supabase/functions/_shared/rateLimit.ts', import.meta.url), 'utf8');
assert.ok(rateSource.includes('SHA-256'), 'O identificador do rate limit deve ser hash, nunca o IP em claro.');

// M2: a telemetria redige PII no SERVIDOR — não confia no cliente.
const telemetriaSource = await readFile(new URL('../supabase/functions/logClientError/index.ts', import.meta.url), 'utf8');
for (const padrao of ['[email]', '[documento]', '[uuid]']) {
  assert.ok(
    telemetriaSource.includes(padrao),
    `logClientError deve redigir ${padrao} no servidor.`
  );
}

console.log('Contrato de segurança validado.');
