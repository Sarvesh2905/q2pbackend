const db = require("../config/db");

const canModify = (role) => role === "Manager" || role === "Admin";

/* ── List all A-Z by Product ── */
const listTimelineTargets = async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT Sno, Product, Enquiry, Technical_offer,
              Priced_offer, Price_book_order, Regret, Cancelled
       FROM timeline_target
       ORDER BY Product ASC`,
    );
    return res.json({ data: rows, total: rows.length });
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Server error", error: err.message });
  }
};

/* ── Update single row (all numeric fields, Product locked) ── */
const updateTimelineTarget = async (req, res) => {
  if (!canModify(req.user?.role))
    return res.status(403).json({ message: "Not authorized" });

  const sno = parseInt(req.params.sno, 10);
  const {
    enquiry,
    technical_offer,
    priced_offer,
    price_book_order,
    regret,
    cancelled,
  } = req.body;

  // All fields required and must be non-negative integers
  const fields = {
    enquiry,
    technical_offer,
    priced_offer,
    price_book_order,
    regret,
    cancelled,
  };
  for (const [key, val] of Object.entries(fields)) {
    if (val === undefined || val === null || val === "")
      return res.status(400).json({ message: `${key} is required.` });
    if (isNaN(parseInt(val)) || parseInt(val) < 0)
      return res
        .status(400)
        .json({ message: `${key} must be a non-negative number.` });
  }

  try {
    const [rows] = await db.execute(
      `SELECT Sno FROM timeline_target WHERE Sno = ?`,
      [sno],
    );
    if (rows.length === 0)
      return res.status(404).json({ message: "Record not found." });

    await db.execute(
      `UPDATE timeline_target
       SET Enquiry = ?, Technical_offer = ?, Priced_offer = ?,
           Price_book_order = ?, Regret = ?, Cancelled = ?
       WHERE Sno = ?`,
      [
        parseInt(enquiry),
        parseInt(technical_offer),
        parseInt(priced_offer),
        parseInt(price_book_order),
        parseInt(regret),
        parseInt(cancelled),
        sno,
      ],
    );
    return res.json({
      success: true,
      message: "Timeline target updated successfully!",
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { listTimelineTargets, updateTimelineTarget };
