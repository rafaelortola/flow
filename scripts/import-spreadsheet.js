/**
 * Importa dados da aba Junho/2026 da planilha para o banco.
 * Uso: npm run import
 */
require('dotenv').config();
const XLSX = require('xlsx');
const crypto = require('crypto');
const path = require('path');
const { pool } = require('../db');

const SHEET = 'Junho';
const MONTH = 6;
const YEAR = 2026;
const DEMO_EMAIL = 'demo@financeflow.com';
const XLSX_PATH = path.join(__dirname, '../data/planilha-modelo.xlsx');

const INCOME_SOURCES = new Set([
  'Biz', 'EDS', 'DB4SERV', 'Empréstimo Henrique',
  'Paguei Ponto Frio e Retirei', 'Retirada Ponto Frio', 'Retirada Atacadão',
]);

const GROUP_RANGES = [
  { group: 'essential', start: 39, end: 59 },
  { group: 'nonessential', start: 65, end: 85 },
  { group: 'debt', start: 91, end: 111 },
  { group: 'card', start: 117, end: 160 },
];

function excelDate(serial) {
  const n = parseFloat(serial);
  if (Number.isNaN(n) || n < 1000) return null;
  const utc = new Date(Date.UTC(1899, 11, 30));
  utc.setUTCDate(utc.getUTCDate() + Math.floor(n));
  return utc.toISOString().slice(0, 10);
}

function cell(row, col) {
  const v = row[col];
  if (v == null || v === '') return null;
  return String(v).trim();
}

