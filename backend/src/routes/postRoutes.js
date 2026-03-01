const express = require('express');
const { list, getById, create, update, remove } = require('../controllers/postController');
const { auth, optionalAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', optionalAuth, list);
router.get('/:id', optionalAuth, getById);

router.post('/', auth, create);
router.patch('/:id', auth, update);
router.delete('/:id', auth, remove);

module.exports = router;
