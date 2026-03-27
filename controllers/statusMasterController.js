const db = require("../config/db");

const canModify = (role) => role === "Manager" || role === "Admin";

/* ── Check unique ── */
const checkExists = async (req, res) => {
  const { stage } = req.query;
  if (!stage) return res.json({ exists: false });
  try {
    const [rows] = await db.execute(
      `SELECT Sno FROM quote_data
       WHERE Type = 'Opportunitystage'
       AND LOWER(REPLACE(TRIM(Data),' ','')) = LOWER(REPLACE(TRIM(?),' ',''))`,
      [stage],
    );
    if (rows.length > 0)
      return res.json({
        exists: true,
        message: "This Opportunity Stage already exists.",
      });
    return res.json({ exists: false });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/* ── List all A-Z ── */
const listStatuses = async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT Sno, Data AS Opportunity_Stage, Description, Status
       FROM quote_data
       WHERE Type = 'Opportunitystage'
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
const createStatus = async (req, res) => {
  if (!canModify(req.user?.role))
    return res.status(403).json({ message: "Not authorized" });

  let { stage, description } = req.body;
  if (!stage || !stage.trim())
    return res.status(400).json({ message: "Opportunity Stage is required." });

  stage = stage.trim().toUpperCase();
  description = description?.trim() || null;

  try {
    const [existing] = await db.execute(
      `SELECT Sno FROM quote_data
       WHERE Type = 'Opportunitystage'
       AND LOWER(REPLACE(TRIM(Data),' ','')) = LOWER(REPLACE(TRIM(?),' ',''))`,
      [stage],
    );
    if (existing.length > 0)
      return res
        .status(400)
        .json({ message: "This Opportunity Stage already exists." });

    // Auto Sno (no AUTO_INCREMENT)
    const [maxRows] = await db.execute("SELECT MAX(Sno) AS m FROM quote_data");
    const nextSno = (maxRows[0].m || 0) + 1;

    await db.execute(
      `INSERT INTO quote_data (Sno, Data, Type, Description, Status)
       VALUES (?, ?, 'Opportunitystage', ?, 'Active')`,
      [nextSno, stage, description],
    );
    return res.json({ success: true, message: "Status added successfully!" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ── Edit (Description only — Data locked) ── */
const editStatus = async (req, res) => {
  if (!canModify(req.user?.role))
    return res.status(403).json({ message: "Not authorized" });

  const sno = parseInt(req.params.sno, 10);
  let { description } = req.body;
  description = description?.trim() || null;

  try {
    const [rows] = await db.execute(
      `SELECT Sno FROM quote_data WHERE Sno = ? AND Type = 'Opportunitystage'`,
      [sno],
    );
    if (rows.length === 0)
      return res.status(404).json({ message: "Not found" });

    await db.execute(`UPDATE quote_data SET Description = ? WHERE Sno = ?`, [
      description,
      sno,
    ]);
    return res.json({ success: true, message: "Status updated successfully!" });
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
      `SELECT Sno FROM quote_data WHERE Sno = ? AND Type = 'Opportunitystage'`,
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
  listStatuses,
  createStatus,
  editStatus,
  toggleStatus,
  checkExists,
};
