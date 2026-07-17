require('dotenv').config();
const express = require('express');
const path = require('path');
const db = require('./db');
const { createAuthMiddleware } = require('./middleware/auth');
const authRoutes = require('./routes/auth');
const incomeRoutes = require('./routes/incomes');
const expenseRoutes = require('./routes/expenses');
const dashboardRoutes = require('./routes/dashboard');
const categoryRoutes = require('./routes/categories');
const notesRoutes = require('./routes/notes');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = (
  process.env.JWT_SECRET ||
  process.env.JWT_ACCESS_SECRET ||
  'dev-secret-change-me-min-32-chars'
).trim();
const authMiddleware = createAuthMiddleware(JWT_SECRET);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/health', async (_req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({ status: 'ok', database: 'financeflow' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

app.use('/api', authRoutes(JWT_SECRET, authMiddleware));
app.use('/api/incomes', incomeRoutes(authMiddleware));
app.use('/api/expenses', expenseRoutes(authMiddleware));
app.use('/api/dashboard', dashboardRoutes(authMiddleware));
app.use('/api/categories', categoryRoutes(authMiddleware));
app.use('/api/notes', notesRoutes(authMiddleware));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
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
