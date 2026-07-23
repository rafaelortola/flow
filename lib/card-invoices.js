const db = require('../db');
const { dueDateForMonth, ensureCardExpensesForMonth } = require('./sync-card-expenses');
const { computeLimitAvailable, isInvoiceClosed } = require('./card-limits');

const DEFAULT_CATEGORY = 'Cartão de Crédito';

function resolvePrimaryExpense(monthExpenses, card) {
  const byName = monthExpenses.filter((e) => e.name === card.name);
  if (!byName.length) return monthExpenses[0] || null;
  const placeholder = byName.find((e) => isInvoicePlaceholder(e, card.name));
  if (placeholder) return placeholder;
  const withoutInstallment = byName.find((e) => !e.installment_info && e.installment_total == null);
  return withoutInstallment || byName[0];
}

function getPurchaseExpenses(monthExpenses, card) {
  if (!card?.name) return monthExpenses;
  return monthExpenses.filter((expense) => !isInvoicePlaceholder(expense, card.name));
}

function computeInvoiceTotal(monthExpenses, card) {
  const purchases = getPurchaseExpenses(monthExpenses, card);

  if (purchases.length > 0) {
    return purchases.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  }

  const primary = resolvePrimaryExpense(monthExpenses, card);
  return Number(primary?.amount || 0);
}

function isInvoicePlaceholder(expense, cardName) {
  if (expense.name !== cardName) return false;
  return !expense.installment_info && expense.installment_total == null;
}

function getLimitExpenses(allExpenses, card) {
  const byMonth = new Map();
  for (const expense of allExpenses) {
    const key = `${expense.month}-${expense.year}`;
    if (!byMonth.has(key)) byMonth.set(key, []);
    byMonth.get(key).push(expense);
  }

  const result = [];
  for (const monthExpenses of byMonth.values()) {
    result.push(...getPurchaseExpenses(monthExpenses, card));
  }
  return result;
}

async function buildCardInvoiceRows(userId, month, year) {
  await ensureCardExpensesForMonth(userId, month, year);

  const [cardsResult, monthExpensesResult, allCardExpensesResult] = await Promise.all([
    db.query(
      `SELECT id, name, color, closing_day, due_day, credit_limit
       FROM cards WHERE "userId" = $1 ORDER BY name`,
      [userId],
    ),
    db.query(
      `SELECT e.*
       FROM expenses e
       WHERE e."userId" = $1 AND e.month = $2 AND e.year = $3 AND e.expense_group = 'card'
       ORDER BY e.due_date NULLS LAST, e.name`,
      [userId, month, year],
    ),
    db.query(
      `SELECT id, card_id, amount, installment_info, installment_total, payment_status, month, year
       FROM expenses
       WHERE "userId" = $1 AND card_id IS NOT NULL`,
      [userId],
    ),
  ]);

  const monthExpensesByCard = new Map();
  for (const expense of monthExpensesResult.rows) {
    if (!expense.card_id) continue;
    if (!monthExpensesByCard.has(expense.card_id)) {
      monthExpensesByCard.set(expense.card_id, []);
    }
    monthExpensesByCard.get(expense.card_id).push(expense);
  }

  const allExpensesByCard = new Map();
  for (const expense of allCardExpensesResult.rows) {
    if (!allExpensesByCard.has(expense.card_id)) {
      allExpensesByCard.set(expense.card_id, []);
    }
    allExpensesByCard.get(expense.card_id).push(expense);
  }

  return cardsResult.rows.map((card) => {
    const monthExpenses = monthExpensesByCard.get(card.id) || [];
    const primary = resolvePrimaryExpense(monthExpenses, card);
    const invoiceTotal = computeInvoiceTotal(monthExpenses, card);
    const cardExpenses = allExpensesByCard.get(card.id) || [];
    const limitExpenses = getLimitExpenses(cardExpenses, card);
    const creditLimit = Number(card.credit_limit) || 0;
    const limitAvailable = computeLimitAvailable(creditLimit, limitExpenses);
    const dueDate = primary?.due_date || dueDateForMonth(year, month, card.due_day);
    const paymentStatus = primary?.payment_status || 'Não pago';
    const invoiceClosed = isInvoiceClosed(card.closing_day, month, year);

    return {
      id: primary?.id || null,
      card_id: card.id,
      due_date: dueDate,
      card_name: card.name,
      card_color: card.color,
      invoice_total: invoiceTotal,
      amount: invoiceTotal,
      category: DEFAULT_CATEGORY,
      payment_status: paymentStatus,
      credit_limit: creditLimit,
      limit_available: limitAvailable,
      invoice_closed: invoiceClosed,
      closing_day: card.closing_day,
      expense_count: monthExpenses.length,
    };
  });
}

module.exports = {
  DEFAULT_CATEGORY,
  resolvePrimaryExpense,
  getPurchaseExpenses,
  computeInvoiceTotal,
  getLimitExpenses,
  buildCardInvoiceRows,
};
