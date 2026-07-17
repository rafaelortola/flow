/**
 * Ensures PostgreSQL is reachable, schema is migrated, and demo data exists.
 * Run automatically before `pnpm dev`.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { loadEnv, findEnvFile } = require('./load-env');

const root = path.join(__dirname, '..');

function run(cmd, opts = {}) {
  execSync(cmd, { stdio: 'inherit', cwd: root, env: process.env, ...opts });
}

function maskUrl(url) {
  try {
    const u = new URL(url);
    if (u.password) u.password = '****';
    return u.toString();
  } catch {
    return url;
  }
}

console.log('\n=== FinanceFlow: conectando ao banco ===\n');

// 1. .env
const envPath = loadEnv() || findEnvFile();
if (!envPath) {
  const example = path.join(root, '.env.example');
  if (fs.existsSync(example)) {
    fs.copyFileSync(example, path.join(root, '.env'));
    loadEnv();
    console.log('Criado .env a partir de .env.example');
  }
}

if (!process.env.DATABASE_URL) {
  console.error('\nERRO: DATABASE_URL nao definida.');
  console.error('Windows: .\\scripts\\setup-all.ps1');
  console.error('Ou copie .env.example para .env e ajuste a URL do Postgres.\n');
  process.exit(1);
}

console.log('DATABASE_URL ->', maskUrl(process.env.DATABASE_URL));

// 2. Prisma client
console.log('\n[1/4] Prisma generate + build...');
run('pnpm --filter @financeflow/database generate');
run('pnpm --filter @financeflow/database build');

// 3. Test connection
console.log('\n[2/4] Testando conexao PostgreSQL...');
let Client;
try {
  ({ Client } = require('pg'));
} catch {
  console.error('ERRO: pacote pg nao instalado. Rode: pnpm install');
  process.exit(1);
}

async function ensure() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  try {
    await client.connect();
    await client.query('SELECT 1');
    console.log('Conexao OK');
  } catch (err) {
    console.error('\nERRO: Nao conectou ao PostgreSQL.');
    console.error(err.message);
    console.error('\nWindows — rode UMA VEZ:');
    console.error('  .\\scripts\\setup-all.ps1 -PostgresPassword "SUA_SENHA_POSTGRES"\n');
    process.exit(1);
  } finally {
    await client.end().catch(() => undefined);
  }

  // 4. Migrate
  console.log('\n[3/4] Aplicando migrations...');
  run('pnpm --filter @financeflow/database exec prisma migrate deploy');

  // 5. Seed if empty
  console.log('\n[4/4] Verificando dados iniciais...');
  const check = new Client({ connectionString: process.env.DATABASE_URL });
  try {
    await check.connect();
    const { rows } = await check.query('SELECT COUNT(*)::int AS n FROM users');
    if (rows[0].n === 0) {
      console.log('Banco vazio — criando usuario demo...');
      run('pnpm db:seed');
    } else {
      console.log('Usuarios ja existem — seed ignorado');
    }
  } finally {
    await check.end().catch(() => undefined);
  }

  console.log('\n=== Banco pronto! Subindo app... ===\n');
}

ensure().catch((err) => {
  console.error(err);
  process.exit(1);
});
