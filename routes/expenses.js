const express = require('express');
const crypto = require('crypto');
const db = require('../db');

const VALID_GROUPS = ['essential', 'nonessential', 'debt', 'card'];

function expenseRoutes(authMiddleware) {
  const router = express.Router();
  router.use(authMiddleware);

  router.get('/', async (req, res) => {
    const month = parseInt(req.query.month, 10);
    const year = parseInt(req.query.year, 10);
    const group = req.query.group;
    if (!month || !year) {
      return res.status(400).json({ message: 'month e year são obrigatórios' });
    }

    let sql = `SELECT * FROM expenses WHERE "userId" = $1 AND month = $2 AND year = $3`;
    const params = [req.user.sub, month, year];
    if (group && VALID_GROUPS.includes(group)) {
      sql += ` AND expense_group = $4`;
      params.push(group);
    }
    sql += ` ORDER BY due_date NULLS LAST, name`;

    const result = await db.query(sql, params);
    res.json(result.rows);
  });

  router.post('/', async (req, res) => {
    const b = req.body || {};
    if (!b.month || !b.year || !b.name || b.amount == null || !b.expense_group) {
      return res.status(400).json({ message: 'Campos obrigatórios: month, year, name, amount, expense_group' });
    }
    if (!VALID_GROUPS.includes(b.expense_group)) {
      return res.status(400).json({ message: 'expense_group inválido' });
    }

    const id = crypto.randomUUID();
    const result = await db.query(
      `INSERT INTO expenses (
        id, "userId", month, year, due_date, name, amount, category, expense_group,
        spending_type, debt_type, installment_info, installment_total,
        payment_status, reviewed, pay_period, week1_amount, week2_amount
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
      RETURNING *`,
      [
        id, req.user.sub, b.month, b.year, b.due_date || null, b.name, b.amount,
        b.category || null, b.expense_group, b.spending_type || null, b.debt_type || null,
        b.installment_info || null, b.installment_total || null,
        b.payment_status || 'Não pago', b.reviewed ?? false,
        b.pay_period || null, b.week1_amount || 0, b.week2_amount || 0,
      ],
    );
    res.status(201).json(result.rows[0]);
  });

  router.patch('/:id', async (req, res) => {
    const b = req.body || {};
    const result = await db.query(
      `UPDATE expenses SET
         due_date = COALESCE($1, due_date),
         name = COALESCE($2, name),
         amount = COALESCE($3, amount),
         category = COALESCE($4, category),
         expense_group = COALESCE($5, expense_group),
         spending_type = COALESCE($6, spending_type),
         debt_type = COALESCE($7, debt_type),
         installment_info = COALESCE($8, installment_info),
         installment_total = COALESCE($9, installment_total),
         payment_status = COALESCE($10, payment_status),
         reviewed = COALESCE($11, reviewed),
         pay_period = COALESCE($12, pay_period),
         week1_amount = COALESCE($13, week1_amount),
         week2_amount = COALESCE($14, week2_amount),
         "updatedAt" = NOW()
       WHERE id = $15 AND "userId" = $16 RETURNING *`,
      [
        b.due_date ?? null, b.name ?? null, b.amount ?? null, b.category ?? null,
        b.expense_group ?? null, b.spending_type ?? null, b.debt_type ?? null,
        b.installment_info ?? null, b.installment_total ?? null,
        b.payment_status ?? null, b.reviewed ?? null, b.pay_period ?? null,
        b.week1_amount ?? null, b.week2_amount ?? null,
        req.params.id, req.user.sub,
      ],
    );
    if (!result.rowCount) return res.status(404).json({ message: 'Não encontrado' });
    res.json(result.rows[0]);
  });

  router.patch('/:id/status', async (req, res) => {
    const { payment_status } = req.body || {};
    if (!payment_status) {
      return res.status(400).json({ message: 'payment_status obrigatório' });
    }
    const result = await db.query(
      `UPDATE expenses SET payment_status = $1, "updatedAt" = NOW()
       WHERE id = $2 AND "userId" = $3 RETURNING *`,
      [payment_status, req.params.id, req.user.sub],
    );
    if (!result.rowCount) return res.status(404).json({ message: 'Não encontrado' });
    res.json(result.rows[0]);
  });

  router.delete('/:id', async (req, res) => {
    const result = await db.query(
      `DELETE FROM expenses WHERE id = $1 AND "userId" = $2 RETURNING id`,
      [req.params.id, req.user.sub],
    );
    if (!result.rowCount) return res.status(404).json({ message: 'Não encontrado' });
    res.json({ ok: true });
  });

  return router;
}

module.exports = expenseRoutes;
