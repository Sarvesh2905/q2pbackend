const express = require('express');
const router  = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const {
  listProducts, createProduct, updateProduct,
  toggleProductStatus, checkProductExists
} = require('../controllers/productController');

router.get('/',              verifyToken, listProducts);
router.get('/check',         verifyToken, checkProductExists);
router.post('/',             verifyToken, createProduct);
router.put('/:sno',          verifyToken, updateProduct);
router.patch('/:sno/status', verifyToken, toggleProductStatus);

module.exports = router;