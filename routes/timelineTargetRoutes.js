const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/authMiddleware");
const {
  listTimelineTargets,
  updateTimelineTarget,
} = require("../controllers/timelineTargetController");

router.get("/", verifyToken, listTimelineTargets);
router.put("/:sno", verifyToken, updateTimelineTarget);

module.exports = router;
