
import dns from "node:dns";

// IMPORTANT: Configure DNS before loading Mongoose
dns.setServers(["8.8.8.8", "8.8.4.4"]);

import customerRoutes from "./routes/customerRoutes.js";
import supplierRoutes from "./routes/supplierRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import lotRoutes from "./routes/lotRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import requireAdmin from "./middleware/requireAdmin.js";
import activityRoutes from "./routes/activityRoutes.js";
import salesRoutes from "./routes/salesRoutes.js";
import salesReturnRoutes from "./routes/salesReturnRoutes.js";
import commissionRoutes from "./routes/commissionRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import stockOutRoutes from "./routes/stockOutRoutes.js";
import accountRoutes from "./routes/accountRoutes.js";
import loanProviderRoutes from "./routes/loanProviderRoutes.js";
import loanRoutes from "./routes/loanRoutes.js";
import loanStatementRoutes from "./routes/loanStatementRoutes.js";


// Load packages only after DNS configuration
const express = (await import("express")).default;
const cors = (await import("cors")).default;
const dotenv = (await import("dotenv")).default;
const cookieParser = (await import("cookie-parser")).default;
const mongoose = (await import("mongoose")).default;

dotenv.config();

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Authentication Routes
app.use("/api/auth", authRoutes);

// Existing API Routes
app.use("/api/customers", requireAdmin, customerRoutes);
app.use("/api/suppliers", requireAdmin, supplierRoutes);
app.use("/api/products", requireAdmin, productRoutes);
app.use("/api/categories", requireAdmin, categoryRoutes);
app.use("/api/lots", requireAdmin, lotRoutes);
app.use("/api/activities", requireAdmin, activityRoutes);
app.use("/api/sales", requireAdmin, salesRoutes);
app.use("/api/sales-returns", requireAdmin, salesReturnRoutes);
app.use("/api/commission", requireAdmin, commissionRoutes);
app.use("/api/reports", requireAdmin, reportRoutes);
app.use("/api/stock-outs", requireAdmin, stockOutRoutes);
app.use("/api/loans/providers", requireAdmin, loanProviderRoutes);
app.use("/api/loans", requireAdmin, loanRoutes);
app.use("/api/loans", requireAdmin, loanStatementRoutes);
// Accounting Routes
app.use("/api/accounts", requireAdmin, accountRoutes);

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Universal ERP API is running",
  });
});

const PORT = process.env.PORT || 5000;

try {
  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 15000,
  });

  console.log("MongoDB Atlas Connected Successfully");

  app.listen(PORT, () => {
    console.log(`ERP Server running on port ${PORT}`);
  });
} catch (error) {
  console.log("\n===== MONGODB CONNECTION DETAILS =====");
  console.log("Main Error:", error.message);

  const topology = error.reason || error.cause;
  const servers = topology?.servers;

  if (servers instanceof Map) {
    for (const [address, server] of servers) {
      console.log("\nServer:", address);
      console.log("Server Type:", server.type);
      console.log("Server Error:", server.error?.message || "No error details");
    }
  }

  console.log("======================================");
  process.exit(1);
}
