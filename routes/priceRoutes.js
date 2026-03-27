const express = require('express');
const router  = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const {
  listPrices, createPrice, updatePrice, togglePriceStatus, downloadPrices,
  listLtsaPrices, createLtsaPrice, updateLtsaPrice, toggleLtsaPriceStatus,
  downloadLtsaPrices, getNextLtsaCode, checkLtsaCodeExists
} = require('../controllers/priceController');

// Standard Price
router.get('/standard',               verifyToken, listPrices);
router.post('/standard',              verifyToken, createPrice);
router.put('/standard/:sno',          verifyToken, updatePrice);
router.patch('/standard/:sno/status', verifyToken, togglePriceStatus);
router.get('/download-standard',      verifyToken, downloadPrices);

// LTSA Price
router.get('/ltsa',                   verifyToken, listLtsaPrices);
router.post('/ltsa',                  verifyToken, createLtsaPrice);
router.put('/ltsa/:sno',              verifyToken, updateLtsaPrice);
router.patch('/ltsa/:sno/status',     verifyToken, toggleLtsaPriceStatus);
router.get('/download-ltsa',          verifyToken, downloadLtsaPrices);
router.get('/next-ltsa-code',         verifyToken, getNextLtsaCode);
router.get('/check-ltsa-code',        verifyToken, checkLtsaCodeExists);

module.exports = router;