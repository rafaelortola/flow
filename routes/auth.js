const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');

function authRoutes(jwtSecret, authMiddleware) {
  const router = express.Router();

  router.post('/login', async (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ message: 'Email e senha são obrigatórios' });
    }

    try {
      const result = await db.query(
        `SELECT id, email, "passwordHash", name FROM users WHERE email = $1 LIMIT 1`,
        [email.trim()],
      );
      const user = result.rows[0];
      if (!user) {
        return res.status(401).json({ message: 'Email ou senha incorretos' });
      }

      let valid = false;
      try {
        valid = await bcrypt.compare(password, user.passwordHash);
      } catch {
        valid = false;
      }
      if (!valid) {
        return res.status(401).json({ message: 'Email ou senha incorretos' });
      }

      const token = jwt.sign(
        { sub: user.id, email: user.email, name: user.name },
        jwtSecret,
        { expiresIn: '7d' },
      );

      res.json({
        token,
        user: { id: user.id, email: user.email, name: user.name },
      });
    } catch (err) {
      console.error('Erro no login:', err.message);
      res.status(500).json({ message: 'Erro interno. Rode: npm run setup' });
    }
  });

  router.get('/me', authMiddleware, async (req, res) => {
    try {
      const result = await db.query(
        `SELECT id, email, name FROM users WHERE id = $1 LIMIT 1`,
        [req.user.sub],
      );
      const user = result.rows[0];
      if (!user) {
        return res.status(404).json({ message: 'Usuário não encontrado' });
      }
      res.json(user);
    } catch (err) {
      console.error('Erro /api/me:', err.message);
      res.status(500).json({ message: 'Erro interno' });
    }
  });

  return router;
}

module.exports = authRoutes;
