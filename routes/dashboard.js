const express = require('express');
const db = require('../db');

async function monthSummary(userId, month, year) {
  const [incomes, expenses] = await Promise.all([
    db.query(
      `SELECT COALESCE(SUM(amount), 0) AS total FROM incomes WHERE "userId" = $1 AND month = $2 AND year = $3`,
      [userId, month, year],
    ),
    db.query(
      `SELECT expense_group, COALESCE(SUM(amount), 0) AS total
       FROM expenses WHERE "userId" = $1 AND month = $2 AND year = $3
       GROUP BY expense_group`,
      [userId, month, year],
    ),
  ]);

  const receitaBruta = Number(incomes.rows[0]?.total || 0);
  const byGroup = { essential: 0, nonessential: 0, debt: 0, card: 0 };
  for (const row of expenses.rows) {
    byGroup[row.expense_group] = Number(row.total);
  }
  const totalDespesas = Object.values(byGroup).reduce((a, b) => a + b, 0);

  return {
    month,
    year,
    receitaBruta,
    receitaLiquida: receitaBruta,
    gastosEssenciais: byGroup.essential,
    gastosNaoEssenciais: byGroup.nonessential,
    gastosDividas: byGroup.debt,
    gastosCartoes: byGroup.card,
    totalDespesas,
    tendenciaSobra: receitaBruta - totalDespesas,
  };
}

function dashboardRoutes(authMiddleware) {
  const router = express.Router();
  router.use(authMiddleware);

  router.get('/month', async (req, res) => {
    const month = parseInt(req.query.month, 10);
    const year = parseInt(req.query.year, 10);
    if (!month || !year) {
      return res.status(400).json({ message: 'month e year são obrigatórios' });
    }
    const summary = await monthSummary(req.user.sub, month, year);
    res.json(summary);
  });

  router.get('/year', async (req, res) => {
    const year = parseInt(req.query.year, 10) || new Date().getFullYear();
    const months = [];
    for (let m = 1; m <= 12; m++) {
      months.push(await monthSummary(req.user.sub, m, year));
    }
    const totals = months.reduce(
      (acc, m) => {
        acc.receitaBruta += m.receitaBruta;
        acc.totalDespesas += m.totalDespesas;
        acc.tendenciaSobra += m.tendenciaSobra;
        return acc;
      },
      { receitaBruta: 0, totalDespesas: 0, tendenciaSobra: 0 },
    );
    res.json({ year, months, totals });
  });

  // Legacy endpoint
  router.get('/', async (req, res) => {
    const now = new Date();
    const summary = await monthSummary(req.user.sub, now.getMonth() + 1, now.getFullYear());
    res.json({
      totalIncome: summary.receitaBruta,
      totalExpense: summary.totalDespesas,
      balance: summary.tendenciaSobra,
      categories: 0,
    });
  });

  return router;
}

module.exports = dashboardRoutes;
