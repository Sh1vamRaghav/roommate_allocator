const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const db = require('../models/db');

const register = [
  body('name').trim().isLength({ min: 2 }).escape(),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { name, email, password, role } = req.body;
    const assignedRole = role === 'ADMIN' ? 'ADMIN' : 'STUDENT';

    try {
      const { rows } = await db.query('SELECT user_id FROM USERS WHERE email = $1', [email]);
      if (rows.length > 0) return res.status(400).json({ error: 'An account with this email already exists.' });

      const password_hash = await bcrypt.hash(password, 12);

      const { rows: [user] } = await db.query(
        'INSERT INTO USERS (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING user_id, name, email, role',
        [name, email, password_hash, assignedRole]
      );

      const token = jwt.sign(
        { user_id: user.user_id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.status(201).json({ token, user });
    } catch (err) {
      console.error('Register error:', err);
      res.status(500).json({ error: 'Registration failed. Please try again.' });
    }
  },
];

const login = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email, password } = req.body;

    try {
      const { rows } = await db.query('SELECT * FROM USERS WHERE email = $1', [email]);
      if (rows.length === 0) return res.status(401).json({ error: 'Invalid email or password.' });

      const user = rows[0];
      const validPw = await bcrypt.compare(password, user.password_hash);
      if (!validPw) return res.status(401).json({ error: 'Invalid email or password.' });

      const token = jwt.sign(
        { user_id: user.user_id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.json({
        token,
        user: { user_id: user.user_id, name: user.name, email: user.email, role: user.role },
      });
    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ error: 'Login failed. Please try again.' });
    }
  },
];

module.exports = { register, login }; 