const express = require('express');
const {
  getProfile, updateProfile, getPreferences, updatePreferences, getMyRoom
} = require('../controllers/studentController');
const router = express.Router();

router.get('/profile', getProfile);
router.put('/profile', updateProfile);

router.get('/preferences', getPreferences);
router.put('/preferences', updatePreferences);

router.get('/my-room', getMyRoom);

module.exports = router;

