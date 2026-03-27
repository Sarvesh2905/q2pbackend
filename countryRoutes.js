const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/authMiddleware");
const {
  listCountries,
  createCountry,
  updateCountry,
  toggleCountryStatus,
  checkCountryExists,
} = require("../controllers/countryController");

router.get("/", verifyToken, listCountries);
router.get("/check", verifyToken, checkCountryExists);
router.post("/", verifyToken, createCountry);
router.put("/:sno", verifyToken, updateCountry);
router.patch("/:sno/status", verifyToken, toggleCountryStatus);

module.exports = router;
