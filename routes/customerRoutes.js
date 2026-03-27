const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const {
  listCustomers,
  createCustomer,
  updateCustomer,
  toggleCustomerStatus,
  checkCustomerExists,
  getDropdownTypes,
  getDropdownCountries,
  getDropdownCategories,
  getDropdownLtsaCodes
} = require('../controllers/customerController');

router.get('/',                    verifyToken, listCustomers);
router.get('/check',               verifyToken, checkCustomerExists);
router.get('/dropdown/types',      verifyToken, getDropdownTypes);
router.get('/dropdown/countries',  verifyToken, getDropdownCountries);
router.get('/dropdown/categories', verifyToken, getDropdownCategories);
router.get('/dropdown/ltsa-codes', verifyToken, getDropdownLtsaCodes);
router.post('/',                   verifyToken, createCustomer);
router.put('/:sno',                verifyToken, updateCustomer);
router.patch('/:sno/status',       verifyToken, toggleCustomerStatus);

module.exports = router;