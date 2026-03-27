const db = require("../config/db");

const canModify = (role) => role === "Manager" || role === "Admin";

// GET /api/countries
const listCountries = async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT Sno, Country_code, Country_name, Region,
             Currency, Currency_Name, Conversion_rate, status
      FROM country
      ORDER BY Country_name ASC
    `);
    return res.json({ data: rows, total: rows.length });
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Server error", error: err.message });
  }
};

// GET /api/countries/check?Country_code=
const checkCountryExists = async (req, res) => {
  const { Country_code, sno } = req.query;
  const excludeSno = sno ? parseInt(sno, 10) : null;
  try {
    if (Country_code) {
      let q =
        "SELECT Sno FROM country WHERE LOWER(TRIM(Country_code)) = LOWER(TRIM(?))";
      const p = [Country_code];
      if (excludeSno) {
        q += " AND Sno <> ?";
        p.push(excludeSno);
      }
      const [rows] = await db.execute(q, p);
      if (rows.length > 0)
        return res.json({
          exists: true,
          field: "Country_code",
          message: "Country Code already exists.",
        });
    }
    return res.json({ exists: false });
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Server error", error: err.message });
  }
};

// POST /api/countries
const createCountry = async (req, res) => {
  if (!canModify(req.user?.role))
    return res.status(403).json({ message: "Not authorized" });

  let {
    Country_code,
    Country_name,
    Region,
    Currency,
    Currency_Name,
    Conversion_rate,
  } = req.body;

  if (!Country_code || !Country_name || !Currency || !Conversion_rate)
    return res
      .status(400)
      .json({
        message:
          "Country Code, Name, Currency and Conversion Rate are required.",
      });

  Country_code = Country_code.trim().toUpperCase();
  Country_name =
    Country_name.trim().charAt(0).toUpperCase() + Country_name.trim().slice(1);
  Region =
    Region && Region.trim() !== ""
      ? Region.trim().charAt(0).toUpperCase() +
        Region.trim().slice(1).toLowerCase()
      : null;
  Currency = Currency.trim().toUpperCase();
  Currency_Name =
    Currency_Name && Currency_Name.trim() !== ""
      ? Currency_Name.trim().charAt(0).toUpperCase() +
        Currency_Name.trim().slice(1).toLowerCase()
      : null;
  Conversion_rate = parseFloat(Conversion_rate);

  if (isNaN(Conversion_rate))
    return res
      .status(400)
      .json({ message: "Conversion Rate must be a valid number." });

  try {
    const [existing] = await db.execute(
      "SELECT Sno FROM country WHERE LOWER(TRIM(Country_code)) = LOWER(TRIM(?))",
      [Country_code],
    );
    if (existing.length > 0)
      return res.status(400).json({ message: "Country Code already exists." });

    const [maxRows] = await db.execute("SELECT MAX(Sno) AS m FROM country");
    const nextSno = (maxRows[0].m || 0) + 1;

    await db.execute(
      `INSERT INTO country (Sno, Country_code, Country_name, Region, Currency, Currency_Name, Conversion_rate, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'Active')`,
      [
        nextSno,
        Country_code,
        Country_name,
        Region,
        Currency,
        Currency_Name,
        Conversion_rate,
      ],
    );
    return res.json({ success: true, message: "Country added successfully!" });
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Server error", error: err.message });
  }
};

// PUT /api/countries/:sno  — locked: Country_code, Country_name, Currency
const updateCountry = async (req, res) => {
  if (!canModify(req.user?.role))
    return res.status(403).json({ message: "Not authorized" });

  const sno = parseInt(req.params.sno, 10);
  let { Region, Currency_Name, Conversion_rate } = req.body;

  Region =
    Region && Region.trim() !== ""
      ? Region.trim().charAt(0).toUpperCase() +
        Region.trim().slice(1).toLowerCase()
      : null;
  Currency_Name =
    Currency_Name && Currency_Name.trim() !== ""
      ? Currency_Name.trim().charAt(0).toUpperCase() +
        Currency_Name.trim().slice(1).toLowerCase()
      : null;
  Conversion_rate = parseFloat(Conversion_rate);

  if (isNaN(Conversion_rate))
    return res
      .status(400)
      .json({ message: "Conversion Rate must be a valid number." });

  try {
    const [rows] = await db.execute("SELECT * FROM country WHERE Sno = ?", [
      sno,
    ]);
    if (rows.length === 0)
      return res.status(404).json({ message: "Record not found" });
    if (rows[0].status !== "Active")
      return res
        .status(400)
        .json({ message: "Inactive records cannot be edited" });

    await db.execute(
      "UPDATE country SET Region = ?, Currency_Name = ?, Conversion_rate = ? WHERE Sno = ?",
      [Region, Currency_Name, Conversion_rate, sno],
    );
    return res.json({
      success: true,
      message: "Country updated successfully!",
    });
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Server error", error: err.message });
  }
};

// PATCH /api/countries/:sno/status
const toggleCountryStatus = async (req, res) => {
  if (!canModify(req.user?.role))
    return res.status(403).json({ message: "Not authorized" });

  const sno = parseInt(req.params.sno, 10);
  try {
    const [rows] = await db.execute(
      "SELECT status FROM country WHERE Sno = ?",
      [sno],
    );
    if (rows.length === 0)
      return res.status(404).json({ message: "Not found" });
    const next = rows[0].status === "Active" ? "Inactive" : "Active";
    await db.execute("UPDATE country SET status = ? WHERE Sno = ?", [
      next,
      sno,
    ]);
    return res.json({ success: true, status: next });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  listCountries,
  createCountry,
  updateCountry,
  toggleCountryStatus,
  checkCountryExists,
};
