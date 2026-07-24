const db = require('../db');
const {
  computeInvoiceTotal,
  getPurchaseExpenses,
  isInvoicePlaceholder,
  buildCardInvoiceRows,
} = require('./card-invoices');
const { addMonths, parseInstallment, getInstallmentPurchaseKey } = require('./card-limits');
const { monthSummary } = require('./month-summary');

const MONTH_NAMES = [
  '', 'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
];

function formatPeriod(month, year) {
  return `${MONTH_NAMES[month]}/${year}`;
}

function isDebtType(value, type) {
  return (value || '').trim().toLowerCase() === type.toLowerCase();
}

function getInstallmentDisplay(expense) {
  const info = (expense.installment_info || '').trim();
  const totalFromDb = expense.installment_total != null ? Number(expense.installment_total) : null;

  if (!info && totalFromDb == null) return { text: '—', isLast: false };

  const fullMatch = info.match(/^(\d+)\s*de\s*(\d+)$/i);
  if (fullMatch) {
    const current = parseInt(fullMatch[1], 10);
    const total = parseInt(fullMatch[2], 10);
    if (current === total) return { text: 'Última Parcela', isLast: true };
    return { text: `${current} de ${total}`, isLast: false };
  }

  const partialMatch = info.match(/^(\d+)\s*de\s*$/i);
  if (partialMatch && totalFromDb) {
    const current = parseInt(partialMatch[1], 10);
    if (current === totalFromDb) return { text: 'Última Parcela', isLast: true };
    return { text: `${current} de ${totalFromDb}`, isLast: false };
  }

  if (/^\d+$/.test(info) && totalFromDb) {
    const current = parseInt(info, 10);
    if (current === totalFromDb) return { text: 'Última Parcela', isLast: true };
    return { text: `${current} de ${totalFromDb}`, isLast: false };
  }

  return { text: info || '—', isLast: false };
}

function pushIssue(issues, severity, category, message, details = {}) {
  issues.push({ severity, category, message, details });
}

function periodKey(month, year) {
  return `${year}-${String(month).padStart(2, '0')}`;
}

function comparePeriod(a, b) {
  if (a.year !== b.year) return a.year - b.year;
  return a.month - b.month;
}

function isNextMonth(prev, next) {
  const expected = addMonths(prev.month, prev.year, 1);
  return expected.month === next.month && expected.year === next.year;
}

function groupMensalSequences(expenses) {
  const sorted = [...expenses].sort((a, b) => comparePeriod(a, b));
  const sequences = [];
  let current = null;

  for (const expense of sorted) {
    const signature = [
      expense.expense_group,
      expense.name,
      Number(expense.amount),
      expense.card_id || '',
    ].join('|');

    if (
      current
      && current.signature === signature
      && isNextMonth(current.last, expense)
    ) {
      current.items.push(expense);
      current.last = { month: expense.month, year: expense.year };
      continue;
    }

    current = {
      signature,
      items: [expense],
      last: { month: expense.month, year: expense.year },
    };
    sequences.push(current);
  }

  return sequences;
}

async function loadDistinctPeriods(userId) {
  const result = await db.query(
    `SELECT DISTINCT month, year FROM expenses WHERE "userId" = $1
     UNION
     SELECT DISTINCT month, year FROM incomes WHERE "userId" = $1
     ORDER BY year, month`,
    [userId],
  );
  return result.rows;
}

