const crypto = require('crypto');
const db = require('../db');

function dueDateForMonth(year, month, day) {
  if (day == null) return null;
  const lastDay = new Date(year, month, 0).getDate();
  const safeDay = Math.min(Number(day), lastDay);
  return `${year}-${String(month).padStart(2, '0')}-${String(safeDay).padStart(2, '0')}`;
}

function isMissingCardsSchema(err) {
  if (err.code === '42P01' || err.code === '42703') return true;
  const msg = String(err.message || '');
  return /relation "cards"/i.test(msg) || /card_id/i.test(msg);
}

async function ensureCardExpensesForMonth(userId, month, year) {
  const missing = await db.query(
    `SELECT c.id, c.name, c.due_day
     FROM cards c
     WHERE c."userId" = $1
       AND NOT EXISTS (
         SELECT 1 FROM expenses e
         WHERE e."userId" = $1 AND e.card_id = c.id AND e.month = $2 AND e.year = $3
       )`,
    [userId, month, year],
  );

  for (const card of missing.rows) {
    await db.query(
      `INSERT INTO expenses (
        id, "userId", month, year, due_date, name, amount, category, expense_group,
        payment_status, card_id
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [
        crypto.randomUUID(),
        userId,
        month,
        year,
        dueDateForMonth(year, month, card.due_day),
        card.name,
        0,
        'Cartão de Crédito',
        'card',
        'Não pago',
        card.id,
      ],
    );
  }
}

async function tryEnsureCardExpensesForMonth(userId, month, year) {
  try {
    await ensureCardExpensesForMonth(userId, month, year);
  } catch (err) {
    if (!isMissingCardsSchema(err)) throw err;
  }
}

module.exports = {
  dueDateForMonth,
  ensureCardExpensesForMonth,
  tryEnsureCardExpensesForMonth,
};
