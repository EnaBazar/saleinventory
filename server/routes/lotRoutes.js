
import express from "express";
import mongoose from "mongoose";
import Lot from "../models/Lot.js";
import Product from "../models/Product.js";
import Supplier from "../models/Supplier.js";
import SupplierLedger from "../models/SupplierLedger.js";
import ActivityLog from "../models/ActivityLog.js";
const router = express.Router();

// ========================================
// RECALCULATE SUPPLIER LEDGER BALANCES
// ========================================
async function recalculateSupplierLedgerBalances(supplierId) {
  if (!supplierId) return;

  const supplier = await Supplier.findById(supplierId);

  if (!supplier) return;

  const transactions = await SupplierLedger.find({
    supplierId,
  }).sort({
    transactionDate: 1,
    createdAt: 1,
    _id: 1,
  });

  let balance = Number(supplier.openingBalance || 0);

  const bulkOperations = [];

  for (const transaction of transactions) {
    balance +=
      Number(transaction.debit || 0) -
      Number(transaction.credit || 0);

    bulkOperations.push({
      updateOne: {
        filter: { _id: transaction._id },
        update: {
          $set: {
            balanceAfter: balance,
          },
        },
      },
    });
  }

  if (bulkOperations.length > 0) {
    await SupplierLedger.bulkWrite(bulkOperations);
  }
}
// ========================================
// CREATE PURCHASE - UPDATE EXISTING PENDING LOT
// POST /api/lots
// ========================================
router.post("/", async (req, res) => {
  let updatedLot = null;
  let stockUpdated = false;
let createdPurchaseLedger = null;
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

    if (!productId || !mongoose.isValidObjectId(productId)) {
      return res.status(400).json({
        success: false,
        message: "Valid Product ID is required",
      });
    }

    const weight = Number(totalWeightKg);
  
    const bags = Number(bagsReceived || 0);

    if (!Number.isFinite(weight) || weight <= 0) {
      return res.status(400).json({
        success: false,
        message: "Total weight must be greater than zero",
      });
    }

  

    if (!Number.isFinite(bags) || bags < 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid bag quantity",
      });
    }

    const product = await Product.findById(productId);

    if (!product || !product.isActive) {
      return res.status(404).json({
        success: false,
        message: "Product not found or inactive",
      });
    }

// ========================================
// PURCHASE PRICE BASED ON STOCK TYPE
// ========================================

const stockType = product.stockType || "OWN";

const price =
  stockType === "COMMISSION"
    ? 0
    : Number(purchasePricePerKg);

if (!Number.isFinite(price) || price < 0) {
  return res.status(400).json({
    success: false,
    message: "Valid purchase price is required",
  });
}

    const pendingLot = await Lot.findOne({
      productId: product._id,
      lotCode: product.lotCode,
      status: "PENDING",
    });

    if (!pendingLot) {
      const alreadyPurchased = await Lot.exists({
        productId: product._id,
        status: { $in: ["ACTIVE", "COMPLETED"] },
      });

      return res.status(409).json({
        success: false,
        message: alreadyPurchased
          ? "This Product has already been purchased. Create a new Product Entry for the next consignment."
          : "Pending Lot not found. Please create a new Product Entry first.",
      });
    }

    const selectedSupplierId = supplierId || product.supplier || null;

    let supplier = null;

    if (selectedSupplierId) {
      if (!mongoose.isValidObjectId(selectedSupplierId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid Supplier ID",
        });
      }

      supplier = await Supplier.findOne({
        _id: selectedSupplierId,
        isActive: true,
      });

      if (!supplier) {
        return res.status(404).json({
          success: false,
          message: "Supplier not found or inactive",
        });
      }
    }

    const date = purchaseDate ? new Date(purchaseDate) : new Date();

    if (Number.isNaN(date.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid purchase date",
      });
    }

    updatedLot = await Lot.findOneAndUpdate(
      {
        _id: pendingLot._id,
        status: "PENDING",
      },
      {
        $set: {
          supplierId: supplier ? supplier._id : null,
          stockType: product.stockType || "OWN",
          purchaseDate: date,
          bagsReceived: bags,
          totalWeightKg: weight,
       purchasePricePerKg: price,
totalPurchaseAmount:
  stockType === "COMMISSION" ? 0 : weight * price,
          remainingBags: bags,
          remainingWeightKg: weight,
          returnedBags: 0,
          returnedWeightKg: 0,
          returnedPurchaseAmount: 0,
          soldBags: 0,
          soldWeightKg: 0,
          status: "ACTIVE",
          notes: notes || "",
        },
      },
      {
        returnDocument: "after",
        runValidators: true,
      }
    );

    if (!updatedLot) {
      return res.status(409).json({
        success: false,
        message: "This Lot has already been purchased.",
      });
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      product._id,
      {
        $inc: {
          currentStockKg: weight,
          currentStockBags: bags,
        },
        $set: {
          purchaseStatus: "PURCHASED",
        },
      },
      {
        returnDocument: "after",
        runValidators: true,
      }
    );

    if (!updatedProduct) {
      throw new Error("Product stock update failed");
    }

    stockUpdated = true;