async function validateCardTotals(userId, issues) {
  const [cardsResult, expensesResult] = await Promise.all([
    db.query(`SELECT id, name FROM cards WHERE "userId" = $1`, [userId]),
    db.query(
      `SELECT * FROM expenses
       WHERE "userId" = $1 AND expense_group = 'card' AND card_id IS NOT NULL
       ORDER BY year, month, name`,
      [userId],
    ),
  ]);

  const cards = cardsResult.rows;
  const cardById = new Map(cards.map((c) => [c.id, c]));
  const byCardMonth = new Map();

  for (const expense of expensesResult.rows) {
    const key = `${expense.card_id}|${expense.month}|${expense.year}`;
    if (!byCardMonth.has(key)) byCardMonth.set(key, []);
    byCardMonth.get(key).push(expense);
  }

  const periods = new Set();
  for (const expense of expensesResult.rows) {
    periods.add(`${expense.month}|${expense.year}`);
  }

  for (const periodStr of periods) {
    const [month, year] = periodStr.split('|').map(Number);
    const invoiceRows = await buildCardInvoiceRows(userId, month, year);

    for (const row of invoiceRows) {
      const card = cardById.get(row.card_id);
      if (!card) continue;

      const monthExpenses = byCardMonth.get(`${row.card_id}|${month}|${year}`) || [];
      const expected = computeInvoiceTotal(monthExpenses, card);
      const actual = Number(row.invoice_total || 0);

      if (Math.abs(expected - actual) > 0.009) {
        pushIssue(
          issues,
          'critical',
          'card-total',
          `Fatura de "${card.name}" em ${formatPeriod(month, year)} diverge: esperado ${expected.toFixed(2)}, calculado ${actual.toFixed(2)}`,
          { cardId: card.id, cardName: card.name, month, year, expected, actual },
        );
      }

      const purchases = getPurchaseExpenses(monthExpenses, card);
      const placeholders = monthExpenses.filter((e) => isInvoicePlaceholder(e, card.name));
      const purchaseSum = purchases.reduce((sum, e) => sum + Number(e.amount || 0), 0);
      const placeholderSum = placeholders.reduce((sum, e) => sum + Number(e.amount || 0), 0);

      if (purchases.length > 0 && placeholderSum > 0.009) {
        pushIssue(
          issues,
          'high',
          'card-total',
          `Cartão "${card.name}" em ${formatPeriod(month, year)} tem compras (${purchaseSum.toFixed(2)}) e placeholder com valor (${placeholderSum.toFixed(2)}). O total usa só as compras — verifique se o placeholder deveria estar zerado.`,
          { cardId: card.id, month, year, purchaseSum, placeholderSum },
        );
      }

      if (purchases.length > 0) {
        const manualMismatch = Math.abs(purchaseSum - actual) > 0.009;
        if (manualMismatch) {
          pushIssue(
            issues,
            'critical',
            'card-total',
            `Soma das compras de "${card.name}" em ${formatPeriod(month, year)} (${purchaseSum.toFixed(2)}) não bate com invoice_total (${actual.toFixed(2)}).`,
            { cardId: card.id, month, year, purchaseSum, actual },
          );
        }
      }
    }
  }
}

async function validateMonthSummaries(userId, periods, issues) {
  for (const { month, year } of periods) {
    const summary = await monthSummary(userId, month, year);

    const groupsResult = await db.query(
      `SELECT expense_group, COALESCE(SUM(amount), 0) AS total
       FROM expenses WHERE "userId" = $1 AND month = $2 AND year = $3
         AND expense_group != 'card'
       GROUP BY expense_group`,
      [userId, month, year],
    );

    const byGroup = { essential: 0, nonessential: 0, debt: 0 };
    for (const row of groupsResult.rows) {
      byGroup[row.expense_group] = Number(row.total);
    }

    const cardsTotal = Number(summary.gastosCartoes || 0);
    const recomputed = byGroup.essential + byGroup.nonessential + byGroup.debt + cardsTotal;
    const reported = Number(summary.totalDespesas || 0);

    if (Math.abs(recomputed - reported) > 0.009) {
      pushIssue(
        issues,
        'critical',
        'month-summary',
        `Resumo de ${formatPeriod(month, year)} inconsistente: totalDespesas=${reported.toFixed(2)}, recomputado=${recomputed.toFixed(2)}`,
        { month, year, reported, recomputed, byGroup, cardsTotal },
      );
    }
  }
}

