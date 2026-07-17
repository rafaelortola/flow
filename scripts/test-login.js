/**
 * Testa login do usuario demo e mostra a resposta real da API.
 * Uso: node scripts/test-login.js
 */
const fs = require('fs');
const path = require('path');

function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

async function main() {
  loadEnv();
  const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

  console.log('Testando login em', baseUrl);

  const res = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'demo@financeflow.com',
      password: 'demo123456',
    }),
  });

  const text = await res.text();
  console.log('Status:', res.status);
  console.log('Resposta:', text || '(vazia)');

  if (res.ok) {
    console.log('\nOK: login funcionou. Use demo@financeflow.com / demo123456');
    process.exit(0);
  }

  console.log('\nFALHOU. Rode: pnpm db:seed');
  process.exit(1);
}

main().catch((err) => {
  console.error('Erro:', err.message);
  console.error('A API esta rodando? Rode pnpm dev:api em outro terminal.');
  process.exit(1);
});
