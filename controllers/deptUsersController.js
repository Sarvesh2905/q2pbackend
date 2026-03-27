const db = require('../config/db');

// Utility: role check (Manager or Admin can modify)
const canModify = (role) => role === 'Manager' || role === 'Admin';

// GET /api/dept-users?page=&pageSize=50&search=
const listDeptUsers = async (req, res) => {
  const page      = parseInt(req.query.page, 10)      || 1;
  const pageSize  = parseInt(req.query.pageSize, 10)  || 50;
  const search    = (req.query.search || '').trim();
  const offset    = (page - 1) * pageSize;

  try {
    const params = [];
    let where    = '1=1';

    if (search) {
      where += ` AND (
        dept_user_id LIKE ? OR
        Username     LIKE ? OR
        Email        LIKE ? OR
        status       LIKE ?
      )`;
      const q = `%${search}%`;
      params.push(q, q, q, q);
    }

    const [rows] = await db.execute(
      `SELECT Sno, dept_user_id, Username, Email, status
       FROM dept_users
       WHERE ${where}
       ORDER BY Username ASC`,
      params
    );

    const total = rows.length;
    const paged = rows.slice(offset, offset + pageSize);

    return res.json({
      data: paged,
      total,
      page,
      pageSize
    });
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// GET /api/dept-users/check?dept_user_id=&username=
const checkDeptUserExists = async (req, res) => {
  const { dept_user_id, username } = req.query;
  try {
    if (dept_user_id) {
      const [rows] = await db.execute(
        'SELECT dept_user_id FROM dept_users WHERE dept_user_id = ?',
        [dept_user_id]
      );
      if (rows.length > 0) {
        return res.json({ exists: true, field: 'dept_user_id' });
      }
    }
    if (username) {
      const [rows2] = await db.execute(
        'SELECT Username FROM dept_users WHERE Username = ?',
        [username]
      );
      if (rows2.length > 0) {
        return res.json({ exists: true, field: 'Username' });
      }
    }
    return res.json({ exists: false });
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// POST /api/dept-users
const createDeptUser = async (req, res) => {
  const role = req.user?.role;
  if (!canModify(role)) {
    return res.status(403).json({ message: 'Not authorized' });
  }

  const { dept_user_id, Username, Email } = req.body;

  if (!dept_user_id || !Username || !Email) {
    return res.status(400).json({ message: 'Id, Name and Email are required' });
  }

  try {
    // Check unique constraints
    const [idRows] = await db.execute(
      'SELECT dept_user_id FROM dept_users WHERE dept_user_id = ?',
      [dept_user_id]
    );
    if (idRows.length > 0) {
      return res.status(400).json({ message: 'Id already exists' });
    }

    const [nameRows] = await db.execute(
      'SELECT Username FROM dept_users WHERE Username = ?',
      [Username]
    );
    if (nameRows.length > 0) {
      return res.status(400).json({ message: 'Name already exists' });
    }

    // Next Sno (to keep order 1,2,3…)
    const [maxRows] = await db.execute('SELECT MAX(Sno) AS maxSno FROM dept_users');
    const nextSno = (maxRows[0].maxSno || 0) + 1;

    await db.execute(
      `INSERT INTO dept_users (Sno, dept_user_id, Username, Email, status)
       VALUES (?, ?, ?, ?, 'Active')`,
      [nextSno, dept_user_id, Username, Email]
    );

    return res.json({ success: true, message: 'User added successfully!' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

// PUT /api/dept-users/:sno
const updateDeptUser = async (req, res) => {
  const role = req.user?.role;
  if (!canModify(role)) {
    return res.status(403).json({ message: 'Not authorized' });
  }

  const sno = parseInt(req.params.sno, 10);
  const { Username, Email } = req.body;

  if (!Username || !Email) {
    return res.status(400).json({ message: 'Name and Email are required' });
  }

  try {
    const [rows] = await db.execute(
      'SELECT * FROM dept_users WHERE Sno = ?',
      [sno]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (rows[0].status !== 'Active') {
      return res.status(400).json({ message: 'Inactive users cannot be edited' });
    }

    // Ensure Username unique except same Sno
    const [nameRows] = await db.execute(
      'SELECT Sno FROM dept_users WHERE Username = ? AND Sno <> ?',
      [Username, sno]
    );
    if (nameRows.length > 0) {
      return res.status(400).json({ message: 'Name already exists' });
    }

    await db.execute(
      'UPDATE dept_users SET Username = ?, Email = ? WHERE Sno = ?',
      [Username, Email, sno]
    );

    return res.json({ success: true, message: 'User updated successfully!' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

// PATCH /api/dept-users/:sno/status
const toggleDeptUserStatus = async (req, res) => {
  const role = req.user?.role;
  if (!canModify(role)) {
    return res.status(403).json({ message: 'Not authorized' });
  }

  const sno = parseInt(req.params.sno, 10);

  try {
    const [rows] = await db.execute(
      'SELECT status FROM dept_users WHERE Sno = ?',
      [sno]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const current = rows[0].status === 'Active' ? 'Active' : 'Inactive';
    const next    = current === 'Active' ? 'Inactive' : 'Active';

    await db.execute(
      'UPDATE dept_users SET status = ? WHERE Sno = ?',
      [next, sno]
    );

    return res.json({ success: true, status: next });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

module.exports = {
  listDeptUsers,
  createDeptUser,
  updateDeptUser,
  toggleDeptUserStatus,
  checkDeptUserExists
};