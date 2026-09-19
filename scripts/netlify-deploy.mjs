// Deploy no Netlify com a conta DO PROJETO, não com a conta logada no CLI.
//
// O login do `netlify` CLI é global na máquina e aqui há outras contas logadas
// (o site perfilmaster.netlify.app pertence a breno.luis@gmail.com). Em vez de
// depender de `netlify login`, este script lê NETLIFY_AUTH_TOKEN do .env.local
// (gitignored) e passa ao CLI, que dá prioridade ao token sobre a sessão.
//
// Antes de publicar, confere que o token pertence à conta esperada — um token
// errado aborta em vez de mandar o site para outro lugar.
//
// Uso: node scripts/netlify-deploy.mjs [--prod]
// Setup (uma vez): Netlify → User settings → Applications → Personal access
// tokens → New → colar em profileai/.env.local como NETLIFY_AUTH_TOKEN=...
import { readFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const CONTA_ESPERADA = 'breno.luis@gmail.com';
const SITE_ID = '2458565a-55ab-4476-8e88-4f8ad2270d01'; // perfilmaster.netlify.app

function lerEnvLocal() {
  const arquivo = join(raiz, '.env.local');
  if (!existsSync(arquivo)) return {};
  const out = {};
  for (const linha of readFileSync(arquivo, 'utf8').split(/\r?\n/)) {
    const m = linha.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/i);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return out;
}

const env = lerEnvLocal();
const token = process.env.NETLIFY_AUTH_TOKEN || env.NETLIFY_AUTH_TOKEN;
if (!token) {
  console.error(
    '\n✖ NETLIFY_AUTH_TOKEN não encontrado.\n' +
    '  Crie um Personal Access Token na conta ' + CONTA_ESPERADA + ' em\n' +
    '  https://app.netlify.com/user/applications#personal-access-tokens\n' +
    '  e salve em profileai/.env.local:  NETLIFY_AUTH_TOKEN=seu_token\n',
  );
  process.exit(1);
}

const netlifyEnv = { ...process.env, NETLIFY_AUTH_TOKEN: token, NETLIFY_SITE_ID: SITE_ID };
const bin = process.platform === 'win32' ? 'npx.cmd' : 'npx';

// 1) Confere a conta dona do token
const quem = spawnSync(bin, ['netlify', 'api', 'getCurrentUser'], { env: netlifyEnv, encoding: 'utf8', shell: true });
let email = '';
try { email = JSON.parse(quem.stdout || '{}').email || ''; } catch { /* stdout não era JSON */ }
if (!email) {
  console.error('\n✖ Não foi possível validar o token no Netlify:\n' + (quem.stderr || quem.stdout));
  process.exit(1);
}
if (email.toLowerCase() !== CONTA_ESPERADA) {
  console.error(`\n✖ O token é da conta ${email}, mas o site é de ${CONTA_ESPERADA}. Deploy abortado.`);
  process.exit(1);
}
console.log(`✔ Netlify autenticado como ${email}`);

// 2) Deploy
const prod = process.argv.includes('--prod');
const args = ['netlify', 'deploy', '--dir=dist', '--site=' + SITE_ID, ...(prod ? ['--prod'] : [])];
const r = spawnSync(bin, args, { env: netlifyEnv, stdio: 'inherit', shell: true });
process.exit(r.status ?? 1);
