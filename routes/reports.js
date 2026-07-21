const express = require('express');
const db = require('../db');
const { yearMonthSummaries } = require('../lib/month-summary');

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

const CARD_CATEGORY = 'Cartão de Crédito';

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
       WHERE "userId" = $1 AND year = $2 AND expense_group != 'card'
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
       WHERE "userId" = $1 AND year = $2 AND expense_group != 'card'
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

async function fetchAvailableYears(userId) {
  const result = await db.query(
    `SELECT DISTINCT year
     FROM (
       SELECT year FROM expenses WHERE "userId" = $1
       UNION
       SELECT year FROM incomes WHERE "userId" = $1
     ) AS years
     ORDER BY year DESC`,
    [userId],
  );
  return result.rows.map((row) => Number(row.year));
}

function mergeCardCategory(categories, cardTotal, cardCount) {
  if (cardTotal <= 0) return categories;

  const rows = categories.map((row) => ({
    category: row.category,
    total: Number(row.total),
    count: Number(row.count),
  }));

  const existing = rows.find((row) => row.category === CARD_CATEGORY);
  if (existing) {
    existing.total += cardTotal;
    existing.count += cardCount;
  } else {
    rows.push({ category: CARD_CATEGORY, total: cardTotal, count: cardCount });
  }

  return rows.sort((a, b) => b.total - a.total);
}

function reportsRoutes(authMiddleware) {
  const router = express.Router();
  router.use(authMiddleware);

  router.get('/years', asyncHandler(async (req, res) => {
    const years = await fetchAvailableYears(req.user.sub);
    const currentYear = new Date().getFullYear();
    if (!years.includes(currentYear)) years.unshift(currentYear);
    res.json({ years: [...new Set(years)].sort((a, b) => b - a) });
  }));

  router.get('/', asyncHandler(async (req, res) => {
    const year = parseInt(req.query.year, 10) || new Date().getFullYear();
    const userId = req.user.sub;

    const [monthSummaries, byCategory, incomeByCategory, incomeBySource] = await Promise.all([
      yearMonthSummaries(userId, year),
      fetchExpensesByCategory(userId, year),
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
    ]);

    const months = monthSummaries.map((summary) => ({
      month: summary.month,
      receitas: summary.receitaBruta,
      despesas: summary.totalDespesas,
      sobra: summary.tendenciaSobra,
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

    const groupTotals = monthSummaries.reduce(
      (acc, summary) => {
        acc.essential += summary.gastosEssenciais;
        acc.nonessential += summary.gastosNaoEssenciais;
        acc.debt += summary.gastosDividas;
        acc.card += summary.gastosCartoes;
        return acc;
      },
      { essential: 0, nonessential: 0, debt: 0, card: 0 },
    );

    const cardCountResult = await db.query(
      `SELECT COUNT(*)::int AS count
       FROM expenses
       WHERE "userId" = $1 AND year = $2 AND expense_group = 'card' AND card_id IS NOT NULL`,
      [userId, year],
    );
    const cardCount = Number(cardCountResult.rows[0]?.count || 0);
    const categoriesWithCards = mergeCardCategory(byCategory, groupTotals.card, cardCount);

    const topCategories = categoriesWithCards.slice(0, 10).map((row) => ({
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
      categories: categoriesWithCards.map((row) => ({
        category: row.category,
        total: Number(row.total),
        count: Number(row.count),
        percent: totals.despesas > 0 ? (Number(row.total) / totals.despesas) * 100 : 0,
      })),
      expenseMonths: months.map((row) => ({
        month: row.month,
        total: row.despesas,
      })),
      groups: Object.entries(groupTotals)
        .filter(([, total]) => total > 0)
        .map(([group, total]) => ({
          group,
          label: GROUP_LABELS[group] || group,
          total: Number(total),
          percent: totals.despesas > 0 ? (Number(total) / totals.despesas) * 100 : 0,
        }))
        .sort((a, b) => b.total - a.total),
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
