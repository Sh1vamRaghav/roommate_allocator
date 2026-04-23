/**
 * studentController.js
 * Application Layer — Student Module
 *
 * Requirement Traceability:
 *   REQ-5  → getProfile()        — display personal information
 *   REQ-6  → getPreferences()    — display preference information
 *   REQ-7  → updateProfile()     — update personal information
 *   REQ-8  → updatePreferences() — update preference information
 *   REQ-9  → updateProfile(), updatePreferences() — validate updated information
 *   REQ-13 → getMyRoom()         — student views their assigned room and roommates
 *
 * Design Traceability:
 *   D-CL-01  → User class: updateProfile() method
 *   D-CL-01  → Preference class: updatePreference() method
 *   D-DB-01  → USERS, PREFERENCES, ALLOCATIONS, ROOMS tables
 *   D-SEC-02 → Parameterized queries throughout (SQL injection prevention)
 *   D-SQ-01  → Sequence diagram: profile and preference update flows
 *   D-SQ-02  → Sequence diagram: student views room after allocation
 */

const { body, validationResult } = require('express-validator');
const db = require('../models/db');

// ── REQ-5: Display Personal Information ─────────────────────────────────────
// Implements: D-CL-01 (User attributes: user_id, name, email, role), D-DB-01 (SELECT USERS)
// Route is JWT-protected — req.user is populated by verifyJWT middleware (REQ-3)
const getProfile = async (req, res) => {
  try {
    // REQ-5 / D-DB-01: Fetch user record by user_id from decoded JWT — parameterized (D-SEC-02)
    const { rows } = await db.query(
      'SELECT user_id, name, email, role FROM USERS WHERE user_id = $1',
      [req.user.user_id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'User not found.' });
    res.json(rows[0]);
  } catch (err) {
    console.error('getProfile error:', err);
    res.status(500).json({ error: 'Failed to fetch profile.' });
  }
};

// ── REQ-7: Update Personal Information ──────────────────────────────────────
// Implements: D-CL-01 (User.updateProfile), D-DB-01 (UPDATE USERS), D-SQ-01, D-SEC-02
const updateProfile = [
  // REQ-9 / D-SEC-02: Validate optional fields before any DB write
  body('name').optional().trim().isLength({ min: 2 }).escape(),
  body('email').optional().isEmail().normalizeEmail(),

  async (req, res) => {
    // REQ-9: Reject if validation fails
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { name, email } = req.body;

    try {
      // REQ-7: Enforce email uniqueness before updating (business rule from D-DB-01 UNIQUE constraint)
      if (email) {
        const { rows } = await db.query(
          'SELECT 1 FROM USERS WHERE email = $1 AND user_id != $2',
          [email, req.user.user_id]
        );
        if (rows.length > 0) return res.status(400).json({ error: 'This email is already in use.' });
      }

      // REQ-7 / D-SQ-01: Build dynamic UPDATE — only update fields that were submitted
      const fields = [];
      const values = [];
      let idx = 1;
      if (name  !== undefined) { fields.push(`name = $${idx++}`);  values.push(name); }
      if (email !== undefined) { fields.push(`email = $${idx++}`); values.push(email); }
      if (fields.length === 0) return res.json({ message: 'No changes to save.' });

      values.push(req.user.user_id);
      // D-SEC-02: Parameterized query — field names are hardcoded (no injection risk)
      await db.query(`UPDATE USERS SET ${fields.join(', ')} WHERE user_id = $${idx}`, values);
      res.json({ message: 'Profile updated successfully.' });
    } catch (err) {
      console.error('updateProfile error:', err);
      res.status(500).json({ error: 'Failed to update profile.' });
    }
  },
];

// ── REQ-6: Display Preference Information ───────────────────────────────────
// Implements: D-CL-01 (Preference attributes), D-DB-01 (SELECT PREFERENCES)
const getPreferences = async (req, res) => {
  try {
    // REQ-6 / D-DB-01: Fetch from PREFERENCES table by user_id (FK → USERS)
    const { rows } = await db.query(
      'SELECT * FROM PREFERENCES WHERE user_id = $1',
      [req.user.user_id]
    );
    const prefs = rows[0] || {};

    // Normalize PostgreSQL TIME format (HH:MM:SS) → HH:MM for HTML time inputs
    const normalizeTime = (t) => {
      if (!t || typeof t !== 'string') return t;
      const parts = t.split(':');
      if (parts.length >= 2) return `${parts[0].padStart(2, '0')}:${parts[1]}`;
      return t;
    };
    if (prefs.sleep_time) prefs.sleep_time = normalizeTime(prefs.sleep_time);
    if (prefs.wake_time)  prefs.wake_time  = normalizeTime(prefs.wake_time);

    res.json(prefs);
  } catch (err) {
    console.error('getPreferences error:', err);
    res.status(500).json({ error: 'Failed to fetch preferences.' });
  }
};

