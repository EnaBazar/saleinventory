
import express from "express";
import mongoose from "mongoose";
import Lot from "../models/Lot.js";
import Product from "../models/Product.js";
import Supplier from "../models/Supplier.js";

const router = express.Router();

// ======================================
// CREATE PURCHASE / NEW LOT
// POST /api/purchases
// ======================================
router.post("/", async (req, res) => {
  try {
    const {
      productId,
      supplierId,
      purchaseDate,
      bagsReceived,
      totalWeightKg,
      purchasePricePerKg,
      notes,
    } = req.body;

    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        success: false,
        message: "Valid Product ID is required",
      });
    }

    if (
      totalWeightKg === undefined ||
      Number(totalWeightKg) <= 0 ||
      purchasePricePerKg === undefined ||
      Number(purchasePricePerKg) < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid total weight and purchase price are required",
      });
    }

    if (
      bagsReceived !== undefined &&
      (Number(bagsReceived) < 0 || !Number.isFinite(Number(bagsReceived)))
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid bag quantity",
      });
    }

    const product = await Product.findOne({
      _id: productId,
      isActive: true,
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found or inactive",
      });
    }

    let supplier = null;

    if (supplierId) {
      if (!mongoose.Types.ObjectId.isValid(supplierId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid Supplier ID",
        });
      }

      supplier = await Supplier.findOne({
        _id: supplierId,
        isActive: true,
      });

      if (!supplier) {
        return res.status(404).json({
          success: false,
          message: "Supplier not found or inactive",
        });
      }
    }

    const lot = new Lot({
      productId: product._id,
      productName: product.productName,
      productSku: product.sku || "",
      categoryName: product.category || "",
      subcategoryName: product.subcategory || "",

      supplierId: supplier ? supplier._id : null,

      stockType: product.stockType || "OWN",

      purchaseDate: purchaseDate || new Date(),
      bagsReceived: Number(bagsReceived || 0),
      totalWeightKg: Number(totalWeightKg),
      purchasePricePerKg: Number(purchasePricePerKg),

      notes: notes || "",
    });

    await lot.save();

    try {
      await Product.updateOne(
        { _id: product._id },
        {
          $inc: {
            currentStockKg: Number(totalWeightKg),
            currentStockBags: Number(bagsReceived || 0),
          },
        }
      );
    } catch (stockError) {
      await Lot.deleteOne({ _id: lot._id });
      throw stockError;
    }

    const savedLot = await Lot.findById(lot._id).populate(
      "supplierId",
      "supplierName mobile"
    );

    return res.status(201).json({
      success: true,
      message: "Purchase completed and new Lot created successfully",
      data: savedLot,
    });
  } catch (error) {
    console.error("Purchase Create Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create purchase",
    });
  }
});

// ======================================
// GET ALL PURCHASE LOTS
// GET /api/purchases
// ======================================
router.get("/", async (req, res) => {
  try {
    const lots = await Lot.find()
      .populate("productId", "productName sku")
      .populate("supplierId", "supplierName mobile")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: lots.length,
      data: lots,
    });
  } catch (error) {
    console.error("Purchase List Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch purchases",
    });
  }
});

// ======================================
// GET LOTS BY PRODUCT
// GET /api/purchases/product/:productId
// ======================================
router.get("/product/:productId", async (req, res) => {
  try {
    const { productId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Product ID",
      });
    }

    const lots = await Lot.find({ productId })
      .populate("supplierId", "supplierName mobile")
      .sort({ purchaseDate: -1 });

    return res.status(200).json({
      success: true,
      count: lots.length,
      data: lots,
    });
  } catch (error) {
    console.error("Product Lot Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch product lots",
    });
  }
});

// ======================================
// GET SINGLE LOT
// GET /api/purchases/:id
// ======================================
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Lot ID",
      });
    }

    const lot = await Lot.findById(id)
      .populate("productId", "productName sku")
      .populate("supplierId", "supplierName mobile");

    if (!lot) {
      return res.status(404).json({
        success: false,
        message: "Lot not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: lot,
    });
  } catch (error) {
    console.error("Single Lot Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch lot",
    });
  }
});

export default router;
