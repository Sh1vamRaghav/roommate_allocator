/**
 * routes/admin.js
 * Application Layer — Admin Route Definitions
 *
 * Requirement Traceability:
 *   REQ-3  → router.use(verifyJWT, checkRole(['ADMIN'])) — unauthorized access prevention
 *   REQ-10 → POST /run-allocation — admin initiates allocation (D-SQ-02)
 *   REQ-5  → GET  /students       — admin views all student data
 *   REQ-13 → GET  /allocations    — admin views all current room assignments
 *
 * Design Traceability:
 *   D-SEC-01 → RBAC enforced at route level before any controller is reached
 *   D-SQ-02  → Route entry point for the allocation sequence diagram
 */

const express = require('express');
const { getStudents, getAllocations, runAllocationApi } = require('../controllers/adminController');
const { verifyJWT, checkRole } = require('../middleware/auth');

const router = express.Router();

// REQ-3 / D-SEC-01: Apply JWT verification and ADMIN role check to ALL admin routes.
// Any request without a valid ADMIN token is rejected before reaching the controllers.
router.use(verifyJWT, checkRole(['ADMIN']));

router.get('/students',        getStudents);      // REQ-5
router.get('/allocations',     getAllocations);   // REQ-13
router.post('/run-allocation', runAllocationApi); // REQ-10, REQ-11, REQ-12

module.exports = router;