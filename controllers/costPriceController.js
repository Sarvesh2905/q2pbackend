const db = require("../config/db");

const canModify = (role) => role === "Manager" || role === "Admin";

/* ── Products dropdown ── */
const getProducts = async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT Products FROM product WHERE status = 'Active' ORDER BY Products ASC`,
    );
    return res.json({ data: rows.map((r) => r.Products) });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/* ── Currencies from country table ── */
/* ── Currencies from country table ── */
const getCurrencies = async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT DISTINCT Currency
       FROM country
       WHERE Currency IS NOT NULL
         AND Currency != ''
         AND status = 'Active'
       ORDER BY Currency ASC`
    );
    return res.json({ data: rows.map(r => r.Currency) });  // ← r.Currency not r.Currency_Code
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/* ── Check unique Cfti_partno ── */
const checkExists = async (req, res) => {
  const { cftipartno } = req.query;
  if (!cftipartno) return res.json({ exists: false });
  try {
    const [rows] = await db.execute(
      `SELECT Sno FROM cost_price
       WHERE LOWER(TRIM(Cfti_partno)) = LOWER(TRIM(?))`,
      [cftipartno],
    );
    if (rows.length > 0)
      return res.json({
        exists: true,
        message: "This CFTI Part No already exists in Cost Price.",
      });
    return res.json({ exists: false });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/* ── List all A-Z ── */
const listCostPrices = async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT Sno, Cfti_partno, Description, Cost_Price,
              Currency, Product, Market, status
       FROM cost_price
       ORDER BY Cfti_partno ASC`,
    );
    return res.json({ data: rows, total: rows.length });
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Server error", error: err.message });
  }
};

/* ── Create ── */
const createCostPrice = async (req, res) => {
  if (!canModify(req.user?.role))
    return res.status(403).json({ message: "Not authorized" });

  let { cfti_partno, description, cost_price, currency, product, market } =
    req.body;

  if (!cfti_partno?.trim())
    return res.status(400).json({ message: "CFTI Part No is required." });
  if (cost_price === undefined || cost_price === null || cost_price === "")
    return res.status(400).json({ message: "Cost Price is required." });
  if (!currency?.trim())
    return res.status(400).json({ message: "Currency is required." });
  if (!product?.trim())
    return res.status(400).json({ message: "Product is required." });
  if (!market?.trim())
    return res.status(400).json({ message: "Market is required." });

  const cpVal = parseFloat(cost_price);
  if (isNaN(cpVal) || cpVal < 0)
    return res
      .status(400)
      .json({ message: "Cost Price must be a valid non-negative number." });

  cfti_partno = cfti_partno.trim().toUpperCase();
  currency = currency.trim().toUpperCase();
  product = product.trim().toUpperCase();
  market = market.trim().toUpperCase();
  description = description?.trim() || null;

  try {
    const [existing] = await db.execute(
      `SELECT Sno FROM cost_price
       WHERE LOWER(TRIM(Cfti_partno)) = LOWER(TRIM(?))`,
      [cfti_partno],
    );
    if (existing.length > 0)
      return res
        .status(400)
        .json({ message: "This CFTI Part No already exists in Cost Price." });

    const [maxRows] = await db.execute("SELECT MAX(Sno) AS m FROM cost_price");
    const nextSno = (maxRows[0].m || 0) + 1;

    await db.execute(
      `INSERT INTO cost_price
         (Sno, Cfti_partno, Description, Cost_Price, Currency, Product, Market, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'Active')`,
      [nextSno, cfti_partno, description, cpVal, currency, product, market],
    );
    return res.json({
      success: true,
      message: "Cost price added successfully!",
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ── Edit (Cfti_partno locked) ── */
const editCostPrice = async (req, res) => {
  if (!canModify(req.user?.role))
    return res.status(403).json({ message: "Not authorized" });

  const sno = parseInt(req.params.sno, 10);
  let { description, cost_price, currency, product, market } = req.body;

  if (cost_price === undefined || cost_price === null || cost_price === "")
    return res.status(400).json({ message: "Cost Price is required." });
  if (!currency?.trim())
    return res.status(400).json({ message: "Currency is required." });
  if (!product?.trim())
    return res.status(400).json({ message: "Product is required." });
  if (!market?.trim())
    return res.status(400).json({ message: "Market is required." });

  const cpVal = parseFloat(cost_price);
  if (isNaN(cpVal) || cpVal < 0)
    return res
      .status(400)
      .json({ message: "Cost Price must be a valid non-negative number." });

  currency = currency.trim().toUpperCase();
  product = product.trim().toUpperCase();
  market = market.trim().toUpperCase();
  description = description?.trim() || null;

  try {
    const [rows] = await db.execute(
      `SELECT Sno, status FROM cost_price WHERE Sno = ?`,
      [sno],
    );
    if (rows.length === 0)
      return res.status(404).json({ message: "Record not found." });
    if (rows[0].status === "Inactive")
      return res
        .status(400)
        .json({ message: "Cannot edit an Inactive record." });

    await db.execute(
      `UPDATE cost_price
       SET Description = ?, Cost_Price = ?, Currency = ?, Product = ?, Market = ?
       WHERE Sno = ?`,
      [description, cpVal, currency, product, market, sno],
    );
    return res.json({
      success: true,
      message: "Cost price updated successfully!",
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ── Toggle Status ── */
const toggleStatus = async (req, res) => {
  if (!canModify(req.user?.role))
    return res.status(403).json({ message: "Not authorized" });

  const sno = parseInt(req.params.sno, 10);
  const { status } = req.body;

  if (!["Active", "Inactive"].includes(status))
    return res.status(400).json({ message: "Invalid status value." });

  try {
    const [rows] = await db.execute(
      `SELECT Sno FROM cost_price WHERE Sno = ?`,
      [sno],
    );
    if (rows.length === 0)
      return res.status(404).json({ message: "Record not found." });

    await db.execute(`UPDATE cost_price SET status = ? WHERE Sno = ?`, [
      status,
      sno,
    ]);
    return res.json({ success: true, status });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  listCostPrices,
  createCostPrice,
  editCostPrice,
  toggleStatus,
  checkExists,
  getProducts,
  getCurrencies,
};
