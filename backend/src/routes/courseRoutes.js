const express = require('express');
const {
  list,
  getById,
  create,
  update,
  remove,
  myCourses,
} = require('../controllers/courseController');
const { auth, optionalAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', optionalAuth, list);
router.get('/my', auth, myCourses);
router.get('/:id', optionalAuth, getById);

router.post('/', auth, requireRole('instructor', 'admin'), create);
router.patch('/:id', auth, requireRole('instructor', 'admin'), update);
router.delete('/:id', auth, requireRole('instructor', 'admin'), remove);

module.exports = router;
