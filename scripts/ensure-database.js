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

function isPostgresDown(err) {
  const msg = err.message || '';
  const code = err.code || '';
  return code === 'ECONNREFUSED' || msg.includes('ECONNREFUSED') || msg.includes('connect ETIMEDOUT');
}

function canAutoProvision(err) {
  if (isPostgresDown(err)) return false;
  const msg = err.message || '';
  const code = err.code || '';
  // 42704 = undefined_object (role), 3D000 = database does not exist
  if (code === '42704' || code === '3D000' || code === '28P01') return true;
  if (/exist/i.test(msg)) return true;
  if (/existe/i.test(msg)) return true;
  if (/authentication failed/i.test(msg)) return true;
  if (/financeflow/i.test(msg)) return true;
  return true; // qualquer outro erro de conexao: tenta criar se tiver senha admin
}

async function provisionPostgres(Client, dbConfig, adminPassword) {
  const adminUser = (process.env.POSTGRES_ADMIN_USER || 'postgres').trim();
  const adminUrl = `postgresql://${adminUser}:${encodeURIComponent(adminPassword)}@${dbConfig.host}:${dbConfig.port}/postgres`;

  console.log(`\n>>> Criando usuario '${dbConfig.user}' e banco '${dbConfig.database}'...`);

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

  console.log('>>> Banco e usuario criados!');
}

async function testConnection(Client, url) {
  const client = new Client({ connectionString: url });
  await client.connect();
  await client.query('SELECT 1');
  await client.end();
}

async function ensure() {
  console.log('\n=== FinanceFlow: conectando ao banco ===\n');

  let envPath = loadEnv({ force: true }) || findEnvFile();
  if (!envPath) {
    const example = path.join(root, '.env.example');
    if (fs.existsSync(example)) {
      fs.copyFileSync(example, path.join(root, '.env'));
      envPath = path.join(root, '.env');
      loadEnv({ force: true });
      console.log('Criado .env a partir de .env.example');
    }
  } else {
    console.log('.env ->', envPath);
  }

  if (!process.env.DATABASE_URL) {
    console.error('\nERRO: DATABASE_URL nao definida.\n');
    process.exit(1);
  }

  const adminConfigured = Boolean((process.env.POSTGRES_ADMIN_PASSWORD || '').trim());
  console.log('DATABASE_URL ->', maskUrl(process.env.DATABASE_URL));
  console.log('POSTGRES_ADMIN_PASSWORD ->', adminConfigured ? 'configurada' : 'NAO configurada');

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
    console.log('Falha inicial:', err.message);

    if (isPostgresDown(err)) {
      console.error('\nERRO: PostgreSQL nao esta rodando.');
      console.error('Abra "Services" no Windows e inicie postgresql-x64-XX.\n');
      process.exit(1);
    }

    if (!canAutoProvision(err)) {
      console.error('\nERRO:', err.message, '\n');
      process.exit(1);
    }

    let adminPassword = (process.env.POSTGRES_ADMIN_PASSWORD || '').trim();
    if (!adminPassword && process.stdin.isTTY) {
      console.log('\nPreciso da senha do usuario postgres para criar o banco financeflow.');
      adminPassword = (await ask('Senha postgres: ')).trim();
    }

    if (!adminPassword) {
      console.error('\nERRO: POSTGRES_ADMIN_PASSWORD nao encontrada no .env');
      console.error('');
      console.error('Abra o arquivo .env e adicione esta linha (sem aspas):');
      console.error('POSTGRES_ADMIN_PASSWORD=sua_senha_aqui');
      console.error('');
      console.error('Depois rode: pnpm dev\n');
      process.exit(1);
    }

    try {
      await provisionPostgres(Client, dbConfig, adminPassword);
      await testConnection(Client, process.env.DATABASE_URL);
      console.log('Conexao OK');
    } catch (provisionErr) {
      console.error('\nERRO ao criar banco:', provisionErr.message);
      console.error('A senha do postgres esta correta?');
      console.error('Usuario admin:', process.env.POSTGRES_ADMIN_USER || 'postgres', '\n');
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
