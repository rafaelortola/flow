const express = require('express');
const { monthSummary, yearMonthSummaries } = require('../lib/month-summary');

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
    const months = await yearMonthSummaries(req.user.sub, year);
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
