/**
 * Ensures PostgreSQL is reachable, schema is migrated, and demo data exists.
 * Auto-creates DB user/database when POSTGRES_ADMIN_PASSWORD is set or prompted.
 */
const fs = require('fs');
const path = require('path');
const readline = require('readline');
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

function parseDbUrl(url) {
  const u = new URL(url);
  return {
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    host: u.hostname,
    port: u.port || '5432',
    database: u.pathname.replace(/^\//, ''),
  };
}

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

function appendEnvVar(envPath, key, value) {
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, 'utf8');
  if (content.includes(`${key}=`)) return;
  fs.appendFileSync(envPath, `\n${key}=${value}\n`, 'utf8');
}

async function provisionPostgres(Client, dbConfig, adminPassword) {
  const adminUser = process.env.POSTGRES_ADMIN_USER || 'postgres';
  const adminUrl = `postgresql://${adminUser}:${encodeURIComponent(adminPassword)}@${dbConfig.host}:${dbConfig.port}/postgres`;

  console.log(`\nCriando usuario '${dbConfig.user}' e banco '${dbConfig.database}'...`);

  const admin = new Client({ connectionString: adminUrl });
  await admin.connect();

  const safeUser = dbConfig.user.replace(/"/g, '');
  const safeDb = dbConfig.database.replace(/"/g, '');
  const safePass = dbConfig.password.replace(/'/g, "''");

  await admin.query(`
    DO $$ BEGIN
      CREATE ROLE "${safeUser}" WITH LOGIN PASSWORD '${safePass}';
    EXCEPTION WHEN duplicate_object THEN
      ALTER ROLE "${safeUser}" WITH LOGIN PASSWORD '${safePass}';
    END $$;
  `);

  const exists = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [safeDb]);
  if (exists.rowCount === 0) {
    await admin.query(`CREATE DATABASE "${safeDb}" OWNER "${safeUser}"`);
  }

  await admin.query(`GRANT ALL PRIVILEGES ON DATABASE "${safeDb}" TO "${safeUser}"`);
  await admin.end();

  console.log('Banco e usuario criados com sucesso!');
}

async function testConnection(Client, url) {
  const client = new Client({ connectionString: url });
  await client.connect();
  await client.query('SELECT 1');
  await client.end();
}

async function ensure() {
  console.log('\n=== FinanceFlow: conectando ao banco ===\n');

  let envPath = loadEnv() || findEnvFile();
  if (!envPath) {
    const example = path.join(root, '.env.example');
    if (fs.existsSync(example)) {
      fs.copyFileSync(example, path.join(root, '.env'));
      envPath = path.join(root, '.env');
      loadEnv();
      console.log('Criado .env a partir de .env.example');
    }
  }

  if (!process.env.DATABASE_URL) {
    console.error('\nERRO: DATABASE_URL nao definida.\n');
    process.exit(1);
  }

  console.log('DATABASE_URL ->', maskUrl(process.env.DATABASE_URL));
  const dbConfig = parseDbUrl(process.env.DATABASE_URL);

  console.log('\n[1/4] Prisma generate + build...');
  run('pnpm --filter @financeflow/database generate');
  run('pnpm --filter @financeflow/database build');

  let Client;
  try {
    ({ Client } = require('pg'));
  } catch {
    console.error('ERRO: pacote pg nao instalado. Rode: pnpm install');
    process.exit(1);
  }

  console.log('\n[2/4] Testando conexao PostgreSQL...');
  try {
    await testConnection(Client, process.env.DATABASE_URL);
    console.log('Conexao OK');
  } catch (err) {
    const msg = err.message || '';
    const needsProvision =
      msg.includes('does not exist') ||
      msg.includes('nao existe') ||
      msg.includes('não existe') ||
      msg.includes('password authentication failed');

    if (!needsProvision) {
      console.error('\nERRO:', msg);
      console.error('Verifique se PostgreSQL esta rodando.\n');
      process.exit(1);
    }

    let adminPassword = process.env.POSTGRES_ADMIN_PASSWORD || '';
    if (!adminPassword && process.stdin.isTTY) {
      console.log('\nUsuario/banco financeflow ainda nao existe no Postgres.');
      adminPassword = await ask('Senha do usuario postgres (Enter para cancelar): ');
    }

    if (!adminPassword) {
      console.error('\nERRO:', msg);
      console.error('\nAdicione no .env: POSTGRES_ADMIN_PASSWORD=sua_senha_postgres');
      console.error('Ou rode: .\\scripts\\setup-all.ps1 -PostgresPassword "SUA_SENHA"\n');
      process.exit(1);
    }

    try {
      await provisionPostgres(Client, dbConfig, adminPassword);
      if (envPath) appendEnvVar(envPath, 'POSTGRES_ADMIN_PASSWORD', adminPassword);
      await testConnection(Client, process.env.DATABASE_URL);
      console.log('Conexao OK');
    } catch (provisionErr) {
      console.error('\nERRO ao criar banco:', provisionErr.message);
      console.error('Senha do postgres correta?\n');
      process.exit(1);
    }
  }

  console.log('\n[3/4] Aplicando migrations...');
  run('pnpm --filter @financeflow/database exec prisma migrate deploy');

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
