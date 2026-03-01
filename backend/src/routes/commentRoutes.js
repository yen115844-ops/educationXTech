const express = require('express');
const { listByPost, create, remove, update } = require('../controllers/commentController');
const { auth, optionalAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/post/:postId', optionalAuth, listByPost);
router.post('/post/:postId', auth, create);
router.patch('/:id', auth, update);
router.delete('/:id', auth, remove);

module.exports = router;