// ========================================
// CREATE SUPPLIER PURCHASE LEDGER ENTRY
// ========================================
if (
  updatedLot.supplierId &&
  updatedLot.stockType === "OWN"
) {
  const purchaseAmount = Number(
    updatedLot.totalPurchaseAmount || 0
  );

  if (purchaseAmount > 0) {
    const supplierLedgerTotals = await SupplierLedger.aggregate([
      {
        $match: {
          supplierId: updatedLot.supplierId,
        },
      },
      {
        $group: {
          _id: null,
          totalDebit: { $sum: "$debit" },
          totalCredit: { $sum: "$credit" },
        },
      },
    ]);

    const totals = supplierLedgerTotals[0] || {};

    const balanceBefore =
      Number(
        (await Supplier.findById(updatedLot.supplierId))
          ?.openingBalance || 0
      ) +
      Number(totals.totalDebit || 0) -
      Number(totals.totalCredit || 0);

   createdPurchaseLedger = await SupplierLedger.create({
      supplierId: updatedLot.supplierId,
      type: "PURCHASE",
      amount: purchaseAmount,
      debit: purchaseAmount,
      credit: 0,
      balanceAfter: balanceBefore + purchaseAmount,
      lotId: updatedLot._id,
      reference: `PURCHASE-${updatedLot.lotCode}`,
      description: `Purchase - ${updatedLot.lotCode}`,
      transactionDate: updatedLot.purchaseDate || new Date(),
    });
  }
}

    // ========================================
    // SAVE PURCHASE CREATE ACTIVITY
    // ========================================
    try {
      await ActivityLog.create({
        adminId: req.admin?.adminId || null,
        adminName: req.admin?.name || "",
        adminUsername: req.admin?.username || "",

        action: "PURCHASE_CREATE",
        module: "PURCHASE",

        description: `New Purchase Created - ${updatedLot.lotCode}`,

        targetId: updatedLot._id,
        targetName: updatedLot.lotCode,

        metadata: {
          lotCode: updatedLot.lotCode,

          productId: product._id,
          productName: product.productName,

          supplierId: supplier?._id || null,
          supplierName: supplier?.supplierName || "",

          stockType: updatedLot.stockType,
          purchaseDate: updatedLot.purchaseDate,

          bagsReceived: updatedLot.bagsReceived,
          totalWeightKg: updatedLot.totalWeightKg,

          purchasePricePerKg: updatedLot.purchasePricePerKg,
          totalPurchaseAmount: updatedLot.totalPurchaseAmount,

          notes: updatedLot.notes || "",
        },
      });
    } catch (activityError) {
      console.error("Purchase Create Activity Log Error:", activityError);
    }

    return res.status(200).json({
      success: true,
      message: "Purchase completed successfully. Existing Lot updated.",
      data: updatedLot,
    });
  } catch (error) {
    console.error("Create Purchase Error:", error);
// Rollback Supplier Ledger if Purchase fails
if (createdPurchaseLedger) {
  try {
    await SupplierLedger.findByIdAndDelete(
      createdPurchaseLedger._id
    );
  } catch (ledgerRollbackError) {
    console.error(
      "Purchase Ledger Rollback Error:",
      ledgerRollbackError
    );
  }
}


    if (stockUpdated && updatedLot) {
      try {
        await Product.findByIdAndUpdate(updatedLot.productId, {
          $inc: {
            currentStockKg: -Number(updatedLot.totalWeightKg || 0),
            currentStockBags: -Number(updatedLot.bagsReceived || 0),
          },
          $set: {
            purchaseStatus: "PENDING",
          },
        });
      } catch (rollbackError) {
        console.error("Stock Rollback Error:", rollbackError);
      }
    }

    if (updatedLot) {
      try {
        await Lot.findOneAndUpdate(
          {
            _id: updatedLot._id,
            status: "ACTIVE",
          },
          {
            $set: {
              supplierId: null,
              purchaseDate: null,
              bagsReceived: 0,
              totalWeightKg: 0,
              purchasePricePerKg: 0,
              totalPurchaseAmount: 0,
              remainingBags: 0,
              remainingWeightKg: 0,
              returnedBags: 0,
              returnedWeightKg: 0,
              returnedPurchaseAmount: 0,
              soldBags: 0,
              soldWeightKg: 0,
              status: "PENDING",
              notes: "",
            },
          }
        );
      } catch (rollbackError) {
        console.error("Lot Rollback Error:", rollbackError);
      }
    }

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to save purchase",
    });
  }
});

