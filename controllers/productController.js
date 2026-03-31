const db = require("../config/db");

const canModify = (role) => role === "Manager" || role === "Admin";

// GET /api/products
const listProducts = async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT Sno, Products, Description, Facing_Factory,
             Prd_group, Image, status
      FROM product
      ORDER BY Products ASC
    `);
    return res.json({ data: rows, total: rows.length });
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Server error", error: err.message });
  }
};

// GET /api/products/check?Products=xxx
const checkProductExists = async (req, res) => {
  const { Products } = req.query;
  if (!Products) return res.json({ exists: false });

  try {
    const [rows] = await db.execute(
      `SELECT Sno FROM product
       WHERE LOWER(TRIM(Products)) = LOWER(TRIM(?))`,
      [Products],
    );
    if (rows.length > 0)
      return res.json({
        exists: true,
        message: "Product already exists.",
      });
    return res.json({ exists: false });
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Server error", error: err.message });
  }
};

// GET /api/products/dropdown/factories
const getDropdownFactories = async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT Data FROM quote_data
       WHERE LOWER(Type) = 'facingfactory'
         AND Status = 'Active'
       ORDER BY Data ASC`,
    );
    return res.json(rows.map((r) => r.Data).filter(Boolean));
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Error fetching factories", error: err.message });
  }
};

// GET /api/products/dropdown/groups
const getDropdownGroups = async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT DISTINCT Prd_group FROM product
       WHERE Prd_group IS NOT NULL AND Prd_group <> ''
       ORDER BY Prd_group ASC`,
    );
    return res.json(rows.map((r) => r.Prd_group).filter(Boolean));
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Error fetching groups", error: err.message });
  }
};

// POST /api/products
const createProduct = async (req, res) => {
  if (!canModify(req.user?.role))
    return res.status(403).json({ message: "Not authorized" });

  let { Products, Description, Facing_Factory, Prd_group } = req.body;

  if (!Products || !Facing_Factory || !Prd_group)
    return res
      .status(400)
      .json({ message: "Product, Facing Factory and Group are required." });

  Products = Products.trim();
  Facing_Factory = Facing_Factory.trim();
  Prd_group = Prd_group.trim();
  Description =
    Description && Description.trim() !== "" ? Description.trim() : null;

  try {
    // Duplicate check
    const [existing] = await db.execute(
      `SELECT Sno FROM product
       WHERE LOWER(TRIM(Products)) = LOWER(TRIM(?))`,
      [Products],
    );
    if (existing.length > 0)
      return res.status(400).json({ message: "Product already exists." });

    // Next Sno for product
    const [maxPrd] = await db.execute("SELECT MAX(Sno) AS m FROM product");
    const nextPrdSno = (maxPrd[0].m || 0) + 1;

    // Insert into product
    await db.execute(
      `INSERT INTO product
         (Sno, Products, Description, Facing_Factory, status, Image, Prd_group)
       VALUES (?, ?, ?, ?, 'Active', 'placeholder.png', ?)`,
      [nextPrdSno, Products, Description, Facing_Factory, Prd_group],
    );

    // ✅ Auto-insert into timeline_target with zero targets
    const [maxTt] = await db.execute(
      "SELECT MAX(Sno) AS m FROM timeline_target",
    );
    const nextTtSno = (maxTt[0].m || 0) + 1;

    await db.execute(
      `INSERT INTO timeline_target
         (Sno, Product, Enquiry, Technical_offer, Priced_offer, Price_book_order, Regret, Cancelled)
       VALUES (?, ?, 0, 0, 0, 0, 0, 0)`,
      [nextTtSno, Products],
    );

    return res.json({ success: true, message: "Product added successfully!" });
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Server error", error: err.message });
  }
};

// PUT /api/products/:sno
const updateProduct = async (req, res) => {
  if (!canModify(req.user?.role))
    return res.status(403).json({ message: "Not authorized" });

  const sno = parseInt(req.params.sno, 10);
  let { Description, Facing_Factory } = req.body;

  if (!Facing_Factory || Facing_Factory.trim() === "")
    return res.status(400).json({ message: "Facing Factory is required." });

  Description =
    Description && Description.trim() !== "" ? Description.trim() : null;
  Facing_Factory = Facing_Factory.trim();

  try {
    const [rows] = await db.execute("SELECT * FROM product WHERE Sno = ?", [
      sno,
    ]);
    if (rows.length === 0)
      return res.status(404).json({ message: "Record not found" });
    if (rows[0].status !== "Active")
      return res
        .status(400)
        .json({ message: "Inactive records cannot be edited" });

    await db.execute(
      `UPDATE product
          SET Description = ?, Facing_Factory = ?
        WHERE Sno = ?`,
      [Description, Facing_Factory, sno],
    );
    return res.json({
      success: true,
      message: "Product updated successfully!",
    });
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Server error", error: err.message });
  }
};

// PATCH /api/products/:sno/status
const toggleProductStatus = async (req, res) => {
  if (!canModify(req.user?.role))
    return res.status(403).json({ message: "Not authorized" });

  const sno = parseInt(req.params.sno, 10);
  try {
    const [rows] = await db.execute(
      "SELECT status FROM product WHERE Sno = ?",
      [sno],
    );
    if (rows.length === 0)
      return res.status(404).json({ message: "Not found" });

    const next = rows[0].status === "Active" ? "Inactive" : "Active";
    await db.execute("UPDATE product SET status = ? WHERE Sno = ?", [
      next,
      sno,
    ]);
    return res.json({ success: true, status: next });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  listProducts,
  checkProductExists,
  createProduct,
  updateProduct,
  toggleProductStatus,
  getDropdownFactories,
  getDropdownGroups,
};
