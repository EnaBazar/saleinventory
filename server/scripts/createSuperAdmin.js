
import dns from "node:dns";
dns.setServers(["8.8.8.8", "8.8.4.4"]);

import dotenv from "dotenv";
dotenv.config();

const mongoose = (await import("mongoose")).default;
const Admin = (await import("../models/Admin.js")).default;

async function createSuperAdmin() {
  try {
    const {
      SUPER_ADMIN_NAME,
      SUPER_ADMIN_USERNAME,
      SUPER_ADMIN_EMAIL,
      SUPER_ADMIN_PASSWORD,
    } = process.env;

    if (
      !SUPER_ADMIN_NAME ||
      !SUPER_ADMIN_USERNAME ||
      !SUPER_ADMIN_PASSWORD
    ) {
      throw new Error("Super Admin environment variables missing");
    }

    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI পাওয়া যায়নি");
    }

    await mongoose.connect(process.env.MONGODB_URI);

    const existingAdmin = await Admin.countDocuments();

    if (existingAdmin > 0) {
      console.log("Admin account already exists. Creation cancelled.");
      return;
    }

    const admin = await Admin.create({
      name: SUPER_ADMIN_NAME.trim(),
      username: SUPER_ADMIN_USERNAME.trim().toLowerCase(),
      email: SUPER_ADMIN_EMAIL?.trim().toLowerCase() || undefined,
      password: SUPER_ADMIN_PASSWORD,
      role: "SUPER_ADMIN",
      isActive: true,
    });

    console.log("Super Admin created successfully!");
    console.log("Username:", admin.username);
    console.log("Role:", admin.role);
  } catch (error) {
    console.error("Super Admin Creation Error:", error.message);
  } finally {
    await mongoose.disconnect();
  }
}

await createSuperAdmin();
