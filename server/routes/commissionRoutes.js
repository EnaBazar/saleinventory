
import express from "express";
import mongoose from "mongoose";

import Lot from "../models/Lot.js";
import Supplier from "../models/Supplier.js";
import SupplierLedger from "../models/SupplierLedger.js";
import CommissionInvoice from "../models/CommissionInvoice.js";

const router = express.Router();

const round2 = (value) => Number(Number(value || 0).toFixed(2));

// ========================================
// RECALCULATE SUPPLIER LEDGER BALANCES
// ========================================

async function recalculateSupplierLedgerBalances(
  supplierId,
  session
) {
  const supplier = await Supplier.findById(supplierId).session(session);

  if (!supplier) {
    throw new Error("Supplier not found");
  }

  const transactions = await SupplierLedger.find({
    supplierId,
  })
    .sort({
      transactionDate: 1,
      createdAt: 1,
      _id: 1,
    })
    .session(session);

  let balance = Number(supplier.openingBalance || 0);

  const bulkOperations = [];

  for (const transaction of transactions) {
    const isVoided =
      transaction.isVoided === true &&
      ["PAYMENT", "COMMISSION_INVOICE"].includes(
        transaction.type
      );

    if (isVoided) {
      bulkOperations.push({
        updateOne: {
          filter: { _id: transaction._id },
          update: {
            $set: {
              balanceAfter: round2(balance),
            },
          },
        },
      });

      continue;
    }

    balance +=
      Number(transaction.debit || 0) -
      Number(transaction.credit || 0);

    bulkOperations.push({
      updateOne: {
        filter: { _id: transaction._id },
        update: {
          $set: {
            balanceAfter: round2(balance),
          },
        },
      },
    });
  }

  if (bulkOperations.length > 0) {
    await SupplierLedger.bulkWrite(bulkOperations, {
      session,
    });
  }

  return round2(balance);
}

// ========================================
// GET PENDING COMMISSION LOTS
// GET /api/commission/pending
// ========================================

