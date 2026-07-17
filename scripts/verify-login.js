/**
 * Verifica tabelas essenciais e testa login direto na API (porta 3001).
 * Uso: node scripts/verify-login.js
 */
const fs = require('fs');
const path = require('path');

function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) {
    console.error('ERRO: .env nao encontrado');
    process.exit(1);
  }
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

async function main() {
  loadEnv();

  const port = process.env.PORT || '3001';
  const apiUrl = `http://127.0.0.1:${port}/api/v1`;

  console.log('1) Testando health...');
  const health = await fetch(`${apiUrl}/health`);
  console.log('   Health:', health.status, await health.text());

  console.log('2) Testando login demo...');
  const login = await fetch(`${apiUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'demo@financeflow.com',
      password: 'demo123456',
    }),
  });

  const body = await login.text();
  console.log('   Login:', login.status);
  console.log('   Resposta:', body || '(vazia)');

  if (login.ok) {
    console.log('\nOK: login funcionando!');
    process.exit(0);
  }

  if (login.status === 500 && body.includes('refresh_tokens')) {
    console.log('\nCORRECAO: rode pnpm db:fix');
  } else if (login.status === 401) {
    console.log('\nCORRECAO: rode pnpm db:seed');
  } else if (login.status === 404) {
    console.log('\nCORRECAO: API nao esta rodando. Rode pnpm dev:api');
  }

  process.exit(1);
}

main().catch((err) => {
  console.error('ERRO:', err.message);
  console.error('A API esta rodando? Terminal 1: pnpm dev:api');
  process.exit(1);
});
