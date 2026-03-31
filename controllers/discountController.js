const db = require("../config/db");

const canModify = (role) => role === "Manager" || role === "Admin";

// GET /api/discounts/categories — pulls distinct Prd_group from product
const getCategories = async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT DISTINCT Prd_group FROM product
       WHERE status = 'Active'
         AND Prd_group IS NOT NULL AND Prd_group <> ''
       ORDER BY Prd_group ASC`,
    );
    return res.json(rows.map((r) => r.Prd_group));
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// GET /api/discounts/products — all active products (fallback)
const getProducts = async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT Products FROM product
       WHERE status = 'Active'
       ORDER BY Products ASC`,
    );
    return res.json(rows.map((r) => r.Products));
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// GET /api/discounts/products-by-category?category=REGULAR
// Returns only products belonging to the selected Prd_group
const getProductsByCategory = async (req, res) => {
  const { category } = req.query;
  try {
    let rows;
    if (category && category.trim() !== "") {
      [rows] = await db.execute(
        `SELECT Products FROM product
         WHERE status = 'Active'
           AND LOWER(TRIM(Prd_group)) = LOWER(TRIM(?))
         ORDER BY Products ASC`,
        [category],
      );
    } else {
      [rows] = await db.execute(
        `SELECT Products FROM product
         WHERE status = 'Active'
         ORDER BY Products ASC`,
      );
    }
    return res.json(rows.map((r) => r.Products));
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// GET /api/discounts/check
const checkExists = async (req, res) => {
  const { Type, Category, Market, Product, sno } = req.query;
  const excludeSno = sno ? parseInt(sno, 10) : null;
  try {
    let q = `SELECT Sno FROM discount
             WHERE LOWER(TRIM(Type))     = LOWER(TRIM(?))
               AND LOWER(TRIM(Category)) = LOWER(TRIM(?))
               AND LOWER(TRIM(Market))   = LOWER(TRIM(?))
               AND LOWER(TRIM(Product))  = LOWER(TRIM(?))`;
    const p = [Type, Category, Market, Product];
    if (excludeSno) {
      q += " AND Sno <> ?";
      p.push(excludeSno);
    }
    const [rows] = await db.execute(q, p);
    if (rows.length > 0)
      return res.json({
        exists: true,
        message:
          "This Type + Category + Market + Product combination already exists.",
      });
    return res.json({ exists: false });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// GET /api/discounts
const listDiscounts = async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT Sno, Type, Category, Product, Market, Discount
      FROM discount
      ORDER BY Type ASC, Category ASC, Product ASC
    `);
    return res.json({ data: rows, total: rows.length });
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Server error", error: err.message });
  }
};

// POST /api/discounts
const createDiscount = async (req, res) => {
  if (!canModify(req.user?.role))
    return res.status(403).json({ message: "Not authorized" });

  const { Type, Category, Market, Product, Discount } = req.body;

  if (
    !Type ||
    !Category ||
    !Market ||
    !Product ||
    Discount === undefined ||
    Discount === ""
  )
    return res.status(400).json({ message: "All fields are required." });

  const discVal = parseFloat(Discount);
  if (isNaN(discVal) || discVal < 0 || discVal > 100)
    return res
      .status(400)
      .json({ message: "Discount must be between 0 and 100." });

  try {
    const [existing] = await db.execute(
      `SELECT Sno FROM discount
       WHERE LOWER(TRIM(Type))     = LOWER(TRIM(?))
         AND LOWER(TRIM(Category)) = LOWER(TRIM(?))
         AND LOWER(TRIM(Market))   = LOWER(TRIM(?))
         AND LOWER(TRIM(Product))  = LOWER(TRIM(?))`,
      [Type, Category, Market, Product],
    );
    if (existing.length > 0)
      return res.status(400).json({
        message:
          "This Type + Category + Market + Product combination already exists.",
      });

    const [maxRows] = await db.execute("SELECT MAX(Sno) AS m FROM discount");
    const nextSno = (maxRows[0].m || 0) + 1;

    await db.execute(
      `INSERT INTO discount (Sno, Type, Category, Market, Product, Discount)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [nextSno, Type, Category, Market, Product, discVal],
    );

    return res.json({ success: true, message: "Discount added successfully!" });
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Server error", error: err.message });
  }
};

// PUT /api/discounts/:sno
const updateDiscount = async (req, res) => {
  if (!canModify(req.user?.role))
    return res.status(403).json({ message: "Not authorized" });

  const sno = parseInt(req.params.sno, 10);
  const discVal = parseFloat(req.body.Discount);

  if (
    req.body.Discount === undefined ||
    req.body.Discount === "" ||
    isNaN(discVal) ||
    discVal < 0 ||
    discVal > 100
  )
    return res
      .status(400)
      .json({ message: "Discount must be between 0 and 100." });

  try {
    const [rows] = await db.execute("SELECT Sno FROM discount WHERE Sno = ?", [
      sno,
    ]);
    if (rows.length === 0)
      return res.status(404).json({ message: "Record not found" });

    await db.execute("UPDATE discount SET Discount = ? WHERE Sno = ?", [
      discVal,
      sno,
    ]);
    return res.json({
      success: true,
      message: "Discount updated successfully!",
    });
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Server error", error: err.message });
  }
};

module.exports = {
  listDiscounts,
  createDiscount,
  updateDiscount,
  checkExists,
  getCategories,
  getProducts,
  getProductsByCategory,
};
