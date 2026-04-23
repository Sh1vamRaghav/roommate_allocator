/**
 * routes/student.js
 * Application Layer — Student Route Definitions
 *
 * Requirement Traceability:
 *   REQ-3  → router.use(verifyJWT)    — only authenticated users access these routes
 *   REQ-5  → GET  /profile            — display personal information
 *   REQ-7  → PUT  /profile            — update personal information
 *   REQ-6  → GET  /preferences        — display preference information
 *   REQ-8  → PUT  /preferences        — update preference information
 *   REQ-13 → GET  /my-room            — student views assigned room
 *
 * Design Traceability:
 *   D-SEC-01 → JWT verified before any student handler is reached
 *   D-SQ-01  → Routes correspond to profile/preference update sequences
 *   D-SQ-02  → /my-room corresponds to Step 8 of the allocation sequence
 */

const express = require('express');
const {
  getProfile, updateProfile,
  getPreferences, updatePreferences,
  getMyRoom,
  deleteAccount,
} = require('../controllers/studentController');
const { verifyJWT } = require('../middleware/auth');

const router = express.Router();

// REQ-3 / D-SEC-01: All student routes require a valid JWT (students cannot access admin routes)
router.use(verifyJWT);

router.get('/profile',     getProfile);     // REQ-5
router.put('/profile',     updateProfile);  // REQ-7, REQ-9
router.delete('/profile',  deleteAccount);  // Supporting feature — account self-deletion

router.get('/preferences', getPreferences);    // REQ-6
router.put('/preferences', updatePreferences); // REQ-8, REQ-9

router.get('/my-room', getMyRoom); // REQ-13

module.exports = router;