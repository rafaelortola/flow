/**
 * Cria tabela users (se não existir) e usuário demo.
 * Compatível com banco financeflow existente (Prisma ou novo).
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { pool } = require('../db');

const DEMO_EMAIL = 'demo@financeflow.com';
const DEMO_PASSWORD = 'demo123456';
const DEMO_NAME = 'Usuário Demo';

async function tableExists(name) {
  const result = await pool.query(
    `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1`,
    [name],
  );
  return result.rowCount > 0;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('ERRO: DATABASE_URL não definido no .env');
    process.exit(1);
  }

  console.log('Conectando ao PostgreSQL...');
  await pool.query('SELECT 1');
  console.log('OK: conectado ao banco financeflow');

  const hasUsers = await tableExists('users');

  if (!hasUsers) {
    console.log('Criando tabela users...');
    await pool.query(`
      CREATE TABLE users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        "passwordHash" TEXT NOT NULL,
        name TEXT NOT NULL,
        theme TEXT DEFAULT 'SYSTEM',
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('OK: tabela users criada');
  } else {
    console.log('OK: tabela users já existe');
  }

  const hash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const id = 'demo-user-' + Date.now();

  const existing = await pool.query(`SELECT id FROM users WHERE email = $1`, [DEMO_EMAIL]);

  if (existing.rowCount === 0) {
    await pool.query(
      `INSERT INTO users (id, email, "passwordHash", name) VALUES ($1, $2, $3, $4)`,
      [id, DEMO_EMAIL, hash, DEMO_NAME],
    );
    console.log('OK: usuário demo criado');
  } else {
    await pool.query(
      `UPDATE users SET "passwordHash" = $1, name = $2, "updatedAt" = NOW() WHERE email = $3`,
      [hash, DEMO_NAME, DEMO_EMAIL],
    );
    console.log('OK: senha do usuário demo atualizada');
  }

  console.log('');
  console.log('Login demo:');
  console.log(`  Email: ${DEMO_EMAIL}`);
  console.log(`  Senha: ${DEMO_PASSWORD}`);
  console.log('');
  console.log('Próximo passo: npm run dev');
}

main()
  .catch((err) => {
    console.error('ERRO:', err.message);
    console.error('Verifique DATABASE_URL no .env e se o banco financeflow existe.');
    process.exit(1);
  })
  .finally(() => pool.end());
