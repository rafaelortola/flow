function isPaidStatus(status) {
  const s = (status || '').toLowerCase();
  return s.includes('pago') && !s.includes('não');
}

function addMonths(month, year, offset) {
  let m = month + offset;
  let y = year;
  while (m > 12) {
    m -= 12;
    y += 1;
  }
  while (m < 1) {
    m += 12;
    y -= 1;
  }
  return { month: m, year: y };
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

function getInstallmentPurchaseKey(expense) {
  const { current, total, amount } = parseInstallment(expense);
  if (total <= 1) return null;
  if (!expense.month || !expense.year) return null;

  const start = addMonths(Number(expense.month), Number(expense.year), -(current - 1));
  const name = (expense.name || '').trim();
  return `${name}|${amount}|${total}|${start.month}-${start.year}`;
}

function getInstallmentGroupImpact(expenses) {
  return expenses.reduce((sum, expense) => {
    if (isPaidStatus(expense.payment_status)) return sum;
    return sum + (Number(expense.amount) || 0);
  }, 0);
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
  const standalone = [];
  const installmentGroups = new Map();

  for (const expense of expenses) {
    const key = getInstallmentPurchaseKey(expense);
    if (!key) {
      standalone.push(expense);
      continue;
    }
    if (!installmentGroups.has(key)) installmentGroups.set(key, []);
    installmentGroups.get(key).push(expense);
  }

  let used = standalone.reduce((sum, expense) => sum + getLimitImpact(expense), 0);
  for (const group of installmentGroups.values()) {
    used += getInstallmentGroupImpact(group);
  }

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
  addMonths,
  parseInstallment,
  getInstallmentPurchaseKey,
  getInstallmentGroupImpact,
  getLimitImpact,
  computeLimitAvailable,
  isInvoiceClosed,
};
