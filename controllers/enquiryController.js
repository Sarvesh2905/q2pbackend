const db = require("../config/db");

/* ═══════════════════════════════════════════
   HELPERS
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

const toCSV = (fields, rows) => {
  const header = fields.join(",");
  const lines = rows.map((r) =>
    fields.map((f) => `"${String(r[f] ?? "").replace(/"/g, '""')}"`).join(","),
  );
  return [header, ...lines].join("\n");
};

/* ═══════════════════════
   1. GET — Customers
═══════════════════════ */
const getCustomers = async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT customer_name, Location FROM customer
       WHERE status = 'Active' ORDER BY customer_name ASC`,
    );
    return res.json({ data: rows });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/* ═══════════════════════════════════════
   2. GET — Customer Info (auto-fill)
═══════════════════════════════════════ */
const getCustomerInfo = async (req, res) => {
  const { customer_name } = req.query;
  try {
    const [rows] = await db.execute(
      `SELECT c.customer_type, c.customer_country, co.Currency
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
   3. GET — Buyers
════════════════════════════════════════ */
const getBuyers = async (req, res) => {
  const { customer } = req.query;
  try {
    const [rows] = await db.execute(
      `SELECT Buyer_name FROM buyer
       WHERE Customer = ? AND Buyer_name IS NOT NULL AND status = 'Active'
       ORDER BY Buyer_name ASC`,
      [customer],
    );
    return res.json({ data: rows.map((r) => r.Buyer_name) });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/* ═════════════════════════════════════════
   4. GET — End Countries
═════════════════════════════════════════ */
const getEndCountries = async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT Country_name FROM country WHERE status = 'Active' ORDER BY Country_name ASC`,
    );
    return res.json({ data: rows.map((r) => r.Country_name) });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/* ══════════════════════════════════════════════
   5. GET — End Industries
══════════════════════════════════════════════ */
const getEndIndustries = async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT Industry, Description FROM end_industry ORDER BY Industry ASC`,
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
      `SELECT dept_user_id FROM dept_users WHERE status = 'Active' ORDER BY dept_user_id ASC`,
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
      `SELECT sales_contact_name FROM sales_contact
       WHERE status = 'Active' ORDER BY sales_contact_name ASC`,
    );
    return res.json({ data: rows.map((r) => r.sales_contact_name) });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/* ══════════════════════════════════════════════════
   8. GET — Opportunity Types
══════════════════════════════════════════════════ */
const getOpportunityTypes = async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT Data FROM quote_data
       WHERE Type = 'Opportunitytype' AND Status = 'Active' ORDER BY Data ASC`,
    );
    return res.json({ data: rows.map((r) => r.Data) });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/* ════════════════════════════════════════════
   9. GET — RFQ Categories
════════════════════════════════════════════ */
const getRFQCategories = async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT Data FROM quote_data
       WHERE Type = 'Rfqcategory' AND Status = 'Active' ORDER BY Data ASC`,
    );
    return res.json({ data: rows.map((r) => r.Data) });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/* ════════════════════════════════════════════
   10. GET — Facing Factories
════════════════════════════════════════════ */
const getFacingFactories = async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT Data FROM quote_data
       WHERE Type = 'Facingfactory' AND Status = 'Active' ORDER BY Data ASC`,
    );
    return res.json({ data: rows.map((r) => r.Data) });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/* ════════════════════════════════════════════════════════
   11. GET — Products
════════════════════════════════════════════════════════ */
const getProducts = async (req, res) => {
  const { facing_factory } = req.query;
  try {
    let rows;
    if (facing_factory) {
      [rows] = await db.execute(
        `SELECT Products, Image, Prd_group FROM product
         WHERE status = 'Active' AND Facing_Factory = ? ORDER BY Products ASC`,
        [facing_factory],
      );
    } else {
      [rows] = await db.execute(
        `SELECT Products, Image, Prd_group FROM product
         WHERE status = 'Active' ORDER BY Products ASC`,
      );
    }
    return res.json({ data: rows });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/* ════════════════════════════════════════════
   12. GET — Opportunity Stages
════════════════════════════════════════════ */
const getOpportunityStages = async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT Data FROM quote_data
       WHERE Type = 'Opportunitystage' AND Status = 'Active' AND Sno < 30
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
   13. GET — Proposed Due Date (today + 2 working days)
════════════════════════════════════════════════════════ */
const getProposedDueDate = async (req, res) => {
  try {
    const proposed = addWorkingDays(new Date(), 2);
    return res.json({ data: proposed.toISOString().split("T")[0] });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/* ════════════════════════════════════════════════════════
   14. GET — Check Receipt Date (> 4 working days = comment required)
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
   15. GET — Generate Quote Number (PREVIEW ONLY — not for actual save)
   ⚠️  This is for the Section 4 UI preview box only.
       The actual quote number is generated atomically inside createEnquiry.
════════════════════════════════════════════════════════ */
const generateQuoteNumber = async (req, res) => {
  const { ae_name, is_legacy } = req.query;
  try {
    const now = new Date();
    const yy = String(now.getFullYear()).slice(2);
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const prefix = is_legacy === "true" ? "L" : "R";
    const dateStr = `${yy}${mm}${dd}`;
    const ae2Letters = (ae_name || "XX").slice(0, 2).toUpperCase();

    const [rows] = await db.execute(
      `SELECT ROUND(MAX(CAST(SUBSTRING(Quote_number, 9, 4) AS UNSIGNED)), 0) AS last_sno
       FROM quote_register
       WHERE SUBSTRING(RFQ_REG_Date, 1, 4) = ? AND SUBSTRING(Quote_number, 1, 1) = ?`,
      [String(now.getFullYear()), prefix],
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
   16. POST — Add New Opportunity Type
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
   17. POST — Add New Facing Factory
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
   ✅ FIX: Quote number generated ATOMICALLY inside transaction
           using SELECT FOR UPDATE — zero race condition possible
════════════════════════════════════════════════════════ */
const createEnquiry = async (req, res) => {
  const {
    customer_name,
    customer_type,
    customer_country,
    buyer_name,
    group_name,
    currency,
    end_user_name,
    end_country,
    end_industry,
    receipt_date,
    ae_name,
    sales_contact,
    opportunity_type,
    rfq_category,
    rfq_reference,
    comments,
    facing_factory,
    products,
    project_name,
    customer_due_date,
    proposed_due_date,
    lines_in_rfq,
    win_probability,
    opportunity_stage,
    expected_order_date,
    eff_enq_date,
    priority,
    is_legacy, // ✅ NEW: sent from frontend instead of pre-generated quote_number
  } = req.body;

  // ── Validation (quote_number removed — generated server-side now) ──
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
  if (!opportunity_stage) missing.push("Opportunity Stage");
  if (!priority) missing.push("Priority");

  if (missing.length)
    return res.status(400).json({ message: `Required: ${missing.join(", ")}` });

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    /* ── ✅ ATOMIC Quote Number Generation (SELECT FOR UPDATE) ──
       This locks the relevant rows in quote_register for this
       year + prefix combination. Any concurrent request that
       hits this same block will WAIT until this transaction
       commits — making it impossible to issue duplicate numbers.
    ── */
    const now = new Date();
    const yy = String(now.getFullYear()).slice(2);
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const dateStr = `${yy}${mm}${dd}`;
    const prefix = is_legacy === true || is_legacy === "true" ? "L" : "R";
    const ae2 = (ae_name || "XX").slice(0, 2).toUpperCase();
    const yearStr = String(now.getFullYear());

    // ⬇️ FOR UPDATE: second concurrent request will block here until
    //    first transaction commits and releases the lock
    const [lockRows] = await conn.execute(
      `SELECT Quote_number
       FROM quote_register
       WHERE SUBSTRING(RFQ_REG_Date, 1, 4) = ?
         AND SUBSTRING(Quote_number, 1, 1) = ?
       ORDER BY CAST(SUBSTRING(Quote_number, 9, 4) AS UNSIGNED) DESC
       LIMIT 1
       FOR UPDATE`,
      [yearStr, prefix],
    );

    let nextSeq = 1;
    if (lockRows.length > 0) {
      // Quote_number format: R260414-0023-AB
      //                      123456789012
      // Position 9 (1-based) = start of 4-digit sequence
      const lastSeq = parseInt(lockRows[0].Quote_number.substring(8, 12), 10);
      if (!isNaN(lastSeq)) nextSeq = lastSeq + 1;
    }

    const quote_number = `${prefix}${dateStr}-${String(nextSeq).padStart(4, "0")}-${ae2}`;

    /* ── Insert main enquiry row ── */
    const [[maxRow]] = await conn.execute(
      `SELECT MAX(Sno) AS m FROM quote_register`,
    );
    const nextSno = (maxRow.m || 0) + 1;
    const today = now.toISOString().split("T")[0];
    const productStr = Array.isArray(products) ? products.join(",") : products;

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
          Opportunity_stage, Comments, Expected_order_date, Priority)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0,'Enquiry',NULL,?,?,?,?,?,?,?,?,?)`,
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
        quote_number, // ✅ atomically generated above
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

    /* ── Insert quote_timeline rows (one per product) ── */
    const productList = Array.isArray(products) ? products : [products];
    for (const product of productList) {
      const [[tMaxRow]] = await conn.execute(
        `SELECT MAX(Sno) AS m FROM quote_timeline`,
      );
      const tNextSno = (tMaxRow.m || 0) + 1;
      await conn.execute(
        `INSERT INTO quote_timeline (Sno, Quote_number, Dept_user, RFQ_Date, Product)
         VALUES (?,?,?,?,?)`,
        [tNextSno, quote_number, ae_name, receipt_date, product],
      );
    }

    await conn.commit();
    return res.json({
      success: true,
      message: "Enquiry created successfully!",
      quote_number, // ✅ returned to frontend for success message
    });
  } catch (err) {
    await conn.rollback();
    // ✅ Failsafe: if UNIQUE constraint catches an ultra-rare duplicate
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        success: false,
        message: "Quote number conflict detected. Please try again.",
      });
    }
    return res.status(500).json({ success: false, message: err.message });
  } finally {
    conn.release();
  }
};

