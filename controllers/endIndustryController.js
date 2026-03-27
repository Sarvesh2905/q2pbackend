const db = require("../config/db");

const canModify = (role) => role === "Manager" || role === "Admin";

/* ── Check unique Industry ── */
const checkExists = async (req, res) => {
  const { Industry } = req.query;
  if (!Industry) return res.json({ exists: false });
  try {
    const [rows] = await db.execute(
      `SELECT Sno FROM end_industry
       WHERE LOWER(REPLACE(TRIM(Industry),' ','')) = LOWER(REPLACE(TRIM(?),' ',''))`,
      [Industry],
    );
    if (rows.length > 0)
      return res.json({
        exists: true,
        message: "This End Industry already exists.",
      });
    return res.json({ exists: false });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/* ── List all (A-Z) ── */
const listEndIndustries = async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT Sno, Industry, Description FROM end_industry ORDER BY Industry ASC`,
    );
    return res.json({ data: rows, total: rows.length });
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Server error", error: err.message });
  }
};

/* ── Create ── */
const createEndIndustry = async (req, res) => {
  if (!canModify(req.user?.role))
    return res.status(403).json({ message: "Not authorized" });

  let { Industry, Description } = req.body;
  if (!Industry || !Industry.trim())
    return res.status(400).json({ message: "Industry is required." });

  Industry = Industry.trim().toUpperCase();
  Description = Description?.trim() || null;

  try {
    // Unique check
    const [existing] = await db.execute(
      `SELECT Sno FROM end_industry
       WHERE LOWER(REPLACE(TRIM(Industry),' ','')) = LOWER(REPLACE(TRIM(?),' ',''))`,
      [Industry],
    );
    if (existing.length > 0)
      return res
        .status(400)
        .json({ message: "This End Industry already exists." });

    // Auto Sno
    const [maxRows] = await db.execute(
      "SELECT MAX(Sno) AS m FROM end_industry",
    );
    const nextSno = (maxRows[0].m || 0) + 1;

    await db.execute(
      `INSERT INTO end_industry (Sno, Industry, Description) VALUES (?, ?, ?)`,
      [nextSno, Industry, Description],
    );
    return res.json({
      success: true,
      message: "End Industry added successfully!",
    });
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Server error", error: err.message });
  }
};

/* ── Edit (Description only — Industry is locked) ── */
const editEndIndustry = async (req, res) => {
  if (!canModify(req.user?.role))
    return res.status(403).json({ message: "Not authorized" });

  const sno = parseInt(req.params.sno, 10);
  let { Description } = req.body;
  Description = Description?.trim() || null;

  try {
    const [rows] = await db.execute(
      "SELECT Sno FROM end_industry WHERE Sno = ?",
      [sno],
    );
    if (rows.length === 0)
      return res.status(404).json({ message: "Not found" });

    await db.execute("UPDATE end_industry SET Description = ? WHERE Sno = ?", [
      Description,
      sno,
    ]);
    return res.json({
      success: true,
      message: "End Industry updated successfully!",
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  listEndIndustries,
  createEndIndustry,
  editEndIndustry,
  checkExists,
};
