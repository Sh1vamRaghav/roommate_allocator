const db = require('../models/db');

// Convert TIME string (HH:MM:SS) to minutes since midnight
const timeToMinutes = (timeStr) => {
  if (!timeStr) return 0;
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

// Similarity score between two preference sets (lower = more compatible)
const similarityScore = (p1, p2) => {
  const s_sleep  = Math.abs(timeToMinutes(p1.sleep_time) - timeToMinutes(p2.sleep_time));
  const s_wake   = Math.abs(timeToMinutes(p1.wake_time)  - timeToMinutes(p2.wake_time));
  const s_noise  = Math.abs((p1.preferred_study_noise_level  ?? 0) - (p2.preferred_study_noise_level  ?? 0));
  const s_guests = Math.abs((p1.guest_visits_per_month       ?? 0) - (p2.guest_visits_per_month       ?? 0));
  const s_temp   = Math.abs((p1.preferred_room_temperature   ?? 0) - (p2.preferred_room_temperature   ?? 0));
  return s_sleep + s_wake + s_noise + s_guests + s_temp;
};

const runAllocation = async () => {
  const { pool } = db;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Clear existing allocations
    await client.query('DELETE FROM ALLOCATIONS');

    // Fetch all students with their preferences
    const { rows: students } = await client.query(`
      SELECT u.user_id, p.*
      FROM USERS u
      LEFT JOIN PREFERENCES p ON u.user_id = p.user_id
      WHERE u.role = 'STUDENT'
    `);

    if (students.length < 2) {
      await client.query('COMMIT');
      return { allocated: 0, total_students: students.length, unallocated: students.length, message: 'Not enough students to allocate' };
    }

    // Fetch rooms sorted by capacity ascending (fill smaller rooms first)
    const { rows: rooms } = await client.query('SELECT * FROM ROOMS ORDER BY capacity ASC');

    let candidates = [...students];
    let allocated = 0;

    for (const room of rooms) {
      if (candidates.length === 0) break;

      const roomStudents = [];

      while (roomStudents.length < room.capacity && candidates.length > 0) {
        let bestCandidate = null;
        let bestScore = Infinity;

        for (const cand of candidates) {
          // Score = average similarity to current room occupants (0 if room is empty)
          const score = roomStudents.length > 0
            ? roomStudents.reduce((sum, rs) => sum + similarityScore(rs, cand), 0) / roomStudents.length
            : 0;

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

      // Insert allocations for this room
      for (const student of roomStudents) {
        await client.query(
          'INSERT INTO ALLOCATIONS (user_id, room_id) VALUES ($1, $2)',
          [student.user_id, room.room_id]
        );
      }
    }

    await client.query('COMMIT');
    return {
      allocated,
      total_students: students.length,
      unallocated: students.length - allocated,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    // Always release exactly once — in finally, not inside try
    client.release();
  }
};

module.exports = { runAllocation };
