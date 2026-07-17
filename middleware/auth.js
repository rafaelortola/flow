const jwt = require('jsonwebtoken');

function createAuthMiddleware(jwtSecret) {
  return function authMiddleware(req, res, next) {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) {
      return res.status(401).json({ message: 'Não autenticado' });
    }
    try {
      req.user = jwt.verify(token, jwtSecret);
      next();
    } catch {
      return res.status(401).json({ message: 'Sessão expirada' });
    }
  };
}

module.exports = { createAuthMiddleware };
