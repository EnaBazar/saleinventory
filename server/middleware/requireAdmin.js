
import jwt from "jsonwebtoken";
import Admin from "../models/Admin.js";

export default async function requireAdmin(req, res, next) {
  try {
    const token = req.cookies?.adminToken;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "প্রথমে Admin Login করুন",
      });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({
        success: false,
        message: "Server JWT configuration missing",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const admin = await Admin.findById(decoded.adminId);

    if (!admin || !admin.isActive) {
      return res.status(401).json({
        success: false,
        message: "Admin account পাওয়া যায়নি অথবা বন্ধ আছে",
      });
    }

    req.admin = {
      adminId: admin._id,
      name: admin.name,
      username: admin.username,
      role: admin.role,
    };

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Login session শেষ হয়েছে। আবার Login করুন",
    });
  }
}
