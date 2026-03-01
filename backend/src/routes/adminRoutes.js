const express = require('express');
const { stats, charts } = require('../controllers/adminController');
const { auth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(auth);
router.use(requireRole('admin'));

router.get('/stats', stats);
router.get('/charts', charts);

module.exports = router;
