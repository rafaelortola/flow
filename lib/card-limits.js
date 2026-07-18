function isPaidStatus(status) {
  const s = (status || '').toLowerCase();
  return s.includes('pago') && !s.includes('não');
}

function parseInstallment(expense) {
  const amount = Number(expense.amount) || 0;
  let current = 1;
  let total = expense.installment_total != null ? Number(expense.installment_total) : 1;

  const info = (expense.installment_info || '').trim();
  const fullMatch = info.match(/^(\d+)\s*de\s*(\d+)$/i);
  if (fullMatch) {
    current = parseInt(fullMatch[1], 10);
    total = parseInt(fullMatch[2], 10);
  } else {
    const partialMatch = info.match(/^(\d+)\s*de\s*$/i);
    if (partialMatch) current = parseInt(partialMatch[1], 10);
  }

  if (!Number.isFinite(total) || total < 1) total = 1;
  if (!Number.isFinite(current) || current < 1) current = 1;

  return { current, total, amount };
}

function getLimitImpact(expense) {
  const { current, total, amount } = parseInstallment(expense);

  if (total <= 1) {
    return isPaidStatus(expense.payment_status) ? 0 : amount;
  }

  if (isPaidStatus(expense.payment_status)) {
    const remaining = Math.max(0, total - current);
    return remaining * amount;
  }

  return total * amount;
}

function computeLimitAvailable(creditLimit, expenses) {
  const limit = Number(creditLimit) || 0;
  const used = expenses.reduce((sum, expense) => sum + getLimitImpact(expense), 0);
  return Math.max(0, limit - used);
}

function isInvoiceClosed(closingDay, month, year, referenceDate = new Date()) {
  if (closingDay == null) return null;

  const lastDay = new Date(year, month, 0).getDate();
  const safeDay = Math.min(Number(closingDay), lastDay);
  const closingDate = new Date(year, month - 1, safeDay, 23, 59, 59, 999);

  return referenceDate > closingDate;
}

module.exports = {
  isPaidStatus,
  parseInstallment,
  getLimitImpact,
  computeLimitAvailable,
  isInvoiceClosed,
};
