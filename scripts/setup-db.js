/**
 * Cria schema completo + usuário demo + categorias da planilha.
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { pool } = require('../db');

const DEMO_EMAIL = 'demo@financeflow.com';
const DEMO_PASSWORD = 'demo123456';
const DEMO_NAME = 'Usuário Demo';

const EXPENSE_CATEGORIES = [
  'Moradia', 'Pet', 'Investimentos', 'Lanche', 'Empréstimos', 'Uber', 'Reajuste',
  'Saúde', 'Pagamentos', 'Acordo / Dívidas', 'Supermercado', 'Débito Avulso',
  'Presente', 'Vestuário', 'Despesas Rafael', 'Cartão de Crédito', 'Alimentação',
  'Assinatura', 'Salão de Beleza', 'Veículos', 'Compras Casa', 'Lazer', 'Impostos PJ',
  'Combustível', 'Viagem', 'Farmácia', 'Doação', 'Débito à Vista', 'Crédito à Vista',
  'Mesada Duda', 'Pedágio', 'Despesas Duda', 'Anuidade Cartão', 'Juros Cartão',
  'Despesas Erika', 'Ifood', 'C&A', 'Marcado Livre', 'Shoppe', 'Renner', 'Riachuelo',
  'Educação',
];

const INCOME_CATEGORIES = [
  'Salário', 'Freelance', 'Biz', 'EDS', 'DB4SERV', 'Empréstimo', 'Outros',
];

const DEMO_CARDS = [
  { name: 'Nubank', color: '#820AD1', closing_day: 3, due_day: 10 },
  { name: 'Itaú', color: '#EC7000', closing_day: 15, due_day: 22 },
  { name: 'Inter', color: '#FF7A00', closing_day: 1, due_day: 8 },
];

async function tableExists(name) {
  const result = await pool.query(
    `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1`,
    [name],
  );
  return result.rowCount > 0;
}

async function columnExists(table, column) {
  const result = await pool.query(
    `SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2`,
    [table, column],
  );
  return result.rowCount > 0;
}

async function dropLegacyFinanceTables() {
  const legacy = await tableExists('incomes') && !(await columnExists('incomes', 'month'));
  if (legacy) {
    console.log('Migrando: removendo tabelas do schema antigo (Prisma)...');
    await pool.query('DROP TABLE IF EXISTS expenses CASCADE');
    await pool.query('DROP TABLE IF EXISTS incomes CASCADE');
    await pool.query('DROP TABLE IF EXISTS debts CASCADE');
    await pool.query('DROP TABLE IF EXISTS installments CASCADE');
    await pool.query('DROP TABLE IF EXISTS investments CASCADE');
    await pool.query('DROP TABLE IF EXISTS cash_entries CASCADE');
    await pool.query('DROP TABLE IF EXISTS refresh_tokens CASCADE');
  }
}

async function ensureSchema() {
  if (!(await tableExists('users'))) {
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
  }

  await dropLegacyFinanceTables();

  if (!(await tableExists('categories'))) {
    await pool.query(`
      CREATE TABLE categories (
        id TEXT PRIMARY KEY,
        "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'EXPENSE',
        color TEXT,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE("userId", name)
      )
    `);
    console.log('OK: tabela categories criada');
  }

  if (!(await columnExists('categories', 'updatedAt'))) {
    await pool.query(`ALTER TABLE categories ADD COLUMN "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()`);
    console.log('OK: coluna categories.updatedAt adicionada');
  } else {
    await pool.query(`ALTER TABLE categories ALTER COLUMN "updatedAt" SET DEFAULT NOW()`).catch(() => {});
  }

  if (!(await columnExists('categories', 'color'))) {
    await pool.query(`ALTER TABLE categories ADD COLUMN color TEXT`);
    console.log('OK: coluna categories.color adicionada');
  }

  if (!(await tableExists('incomes'))) {
    await pool.query(`
      CREATE TABLE incomes (
        id TEXT PRIMARY KEY,
        "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        month INTEGER NOT NULL,
        year INTEGER NOT NULL,
        source TEXT NOT NULL,
        amount DECIMAL(12,2) NOT NULL,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      )
    `);
    await pool.query(`CREATE INDEX idx_incomes_user_period ON incomes ("userId", year, month)`);
    console.log('OK: tabela incomes criada');
  }

  if (!(await columnExists('incomes', 'category'))) {
    await pool.query(`ALTER TABLE incomes ADD COLUMN category TEXT`);
    console.log('OK: coluna incomes.category adicionada');
  }

  if (!(await tableExists('expenses'))) {
    await pool.query(`
      CREATE TABLE expenses (
        id TEXT PRIMARY KEY,
        "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        month INTEGER NOT NULL,
        year INTEGER NOT NULL,
        due_date DATE,
        name TEXT NOT NULL,
        amount DECIMAL(12,2) NOT NULL,
        category TEXT,
        expense_group TEXT NOT NULL DEFAULT 'essential',
        spending_type TEXT,
        debt_type TEXT,
        installment_info TEXT,
        installment_total INTEGER,
        payment_status TEXT DEFAULT 'Não pago',
        reviewed BOOLEAN DEFAULT false,
        pay_period INTEGER,
        week1_amount DECIMAL(12,2) DEFAULT 0,
        week2_amount DECIMAL(12,2) DEFAULT 0,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      )
    `);
    await pool.query(`CREATE INDEX idx_expenses_user_period ON expenses ("userId", year, month)`);
    await pool.query(`CREATE INDEX idx_expenses_group ON expenses ("userId", year, month, expense_group)`);
    console.log('OK: tabela expenses criada');
  }

  if (!(await columnExists('expenses', 'category'))) {
    await pool.query(`ALTER TABLE expenses ADD COLUMN category TEXT`);
    console.log('OK: coluna expenses.category adicionada');
  }

  if (!(await tableExists('monthly_notes'))) {
    await pool.query(`
      CREATE TABLE monthly_notes (
        id TEXT PRIMARY KEY,
        "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        month INTEGER NOT NULL,
        year INTEGER NOT NULL,
        content TEXT DEFAULT '',
        "updatedAt" TIMESTAMP DEFAULT NOW(),
        UNIQUE("userId", month, year)
      )
    `);
    console.log('OK: tabela monthly_notes criada');
  }

  if (!(await tableExists('category_budgets'))) {
    await pool.query(`
      CREATE TABLE category_budgets (
        id TEXT PRIMARY KEY,
        "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        month INTEGER NOT NULL,
        year INTEGER NOT NULL,
        category TEXT NOT NULL,
        planned DECIMAL(12,2) DEFAULT 0,
        actual DECIMAL(12,2) DEFAULT 0,
        "updatedAt" TIMESTAMP DEFAULT NOW(),
        UNIQUE("userId", month, year, category)
      )
    `);
    console.log('OK: tabela category_budgets criada');
  }

  if (!(await tableExists('cards'))) {
    await pool.query(`
      CREATE TABLE cards (
        id TEXT PRIMARY KEY,
        "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        color TEXT,
        closing_day INTEGER,
        due_day INTEGER,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE("userId", name)
      )
    `);
    console.log('OK: tabela cards criada');
  }

  if (!(await columnExists('expenses', 'card_id'))) {
    await pool.query(`ALTER TABLE expenses ADD COLUMN card_id TEXT REFERENCES cards(id) ON DELETE SET NULL`);
    console.log('OK: coluna expenses.card_id adicionada');
  }
}

async function seedDemoUser() {
  const hash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const existing = await pool.query(`SELECT id FROM users WHERE email = $1`, [DEMO_EMAIL]);

  if (existing.rowCount === 0) {
    const id = 'demo-user-' + Date.now();
    await pool.query(
      `INSERT INTO users (id, email, "passwordHash", name) VALUES ($1, $2, $3, $4)`,
      [id, DEMO_EMAIL, hash, DEMO_NAME],
    );
    console.log('OK: usuário demo criado');
    return id;
  }

  await pool.query(
    `UPDATE users SET "passwordHash" = $1, name = $2, "updatedAt" = NOW() WHERE email = $3`,
    [hash, DEMO_NAME, DEMO_EMAIL],
  );
  console.log('OK: senha do usuário demo atualizada');
  return existing.rows[0].id;
}

async function seedCategories(userId) {
  // Garante constraint para upsert (compatível com schema antigo Prisma)
  await pool.query(`
    DO $$ BEGIN
      ALTER TABLE categories ADD CONSTRAINT categories_userId_name_key UNIQUE ("userId", name);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `).catch(() => {});

  for (const name of EXPENSE_CATEGORIES) {
    const id = `cat-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
    const exists = await pool.query(
      `SELECT id FROM categories WHERE "userId" = $1 AND name = $2`,
      [userId, name],
    );
    if (exists.rowCount === 0) {
      await pool.query(
        `INSERT INTO categories (id, "userId", name, type, "createdAt", "updatedAt")
         VALUES ($1, $2, $3, 'EXPENSE', NOW(), NOW())`,
        [id, userId, name],
      );
    }
  }

  for (const name of INCOME_CATEGORIES) {
    const id = `cat-income-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
    const exists = await pool.query(
      `SELECT id FROM categories WHERE "userId" = $1 AND name = $2`,
      [userId, name],
    );
    if (exists.rowCount === 0) {
      await pool.query(
        `INSERT INTO categories (id, "userId", name, type, "createdAt", "updatedAt")
         VALUES ($1, $2, $3, 'INCOME', NOW(), NOW())`,
        [id, userId, name],
      );
    }
  }

  console.log(`OK: ${EXPENSE_CATEGORIES.length + INCOME_CATEGORIES.length} categorias seed`);
}

async function seedCards(userId) {
  for (const card of DEMO_CARDS) {
    const exists = await pool.query(
      `SELECT id FROM cards WHERE "userId" = $1 AND name = $2`,
      [userId, card.name],
    );
    if (exists.rowCount === 0) {
      const id = `card-${card.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
      await pool.query(
        `INSERT INTO cards (id, "userId", name, color, closing_day, due_day, "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
        [id, userId, card.name, card.color, card.closing_day, card.due_day],
      );
    }
  }
  console.log(`OK: ${DEMO_CARDS.length} cartões seed`);
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('ERRO: DATABASE_URL não definido no .env');
    process.exit(1);
  }

  console.log('Conectando ao PostgreSQL...');
  await pool.query('SELECT 1');
  console.log('OK: conectado ao banco financeflow');

  await ensureSchema();
  const userId = await seedDemoUser();
  await seedCategories(userId);
  await seedCards(userId);

  console.log('');
  console.log('Login demo:');
  console.log(`  Email: ${DEMO_EMAIL}`);
  console.log(`  Senha: ${DEMO_PASSWORD}`);
  console.log('');
  console.log('Próximo passo: npm run import');
}

module.exports = { ensureSchema };

if (require.main === module) {
  main()
    .catch((err) => {
      console.error('ERRO:', err.message);
      process.exit(1);
    })
    .finally(() => pool.end());
}
