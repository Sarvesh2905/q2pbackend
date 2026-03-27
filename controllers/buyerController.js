const db = require('../config/db');

const canModify = (role) => role === 'Manager' || role === 'Admin';

/* helper: flatten all stored contact strings into a lowercase array */
const getAllContactNums = async (excludeSno = null) => {
  const [rows] = await db.execute(
    excludeSno
      ? 'SELECT contact FROM buyer WHERE contact IS NOT NULL AND contact <> \'\' AND Sno <> ?'
      : 'SELECT contact FROM buyer WHERE contact IS NOT NULL AND contact <> \'\'',
    excludeSno ? [excludeSno] : []
  );
  const nums = [];
  rows.forEach(r => {
    if (r.contact) r.contact.split('|').forEach(c => { if (c.trim()) nums.push(c.trim().toLowerCase()); });
  });
  return nums;
};

// GET /api/buyers
const listBuyers = async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT Sno, Customer, Buyer_name, Designation,
             email1, email2, contact, Location, Segment, status, Comments
      FROM buyer
      ORDER BY Customer ASC, Buyer_name ASC
    `);
    return res.json({ data: rows, total: rows.length });
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// GET /api/buyers/dropdown/customers
const getCustomerOptions = async (req, res) => {
  try {
    const [rows] = await db.execute(
      "SELECT customer_name, Location FROM customer WHERE status = 'Active' ORDER BY customer_name ASC"
    );
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ message: 'Error fetching customers', error: err.message });
  }
};

// GET /api/buyers/check
const checkBuyerExists = async (req, res) => {
  const { Customer, Buyer_name, email1, email2, contact1, contact2, contact3, sno } = req.query;
  const excludeSno = sno ? parseInt(sno, 10) : null;

  try {
    // Customer + Buyer_name composite unique
    if (Customer && Buyer_name) {
      let q = 'SELECT Sno FROM buyer WHERE LOWER(Customer) = LOWER(?) AND LOWER(Buyer_name) = LOWER(?)';
      const p = [Customer, Buyer_name];
      if (excludeSno) { q += ' AND Sno <> ?'; p.push(excludeSno); }
      const [rows] = await db.execute(q, p);
      if (rows.length > 0)
        return res.json({ exists: true, field: 'Buyer_name', message: 'This Buyer already exists for the selected Customer.' });
    }

    // email1 unique
    if (email1) {
      let q = 'SELECT Sno FROM buyer WHERE LOWER(email1) = LOWER(?)';
      const p = [email1];
      if (excludeSno) { q += ' AND Sno <> ?'; p.push(excludeSno); }
      const [rows] = await db.execute(q, p);
      if (rows.length > 0)
        return res.json({ exists: true, field: 'email1', message: 'Email 1 already exists.' });
    }

    // email2 checked against both email1 and email2 columns
    if (email2) {
      let q1 = 'SELECT Sno FROM buyer WHERE LOWER(email2) = LOWER(?)';
      let q2 = 'SELECT Sno FROM buyer WHERE LOWER(email1) = LOWER(?)';
      const p = [email2];
      if (excludeSno) { q1 += ' AND Sno <> ?'; q2 += ' AND Sno <> ?'; p.push(excludeSno); }
      const [r1] = await db.execute(q1, p);
      const [r2] = await db.execute(q2, p);
      if (r1.length > 0 || r2.length > 0)
        return res.json({ exists: true, field: 'email2', message: 'Email 2 already exists.' });
    }

    // Contact unique across all stored contact pipes
    if (contact1 || contact2 || contact3) {
      const allNums = await getAllContactNums(excludeSno);
      if (contact1 && allNums.includes(contact1.toLowerCase()))
        return res.json({ exists: true, field: 'contact1', message: 'Mobile number already exists.' });
      if (contact2 && allNums.includes(contact2.toLowerCase()))
        return res.json({ exists: true, field: 'contact2', message: 'Landline already exists.' });
      if (contact3 && allNums.includes(contact3.toLowerCase()))
        return res.json({ exists: true, field: 'contact3', message: 'Fax already exists.' });
    }

    return res.json({ exists: false });
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// POST /api/buyers
const createBuyer = async (req, res) => {
  if (!canModify(req.user?.role))
    return res.status(403).json({ message: 'Not authorized' });

  let { Customer, Buyer_name, Designation, email1, email2,
        contact1, contact2, contact3, Location, Comments } = req.body;

  if (!Customer || !Buyer_name)
    return res.status(400).json({ message: 'Customer and Buyer Name are required.' });

  Customer    = Customer.trim();
  Buyer_name  = Buyer_name.trim();
  Designation = Designation && Designation.trim() !== '' ? Designation.trim() : null;
  email1      = email1      && email1.trim()      !== '' ? email1.trim()      : null;
  email2      = email2      && email2.trim()      !== '' ? email2.trim()      : null;
  contact1    = contact1    && contact1.trim()    !== '' ? contact1.trim()    : null;
  contact2    = contact2    && contact2.trim()    !== '' ? contact2.trim()    : null;
  contact3    = contact3    && contact3.trim()    !== '' ? contact3.trim()    : null;
  Location    = Location    && Location.trim()    !== '' ? Location.trim()    : null;
  Comments    = Comments    && Comments.trim()    !== '' ? Comments.trim()    : null;
  const contact = [contact1, contact2, contact3].filter(Boolean).join('|') || null;

  try {
    // Composite unique: Customer + Buyer_name
    const [existing] = await db.execute(
      'SELECT Sno FROM buyer WHERE LOWER(Customer) = LOWER(?) AND LOWER(Buyer_name) = LOWER(?)',
      [Customer, Buyer_name]
    );
    if (existing.length > 0)
      return res.status(400).json({ message: 'This Buyer already exists for the selected Customer.' });

    // email1 unique
    if (email1) {
      const [r] = await db.execute('SELECT Sno FROM buyer WHERE LOWER(email1) = LOWER(?)', [email1]);
      if (r.length > 0) return res.status(400).json({ message: 'Email 1 already exists.' });
    }

    // email2 unique (against both columns)
    if (email2) {
      const [r1] = await db.execute('SELECT Sno FROM buyer WHERE LOWER(email2) = LOWER(?)', [email2]);
      const [r2] = await db.execute('SELECT Sno FROM buyer WHERE LOWER(email1) = LOWER(?)', [email2]);
      if (r1.length > 0 || r2.length > 0) return res.status(400).json({ message: 'Email 2 already exists.' });
    }

    // Contact unique
    if (contact1 || contact2 || contact3) {
      const allNums = await getAllContactNums(null);
      if (contact1 && allNums.includes(contact1.toLowerCase())) return res.status(400).json({ message: 'Mobile number already exists.' });
      if (contact2 && allNums.includes(contact2.toLowerCase())) return res.status(400).json({ message: 'Landline already exists.' });
      if (contact3 && allNums.includes(contact3.toLowerCase())) return res.status(400).json({ message: 'Fax already exists.' });
    }

    const [maxRows] = await db.execute('SELECT MAX(Sno) AS m FROM buyer');
    const nextSno = (maxRows[0].m || 0) + 1;

    await db.execute(
      `INSERT INTO buyer (Sno, Customer, Buyer_name, Designation, email1, email2, contact, Location, Segment, status, Comments)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, 'Active', ?)`,
      [nextSno, Customer, Buyer_name, Designation, email1, email2, contact, Location, Comments]
    );

    return res.json({ success: true, message: 'Buyer added successfully!' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

// PUT /api/buyers/:sno — locked: Customer, Buyer_name, Location
const updateBuyer = async (req, res) => {
  if (!canModify(req.user?.role))
    return res.status(403).json({ message: 'Not authorized' });

  const sno = parseInt(req.params.sno, 10);
  let { Designation, email1, email2, contact1, contact2, contact3, Comments } = req.body;

  Designation = Designation && Designation.trim() !== '' ? Designation.trim() : null;
  email1   = email1   && email1.trim()   !== '' ? email1.trim()   : null;
  email2   = email2   && email2.trim()   !== '' ? email2.trim()   : null;
  contact1 = contact1 && contact1.trim() !== '' ? contact1.trim() : null;
  contact2 = contact2 && contact2.trim() !== '' ? contact2.trim() : null;
  contact3 = contact3 && contact3.trim() !== '' ? contact3.trim() : null;
  Comments = Comments  && Comments.trim()  !== '' ? Comments.trim()  : null;
  const contact = [contact1, contact2, contact3].filter(Boolean).join('|') || null;

  try {
    const [rows] = await db.execute('SELECT * FROM buyer WHERE Sno = ?', [sno]);
    if (rows.length === 0) return res.status(404).json({ message: 'Record not found' });
    if (rows[0].status !== 'Active') return res.status(400).json({ message: 'Inactive records cannot be edited' });

    if (email1) {
      const [r] = await db.execute('SELECT Sno FROM buyer WHERE LOWER(email1) = LOWER(?) AND Sno <> ?', [email1, sno]);
      if (r.length > 0) return res.status(400).json({ message: 'Email 1 already exists.' });
    }
    if (email2) {
      const [r1] = await db.execute('SELECT Sno FROM buyer WHERE LOWER(email2) = LOWER(?) AND Sno <> ?', [email2, sno]);
      const [r2] = await db.execute('SELECT Sno FROM buyer WHERE LOWER(email1) = LOWER(?) AND Sno <> ?', [email2, sno]);
      if (r1.length > 0 || r2.length > 0) return res.status(400).json({ message: 'Email 2 already exists.' });
    }
    if (contact1 || contact2 || contact3) {
      const allNums = await getAllContactNums(sno);
      if (contact1 && allNums.includes(contact1.toLowerCase())) return res.status(400).json({ message: 'Mobile number already exists.' });
      if (contact2 && allNums.includes(contact2.toLowerCase())) return res.status(400).json({ message: 'Landline already exists.' });
      if (contact3 && allNums.includes(contact3.toLowerCase())) return res.status(400).json({ message: 'Fax already exists.' });
    }

    await db.execute(
      `UPDATE buyer SET Designation=?, email1=?, email2=?, contact=?, Comments=? WHERE Sno=?`,
      [Designation, email1, email2, contact, Comments, sno]
    );
    return res.json({ success: true, message: 'Buyer updated successfully!' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

// PATCH /api/buyers/:sno/status
const toggleBuyerStatus = async (req, res) => {
  if (!canModify(req.user?.role))
    return res.status(403).json({ message: 'Not authorized' });

  const sno = parseInt(req.params.sno, 10);
  try {
    const [rows] = await db.execute('SELECT status FROM buyer WHERE Sno = ?', [sno]);
    if (rows.length === 0) return res.status(404).json({ message: 'Not found' });
    const next = rows[0].status === 'Active' ? 'Inactive' : 'Active';
    await db.execute('UPDATE buyer SET status = ? WHERE Sno = ?', [next, sno]);
    return res.json({ success: true, status: next });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  listBuyers, createBuyer, updateBuyer,
  toggleBuyerStatus, checkBuyerExists, getCustomerOptions
};