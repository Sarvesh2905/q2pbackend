const db = require("../config/db");

const canModify = (role) => role === "Manager" || role === "Admin";

/* ══════════════════════════════════════
   GET /api/customer-types
══════════════════════════════════════ */
const listCustomerTypes = async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT Sno, Data, Status
       FROM quote_data
       WHERE Type = 'Customertype'
       ORDER BY Data ASC`,
    );
    return res.json({ data: rows });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/* ══════════════════════════════════════
   GET /api/customer-types/check?value=
══════════════════════════════════════ */
const checkExists = async (req, res) => {
  const { value, sno } = req.query;
  if (!value) return res.json({ exists: false });
  try {
    const normalized = value.trim().toLowerCase().replace(/\s+/g, "");
    let q = `SELECT Sno FROM quote_data
             WHERE Type = 'Customertype'
             AND LOWER(REPLACE(TRIM(Data),' ','')) = ?`;
    const params = [normalized];
    if (sno) {
      q += " AND Sno <> ?";
      params.push(parseInt(sno));
    }
    const [rows] = await db.execute(q, params);
    if (rows.length > 0)
      return res.json({
        exists: true,
        message: "Customer type already exists.",
      });
    return res.json({ exists: false });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/* ══════════════════════════════════════
   POST /api/customer-types
══════════════════════════════════════ */
const createCustomerType = async (req, res) => {
  if (!canModify(req.user?.role))
    return res.status(403).json({ message: "Not authorized" });

  let { Data } = req.body;
  if (!Data?.trim())
    return res.status(400).json({ message: "Customer type is required." });

  Data = Data.trim().toUpperCase();

  try {
    const [existing] = await db.execute(
      `SELECT Sno FROM quote_data
       WHERE Type = 'Customertype'
       AND LOWER(REPLACE(TRIM(Data),' ','')) = LOWER(REPLACE(?,' ',''))`,
      [Data],
    );
    if (existing.length > 0)
      return res.status(400).json({ message: "Customer type already exists." });

    const [maxRow] = await db.execute(`SELECT MAX(Sno) AS m FROM quote_data`);
    const nextSno = (maxRow[0].m || 0) + 1;

    await db.execute(
      `INSERT INTO quote_data (Sno, Data, Type, Status)
       VALUES (?, ?, 'Customertype', 'Active')`,
      [nextSno, Data],
    );
    return res.json({
      success: true,
      message: "Customer type added successfully!",
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ══════════════════════════════════════
   PATCH /api/customer-types/:sno/status
══════════════════════════════════════ */
const toggleStatus = async (req, res) => {
  if (!canModify(req.user?.role))
    return res.status(403).json({ message: "Not authorized" });

  const sno = parseInt(req.params.sno, 10);
  try {
    const [rows] = await db.execute(
      `SELECT Status FROM quote_data WHERE Sno = ? AND Type = 'Customertype'`,
      [sno],
    );
    if (!rows.length) return res.status(404).json({ message: "Not found" });

    const next = rows[0].Status === "Active" ? "Inactive" : "Active";
    await db.execute(`UPDATE quote_data SET Status = ? WHERE Sno = ?`, [
      next,
      sno,
    ]);
    return res.json({ success: true, status: next });
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