function validateParceladoGroups(allParcelado, issues) {
  const groups = new Map();

  for (const expense of allParcelado) {
    const key = getInstallmentPurchaseKey(expense);
    if (!key) {
      pushIssue(
        issues,
        'high',
        'parcelado',
        `Despesa parcelada "${expense.name}" (${formatPeriod(expense.month, expense.year)}) sem chave de agrupamento válida — verifique installment_info e installment_total.`,
        { expenseId: expense.id, name: expense.name, month: expense.month, year: expense.year },
      );
      continue;
    }
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(expense);
  }

  for (const [key, items] of groups) {
    const sample = items[0];
    const { total, amount } = parseInstallment(sample);
    const [name] = key.split('|');
    const startPart = key.split('|').pop();
    const [startMonth, startYear] = startPart.split('-').map(Number);

    if (items.length !== total) {
      pushIssue(
        issues,
        'critical',
        'parcelado',
        `Parcelamento "${name}" (${formatPeriod(startMonth, startYear)}, ${total}x R$ ${amount.toFixed(2)}): encontradas ${items.length} parcelas, esperadas ${total}.`,
        { key, expected: total, found: items.length, expenseIds: items.map((e) => e.id) },
      );
    }

    const sorted = [...items].sort((a, b) => comparePeriod(a, b));

    for (let i = 0; i < sorted.length; i++) {
      const expense = sorted[i];
      const expectedPeriod = addMonths(startMonth, startYear, i);
      const expectedCurrent = i + 1;
      const expectedInfo = `${expectedCurrent} de`;

      if (!isDebtType(expense.debt_type, 'Parcelado')) {
        pushIssue(
          issues,
          'high',
          'parcelado',
          `"${expense.name}" em ${formatPeriod(expense.month, expense.year)} deveria ter debt_type "Parcelado", encontrado "${expense.debt_type || '—'}".`,
          { expenseId: expense.id, debt_type: expense.debt_type },
        );
      }

      if (expense.month !== expectedPeriod.month || expense.year !== expectedPeriod.year) {
        pushIssue(
          issues,
          'critical',
          'parcelado',
          `Parcela ${expectedCurrent}/${total} de "${name}" deveria estar em ${formatPeriod(expectedPeriod.month, expectedPeriod.year)}, mas está em ${formatPeriod(expense.month, expense.year)}.`,
          { expenseId: expense.id, expected: expectedPeriod, actual: { month: expense.month, year: expense.year } },
        );
      }

      const info = (expense.installment_info || '').trim();
      if (info !== expectedInfo && !info.match(new RegExp(`^${expectedCurrent}\\s*de\\s*${total}$`, 'i'))) {
        pushIssue(
          issues,
          'medium',
          'parcelado',
          `"${expense.name}" em ${formatPeriod(expense.month, expense.year)}: installment_info deveria ser "${expectedInfo}", encontrado "${info || '—'}".`,
          { expenseId: expense.id, expected: expectedInfo, actual: info },
        );
      }

      if (Number(expense.installment_total) !== total) {
        pushIssue(
          issues,
          'high',
          'parcelado',
          `"${expense.name}" em ${formatPeriod(expense.month, expense.year)}: installment_total deveria ser ${total}, encontrado ${expense.installment_total ?? '—'}.`,
          { expenseId: expense.id, expected: total, actual: expense.installment_total },
        );
      }

      const display = getInstallmentDisplay(expense);
      const expectedDisplay = expectedCurrent === total ? 'Última Parcela' : `${expectedCurrent} de ${total}`;
      if (display.text !== expectedDisplay) {
        pushIssue(
          issues,
          'medium',
          'parcelado',
          `"${expense.name}" em ${formatPeriod(expense.month, expense.year)}: exibição deveria ser "${expectedDisplay}", calculada "${display.text}".`,
          { expenseId: expense.id, expected: expectedDisplay, actual: display.text },
        );
      }
    }

    const amounts = new Set(items.map((e) => Number(e.amount).toFixed(2)));
    if (amounts.size > 1) {
      pushIssue(
        issues,
        'high',
        'parcelado',
        `Parcelamento "${name}" tem valores diferentes entre parcelas: ${[...amounts].join(', ')}.`,
        { key, amounts: [...amounts] },
      );
    }
  }
}

