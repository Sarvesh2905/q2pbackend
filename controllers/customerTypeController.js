const db = require("../config/db");

const canModify = (role) => role === "Manager" || role === "Admin";

/* ── Check unique ── */
const checkExists = async (req, res) => {
  const { custtype } = req.query;
  if (!custtype) return res.json({ exists: false });
  try {
    const [rows] = await db.execute(
      `SELECT Sno FROM quote_data
       WHERE Type = 'Customertype'
       AND LOWER(REPLACE(TRIM(Data),' ','')) = LOWER(REPLACE(TRIM(?),' ',''))`,
      [custtype],
    );
    if (rows.length > 0)
      return res.json({
        exists: true,
        message: "This Customer Type already exists.",
      });
    return res.json({ exists: false });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/* ── List all A-Z ── */
const listCustomerTypes = async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT Sno, Data AS Customer_Type, Status
       FROM quote_data
       WHERE Type = 'Customertype'
       ORDER BY Data ASC`,
    );
    return res.json({ data: rows, total: rows.length });
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Server error", error: err.message });
  }
};

/* ── Create ── */
const createCustomerType = async (req, res) => {
  if (!canModify(req.user?.role))
    return res.status(403).json({ message: "Not authorized" });

  let { custtype } = req.body;
  if (!custtype || !custtype.trim())
    return res.status(400).json({ message: "Customer Type is required." });

  custtype = custtype.trim().toUpperCase();

  try {
    // Unique check
    const [existing] = await db.execute(
      `SELECT Sno FROM quote_data
       WHERE Type = 'Customertype'
       AND LOWER(REPLACE(TRIM(Data),' ','')) = LOWER(REPLACE(TRIM(?),' ',''))`,
      [custtype],
    );
    if (existing.length > 0)
      return res
        .status(400)
        .json({ message: "This Customer Type already exists." });

    // Auto Sno (no AUTO_INCREMENT on this table)
    const [maxRows] = await db.execute("SELECT MAX(Sno) AS m FROM quote_data");
    const nextSno = (maxRows[0].m || 0) + 1;

    await db.execute(
      `INSERT INTO quote_data (Sno, Data, Type, Status) VALUES (?, ?, 'Customertype', 'Active')`,
      [nextSno, custtype],
    );
    return res.json({
      success: true,
      message: "Customer type added successfully!",
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
      `SELECT Sno FROM quote_data WHERE Sno = ? AND Type = 'Customertype'`,
      [sno],
    );
    if (rows.length === 0)
      return res.status(404).json({ message: "Not found" });

    await db.execute(`UPDATE quote_data SET Status = ? WHERE Sno = ?`, [
      status,
      sno,
    ]);
    return res.json({ success: true, status });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  listCustomerTypes,
  createCustomerType,
  toggleStatus,
  checkExists,
};
