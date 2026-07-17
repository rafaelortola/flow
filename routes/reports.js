const express = require('express');
const db = require('../db');

function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

const GROUP_LABELS = {
  essential: 'Essenciais',
  nonessential: 'Não essenciais',
  debt: 'Dívidas',
  card: 'Cartões',
};

function isMissingColumnError(err, column) {
  if (err.code === '42703') return true;
  const msg = String(err.message || '');
  return msg.includes(column) && (/não existe/i.test(msg) || /does not exist/i.test(msg));
}

async function fetchExpensesByCategory(userId, year) {
  try {
    const result = await db.query(
      `SELECT COALESCE(NULLIF(TRIM(category), ''), 'Sem categoria') AS category,
              SUM(amount)::float AS total,
              COUNT(*)::int AS count
       FROM expenses
       WHERE "userId" = $1 AND year = $2
       GROUP BY 1
       ORDER BY total DESC`,
      [userId, year],
    );
    return result.rows;
  } catch (err) {
    if (!isMissingColumnError(err, 'category')) throw err;
    const result = await db.query(
      `SELECT name AS category,
              SUM(amount)::float AS total,
              COUNT(*)::int AS count
       FROM expenses
       WHERE "userId" = $1 AND year = $2
       GROUP BY name
       ORDER BY total DESC`,
      [userId, year],
    );
    return result.rows;
  }
}

async function fetchIncomeByCategory(userId, year) {
  try {
    const result = await db.query(
      `SELECT COALESCE(NULLIF(TRIM(category), ''), 'Sem categoria') AS category,
              SUM(amount)::float AS total,
              COUNT(*)::int AS count
       FROM incomes
       WHERE "userId" = $1 AND year = $2
       GROUP BY 1
       ORDER BY total DESC`,
      [userId, year],
    );
    return result.rows;
  } catch (err) {
    if (!isMissingColumnError(err, 'category')) throw err;
    const result = await db.query(
      `SELECT source AS category,
              SUM(amount)::float AS total,
              COUNT(*)::int AS count
       FROM incomes
       WHERE "userId" = $1 AND year = $2
       GROUP BY source
       ORDER BY total DESC`,
      [userId, year],
    );
    return result.rows;
  }
}

function reportsRoutes(authMiddleware) {
  const router = express.Router();
  router.use(authMiddleware);

  router.get('/', asyncHandler(async (req, res) => {
    const year = parseInt(req.query.year, 10) || new Date().getFullYear();
    const userId = req.user.sub;

    const [byCategory, byMonth, byGroup, incomeByCategory, incomeBySource, monthlyDetail] = await Promise.all([
      fetchExpensesByCategory(userId, year),
      db.query(
        `SELECT month,
                SUM(amount)::float AS despesas,
                COUNT(*)::int AS count
         FROM expenses
         WHERE "userId" = $1 AND year = $2
         GROUP BY month
         ORDER BY month`,
        [userId, year],
      ),
      db.query(
        `SELECT expense_group,
                SUM(amount)::float AS total,
                COUNT(*)::int AS count
         FROM expenses
         WHERE "userId" = $1 AND year = $2
         GROUP BY expense_group
         ORDER BY total DESC`,
        [userId, year],
      ),
      fetchIncomeByCategory(userId, year),
      db.query(
        `SELECT source,
                SUM(amount)::float AS total,
                COUNT(*)::int AS count
         FROM incomes
         WHERE "userId" = $1 AND year = $2
         GROUP BY source
         ORDER BY total DESC
         LIMIT 10`,
        [userId, year],
      ),
      db.query(
        `SELECT gs.month,
                COALESCE(SUM(i.amount), 0)::float AS receitas,
                COALESCE(SUM(e.amount), 0)::float AS despesas
         FROM generate_series(1, 12) AS gs(month)
         LEFT JOIN incomes i
           ON i."userId" = $1 AND i.year = $2 AND i.month = gs.month
         LEFT JOIN expenses e
           ON e."userId" = $1 AND e.year = $2 AND e.month = gs.month
         GROUP BY gs.month
         ORDER BY gs.month`,
        [userId, year],
      ),
    ]);

    const months = monthlyDetail.rows.map((row) => ({
      month: row.month,
      receitas: Number(row.receitas),
      despesas: Number(row.despesas),
      sobra: Number(row.receitas) - Number(row.despesas),
    }));

    const totals = months.reduce(
      (acc, m) => {
        acc.receitas += m.receitas;
        acc.despesas += m.despesas;
        acc.sobra += m.sobra;
        return acc;
      },
      { receitas: 0, despesas: 0, sobra: 0 },
    );

    const topCategories = byCategory.slice(0, 10).map((row) => ({
      category: row.category,
      total: Number(row.total),
      count: Number(row.count),
      percent: totals.despesas > 0 ? (Number(row.total) / totals.despesas) * 100 : 0,
    }));

    res.json({
      year,
      totals,
      months,
      topCategories,
      categories: byCategory.map((row) => ({
        category: row.category,
        total: Number(row.total),
        count: Number(row.count),
        percent: totals.despesas > 0 ? (Number(row.total) / totals.despesas) * 100 : 0,
      })),
      expenseMonths: byMonth.rows.map((row) => ({
        month: row.month,
        total: Number(row.despesas),
        count: Number(row.count),
      })),
      groups: byGroup.rows.map((row) => ({
        group: row.expense_group,
        label: GROUP_LABELS[row.expense_group] || row.expense_group,
        total: Number(row.total),
        count: Number(row.count),
        percent: totals.despesas > 0 ? (Number(row.total) / totals.despesas) * 100 : 0,
      })),
      incomeCategories: incomeByCategory.map((row) => ({
        category: row.category,
        total: Number(row.total),
        count: Number(row.count),
      })),
      incomeSources: incomeBySource.rows.map((row) => ({
        source: row.source,
        total: Number(row.total),
        count: Number(row.count),
      })),
    });
  }));

  return router;
}

module.exports = reportsRoutes;
