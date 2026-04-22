const db = require("../config/db");
const XLSX = require("xlsx");

const canModify = (role) => role === "Manager" || role === "Admin";

/* ─── CSV helper ─── */
const toCSV = (fields, rows) => {
  const header = fields.join(",");
  const lines = rows.map((r) =>
    fields
      .map((f) => {
        const val = r[f] ?? "";
        return `"${String(val).replace(/"/g, '""')}"`;
      })
      .join(","),
  );
  return [header, ...lines].join("\n");
};

/* ─── Date helper for xlsx upload ─── */
const toDateStr = (val) => {
  if (!val && val !== 0) return null;
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return null;
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, "0");
    const d = String(val.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  const s = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const dt = new Date(s);
  if (isNaN(dt.getTime())) return null;
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
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
    return res
      .status(500)
      .json({ message: "Server error", error: err.message });
  }
};

const createPrice = async (req, res) => {
  if (!canModify(req.user?.role))
    return res.status(403).json({ message: "Not authorized" });

  let {
    Customer_partno,
    Cfti_partno,
    Description,
    ListPrice,
    Start_Date,
    Exp_Date,
    Curr,
    Leadtime,
    DeliveryTerm,
    Product,
    Market,
    SPL_Cond,
    Remarks,
  } = req.body;

  const missing = [];
  if (!Customer_partno) missing.push("Customer_partno");
  if (!Cfti_partno) missing.push("Cfti_partno");
  if (!ListPrice) missing.push("ListPrice");
  if (!Curr) missing.push("Curr");
  if (!Leadtime) missing.push("Leadtime");
  if (!DeliveryTerm) missing.push("DeliveryTerm");
  if (!Product) missing.push("Product");
  if (!Market) missing.push("Market");
  if (missing.length > 0)
    return res
      .status(400)
      .json({ message: `Missing required fields: ${missing.join(", ")}` });

  try {
    Customer_partno = String(Customer_partno)
      .trim()
      .toUpperCase()
      .substring(0, 10);
    Cfti_partno = String(Cfti_partno).trim().toUpperCase().substring(0, 20);
    Description = Description?.trim()
      ? Description.trim().substring(0, 52)
      : null;
    Product = String(Product).trim().toUpperCase().substring(0, 15);
    Market = String(Market).trim().toUpperCase().substring(0, 2);
    Curr = String(Curr).trim().toUpperCase().substring(0, 3);
    Leadtime = String(Leadtime).trim().substring(0, 8);
    DeliveryTerm = String(DeliveryTerm).trim().substring(0, 17);
    Start_Date =
      Start_Date && String(Start_Date).trim()
        ? String(Start_Date).trim()
        : null;
    Exp_Date =
      Exp_Date && String(Exp_Date).trim() ? String(Exp_Date).trim() : null;
    SPL_Cond = SPL_Cond?.trim() ? SPL_Cond.trim().substring(0, 10) : null;
    Remarks = Remarks?.trim() ? Remarks.trim().substring(0, 10) : null;

    const price = parseFloat(ListPrice);
    if (isNaN(price))
      return res
        .status(400)
        .json({ message: "ListPrice must be a valid number" });

    const [maxRows] = await db.execute("SELECT MAX(Sno) AS m FROM price");
    const nextSno = (maxRows[0].m || 0) + 1;

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
        Market,
      ],
    );
    return res.json({ success: true, message: "Price added successfully!" });
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Server error", error: err.message });
  }
};

const updatePrice = async (req, res) => {
  if (!canModify(req.user?.role))
    return res.status(403).json({ message: "Not authorized" });

  const sno = parseInt(req.params.sno, 10);
  let { Description, Leadtime, DeliveryTerm, SPL_Cond, Remarks } = req.body;

  Description = Description?.trim()
    ? Description.trim().substring(0, 52)
    : null;
  Leadtime = Leadtime?.trim() ? Leadtime.trim().substring(0, 8) : null;
  DeliveryTerm = DeliveryTerm?.trim()
    ? DeliveryTerm.trim().substring(0, 17)
    : null;
  SPL_Cond = SPL_Cond?.trim() ? SPL_Cond.trim().substring(0, 10) : null;
  Remarks = Remarks?.trim() ? Remarks.trim().substring(0, 10) : null;

  try {
    const [rows] = await db.execute("SELECT status FROM price WHERE Sno = ?", [
      sno,
    ]);
    if (rows.length === 0)
      return res.status(404).json({ message: "Record not found" });
    if (rows[0].status !== "Active")
      return res
        .status(400)
        .json({ message: "Inactive records cannot be edited" });

    await db.execute(
      `UPDATE price SET Description = ?, Leadtime = ?, DeliveryTerm = ?, SPL_Cond = ?, Remarks = ? WHERE Sno = ?`,
      [Description, Leadtime, DeliveryTerm, SPL_Cond, Remarks, sno],
    );
    return res.json({ success: true, message: "Price updated successfully!" });
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Server error", error: err.message });
  }
};