/* ════════════════════════════════════════════════════════
   19. GET — Enquiry Register (Table)
════════════════════════════════════════════════════════ */
const listEnquiries = async (req, res) => {
  try {
    const {
      ae,
      sales,
      product,
      quote_stage,
      opp_stage,
      priority,
      search,
      date_from,
      date_to,
    } = req.query;

    const where = [];
    const params = [];

    if (ae) {
      where.push("Dept_user = ?");
      params.push(ae);
    }
    if (sales) {
      where.push("Sales_contact = ?");
      params.push(sales);
    }
    if (product) {
      where.push("Product LIKE ?");
      params.push(`%${product}%`);
    }
    if (quote_stage) {
      where.push("Quote_stage = ?");
      params.push(quote_stage);
    }
    if (opp_stage) {
      where.push("Opportunity_stage = ?");
      params.push(opp_stage);
    }
    if (priority) {
      where.push("Priority = ?");
      params.push(priority);
    }
    if (date_from) {
      where.push("RFQ_REG_Date >= ?");
      params.push(date_from);
    }
    if (date_to) {
      where.push("RFQ_REG_Date <= ?");
      params.push(date_to);
    }

    if (search) {
      where.push(
        `(Quote_number LIKE ? OR Customer_name LIKE ? OR
          End_user_name LIKE ? OR Project_name LIKE ? OR RFQ_reference LIKE ?)`,
      );
      const s = `%${search}%`;
      params.push(s, s, s, s, s);
    }

    const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const [rows] = await db.execute(
      `SELECT
         Sno,
         Dept_user                                         AS ae_name,
         Sales_contact,
         Quote_number,
         DATE_FORMAT(RFQ_REG_Date,      '%d-%m-%Y')       AS quote_date,
         ROUND(COALESCE(Quote_value_USD, 0) / 1000)       AS price_k,
         Customer_name,
         End_user_name,
         Product,
         Project_name,
         DATE_FORMAT(Customer_due_Date, '%d-%m-%Y')       AS cust_due_date,
         Win_prob                                         AS probability,
         Quote_stage,
         RFQ_Category                                     AS category,
         Opportunity_stage                                AS opp_stage,
         Rev,
         Priority,
         Currency,
         Total_line_items,
         DATE_FORMAT(Proposed_due_Date, '%d-%m-%Y')       AS proposed_due_date,
         RFQ_reference,
         Facing_factory,
         End_Industry,
         Comments
       FROM quote_register
       ${whereClause}
       ORDER BY RFQ_REG_Date DESC,
                CAST(SUBSTR(Quote_number, 9, 4) AS UNSIGNED) DESC,
                Rev`,
      params,
    );

    return res.json({ data: rows, total: rows.length });
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Server error", error: err.message });
  }
};

