const express = require("express");
const cors = require("cors");
require("dotenv").config();

// ── Route imports ──────────────────────────────────────
const authRoutes = require("./routes/authRoutes");
const deptUsersRoutes = require("./routes/deptUsersRoutes");
const salesContactRoutes = require("./routes/salesContactRoutes");
const customerRoutes = require("./routes/customerRoutes");
const buyerRoutes = require("./routes/buyerRoutes");
const countryRoutes = require("./routes/countryRoutes");
const productRoutes = require('./routes/productRoutes');
const priceRoutes = require('./routes/priceRoutes');
const geReferenceRoutes = require('./routes/geReferenceRoutes');
const discountRoutes = require('./routes/discountRoutes');




const app = express();

// ── Middleware ─────────────────────────────────────────
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  }),
);
app.use(express.json());

// ── Routes ─────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/dept-users", deptUsersRoutes);
app.use("/api/sales-contacts", salesContactRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/buyers", buyerRoutes);
app.use("/api/countries", countryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/prices', priceRoutes);
app.use('/api/ge-references', geReferenceRoutes);
app.use('/api/discounts', discountRoutes);

// ── Start server ───────────────────────────────────────
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
