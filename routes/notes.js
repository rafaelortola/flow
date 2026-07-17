const express = require('express');
const crypto = require('crypto');
const db = require('../db');

function notesRoutes(authMiddleware) {
  const router = express.Router();
  router.use(authMiddleware);

  router.get('/', async (req, res) => {
    const month = parseInt(req.query.month, 10);
    const year = parseInt(req.query.year, 10);
    if (!month || !year) {
      return res.status(400).json({ message: 'month e year são obrigatórios' });
    }
    const result = await db.query(
      `SELECT content FROM monthly_notes WHERE "userId" = $1 AND month = $2 AND year = $3`,
      [req.user.sub, month, year],
    );
    res.json({ content: result.rows[0]?.content || '' });
  });

  router.put('/', async (req, res) => {
    const { month, year, content } = req.body || {};
    if (!month || !year) {
      return res.status(400).json({ message: 'month e year são obrigatórios' });
    }
    const id = crypto.randomUUID();
    const result = await db.query(
      `INSERT INTO monthly_notes (id, "userId", month, year, content)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT ("userId", month, year)
       DO UPDATE SET content = EXCLUDED.content, "updatedAt" = NOW()
       RETURNING content`,
      [id, req.user.sub, month, year, content || ''],
    );
    res.json({ content: result.rows[0].content });
  });

  return router;
}

module.exports = notesRoutes;
