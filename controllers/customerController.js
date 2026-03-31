const db = require("../config/db");

const canModify = (role) => role === "Manager" || role === "Admin";

// GET /api/customers
const listCustomers = async (req, res) => {
  try {
    let rows;
    try {
      [rows] = await db.execute(`
        SELECT
          c.Sno, c.customer_name, c.customer_type, c.customer_country,
          c.Address, c.City, c.State, c.Region, c.Sub_Region,
          c.Location, c.Category, c.Short_name, c.Ltsa_code,
          c.Segment, c.status,
          GROUP_CONCAT(b.Buyer_name ORDER BY b.Buyer_name SEPARATOR ', ') AS buyers
        FROM customer c
        LEFT JOIN buyer b
          ON  b.Customer   = c.customer_name
          AND b.Location   = c.Location
          AND b.Buyer_name IS NOT NULL
          AND b.status     = 'Active'
        GROUP BY
          c.Sno, c.customer_name, c.customer_type, c.customer_country,
          c.Address, c.City, c.State, c.Region, c.Sub_Region,
          c.Location, c.Category, c.Short_name, c.Ltsa_code,
          c.Segment, c.status
        ORDER BY c.customer_name ASC
      `);
    } catch {
      [rows] = await db.execute(`
        SELECT
          Sno, customer_name, customer_type, customer_country,
          Address, City, State, Region, Sub_Region,
          Location, Category, Short_name, Ltsa_code,
          Segment, status,
          NULL AS buyers
        FROM customer
        ORDER BY customer_name ASC
      `);
    }
    return res.json({ data: rows, total: rows.length });
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Server error", error: err.message });
  }
};

// GET /api/customers/dropdown/types
const getDropdownTypes = async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT Data FROM quote_data
       WHERE LOWER(Type) = 'customertype' AND Status = 'Active'
       ORDER BY Data ASC`,
    );
    return res.json(rows.map((r) => r.Data).filter(Boolean));
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Error fetching types", error: err.message });
  }
};

// GET /api/customers/dropdown/countries
const getDropdownCountries = async (req, res) => {
  try {
    let rows;
    try {
      [rows] = await db.execute(
        `SELECT Country_name FROM country
         WHERE status = 'Active'
         ORDER BY Country_name ASC`,
      );
    } catch {
      [rows] = await db.execute(
        `SELECT DISTINCT customer_country AS Country_name
         FROM customer
         WHERE customer_country IS NOT NULL AND customer_country <> ''
         ORDER BY customer_country ASC`,
      );
    }
    return res.json(rows.map((r) => r.Country_name).filter(Boolean));
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Error fetching countries", error: err.message });
  }
};

// GET /api/customers/dropdown/categories
const getDropdownCategories = async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT DISTINCT Category FROM customer
       WHERE Category IS NOT NULL AND Category <> ''
       ORDER BY Category ASC`,
    );
    return res.json(rows.map((r) => r.Category).filter(Boolean));
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Error fetching categories", error: err.message });
  }
};

// GET /api/customers/dropdown/ltsa-codes
const getDropdownLtsaCodes = async (req, res) => {
  try {
    let rows;
    try {
      [rows] = await db.execute(
        `SELECT DISTINCT LTSA_Code AS LTSACode
         FROM ltsa_price
         WHERE LTSA_Code IS NOT NULL AND LTSA_Code <> ''
         ORDER BY LTSA_Code ASC`,
      );
    } catch {
      [rows] = await db.execute(
        `SELECT DISTINCT Ltsa_code AS LTSACode
         FROM customer
         WHERE Ltsa_code IS NOT NULL AND Ltsa_code <> ''
         ORDER BY Ltsa_code ASC`,
      );
    }
    return res.json(rows.map((r) => r.LTSACode).filter(Boolean));
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Error fetching LTSA codes", error: err.message });
  }
};

// GET /api/customers/check
const checkCustomerExists = async (req, res) => {
  const { customer_name, Location } = req.query;
  try {
    if (customer_name && !Location) {
      const [rows] = await db.execute(
        `SELECT Sno FROM customer
         WHERE LOWER(TRIM(REPLACE(customer_name,' ',''))) = LOWER(TRIM(REPLACE(?,' ','')))`,
        [customer_name],
      );
      if (rows.length > 0)
        return res.json({
          exists: true,
          field: "customer_name",
          message:
            "Customer name already exists. Add a Location to distinguish.",
        });
    }
    if (customer_name && Location) {
      const [rows] = await db.execute(
        `SELECT Sno FROM customer
         WHERE LOWER(TRIM(customer_name)) = LOWER(TRIM(?))
           AND LOWER(TRIM(IFNULL(Location,''))) = LOWER(TRIM(?))`,
        [customer_name, Location],
      );
      if (rows.length > 0)
        return res.json({
          exists: true,
          field: "Location",
          message: "This Customer + Location combination already exists.",
        });
    }
    return res.json({ exists: false });
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Server error", error: err.message });
  }
};