const togglePriceStatus = async (req, res) => {
  if (!canModify(req.user?.role))
    return res.status(403).json({ message: "Not authorized" });

  const sno = parseInt(req.params.sno, 10);
  try {
    const [rows] = await db.execute("SELECT status FROM price WHERE Sno = ?", [
      sno,
    ]);
    if (rows.length === 0)
      return res.status(404).json({ message: "Not found" });
    const next = rows[0].status === "Active" ? "Inactive" : "Active";
    await db.execute("UPDATE price SET status = ? WHERE Sno = ?", [next, sno]);
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
    const fields = [
      "Sno",
      "LTSA_Code",
      "Customer_partno",
      "Cfti_partno",
      "Description",
      "ListPrice",
      "Start_Date",
      "Exp_Date",
      "Curr",
      "Leadtime",
      "DeliveryTerm",
      "SPL_Cond",
      "Remarks",
      "Product",
      "Market",
      "status",
    ];
    res.header("Content-Type", "text/csv");
    res.header(
      "Content-Disposition",
      'attachment; filename="standard_price.csv"',
    );
    return res.send(toCSV(fields, rows));
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Download failed", error: err.message });
  }
};

/* ── Standard Template ── */
const downloadStandardTemplate = (req, res) => {
  const fields = [
    "LTSA_Code",
    "Customer_partno",
    "Cfti_partno",
    "Description",
    "ListPrice",
    "Start_Date",
    "Exp_Date",
    "Curr",
    "Leadtime",
    "DeliveryTerm",
    "SPL_Cond",
    "Remarks",
    "Product",
    "Market",
    "status",
  ];
  res.header("Content-Type", "text/csv");
  res.header(
    "Content-Disposition",
    'attachment; filename="standard_price_template.csv"',
  );
  return res.send(fields.join(",") + "\n");
};

