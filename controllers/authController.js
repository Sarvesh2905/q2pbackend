const db = require("../config/db");
const transporter = require("../config/email");
const jwt = require("jsonwebtoken");
require("dotenv").config();

// ─────────────────────────────────────────────
// LOGIN
// ─────────────────────────────────────────────
const login = async (req, res) => {
  const { username, password, site } = req.body;

  if (!username || !password || !site) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    const [rows] = await db.execute(
      "SELECT * FROM users WHERE username = ? AND password = ? AND site = ?",
      [username, password, site],
    );

    if (rows.length === 0) {
      return res.status(401).json({ message: "Invalid credentials or site" });
    }

    const user = rows[0];

    const token = jwt.sign(
      {
        username: user.username,
        role: user.Role,
        site: user.site,
      },
      process.env.JWT_SECRET,
      { expiresIn: "8h" },
    );

    return res.json({
      token,
      role: user.Role,
      First_name: user.First_name,
      Last_name: user.Last_name,
      site: user.site,
      username: user.username,
    });
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Server error", error: err.message });
  }
};

// ─────────────────────────────────────────────
// CHECK EMAIL (before sending OTP)
// ─────────────────────────────────────────────
const checkEmail = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  try {
    const [rows] = await db.execute(
      "SELECT username FROM users WHERE username = ?",
      [email],
    );

    if (rows.length > 0) {
      return res.json({ exists: true, message: "User already exists" });
    }

    return res.json({ exists: false });
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Server error", error: err.message });
  }
};

// ─────────────────────────────────────────────
// SEND OTP
// ─────────────────────────────────────────────
const sendOTP = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res
      .status(400)
      .json({ success: false, message: "Email is required" });
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  try {
    await db.execute("DELETE FROM otp_store WHERE email = ?", [email]);

    await db.execute(
      "INSERT INTO otp_store (email, otp, expires_at) VALUES (?, ?, ?)",
      [email, otp, expiresAt],
    );

    await transporter.sendMail({
      from: `"Q2P System" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Q2P System — Email Verification OTP",
      html: `
        <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;
                    border:1px solid #ddd;border-radius:10px;overflow:hidden;">
          <div style="background:#8B0000;padding:20px;text-align:center;">
            <h2 style="color:white;margin:0;">Q2P System</h2>
            <p style="color:#f5c0c0;margin:4px 0 0;">Email Verification</p>
          </div>
          <div style="padding:28px;text-align:center;">
            <p style="font-size:16px;color:#333;">Your One-Time Password is:</p>
            <h1 style="letter-spacing:12px;color:#8B0000;font-size:40px;margin:16px 0;">
              ${otp}
            </h1>
            <p style="color:#888;font-size:13px;">
              This OTP is valid for <strong>10 minutes</strong>.<br/>
              Do not share it with anyone.
            </p>
          </div>
          <div style="background:#f9f5f5;padding:12px;text-align:center;
                      font-size:12px;color:#aaa;">
            © Circor Flow Technologies India Pvt. Ltd.
          </div>
        </div>
      `,
    });

    return res.json({ success: true, message: "OTP sent to your email" });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Failed to send OTP",
      error: err.message,
    });
  }
};

// ─────────────────────────────────────────────
// VERIFY OTP
// ─────────────────────────────────────────────
const verifyOTP = async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res
      .status(400)
      .json({ success: false, message: "Email and OTP required" });
  }

  try {
    const [rows] = await db.execute(
      `SELECT * FROM otp_store
       WHERE email = ? AND otp = ? AND used = 0 AND expires_at > NOW()`,
      [email, otp],
    );

    if (rows.length === 0) {
      return res.json({ success: false, message: "Invalid or expired OTP" });
    }

    await db.execute(
      "UPDATE otp_store SET used = 1 WHERE email = ? AND otp = ?",
      [email, otp],
    );

    return res.json({ success: true, message: "OTP verified successfully" });
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Server error", error: err.message });
  }
};

// ─────────────────────────────────────────────
// CREATE ACCOUNT
// ─────────────────────────────────────────────
const createAccount = async (req, res) => {
  const { username, password, site, First_name, Last_name, Employee_ID, Role } =
    req.body;
  const Email = username;

  if (
    !username ||
    !password ||
    !site ||
    !First_name ||
    !Last_name ||
    !Employee_ID ||
    !Role
  ) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    const [empCheck] = await db.execute(
      "SELECT Employee_ID FROM users WHERE Employee_ID = ?",
      [Employee_ID],
    );
    if (empCheck.length > 0) {
      return res.status(400).json({ message: "Employee ID already exists" });
    }

    const [userCheck] = await db.execute(
      "SELECT username FROM users WHERE username = ?",
      [username],
    );
    if (userCheck.length > 0) {
      return res.status(400).json({ message: "User already exists" });
    }

    await db.execute(
      `INSERT INTO users
        (username, password, site, First_name, Last_name, Employee_ID, Email, Role)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        username,
        password,
        site,
        First_name,
        Last_name,
        Employee_ID,
        Email,
        Role,
      ],
    );

    return res.json({ success: true, message: "Account created successfully" });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
};

// ─────────────────────────────────────────────
// GET SITES
// ─────────────────────────────────────────────
const getSites = async (req, res) => {
  try {
    const [rows] = await db.execute(
      "SELECT site_name FROM sites WHERE status = 'Active'",
    );
    return res.json(rows);
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Server error", error: err.message });
  }
};

module.exports = {
  login,
  checkEmail,
  sendOTP,
  verifyOTP,
  createAccount,
  getSites,
};
