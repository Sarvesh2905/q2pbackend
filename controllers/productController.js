const db = require("../config/db");

const canModify = (role) => role === "Manager" || role === "Admin";

/* ══════════════════════════════════════
   GET /api/products
══════════════════════════════════════ */
const listProducts = async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT Sno, Products, Description, Facing_Factory, Prd_group, status
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

/* ══════════════════════════════════════
   GET /api/products/check?Products=&sno=
══════════════════════════════════════ */
const checkProductExists = async (req, res) => {
  const { Products, sno } = req.query;
  const excludeSno = sno ? parseInt(sno, 10) : null;
  try {
    if (Products) {
      let q = `SELECT Sno FROM product
               WHERE LOWER(TRIM(REPLACE(Products,' ',''))) = LOWER(TRIM(REPLACE(?,' ','')))`;
      const p = [Products];
      if (excludeSno) {
        q += " AND Sno <> ?";
        p.push(excludeSno);
      }
      const [rows] = await db.execute(q, p);
      if (rows.length > 0)
        return res.json({
          exists: true,
          field: "Products",
          message: "Product already exists.",
        });
    }
    return res.json({ exists: false });
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Server error", error: err.message });
  }
};

/* ══════════════════════════════════════
   POST /api/products
══════════════════════════════════════ */
const createProduct = async (req, res) => {
  if (!canModify(req.user?.role))
    return res.status(403).json({ message: "Not authorized" });

  let { Products, Description, Facing_Factory, Prd_group } = req.body;

  if (!Products || !Facing_Factory || !Prd_group)
    return res
      .status(400)
      .json({ message: "Product, Facing Factory and Group are required." });

  Products = Products.trim().toUpperCase();
  Description =
    Description && Description.trim() !== "" ? Description.trim() : null;
  Facing_Factory = Facing_Factory.trim().toUpperCase();
  Prd_group = Prd_group.trim().toUpperCase();

  try {
    const [existing] = await db.execute(
      `SELECT Sno FROM product
       WHERE LOWER(TRIM(REPLACE(Products,' ',''))) = LOWER(TRIM(REPLACE(?,' ','')))`,
      [Products],
    );
    if (existing.length > 0)
      return res.status(400).json({ message: "Product already exists." });

    const [maxRows] = await db.execute("SELECT MAX(Sno) AS m FROM product");
    const nextSno = (maxRows[0].m || 0) + 1;

    await db.execute(
      `INSERT INTO product (Sno, Products, Description, Facing_Factory, Prd_group, status, Image)
       VALUES (?, ?, ?, ?, ?, 'Active', 'placeholder.png')`,
      [nextSno, Products, Description, Facing_Factory, Prd_group],
    );
    return res.json({ success: true, message: "Product added successfully!" });
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Server error", error: err.message });
  }
};

/* ══════════════════════════════════════
   PUT /api/products/:sno
   Locked: Products, Prd_group
   Editable: Description, Facing_Factory
══════════════════════════════════════ */
const updateProduct = async (req, res) => {
  if (!canModify(req.user?.role))
    return res.status(403).json({ message: "Not authorized" });

  const sno = parseInt(req.params.sno, 10);
  let { Description, Facing_Factory } = req.body;

  Description =
    Description && Description.trim() !== "" ? Description.trim() : null;
  Facing_Factory =
    Facing_Factory && Facing_Factory.trim() !== ""
      ? Facing_Factory.trim().toUpperCase()
      : null;

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
      "UPDATE product SET Description = ?, Facing_Factory = ? WHERE Sno = ?",
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

/* ══════════════════════════════════════
   PATCH /api/products/:sno/status
══════════════════════════════════════ */
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
  createProduct,
  updateProduct,
  toggleProductStatus,
  checkProductExists,
};
