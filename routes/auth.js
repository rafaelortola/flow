const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { seedDefaultCategories } = require('../lib/seed-user-defaults');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 6;

function authRoutes(jwtSecret, authMiddleware) {
  const router = express.Router();

  router.post('/register', async (req, res) => {
    const { name, email, password } = req.body || {};
    const trimmedName = typeof name === 'string' ? name.trim() : '';
    const trimmedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

    if (!trimmedName || !trimmedEmail || !password) {
      return res.status(400).json({ message: 'Nome, email e senha são obrigatórios' });
    }
    if (!EMAIL_RE.test(trimmedEmail)) {
      return res.status(400).json({ message: 'Informe um email válido' });
    }
    if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
      return res.status(400).json({
        message: `A senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres`,
      });
    }

    try {
      const existing = await db.query(
        `SELECT id FROM users WHERE email = $1 LIMIT 1`,
        [trimmedEmail],
      );
      if (existing.rowCount > 0) {
        return res.status(409).json({ message: 'Este email já está cadastrado' });
      }

      const id = crypto.randomUUID();
      const passwordHash = await bcrypt.hash(password, 10);

      // updatedAt/createdAt explícitos: schema legado Prisma exige NOT NULL sem DEFAULT
      await db.query(
        `INSERT INTO users (id, email, "passwordHash", name, "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, NOW(), NOW())`,
        [id, trimmedEmail, passwordHash, trimmedName],
      );

      try {
        await seedDefaultCategories(id);
      } catch (seedErr) {
        console.error('Aviso: falha ao criar categorias padrão:', seedErr.message);
      }

      const token = jwt.sign(
        { sub: id, email: trimmedEmail, name: trimmedName },
        jwtSecret,
        { expiresIn: '7d' },
      );

      res.status(201).json({
        token,
        user: { id, email: trimmedEmail, name: trimmedName },
      });
    } catch (err) {
      if (err.code === '23505') {
        return res.status(409).json({ message: 'Este email já está cadastrado' });
      }
      console.error('Erro no cadastro:', err.message);
      res.status(500).json({
        message: 'Erro interno ao cadastrar. Verifique o banco e rode: npm run setup',
      });
    }
  });

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
