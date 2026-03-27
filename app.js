const express = require("express");
const cors = require("cors");
require("dotenv").config();

const authRoutes = require("./routes/authRoutes");
const deptUsersRoutes = require('./routes/deptUsersRoutes');
const salesContactRoutes = require('./routes/salesContactRoutes');
const customerRoutes = require('./routes/customerRoutes');
const buyerRoutes = require('./routes/buyerRoutes');


const app = express();

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  }),
);

app.use(express.json());

app.use("/api/auth", authRoutes);
app.use('/api/dept-users', deptUsersRoutes);
app.use('/api/sales-contacts', salesContactRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/buyers', buyerRoutes);



const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
