
import express from "express";
import mongoose from "mongoose";
import { randomInt } from "node:crypto";

import StockOut from "../models/StockOut.js";
import Product from "../models/Product.js";
import Lot from "../models/Lot.js";
import ActivityLog from "../models/ActivityLog.js";

const router = express.Router();

// ========================================
// GENERATE STOCK OUT NUMBER
// ========================================

async function generateStockOutNumber() {
  let stockOutNumber;
  let exists = true;

  while (exists) {
    const date = new Date()
      .toISOString()
      .slice(0, 10)
      .replace(/-/g, "");

    stockOutNumber = `STO-${date}-${randomInt(100000, 1000000)}`;

    exists = await StockOut.exists({ stockOutNumber });
  }

  return stockOutNumber;
}

// ========================================
// CREATE STOCK OUT
// POST /api/stock-outs
// ========================================

router.post("/", async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const {
      transactionDate,
      items,
      reason,
      notes = "",
    } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one product is required",
      });
    }

    const stockOutReason = String(reason || "").trim();

    if (!stockOutReason) {
      return res.status(400).json({
        success: false,
        message: "Stock Out reason is required",
      });
    }

    const parsedDate = transactionDate
      ? new Date(transactionDate)
      : new Date();

    if (Number.isNaN(parsedDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid transaction date",
      });
    }

    // ========================================
    // VALIDATE ITEMS
    // ========================================

    const preparedItems = [];

    let totalBags = 0;
    let totalWeightKg = 0;

    for (const item of items) {
      if (
        !mongoose.isValidObjectId(item.productId) ||
        !mongoose.isValidObjectId(item.lotId)
      ) {
        throw new Error("Invalid Product or Lot ID");
      }

      const bags = Number(item.bags);
      const weightKg = Number(item.weightKg);

      if (
        !Number.isInteger(bags) ||
        bags < 0 ||
        !Number.isFinite(weightKg) ||
        weightKg < 0 ||
        (bags === 0 && weightKg === 0)
      ) {
        throw new Error("Invalid Stock Out quantity");
      }

      const product = await Product.findOne({
        _id: item.productId,
        isActive: true,
      });

      if (!product) {
        throw new Error("Product not found or inactive");
      }

      const lot = await Lot.findOne({
        _id: item.lotId,
        productId: product._id,
        status: "ACTIVE",
      });

      if (!lot) {
        throw new Error(
          `Active Lot not found for ${product.productName}`
        );
      }

      if (
        Number(lot.remainingBags || 0) < bags ||
        Number(lot.remainingWeightKg || 0) < weightKg
      ) {
        throw new Error(
          `Insufficient stock in Lot ${lot.lotCode}`
        );
      }

      preparedItems.push({
        productId: product._id,
        productName: product.productName,

        lotId: lot._id,
        lotCode: lot.lotCode,

        stockType: lot.stockType || "OWN",

        bags,
        weightKg,
      });

      totalBags += bags;
      totalWeightKg += weightKg;
    }

    totalWeightKg = Number(totalWeightKg.toFixed(2));

    // ========================================
    // DATABASE TRANSACTION
    // ========================================

    let savedStockOut = null;

    await session.withTransaction(async () => {
      // ========================================
      // UPDATE LOT AND PRODUCT STOCK
      // ========================================

      for (const item of preparedItems) {
        const updatedLot = await Lot.findOneAndUpdate(
          {
            _id: item.lotId,
            productId: item.productId,
            status: "ACTIVE",
            remainingBags: { $gte: item.bags },
            remainingWeightKg: { $gte: item.weightKg },
          },
          {
            $inc: {
              remainingBags: -item.bags,
              remainingWeightKg: -item.weightKg,
            },
          },
          {
            new: true,
            session,
            runValidators: true,
          }
        );

        if (!updatedLot) {
          throw new Error(
            `Stock changed. Please refresh Lot ${item.lotCode}`
          );
        }

        const updatedProduct = await Product.findOneAndUpdate(
          {
            _id: item.productId,
            currentStockBags: { $gte: item.bags },
            currentStockKg: { $gte: item.weightKg },
          },
          {
            $inc: {
              currentStockBags: -item.bags,
              currentStockKg: -item.weightKg,
            },
          },
          {
            new: true,
            session,
            runValidators: true,
          }
        );

        if (!updatedProduct) {
          throw new Error(
            `Product stock mismatch: ${item.productName}`
          );
        }

        // Lot completion is determined by BAG count.
        // Sold quantity is not changed for Stock Out.

        if (Number(updatedLot.remainingBags) === 0) {
          await Lot.updateOne(
            {
              _id: updatedLot._id,
              status: "ACTIVE",
            },
            {
              $set: {
                status: "COMPLETED",
              },
            },
            { session }
          );
        }
      }

      // ========================================
      // CREATE STOCK OUT RECORD
      // ========================================

      const stockOutNumber = await generateStockOutNumber();

      const created = await StockOut.create(
        [
          {
            stockOutNumber,
            transactionDate: parsedDate,
            items: preparedItems,
            totalBags,
            totalWeightKg,
            reason: stockOutReason,
            notes: String(notes || "").trim(),

            createdBy: {
              adminId: req.admin?.adminId || null,
              adminName: req.admin?.name || "",
              adminUsername: req.admin?.username || "",
            },

            status: "COMPLETED",
          },
        ],
        { session }
      );

      savedStockOut = created[0];

      // ========================================
      // ACTIVITY LOG
      // ========================================

      const itemDescription = preparedItems
        .map(
          (item) =>
            `${item.productName} (${item.lotCode}) - ${item.bags} bags, ${item.weightKg} KG`
        )
        .join("; ");

      await ActivityLog.create(
        [
          {
            adminId: req.admin?.adminId || null,
            adminName: req.admin?.name || "",
            adminUsername: req.admin?.username || "",

            action: "STOCK_OUT",
            module: "INVENTORY",

            description:
              `Stock Out ${stockOutNumber}: ${itemDescription}. Reason: ${stockOutReason}`,

            targetId: savedStockOut._id,
            targetName: stockOutNumber,

            metadata: {
              stockOutNumber,
              transactionDate: parsedDate,
              totalBags,
              totalWeightKg,
              reason: stockOutReason,
              items: preparedItems,
            },
          },
        ],
        { session }
      );
    });

    const result = await StockOut.findById(savedStockOut._id)
      .populate("items.productId", "productName")
      .populate("items.lotId", "lotCode");

    return res.status(201).json({
      success: true,
      message: "Stock Out completed successfully",
      data: result,
    });
  } catch (error) {
    console.error("Create Stock Out Error:", error);

    return res.status(400).json({
      success: false,
      message: error.message || "Failed to create Stock Out",
    });
  } finally {
    await session.endSession();
  }
});

