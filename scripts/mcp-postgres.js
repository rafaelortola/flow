/**
 * Starts the official Postgres MCP server using DATABASE_URL from the project .env.
 * Usage:
 *   node scripts/mcp-postgres.js         # start MCP (stdio, for Cursor)
 *   node scripts/mcp-postgres.js --check  # validate config only
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

if (process.argv.includes('--check')) {
  console.log('OK: DATABASE_URL loaded ->', maskDatabaseUrl(databaseUrl));
  console.log('Project root ->', projectRoot);
  process.exit(0);
}

console.error('Starting Postgres MCP server...');
console.error('Database ->', maskDatabaseUrl(databaseUrl));
console.error('(Process stays open for Cursor MCP. Press Ctrl+C to stop.)');

const result = spawnSync(
  'npx',
  ['-y', '@modelcontextprotocol/server-postgres', databaseUrl],
  {
    stdio: 'inherit',
    env: process.env,
    shell: true,
    windowsHide: true,
  },
);

if (result.error) {
  console.error('ERROR: Failed to start npx:', result.error.message);
  process.exit(1);
}

if (result.status !== 0 && result.status !== null) {
  console.error(`ERROR: MCP server exited with code ${result.status}`);
  if (result.status === 1) {
    console.error('Tips:');
    console.error('- Is PostgreSQL running?');
    console.error('- Is DATABASE_URL correct in .env?');
    console.error('- Try: node scripts/mcp-postgres.js --check');
  }
  process.exit(result.status);
}

process.exit(0);