function num(val) {
  const n = parseFloat(val);
  return Number.isNaN(n) ? null : n;
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

function shiftDueDate(dateStr, monthOffset) {
  if (!dateStr) return null;
  const d = new Date(`${dateStr.slice(0, 10)}T12:00:00`);
  d.setMonth(d.getMonth() + monthOffset);
  return d.toISOString().slice(0, 10);
}

function isDebtType(value, type) {
  return (value || '').trim().toLowerCase() === type.toLowerCase();
}

function buildImportSchedule({ month, year, dueDate, debtType, installmentInfo, installmentTotal }) {
  if (isDebtType(debtType, 'Mensal')) {
    return Array.from({ length: 12 }, (_, index) => {
      const period = addMonths(month, year, index);
      return {
        month: period.month,
        year: period.year,
        due_date: shiftDueDate(dueDate, index),
        installment_info: null,
        installment_total: null,
      };
    });
  }

  if (isDebtType(debtType, 'Parcelado')) {
    const total = Number(installmentTotal);
    if (Number.isFinite(total) && total >= 2) {
      const info = (installmentInfo || '').trim();
      const currentMatch = info.match(/^(\d+)\s*de/i);
      const current = currentMatch ? parseInt(currentMatch[1], 10) : 1;
      const startOffset = -(Math.max(1, current) - 1);

      return Array.from({ length: total }, (_, index) => {
        const period = addMonths(month, year, startOffset + index);
        return {
          month: period.month,
          year: period.year,
          due_date: shiftDueDate(dueDate, startOffset + index),
          installment_info: `${index + 1} de`,
          installment_total: total,
        };
      });
    }
  }

  return [{
    month,
    year,
    due_date: dueDate,
    installment_info: installmentInfo === 'Selecione' ? null : installmentInfo,
    installment_total: installmentTotal,
  }];
}

function parseSheetRows(sheet) {
  const rows = {};
  const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
  for (let r = range.s.r; r <= range.e.r; r++) {
    rows[r + 1] = {};
    for (let c = range.s.c; c <= range.e.c; c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      const cellObj = sheet[addr];
      if (!cellObj) continue;
      const col = XLSX.utils.encode_col(c);
      rows[r + 1][col] = cellObj.v;
    }
  }
  return rows;
}

async function main() {
  const wb = XLSX.readFile(XLSX_PATH);
  const sheet = wb.Sheets[SHEET];
  if (!sheet) {
    console.error(`ERRO: aba "${SHEET}" não encontrada`);
    process.exit(1);
  }

  const userRes = await pool.query(`SELECT id FROM users WHERE email = $1`, [DEMO_EMAIL]);
  if (!userRes.rowCount) {
    console.error('ERRO: usuário demo não existe. Rode: npm run setup');
    process.exit(1);
  }
  const userId = userRes.rows[0].id;

  const rows = parseSheetRows(sheet);

  // Limpa dados do mês base e períodos futuros gerados por expansões Mensal/Parcelado
  await pool.query(`DELETE FROM incomes WHERE "userId" = $1 AND month = $2 AND year = $3`, [userId, MONTH, YEAR]);
  await pool.query(
    `DELETE FROM expenses
     WHERE "userId" = $1
       AND (year > $2 OR (year = $2 AND month >= $3))`,
    [userId, YEAR, MONTH],
  );
  await pool.query(`DELETE FROM monthly_notes WHERE "userId" = $1 AND month = $2 AND year = $3`, [userId, MONTH, YEAR]);

  let incomeCount = 0;
  for (const rowNum of Object.keys(rows).map(Number).sort((a, b) => a - b)) {
    const row = rows[rowNum];
    const source = cell(row, 'F');
    const amount = num(row.H);
    if (source && amount != null && INCOME_SOURCES.has(source)) {
      if (source === 'Recebíveis Bruto' || source === 'Recebíveis Líquido') continue;
      if (amount <= 0) continue;
      await pool.query(
        `INSERT INTO incomes (id, "userId", month, year, source, amount) VALUES ($1,$2,$3,$4,$5,$6)`,
        [crypto.randomUUID(), userId, MONTH, YEAR, source, amount],
      );
      incomeCount++;
    }
  }

  let expenseCount = 0;
  const cardsResult = await pool.query(
    `SELECT id, name FROM cards WHERE "userId" = $1`,
    [userId],
  );
  const cardByName = new Map(
    cardsResult.rows.map((card) => [String(card.name).trim().toLowerCase(), card.id]),
  );

  for (const { group, start, end } of GROUP_RANGES) {
    let currentCardId = null;
    for (let rowNum = start; rowNum <= end; rowNum++) {
      const row = rows[rowNum];
      if (!row) continue;
      const name = cell(row, 'D');
      const amount = num(row.F);
      if (!name || name === 'Nome Dívida' || amount == null || amount <= 0) continue;

      const dueRaw = row.B;
      const dueDate = dueRaw ? excelDate(dueRaw) : null;
      const category = cell(row, 'G');
      const spendingType = cell(row, 'I');
      const debtType = cell(row, 'J');
      const installmentInfo = cell(row, 'K');
      const installmentTotal = num(row.M);
      const paymentStatus = cell(row, 'N') || 'Não pago';
      const reviewed = cell(row, 'O') === 'Sim';
      const payPeriod = num(row.Q);
      const week1 = num(row.S) || 0;
      const week2 = num(row.U) || 0;

      let cardId = null;
      if (group === 'card') {
        const matchedCardId = cardByName.get(name.toLowerCase());
        if (matchedCardId) {
          currentCardId = matchedCardId;
          cardId = matchedCardId;
        } else {
          cardId = currentCardId;
        }
      }

      const normalizedDebtType = debtType === 'Selecione' ? null : debtType;
      const normalizedInstallmentInfo = installmentInfo === 'Selecione' ? null : installmentInfo;
      const schedule = buildImportSchedule({
        month: MONTH,
        year: YEAR,
        dueDate,
        debtType: normalizedDebtType,
        installmentInfo: normalizedInstallmentInfo,
        installmentTotal,
      });

      for (const entry of schedule) {
        await pool.query(
          `INSERT INTO expenses (
            id, "userId", month, year, due_date, name, amount, category, expense_group,
            spending_type, debt_type, installment_info, installment_total,
            payment_status, reviewed, pay_period, week1_amount, week2_amount, card_id
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)`,
          [
            crypto.randomUUID(), userId, entry.month, entry.year, entry.due_date, name, amount,
            category === 'Selecione' ? null : category, group,
            spendingType === 'Selecione' ? null : spendingType,
            normalizedDebtType,
            entry.installment_info,
            entry.installment_total, paymentStatus, reviewed,
            payPeriod ? Math.floor(payPeriod) : null, week1, week2,
            cardId,
          ],
        );
        expenseCount++;
      }
    }
  }

  // Notas de planejamento (coluna N, linhas 6-14)
  const notes = [];
  for (let rowNum = 6; rowNum <= 14; rowNum++) {
    const note = cell(rows[rowNum], 'N') || cell(rows[rowNum], 'P');
    if (note && !note.startsWith('Planej')) notes.push(note);
  }
  if (notes.length) {
    await pool.query(
      `INSERT INTO monthly_notes (id, "userId", month, year, content) VALUES ($1,$2,$3,$4,$5)`,
      [crypto.randomUUID(), userId, MONTH, YEAR, notes.join('\n')],
    );
  }

  console.log(`OK: importados ${incomeCount} recebíveis e ${expenseCount} despesas (${SHEET}/${YEAR})`);
  console.log('Próximo passo: npm run dev');
}

main()
  .catch((err) => {
    console.error('ERRO:', err.message);
    process.exit(1);
  })
  .finally(() => pool.end());