/* ════════════════════════════════════════════════════════
   20. GET — Filter dropdown options for Enquiry Register
════════════════════════════════════════════════════════ */
const getRegisterFilterOptions = async (req, res) => {
  try {
    const [[aes], [sales], [stages], [opp], [products]] = await Promise.all([
      db.execute(
        "SELECT DISTINCT Dept_user AS val FROM quote_register WHERE Dept_user IS NOT NULL ORDER BY Dept_user",
      ),
      db.execute(
        "SELECT DISTINCT Sales_contact AS val FROM quote_register WHERE Sales_contact IS NOT NULL ORDER BY Sales_contact",
      ),
      db.execute(
        "SELECT DISTINCT Quote_stage AS val FROM quote_register WHERE Quote_stage IS NOT NULL ORDER BY Quote_stage",
      ),
      db.execute(
        "SELECT DISTINCT Opportunity_stage AS val FROM quote_register WHERE Opportunity_stage IS NOT NULL ORDER BY Opportunity_stage",
      ),
      db.execute(
        "SELECT DISTINCT Product AS val FROM quote_register WHERE Product IS NOT NULL ORDER BY Product",
      ),
    ]);
    return res.json({
      ae: aes.map((r) => r.val),
      sales: sales.map((r) => r.val),
      quote_stage: stages.map((r) => r.val),
      opp_stage: opp.map((r) => r.val),
      product: products.map((r) => r.val),
      priority: ["High", "Medium", "Low"],
    });
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Server error", error: err.message });
  }
};

