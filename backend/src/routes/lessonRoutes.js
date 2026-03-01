const express = require('express');
const {
  listByCourse,
  getById,
  create,
  update,
  remove,
} = require('../controllers/lessonController');
const { auth, optionalAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/course/:courseId', optionalAuth, listByCourse);
router.get('/:id', optionalAuth, getById);

router.post('/course/:courseId', auth, requireRole('instructor', 'admin'), create);
router.patch('/:id', auth, requireRole('instructor', 'admin'), update);
router.delete('/:id', auth, requireRole('instructor', 'admin'), remove);

module.exports = router;
