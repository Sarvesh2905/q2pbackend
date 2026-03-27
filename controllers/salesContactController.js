const db = require('../config/db');

const canModify = (role) => role === 'Manager' || role === 'Admin';

// GET /api/sales-contacts
const listSalesContacts = async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT Sno, sales_contact_name, email, mobile, landline, status
       FROM sales_contact
       ORDER BY sales_contact_name ASC`
    );
    return res.json({ data: rows, total: rows.length });
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// GET /api/sales-contacts/check?sales_contact_name=&email=&mobile=&landline=
const checkSalesContactExists = async (req, res) => {
  const { sales_contact_name, email, mobile, landline } = req.query;
  try {
    if (sales_contact_name) {
      const [rows] = await db.execute(
        `SELECT Sno FROM sales_contact
         WHERE LOWER(TRIM(REPLACE(sales_contact_name,' ',''))) = LOWER(TRIM(REPLACE(?,' ','')))`,
        [sales_contact_name]
      );
      if (rows.length > 0)
        return res.json({ exists: true, field: 'sales_contact_name', message: 'Sales Contact name already exists.' });
    }
    if (email) {
      const [rows] = await db.execute(
        `SELECT Sno FROM sales_contact
         WHERE LOWER(TRIM(email)) = LOWER(TRIM(?))`,
        [email]
      );
      if (rows.length > 0)
        return res.json({ exists: true, field: 'email', message: 'Email already exists.' });
    }
    if (mobile) {
      const [rows] = await db.execute(
        'SELECT Sno FROM sales_contact WHERE mobile = ?',
        [mobile]
      );
      if (rows.length > 0)
        return res.json({ exists: true, field: 'mobile', message: 'Mobile number already exists.' });
    }
    if (landline) {
      const [rows] = await db.execute(
        'SELECT Sno FROM sales_contact WHERE landline = ?',
        [landline]
      );
      if (rows.length > 0)
        return res.json({ exists: true, field: 'landline', message: 'Landline already exists.' });
    }
    return res.json({ exists: false });
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// POST /api/sales-contacts
const createSalesContact = async (req, res) => {
  const role = req.user?.role;
  if (!canModify(role))
    return res.status(403).json({ message: 'Not authorized' });

  let { sales_contact_name, email, mobile, landline } = req.body;

  if (!sales_contact_name || !email)
    return res.status(400).json({ message: 'Name and Email are required' });

  // Capitalize name like Flask does
  sales_contact_name = sales_contact_name.trim().charAt(0).toUpperCase() +
                       sales_contact_name.trim().slice(1).toLowerCase();

  mobile   = mobile   && mobile.trim()   !== '' ? mobile.trim()   : null;
  landline = landline && landline.trim() !== '' ? landline.trim() : null;

  try {
    // Unique check: sales_contact_name
    const [nameRows] = await db.execute(
      `SELECT Sno FROM sales_contact
       WHERE LOWER(TRIM(REPLACE(sales_contact_name,' ',''))) = LOWER(TRIM(REPLACE(?,' ','')))`,
      [sales_contact_name]
    );
    if (nameRows.length > 0)
      return res.status(400).json({ message: 'Sales Contact name already exists.' });

    // Unique check: email
    const [emailRows] = await db.execute(
      'SELECT Sno FROM sales_contact WHERE LOWER(TRIM(email)) = LOWER(TRIM(?))',
      [email]
    );
    if (emailRows.length > 0)
      return res.status(400).json({ message: 'Email already exists.' });

    // Unique check: mobile (only if provided)
    if (mobile) {
      const [mobRows] = await db.execute(
        'SELECT Sno FROM sales_contact WHERE mobile = ?', [mobile]
      );
      if (mobRows.length > 0)
        return res.status(400).json({ message: 'Mobile number already exists.' });
    }

    // Unique check: landline (only if provided)
    if (landline) {
      const [llRows] = await db.execute(
        'SELECT Sno FROM sales_contact WHERE landline = ?', [landline]
      );
      if (llRows.length > 0)
        return res.status(400).json({ message: 'Landline already exists.' });
    }

    // Get next Sno
    const [maxRows] = await db.execute(
      'SELECT MAX(Sno) AS maxSno FROM sales_contact'
    );
    const nextSno = (maxRows[0].maxSno || 0) + 1;

    await db.execute(
      `INSERT INTO sales_contact (Sno, sales_contact_name, email, mobile, landline, status)
       VALUES (?, ?, ?, ?, ?, 'Active')`,
      [nextSno, sales_contact_name, email, mobile, landline]
    );

    return res.json({ success: true, message: 'Sales contact added successfully!' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

// PUT /api/sales-contacts/:sno  — only mobile & landline editable
const updateSalesContact = async (req, res) => {
  const role = req.user?.role;
  if (!canModify(role))
    return res.status(403).json({ message: 'Not authorized' });

  const sno = parseInt(req.params.sno, 10);
  let { mobile, landline } = req.body;

  mobile   = mobile   && mobile.trim()   !== '' ? mobile.trim()   : null;
  landline = landline && landline.trim() !== '' ? landline.trim() : null;

  try {
    const [rows] = await db.execute(
      'SELECT * FROM sales_contact WHERE Sno = ?', [sno]
    );
    if (rows.length === 0)
      return res.status(404).json({ message: 'Record not found' });
    if (rows[0].status !== 'Active')
      return res.status(400).json({ message: 'Inactive records cannot be edited' });

    // Unique mobile check (exclude current Sno)
    if (mobile) {
      const [mobRows] = await db.execute(
        'SELECT Sno FROM sales_contact WHERE mobile = ? AND Sno <> ?', [mobile, sno]
      );
      if (mobRows.length > 0)
        return res.status(400).json({ message: 'Mobile number already exists.' });
    }

    // Unique landline check (exclude current Sno)
    if (landline) {
      const [llRows] = await db.execute(
        'SELECT Sno FROM sales_contact WHERE landline = ? AND Sno <> ?', [landline, sno]
      );
      if (llRows.length > 0)
        return res.status(400).json({ message: 'Landline already exists.' });
    }

    await db.execute(
      'UPDATE sales_contact SET mobile = ?, landline = ? WHERE Sno = ?',
      [mobile, landline, sno]
    );

    return res.json({ success: true, message: 'Sales contact updated successfully!' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

// PATCH /api/sales-contacts/:sno/status
const toggleSalesContactStatus = async (req, res) => {
  const role = req.user?.role;
  if (!canModify(role))
    return res.status(403).json({ message: 'Not authorized' });

  const sno = parseInt(req.params.sno, 10);

  try {
    const [rows] = await db.execute(
      'SELECT status FROM sales_contact WHERE Sno = ?', [sno]
    );
    if (rows.length === 0)
      return res.status(404).json({ message: 'Record not found' });

    const next = rows[0].status === 'Active' ? 'Inactive' : 'Active';

    await db.execute(
      'UPDATE sales_contact SET status = ? WHERE Sno = ?', [next, sno]
    );

    return res.json({ success: true, status: next });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

module.exports = {
  listSalesContacts,
  createSalesContact,
  updateSalesContact,
  toggleSalesContactStatus,
  checkSalesContactExists
};