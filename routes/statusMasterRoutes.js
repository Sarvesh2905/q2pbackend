const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/authMiddleware");
const {
  listStatuses,
  createStatus,
  editStatus,
  toggleStatus,
  checkExists,
} = require("../controllers/statusMasterController");

router.get("/check", verifyToken, checkExists);
router.get("/", verifyToken, listStatuses);
router.post("/", verifyToken, createStatus);
router.put("/:sno", verifyToken, editStatus);
router.patch("/:sno/status", verifyToken, toggleStatus);

module.exports = router;
