const express = require('express');
const crypto = require('crypto');
const db = require('../db');

function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

const DEFAULT_CARD_COLOR = '#A855F7';

function normalizeColor(value) {
  if (value == null || value === '') return null;
  if (typeof value !== 'string') return null;
  const hex = value.trim();
  if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) return null;
  return hex.toUpperCase();
}

function normalizeDay(value) {
  if (value == null || value === '') return null;
  const day = parseInt(value, 10);
  if (!Number.isFinite(day) || day < 1 || day > 31) return null;
  return day;
}

function cardRoutes(authMiddleware) {
  const router = express.Router();
  router.use(authMiddleware);

  router.get('/', asyncHandler(async (req, res) => {
    const result = await db.query(
      `SELECT id, name, color, closing_day, due_day
       FROM cards WHERE "userId" = $1
       ORDER BY name`,
      [req.user.sub],
    );
    res.json(result.rows);
  }));

  router.post('/', asyncHandler(async (req, res) => {
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    const color = normalizeColor(req.body?.color) || DEFAULT_CARD_COLOR;
    const closingDay = normalizeDay(req.body?.closing_day);
    const dueDay = normalizeDay(req.body?.due_day);

    if (!name) {
      return res.status(400).json({ message: 'Informe o nome do cartão' });
    }
    if (req.body?.color && !normalizeColor(req.body.color)) {
      return res.status(400).json({ message: 'Cor inválida. Use o formato #RRGGBB' });
    }
    if (req.body?.closing_day != null && req.body.closing_day !== '' && closingDay == null) {
      return res.status(400).json({ message: 'Dia de fechamento inválido (1 a 31)' });
    }
    if (req.body?.due_day != null && req.body.due_day !== '' && dueDay == null) {
      return res.status(400).json({ message: 'Dia de vencimento inválido (1 a 31)' });
    }

    const existing = await db.query(
      `SELECT id FROM cards WHERE "userId" = $1 AND name = $2`,
      [req.user.sub, name],
    );
    if (existing.rowCount) {
      return res.status(409).json({ message: 'Já existe um cartão com esse nome' });
    }

    const id = crypto.randomUUID();
    const result = await db.query(
      `INSERT INTO cards (id, "userId", name, color, closing_day, due_day, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
       RETURNING id, name, color, closing_day, due_day`,
      [id, req.user.sub, name, color, closingDay, dueDay],
    );
    res.status(201).json(result.rows[0]);
  }));

  router.patch('/:id', asyncHandler(async (req, res) => {
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    const colorInput = req.body?.color;
    const closingDay = normalizeDay(req.body?.closing_day);
    const dueDay = normalizeDay(req.body?.due_day);

    if (!name) {
      return res.status(400).json({ message: 'Informe o nome do cartão' });
    }
    if (colorInput != null && colorInput !== '' && !normalizeColor(colorInput)) {
      return res.status(400).json({ message: 'Cor inválida. Use o formato #RRGGBB' });
    }
    if (req.body?.closing_day != null && req.body.closing_day !== '' && closingDay == null) {
      return res.status(400).json({ message: 'Dia de fechamento inválido (1 a 31)' });
    }
    if (req.body?.due_day != null && req.body.due_day !== '' && dueDay == null) {
      return res.status(400).json({ message: 'Dia de vencimento inválido (1 a 31)' });
    }

    const current = await db.query(
      `SELECT name FROM cards WHERE id = $1 AND "userId" = $2`,
      [req.params.id, req.user.sub],
    );
    if (!current.rowCount) {
      return res.status(404).json({ message: 'Cartão não encontrado' });
    }

    const duplicate = await db.query(
      `SELECT id FROM cards WHERE "userId" = $1 AND name = $2 AND id != $3`,
      [req.user.sub, name, req.params.id],
    );
    if (duplicate.rowCount) {
      return res.status(409).json({ message: 'Já existe um cartão com esse nome' });
    }

    const color = colorInput != null && colorInput !== ''
      ? normalizeColor(colorInput)
      : null;
    const closingDayValue = req.body?.closing_day != null && req.body?.closing_day !== ''
      ? closingDay
      : null;
    const dueDayValue = req.body?.due_day != null && req.body?.due_day !== ''
      ? dueDay
      : null;

    const result = await db.query(
      `UPDATE cards SET
         name = $1,
         color = COALESCE($2, color),
         closing_day = COALESCE($3, closing_day),
         due_day = COALESCE($4, due_day),
         "updatedAt" = NOW()
       WHERE id = $5 AND "userId" = $6
       RETURNING id, name, color, closing_day, due_day`,
      [name, color, closingDayValue, dueDayValue, req.params.id, req.user.sub],
    );

    res.json(result.rows[0]);
  }));

  router.delete('/:id', asyncHandler(async (req, res) => {
    await db.query(
      `UPDATE expenses SET card_id = NULL WHERE card_id = $1 AND "userId" = $2`,
      [req.params.id, req.user.sub],
    );
    const result = await db.query(
      `DELETE FROM cards WHERE id = $1 AND "userId" = $2 RETURNING id`,
      [req.params.id, req.user.sub],
    );
    if (!result.rowCount) return res.status(404).json({ message: 'Cartão não encontrado' });
    res.json({ ok: true });
  }));

  return router;
}

module.exports = cardRoutes;
