const { runAllocation } = require('../services/allocationService');
const db = require('../models/db');

const getStudents = async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT
        u.user_id, u.name, u.email, u.role,
        p.sleep_time, p.wake_time,
        p.preferred_study_noise_level,
        p.guest_visits_per_month,
        p.preferred_room_temperature
      FROM USERS u
      LEFT JOIN PREFERENCES p ON u.user_id = p.user_id
      WHERE u.role = 'STUDENT'
      ORDER BY u.name
    `);
    res.json(rows);
  } catch (err) {
    console.error('getStudents error:', err);
    res.status(500).json({ error: 'Failed to fetch students.' });
  }
};

const getAllocations = async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT
        a.allocation_id,
        a.user_id,
        u.name  AS student_name,
        u.email,
        a.room_id,
        r.capacity
      FROM ALLOCATIONS a
      JOIN USERS u ON a.user_id = u.user_id
      JOIN ROOMS r ON a.room_id = r.room_id
      ORDER BY a.room_id, u.name
    `);
    res.json(rows);
  } catch (err) {
    console.error('getAllocations error:', err);
    res.status(500).json({ error: 'Failed to fetch allocations.' });
  }
};

const runAllocationApi = async (req, res) => {
  try {
    const result = await runAllocation();
    res.json(result);
  } catch (err) {
    console.error('runAllocation error:', err);
    res.status(500).json({ error: 'Allocation failed: ' + err.message });
  }
};

module.exports = { getStudents, getAllocations, runAllocationApi };
