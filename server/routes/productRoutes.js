
import express from "express";
import mongoose from "mongoose";
import Product from "../models/Product.js";
import Supplier from "../models/Supplier.js";
import Lot from "../models/Lot.js";
import ActivityLog from "../models/ActivityLog.js";

const router = express.Router();

// ======================================
// ACTIVITY LOG HELPER
// ======================================
async function createProductActivity({
  req,
  action,
  description,
  product,
  metadata = {},
}) {
  try {
    await ActivityLog.create({
      adminId: req.admin?.adminId || null,
      adminName: req.admin?.name || "",
      adminUsername: req.admin?.username || "",
      action,
      module: "PRODUCT",
      description,
      targetId: product?._id || null,
      targetName: product?.productName || "",
      metadata,
    });
  } catch (error) {
    console.error("Product Activity Log Error:", error.message);
  }
}

// ======================================
// PRODUCT ACTIVITY FIELDS
// ======================================
const activityFields = [
  "productName",
  "category",
  "subcategory",
  "brand",
  "stockType",
  "supplier",
  "packingType",
  "unit",
  "purchasePrice",
  "salePrice",
  "minimumStockKg",
  "description",
  "isActive",
];

function getProductValues(product) {
  const values = {};

  activityFields.forEach((field) => {
    let value = product[field];

    if (field === "supplier") {
      value = value?._id || value || null;
      value = value ? value.toString() : null;
    }

    values[field] = value ?? null;
  });

  return values;
}

