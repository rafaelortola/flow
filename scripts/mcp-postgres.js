/**
 * Starts the official Postgres MCP server using DATABASE_URL from the project .env.
 * Usage:
 *   node scripts/mcp-postgres.js         # start MCP (stdio, for Cursor)
 *   node scripts/mcp-postgres.js --check  # validate config + DB connection
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
  for (const line of content.split('\n')) {
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

function maskDatabaseUrl(url) {
  try {
    const parsed = new URL(url);
    if (parsed.password) parsed.password = '****';
    return parsed.toString();
  } catch {
    return '(invalid URL)';
  }
}

function resolveMcpServerPath() {
  try {
    return require.resolve('@modelcontextprotocol/server-postgres/dist/index.js');
  } catch {
    console.error('ERROR: @modelcontextprotocol/server-postgres not installed.');
    console.error('Run: pnpm install');
    return null;
  }
}

async function checkDatabaseConnection(url) {
  let Client;
  try {
    ({ Client } = require('pg'));
  } catch {
    console.warn('WARN: pg not installed, skipping DB connection test.');
    return;
  }

  const client = new Client({ connectionString: url });
  try {
    await client.connect();
    await client.query('SELECT 1');
    console.log('OK: PostgreSQL connection successful');
  } finally {
    await client.end().catch(() => undefined);
  }
}

const projectRoot = path.join(__dirname, '..');
loadEnvFile(path.join(projectRoot, '.env'));

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('ERROR: DATABASE_URL not found.');
  console.error(`Expected file: ${path.join(projectRoot, '.env')}`);
  console.error('Run: copy .env.example .env');
  console.error('Then set DATABASE_URL=postgresql://user:pass@localhost:5432/financeflow');
  process.exit(1);
}

const serverPath = resolveMcpServerPath();
if (!serverPath) process.exit(1);

if (process.argv.includes('--check')) {
  (async () => {
    console.log('OK: DATABASE_URL loaded ->', maskDatabaseUrl(databaseUrl));
    console.log('OK: MCP server path ->', serverPath);
    console.log('Project root ->', projectRoot);
    try {
      await checkDatabaseConnection(databaseUrl);
    } catch (err) {
      console.error('ERROR: PostgreSQL connection failed ->', err.message);
      process.exit(1);
    }
  })();
} else {
  console.error('Starting Postgres MCP server...');
  console.error('Database ->', maskDatabaseUrl(databaseUrl));
  console.error('(Process stays open for Cursor MCP. Press Ctrl+C to stop.)');

  const result = spawnSync(process.execPath, [serverPath, databaseUrl], {
    stdio: 'inherit',
    env: process.env,
  });

  if (result.error) {
    console.error('ERROR: Failed to start MCP server:', result.error.message);
    process.exit(1);
  }

  if (result.status !== 0 && result.status !== null) {
    console.error(`ERROR: MCP server exited with code ${result.status}`);
    process.exit(result.status);
  }

  process.exit(0);
}
