const db = require('../db');
const { buildCardInvoiceRows } = require('./card-invoices');

async function monthSummary(userId, month, year) {
  const [incomes, expenses, cardInvoices] = await Promise.all([
    db.query(
      `SELECT COALESCE(SUM(amount), 0) AS total FROM incomes WHERE "userId" = $1 AND month = $2 AND year = $3`,
      [userId, month, year],
    ),
    db.query(
      `SELECT expense_group, COALESCE(SUM(amount), 0) AS total
       FROM expenses WHERE "userId" = $1 AND month = $2 AND year = $3
         AND expense_group != 'card'
       GROUP BY expense_group`,
      [userId, month, year],
    ),
    buildCardInvoiceRows(userId, month, year),
  ]);

  const receitaBruta = Number(incomes.rows[0]?.total || 0);
  const byGroup = { essential: 0, nonessential: 0, debt: 0, card: 0 };
  for (const row of expenses.rows) {
    byGroup[row.expense_group] = Number(row.total);
  }
  byGroup.card = cardInvoices.reduce((sum, row) => sum + Number(row.invoice_total || 0), 0);
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

async function yearMonthSummaries(userId, year) {
  const months = [];
  for (let month = 1; month <= 12; month++) {
    months.push(await monthSummary(userId, month, year));
  }
  return months;
}

module.exports = {
  monthSummary,
  yearMonthSummaries,
};
