require('dotenv').config();
const express = require('express');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = (process.env.JWT_SECRET || 'dev-secret-change-me-min-32-chars').trim();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function authMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ message: 'Não autenticado' });
  }
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ message: 'Sessão expirada' });
  }
}

app.get('/api/health', async (_req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({ status: 'ok', database: 'financeflow' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ message: 'Email e senha são obrigatórios' });
  }

  try {
    const result = await db.query(
      `SELECT id, email, "passwordHash", name FROM users WHERE email = $1 LIMIT 1`,
      [email.trim()],
    );

    const user = result.rows[0];
    if (!user) {
      return res.status(401).json({ message: 'Email ou senha incorretos' });
    }

    let valid = false;
    try {
      valid = await bcrypt.compare(password, user.passwordHash);
    } catch {
      valid = false;
    }

    if (!valid) {
      return res.status(401).json({ message: 'Email ou senha incorretos' });
    }

    const token = jwt.sign(
      { sub: user.id, email: user.email, name: user.name },
      JWT_SECRET,
      { expiresIn: '7d' },
    );

    res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (err) {
    console.error('Erro no login:', err.message);
    res.status(500).json({ message: 'Erro interno. Rode: npm run setup' });
  }
});

app.get('/api/me', authMiddleware, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, email, name FROM users WHERE id = $1 LIMIT 1`,
      [req.user.sub],
    );
    const user = result.rows[0];
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }
    res.json(user);
  } catch (err) {
    console.error('Erro /api/me:', err.message);
    res.status(500).json({ message: 'Erro interno' });
  }
});

app.get('/api/dashboard', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.sub;

    const [incomes, expenses, categories] = await Promise.all([
      db.query(
        `SELECT COALESCE(SUM(amount), 0) AS total FROM incomes WHERE "userId" = $1`,
        [userId],
      ).catch(() => ({ rows: [{ total: 0 }] })),
      db.query(
        `SELECT COALESCE(SUM(amount), 0) AS total FROM expenses WHERE "userId" = $1`,
        [userId],
      ).catch(() => ({ rows: [{ total: 0 }] })),
      db.query(
        `SELECT COUNT(*) AS total FROM categories WHERE "userId" = $1`,
        [userId],
      ).catch(() => ({ rows: [{ total: 0 }] })),
    ]);

    const totalIncome = Number(incomes.rows[0]?.total || 0);
    const totalExpense = Number(expenses.rows[0]?.total || 0);

    res.json({
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
      categories: Number(categories.rows[0]?.total || 0),
    });
  } catch (err) {
    console.error('Erro dashboard:', err.message);
    res.json({ totalIncome: 0, totalExpense: 0, balance: 0, categories: 0 });
  }
});

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log('');
  console.log('========================================');
  console.log('  FinanceFlow rodando!');
  console.log(`  Site:  http://localhost:${PORT}`);
  console.log(`  Login: http://localhost:${PORT}`);
  console.log('========================================');
  console.log('');
});
