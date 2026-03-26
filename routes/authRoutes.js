const express = require("express");
const router = express.Router();
const {
  login,
  checkEmail,
  sendOTP,
  verifyOTP,
  createAccount,
  getSites,
} = require("../controllers/authController");

router.post("/login", login);
router.post("/check-email", checkEmail);
router.post("/send-otp", sendOTP);
router.post("/verify-otp", verifyOTP);
router.post("/create-account", createAccount);
router.get("/sites", getSites);

module.exports = router;
