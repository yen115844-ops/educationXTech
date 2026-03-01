const express = require('express');
const {
  submit,
  getMySubmission,
  getMySubmissionsByCourse,
  getAllSubmissionsByExercise,
  getAllSubmissionsByCourse,
} = require('../controllers/submissionController');
const { auth, requireRole } = require('../middleware/auth');
const router = express.Router();

router.use(auth);

// Học viên nộp bài
router.post('/:exerciseId', submit);

// Học viên xem kết quả mình
router.get('/exercise/:exerciseId/my', getMySubmission);

// Học viên xem tất cả submissions trong 1 khóa
router.get('/course/:courseId/my', getMySubmissionsByCourse);

// Instructor / Admin xem tất cả submissions cho 1 bài tập
router.get('/exercise/:exerciseId/all', requireRole('instructor', 'admin'), getAllSubmissionsByExercise);

// Instructor / Admin xem tất cả submissions cho 1 khóa học
router.get('/course/:courseId/all', requireRole('instructor', 'admin'), getAllSubmissionsByCourse);

module.exports = router;
