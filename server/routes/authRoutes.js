
import express from "express";
import jwt from "jsonwebtoken";
import Admin from "../models/Admin.js";
import requireAdmin from "../middleware/requireAdmin.js";

const router = express.Router();

const COOKIE_NAME = "adminToken";
const TOKEN_EXPIRES_IN = "12h";

function getCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 12 * 60 * 60 * 1000,
  };
}

// ======================================
// ADMIN LOGIN
// POST /api/auth/login
// ======================================
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: "Username এবং Password দিতে হবে",
      });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({
        success: false,
        message: "Server JWT configuration missing",
      });
    }

    const admin = await Admin.findOne({
      username: String(username).trim().toLowerCase(),
    }).select("+password");

    if (!admin || !admin.isActive) {
      return res.status(401).json({
        success: false,
        message: "Username অথবা Password সঠিক নয়",
      });
    }

    const passwordMatched = await admin.comparePassword(password);

    if (!passwordMatched) {
      return res.status(401).json({
        success: false,
        message: "Username অথবা Password সঠিক নয়",
      });
    }

    const token = jwt.sign(
      {
        adminId: admin._id.toString(),
      },
      process.env.JWT_SECRET,
      {
        expiresIn: TOKEN_EXPIRES_IN,
      }
    );

    admin.lastLogin = new Date();
    await admin.save();

    res.cookie(COOKIE_NAME, token, getCookieOptions());

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        admin: {
          id: admin._id,
          name: admin.name,
          username: admin.username,
          email: admin.email,
          role: admin.role,
        },
      },
    });
  } catch (error) {
    console.error("Admin Login Error:", error);

    return res.status(500).json({
      success: false,
      message: "Login করতে সমস্যা হয়েছে",
    });
  }
});



// ======================================
// CHECK ADMIN LOGIN
// GET /api/auth/me
// ======================================
router.get("/me", requireAdmin, (req, res) => {
  return res.status(200).json({
    success: true,
    data: {
      admin: {
        id: req.admin.adminId,
        name: req.admin.name,
        username: req.admin.username,
        role: req.admin.role,
      },
    },
  });
});

// ======================================
// ADMIN LOGOUT
// POST /api/auth/logout
// ======================================
router.post("/logout", (req, res) => {
  res.clearCookie(COOKIE_NAME, getCookieOptions());

  return res.status(200).json({
    success: true,
    message: "Logout successful",
  });
});

export default router;
