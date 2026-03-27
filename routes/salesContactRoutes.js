const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/authMiddleware");
const {
  listSalesContacts,
  createSalesContact,
  updateSalesContact,
  toggleSalesContactStatus,
  checkSalesContactExists,
} = require("../controllers/salesContactController");

router.get("/", verifyToken, listSalesContacts);
router.get("/check", verifyToken, checkSalesContactExists);
router.post("/", verifyToken, createSalesContact);
router.put("/:sno", verifyToken, updateSalesContact);
router.patch("/:sno/status", verifyToken, toggleSalesContactStatus);

module.exports = router;
