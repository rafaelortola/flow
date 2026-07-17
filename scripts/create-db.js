/**
 * Cria usuario e banco financeflow no Postgres local.
 * Uso: node scripts/create-db.js
 *      node scripts/create-db.js MINHA_SENHA_POSTGRES
 */
const { loadEnv } = require('./load-env');
const path = require('path');

loadEnv({ force: true });

const adminPassword = (process.argv[2] || process.env.POSTGRES_ADMIN_PASSWORD || '').trim();

if (!adminPassword) {
  console.error('Uso: node scripts/create-db.js SENHA_DO_POSTGRES');
  console.error('Ou defina POSTGRES_ADMIN_PASSWORD no .env');
  process.exit(1);
}

process.env.POSTGRES_ADMIN_PASSWORD = adminPassword;

const { execSync } = require('child_process');
const root = path.join(__dirname, '..');

console.log('Criando banco...\n');
execSync('node scripts/ensure-database.js', {
  cwd: root,
  stdio: 'inherit',
  env: process.env,
});
