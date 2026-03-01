const express = require('express');
const {
  enroll,
  getMyEnrollment,
  updateProgress,
  listByUser,
} = require('../controllers/enrollmentController');
const { auth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(auth);
router.use(requireRole('student', 'admin'));

router.get('/', listByUser);
router.post('/:courseId', enroll);
router.get('/:courseId', getMyEnrollment);
router.patch('/:courseId/progress', updateProgress);

module.exports = router;
