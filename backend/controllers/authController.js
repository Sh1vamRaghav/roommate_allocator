/**
 * authController.js
 * Application Layer — Authentication Module
 *
 * Requirement Traceability:
 *   REQ-1  → register() — user registration with name, email, password, role
 *   REQ-2  → login()    — credential validation and JWT issuance
 *   REQ-4  → login()    — error message returned on invalid credentials
 *   REQ-9  → register(), login() — input validated via express-validator (D-SQ-01, D-SEC-02)
 *
 * Design Traceability:
 *   D-CL-01  → User class: register(), login() methods
 *   D-DB-01  → USERS table: INSERT on register, SELECT on login
 *   D-SEC-01 → bcrypt password hashing (salt rounds = 12), JWT signing
 *   D-SQ-01  → Authentication Sequence Diagram
 */

const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const db = require('../models/db');

// ── REQ-1: User Registration ─────────────────────────────────────────────────
// Implements: D-CL-01 (User.register), D-DB-01 (INSERT INTO USERS), D-SEC-01
// Validation middleware runs first (REQ-9, D-SEC-02)
const register = [
  // REQ-9 / D-SEC-02: Input validation — name ≥ 2 chars, valid email, password ≥ 6 chars
  body('name').trim().isLength({ min: 2 }).escape(),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),

  async (req, res) => {
    // REQ-9: Reject request if validation fails
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { name, email, password, role } = req.body;

    // REQ-1 / D-CL-01: role is accepted from the request (STUDENT or ADMIN)
    // Both roles are valid per the class diagram; no restriction on self-registration
    const assignedRole = role === 'ADMIN' ? 'ADMIN' : 'STUDENT';

    try {
      // REQ-1 / D-DB-01: Enforce unique email constraint (also enforced at DB level)
      const { rows } = await db.query('SELECT user_id FROM USERS WHERE email = $1', [email]);
      if (rows.length > 0) return res.status(400).json({ error: 'An account with this email already exists.' });

      // REQ-1 / D-SEC-01: Hash password with bcrypt before storing — never stored in plain text
      const password_hash = await bcrypt.hash(password, 12);

      // REQ-1 / D-DB-01: Insert new user into USERS table (schema.sql: USERS)
      const { rows: [user] } = await db.query(
        'INSERT INTO USERS (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING user_id, name, email, role',
        [name, email, password_hash, assignedRole]
      );

      // REQ-2 / D-SEC-01: Issue JWT on successful registration so user is immediately logged in
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

// ── REQ-2: User Login ────────────────────────────────────────────────────────
// Implements: D-SQ-01 (Authentication Sequence), D-SEC-01 (bcrypt compare + JWT)
// REQ-4: Returns descriptive error message on failure
const login = [
  // REQ-9 / D-SEC-02: Validate email format and non-empty password before any DB query
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email, password } = req.body;

    try {
      // REQ-2 / D-DB-01: Look up user by email — parameterized query prevents SQL injection (D-SEC-02)
      const { rows } = await db.query('SELECT * FROM USERS WHERE email = $1', [email]);

      // REQ-4: Return identical error for missing user vs wrong password (prevents user enumeration)
      if (rows.length === 0) return res.status(401).json({ error: 'Invalid email or password.' });

      const user = rows[0];

      // REQ-2 / D-SEC-01: Compare submitted password against stored bcrypt hash
      const validPw = await bcrypt.compare(password, user.password_hash);

      // REQ-4: Error message displayed to user on invalid credentials
      if (!validPw) return res.status(401).json({ error: 'Invalid email or password.' });

      // REQ-2 / D-SEC-01: Sign JWT with user_id and role — role drives RBAC on all protected routes
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