// ======================================
// ADD PRODUCT + AUTOMATICALLY CREATE PENDING LOT
// ======================================
router.post("/", async (req, res) => {
  let createdProduct = null;
  let createdLot = null;

  try {
    const {
      productName,
      category,
      subcategory,
      brand,
      stockType,
      supplier,
      packingType,
      unit,
      purchasePrice,
      salePrice,
      minimumStockKg,
      description,
    } = req.body;

    if (!productName?.trim() || !category?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Product name and category are required",
      });
    }

    if (supplier) {
      if (!mongoose.isValidObjectId(supplier)) {
        return res.status(400).json({
          success: false,
          message: "Invalid supplier ID",
        });
      }

      const supplierExists = await Supplier.exists({
        _id: supplier,
        isActive: true,
      });

      if (!supplierExists) {
        return res.status(400).json({
          success: false,
          message: "Supplier not found or inactive",
        });
      }
    }

    // Create Product
    createdProduct = await Product.create({
      productName,
      category,
      subcategory,
      brand,
      stockType,
      supplier: supplier || null,
      packingType,
      unit,
      purchasePrice,
      salePrice,
      minimumStockKg,
      description,
      purchaseStatus: "PENDING",
    });

    // Create Pending Lot
    createdLot = await Lot.create({
      lotCode: createdProduct.lotCode,
      productId: createdProduct._id,
      productName: createdProduct.productName,
      categoryName: createdProduct.category,
      subcategoryName: createdProduct.subcategory || "",
      supplierId: createdProduct.supplier || null,
      stockType: createdProduct.stockType || "OWN",

      purchaseDate: null,
      bagsReceived: 0,
      totalWeightKg: 0,
      purchasePricePerKg: 0,
      totalPurchaseAmount: 0,

      remainingBags: 0,
      remainingWeightKg: 0,

      status: "PENDING",
    });

    // Product Create Activity
    await createProductActivity({
      req,
      action: "PRODUCT_CREATE",
      description: `New Product created - ${createdProduct.productName}`,
      product: createdProduct,
      metadata: {
        lotCode: createdProduct.lotCode,
        newValues: getProductValues(createdProduct),
      },
    });

    res.status(201).json({
      success: true,
      message: "Product and Pending Lot created successfully",
      product: createdProduct,
      lot: createdLot,
    });
  } catch (error) {
    // Rollback Pending Lot
    if (createdLot?._id) {
      await Lot.findByIdAndDelete(createdLot._id).catch(() => {});
    }

    // Rollback Product
    if (createdProduct?._id) {
      await Product.findByIdAndDelete(createdProduct._id).catch(() => {});
    }

    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

// ======================================
// GET ALL PRODUCTS WITH PURCHASE STATUS
// ======================================
router.get("/", async (req, res) => {
  try {
    const products = await Product.find()
      .populate("supplier", "supplierName mobile")
      .sort({ createdAt: -1 });

    const productIds = products.map((product) => product._id);

    const lots = await Lot.find({
      productId: { $in: productIds },
    }).select("productId status");

    const lotsByProduct = new Map();

    lots.forEach((lot) => {
      const productId = lot.productId.toString();

      if (!lotsByProduct.has(productId)) {
        lotsByProduct.set(productId, []);
      }

      lotsByProduct.get(productId).push(lot);
    });

    const updatedProducts = products.map((product) => {
      const productLots =
        lotsByProduct.get(product._id.toString()) || [];

      const hasPurchasedLot = productLots.some((lot) =>
        ["ACTIVE", "COMPLETED"].includes(lot.status)
      );

      const hasPendingLot = productLots.some(
        (lot) => lot.status === "PENDING"
      );

      let purchaseStatus = "NO_LOT";

      if (hasPurchasedLot) {
        purchaseStatus = "PURCHASED";
      } else if (hasPendingLot) {
        purchaseStatus = "PENDING";
      }

      return {
        ...product.toObject(),
        purchaseStatus,
      };
    });

    res.json({
      success: true,
      count: updatedProducts.length,
      products: updatedProducts,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ======================================
// GET SINGLE PRODUCT
// ======================================
router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate("supplier", "supplierName mobile");

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    res.json({
      success: true,
      product,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Invalid product ID",
    });
  }
});

// ======================================
// UPDATE PRODUCT
// ======================================
router.put("/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID",
      });
    }

    const existingProduct = await Product.findById(req.params.id);

    if (!existingProduct) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Previous values before update
    const oldValues = getProductValues(existingProduct);

    const updates = { ...req.body };

    // Protected fields
    delete updates.lotCode;
    delete updates.purchaseStatus;
    delete updates.currentStockKg;
    delete updates.currentStockBags;

    if (updates.supplier) {
      if (!mongoose.isValidObjectId(updates.supplier)) {
        return res.status(400).json({
          success: false,
          message: "Invalid supplier ID",
        });
      }

      const supplierExists = await Supplier.exists({
        _id: updates.supplier,
        isActive: true,
      });

      if (!supplierExists) {
        return res.status(400).json({
          success: false,
          message: "Supplier not found or inactive",
        });
      }
    }

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      updates,
      {
        returnDocument: "after",
        runValidators: true,
      }
    ).populate("supplier", "supplierName mobile");

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Keep Pending Lot information synchronized
    await Lot.findOneAndUpdate(
      {
        productId: product._id,
        status: "PENDING",
      },
      {
        productName: product.productName,
        categoryName: product.category,
        subcategoryName: product.subcategory || "",
        supplierId: product.supplier?._id || product.supplier || null,
        stockType: product.stockType || "OWN",
      },
      {
        returnDocument: "after",
        runValidators: true,
      }
    );

    // Updated values
    const newValues = getProductValues(product);

    // Only keep changed fields in comparison
    const changedOldValues = {};
    const changedNewValues = {};

    activityFields.forEach((field) => {
      const oldValue = oldValues[field];
      const newValue = newValues[field];

      if (String(oldValue ?? "") !== String(newValue ?? "")) {
        changedOldValues[field] = oldValue;
        changedNewValues[field] = newValue;
      }
    });

    // Product Edit Activity
    if (Object.keys(changedNewValues).length > 0) {
      await createProductActivity({
        req,
        action: "PRODUCT_EDIT",
        description: `Product updated - ${product.productName}`,
        product,
        metadata: {
          oldValues: changedOldValues,
          newValues: changedNewValues,
        },
      });
    }

    res.json({
      success: true,
      message: "Product updated successfully",
      product,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

// ======================================
// DELETE / DEACTIVATE PRODUCT
// ======================================
router.delete("/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID",
      });
    }

    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const oldValues = getProductValues(product);

    // Check purchase history
    const hasPurchaseHistory = await Lot.exists({
      productId: product._id,
      status: { $in: ["ACTIVE", "COMPLETED", "CANCELLED"] },
    });

    // Check current stock
    const hasStock =
      Number(product.currentStockKg || 0) > 0 ||
      Number(product.currentStockBags || 0) > 0;

    // Deactivate if history or stock exists
    if (hasPurchaseHistory || hasStock) {
      product.isActive = false;
      await product.save();

      await createProductActivity({
        req,
        action: "PRODUCT_DEACTIVATE",
        description: `Product deactivated - ${product.productName}`,
        product,
        metadata: {
          oldValues,
          newValues: getProductValues(product),
          reason: hasPurchaseHistory
            ? "Product has purchase history"
            : "Product has remaining stock",
        },
      });

      return res.status(200).json({
        success: true,
        action: "deactivated",
        message:
          "Product has purchase history or stock. It was deactivated to protect your records.",
      });
    }

    // Delete only unused Pending Lots
    await Lot.deleteMany({
      productId: product._id,
      status: "PENDING",
    });

    // Product Delete Activity
    await createProductActivity({
      req,
      action: "PRODUCT_DELETE",
      description: `Product permanently deleted - ${product.productName}`,
      product,
      metadata: {
        oldValues,
        lotCode: product.lotCode,
      },
    });

    // Permanently delete Product
    await Product.findByIdAndDelete(product._id);

    return res.status(200).json({
      success: true,
      action: "deleted",
      message: "Product and its pending lot permanently deleted.",
    });
  } catch (error) {
    console.error("Delete Product Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to delete product",
    });
  }
});

export default router;
