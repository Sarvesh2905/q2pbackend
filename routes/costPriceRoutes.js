const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/authMiddleware");
const {
  listCostPrices,
  createCostPrice,
  editCostPrice,
  toggleStatus,
  checkExists,
  getProducts,
  getCurrencies,
} = require("../controllers/costPriceController");

router.get("/check", verifyToken, checkExists);
router.get("/products", verifyToken, getProducts);
router.get("/currencies", verifyToken, getCurrencies);
router.get("/", verifyToken, listCostPrices);
router.post("/", verifyToken, createCostPrice);
router.put("/:sno", verifyToken, editCostPrice);
router.patch("/:sno/status", verifyToken, toggleStatus);

module.exports = router;
