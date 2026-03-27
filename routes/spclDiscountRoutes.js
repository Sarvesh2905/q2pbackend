const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/authMiddleware");
const {
  listSpclDiscounts,
  createSpclDiscount,
  toggleStatus,
  checkExists,
  getCustomers,
} = require("../controllers/spclDiscountController");

router.get("/customers", verifyToken, getCustomers);
router.get("/check", verifyToken, checkExists);
router.get("/", verifyToken, listSpclDiscounts);
router.post("/", verifyToken, createSpclDiscount);
router.patch("/:sno/status", verifyToken, toggleStatus);

module.exports = router;
