const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const pool = require('../config/db');
const auth = require('../middleware/auth');
const logger = require('../config/logger');

const router = express.Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ success: false, error: 'Todos los campos son requeridos' });
    }

    const [existing] = await pool.query(
      'SELECT id FROM users WHERE email = ? OR name = ?',
      [email, username]
    );
    if (existing.length > 0) {
      return res.status(409).json({ success: false, error: 'Usuario o email ya existe' });
    }

    const id = uuidv4();
    const hashedPassword = await bcrypt.hash(password, 10);
    await pool.query(
      'INSERT INTO users (id, name, username, email, password) VALUES (?, ?, ?, ?, ?)',
      [id, username, username, email, hashedPassword]
    );

    const token = jwt.sign(
      { id, username, email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      data: { token, user: { id, username, email } },
    });
  } catch (err) {
    logger.error('Register error', { error: err.message });
    res.status(500).json({ success: false, error: 'Error del servidor' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email y contraseña requeridos' });
    }

    const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.status(401).json({ success: false, error: 'Credenciales inválidas' });
    }

    const user = users[0];
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ success: false, error: 'Credenciales inválidas' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.name, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          username: user.name,
          email: user.email,
          avatar_url: user.profile_picture,
        },
      },
    });
  } catch (err) {
    logger.error('Login error', { error: err.message });
    res.status(500).json({ success: false, error: 'Error del servidor' });
  }
});

// GET /api/auth/me
router.get('/me', auth, async (req, res) => {
  try {
    const [users] = await pool.query(
      'SELECT id, name as username, email, profile_picture as avatar_url, is_online, last_seen, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    if (users.length === 0) {
      return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
    }
    res.json({ success: true, data: users[0] });
  } catch (err) {
    logger.error('Me error', { error: err.message });
    res.status(500).json({ success: false, error: 'Error del servidor' });
  }
});

module.exports = router;
