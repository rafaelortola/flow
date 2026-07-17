const express = require('express');
const crypto = require('crypto');
const db = require('../db');

function categoryRoutes(authMiddleware) {
  const router = express.Router();
  router.use(authMiddleware);

  router.get('/', async (req, res) => {
    const result = await db.query(
      `SELECT id, name, type FROM categories WHERE "userId" = $1 ORDER BY name`,
      [req.user.sub],
    );
    res.json(result.rows);
  });

  router.get('/options', (_req, res) => {
    res.json({
      spendingTypes: ['Fixas', 'Variáveis', 'Eventuais'],
      debtTypes: ['À vista', 'Parcelado', 'Mensal'],
      paymentStatuses: ['Pago', 'Não pago', 'Em dia', 'Vencido', 'N/A'],
      expenseGroups: [
        { value: 'essential', label: 'Gastos Fixos Essenciais' },
        { value: 'nonessential', label: 'Gastos Fixos Não Essenciais' },
        { value: 'debt', label: 'Gastos de Dívidas' },
        { value: 'card', label: 'Gastos de Cartão' },
      ],
    });
  });

  router.get('/budgets', async (req, res) => {
    const month = parseInt(req.query.month, 10);
    const year = parseInt(req.query.year, 10);
    if (!month || !year) {
      return res.status(400).json({ message: 'month e year são obrigatórios' });
    }
    const result = await db.query(
      `SELECT * FROM category_budgets WHERE "userId" = $1 AND month = $2 AND year = $3 ORDER BY category`,
      [req.user.sub, month, year],
    );
    res.json(result.rows);
  });

  router.put('/budgets', async (req, res) => {
    const { month, year, category, planned, actual } = req.body || {};
    if (!month || !year || !category) {
      return res.status(400).json({ message: 'month, year, category obrigatórios' });
    }
    const id = crypto.randomUUID();
    const result = await db.query(
      `INSERT INTO category_budgets (id, "userId", month, year, category, planned, actual)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT ("userId", month, year, category)
       DO UPDATE SET planned = EXCLUDED.planned, actual = EXCLUDED.actual, "updatedAt" = NOW()
       RETURNING *`,
      [id, req.user.sub, month, year, category, planned || 0, actual || 0],
    );
    res.json(result.rows[0]);
  });

  return router;
}

module.exports = categoryRoutes;
