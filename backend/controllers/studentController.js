const { body, validationResult } = require('express-validator');
const db = require('../models/db');

const getProfile = async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT user_id, name, email, role FROM USERS WHERE user_id = $1',
      [req.user.user_id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Profile fetch fail' });
  }
};

const updateProfile = [
  body('name').optional().trim().isLength({ min: 2 }).escape(),
  body('email').optional().isEmail().normalizeEmail(),

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { name, email } = req.body;

    try {
      if (email) {
        const { rows } = await db.query('SELECT 1 FROM USERS WHERE email = $1 AND user_id != $2', [email, req.user.user_id]);
        if (rows.length > 0) return res.status(400).json({ error: 'Email taken' });
      }

      const fields = [];
      const values = [];
      let idx = 1;
      if (name !== undefined) {
        fields.push(`name = $${idx++}`);
        values.push(name);
      }
      if (email !== undefined) {
        fields.push(`email = $${idx++}`);
        values.push(email);
      }
      values.push(req.user.user_id);

      if (fields.length === 0) return res.json({ message: 'No changes' });

      await db.query(`UPDATE USERS SET ${fields.join(', ')} WHERE user_id = $${idx}`, values);
      res.json({ message: 'Profile updated' });
    } catch (err) {
      res.status(500).json({ error: 'Update fail' });
    }
  }
];

const getPreferences = async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM PREFERENCES WHERE user_id = $1',
      [req.user.user_id]
    );
    res.json(rows[0] || {});
  } catch (err) {
    res.status(500).json({ error: 'Prefs fetch fail' });
  }
};

const updatePreferences = [
  body('sleep_time').optional().isTime(),
  body('wake_time').optional().isTime(),
  body('preferred_study_noise_level').optional().isInt({ min: 0, max: 10 }),
  body('guest_visits_per_month').optional().isInt({ min: 0, max: 31 }),
  body('preferred_room_temperature').optional().isInt({ min: 15, max: 30 }),

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const prefs = req.body;

    try {
      await db.query('DELETE FROM PREFERENCES WHERE user_id = $1', [req.user.user_id]);
      if (Object.keys(prefs).length > 0) {
        await db.query(
          `INSERT INTO PREFERENCES (user_id, sleep_time, wake_time, preferred_study_noise_level, 
            guest_visits_per_month, preferred_room_temperature) 
          VALUES ($1, $2, $3, $4, $5, $6)`,
          [req.user.user_id, prefs.sleep_time, prefs.wake_time, prefs.preferred_study_noise_level, 
           prefs.guest_visits_per_month, prefs.preferred_room_temperature]
        );
      }
      res.json({ message: 'Preferences updated' });
    } catch (err) {
      res.status(500).json({ error: 'Prefs update fail' });
    }
  }
];

const getMyRoom = async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT a.*, r.capacity, u.name as roommate_name
      FROM ALLOCATIONS a
      JOIN ROOMS r ON a.room_id = r.room_id
      LEFT JOIN ALLOCATIONS ar ON ar.room_id = a.room_id AND ar.user_id != a.user_id
      LEFT JOIN USERS u ON ar.user_id = u.user_id
      WHERE a.user_id = $1
    `, [req.user.user_id]);
    if (rows.length === 0) return res.json({ message: 'No room assigned yet' });
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Room fetch fail' });
  }
};

module.exports = {
  getProfile, updateProfile, getPreferences, updatePreferences, getMyRoom
};

