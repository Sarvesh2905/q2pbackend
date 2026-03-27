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
const spclDiscountRoutes = require("./routes/spclDiscountRoutes");
const endIndustryRoutes = require("./routes/endIndustryRoutes");
const customerTypeRoutes = require("./routes/customerTypeRoutes");
const statusMasterRoutes = require("./routes/statusMasterRoutes");
const reasonRoutes = require("./routes/reasonRoutes");
const timelineTargetRoutes = require("./routes/timelineTargetRoutes");
const costPriceRoutes = require("./routes/costPriceRoutes");
const enquiryRoutes = require("./routes/enquiryRoutes");


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
app.use("/api/spcl-discounts", spclDiscountRoutes);
app.use("/api/end-industries", endIndustryRoutes);
app.use("/api/customer-types", customerTypeRoutes);
app.use("/api/status-master", statusMasterRoutes);
app.use("/api/reasons", reasonRoutes);
app.use("/api/timeline-target", timelineTargetRoutes);
app.use("/api/cost-price", costPriceRoutes);
app.use("/api/enquiry", enquiryRoutes);


// ── Start server ───────────────────────────────────────
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