// ── REQ-8: Update Preference Information ────────────────────────────────────
// Implements: D-CL-01 (Preference.updatePreference), D-DB-01 (UPSERT PREFERENCES)
// REQ-9: Input validation and sanitization applied to all five preference fields
const updatePreferences = async (req, res) => {
  try {
    const raw = req.body;

    // REQ-9 / D-SQ-01: Sanitise and validate each field — null if invalid or empty
    const toTime = (v) => {
      if (v === undefined || v === null || String(v).trim() === '') return null;
      const s = String(v).trim();
      // Accept HH:MM or HH:MM:SS
      if (!/^([0-9]|[01][0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/.test(s)) return null;
      return s.split(':').slice(0, 2).join(':');
    };

    const toInt = (v, min, max) => {
      if (v === undefined || v === null || String(v).trim() === '') return null;
      const n = parseInt(String(v), 10);
      // REQ-9: Enforce allowed ranges defined in SRS
      if (isNaN(n) || n < min || n > max) return null;
      return n;
    };

    // REQ-8 / D-CL-01 (Preference attributes): five lifestyle fields
    const sleep_time                  = toTime(raw.sleep_time);
    const wake_time                   = toTime(raw.wake_time);
    const preferred_study_noise_level = toInt(raw.preferred_study_noise_level, 0, 10);   // 0–10
    const guest_visits_per_month      = toInt(raw.guest_visits_per_month,      0, 31);   // 0–31
    const preferred_room_temperature  = toInt(raw.preferred_room_temperature,  15, 30);  // 15–30°C

    const params = [sleep_time, wake_time, preferred_study_noise_level,
                    guest_visits_per_month, preferred_room_temperature];

    // REQ-8 / D-DB-01: UPSERT pattern — INSERT first time, UPDATE on subsequent saves
    const { rows } = await db.query(
      'SELECT preference_id FROM PREFERENCES WHERE user_id = $1',
      [req.user.user_id]
    );

    if (rows.length > 0) {
      // Existing row — UPDATE (D-DB-01: PREFERENCES FK → USERS ON DELETE CASCADE)
      await db.query(
        `UPDATE PREFERENCES SET
           sleep_time                  = $1,
           wake_time                   = $2,
           preferred_study_noise_level = $3,
           guest_visits_per_month      = $4,
           preferred_room_temperature  = $5
         WHERE user_id = $6`,
        [...params, req.user.user_id]
      );
    } else {
      // No row yet — INSERT
      await db.query(
        `INSERT INTO PREFERENCES
           (user_id, sleep_time, wake_time, preferred_study_noise_level,
            guest_visits_per_month, preferred_room_temperature)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [req.user.user_id, ...params]
      );
    }

    res.json({ message: 'Preferences updated successfully.' });
  } catch (err) {
    console.error('updatePreferences error:', err);
    res.status(500).json({ error: 'Failed to update preferences.', detail: err.message });
  }
};

// ── REQ-13: Student Views Assigned Room ─────────────────────────────────────
// Implements: D-SQ-02 (Step 8: Show allocation results to student), D-DB-01 (ALLOCATIONS + ROOMS)
const getMyRoom = async (req, res) => {
  try {
    // REQ-13 / D-DB-01: Join ALLOCATIONS → ROOMS to get room_id and capacity for this student
    const { rows } = await db.query(`
      SELECT a.room_id, r.capacity
      FROM ALLOCATIONS a
      JOIN ROOMS r ON a.room_id = r.room_id
      WHERE a.user_id = $1
    `, [req.user.user_id]);

    // REQ-13: If no allocation exists yet, return informative message
    if (rows.length === 0) return res.json({ message: 'No room assigned yet.' });

    res.json(rows[0]);
  } catch (err) {
    console.error('getMyRoom error:', err);
    res.status(500).json({ error: 'Failed to fetch room information.' });
  }
};

// ── Account Deletion (supporting feature) ───────────────────────────────────
// Not an explicit SRS requirement but supports data integrity.
// Uses a transaction to atomically remove ALLOCATIONS → PREFERENCES → USERS (cascade order)
const deleteAccount = async (req, res) => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    // Delete child records before parent to respect FK constraints
    await client.query('DELETE FROM ALLOCATIONS  WHERE user_id = $1', [req.user.user_id]);
    await client.query('DELETE FROM PREFERENCES  WHERE user_id = $1', [req.user.user_id]);
    await client.query('DELETE FROM USERS        WHERE user_id = $1', [req.user.user_id]);
    await client.query('COMMIT');
    res.json({ message: 'Account deleted successfully.' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('deleteAccount error:', err);
    res.status(500).json({ error: 'Failed to delete account.' });
  } finally {
    client.release();
  }
};

module.exports = { getProfile, updateProfile, getPreferences, updatePreferences, getMyRoom, deleteAccount };