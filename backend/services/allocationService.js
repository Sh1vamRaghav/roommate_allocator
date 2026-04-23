/**
 * allocationService.js
 * Application Layer — Allocation Engine
 *
 * Requirement Traceability:
 *   REQ-10 → runAllocation()      — called when admin initiates allocation
 *   REQ-11 → runAllocation()      — implements the greedy compatibility algorithm
 *   REQ-12 → runAllocation()      — commits results to ALLOCATIONS table transactionally
 *
 * Design Traceability:
 *   D-CL-02  → AllocationEngine class: assignRoom(), removeAllocation() operations
 *   D-DB-01  → USERS, PREFERENCES, ALLOCATIONS, ROOMS tables
 *   D-SQ-02  → Room Allocation Sequence Diagram — this file implements steps 3–6:
 *                Step 3: retrieve unallocated students & preferences
 *                Step 4: retrieve available rooms & capacities
 *                Step 5: run allocation algorithm (greedy, per-room loop)
 *                Step 6: store assignments in ALLOCATIONS table
 *
 * Algorithm: Greedy similarity scoring — O(n² × r) where n = students, r = rooms
 *   For each room, the candidate with the lowest average preference difference
 *   to current occupants is selected next. Lower score = more compatible.
 */

const db = require('../models/db');

// ── Helper: TIME string → minutes since midnight ─────────────────────────────
// Used by similarityScore() to compute sleep/wake time differences numerically
// Supports HH:MM and HH:MM:SS (PostgreSQL TIME format)
const timeToMinutes = (timeStr) => {
  if (!timeStr) return 0;
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

// ── REQ-11 / D-CL-02: Compatibility Score Between Two Students ───────────────
// Returns a non-negative integer — lower score means more compatible lifestyles.
// Five preference dimensions from D-DB-01 (PREFERENCES table) and D-CL-01 (Preference class):
//   1. sleep_time              — absolute minute difference
//   2. wake_time               — absolute minute difference
//   3. preferred_study_noise_level  — absolute integer difference (0–10)
//   4. guest_visits_per_month  — absolute integer difference (0–31)
//   5. preferred_room_temperature   — absolute integer difference (15–30)
// Null preferences are treated as 0 (neutral) via ?? operator
const similarityScore = (p1, p2) => {
  const s_sleep  = Math.abs(timeToMinutes(p1.sleep_time) - timeToMinutes(p2.sleep_time));
  const s_wake   = Math.abs(timeToMinutes(p1.wake_time)  - timeToMinutes(p2.wake_time));
  const s_noise  = Math.abs((p1.preferred_study_noise_level  ?? 0) - (p2.preferred_study_noise_level  ?? 0));
  const s_guests = Math.abs((p1.guest_visits_per_month       ?? 0) - (p2.guest_visits_per_month       ?? 0));
  const s_temp   = Math.abs((p1.preferred_room_temperature   ?? 0) - (p2.preferred_room_temperature   ?? 0));
  return s_sleep + s_wake + s_noise + s_guests + s_temp;
};

// ── REQ-10 / REQ-11 / REQ-12: Main Allocation Function ──────────────────────
// Implements: D-CL-02 (AllocationEngine), D-SQ-02 (Steps 3–6)
// Wrapped in a single DB transaction — on any error, ROLLBACK ensures no partial state (REQ-12)
const runAllocation = async () => {
  const { pool } = db;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // REQ-11 / D-SQ-02 Step 3a: Clear all prior allocations before re-running
    // D-DB-01: ALLOCATIONS.user_id has UNIQUE constraint — delete prevents duplicates
    await client.query('DELETE FROM ALLOCATIONS');

    // REQ-11 / D-SQ-02 Step 3: Fetch all students with their preferences
    // LEFT JOIN includes students who haven't submitted preferences (treated as all-zero)
    const { rows: students } = await client.query(`
      SELECT u.user_id, p.*
      FROM USERS u
      LEFT JOIN PREFERENCES p ON u.user_id = p.user_id
      WHERE u.role = 'STUDENT'
    `);

    // REQ-11: Need at least 2 students to form a meaningful allocation
    if (students.length < 2) {
      await client.query('COMMIT');
      return {
        allocated: 0,
        total_students: students.length,
        unallocated: students.length,
        message: 'Not enough students to allocate',
      };
    }

    // REQ-11 / D-SQ-02 Step 4: Fetch available rooms sorted smallest → largest
    // D-DB-01: ROOMS table (room_id, capacity); smaller rooms are filled first
    const { rows: rooms } = await client.query('SELECT * FROM ROOMS ORDER BY capacity ASC');

    let candidates = [...students]; // pool of unassigned students
    let allocated  = 0;

    // REQ-11 / D-SQ-02 Step 5: Greedy allocation loop — one room at a time
    for (const room of rooms) {
      if (candidates.length === 0) break;

      const roomStudents = []; // students assigned to this room so far

      // Fill room up to its capacity
      while (roomStudents.length < room.capacity && candidates.length > 0) {
        let bestCandidate = null;
        let bestScore     = Infinity;

        // REQ-11 / D-CL-02: Score each remaining candidate against current room occupants
        for (const cand of candidates) {
          // Average similarity to all current occupants (0 if room is empty — first pick is free)
          const score = roomStudents.length > 0
            ? roomStudents.reduce((sum, rs) => sum + similarityScore(rs, cand), 0) / roomStudents.length
            : 0;

          if (score < bestScore) {
            bestScore     = score;
            bestCandidate = cand;
          }
        }

        if (bestCandidate) {
          roomStudents.push(bestCandidate);
          // Remove selected student from the global candidate pool
          candidates = candidates.filter(c => c.user_id !== bestCandidate.user_id);
          allocated++;
        } else {
          break;
        }
      }

      // REQ-12 / D-SQ-02 Step 6 / D-DB-01: Insert allocation records for this room
      // Parameterized queries — D-SEC-02
      for (const student of roomStudents) {
        await client.query(
          'INSERT INTO ALLOCATIONS (user_id, room_id) VALUES ($1, $2)',
          [student.user_id, room.room_id]
        );
      }
    }

    // REQ-12 / D-DB-01: Commit the full allocation as a single atomic transaction
    // On failure anywhere above, ROLLBACK in the catch block ensures no partial writes
    await client.query('COMMIT');

    return {
      allocated,
      total_students: students.length,
      unallocated:    students.length - allocated,
    };

  } catch (err) {
    // REQ-12: Transactional rollback — ALLOCATIONS table is left unchanged on error
    await client.query('ROLLBACK');
    throw err;
  } finally {
    // Release connection exactly once — in finally to cover both success and error paths
    client.release();
  }
};

module.exports = { runAllocation };