const db = require('../db');
const { dueDateForMonth, ensureCardExpensesForMonth } = require('./sync-card-expenses');
const { computeLimitAvailable, isInvoiceClosed } = require('./card-limits');

const DEFAULT_CATEGORY = 'Cartão de Crédito';

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
      `SELECT id, card_id, amount, installment_info, installment_total, payment_status
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
    const primary = monthExpenses.find((e) => e.name === card.name) || monthExpenses[0] || null;
    const invoiceTotal = monthExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const cardExpenses = allExpensesByCard.get(card.id) || [];
    const creditLimit = Number(card.credit_limit) || 0;
    const limitAvailable = computeLimitAvailable(creditLimit, cardExpenses);
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
  buildCardInvoiceRows,
};