// ========================================
// EDIT PURCHASE
// PUT /api/lots/:id
// ========================================

router.put("/:id", async (req, res) => {
  let productStockUpdated = false;
  let stockDeltaKg = 0;
  let stockDeltaBags = 0;
  let productId = null;

  let lotSaved = false;
  let ledgerTouched = false;

  let oldLedgerEntries = [];
  let affectedSupplierIds = [];

  let lotBefore = null;

  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Lot ID",
      });
    }

    const lot = await Lot.findById(id);

    if (!lot) {
      return res.status(404).json({
        success: false,
        message: "Purchase not found",
      });
    }

    if (!["ACTIVE", "COMPLETED"].includes(lot.status)) {
      return res.status(400).json({
        success: false,
        message: "Only purchased lots can be edited",
      });
    }




    // Preserve original Lot before editing
    lotBefore = lot.toObject();

    const oldSupplierId = lot.supplierId
      ? lot.supplierId.toString()
      : null;

    const {
  supplierId,
  purchaseDate,
  bagsReceived,
  totalWeightKg,
  purchasePricePerKg,
  notes,
  editReason,
} = req.body;

if (!editReason || !editReason.trim()) {
  return res.status(400).json({
    success: false,
    message: "Purchase edit reason is required",
  });
}

    const newBags = Number(
      bagsReceived !== undefined ? bagsReceived : lot.bagsReceived
    );

    const newWeight = Number(
      totalWeightKg !== undefined ? totalWeightKg : lot.totalWeightKg
    );

  const newPrice =
  lot.stockType === "COMMISSION"
    ? 0
    : Number(
        purchasePricePerKg !== undefined
          ? purchasePricePerKg
          : lot.purchasePricePerKg
      );

    if (
      !Number.isFinite(newBags) ||
      newBags < 0 ||
      !Number.isFinite(newWeight) ||
      newWeight <= 0 ||
      !Number.isFinite(newPrice) ||
      newPrice < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid purchase quantity or price",
      });
    }

    const soldBags = Number(lot.soldBags || 0);
    const soldWeight = Number(lot.soldWeightKg || 0);
    const returnedBags = Number(lot.returnedBags || 0);
    const returnedWeight = Number(lot.returnedWeightKg || 0);

    if (
      newBags < soldBags + returnedBags ||
      newWeight < soldWeight + returnedWeight
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Purchase quantity cannot be less than sold and returned quantity",
      });
    }

    let newSupplierId = lot.supplierId;

    if (supplierId !== undefined) {
      if (!supplierId) {
        newSupplierId = null;
      } else {
        if (!mongoose.isValidObjectId(supplierId)) {
          return res.status(400).json({
            success: false,
            message: "Invalid Supplier ID",
          });
        }

        const supplier = await Supplier.findOne({
          _id: supplierId,
          isActive: true,
        });

        if (!supplier) {
          return res.status(404).json({
            success: false,
            message: "Supplier not found or inactive",
          });
        }

        newSupplierId = supplier._id;
      }
    }

    const newDate =
      purchaseDate !== undefined
        ? new Date(purchaseDate)
        : lot.purchaseDate;

    if (!newDate || Number.isNaN(new Date(newDate).getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid purchase date",
      });
    }

    const newRemainingBags =
      newBags - soldBags - returnedBags;

    const newRemainingWeight =
      newWeight - soldWeight - returnedWeight;

    const oldValues = {
      supplierId: lot.supplierId,
      purchaseDate: lot.purchaseDate,
      bagsReceived: lot.bagsReceived,
      totalWeightKg: lot.totalWeightKg,
      purchasePricePerKg: lot.purchasePricePerKg,
      totalPurchaseAmount: lot.totalPurchaseAmount,
      notes: lot.notes,
    };

    const newValues = {
      supplierId: newSupplierId,
      purchaseDate: newDate,
      bagsReceived: newBags,
      totalWeightKg: newWeight,
      purchasePricePerKg: newPrice,
totalPurchaseAmount:
  lot.stockType === "COMMISSION" ? 0 : newWeight * newPrice,
      notes: notes !== undefined ? notes : lot.notes,
    };

    // ========================================
    // UPDATE PRODUCT STOCK
    // ========================================

    stockDeltaBags =
      newRemainingBags - Number(lot.remainingBags || 0);

    stockDeltaKg =
      newRemainingWeight - Number(lot.remainingWeightKg || 0);

    productId = lot.productId;

    if (stockDeltaKg !== 0 || stockDeltaBags !== 0) {
      const stockFilter = { _id: productId };

      if (stockDeltaKg < 0 || stockDeltaBags < 0) {
        stockFilter.currentStockKg = {
          $gte: Math.max(0, -stockDeltaKg),
        };

        stockFilter.currentStockBags = {
          $gte: Math.max(0, -stockDeltaBags),
        };
      }

      const updatedProduct = await Product.findOneAndUpdate(
        stockFilter,
        {
          $inc: {
            currentStockKg: stockDeltaKg,
            currentStockBags: stockDeltaBags,
          },
        },
        {
          returnDocument: "after",
          runValidators: true,
        }
      );

      if (!updatedProduct) {
        return res.status(400).json({
          success: false,
          message: "Product stock is insufficient for this edit",
        });
      }

      productStockUpdated = true;
    }

    // ========================================
    // UPDATE LOT
    // ========================================

