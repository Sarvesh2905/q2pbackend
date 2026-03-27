const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/authMiddleware");
const {
  getCustomers,
  getCustomerInfo,
  getBuyers,
  getEndCountries,
  getEndIndustries,
  getAppEngineers,
  getSalesContacts,
  getOpportunityTypes,
  getRFQCategories,
  getFacingFactories,
  getProducts,
  getOpportunityStages,
  getProposedDueDate,
  checkReceiptDate,
  generateQuoteNumber,
  addOpportunityType,
  addFacingFactory,
  createEnquiry,
} = require("../controllers/enquiryController");

/* ═══════════════════════════
   Section 1 — Customer
═══════════════════════════ */
router.get("/customers", verifyToken, getCustomers);
router.get("/customer-info", verifyToken, getCustomerInfo);
router.get("/buyers", verifyToken, getBuyers);
router.get("/end-countries", verifyToken, getEndCountries);
router.get("/end-industries", verifyToken, getEndIndustries);

/* ═══════════════════════════
   Section 2 — RFQ
═══════════════════════════ */
router.get("/app-engineers", verifyToken, getAppEngineers);
router.get("/sales-contacts", verifyToken, getSalesContacts);
router.get("/opportunity-types", verifyToken, getOpportunityTypes);
router.get("/rfq-categories", verifyToken, getRFQCategories);
router.get("/check-receipt-date", verifyToken, checkReceiptDate);

/* ═══════════════════════════
   Section 3 — Product
═══════════════════════════ */
router.get("/facing-factories", verifyToken, getFacingFactories);
router.get("/products", verifyToken, getProducts);
router.get("/proposed-due-date", verifyToken, getProposedDueDate);

/* ═══════════════════════════
   Section 4 — Quote
═══════════════════════════ */
router.get("/opportunity-stages", verifyToken, getOpportunityStages);
router.get("/generate-quote-no", verifyToken, generateQuoteNumber);

/* ═══════════════════════════
   Dynamic Add (Checkbox)
═══════════════════════════ */
router.post("/opportunity-types", verifyToken, addOpportunityType);
router.post("/facing-factories", verifyToken, addFacingFactory);

/* ═══════════════════════════
   Main Save
═══════════════════════════ */
router.post("/create", verifyToken, createEnquiry);

module.exports = router;
