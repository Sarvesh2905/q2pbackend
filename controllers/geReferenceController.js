const db = require('../config/db');

const canModify = (role) => role === 'Manager' || role === 'Admin';

// GET /api/ge-references
const listReferences = async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT Sno, Customer_partno, Cfti_partno, status
      FROM partno_reference
      ORDER BY Customer_partno ASC
    `);
    return res.json({ data: rows, total: rows.length });
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// GET /api/ge-references/check?Customer_partno=&Cfti_partno=
const checkExists = async (req, res) => {
  const { Customer_partno, Cfti_partno } = req.query;
  try {
    if (Customer_partno && Cfti_partno) {
      const [rows] = await db.execute(
        `SELECT Sno FROM partno_reference
         WHERE LOWER(TRIM(Customer_partno)) = LOWER(TRIM(?))
           AND LOWER(TRIM(Cfti_partno))     = LOWER(TRIM(?))`,
        [Customer_partno, Cfti_partno]
      );
      if (rows.length > 0)
        return res.json({ exists: true, message: 'This Customer PN + CFTI PN combination already exists.' });
    }
    return res.json({ exists: false });
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// POST /api/ge-references
const createReference = async (req, res) => {
  if (!canModify(req.user?.role))
    return res.status(403).json({ message: 'Not authorized' });

  let { Customer_partno, Cfti_partno } = req.body;

  if (!Customer_partno || !Cfti_partno)
    return res.status(400).json({ message: 'Customer PN and CFTI PN are both required.' });

  Customer_partno = Customer_partno.trim().toUpperCase();
  Cfti_partno     = Cfti_partno.trim().toUpperCase();

  try {
    // Unique pair check
    const [existing] = await db.execute(
      `SELECT Sno FROM partno_reference
       WHERE LOWER(TRIM(Customer_partno)) = LOWER(TRIM(?))
         AND LOWER(TRIM(Cfti_partno))     = LOWER(TRIM(?))`,
      [Customer_partno, Cfti_partno]
    );
    if (existing.length > 0)
      return res.status(400).json({ message: 'This Customer PN + CFTI PN combination already exists.' });

    // Get next Sno
    const [maxRows] = await db.execute('SELECT MAX(Sno) AS m FROM partno_reference');
    const nextSno   = (maxRows[0].m || 0) + 1;

    // Insert reference
    await db.execute(
      `INSERT INTO partno_reference (Sno, Customer_partno, Cfti_partno, status)
       VALUES (?, ?, ?, 'Active')`,
      [nextSno, Customer_partno, Cfti_partno]
    );

    // Also update price table — mark Customer_partno = 'Y' for this Cfti_partno (legacy logic)
    await db.execute(
      `UPDATE price SET Customer_partno = 'Y' WHERE Cfti_partno = ?`,
      [Cfti_partno]
    );

    return res.json({ success: true, message: 'Reference created successfully!' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

// PATCH /api/ge-references/:sno/status
const toggleStatus = async (req, res) => {
  if (!canModify(req.user?.role))
    return res.status(403).json({ message: 'Not authorized' });

  const sno = parseInt(req.params.sno, 10);
  try {
    const [rows] = await db.execute(
      'SELECT status FROM partno_reference WHERE Sno = ?', [sno]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Not found' });
    const next = rows[0].status === 'Active' ? 'Inactive' : 'Active';
    await db.execute(
      'UPDATE partno_reference SET status = ? WHERE Sno = ?', [next, sno]
    );
    return res.json({ success: true, status: next });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { listReferences, createReference, toggleStatus, checkExists };