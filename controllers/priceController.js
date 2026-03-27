const db = require('../config/db');

const canModify = (role) => role === 'Manager' || role === 'Admin';

/* ── Built-in CSV utility (no external packages) ── */
const toCSV = (fields, rows) => {
  const header = fields.join(',');
  const lines  = rows.map(r =>
    fields.map(f => {
      const val = r[f] ?? '';
      return `"${String(val).replace(/"/g, '""')}"`;
    }).join(',')
  );
  return [header, ...lines].join('\n');
};

// ═══════════════════════════════════════════════════
// STANDARD PRICE  (table: price)
// ═══════════════════════════════════════════════════

const listPrices = async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT Sno, LTSA_Code, Customer_partno, Cfti_partno, Description,
             ListPrice, Start_Date, Exp_Date, Curr, Leadtime, DeliveryTerm,
             Product, Market, status
      FROM price
      ORDER BY LTSA_Code ASC
    `);
    return res.json({ data: rows, total: rows.length });
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const createPrice = async (req, res) => {
  if (!canModify(req.user?.role))
    return res.status(403).json({ message: 'Not authorized' });

  let { Customer_partno, Cfti_partno, Description, ListPrice,
        Start_Date, Exp_Date, Curr, Leadtime, DeliveryTerm, Product, Market } = req.body;

  if (!Customer_partno || !Cfti_partno || !ListPrice || !Start_Date ||
      !Exp_Date || !Curr || !Leadtime || !DeliveryTerm || !Product || !Market) {
    return res.status(400).json({
      message: 'Customer_partno, Cfti_partno, ListPrice, Start_Date, Exp_Date, Curr, Leadtime, DeliveryTerm, Product and Market are required.'
    });
  }

  try {
    Customer_partno = Customer_partno.trim().toUpperCase();
    Cfti_partno     = Cfti_partno.trim().toUpperCase();
    Description     = Description && Description.trim() ? Description.trim() : null;
    Product         = Product.trim().toUpperCase();
    Market          = Market.trim().toUpperCase();

    const [maxRows] = await db.execute('SELECT MAX(Sno) AS m FROM price');
    const nextSno   = (maxRows[0].m || 0) + 1;

    await db.execute(
      `INSERT INTO price
         (Sno, LTSA_Code, Customer_partno, Cfti_partno, Description,
          ListPrice, Start_Date, Exp_Date, Curr, Leadtime, DeliveryTerm,
          Product, Market, status)
       VALUES (?, 'DEFAULT00', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active')`,
      [nextSno, Customer_partno, Cfti_partno, Description,
       ListPrice, Start_Date, Exp_Date, Curr, Leadtime, DeliveryTerm, Product, Market]
    );

    return res.json({ success: true, message: 'Price added successfully!' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

const updatePrice = async (req, res) => {
  if (!canModify(req.user?.role))
    return res.status(403).json({ message: 'Not authorized' });

  const sno = parseInt(req.params.sno, 10);
  let { Description, Leadtime, DeliveryTerm } = req.body;

  Description  = Description  && Description.trim()  ? Description.trim()  : null;
  Leadtime     = Leadtime     && Leadtime.trim()     ? Leadtime.trim()     : null;
  DeliveryTerm = DeliveryTerm && DeliveryTerm.trim() ? DeliveryTerm.trim() : null;

  try {
    const [rows] = await db.execute('SELECT status FROM price WHERE Sno = ?', [sno]);
    if (rows.length === 0) return res.status(404).json({ message: 'Record not found' });
    if (rows[0].status !== 'Active')
      return res.status(400).json({ message: 'Inactive records cannot be edited' });

    await db.execute(
      `UPDATE price SET Description = ?, Leadtime = ?, DeliveryTerm = ? WHERE Sno = ?`,
      [Description, Leadtime, DeliveryTerm, sno]
    );

    return res.json({ success: true, message: 'Price updated successfully!' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

const togglePriceStatus = async (req, res) => {
  if (!canModify(req.user?.role))
    return res.status(403).json({ message: 'Not authorized' });

  const sno = parseInt(req.params.sno, 10);
  try {
    const [rows] = await db.execute('SELECT status FROM price WHERE Sno = ?', [sno]);
    if (rows.length === 0) return res.status(404).json({ message: 'Not found' });
    const next = rows[0].status === 'Active' ? 'Inactive' : 'Active';
    await db.execute('UPDATE price SET status = ? WHERE Sno = ?', [next, sno]);
    return res.json({ success: true, status: next });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const downloadPrices = async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT Sno, LTSA_Code, Customer_partno, Cfti_partno, Description,
             ListPrice, Start_Date, Exp_Date, Curr, Leadtime, DeliveryTerm,
             Product, Market, status
      FROM price ORDER BY LTSA_Code ASC
    `);

    const fields = ['Sno','LTSA_Code','Customer_partno','Cfti_partno','Description',
                    'ListPrice','Start_Date','Exp_Date','Curr','Leadtime','DeliveryTerm',
                    'Product','Market','status'];

    res.header('Content-Type', 'text/csv');
    res.header('Content-Disposition', 'attachment; filename="standard_price.csv"');
    return res.send(toCSV(fields, rows));
  } catch (err) {
    return res.status(500).json({ message: 'Download failed', error: err.message });
  }
};

// ═══════════════════════════════════════════════════
// LTSA PRICE  (table: ltsa_price)
// ═══════════════════════════════════════════════════

const listLtsaPrices = async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT Sno, LTSA_Code, Customer_partno, Cfti_partno, Description,
             SplPrice, Start_Date, Exp_Date, Curr, Leadtime, DeliveryTerm,
             Product, Market, status
      FROM ltsa_price
      ORDER BY LTSA_Code ASC
    `);
    return res.json({ data: rows, total: rows.length });
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const getNextLtsaCode = async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT LTSA_Code FROM ltsa_price
      WHERE LTSA_Code LIKE 'LTSA_GE_%'
      ORDER BY LTSA_Code DESC
      LIMIT 1
    `);

    let nextCode = 'LTSA_GE_00';
    if (rows.length > 0) {
      const match = rows[0].LTSA_Code.match(/LTSA_GE_(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10) + 1;
        nextCode  = `LTSA_GE_${String(num).padStart(2, '0')}`;
      }
    }

    return res.json({ nextCode });
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const checkLtsaCodeExists = async (req, res) => {
  const { ltsaCode, sno } = req.query;
  const excludeSno = sno ? parseInt(sno, 10) : null;
  try {
    let q = `SELECT Sno FROM ltsa_price WHERE LTSA_Code = ?`;
    const p = [ltsaCode];
    if (excludeSno) { q += ' AND Sno <> ?'; p.push(excludeSno); }
    const [rows] = await db.execute(q, p);
    if (rows.length > 0)
      return res.json({ exists: true, message: 'LTSA Code already exists.' });
    return res.json({ exists: false });
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const createLtsaPrice = async (req, res) => {
  if (!canModify(req.user?.role))
    return res.status(403).json({ message: 'Not authorized' });

  let { LTSA_Code, Customer_partno, Cfti_partno, Description, SplPrice,
        Start_Date, Exp_Date, Curr, Leadtime, DeliveryTerm, Product, Market } = req.body;

  if (!LTSA_Code || !Customer_partno || !Cfti_partno || !SplPrice ||
      !Start_Date || !Exp_Date || !Curr || !Leadtime || !DeliveryTerm || !Product || !Market) {
    return res.status(400).json({ message: 'All fields including LTSA_Code are required.' });
  }

  try {
    const [existing] = await db.execute(
      `SELECT Sno FROM ltsa_price WHERE LTSA_Code = ?`, [LTSA_Code]
    );
    if (existing.length > 0)
      return res.status(400).json({ message: 'LTSA Code already exists.' });

    LTSA_Code       = LTSA_Code.trim().toUpperCase();
    Customer_partno = Customer_partno.trim().toUpperCase();
    Cfti_partno     = Cfti_partno.trim().toUpperCase();
    Description     = Description && Description.trim() ? Description.trim() : null;
    Product         = Product.trim().toUpperCase();
    Market          = Market.trim().toUpperCase();

    const [maxRows] = await db.execute('SELECT MAX(Sno) AS m FROM ltsa_price');
    const nextSno   = (maxRows[0].m || 0) + 1;

    await db.execute(
      `INSERT INTO ltsa_price
         (Sno, LTSA_Code, Customer_partno, Cfti_partno, Description,
          SplPrice, Start_Date, Exp_Date, Curr, Leadtime, DeliveryTerm,
          Product, Market, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active')`,
      [nextSno, LTSA_Code, Customer_partno, Cfti_partno, Description,
       SplPrice, Start_Date, Exp_Date, Curr, Leadtime, DeliveryTerm, Product, Market]
    );

    return res.json({ success: true, message: 'LTSA Price added successfully!' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

const updateLtsaPrice = async (req, res) => {
  if (!canModify(req.user?.role))
    return res.status(403).json({ message: 'Not authorized' });

  const sno = parseInt(req.params.sno, 10);
  let { Leadtime, DeliveryTerm } = req.body;

  Leadtime     = Leadtime     && Leadtime.trim()     ? Leadtime.trim()     : null;
  DeliveryTerm = DeliveryTerm && DeliveryTerm.trim() ? DeliveryTerm.trim() : null;

  try {
    const [rows] = await db.execute('SELECT status FROM ltsa_price WHERE Sno = ?', [sno]);
    if (rows.length === 0) return res.status(404).json({ message: 'Record not found' });
    if (rows[0].status !== 'Active')
      return res.status(400).json({ message: 'Inactive records cannot be edited' });

    await db.execute(
      `UPDATE ltsa_price SET Leadtime = ?, DeliveryTerm = ? WHERE Sno = ?`,
      [Leadtime, DeliveryTerm, sno]
    );

    return res.json({ success: true, message: 'LTSA Price updated successfully!' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

const toggleLtsaPriceStatus = async (req, res) => {
  if (!canModify(req.user?.role))
    return res.status(403).json({ message: 'Not authorized' });

  const sno = parseInt(req.params.sno, 10);
  try {
    const [rows] = await db.execute('SELECT status FROM ltsa_price WHERE Sno = ?', [sno]);
    if (rows.length === 0) return res.status(404).json({ message: 'Not found' });
    const next = rows[0].status === 'Active' ? 'Inactive' : 'Active';
    await db.execute('UPDATE ltsa_price SET status = ? WHERE Sno = ?', [next, sno]);
    return res.json({ success: true, status: next });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const downloadLtsaPrices = async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT Sno, LTSA_Code, Customer_partno, Cfti_partno, Description,
             SplPrice, Start_Date, Exp_Date, Curr, Leadtime, DeliveryTerm,
             Product, Market, status
      FROM ltsa_price ORDER BY LTSA_Code ASC
    `);

    const fields = ['Sno','LTSA_Code','Customer_partno','Cfti_partno','Description',
                    'SplPrice','Start_Date','Exp_Date','Curr','Leadtime','DeliveryTerm',
                    'Product','Market','status'];

    res.header('Content-Type', 'text/csv');
    res.header('Content-Disposition', 'attachment; filename="ltsa_price.csv"');
    return res.send(toCSV(fields, rows));
  } catch (err) {
    return res.status(500).json({ message: 'Download failed', error: err.message });
  }
};

module.exports = {
  listPrices, createPrice, updatePrice, togglePriceStatus, downloadPrices,
  listLtsaPrices, createLtsaPrice, updateLtsaPrice, toggleLtsaPriceStatus,
  downloadLtsaPrices, getNextLtsaCode, checkLtsaCodeExists
};