const express = require('express');
const {
  list,
  getProfile,
  getById,
  updateProfile,
  changePassword,
  updateById,
  deleteById,
} = require('../controllers/userController');
const { auth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(auth);

router.get('/profile', getProfile);
router.patch('/profile', updateProfile);
router.post('/change-password', changePassword);

router.get('/', requireRole('admin'), list);
router.get('/:id', requireRole('admin'), getById);
router.patch('/:id', requireRole('admin'), updateById);
router.delete('/:id', requireRole('admin'), deleteById);

module.exports = router;
