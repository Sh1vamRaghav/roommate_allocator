/**
 * adminController.js
 * Application Layer — Admin Module
 *
 * Requirement Traceability:
 *   REQ-10 → runAllocationApi() — admin initiates room allocation
 *   REQ-11 → runAllocationApi() → allocationService.runAllocation() — assigns students to rooms
 *   REQ-12 → runAllocationApi() — allocation results stored in ALLOCATIONS table
 *   REQ-5  → getStudents()     — admin views all student personal + preference information
 *   REQ-13 → getAllocations()  — admin views all current room assignments
 *
 * Design Traceability:
 *   D-CL-02  → AllocationEngine (allocation logic delegated to allocationService)
 *   D-DB-01  → USERS, PREFERENCES, ALLOCATIONS, ROOMS tables
 *   D-SEC-01 → All routes protected by verifyJWT + checkRole(['ADMIN']) in routes/admin.js
 *   D-SQ-02  → Room Allocation Sequence Diagram: steps 2–7
 *   D-SEC-02 → Parameterized queries used throughout
 */

const { runAllocation } = require('../services/allocationService');
const db = require('../models/db');

// ── REQ-5 (Admin view): List All Students with Preferences ───────────────────
// Implements: D-DB-01 (JOIN USERS ← PREFERENCES), D-SQ-02 (Step 3: retrieve students & prefs)
// Access control: enforced by verifyJWT + checkRole(['ADMIN']) middleware in routes/admin.js
const getStudents = async (req, res) => {
  try {
    // REQ-5 / D-DB-01: LEFT JOIN ensures students without preferences are still listed
    // D-SEC-02: No user-supplied values in this query — no injection risk
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

// ── REQ-13 (Admin view): List All Current Room Allocations ───────────────────
// Implements: D-DB-01 (JOIN ALLOCATIONS → USERS → ROOMS), D-SQ-02 (Step 8: show results)
const getAllocations = async (req, res) => {
  try {
    // REQ-12 / REQ-13 / D-DB-01: Join all three tables to produce a human-readable allocation list
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

// ── REQ-10 / REQ-11 / REQ-12: Admin Initiates Room Allocation ───────────────
// Implements: D-SQ-02 (full sequence), D-CL-02 (AllocationEngine.assignRoom)
// Delegates to allocationService.runAllocation() which owns the algorithm (D-CL-02)
// REQ-12: Results are committed to ALLOCATIONS table inside a DB transaction (see allocationService)
const runAllocationApi = async (req, res) => {
  try {
    // REQ-10 / D-SQ-02 Step 2: Admin's request triggers allocation
    // REQ-11 / D-SQ-02 Step 4–6: Algorithm runs in allocationService (greedy similarity)
    // REQ-12 / D-SQ-02 Step 5: Assignments stored in ALLOCATIONS table (transactional)
    const result = await runAllocation();
    res.json(result);
  } catch (err) {
    console.error('runAllocation error:', err);
    res.status(500).json({ error: 'Allocation failed: ' + err.message });
  }
};

module.exports = { getStudents, getAllocations, runAllocationApi };