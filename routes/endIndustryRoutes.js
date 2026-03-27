const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/authMiddleware");
const {
  listEndIndustries,
  createEndIndustry,
  editEndIndustry,
  checkExists,
} = require("../controllers/endIndustryController");

router.get("/check", verifyToken, checkExists);
router.get("/", verifyToken, listEndIndustries);
router.post("/", verifyToken, createEndIndustry);
router.put("/:sno", verifyToken, editEndIndustry);

module.exports = router;
