const express = require("express");
const multer = require("multer");
const router = express.Router();
const { verifyToken } = require("../middleware/authMiddleware");
const {
  listPrices,
  createPrice,
  updatePrice,
  togglePriceStatus,
  downloadPrices,
  downloadStandardTemplate,
  uploadStandardPrices,
  listLtsaPrices,
  createLtsaPrice,
  updateLtsaPrice,
  toggleLtsaPriceStatus,
  downloadLtsaPrices,
  downloadLtsaTemplate,
  uploadLtsaPrices,
  getNextLtsaCode,
  checkLtsaCodeExists,
} = require("../controllers/priceController");

/* ── Multer: memory storage, xlsx only, 5 MB cap ── */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok =
      file.mimetype ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    cb(ok ? null : new Error("Only .xlsx files are allowed"), ok);
  },
});

// ── Standard Price ───────────────────────────────
router.get("/standard", verifyToken, listPrices);
router.post("/standard", verifyToken, createPrice);
router.put("/standard/:sno", verifyToken, updatePrice);
router.patch("/standard/:sno/status", verifyToken, togglePriceStatus);
router.get("/download-standard", verifyToken, downloadPrices);
router.get(
  "/download-template-standard",
  verifyToken,
  downloadStandardTemplate,
);
router.post(
  "/upload-standard",
  verifyToken,
  upload.single("file"),
  uploadStandardPrices,
);

// ── LTSA Price ───────────────────────────────────
router.get("/ltsa", verifyToken, listLtsaPrices);
router.post("/ltsa", verifyToken, createLtsaPrice);
router.put("/ltsa/:sno", verifyToken, updateLtsaPrice);
router.patch("/ltsa/:sno/status", verifyToken, toggleLtsaPriceStatus);
router.get("/download-ltsa", verifyToken, downloadLtsaPrices);
router.get("/download-template-ltsa", verifyToken, downloadLtsaTemplate);
router.post(
  "/upload-ltsa",
  verifyToken,
  upload.single("file"),
  uploadLtsaPrices,
);
router.get("/next-ltsa-code", verifyToken, getNextLtsaCode);
router.get("/check-ltsa-code", verifyToken, checkLtsaCodeExists);

module.exports = router;