router.get("/pending", async (req, res) => {
  try {
    const invoicedLots = await CommissionInvoice.find({
      status: { $ne: "CANCELLED" },
    }).distinct("lotId");

    const lots = await Lot.find({
      stockType: "COMMISSION",
      remainingBags: 0,
      status: "COMPLETED",
      _id: { $nin: invoicedLots },
    })
      .populate("supplierId", "supplierName mobile")
      .populate("productId", "productName")
      .sort({ purchaseDate: -1 });

    return res.json({
      success: true,
      count: lots.length,
      data: lots,
    });
  } catch (error) {
    console.error("Pending Commission Lots Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ========================================
// CREATE COMMISSION INVOICE
// POST /api/commission
// ========================================

router.post("/", async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const {
      lotId,
      invoiceDate,
      items,
      transportCost,
      labourRatePerBag,
      commissionRatePerKg,
      otherCost,
      notes,
    } = req.body;

    if (!mongoose.isValidObjectId(lotId)) {
      throw new Error("Invalid Lot ID");
    }

    if (!Array.isArray(items) || items.length === 0) {
      throw new Error("At least one invoice item is required");
    }

    session.startTransaction();

    const lot = await Lot.findById(lotId)
      .populate("supplierId", "supplierName")
      .populate("productId", "productName")
      .session(session);

    if (!lot) {
      throw new Error("Lot not found");
    }

    if (
      lot.stockType !== "COMMISSION" ||
      Number(lot.remainingBags || 0) !== 0 ||
      lot.status !== "COMPLETED"
    ) {
      throw new Error("This Commission Lot is not fully completed");
    }

    const existingInvoice = await CommissionInvoice.findOne({
      lotId: lot._id,
      status: "COMPLETED",
    }).session(session);

    if (existingInvoice) {
      throw new Error("Commission Invoice already exists for this Lot");
    }

    if (!lot.supplierId?._id) {
      throw new Error("Supplier not found for this Lot");
    }

    const supplier = await Supplier.findById(
      lot.supplierId._id
    ).session(session);

    if (!supplier) {
      throw new Error("Supplier not found");
    }

    // ========================================
    // CALCULATE INVOICE ITEMS
    // One Lot, multiple rate parts
    // ========================================

    let totalBags = 0;
    let totalWeightKg = 0;
    let grossAmount = 0;

    const preparedItems = items.map((item) => {
      const bags = Number(item.bags);
      const weightKg = Number(item.weightKg);
      const ratePerKg = Number(item.ratePerKg);

      if (
        !Number.isFinite(bags) ||
        !Number.isFinite(weightKg) ||
        !Number.isFinite(ratePerKg) ||
        bags <= 0 ||
        weightKg <= 0 ||
        ratePerKg < 0
      ) {
        throw new Error("Invalid Commission Invoice item");
      }

      const amount = round2(weightKg * ratePerKg);

      totalBags += bags;
      totalWeightKg += weightKg;
      grossAmount += amount;

      return {
        bags,
        weightKg,
        ratePerKg,
        amount,
      };
    });

    totalBags = round2(totalBags);
    totalWeightKg = round2(totalWeightKg);
    grossAmount = round2(grossAmount);

    if (totalBags !== Number(lot.soldBags || 0)) {
      throw new Error(
        `Total invoice bags must be ${lot.soldBags}`
      );
    }

 if (totalBags !== Number(lot.soldBags || 0)) {
  throw new Error(
    `Total invoice bags must be ${lot.soldBags}`
  );
}

    // ========================================
    // CALCULATE DEDUCTIONS
    // ========================================

    const transport = Number(transportCost || 0);
    const labourRate = Number(labourRatePerBag || 0);
    const commissionRate = Number(commissionRatePerKg || 0);
    const other = Number(otherCost || 0);

    if (
      ![transport, labourRate, commissionRate, other].every(
        (value) => Number.isFinite(value) && value >= 0
      )
    ) {
      throw new Error("Invalid deduction amount or rate");
    }

    const labourCost = round2(totalBags * labourRate);

    const commissionCost = round2(
      totalWeightKg * commissionRate
    );

    const totalDeduction = round2(
      transport + labourCost + commissionCost + other
    );

    const netSupplierPayable = round2(
      grossAmount - totalDeduction
    );

    if (netSupplierPayable < 0) {
      throw new Error(
        "Total deductions cannot exceed gross commission amount"
      );
    }

    const parsedInvoiceDate = invoiceDate
      ? new Date(invoiceDate)
      : new Date();

    if (Number.isNaN(parsedInvoiceDate.getTime())) {
      throw new Error("Invalid invoice date");
    }

    // ========================================
    // CREATE COMMISSION INVOICE
    // ========================================

    const invoiceNumber = `CINV-${Date.now()}`;

    const [invoice] = await CommissionInvoice.create(
      [
        {
          invoiceNumber,
          lotId: lot._id,
          lotCode: lot.lotCode,
          productId: lot.productId?._id || lot.productId,
          productName:
            lot.productId?.productName || lot.productName,
          supplierId: supplier._id,
          supplierName: supplier.supplierName,
          invoiceDate: parsedInvoiceDate,
          items: preparedItems,
          totalBags,
          totalWeightKg,
          grossAmount,
          transportCost: transport,
          labourRatePerBag: labourRate,
          labourCost,
          commissionRatePerKg: commissionRate,
          commissionCost,
          otherCost: other,
          totalDeduction,
          netSupplierPayable,
          notes: notes || "",
          status: "COMPLETED",
          createdBy: {
            adminId: req.admin?.adminId || null,
            name: req.admin?.name || "",
            username: req.admin?.username || "",
          },
          completedAt: new Date(),
        },
      ],
      { session }
    );

    // ========================================
    // CREATE SUPPLIER LEDGER ENTRY
    // ========================================

    const [ledgerEntry] = await SupplierLedger.create(
      [
        {
          supplierId: supplier._id,
          lotId: lot._id,
          type: "COMMISSION_INVOICE",
          amount: netSupplierPayable,
          debit: netSupplierPayable,
          credit: 0,
          balanceAfter: 0,
          reference: invoiceNumber,
          description: `Commission Invoice ${invoiceNumber} - Lot ${lot.lotCode}`,
          transactionDate: parsedInvoiceDate,
          createdBy: {
            adminId: req.admin?.adminId || null,
            name: req.admin?.name || "",
            username: req.admin?.username || "",
          },
        },
      ],
      { session }
    );

    // Recalculate all supplier balances
    await recalculateSupplierLedgerBalances(
      supplier._id,
      session
    );

    const updatedLedger = await SupplierLedger.findById(
      ledgerEntry._id
    ).session(session);

    await session.commitTransaction();

    return res.status(201).json({
      success: true,
      message: "Commission Invoice created successfully",
      data: invoice,
      balanceAfter: updatedLedger.balanceAfter,
    });
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }

    console.error("Create Commission Invoice Error:", error);

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  } finally {
    await session.endSession();
  }
});

// ========================================
// CANCEL COMMISSION INVOICE
// PATCH /api/commission/:invoiceId/cancel
// ========================================

router.patch("/:invoiceId/cancel", async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const { invoiceId } = req.params;
    const { reason } = req.body;

    if (!mongoose.isValidObjectId(invoiceId)) {
      throw new Error("Invalid Commission Invoice ID");
    }

    if (!String(reason || "").trim()) {
      throw new Error("Cancellation reason is required");
    }

    session.startTransaction();

    const invoice = await CommissionInvoice.findById(
      invoiceId
    ).session(session);

    if (!invoice) {
      throw new Error("Commission Invoice not found");
    }

    if (invoice.status === "CANCELLED") {
      throw new Error("Commission Invoice is already cancelled");
    }

    const ledgerEntry = await SupplierLedger.findOne({
      supplierId: invoice.supplierId,
      type: "COMMISSION_INVOICE",
      reference: invoice.invoiceNumber,
      isVoided: { $ne: true },
    }).session(session);

    if (!ledgerEntry) {
      throw new Error(
        "Active Supplier Ledger entry not found for this invoice"
      );
    }

    // Void Supplier Ledger Entry
    ledgerEntry.isVoided = true;
    ledgerEntry.voidedAt = new Date();

    ledgerEntry.voidedBy = {
      adminId: req.admin?.adminId || null,
      name: req.admin?.name || "",
      username: req.admin?.username || "",
    };

    ledgerEntry.voidReason = String(reason).trim();

    await ledgerEntry.save({ session });

    // Keep invoice in history; do not delete it
    invoice.status = "CANCELLED";

    await invoice.save({ session });

    // Recalculate supplier balance without voided entry
    const currentBalance =
      await recalculateSupplierLedgerBalances(
        invoice.supplierId,
        session
      );

    await session.commitTransaction();

    return res.json({
      success: true,
      message: "Commission Invoice cancelled successfully",
      data: invoice,
      currentBalance,
    });
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }

    console.error("Cancel Commission Invoice Error:", error);

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  } finally {
    await session.endSession();
  }
});

// ========================================
// GET COMMISSION INVOICE HISTORY
// GET /api/commission
// ========================================

router.get("/", async (req, res) => {
  try {
    const invoices = await CommissionInvoice.find()
      .populate("supplierId", "supplierName mobile")
      .populate("productId", "productName")
      .sort({ invoiceDate: -1, createdAt: -1 })
      .limit(200);

    return res.json({
      success: true,
      count: invoices.length,
      data: invoices,
    });
  } catch (error) {
    console.error("Get Commission Invoices Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

export default router;
