const db = require('../models/db');

// Convert TIME to minutes since midnight
const timeToMinutes = (timeStr) => {
  if (!timeStr) return 0;
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

// Similarity score between two prefs (lower = better)
const similarityScore = (p1, p2) => {
  const s_sleep = Math.abs(timeToMinutes(p1.sleep_time) - timeToMinutes(p2.sleep_time));
  const s_wake = Math.abs(timeToMinutes(p1.wake_time) - timeToMinutes(p2.wake_time));
  const s_noise = Math.abs(p1.preferred_study_noise_level - p2.preferred_study_noise_level || 0);
  const s_guests = Math.abs(p1.guest_visits_per_month - p2.guest_visits_per_month || 0);
  const s_temp = Math.abs(p1.preferred_room_temperature - p2.preferred_room_temperature || 0);
  return s_sleep + s_wake + s_noise + s_guests + s_temp;
};

const runAllocation = async () => {
  const client = await db.query('BEGIN');
  try {
    // Clear existing allocations
    await db.query('DELETE FROM ALLOCATIONS');

    // Fetch students with complete prefs
    const { rows: students } = await db.query(`
      SELECT u.user_id, p.*
      FROM USERS u
      JOIN PREFERENCES p ON u.user_id = p.user_id
      WHERE u.role = 'STUDENT'
    `);

    if (students.length < 2) {
      await db.query('COMMIT');
      return { allocated: 0, message: 'Insufficient students with preferences' };
    }

    // Fetch empty rooms sorted by capacity ASC
    const { rows: rooms } = await db.query('SELECT * FROM ROOMS ORDER BY capacity ASC');

    let allocated = 0;
    let roomIdx = 0;

    // Greedy assignment: for each room, fill with most compatible students
    for (const room of rooms) {
      let roomStudents = [];
      let candidates = [...students];

      // Fill room up to capacity
      while (roomStudents.length < room.capacity && candidates.length > 0) {
        let bestCandidate = null;
        let bestScore = Infinity;

        for (const cand of candidates) {
          let score = 0;
          if (roomStudents.length > 0) {
            // Avg similarity to current room group
            score = roomStudents.reduce((sum, rs) => sum + similarityScore(rs, cand), 0) / roomStudents.length;
          }
          if (score < bestScore) {
            bestScore = score;
            bestCandidate = cand;
          }
        }

        if (bestCandidate) {
          roomStudents.push(bestCandidate);
          candidates = candidates.filter(c => c.user_id !== bestCandidate.user_id);
          allocated++;
        } else {
          break;
        }
      }

      // Assign to room
      for (const stu of roomStudents) {
        await db.query(
          'INSERT INTO ALLOCATIONS (user_id, room_id) VALUES ($1, $2)',
          [stu.user_id, room.room_id]
        );
      }

      if (candidates.length === 0) break;
    }

    await db.query('COMMIT');
    return { allocated, total_students: students.length, unallocated: students.length - allocated };
  } catch (err) {
    await db.query('ROLLBACK');
    throw err;
  }
};

module.exports = { runAllocation };