lot.editHistory.push({
  editedAt: new Date(),
  oldValues,
  newValues,
  reason: editReason.trim(),

  editedBy: {
    adminId: req.admin?.adminId || null,
    name: req.admin?.name || "",
    username: req.admin?.username || "",
  },
});

    lot.supplierId = newSupplierId;
    lot.purchaseDate = newDate;
    lot.bagsReceived = newBags;
    lot.totalWeightKg = newWeight;
lot.purchasePricePerKg = newPrice;
lot.totalPurchaseAmount =
  lot.stockType === "COMMISSION" ? 0 : newWeight * newPrice;
    lot.remainingBags = newRemainingBags;
    lot.remainingWeightKg = newRemainingWeight;

    if (notes !== undefined) {
      lot.notes = notes;
    }

    await lot.save();
    lotSaved = true;

    // ========================================
    // PRESERVE OLD PURCHASE LEDGER ENTRIES
    // ========================================

    oldLedgerEntries = await SupplierLedger.find({
      lotId: lot._id,
      type: "PURCHASE",
    }).lean();

    const newSupplierIdString = newSupplierId
      ? newSupplierId.toString()
      : null;

    const newPurchaseAmount = Number(
      lot.totalPurchaseAmount || 0
    );

    // Suppliers whose balances may change
    affectedSupplierIds = [
      ...new Set(
        [
          oldSupplierId,
          newSupplierIdString,
          ...oldLedgerEntries.map((entry) =>
            entry.supplierId.toString()
          ),
        ].filter(Boolean)
      ),
    ];

    // Mark before deletion so catch can restore old entries
    ledgerTouched = true;

    // Remove previous purchase ledger entry/entries
    await SupplierLedger.deleteMany({
      lotId: lot._id,
      type: "PURCHASE",
    });

    // Create updated purchase entry
   if (
  lot.stockType === "OWN" &&
  newSupplierId &&
  newPurchaseAmount > 0
) {
      await SupplierLedger.create({
        supplierId: newSupplierId,
        type: "PURCHASE",
        amount: newPurchaseAmount,
        debit: newPurchaseAmount,
        credit: 0,
        lotId: lot._id,
        reference: `PURCHASE-${lot.lotCode}`,
        description: `Purchase - ${lot.lotCode}`,
        transactionDate: lot.purchaseDate || new Date(),
      });
    }

    // Recalculate affected supplier balances
    for (const affectedId of affectedSupplierIds) {
      await recalculateSupplierLedgerBalances(affectedId);
    }

    const updatedLot = await Lot.findById(lot._id)
      .populate("productId", "productName lotCode")
      .populate("supplierId", "supplierName mobile");

      // ========================================
