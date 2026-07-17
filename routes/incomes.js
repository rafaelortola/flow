const express = require('express');
const crypto = require('crypto');
const db = require('../db');

function incomeRoutes(authMiddleware) {
  const router = express.Router();
  router.use(authMiddleware);

  router.get('/', async (req, res) => {
    const month = parseInt(req.query.month, 10);
    const year = parseInt(req.query.year, 10);
    if (!month || !year) {
      return res.status(400).json({ message: 'month e year são obrigatórios' });
    }

    const result = await db.query(
      `SELECT * FROM incomes WHERE "userId" = $1 AND month = $2 AND year = $3 ORDER BY source`,
      [req.user.sub, month, year],
    );
    res.json(result.rows);
  });

  router.post('/', async (req, res) => {
    const { month, year, source, amount } = req.body || {};
    if (!month || !year || !source || amount == null) {
      return res.status(400).json({ message: 'Campos obrigatórios: month, year, source, amount' });
    }

    const id = crypto.randomUUID();
    const result = await db.query(
      `INSERT INTO incomes (id, "userId", month, year, source, amount)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [id, req.user.sub, month, year, source, amount],
    );
    res.status(201).json(result.rows[0]);
  });

  router.patch('/:id', async (req, res) => {
    const { source, amount } = req.body || {};
    const result = await db.query(
      `UPDATE incomes SET
         source = COALESCE($1, source),
         amount = COALESCE($2, amount),
         "updatedAt" = NOW()
       WHERE id = $3 AND "userId" = $4 RETURNING *`,
      [source ?? null, amount ?? null, req.params.id, req.user.sub],
    );
    if (!result.rowCount) return res.status(404).json({ message: 'Não encontrado' });
    res.json(result.rows[0]);
  });

  router.delete('/:id', async (req, res) => {
    const result = await db.query(
      `DELETE FROM incomes WHERE id = $1 AND "userId" = $2 RETURNING id`,
      [req.params.id, req.user.sub],
    );
    if (!result.rowCount) return res.status(404).json({ message: 'Não encontrado' });
    res.json({ ok: true });
  });

  return router;
}

module.exports = incomeRoutes;
