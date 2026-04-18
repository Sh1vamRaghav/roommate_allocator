const { body, validationResult } = require('express-validator');
const db = require('../models/db');

const getProfile = async (req, res) => {
  try {
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

const updateProfile = [
  body('name').optional().trim().isLength({ min: 2 }).escape(),
  body('email').optional().isEmail().normalizeEmail(),

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { name, email } = req.body;

    try {
      if (email) {
        const { rows } = await db.query(
          'SELECT 1 FROM USERS WHERE email = $1 AND user_id != $2',
          [email, req.user.user_id]
        );
        if (rows.length > 0) return res.status(400).json({ error: 'This email is already in use.' });
      }

      const fields = [];
      const values = [];
      let idx = 1;

      if (name  !== undefined) { fields.push(`name = $${idx++}`);  values.push(name); }
      if (email !== undefined) { fields.push(`email = $${idx++}`); values.push(email); }

      if (fields.length === 0) return res.json({ message: 'No changes to save.' });

      values.push(req.user.user_id);
      await db.query(`UPDATE USERS SET ${fields.join(', ')} WHERE user_id = $${idx}`, values);
      res.json({ message: 'Profile updated successfully.' });
    } catch (err) {
      console.error('updateProfile error:', err);
      res.status(500).json({ error: 'Failed to update profile.' });
    }
  },
];

const getPreferences = async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM PREFERENCES WHERE user_id = $1',
      [req.user.user_id]
    );
    res.json(rows[0] || {});
  } catch (err) {
    console.error('getPreferences error:', err);
    res.status(500).json({ error: 'Failed to fetch preferences.' });
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

    const { sleep_time, wake_time, preferred_study_noise_level, guest_visits_per_month, preferred_room_temperature } = req.body;

    try {
      await db.query('DELETE FROM PREFERENCES WHERE user_id = $1', [req.user.user_id]);

      await db.query(
        `INSERT INTO PREFERENCES
          (user_id, sleep_time, wake_time, preferred_study_noise_level, guest_visits_per_month, preferred_room_temperature)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [req.user.user_id, sleep_time, wake_time, preferred_study_noise_level, guest_visits_per_month, preferred_room_temperature]
      );

      res.json({ message: 'Preferences updated successfully.' });
    } catch (err) {
      console.error('updatePreferences error:', err);
      res.status(500).json({ error: 'Failed to update preferences.' });
    }
  },
];


const getMyRoom = async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT a.room_id, r.capacity
      FROM ALLOCATIONS a
      JOIN ROOMS r ON a.room_id = r.room_id
      WHERE a.user_id = $1
    `, [req.user.user_id]);

    if (rows.length === 0) return res.json({ message: 'No room assigned yet.' });
    res.json(rows[0]);
  } catch (err) {
    console.error('getMyRoom error:', err);
    res.status(500).json({ error: 'Failed to fetch room information.' });
  }
};


const deleteAccount = async (req, res) => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM ALLOCATIONS WHERE user_id = $1', [req.user.user_id]);
    await client.query('DELETE FROM PREFERENCES WHERE user_id = $1', [req.user.user_id]);
    await client.query('DELETE FROM USERS WHERE user_id = $1', [req.user.user_id]);
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