// SAVE PURCHASE EDIT ACTIVITY
// ========================================

await ActivityLog.create({
  adminId: req.admin?.adminId || null,
  adminName: req.admin?.name || "",
  adminUsername: req.admin?.username || "",

  action: "PURCHASE_EDIT",
  module: "PURCHASE",

  description: `Purchase ${lot.lotCode} edited. Reason: ${editReason.trim()}`,

  targetId: lot._id,
  targetName: lot.lotCode,

  metadata: {
    oldValues,
    newValues,
    editReason: editReason.trim(),
  },
});
    return res.status(200).json({
      success: true,
      message: "Purchase and Supplier Ledger updated successfully",
      data: updatedLot,
    });

  } catch (error) {
    console.error("Purchase Edit Error:", error);

    // ========================================
    // ROLLBACK LEDGER
    // ========================================

    if (ledgerTouched && productId) {
      try {
        await SupplierLedger.deleteMany({
          lotId: req.params.id,
          type: "PURCHASE",
        });

        if (oldLedgerEntries.length > 0) {
          await SupplierLedger.insertMany(oldLedgerEntries);
        }

        for (const supplierId of affectedSupplierIds) {
          await recalculateSupplierLedgerBalances(supplierId);
        }
      } catch (ledgerRollbackError) {
        console.error(
          "Purchase Ledger Rollback Error:",
          ledgerRollbackError
        );
      }
    }

    // ========================================
    // ROLLBACK LOT
    // ========================================

    if (lotSaved && lotBefore) {
      try {
        const restoreLot = await Lot.findById(req.params.id);

        if (restoreLot) {
          restoreLot.supplierId = lotBefore.supplierId;
          restoreLot.purchaseDate = lotBefore.purchaseDate;
          restoreLot.bagsReceived = lotBefore.bagsReceived;
          restoreLot.totalWeightKg = lotBefore.totalWeightKg;
          restoreLot.purchasePricePerKg =
            lotBefore.purchasePricePerKg;
          restoreLot.totalPurchaseAmount =
            lotBefore.totalPurchaseAmount;
          restoreLot.remainingBags = lotBefore.remainingBags;
          restoreLot.remainingWeightKg =
            lotBefore.remainingWeightKg;
          restoreLot.notes = lotBefore.notes;
          restoreLot.editHistory = lotBefore.editHistory;

          await restoreLot.save();
        }
      } catch (lotRollbackError) {
        console.error(
          "Purchase Lot Rollback Error:",
          lotRollbackError
        );
      }
    }

    // ========================================
    // ROLLBACK PRODUCT STOCK
    // ========================================

    if (productStockUpdated && productId) {
      try {
        await Product.findByIdAndUpdate(productId, {
          $inc: {
            currentStockKg: -stockDeltaKg,
            currentStockBags: -stockDeltaBags,
          },
        });
      } catch (rollbackError) {
        console.error(
          "Purchase Edit Stock Rollback Error:",
          rollbackError
        );
      }
    }

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update purchase",
    });
  }
});

// ========================================
// GET ALL LOTS

