const express = require('express');
const {
  getProfile, updateProfile,
  getPreferences, updatePreferences,
  getMyRoom,
  deleteAccount
} = require('../controllers/studentController');
const { verifyJWT } = require('../middleware/auth');

const router = express.Router();

// All student routes require a valid JWT
router.use(verifyJWT);

router.get('/profile',     getProfile);
router.put('/profile',     updateProfile);
router.delete('/profile',  deleteAccount);

router.get('/preferences', getPreferences);
router.put('/preferences', updatePreferences);

router.get('/my-room', getMyRoom);

module.exports = router;
