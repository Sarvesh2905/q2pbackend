const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const {
  listBuyers,
  createBuyer,
  updateBuyer,
  toggleBuyerStatus,
  checkBuyerExists,
  getCustomerOptions
} = require('../controllers/buyerController');

router.get('/',                       verifyToken, listBuyers);
router.get('/check',                  verifyToken, checkBuyerExists);
router.get('/dropdown/customers',     verifyToken, getCustomerOptions);
router.post('/',                      verifyToken, createBuyer);
router.put('/:sno',                   verifyToken, updateBuyer);
router.patch('/:sno/status',          verifyToken, toggleBuyerStatus);

module.exports = router;