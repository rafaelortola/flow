/**
 * Loads .env from monorepo root (works from any package cwd).
 */
const fs = require('fs');
const path = require('path');

function findEnvFile() {
  let dir = process.cwd();
  for (let i = 0; i < 6; i++) {
    const candidate = path.join(dir, '.env');
    if (fs.existsSync(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  // fallback: repo root relative to this script
  const fromScript = path.join(__dirname, '..', '.env');
  if (fs.existsSync(fromScript)) return fromScript;
  return null;
}

function loadEnv(options = {}) {
  const { force = false } = options;
  const envPath = findEnvFile();
  if (!envPath) return null;

  const content = fs.readFileSync(envPath, 'utf8').replace(/^\uFEFF/, '');
  for (const line of content.split(/\r?\n/)) {
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
    if (force || process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
  return envPath;
}

module.exports = { loadEnv, findEnvFile };
