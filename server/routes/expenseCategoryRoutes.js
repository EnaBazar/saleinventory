
import express from "express";
import mongoose from "mongoose";
import ExpenseCategory from "../models/ExpenseCategory.js";

const router = express.Router();

// GET: সব Expense Category
router.get("/", async (req, res) => {
  try {
    const filter = {};

    if (req.query.status === "active") {
      filter.isActive = true;
    } else if (req.query.status === "inactive") {
      filter.isActive = false;
    }

    const categories = await ExpenseCategory.find(filter)
      .sort({ name: 1 });

    res.status(200).json({
      success: true,
      total: categories.length,
      categories,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// POST: নতুন Expense Category
router.post("/", async (req, res) => {
  try {
    const { name, description = "" } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Expense category name is required",
      });
    }

    const cleanName = name.trim();
    const normalizedName = cleanName.toLowerCase();

    const existingCategory = await ExpenseCategory.findOne({
      normalizedName,
    });

    if (existingCategory) {
      return res.status(409).json({
        success: false,
        message: "এই Expense Category আগে থেকেই আছে",
      });
    }

    const category = await ExpenseCategory.create({
      name: cleanName,
      normalizedName,
      description: description.trim(),
      createdBy: {
        adminId: req.admin?.adminId || null,
        name: req.admin?.name || "",
        username: req.admin?.username || "",
      },
    });

    res.status(201).json({
      success: true,
      message: "Expense Category created successfully",
      category,
    });
  } catch (error) {
    res.status(error.code === 11000 ? 409 : 500).json({
      success: false,
      message:
        error.code === 11000
          ? "এই Expense Category আগে থেকেই আছে"
          : error.message,
    });
  }
});

// PUT: Expense Category Edit
router.put("/:id", async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid category ID",
      });
    }

    const category = await ExpenseCategory.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Expense Category not found",
      });
    }

    if (name !== undefined) {
      if (!name.trim()) {
        return res.status(400).json({
          success: false,
          message: "Expense category name cannot be empty",
        });
      }

      const cleanName = name.trim();
      const normalizedName = cleanName.toLowerCase();

      const duplicate = await ExpenseCategory.findOne({
        normalizedName,
        _id: { $ne: category._id },
      });

      if (duplicate) {
        return res.status(409).json({
          success: false,
          message: "এই Expense Category আগে থেকেই আছে",
        });
      }

      category.name = cleanName;
      category.normalizedName = normalizedName;
    }

    if (description !== undefined) {
      category.description = description.trim();
    }

    await category.save();

    res.status(200).json({
      success: true,
      message: "Expense Category updated successfully",
      category,
    });
  } catch (error) {
    res.status(error.code === 11000 ? 409 : 500).json({
      success: false,
      message:
        error.code === 11000
          ? "এই Expense Category আগে থেকেই আছে"
          : error.message,
    });
  }
});

// PATCH: Category Active / Inactive
router.patch("/:id/status", async (req, res) => {
  try {
    const { isActive } = req.body;

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid category ID",
      });
    }

    if (typeof isActive !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "isActive must be true or false",
      });
    }

    const category = await ExpenseCategory.findByIdAndUpdate(
      req.params.id,
      { isActive },
      { new: true, runValidators: true }
    );

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Expense Category not found",
      });
    }

    res.status(200).json({
      success: true,
      message: isActive
        ? "Expense Category activated successfully"
        : "Expense Category deactivated successfully",
      category,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

export default router;
