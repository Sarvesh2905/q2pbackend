const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/authMiddleware");
const {
  listCustomerTypes,
  createCustomerType,
  toggleStatus,
  checkExists,
} = require("../controllers/customerTypeController");

router.get("/check", verifyToken, checkExists);
router.get("/", verifyToken, listCustomerTypes);
router.post("/", verifyToken, createCustomerType);
router.patch("/:sno/status", verifyToken, toggleStatus);

module.exports = router;
