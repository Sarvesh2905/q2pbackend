const db = require("../config/db");

/* ═══════════════════════════════════════════
   HELPER — Add working days (skip Sat & Sun)
═══════════════════════════════════════════ */
const addWorkingDays = (date, days) => {
  let result = new Date(date);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    const day = result.getDay();
    if (day !== 0 && day !== 6) added++;
  }
  return result;
};

const countWorkingDaysBetween = (from, to) => {
  let count = 0;
  let cur = new Date(from);
  cur.setDate(cur.getDate() + 1);
  while (cur <= to) {
    const d = cur.getDay();
    if (d !== 0 && d !== 6) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
};

/* ═══════════════════════
   1. GET — Customers
═══════════════════════ */
const getCustomers = async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT customer_name, Location
       FROM customer
       WHERE status = 'Active'
       ORDER BY customer_name ASC`,
    );
    return res.json({ data: rows });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/* ═══════════════════════════════════════
   2. GET — Customer Info (auto-fill)
   Returns: customer_type, customer_country, currency
═══════════════════════════════════════ */
const getCustomerInfo = async (req, res) => {
  const { customer_name } = req.query;
  try {
    const [rows] = await db.execute(
      `SELECT c.customer_type, c.customer_country,
              co.Currency
       FROM customer c
       LEFT JOIN country co
         ON LOWER(TRIM(co.Country_name)) = LOWER(TRIM(c.customer_country))
        AND co.status = 'Active'
       WHERE c.customer_name = ? AND c.status = 'Active'
       LIMIT 1`,
      [customer_name],
    );
    if (!rows.length)
      return res.status(404).json({ message: "Customer not found" });
    return res.json({ data: rows[0] });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/* ════════════════════════════════════════
   3. GET — Buyers (filtered by customer)
════════════════════════════════════════ */
const getBuyers = async (req, res) => {
  const { customer } = req.query;
  try {
    const [rows] = await db.execute(
      `SELECT Buyer_name
       FROM buyer
       WHERE Customer = ?
         AND Buyer_name IS NOT NULL
         AND status = 'Active'
       ORDER BY Buyer_name ASC`,
      [customer],
    );
    return res.json({ data: rows.map((r) => r.Buyer_name) });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/* ═════════════════════════════════════════
   4. GET — End Countries (from country master)
═════════════════════════════════════════ */
const getEndCountries = async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT Country_name
       FROM country
       WHERE status = 'Active'
       ORDER BY Country_name ASC`,
    );
    return res.json({ data: rows.map((r) => r.Country_name) });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/* ══════════════════════════════════════════════
   5. GET — End Industries
   Also returns Description for auto-fill
══════════════════════════════════════════════ */
const getEndIndustries = async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT Industry, Description
       FROM end_industry
       ORDER BY Industry ASC`,
    );
    return res.json({ data: rows });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/* ═══════════════════════════════
   6. GET — App Engineers (AE)
═══════════════════════════════ */
const getAppEngineers = async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT dept_user_id
       FROM dept_users
       WHERE status = 'Active'
       ORDER BY dept_user_id ASC`,
    );
    return res.json({ data: rows.map((r) => r.dept_user_id) });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/* ══════════════════════════════════
   7. GET — Sales Contacts
══════════════════════════════════ */
const getSalesContacts = async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT sales_contact_name
       FROM sales_contact
       WHERE status = 'Active'
       ORDER BY sales_contact_name ASC`,
    );
    return res.json({ data: rows.map((r) => r.sales_contact_name) });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/* ══════════════════════════════════════════════════
   8. GET — Opportunity Types (quote_data)
   + checkbox to add new one dynamically
══════════════════════════════════════════════════ */
const getOpportunityTypes = async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT Data FROM quote_data
       WHERE Type = 'Opportunitytype' AND Status = 'Active'
       ORDER BY Data ASC`,
    );
    return res.json({ data: rows.map((r) => r.Data) });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/* ════════════════════════════════════════════
   9. GET — RFQ Categories (quote_data)
════════════════════════════════════════════ */
const getRFQCategories = async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT Data FROM quote_data
       WHERE Type = 'Rfqcategory' AND Status = 'Active'
       ORDER BY Data ASC`,
    );
    return res.json({ data: rows.map((r) => r.Data) });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/* ════════════════════════════════════════════
   10. GET — Facing Factories (quote_data)
   + checkbox to add new one dynamically
════════════════════════════════════════════ */
const getFacingFactories = async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT Data FROM quote_data
       WHERE Type = 'Facingfactory' AND Status = 'Active'
       ORDER BY Data ASC`,
    );
    return res.json({ data: rows.map((r) => r.Data) });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/* ════════════════════════════════════════════════════════
   11. GET — Products (filtered by Facing Factory)
   Legacy = Prd_group = 'Legacy', Regular = everything else
════════════════════════════════════════════════════════ */
const getProducts = async (req, res) => {
  const { facing_factory } = req.query;
  try {
    let rows;
    if (facing_factory) {
      [rows] = await db.execute(
        `SELECT Products, Image, Prd_group
         FROM product
         WHERE status = 'Active'
           AND Facing_Factory = ?
         ORDER BY Products ASC`,
        [facing_factory],
      );
    } else {
      [rows] = await db.execute(
        `SELECT Products, Image, Prd_group
         FROM product
         WHERE status = 'Active'
         ORDER BY Products ASC`,
      );
    }
    return res.json({ data: rows });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/* ════════════════════════════════════════════
   12. GET — Opportunity Stages (quote_data)
   For Enquiry stage: Sno < 30
════════════════════════════════════════════ */
const getOpportunityStages = async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT Data FROM quote_data
       WHERE Type = 'Opportunitystage'
         AND Status = 'Active'
         AND Sno < 30
       ORDER BY Sno ASC`,
    );
    const capitalize = (s) =>
      s
        .split(" ")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(" ");
    return res.json({ data: rows.map((r) => capitalize(r.Data)) });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/* ════════════════════════════════════════════════════════
   13. GET — Proposed Due Date
   Returns today + 2 working days
════════════════════════════════════════════════════════ */
const getProposedDueDate = async (req, res) => {
  try {
    const proposed = addWorkingDays(new Date(), 2);
    return res.json({
      data: proposed.toISOString().split("T")[0], // YYYY-MM-DD
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/* ════════════════════════════════════════════════════════
   14. GET — Check if Receipt Date needs Comments
   Returns { needsComment: true } if > 4 working days past
════════════════════════════════════════════════════════ */
const checkReceiptDate = async (req, res) => {
  const { receipt_date } = req.query;
  try {
    const rfq = new Date(receipt_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    rfq.setHours(0, 0, 0, 0);
    if (rfq > today) return res.json({ needsComment: false });
    const workingDays = countWorkingDaysBetween(rfq, today);
    return res.json({ needsComment: workingDays > 4 });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/* ════════════════════════════════════════════════════════
   15. GET — Generate Quote Number Preview
   Called after AE selected + product selected (to know legacy/regular)
   Format: R/L + YYMMDD + - + NNNN + - + AE[0:2]
════════════════════════════════════════════════════════ */
const generateQuoteNumber = async (req, res) => {
  const { ae_name, is_legacy } = req.query;
  try {
    const today = new Date();
    const yy = String(today.getFullYear()).slice(2); // e.g. "26"
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    const prefix = is_legacy === "true" ? "L" : "R";
    const dateStr = `${yy}${mm}${dd}`; // e.g. "260327"
    const ae2Letters = (ae_name || "XX").slice(0, 2).toUpperCase();

    // Count existing quotes this year with same prefix
    const [rows] = await db.execute(
      `SELECT COUNT(Quote_number) AS cnt,
              ROUND(MAX(CAST(SUBSTRING(Quote_number, 9, 4) AS UNSIGNED)), 0) AS last_sno
       FROM quote_register
       WHERE SUBSTRING(RFQ_REG_Date, 1, 4) = ?
         AND SUBSTRING(Quote_number, 1, 1) = ?`,
      [String(today.getFullYear()), prefix],
    );

    const lastSno = rows[0].last_sno || 0;
    const nextSno = String(lastSno + 1).padStart(4, "0");
    const quoteNumber = `${prefix}${dateStr}-${nextSno}-${ae2Letters}`;

    return res.json({ data: quoteNumber });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/* ════════════════════════════════════════════════════════
   16. POST — Add New Opportunity Type dynamically
════════════════════════════════════════════════════════ */
const addOpportunityType = async (req, res) => {
  const { value } = req.body;
  if (!value?.trim())
    return res.status(400).json({ message: "Value is required" });
  try {
    const val = value.trim().toUpperCase();
    const [existing] = await db.execute(
      `SELECT Sno FROM quote_data WHERE Data = ? AND Type = 'Opportunitytype'`,
      [val],
    );
    if (existing.length)
      return res.status(400).json({ message: "Already exists" });
    const [maxRow] = await db.execute(`SELECT MAX(Sno) AS m FROM quote_data`);
    const nextSno = (maxRow[0].m || 0) + 1;
    await db.execute(
      `INSERT INTO quote_data (Sno, Data, Type, Status) VALUES (?, ?, 'Opportunitytype', 'Active')`,
      [nextSno, val],
    );
    return res.json({ success: true, data: val });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/* ════════════════════════════════════════════════════════
   17. POST — Add New Facing Factory dynamically
════════════════════════════════════════════════════════ */
const addFacingFactory = async (req, res) => {
  const { value } = req.body;
  if (!value?.trim())
    return res.status(400).json({ message: "Value is required" });
  try {
    const val = value.trim().toUpperCase();
    const [existing] = await db.execute(
      `SELECT Sno FROM quote_data WHERE Data = ? AND Type = 'Facingfactory'`,
      [val],
    );
    if (existing.length)
      return res.status(400).json({ message: "Already exists" });
    const [maxRow] = await db.execute(`SELECT MAX(Sno) AS m FROM quote_data`);
    const nextSno = (maxRow[0].m || 0) + 1;
    await db.execute(
      `INSERT INTO quote_data (Sno, Data, Type, Status) VALUES (?, ?, 'Facingfactory', 'Active')`,
      [nextSno, val],
    );
    return res.json({ success: true, data: val });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/* ════════════════════════════════════════════════════════
   18. POST — MAIN: Create Enquiry
   Inserts into quote_register + quote_timeline per product
════════════════════════════════════════════════════════ */
const createEnquiry = async (req, res) => {
  const {
    // Section 1 — Customer
    customer_name,
    customer_type,
    customer_country,
    buyer_name,
    group_name,
    currency,
    end_user_name,
    end_country,
    end_industry,

    // Section 2 — RFQ
    receipt_date,
    ae_name,
    sales_contact,
    opportunity_type,
    rfq_category,
    rfq_reference,
    comments,

    // Section 3 — Product
    facing_factory,
    products, // products = array
    project_name,
    customer_due_date,
    proposed_due_date,
    lines_in_rfq,
    win_probability,

    // Section 4 — Quote
    quote_number,
    opportunity_stage,
    expected_order_date,
    eff_enq_date,
    priority,
  } = req.body;

  // ── Validate required fields ──
  const missing = [];
  if (!customer_name) missing.push("Customer Name");
  if (!end_user_name) missing.push("End User Name");
  if (!receipt_date) missing.push("Receipt Date");
  if (!ae_name) missing.push("Application Engineer");
  if (!sales_contact) missing.push("Sales Contact");
  if (!opportunity_type) missing.push("Opportunity Type");
  if (!rfq_category) missing.push("RFQ Category");
  if (!facing_factory) missing.push("Facing Factory");
  if (!products?.length) missing.push("Product");
  if (!project_name) missing.push("Project Name");
  if (!customer_due_date) missing.push("Customer Due Date");
  if (!proposed_due_date) missing.push("Proposed Due Date");
  if (!lines_in_rfq) missing.push("Lines in RFQ");
  if (!win_probability) missing.push("Winning Probability");
  if (!quote_number) missing.push("Quote Number");
  if (!opportunity_stage) missing.push("Opportunity Stage");
  if (!priority) missing.push("Priority");

  if (missing.length)
    return res.status(400).json({ message: `Required: ${missing.join(", ")}` });

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // ── Sno = MAX + 1 ──
    const [[maxRow]] = await conn.execute(
      `SELECT MAX(Sno) AS m FROM quote_register`,
    );
    const nextSno = (maxRow.m || 0) + 1;

    const today = new Date().toISOString().split("T")[0]; // register date = today

    // ── Product = comma-joined string ──
    const productStr = Array.isArray(products) ? products.join(",") : products;

    // ── INSERT quote_register ──
    await conn.execute(
      `INSERT INTO quote_register
         (Sno, RFQ_REG_Date, Sales_contact, Dept_user,
          Customer_name, Customer_type, Customer_Country,
          Buyer_name, Group_name, RFQ_Type, Project_name,
          End_user_name, End_Country, End_Industry,
          RFQ_reference, RFQ_Date, RFQ_Category,
          Eff_Enq_Date, Customer_due_Date, Proposed_due_Date,
          Quote_number, Rev, Quote_stage,
          Quote_submitted_date, Facing_factory, Product,
          Total_line_items, Currency, Win_prob,
          Opportunity_stage, Comments,
          Expected_order_date, Priority)
       VALUES
         (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0,'Enquiry',
          NULL,?,?,?,?,?,?,?,?,?)`,
      [
        nextSno,
        today,
        sales_contact,
        ae_name,
        customer_name,
        customer_type || null,
        customer_country || null,
        buyer_name || null,
        group_name || null,
        opportunity_type,
        project_name,
        end_user_name,
        end_country || null,
        end_industry || null,
        rfq_reference || null,
        receipt_date,
        rfq_category,
        eff_enq_date || null,
        customer_due_date,
        proposed_due_date,
        quote_number,
        facing_factory,
        productStr,
        parseInt(lines_in_rfq),
        currency || null,
        win_probability,
        opportunity_stage,
        comments || null,
        expected_order_date || null,
        priority,
      ],
    );

    // ── INSERT quote_timeline — one row per product ──
    const productList = Array.isArray(products) ? products : [products];
    for (const product of productList) {
      const [[tMaxRow]] = await conn.execute(
        `SELECT MAX(Sno) AS m FROM quote_timeline`,
      );
      const tNextSno = (tMaxRow.m || 0) + 1;
      await conn.execute(
        `INSERT INTO quote_timeline
           (Sno, Quote_number, Dept_user, RFQ_Date, Product)
         VALUES (?, ?, ?, ?, ?)`,
        [tNextSno, quote_number, ae_name, receipt_date, product],
      );
    }

    await conn.commit();
    return res.json({
      success: true,
      message: "Enquiry created successfully!",
      quote_number,
    });
  } catch (err) {
    await conn.rollback();
    return res.status(500).json({ success: false, message: err.message });
  } finally {
    conn.release();
  }
};

module.exports = {
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
};
