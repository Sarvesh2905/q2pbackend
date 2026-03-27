const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/authMiddleware");
const {
  listReasons,
  createReason,
  editReason,
  checkExists,
} = require("../controllers/reasonController");

router.get("/check", verifyToken, checkExists);
router.get("/", verifyToken, listReasons);
router.post("/", verifyToken, createReason);
router.put("/:sno", verifyToken, editReason);

module.exports = router;
