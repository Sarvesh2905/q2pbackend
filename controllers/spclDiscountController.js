const db = require("../config/db");

const canModify = (role) => role === "Manager" || role === "Admin";

/* ── Customers dropdown ──
   FIX 1: corrected column names customer_name + Location
          (were Customername + Division which don't exist) */
const getCustomers = async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT customer_name, Location FROM customer
       WHERE status = 'Active'
       ORDER BY customer_name ASC`,
    );
    return res.json(
      rows.map((r) => ({
        name: r.customer_name,
        division: r.Location || "",
      })),
    );
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/* ── Check Name unique ── */
const checkExists = async (req, res) => {
  const { Name } = req.query;
  try {
    const [rows] = await db.execute(
      `SELECT Sno FROM spcl_discount
       WHERE LOWER(REPLACE(TRIM(Name),' ','')) = LOWER(REPLACE(TRIM(?),' ',''))`,
      [Name],
    );
    if (rows.length > 0)
      return res.json({
        exists: true,
        message: "This customer already exists in Special Discount.",
      });
    return res.json({ exists: false });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/* ── List all ── */
const listSpclDiscounts = async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT Sno, Name, status FROM spcl_discount ORDER BY Name ASC`,
    );
    return res.json({ data: rows, total: rows.length });
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Server error", error: err.message });
  }
};

/* ── Create ── */
const createSpclDiscount = async (req, res) => {
  if (!canModify(req.user?.role))
    return res.status(403).json({ message: "Not authorized" });

  const { Name } = req.body;
  if (!Name || !Name.trim())
    return res.status(400).json({ message: "Name is required." });

  try {
    const [existing] = await db.execute(
      `SELECT Sno FROM spcl_discount
       WHERE LOWER(REPLACE(TRIM(Name),' ','')) = LOWER(REPLACE(TRIM(?),' ',''))`,
      [Name],
    );
    if (existing.length > 0)
      return res.status(400).json({
        message: "Special discount with this name already exists.",
      });

    const [maxRows] = await db.execute(
      "SELECT MAX(Sno) AS m FROM spcl_discount",
    );
    const nextSno = (maxRows[0].m || 0) + 1;

    await db.execute(
      `INSERT INTO spcl_discount (Sno, Name, status) VALUES (?, ?, 'Active')`,
      [nextSno, Name.trim()],
    );

    return res.json({
      success: true,
      message: "Special discount added successfully!",
    });
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Server error", error: err.message });
  }
};

/* ── Toggle status (with open-quote guard) ──
   FIX 2: corrected table name quote_data (was quotedata) */
const toggleStatus = async (req, res) => {
  if (!canModify(req.user?.role))
    return res.status(403).json({ message: "Not authorized" });

  const sno = parseInt(req.params.sno, 10);
  try {
    const [rows] = await db.execute(
      "SELECT status FROM spcl_discount WHERE Sno = ?",
      [sno],
    );
    if (rows.length === 0)
      return res.status(404).json({ message: "Not found" });

    const next = rows[0].status === "Active" ? "Inactive" : "Active";

    if (next === "Inactive") {
      const [openQuotes] = await db.execute(
        `SELECT DISTINCT q.Quotenumber
         FROM quoteregister q
         WHERE q.Customername IN (
           SELECT Name FROM spcl_discount WHERE Sno = ?
         )
         AND q.Opportunitystage IN (
           SELECT Data FROM quote_data WHERE Sno IN (22,24,27,29,30)
         )`,
        [sno],
      );
      if (openQuotes.length > 0) {
        const nums = openQuotes.map((r) => r.Quotenumber).join(", ");
        return res.status(400).json({
          success: false,
          openQuote: true,
          message: `Cannot make Inactive. There are open quotes: ${nums}`,
        });
      }
    }

    await db.execute("UPDATE spcl_discount SET status = ? WHERE Sno = ?", [
      next,
      sno,
    ]);
    return res.json({ success: true, status: next });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  listSpclDiscounts,
  createSpclDiscount,
  toggleStatus,
  checkExists,
  getCustomers,
};
