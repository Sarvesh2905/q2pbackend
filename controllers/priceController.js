const db = require('../config/db');

const canModify = (role) => role === 'Manager' || role === 'Admin';

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
             SPL_Cond, Remarks, Product, Market, status
      FROM price
      ORDER BY Sno ASC
    `);
    return res.json({ data: rows, total: rows.length });
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const createPrice = async (req, res) => {
  if (!canModify(req.user?.role))
    return res.status(403).json({ message: 'Not authorized' });

  console.log('📦 createPrice body:', JSON.stringify(req.body, null, 2));

  let {
    Customer_partno, Cfti_partno, Description, ListPrice,
    Start_Date, Exp_Date, Curr, Leadtime, DeliveryTerm,
    Product, Market, SPL_Cond, Remarks
  } = req.body;

  // ✅ Validate required fields
  const missing = [];
  if (!Customer_partno) missing.push('Customer_partno');
  if (!Cfti_partno)     missing.push('Cfti_partno');
  if (!ListPrice)       missing.push('ListPrice');
  if (!Curr)            missing.push('Curr');
  if (!Leadtime)        missing.push('Leadtime');
  if (!DeliveryTerm)    missing.push('DeliveryTerm');
  if (!Product)         missing.push('Product');
  if (!Market)          missing.push('Market');

  if (missing.length > 0) {
    console.log('❌ Missing:', missing);
    return res.status(400).json({ message: `Missing required fields: ${missing.join(', ')}` });
  }

  try {
    // ✅ Trim and uppercase strings
    Customer_partno = String(Customer_partno).trim().toUpperCase().substring(0, 10); // enforce varchar(10)
    Cfti_partno     = String(Cfti_partno).trim().toUpperCase().substring(0, 20);
    Description     = Description?.trim() ? Description.trim().substring(0, 52) : null;
    Product         = String(Product).trim().toUpperCase().substring(0, 15);
    Market          = String(Market).trim().toUpperCase().substring(0, 2);
    Curr            = String(Curr).trim().toUpperCase().substring(0, 3);
    Leadtime        = String(Leadtime).trim().substring(0, 8);
    DeliveryTerm    = String(DeliveryTerm).trim().substring(0, 17);

    // ✅ Convert empty string → null for DATE columns (critical fix)
    Start_Date = (Start_Date && String(Start_Date).trim() !== '') ? String(Start_Date).trim() : null;
    Exp_Date   = (Exp_Date   && String(Exp_Date).trim()   !== '') ? String(Exp_Date).trim()   : null;

    // ✅ Optional fields
    SPL_Cond = SPL_Cond?.trim() ? SPL_Cond.trim().substring(0, 10) : null;
    Remarks  = Remarks?.trim()  ? Remarks.trim().substring(0, 10)  : null;

    // ✅ Convert ListPrice to float
    const price = parseFloat(ListPrice);
    if (isNaN(price)) {
      return res.status(400).json({ message: 'ListPrice must be a valid number' });
    }

    const [maxRows] = await db.execute('SELECT MAX(Sno) AS m FROM price');
    const nextSno   = (maxRows[0].m || 0) + 1;

    console.log('📝 Inserting row:', {
      nextSno, Customer_partno, Cfti_partno, Description,
      price, Start_Date, Exp_Date, Curr, Leadtime,
      DeliveryTerm, SPL_Cond, Remarks, Product, Market
    });

    // ✅ All 16 columns matched with 15 values + 'DEFAULT00' + 'Active'
    await db.execute(
      `INSERT INTO price
         (Sno, LTSA_Code, Customer_partno, Cfti_partno, Description,
          ListPrice, Start_Date, Exp_Date, Curr, Leadtime, DeliveryTerm,
          SPL_Cond, Remarks, Product, Market, status)
       VALUES (?, 'DEFAULT00', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active')`,
      [
        nextSno,
        Customer_partno,
        Cfti_partno,
        Description,
        price,
        Start_Date,
        Exp_Date,
        Curr,
        Leadtime,
        DeliveryTerm,
        SPL_Cond,
        Remarks,
        Product,
        Market
      ]
    );

    console.log('✅ Inserted successfully, Sno:', nextSno);
    return res.json({ success: true, message: 'Price added successfully!' });

  } catch (err) {
    console.error('❌ DB Insert Error:', err.message);
    return res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

const updatePrice = async (req, res) => {
  if (!canModify(req.user?.role))
    return res.status(403).json({ message: 'Not authorized' });

  const sno = parseInt(req.params.sno, 10);
  let { Description, Leadtime, DeliveryTerm, SPL_Cond, Remarks } = req.body;

  Description  = Description?.trim()  ? Description.trim().substring(0, 52)  : null;
  Leadtime     = Leadtime?.trim()     ? Leadtime.trim().substring(0, 8)      : null;
  DeliveryTerm = DeliveryTerm?.trim() ? DeliveryTerm.trim().substring(0, 17) : null;
  SPL_Cond     = SPL_Cond?.trim()     ? SPL_Cond.trim().substring(0, 10)     : null;
  Remarks      = Remarks?.trim()      ? Remarks.trim().substring(0, 10)      : null;

  try {
    const [rows] = await db.execute('SELECT status FROM price WHERE Sno = ?', [sno]);
    if (rows.length === 0) return res.status(404).json({ message: 'Record not found' });
    if (rows[0].status !== 'Active')
      return res.status(400).json({ message: 'Inactive records cannot be edited' });

    await db.execute(
      `UPDATE price SET Description = ?, Leadtime = ?, DeliveryTerm = ?, SPL_Cond = ?, Remarks = ? WHERE Sno = ?`,
      [Description, Leadtime, DeliveryTerm, SPL_Cond, Remarks, sno]
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
             SPL_Cond, Remarks, Product, Market, status
      FROM price ORDER BY Sno ASC
    `);

    const fields = ['Sno','LTSA_Code','Customer_partno','Cfti_partno','Description',
                    'ListPrice','Start_Date','Exp_Date','Curr','Leadtime','DeliveryTerm',
                    'SPL_Cond','Remarks','Product','Market','status'];

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

  console.log('📦 createLtsaPrice body:', JSON.stringify(req.body, null, 2));

  let {
    LTSA_Code, Customer_partno, Cfti_partno, Description, SplPrice,
    Start_Date, Exp_Date, Curr, Leadtime, DeliveryTerm, Product, Market
  } = req.body;

  const missing = [];
  if (!LTSA_Code)       missing.push('LTSA_Code');
  if (!Customer_partno) missing.push('Customer_partno');
  if (!Cfti_partno)     missing.push('Cfti_partno');
  if (!SplPrice)        missing.push('SplPrice');
  if (!Curr)            missing.push('Curr');
  if (!Leadtime)        missing.push('Leadtime');
  if (!DeliveryTerm)    missing.push('DeliveryTerm');
  if (!Product)         missing.push('Product');
  if (!Market)          missing.push('Market');

  if (missing.length > 0) {
    return res.status(400).json({ message: `Missing required fields: ${missing.join(', ')}` });
  }

  try {
    const [existing] = await db.execute(
      `SELECT Sno FROM ltsa_price WHERE LTSA_Code = ?`, [LTSA_Code]
    );
    if (existing.length > 0)
      return res.status(400).json({ message: 'LTSA Code already exists.' });

    LTSA_Code       = String(LTSA_Code).trim().toUpperCase();
    Customer_partno = String(Customer_partno).trim().toUpperCase().substring(0, 10);
    Cfti_partno     = String(Cfti_partno).trim().toUpperCase().substring(0, 20);
    Description     = Description?.trim() ? Description.trim().substring(0, 52) : null;
    Product         = String(Product).trim().toUpperCase().substring(0, 15);
    Market          = String(Market).trim().toUpperCase().substring(0, 2);
    Curr            = String(Curr).trim().toUpperCase().substring(0, 3);
    Leadtime        = String(Leadtime).trim().substring(0, 8);
    DeliveryTerm    = String(DeliveryTerm).trim().substring(0, 17);

    // ✅ Convert empty string → null for DATE columns
    Start_Date = (Start_Date && String(Start_Date).trim() !== '') ? String(Start_Date).trim() : null;
    Exp_Date   = (Exp_Date   && String(Exp_Date).trim()   !== '') ? String(Exp_Date).trim()   : null;

    const splPrice = parseFloat(SplPrice);
    if (isNaN(splPrice)) {
      return res.status(400).json({ message: 'SplPrice must be a valid number' });
    }

    const [maxRows] = await db.execute('SELECT MAX(Sno) AS m FROM ltsa_price');
    const nextSno   = (maxRows[0].m || 0) + 1;

    await db.execute(
      `INSERT INTO ltsa_price
         (Sno, LTSA_Code, Customer_partno, Cfti_partno, Description,
          SplPrice, Start_Date, Exp_Date, Curr, Leadtime, DeliveryTerm,
          Product, Market, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active')`,
      [
        nextSno, LTSA_Code, Customer_partno, Cfti_partno, Description,
        splPrice, Start_Date, Exp_Date, Curr, Leadtime, DeliveryTerm,
        Product, Market
      ]
    );

    return res.json({ success: true, message: 'LTSA Price added successfully!' });
  } catch (err) {
    console.error('❌ LTSA Insert Error:', err.message);
    return res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

const updateLtsaPrice = async (req, res) => {
  if (!canModify(req.user?.role))
    return res.status(403).json({ message: 'Not authorized' });

  const sno = parseInt(req.params.sno, 10);
  let { Leadtime, DeliveryTerm } = req.body;

  Leadtime     = Leadtime?.trim()     ? Leadtime.trim().substring(0, 8)      : null;
  DeliveryTerm = DeliveryTerm?.trim() ? DeliveryTerm.trim().substring(0, 17) : null;

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