const express = require('express');
const {
  create,
  confirm,
  myPayments,
  getById,
  listAll,
  momoIpn,
} = require('../controllers/paymentController');
const { auth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.post('/momo/ipn', momoIpn);

router.use(auth);

router.get('/', myPayments);
router.get('/admin', requireRole('admin'), listAll);
router.get('/:id', getById);
router.post('/course/:courseId', create);
router.post('/:paymentId/confirm', confirm);

module.exports = router;