/* ── Standard Upload ── */
const uploadStandardPrices = async (req, res) => {
  if (!canModify(req.user?.role))
    return res.status(403).json({ message: "Not authorized" });
  if (!req.file) return res.status(400).json({ message: "No file uploaded" });

  try {
    const wb = XLSX.read(req.file.buffer, { type: "buffer", cellDates: true });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rawRows = XLSX.utils.sheet_to_json(ws, { defval: "" });

    if (rawRows.length === 0)
      return res.json({
        success: true,
        total: 0,
        inserted: 0,
        failed: 0,
        errors: [],
      });

    /* Fetch valid products from DB (skip check if table empty) */
    const [productRows] = await db.execute(
      `SELECT DISTINCT UPPER(TRIM(Product)) AS p FROM price WHERE Product IS NOT NULL AND Product <> ''`,
    );
    const validProducts = new Set(productRows.map((r) => r.p));

    const todayStr = new Date().toISOString().substring(0, 10);
    const jan1Str = `${new Date().getFullYear()}-01-01`;

    const rowErrors = [];
    const validRows = [];

    rawRows.forEach((raw, idx) => {
      const rowNum = idx + 2;
      const errs = [];

      const ltsaCode = String(raw.LTSA_Code || "").trim();
      const custPN = String(raw.Customer_partno || "")
        .trim()
        .toUpperCase();
      const cftiPN = String(raw.Cfti_partno || "")
        .trim()
        .toUpperCase();
      const desc = String(raw.Description || "").trim();
      const startStr = toDateStr(raw.Start_Date);
      const expStr = toDateStr(raw.Exp_Date);
      const curr = String(raw.Curr || "")
        .trim()
        .toUpperCase();
      const leadtime = String(raw.Leadtime || "").trim();
      const delivTerm = String(raw.DeliveryTerm || "").trim();
      const splCond = String(raw.SPL_Cond || "").trim();
      const remarks = String(raw.Remarks || "").trim();
      const product = String(raw.Product || "")
        .trim()
        .toUpperCase();
      const market = String(raw.Market || "")
        .trim()
        .toUpperCase();
      const status = String(raw.status || "Active").trim();

      /* ── Validations ── */
      if (ltsaCode && ltsaCode.length !== 9)
        errs.push(`LTSA_Code must be exactly 9 chars (got ${ltsaCode.length})`);

      if (custPN.length < 8 || custPN.length > 10)
        errs.push(
          `Customer_partno must be 8–10 chars (got ${custPN.length || 0})`,
        );

      if (cftiPN.length < 6 || cftiPN.length > 20)
        errs.push(`Cfti_partno must be 6–20 chars (got ${cftiPN.length || 0})`);

      if (desc.length > 52)
        errs.push(`Description exceeds 52 chars (got ${desc.length})`);

      const listPrice = parseFloat(raw.ListPrice);
      if (isNaN(listPrice) || listPrice <= 0)
        errs.push("ListPrice must be a number > 0");

      if (!startStr)
        errs.push("Start_Date is required and must be a valid date");
      else if (startStr < jan1Str)
        errs.push(
          `Start_Date must be ≥ Jan 1 ${new Date().getFullYear()} (got ${startStr})`,
        );

      if (!expStr) errs.push("Exp_Date is required and must be a valid date");
      else if (expStr <= todayStr)
        errs.push(`Exp_Date must be > today ${todayStr} (got ${expStr})`);

      if (!curr || curr.length > 3)
        errs.push("Curr is required and must be ≤ 3 chars");

      if (!leadtime || leadtime.length > 8)
        errs.push("Leadtime is required and must be ≤ 8 chars");

      if (!delivTerm || delivTerm.length > 17)
        errs.push("DeliveryTerm is required and must be ≤ 17 chars");

      if (splCond.length > 10) errs.push("SPL_Cond must be ≤ 10 chars");

      if (remarks.length > 10) errs.push("Remarks must be ≤ 10 chars");

      if (!product) errs.push("Product is required");
      else if (product.length > 15) errs.push("Product must be ≤ 15 chars");
      else if (validProducts.size > 0 && !validProducts.has(product))
        errs.push(`Product "${product}" not found in DB`);

      if (!["FM", "AM"].includes(market)) errs.push("Market must be FM or AM");

      if (!["Active", "Inactive"].includes(status))
        errs.push("status must be Active or Inactive");

      if (errs.length > 0) {
        rowErrors.push({ row: rowNum, errors: errs });
      } else {
        validRows.push({
          ltsaCode: ltsaCode || "DEFAULT00",
          custPN,
          cftiPN,
          desc: desc || null,
          listPrice,
          startStr,
          expStr,
          curr,
          leadtime,
          delivTerm,
          splCond: splCond || null,
          remarks: remarks || null,
          product,
          market,
          status,
        });
      }
    });

    /* ── Insert valid rows ── */
    let inserted = 0;
    const dbErrors = [];

    for (const row of validRows) {
      try {
        const [maxRows] = await db.execute("SELECT MAX(Sno) AS m FROM price");
        const nextSno = (maxRows[0].m || 0) + 1;
        await db.execute(
          `INSERT INTO price
             (Sno, LTSA_Code, Customer_partno, Cfti_partno, Description,
              ListPrice, Start_Date, Exp_Date, Curr, Leadtime, DeliveryTerm,
              SPL_Cond, Remarks, Product, Market, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            nextSno,
            row.ltsaCode,
            row.custPN,
            row.cftiPN,
            row.desc,
            row.listPrice,
            row.startStr,
            row.expStr,
            row.curr,
            row.leadtime,
            row.delivTerm,
            row.splCond,
            row.remarks,
            row.product,
            row.market,
            row.status,
          ],
        );
        inserted++;
      } catch (err) {
        dbErrors.push({ row: "—", errors: [`DB error: ${err.message}`] });
      }
    }

    return res.json({
      success: true,
      total: rawRows.length,
      inserted,
      failed: rowErrors.length + dbErrors.length,
      errors: [...rowErrors, ...dbErrors],
    });
  } catch (err) {
    console.error("Standard upload error:", err);
    return res
      .status(500)
      .json({ message: "Upload failed", error: err.message });
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
    return res
      .status(500)
      .json({ message: "Server error", error: err.message });
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
    let nextCode = "LTSA_GE_00";
    if (rows.length > 0) {
      const match = rows[0].LTSA_Code.match(/LTSA_GE_(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10) + 1;
        nextCode = `LTSA_GE_${String(num).padStart(2, "0")}`;
      }
    }
    return res.json({ nextCode });
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Server error", error: err.message });
  }
};

const checkLtsaCodeExists = async (req, res) => {
  const { ltsaCode, sno } = req.query;
  const excludeSno = sno ? parseInt(sno, 10) : null;
  try {
    let q = `SELECT Sno FROM ltsa_price WHERE LTSA_Code = ?`;
    const p = [ltsaCode];
    if (excludeSno) {
      q += " AND Sno <> ?";
      p.push(excludeSno);
    }
    const [rows] = await db.execute(q, p);
    if (rows.length > 0)
      return res.json({ exists: true, message: "LTSA Code already exists." });
    return res.json({ exists: false });
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Server error", error: err.message });
  }
};

const createLtsaPrice = async (req, res) => {
  if (!canModify(req.user?.role))
    return res.status(403).json({ message: "Not authorized" });

  let {
    LTSA_Code,
    Customer_partno,
    Cfti_partno,
    Description,
    SplPrice,
    Start_Date,
    Exp_Date,
    Curr,
    Leadtime,
    DeliveryTerm,
    Product,
    Market,
  } = req.body;

  const missing = [];
  if (!LTSA_Code) missing.push("LTSA_Code");
  if (!Customer_partno) missing.push("Customer_partno");
  if (!Cfti_partno) missing.push("Cfti_partno");
  if (!SplPrice) missing.push("SplPrice");
  if (!Curr) missing.push("Curr");
  if (!Leadtime) missing.push("Leadtime");
  if (!DeliveryTerm) missing.push("DeliveryTerm");
  if (!Product) missing.push("Product");
  if (!Market) missing.push("Market");
  if (missing.length > 0)
    return res
      .status(400)
      .json({ message: `Missing required fields: ${missing.join(", ")}` });

  try {
    const [existing] = await db.execute(
      `SELECT Sno FROM ltsa_price WHERE LTSA_Code = ?`,
      [LTSA_Code],
    );
    if (existing.length > 0)
      return res.status(400).json({ message: "LTSA Code already exists." });

    LTSA_Code = String(LTSA_Code).trim().toUpperCase();
    Customer_partno = String(Customer_partno)
      .trim()
      .toUpperCase()
      .substring(0, 36);
    Cfti_partno = String(Cfti_partno).trim().toUpperCase().substring(0, 18);
    Description = Description?.trim()
      ? Description.trim().substring(0, 44)
      : null;
    Product = String(Product).trim().toUpperCase().substring(0, 3);
    Market = String(Market).trim().toUpperCase().substring(0, 2);
    Curr = String(Curr).trim().toUpperCase().substring(0, 3);
    Leadtime = String(Leadtime).trim().substring(0, 15);
    DeliveryTerm = String(DeliveryTerm).trim().substring(0, 16);
    Start_Date =
      Start_Date && String(Start_Date).trim()
        ? String(Start_Date).trim()
        : null;
    Exp_Date =
      Exp_Date && String(Exp_Date).trim() ? String(Exp_Date).trim() : null;

    const splPrice = parseFloat(SplPrice);
    if (isNaN(splPrice))
      return res
        .status(400)
        .json({ message: "SplPrice must be a valid number" });

    const [maxRows] = await db.execute("SELECT MAX(Sno) AS m FROM ltsa_price");
    const nextSno = (maxRows[0].m || 0) + 1;

    await db.execute(
      `INSERT INTO ltsa_price
         (Sno, LTSA_Code, Customer_partno, Cfti_partno, Description,
          SplPrice, Start_Date, Exp_Date, Curr, Leadtime, DeliveryTerm,
          Product, Market, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active')`,
      [
        nextSno,
        LTSA_Code,
        Customer_partno,
        Cfti_partno,
        Description,
        splPrice,
        Start_Date,
        Exp_Date,
        Curr,
        Leadtime,
        DeliveryTerm,
        Product,
        Market,
      ],
    );
    return res.json({
      success: true,
      message: "LTSA Price added successfully!",
    });
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Server error", error: err.message });
  }
};

const updateLtsaPrice = async (req, res) => {
  if (!canModify(req.user?.role))
    return res.status(403).json({ message: "Not authorized" });

  const sno = parseInt(req.params.sno, 10);
  let { Leadtime, DeliveryTerm } = req.body;

  Leadtime = Leadtime?.trim() ? Leadtime.trim().substring(0, 15) : null;
  DeliveryTerm = DeliveryTerm?.trim()
    ? DeliveryTerm.trim().substring(0, 16)
    : null;

  try {
    const [rows] = await db.execute(
      "SELECT status FROM ltsa_price WHERE Sno = ?",
      [sno],
    );
    if (rows.length === 0)
      return res.status(404).json({ message: "Record not found" });
    if (rows[0].status !== "Active")
      return res
        .status(400)
        .json({ message: "Inactive records cannot be edited" });

    await db.execute(
      `UPDATE ltsa_price SET Leadtime = ?, DeliveryTerm = ? WHERE Sno = ?`,
      [Leadtime, DeliveryTerm, sno],
    );
    return res.json({
      success: true,
      message: "LTSA Price updated successfully!",
    });
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Server error", error: err.message });
  }
};

const toggleLtsaPriceStatus = async (req, res) => {
  if (!canModify(req.user?.role))
    return res.status(403).json({ message: "Not authorized" });

  const sno = parseInt(req.params.sno, 10);
  try {
    const [rows] = await db.execute(
      "SELECT status FROM ltsa_price WHERE Sno = ?",
      [sno],
    );
    if (rows.length === 0)
      return res.status(404).json({ message: "Not found" });
    const next = rows[0].status === "Active" ? "Inactive" : "Active";
    await db.execute("UPDATE ltsa_price SET status = ? WHERE Sno = ?", [
      next,
      sno,
    ]);
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
    const fields = [
      "Sno",
      "LTSA_Code",
      "Customer_partno",
      "Cfti_partno",
      "Description",
      "SplPrice",
      "Start_Date",
      "Exp_Date",
      "Curr",
      "Leadtime",
      "DeliveryTerm",
      "Product",
      "Market",
      "status",
    ];
    res.header("Content-Type", "text/csv");
    res.header("Content-Disposition", 'attachment; filename="ltsa_price.csv"');
    return res.send(toCSV(fields, rows));
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Download failed", error: err.message });
  }
};

/* ── LTSA Template ── */
const downloadLtsaTemplate = (req, res) => {
  const fields = [
    "LTSA_Code",
    "Customer_partno",
    "Cfti_partno",
    "Description",
    "SplPrice",
    "Start_Date",
    "Exp_Date",
    "Curr",
    "Leadtime",
    "DeliveryTerm",
    "Product",
    "Market",
    "status",
  ];
  res.header("Content-Type", "text/csv");
  res.header(
    "Content-Disposition",
    'attachment; filename="ltsa_price_template.csv"',
  );
  return res.send(fields.join(",") + "\n");
};

/* ── LTSA Upload ── */
const uploadLtsaPrices = async (req, res) => {
  if (!canModify(req.user?.role))
    return res.status(403).json({ message: "Not authorized" });
  if (!req.file) return res.status(400).json({ message: "No file uploaded" });

  try {
    const wb = XLSX.read(req.file.buffer, { type: "buffer", cellDates: true });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rawRows = XLSX.utils.sheet_to_json(ws, { defval: "" });

    if (rawRows.length === 0)
      return res.json({
        success: true,
        total: 0,
        inserted: 0,
        failed: 0,
        errors: [],
      });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().substring(0, 10);
    const jan1Str = `${today.getFullYear()}-01-01`;
    const dec31Str = `${today.getFullYear()}-12-31`;

    const rowErrors = [];
    const validRows = [];

    rawRows.forEach((raw, idx) => {
      const rowNum = idx + 2;
      const errs = [];

      const ltsaCode = String(raw.LTSA_Code || "")
        .trim()
        .toUpperCase();
      const custPN = String(raw.Customer_partno || "")
        .trim()
        .toUpperCase();
      const cftiPN = String(raw.Cfti_partno || "")
        .trim()
        .toUpperCase();
      const desc = String(raw.Description || "").trim();
      const startStr = toDateStr(raw.Start_Date);
      const expStr = toDateStr(raw.Exp_Date);
      const curr = String(raw.Curr || "")
        .trim()
        .toUpperCase();
      const leadtime = String(raw.Leadtime || "").trim();
      const delivTerm = String(raw.DeliveryTerm || "").trim();
      const product = String(raw.Product || "")
        .trim()
        .toUpperCase();
      const market = String(raw.Market || "")
        .trim()
        .toUpperCase();
      const status = String(raw.status || "Active").trim();

      /* ── Validations ── */
      if (!ltsaCode || ltsaCode.length !== 9)
        errs.push(
          `LTSA_Code must be exactly 9 chars (got "${ltsaCode}", length ${ltsaCode.length})`,
        );

      if (custPN.length < 8 || custPN.length > 36)
        errs.push(
          `Customer_partno must be 8–36 chars (got ${custPN.length || 0})`,
        );

      if (cftiPN.length < 6 || cftiPN.length > 18)
        errs.push(`Cfti_partno must be 6–18 chars (got ${cftiPN.length || 0})`);

      if (desc.length > 44)
        errs.push(`Description exceeds 44 chars (got ${desc.length})`);

      const splPriceNum = Number(raw.SplPrice);
      if (
        !Number.isInteger(splPriceNum) ||
        splPriceNum <= 0 ||
        splPriceNum > 99999
      )
        errs.push("SplPrice must be a positive integer ≤ 99999");

      if (!startStr)
        errs.push("Start_Date is required and must be a valid date");
      else if (startStr < jan1Str)
        errs.push(
          `Start_Date must be ≥ Jan 1 ${today.getFullYear()} (got ${startStr})`,
        );

      if (!expStr) errs.push("Exp_Date is required and must be a valid date");
      else if (expStr <= todayStr)
        errs.push(`Exp_Date must be > today ${todayStr} (got ${expStr})`);
      else if (expStr > dec31Str)
        errs.push(
          `Exp_Date must be ≤ Dec 31 ${today.getFullYear()} (got ${expStr})`,
        );

      if (!curr || curr.length > 3)
        errs.push("Curr is required and must be ≤ 3 chars");

      if (leadtime.length > 15) errs.push("Leadtime must be ≤ 15 chars");

      if (delivTerm.length > 16) errs.push("DeliveryTerm must be ≤ 16 chars");

      if (!product || product.length > 3)
        errs.push("Product is required and must be ≤ 3 chars");

      if (!["FM", "AM"].includes(market)) errs.push("Market must be FM or AM");

      if (!["Active", "Inactive"].includes(status))
        errs.push("status must be Active or Inactive");

      if (errs.length > 0) {
        rowErrors.push({ row: rowNum, errors: errs });
      } else {
        validRows.push({
          ltsaCode,
          custPN,
          cftiPN,
          desc: desc || null,
          splPrice: splPriceNum,
          startStr,
          expStr,
          curr,
          leadtime,
          delivTerm,
          product,
          market,
          status,
        });
      }
    });

    /* ── Insert valid rows ── */
    let inserted = 0;
    const dbErrors = [];

    for (const row of validRows) {
      try {
        const [existing] = await db.execute(
          "SELECT Sno FROM ltsa_price WHERE LTSA_Code = ?",
          [row.ltsaCode],
        );
        if (existing.length > 0) {
          dbErrors.push({
            row: `LTSA:${row.ltsaCode}`,
            errors: [`LTSA_Code "${row.ltsaCode}" already exists in DB`],
          });
          continue;
        }
        const [maxRows] = await db.execute(
          "SELECT MAX(Sno) AS m FROM ltsa_price",
        );
        const nextSno = (maxRows[0].m || 0) + 1;
        await db.execute(
          `INSERT INTO ltsa_price
             (Sno, LTSA_Code, Customer_partno, Cfti_partno, Description,
              SplPrice, Start_Date, Exp_Date, Curr, Leadtime, DeliveryTerm,
              Product, Market, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            nextSno,
            row.ltsaCode,
            row.custPN,
            row.cftiPN,
            row.desc,
            row.splPrice,
            row.startStr,
            row.expStr,
            row.curr,
            row.leadtime,
            row.delivTerm,
            row.product,
            row.market,
            row.status,
          ],
        );
        inserted++;
      } catch (err) {
        dbErrors.push({
          row: `LTSA:${row.ltsaCode}`,
          errors: [`DB error: ${err.message}`],
        });
      }
    }

    return res.json({
      success: true,
      total: rawRows.length,
      inserted,
      failed: rowErrors.length + dbErrors.length,
      errors: [...rowErrors, ...dbErrors],
    });
  } catch (err) {
    console.error("LTSA upload error:", err);
    return res
      .status(500)
      .json({ message: "Upload failed", error: err.message });
  }
};

module.exports = {
  listPrices,
  createPrice,
  updatePrice,
  togglePriceStatus,
  downloadPrices,
  downloadStandardTemplate,
  uploadStandardPrices,
  listLtsaPrices,
  createLtsaPrice,
  updateLtsaPrice,
  toggleLtsaPriceStatus,
  downloadLtsaPrices,
  downloadLtsaTemplate,
  uploadLtsaPrices,
  getNextLtsaCode,
  checkLtsaCodeExists,
};