function validateMensalSequences(sequences, issues) {
  for (const seq of sequences) {
    const first = seq.items[0];
    const name = first.name;
    const start = { month: first.month, year: first.year };

    if (seq.items.length !== 12) {
      pushIssue(
        issues,
        'critical',
        'mensal',
        `Despesa mensal "${name}" iniciada em ${formatPeriod(start.month, start.year)} tem ${seq.items.length} ocorrências, esperadas 12.`,
        {
          name,
          startMonth: start.month,
          startYear: start.year,
          found: seq.items.length,
          expenseIds: seq.items.map((e) => e.id),
        },
      );
    }

    for (let i = 0; i < seq.items.length; i++) {
      const expense = seq.items[i];
      const expectedPeriod = addMonths(start.month, start.year, i);

      if (!isDebtType(expense.debt_type, 'Mensal')) {
        pushIssue(
          issues,
          'high',
          'mensal',
          `"${expense.name}" em ${formatPeriod(expense.month, expense.year)} deveria ter debt_type "Mensal", encontrado "${expense.debt_type || '—'}".`,
          { expenseId: expense.id },
        );
      }

      if (expense.month !== expectedPeriod.month || expense.year !== expectedPeriod.year) {
        pushIssue(
          issues,
          'critical',
          'mensal',
          `Recorrência "${name}": mês ${i + 1}/12 deveria ser ${formatPeriod(expectedPeriod.month, expectedPeriod.year)}, encontrado ${formatPeriod(expense.month, expense.year)}.`,
          { expenseId: expense.id, index: i + 1 },
        );
      }

      if (expense.installment_info || expense.installment_total != null) {
        pushIssue(
          issues,
          'medium',
          'mensal',
          `"${expense.name}" em ${formatPeriod(expense.month, expense.year)} é Mensal mas tem campos de parcelamento preenchidos.`,
          { expenseId: expense.id, installment_info: expense.installment_info, installment_total: expense.installment_total },
        );
      }
    }

    const amounts = new Set(seq.items.map((e) => Number(e.amount).toFixed(2)));
    if (amounts.size > 1) {
      pushIssue(
        issues,
        'high',
        'mensal',
        `Despesa mensal "${name}" tem valores diferentes entre meses: ${[...amounts].join(', ')}.`,
        { amounts: [...amounts] },
      );
    }
  }
}

async function validateRecurringExpenses(userId, issues) {
  const result = await db.query(
    `SELECT * FROM expenses
     WHERE "userId" = $1
       AND expense_group != 'card'
       AND debt_type IS NOT NULL
       AND LOWER(TRIM(debt_type)) IN ('mensal', 'parcelado')
     ORDER BY year, month, name`,
    [userId],
  );

  const mensal = result.rows.filter((e) => isDebtType(e.debt_type, 'Mensal'));
  const parcelado = result.rows.filter((e) => isDebtType(e.debt_type, 'Parcelado'));

  validateMensalSequences(groupMensalSequences(mensal), issues);

  const cardParcelado = await db.query(
    `SELECT * FROM expenses
     WHERE "userId" = $1
       AND expense_group = 'card'
       AND card_id IS NOT NULL
       AND LOWER(TRIM(debt_type)) = 'parcelado'
     ORDER BY year, month, name`,
    [userId],
  );

  validateParceladoGroups([...parcelado, ...cardParcelado.rows], issues);
}

async function validateValues(userId) {
  const issues = [];
  const periods = await loadDistinctPeriods(userId);

  await validateCardTotals(userId, issues);
  await validateRecurringExpenses(userId, issues);

  if (periods.length > 0) {
    await validateMonthSummaries(userId, periods, issues);
  }

  const bySeverity = { critical: 0, high: 0, medium: 0 };
  for (const issue of issues) {
    bySeverity[issue.severity] = (bySeverity[issue.severity] || 0) + 1;
  }

  return {
    ok: issues.length === 0,
    userId,
    periodsChecked: periods.length,
    issueCount: issues.length,
    bySeverity,
    issues,
  };
}

async function resolveUserId(email) {
  if (!email) {
    const demo = await db.query(`SELECT id FROM users ORDER BY "createdAt" LIMIT 1`);
    return demo.rows[0]?.id || null;
  }
  const result = await db.query(`SELECT id FROM users WHERE email = $1`, [email]);
  return result.rows[0]?.id || null;
}

module.exports = {
  validateValues,
  resolveUserId,
  formatPeriod,
  getInstallmentDisplay,
};