// ========================================
// PURCHASE RETURN
// POST /api/lots/:id/returns
// Only unsold stock can be returned
// ========================================
router.post("/:id/returns", async (req, res) => {
  let lot = null;
  let createdReturnLedger = null;
  let productStockUpdated = false;
  let lotUpdated = false;

  let oldLotValues = null;

  try {
    const { id } = req.params;

    const {
      bagsReturned,
      weightReturnedKg,
      returnDate,
      notes,
    } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Lot ID",
      });
    }

    const bags = Number(bagsReturned || 0);
    const weight = Number(weightReturnedKg || 0);

    if (
      !Number.isFinite(bags) ||
      !Number.isFinite(weight) ||
      bags < 0 ||
      weight <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "সঠিক Return Bag ও Weight দিন",
      });
    }

    if (!Number.isInteger(bags)) {
      return res.status(400).json({
        success: false,
        message: "Bag সংখ্যা পূর্ণ সংখ্যা হতে হবে",
      });
    }

    lot = await Lot.findById(id);

    if (!lot) {
      return res.status(404).json({
        success: false,
        message: "Lot পাওয়া যায়নি",
      });
    }

    if (lot.status !== "ACTIVE") {
      return res.status(400).json({
        success: false,
        message: "শুধু Active Purchase Lot থেকে Return করা যাবে",
      });
    }

    // Only unsold stock can be returned
    if (bags > Number(lot.remainingBags || 0)) {
      return res.status(400).json({
        success: false,
        message: `অবিক্রীত Bag আছে ${lot.remainingBags}`,
      });
    }

    if (weight > Number(lot.remainingWeightKg || 0)) {
      return res.status(400).json({
        success: false,
        message: `অবিক্রীত Stock আছে ${lot.remainingWeightKg} Kg`,
      });
    }

    const parsedReturnDate = returnDate
      ? new Date(returnDate)
      : new Date();

    if (Number.isNaN(parsedReturnDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "সঠিক Return Date দিন",
      });
    }

    const pricePerKg = Number(lot.purchasePricePerKg || 0);
    const returnAmount = Number((weight * pricePerKg).toFixed(2));

    const product = await Product.findById(lot.productId);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product পাওয়া যায়নি",
      });
    }

    // Save old values for rollback
    oldLotValues = {
      returnedBags: lot.returnedBags,
      returnedWeightKg: lot.returnedWeightKg,
      returnedPurchaseAmount: lot.returnedPurchaseAmount,
      remainingBags: lot.remainingBags,
      remainingWeightKg: lot.remainingWeightKg,
      returnHistory: lot.returnHistory.map((item) => item.toObject()),
    };

    // Update Lot
    lot.returnedBags =
      Number(lot.returnedBags || 0) + bags;

    lot.returnedWeightKg =
      Number(lot.returnedWeightKg || 0) + weight;

    lot.returnedPurchaseAmount =
      Number(lot.returnedPurchaseAmount || 0) + returnAmount;

    lot.remainingBags =
      Number(lot.remainingBags || 0) - bags;

    lot.remainingWeightKg =
      Number(lot.remainingWeightKg || 0) - weight;

    lot.returnHistory.push({
  returnDate: parsedReturnDate,
  bagsReturned: bags,
  weightReturnedKg: weight,
  purchasePricePerKg: pricePerKg,
  returnAmount,
  notes: notes || "",

  returnedBy: {
    adminId: req.admin?.adminId || null,
    name: req.admin?.name || "",
    username: req.admin?.username || "",
  },
});

    await lot.save();
    lotUpdated = true;

    // Reduce Product Stock
    const updatedProduct = await Product.findOneAndUpdate(
      {
        _id: lot.productId,
        currentStockKg: { $gte: weight },
        currentStockBags: { $gte: bags },
      },
      {
        $inc: {
          currentStockKg: -weight,
          currentStockBags: -bags,
        },
      },
      { new: true }
    );

    if (!updatedProduct) {
      throw new Error(
        "Product Stock Lot-এর সঙ্গে মিলছে না। Return করা যায়নি।"
      );
    }

    productStockUpdated = true;

    // Supplier Credit Ledger
    if (lot.supplierId && returnAmount > 0) {
      createdReturnLedger = await SupplierLedger.create({
        supplierId: lot.supplierId,
        type: "PURCHASE_RETURN",
        amount: returnAmount,
        debit: 0,
        credit: returnAmount,
        balanceAfter: 0,
        lotId: lot._id,
        reference: `RETURN-${lot.lotCode}-${Date.now()}`,
        description: `Purchase Return - ${lot.lotCode}`,
        transactionDate: parsedReturnDate,
      });

      await recalculateSupplierLedgerBalances(lot.supplierId);
    }
// ========================================
// SAVE PURCHASE RETURN ACTIVITY
// ========================================

