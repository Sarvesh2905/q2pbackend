const express = require('express');
const router  = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const {
  listDiscounts, createDiscount, updateDiscount,
  checkExists, getCategories, getProducts
} = require('../controllers/discountController');

router.get('/categories', verifyToken, getCategories);
router.get('/products',   verifyToken, getProducts);
router.get('/check',      verifyToken, checkExists);
router.get('/',           verifyToken, listDiscounts);
router.post('/',          verifyToken, createDiscount);
router.put('/:sno',       verifyToken, updateDiscount);

module.exports = router;