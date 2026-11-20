
import express from "express";
import Category from "../models/Category.js";

const router = express.Router();

// GET: সব Category দেখাবে
router.get("/", async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true })
      .sort({ productName: 1, categoryName: 1 });

    res.status(200).json({
      success: true,
      categories,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// GET: নির্দিষ্ট Product-এর Category দেখাবে
router.get("/product/:productName", async (req, res) => {
  try {
    const categories = await Category.find({
      productName: {
        $regex: `^${req.params.productName}$`,
        $options: "i",
      },
      isActive: true,
    }).sort({ categoryName: 1 });

    res.status(200).json({
      success: true,
      categories,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// POST: নতুন Category তৈরি
router.post("/", async (req, res) => {
  try {
    const { productName, categoryName } = req.body;

    if (!productName?.trim() || !categoryName?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Product Name and Category Name are required",
      });
    }

    const category = await Category.create({
      productName: productName.trim(),
      categoryName: categoryName.trim(),
    });

    res.status(201).json({
      success: true,
      message: "Category created successfully",
      category,
    });
  } catch (error) {
    res.status(error.code === 11000 ? 409 : 500).json({
      success: false,
      message:
        error.code === 11000
          ? "This category already exists for this product"
          : error.message,
    });
  }
});

// POST: Category-এর মধ্যে Subcategory তৈরি
router.post("/:id/subcategories", async (req, res) => {
  try {
    const { name } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Subcategory name is required",
      });
    }

    const category = await Category.findOne({
      _id: req.params.id,
      isActive: true,
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    const alreadyExists = category.subcategories.some(
      (item) =>
        item.name.toLowerCase() === name.trim().toLowerCase() &&
        item.isActive
    );

    if (alreadyExists) {
      return res.status(409).json({
        success: false,
        message: "This subcategory already exists",
      });
    }

    category.subcategories.push({ name: name.trim() });
    await category.save();

    res.status(201).json({
      success: true,
      message: "Subcategory created successfully",
      category,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// PUT: Category Edit
router.put("/:id", async (req, res) => {
  try {
    const { productName, categoryName } = req.body;

    const category = await Category.findByIdAndUpdate(
      req.params.id,
      {
        ...(productName !== undefined && { productName: productName.trim() }),
        ...(categoryName !== undefined && { categoryName: categoryName.trim() }),
      },
      { new: true, runValidators: true }
    );

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Category updated successfully",
      category,
    });
  } catch (error) {
    res.status(error.code === 11000 ? 409 : 500).json({
      success: false,
      message: error.message,
    });
  }
});

// PUT: Subcategory Edit
router.put("/:id/subcategories/:subId", async (req, res) => {
  try {
    const { name } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Subcategory name is required",
      });
    }

    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    const subcategory = category.subcategories.id(req.params.subId);

    if (!subcategory) {
      return res.status(404).json({
        success: false,
        message: "Subcategory not found",
      });
    }

    subcategory.name = name.trim();
    await category.save();

    res.status(200).json({
      success: true,
      message: "Subcategory updated successfully",
      category,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// DELETE: Category deactivate
router.delete("/:id", async (req, res) => {
  try {
    const category = await Category.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Category deactivated successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// DELETE: Subcategory deactivate
router.delete("/:id/subcategories/:subId", async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    const subcategory = category.subcategories.id(req.params.subId);

    if (!subcategory) {
      return res.status(404).json({
        success: false,
        message: "Subcategory not found",
      });
    }

    subcategory.isActive = false;
    await category.save();

    res.status(200).json({
      success: true,
      message: "Subcategory deactivated successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

export default router;