// ========================================
// SAVE PURCHASE RETURN ACTIVITY
// ========================================
try {
  await ActivityLog.create({
    adminId: req.admin?.adminId || null,
    adminName: req.admin?.name || "",
    adminUsername: req.admin?.username || "",

    action: "PURCHASE_RETURN",
    module: "PURCHASE",

    description: `Purchase Return - ${lot.lotCode}`,

    targetId: lot._id,
    targetName: lot.lotCode,

    metadata: {
      bagsReturned: bags,
      weightReturnedKg: weight,
      purchasePricePerKg: pricePerKg,
      returnAmount,
      returnDate: parsedReturnDate,
      notes: notes || "",
      supplierId: lot.supplierId || null,
    },
  });
} catch (activityError) {
  console.error(
    "Purchase Return Activity Log Error:",
    activityError.message
  );
}

// ========================================
// PURCHASE RETURN SUCCESS RESPONSE
// ========================================

// ========================================
// PURCHASE RETURN SUCCESS RESPONSE
// ========================================
return res.status(201).json({
  success: true,
  message: "Purchase Return সফলভাবে সংরক্ষণ হয়েছে",
  data: {
    lot,
    returnedBags: bags,
    returnedWeightKg: weight,
    returnAmount,
    supplierCredit: lot.supplierId ? returnAmount : 0,
  },
});

} catch (error) {
  console.error("Purchase Return Error:", error);

  // Rollback Supplier Ledger
  if (createdReturnLedger) {
    try {
      await SupplierLedger.deleteOne({
        _id: createdReturnLedger._id,
      });

      await recalculateSupplierLedgerBalances(
        createdReturnLedger.supplierId
      );
    } catch (rollbackError) {
      console.error(
        "Return Ledger Rollback Error:",
        rollbackError
      );
    }
  }

  // Rollback Product Stock
  if (productStockUpdated && lot) {
    try {
      await Product.findByIdAndUpdate(lot.productId, {
        $inc: {
          currentStockKg: Number(req.body.weightReturnedKg || 0),
          currentStockBags: Number(req.body.bagsReturned || 0),
        },
      });
    } catch (rollbackError) {
      console.error(
        "Product Stock Rollback Error:",
        rollbackError
      );
    }
  }

  // Rollback Lot
  if (lotUpdated && lot && oldLotValues) {
    try {
      lot.returnedBags = oldLotValues.returnedBags;
      lot.returnedWeightKg = oldLotValues.returnedWeightKg;
      lot.returnedPurchaseAmount =
        oldLotValues.returnedPurchaseAmount;
      lot.remainingBags = oldLotValues.remainingBags;
      lot.remainingWeightKg = oldLotValues.remainingWeightKg;
      lot.returnHistory = oldLotValues.returnHistory;

      await lot.save();
    } catch (rollbackError) {
      console.error("Lot Rollback Error:", rollbackError);
    }
  }

  return res.status(500).json({
    success: false,
    message: error.message || "Purchase Return করা যায়নি",
  });
}
});


// GET /api/lots
// ========================================
router.get("/", async (req, res) => {
  try {
    const { productId, supplierId, status, stockType } = req.query;

    const filter = {};

    if (productId) filter.productId = productId;
    if (supplierId) filter.supplierId = supplierId;
    if (status) filter.status = status;
    if (stockType) filter.stockType = stockType;

    const lots = await Lot.find(filter)
      .populate("productId", "productName lotCode")
      .populate("supplierId", "supplierName mobile")
      .sort({ purchaseDate: -1, createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: lots.length,
      data: lots,
    });
  } catch (error) {
    console.error("Get Lots Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch lots",
    });
  }
});

// ========================================
// GET ACTIVE LOTS OF ONE PRODUCT
// GET /api/lots/product/:productId
// ========================================
router.get("/product/:productId", async (req, res) => {
  try {
    const { productId } = req.params;

    if (!mongoose.isValidObjectId(productId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Product ID",
      });
    }

    const lots = await Lot.find({
      productId,
      status: "ACTIVE",
      remainingWeightKg: { $gt: 0 },
    })
      .populate("supplierId", "supplierName mobile")
      .sort({ purchaseDate: 1, createdAt: 1 });

    return res.status(200).json({
      success: true,
      count: lots.length,
      data: lots,
    });
  } catch (error) {
    console.error("Product Lots Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch product lots",
    });
  }
});

// ========================================
// GET ONE LOT
// GET /api/lots/:id
// ========================================
router.get("/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Lot ID",
      });
    }

    const lot = await Lot.findById(req.params.id)
      .populate("productId", "productName lotCode")
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
    console.error("Get Lot Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch lot",
    });
  }
});

export default router;
