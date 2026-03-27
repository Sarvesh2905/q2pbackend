const db = require("../config/db");

const canModify = (role) => role === "Manager" || role === "Admin";

/* ── Check unique ── */
const checkExists = async (req, res) => {
  const { reason } = req.query;
  if (!reason) return res.json({ exists: false });
  try {
    const [rows] = await db.execute(
      `SELECT Sno FROM reason
       WHERE LOWER(REPLACE(TRIM(Reason_Code),' ','')) = LOWER(REPLACE(TRIM(?),' ',''))`,
      [reason],
    );
    if (rows.length > 0)
      return res.json({ exists: true, message: "This Reason already exists." });
    return res.json({ exists: false });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/* ── List all A-Z ── */
const listReasons = async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT Sno, Reason_Code, Description
       FROM reason
       ORDER BY Reason_Code ASC`,
    );
    return res.json({ data: rows, total: rows.length });
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Server error", error: err.message });
  }
};

/* ── Create ── */
const createReason = async (req, res) => {
  if (!canModify(req.user?.role))
    return res.status(403).json({ message: "Not authorized" });

  let { reason_code, description } = req.body;

  if (!reason_code || !reason_code.trim())
    return res.status(400).json({ message: "Reason Code is required." });
  if (!description || !description.trim())
    return res.status(400).json({ message: "Description is required." });

  reason_code = reason_code.trim().toUpperCase();
  description = description.trim();

  try {
    const [existing] = await db.execute(
      `SELECT Sno FROM reason
       WHERE LOWER(REPLACE(TRIM(Reason_Code),' ','')) = LOWER(REPLACE(TRIM(?),' ',''))`,
      [reason_code],
    );
    if (existing.length > 0)
      return res.status(400).json({ message: "This Reason already exists." });

    // Auto Sno (no AUTO_INCREMENT)
    const [maxRows] = await db.execute("SELECT MAX(Sno) AS m FROM reason");
    const nextSno = (maxRows[0].m || 0) + 1;

    await db.execute(
      `INSERT INTO reason (Sno, Reason_Code, Description) VALUES (?, ?, ?)`,
      [nextSno, reason_code, description],
    );
    return res.json({ success: true, message: "Reason added successfully!" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ── Edit (Description only — Reason_Code locked) ── */
const editReason = async (req, res) => {
  if (!canModify(req.user?.role))
    return res.status(403).json({ message: "Not authorized" });

  const sno = parseInt(req.params.sno, 10);
  let { description } = req.body;

  if (!description || !description.trim())
    return res.status(400).json({ message: "Description is required." });

  description = description.trim();

  try {
    const [rows] = await db.execute(`SELECT Sno FROM reason WHERE Sno = ?`, [
      sno,
    ]);
    if (rows.length === 0)
      return res.status(404).json({ message: "Reason not found." });

    await db.execute(`UPDATE reason SET Description = ? WHERE Sno = ?`, [
      description,
      sno,
    ]);
    return res.json({ success: true, message: "Reason updated successfully!" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { listReasons, createReason, editReason, checkExists };