// POST /api/customers
const createCustomer = async (req, res) => {
  if (!canModify(req.user?.role))
    return res.status(403).json({ message: "Not authorized" });

  let {
    customer_name,
    customer_type,
    customer_country,
    Address,
    City,
    State,
    Region,
    Sub_Region,
    Location,
    Category,
    Short_name,
    Ltsa_code,
  } = req.body;

  if (!customer_name || !customer_type || !customer_country)
    return res
      .status(400)
      .json({ message: "Customer Name, Type and Country are required." });

  // FIX: NOT NULL columns fall back to '' not null (DESCRIBE shows
  // City, State, Region, Sub_Region, Category, Short_name, Location are NOT NULL)
  customer_name = customer_name.trim();
  customer_type = customer_type.trim().toUpperCase();
  customer_country = customer_country.trim().toUpperCase();
  Location = Location && Location.trim() !== "" ? Location.trim() : ""; // PK NOT NULL
  Address = Address && Address.trim() !== "" ? Address.trim() : null; // nullable
  City = City && City.trim() !== "" ? City.trim() : ""; // NOT NULL
  State = State && State.trim() !== "" ? State.trim() : ""; // NOT NULL
  Region = Region && Region.trim() !== "" ? Region.trim() : ""; // NOT NULL
  Sub_Region = Sub_Region && Sub_Region.trim() !== "" ? Sub_Region.trim() : ""; // NOT NULL
  Category = Category && Category.trim() !== "" ? Category.trim() : ""; // NOT NULL
  Short_name = Short_name && Short_name.trim() !== "" ? Short_name.trim() : ""; // NOT NULL
  Ltsa_code = Ltsa_code && Ltsa_code.trim() !== "" ? Ltsa_code.trim() : null; // nullable
  const Segment = "INDUSTRIAL";

  try {
    const [existing] = await db.execute(
      `SELECT Sno FROM customer
       WHERE LOWER(TRIM(customer_name)) = LOWER(TRIM(?))
         AND LOWER(TRIM(IFNULL(Location,''))) = LOWER(TRIM(IFNULL(?,'')))`,
      [customer_name, Location],
    );
    if (existing.length > 0)
      return res
        .status(400)
        .json({
          message: "This Customer + Location combination already exists.",
        });

    const [maxRows] = await db.execute("SELECT MAX(Sno) AS m FROM customer");
    const nextSno = (maxRows[0].m || 0) + 1;

    await db.execute(
      `INSERT INTO customer
        (Sno, customer_name, customer_type, customer_country, Address,
         City, State, Region, Sub_Region, Location, Category,
         Short_name, Ltsa_code, Segment, status)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,'Active')`,
      [
        nextSno,
        customer_name,
        customer_type,
        customer_country,
        Address,
        City,
        State,
        Region,
        Sub_Region,
        Location,
        Category,
        Short_name,
        Ltsa_code,
        Segment,
      ],
    );
    return res.json({ success: true, message: "Customer added successfully!" });
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Server error", error: err.message });
  }
};

// PUT /api/customers/:sno
const updateCustomer = async (req, res) => {
  if (!canModify(req.user?.role))
    return res.status(403).json({ message: "Not authorized" });

  const sno = parseInt(req.params.sno, 10);
  let {
    Address,
    City,
    State,
    Region,
    Sub_Region,
    Category,
    Short_name,
    Ltsa_code,
  } = req.body;

  // FIX: same NOT NULL fallback applied to UPDATE fields
  Address = Address && Address.trim() !== "" ? Address.trim() : null; // nullable
  City = City && City.trim() !== "" ? City.trim() : ""; // NOT NULL
  State = State && State.trim() !== "" ? State.trim() : ""; // NOT NULL
  Region = Region && Region.trim() !== "" ? Region.trim() : ""; // NOT NULL
  Sub_Region = Sub_Region && Sub_Region.trim() !== "" ? Sub_Region.trim() : ""; // NOT NULL
  Category = Category && Category.trim() !== "" ? Category.trim() : ""; // NOT NULL
  Short_name = Short_name && Short_name.trim() !== "" ? Short_name.trim() : ""; // NOT NULL
  Ltsa_code = Ltsa_code && Ltsa_code.trim() !== "" ? Ltsa_code.trim() : null; // nullable

  try {
    const [rows] = await db.execute("SELECT * FROM customer WHERE Sno = ?", [
      sno,
    ]);
    if (rows.length === 0)
      return res.status(404).json({ message: "Record not found" });
    if (rows[0].status !== "Active")
      return res
        .status(400)
        .json({ message: "Inactive records cannot be edited" });

    await db.execute(
      `UPDATE customer
          SET Address=?, City=?, State=?, Region=?, Sub_Region=?,
              Category=?, Short_name=?, Ltsa_code=?
        WHERE Sno=?`,
      [
        Address,
        City,
        State,
        Region,
        Sub_Region,
        Category,
        Short_name,
        Ltsa_code,
        sno,
      ],
    );
    return res.json({
      success: true,
      message: "Customer updated successfully!",
    });
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Server error", error: err.message });
  }
};

// PATCH /api/customers/:sno/status
const toggleCustomerStatus = async (req, res) => {
  if (!canModify(req.user?.role))
    return res.status(403).json({ message: "Not authorized" });

  const sno = parseInt(req.params.sno, 10);
  try {
    const [rows] = await db.execute(
      "SELECT status FROM customer WHERE Sno = ?",
      [sno],
    );
    if (rows.length === 0)
      return res.status(404).json({ message: "Not found" });

    const next = rows[0].status === "Active" ? "Inactive" : "Active";
    await db.execute("UPDATE customer SET status = ? WHERE Sno = ?", [
      next,
      sno,
    ]);
    return res.json({ success: true, status: next });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  listCustomers,
  createCustomer,
  updateCustomer,
  toggleCustomerStatus,
  checkCustomerExists,
  getDropdownTypes,
  getDropdownCountries,
  getDropdownCategories,
  getDropdownLtsaCodes,
};