// ========================================
// GET STOCK OUT HISTORY
// GET /api/stock-outs
// ========================================

router.get("/", async (req, res) => {
  try {
    const {
      from,
      to,
      page = 1,
      limit = 20,
      status,
    } = req.query;

    const filter = {};

    if (status && ["COMPLETED", "CANCELLED"].includes(status)) {
      filter.status = status;
    }

    if (from || to) {
      filter.transactionDate = {};

      if (from) {
        const startDate = new Date(from);

        if (Number.isNaN(startDate.getTime())) {
          return res.status(400).json({
            success: false,
            message: "Invalid start date",
          });
        }

        filter.transactionDate.$gte = startDate;
      }

      if (to) {
        const endDate = new Date(to);

        if (Number.isNaN(endDate.getTime())) {
          return res.status(400).json({
            success: false,
            message: "Invalid end date",
          });
        }

        endDate.setHours(23, 59, 59, 999);
        filter.transactionDate.$lte = endDate;
      }
    }

    const currentPage = Math.max(1, Number(page) || 1);
    const perPage = Math.min(
      100,
      Math.max(1, Number(limit) || 20)
    );

    const skip = (currentPage - 1) * perPage;

    const [stockOuts, total] = await Promise.all([
      StockOut.find(filter)
        .populate("items.productId", "productName")
        .populate("items.lotId", "lotCode")
        .sort({ transactionDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(perPage),

      StockOut.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: stockOuts,
      pagination: {
        total,
        page: currentPage,
        limit: perPage,
        totalPages: Math.ceil(total / perPage),
      },
    });
  } catch (error) {
    console.error("Get Stock Out History Error:", error);

    return res.status(500).json({
      success: false,
      message:
        error.message || "Failed to load Stock Out history",
    });
  }
});

// ========================================
// GET SINGLE STOCK OUT
// GET /api/stock-outs/:id
// ========================================

router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Stock Out ID",
      });
    }

    const stockOut = await StockOut.findById(id)
      .populate("items.productId", "productName")
      .populate("items.lotId", "lotCode");

    if (!stockOut) {
      return res.status(404).json({
        success: false,
        message: "Stock Out record not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: stockOut,
    });
  } catch (error) {
    console.error("Get Stock Out Details Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to load Stock Out details",
    });
  }
});

export default router;