/* ════════════════════════════════════════════════════════
   21. GET — Download Enquiry Register as CSV
════════════════════════════════════════════════════════ */
const downloadEnquiries = async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT
         Sno,
         Dept_user                                         AS ae_name,
         Sales_contact,
         Quote_number,
         DATE_FORMAT(RFQ_REG_Date,      '%d-%m-%Y')       AS quote_date,
         ROUND(COALESCE(Quote_value_USD, 0) / 1000)       AS price_k,
         Customer_name,
         End_user_name,
         Product,
         Project_name,
         DATE_FORMAT(Customer_due_Date, '%d-%m-%Y')       AS cust_due_date,
         Win_prob         AS probability,
         Quote_stage,
         RFQ_Category     AS category,
         Opportunity_stage AS opp_stage,
         Rev,
         Priority
       FROM quote_register
       ORDER BY RFQ_REG_Date DESC`,
    );

    const fields = [
      "Sno",
      "ae_name",
      "Sales_contact",
      "Quote_number",
      "quote_date",
      "price_k",
      "Customer_name",
      "End_user_name",
      "Product",
      "Project_name",
      "cust_due_date",
      "probability",
      "Quote_stage",
      "category",
      "opp_stage",
      "Rev",
      "Priority",
    ];

    res.header("Content-Type", "text/csv");
    res.header(
      "Content-Disposition",
      'attachment; filename="enquiry_register.csv"',
    );
    return res.send(toCSV(fields, rows));
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Download failed", error: err.message });
  }
};

/* ══════════════════════════
   EXPORTS
══════════════════════════ */
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
  listEnquiries,
  getRegisterFilterOptions,
  downloadEnquiries,
};
