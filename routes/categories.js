const express = require('express');
const crypto = require('crypto');
const db = require('../db');

function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

const DEFAULT_CATEGORY_COLOR = '#6366F1';

function normalizeColor(value) {
  if (value == null || value === '') return null;
  if (typeof value !== 'string') return null;
  const hex = value.trim();
  if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) return null;
  return hex.toUpperCase();
}

function categoryRoutes(authMiddleware) {
  const router = express.Router();
  router.use(authMiddleware);

  router.get('/options', (_req, res) => {
    res.json({
      spendingTypes: ['Fixas', 'Variáveis', 'Eventuais'],
      debtTypes: ['À vista', 'Parcelado', 'Mensal'],
      paymentStatuses: ['Pago', 'Não pago', 'Em dia', 'Vencido', 'N/A'],
      expenseGroups: [
        { value: 'essential', label: 'Gastos Fixos Essenciais' },
        { value: 'nonessential', label: 'Gastos Fixos Não Essenciais' },
        { value: 'debt', label: 'Gastos de Dívidas' },
        { value: 'card', label: 'Gastos de Cartão' },
      ],
    });
  });

  router.get('/budgets', asyncHandler(async (req, res) => {
    const month = parseInt(req.query.month, 10);
    const year = parseInt(req.query.year, 10);
    if (!month || !year) {
      return res.status(400).json({ message: 'month e year são obrigatórios' });
    }
    const result = await db.query(
      `SELECT * FROM category_budgets WHERE "userId" = $1 AND month = $2 AND year = $3 ORDER BY category`,
      [req.user.sub, month, year],
    );
    res.json(result.rows);
  }));

  router.put('/budgets', asyncHandler(async (req, res) => {
    const { month, year, category, planned, actual } = req.body || {};
    if (!month || !year || !category) {
      return res.status(400).json({ message: 'month, year, category obrigatórios' });
    }
    const id = crypto.randomUUID();
    const result = await db.query(
      `INSERT INTO category_budgets (id, "userId", month, year, category, planned, actual)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT ("userId", month, year, category)
       DO UPDATE SET planned = EXCLUDED.planned, actual = EXCLUDED.actual, "updatedAt" = NOW()
       RETURNING *`,
      [id, req.user.sub, month, year, category, planned || 0, actual || 0],
    );
    res.json(result.rows[0]);
  }));

  router.get('/', asyncHandler(async (req, res) => {
    const type = typeof req.query.type === 'string' ? req.query.type.toUpperCase() : null;
    const params = [req.user.sub];
    let sql = `SELECT id, name, type, color FROM categories WHERE "userId" = $1`;
    if (type === 'EXPENSE' || type === 'INCOME') {
      sql += ` AND type = $2`;
      params.push(type);
    }
    sql += ` ORDER BY name`;
    const result = await db.query(sql, params);
    res.json(result.rows);
  }));

  router.post('/', asyncHandler(async (req, res) => {
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    const type = typeof req.body?.type === 'string' ? req.body.type.toUpperCase() : 'EXPENSE';
    const color = normalizeColor(req.body?.color) || DEFAULT_CATEGORY_COLOR;

    if (!name) {
      return res.status(400).json({ message: 'Informe o nome da categoria' });
    }
    if (type !== 'EXPENSE' && type !== 'INCOME') {
      return res.status(400).json({ message: 'Tipo inválido. Use EXPENSE ou INCOME' });
    }
    if (req.body?.color && !normalizeColor(req.body.color)) {
      return res.status(400).json({ message: 'Cor inválida. Use o formato #RRGGBB' });
    }

    const existing = await db.query(
      `SELECT id FROM categories WHERE "userId" = $1 AND name = $2`,
      [req.user.sub, name],
    );
    if (existing.rowCount) {
      return res.status(409).json({ message: 'Já existe uma categoria com esse nome' });
    }

    const id = crypto.randomUUID();
    const result = await db.query(
      `INSERT INTO categories (id, "userId", name, type, color, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       RETURNING id, name, type, color`,
      [id, req.user.sub, name, type, color],
    );
    res.status(201).json(result.rows[0]);
  }));

  router.patch('/:id', asyncHandler(async (req, res) => {
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    const type = typeof req.body?.type === 'string' ? req.body.type.toUpperCase() : null;
    const colorInput = req.body?.color;

    if (!name) {
      return res.status(400).json({ message: 'Informe o nome da categoria' });
    }
    if (type && type !== 'EXPENSE' && type !== 'INCOME') {
      return res.status(400).json({ message: 'Tipo inválido. Use EXPENSE ou INCOME' });
    }
    if (colorInput != null && colorInput !== '' && !normalizeColor(colorInput)) {
      return res.status(400).json({ message: 'Cor inválida. Use o formato #RRGGBB' });
    }

    const current = await db.query(
      `SELECT name FROM categories WHERE id = $1 AND "userId" = $2`,
      [req.params.id, req.user.sub],
    );
    if (!current.rowCount) {
      return res.status(404).json({ message: 'Categoria não encontrada' });
    }

    const duplicate = await db.query(
      `SELECT id FROM categories WHERE "userId" = $1 AND name = $2 AND id != $3`,
      [req.user.sub, name, req.params.id],
    );
    if (duplicate.rowCount) {
      return res.status(409).json({ message: 'Já existe uma categoria com esse nome' });
    }

    const color = colorInput != null && colorInput !== ''
      ? normalizeColor(colorInput)
      : null;

    const result = await db.query(
      `UPDATE categories SET
         name = $1,
         type = COALESCE($2, type),
         color = COALESCE($3, color),
         "updatedAt" = NOW()
       WHERE id = $4 AND "userId" = $5
       RETURNING id, name, type, color`,
      [name, type, color, req.params.id, req.user.sub],
    );

    const oldName = current.rows[0].name;
    if (name !== oldName) {
      await db.query(
        `UPDATE expenses SET category = $1 WHERE "userId" = $2 AND category = $3`,
        [name, req.user.sub, oldName],
      );
      await db.query(
        `UPDATE incomes SET category = $1 WHERE "userId" = $2 AND category = $3`,
        [name, req.user.sub, oldName],
      );
    }

    res.json(result.rows[0]);
  }));

  router.delete('/:id', asyncHandler(async (req, res) => {
    const result = await db.query(
      `DELETE FROM categories WHERE id = $1 AND "userId" = $2 RETURNING id`,
      [req.params.id, req.user.sub],
    );
    if (!result.rowCount) return res.status(404).json({ message: 'Categoria não encontrada' });
    res.json({ ok: true });
  }));

  return router;
}

module.exports = categoryRoutes;
