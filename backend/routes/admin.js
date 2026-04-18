const express = require('express');
const { getStudents, getAllocations, runAllocationApi } = require('../controllers/adminController');
const { verifyJWT, checkRole } = require('../middleware/auth');

const router = express.Router();

// All admin routes require a valid JWT and ADMIN role
router.use(verifyJWT, checkRole(['ADMIN']));

router.get('/students',        getStudents);
router.get('/allocations',     getAllocations);
router.post('/run-allocation', runAllocationApi);

module.exports = router;
