
import express from "express";
import mongoose from "mongoose";
import Supplier from "../models/Supplier.js";
import SupplierLedger from "../models/SupplierLedger.js";
import ActivityLog from "../models/ActivityLog.js";
import Lot from "../models/Lot.js";
import Account from "../models/Account.js";
import AccountLedger from "../models/AccountLedger.js";

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
    // Voided Payment and Commission Invoice
    // will not affect supplier balance
    if (
      transaction.isVoided === true &&
      ["PAYMENT", "COMMISSION_INVOICE"].includes(
        transaction.type
      )
    ) {
      bulkOperations.push({
        updateOne: {
          filter: { _id: transaction._id },
          update: {
            $set: {
              balanceAfter: Number(balance.toFixed(2)),
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
            balanceAfter: Number(balance.toFixed(2)),
          },
        },
      },
    });
  }

  if (bulkOperations.length > 0) {
    await SupplierLedger.bulkWrite(bulkOperations);
  }
}



const PAYMENT_METHODS = [
  "CASH",
  "BANK",
  "BKASH",
  "NAGAD",
  "ROCKET",
  "OTHER",
];

// ======================================
// ADD SUPPLIER
// POST /api/suppliers
// ======================================
router.post("/", async (req, res) => {
  try {
    const {
      supplierName,
      companyName,
      contactPerson,
      mobile,
      alternateMobile,
      address,
      openingBalance,
      notes,
    } = req.body;

    if (!supplierName?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Supplier name is required",
      });
    }

    const supplier = await Supplier.create({
      supplierName,
      companyName,
      contactPerson,
      mobile,
      alternateMobile,
      address,
      openingBalance,
      notes,
    });

    res.status(201).json({
      success: true,
      message: "Supplier added successfully",
      supplier,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ======================================
// GET ALL SUPPLIERS
// GET /api/suppliers
// ======================================


router.get("/", async (req, res) => {
  try {
    const suppliers = await Supplier.find().sort({
      createdAt: -1,
    }).lean();

    // Get all active supplier ledger balances
    const ledgerBalances = await SupplierLedger.aggregate([
      {
        // Exclude voided supplier payments
      $match: {
  $or: [
    {
      type: {
        $nin: ["PAYMENT", "COMMISSION_INVOICE"],
      },
    },
    { isVoided: { $ne: true } },
  ],
}
      },
      {
        $group: {
          _id: "$supplierId",
          totalDebit: {
            $sum: { $ifNull: ["$debit", 0] },
          },
          totalCredit: {
            $sum: { $ifNull: ["$credit", 0] },
          },
        },
      },
    ]);

    // Create balance lookup
    const balanceMap = new Map();

    ledgerBalances.forEach((item) => {
      balanceMap.set(
        String(item._id),
        {
          totalDebit: Number(item.totalDebit || 0),
          totalCredit: Number(item.totalCredit || 0),
        }
      );
    });

    // Attach current balance to each supplier
    const suppliersWithBalance = suppliers.map((supplier) => {
      const ledger = balanceMap.get(String(supplier._id)) || {
        totalDebit: 0,
        totalCredit: 0,
      };

      const currentBalance =
        Number(supplier.openingBalance || 0) +
        ledger.totalDebit -
        ledger.totalCredit;

      return {
        ...supplier,
        currentBalance: Number(currentBalance.toFixed(2)),
      };
    });

    res.json({
      success: true,
      suppliers: suppliersWithBalance,
    });
  } catch (error) {
    console.error("Get Suppliers Error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});




// ======================================
// GET SUPPLIER STATEMENT
// GET /api/suppliers/:id/statement
// ======================================

router.get("/:id/statement", async (req, res) => {
  try {
    const { id } = req.params;
    const { startDate, endDate } = req.query;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid supplier ID",
      });
    }

    const supplier = await Supplier.findById(id);

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: "Supplier not found",
      });
    }

    // Validate date filters
    let start = null;
    let end = null;

    if (startDate) {
      start = new Date(`${startDate}T00:00:00`);

      if (Number.isNaN(start.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid start date",
        });
      }
    }

    if (endDate) {
      end = new Date(`${endDate}T23:59:59.999`);

      if (Number.isNaN(end.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid end date",
        });
      }
    }

    if (start && end && start > end) {
      return res.status(400).json({
        success: false,
        message: "Start date cannot be after end date",
      });
    }

    // Get all supplier transactions with Lot details
    const allTransactions = await SupplierLedger.find({
      supplierId: supplier._id,
    })
      .populate({
        path: "lotId",
        select:
          "lotCode productId bagsReceived totalWeightKg purchasePricePerKg totalPurchaseAmount",
        populate: {
          path: "productId",
          select: "productName",
        },
      })
      .sort({
        transactionDate: 1,
        createdAt: 1,
        _id: 1,
      });

    // Exclude voided payments from accounting calculations
   const isVoidedPayment = (item) =>
  item.isVoided === true &&
  ["PAYMENT", "COMMISSION_INVOICE"].includes(item.type);

    const previousTransactions = allTransactions.filter((item) => {
      const date = new Date(
        item.transactionDate || item.createdAt
      );

      return (
        start &&
        date < start &&
        !isVoidedPayment(item)
      );
    });

    // Opening balance before selected period
    const openingBalance =
      Number(supplier.openingBalance || 0) +
      previousTransactions.reduce(
        (balance, item) =>
          balance +
          Number(item.debit || 0) -
          Number(item.credit || 0),
        0
      );

    // Filter selected period
    const transactions = allTransactions.filter((item) => {
      const date = new Date(
        item.transactionDate || item.createdAt
      );

      if (start && date < start) return false;
      if (end && date > end) return false;

      return true;
    });

    // Calculate summary
    let totalPurchase = 0;
    let totalPayment = 0;
    let totalPurchaseReturn = 0;
    let adjustmentDebit = 0;
    let adjustmentCredit = 0;
    let totalDebit = 0;
    let totalCredit = 0;

    const statementTransactions = transactions.map((item) => {
      const voided = isVoidedPayment(item);

      // Voided payments remain visible but do not affect balances
      const debit = voided ? 0 : Number(item.debit || 0);
      const credit = voided ? 0 : Number(item.credit || 0);

      totalDebit += debit;
      totalCredit += credit;

      if (item.type === "PURCHASE") {
        totalPurchase += debit;
      }

      if (item.type === "PAYMENT" && !voided) {
        totalPayment += credit;
      }

      if (item.type === "PURCHASE_RETURN") {
        totalPurchaseReturn += credit;
      }

      if (item.type === "ADJUSTMENT") {
        adjustmentDebit += debit;
        adjustmentCredit += credit;
      }

      const lot = item.lotId;

      return {
        _id: item._id,
        type: item.type,
        amount: Number(item.amount || 0),
        debit,
        credit,
        balanceAfter: Number(item.balanceAfter || 0),

        isVoided: voided,
        voidedAt: item.voidedAt || null,
        voidedBy: item.voidedBy || null,
        voidReason: item.voidReason || "",

        paymentMethod: item.paymentMethod || "",
        transactionId: item.transactionId || "",
        reference: item.reference || "",
        description: item.description || "",
        transactionDate: item.transactionDate,
        createdAt: item.createdAt,

        createdBy: item.createdBy || null,

        correctionHistory: item.correctionHistory || [],

        lotDetails: lot
          ? {
              lotCode: lot.lotCode || "",
              productName:
                lot.productId?.productName || "",
              bagsReceived: Number(lot.bagsReceived || 0),
              totalWeightKg: Number(lot.totalWeightKg || 0),
              purchasePricePerKg: Number(
                lot.purchasePricePerKg || 0
              ),
              totalPurchaseAmount: Number(
                lot.totalPurchaseAmount || 0
              ),
            }
          : null,
      };
    });

    const closingBalance =
      openingBalance + totalDebit - totalCredit;

    res.json({
      success: true,

      supplier: {
        _id: supplier._id,
        supplierName: supplier.supplierName,
        companyName: supplier.companyName,
        mobile: supplier.mobile,
        contactPerson: supplier.contactPerson,
        address: supplier.address,
      },

      summary: {
        openingBalance: Number(openingBalance.toFixed(2)),
        totalPurchase: Number(totalPurchase.toFixed(2)),
        totalPayment: Number(totalPayment.toFixed(2)),
        totalPurchaseReturn: Number(
          totalPurchaseReturn.toFixed(2)
        ),
        adjustmentDebit: Number(adjustmentDebit.toFixed(2)),
        adjustmentCredit: Number(adjustmentCredit.toFixed(2)),
        totalDebit: Number(totalDebit.toFixed(2)),
        totalCredit: Number(totalCredit.toFixed(2)),
        closingBalance: Number(closingBalance.toFixed(2)),
      },

      filters: {
        startDate: startDate || null,
        endDate: endDate || null,
      },

      transactions: statementTransactions,
    });
  } catch (error) {
    console.error("Supplier Statement Error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});


// ======================================
// ADD SUPPLIER PAYMENT
// POST /api/suppliers/:id/payments
// ======================================



router.post("/:id/payments", async (req, res) => {
  let createdPayment = null;
  let createdAccountLedger = null;

  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid supplier ID",
      });
    }

    const {
      amount,
      paymentMethod,
      accountId,
      transactionId,
      reference,
      description,
      transactionDate,
      notes,
    } = req.body;

    const paymentAmount = Number(amount);

    if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid payment amount is required",
      });
    }

    const method = String(paymentMethod || "CASH").toUpperCase();

    if (!PAYMENT_METHODS.includes(method)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment method",
      });
    }

    const supplier = await Supplier.findById(id);

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: "Supplier not found",
      });
    }

    // Validate selected account
    const accountRequiredMethods = ["CASH", "BANK", "BKASH"];

    if (
      accountRequiredMethods.includes(method) &&
      !accountId
    ) {
      return res.status(400).json({
        success: false,
        message: "Please select an account for this payment method",
      });
    }

    let selectedAccount = null;

    if (accountId) {
      if (!mongoose.Types.ObjectId.isValid(accountId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid account ID",
        });
      }

      selectedAccount = await Account.findOne({
        _id: accountId,
        isActive: true,
      });

      if (!selectedAccount) {
        return res.status(404).json({
          success: false,
          message: "Selected account not found or inactive",
        });
      }

      if (selectedAccount.accountType !== method) {
        return res.status(400).json({
          success: false,
          message: "Selected account does not match payment method",
        });
      }
    }

    let paymentDate = new Date();

    if (transactionDate) {
      paymentDate = new Date(transactionDate);

      if (Number.isNaN(paymentDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid payment date",
        });
      }
    }

    // Calculate supplier balance before payment
    const previousLedger = await SupplierLedger.aggregate([
      {
        $match: {
          supplierId: supplier._id,
          $or: [
            {
              type: {
                $nin: ["PAYMENT", "COMMISSION_INVOICE"],
              },
            },
            {
              isVoided: { $ne: true },
            },
          ],
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

    const totalDebit = previousLedger[0]?.totalDebit || 0;
    const totalCredit = previousLedger[0]?.totalCredit || 0;

    const openingBalance = Number(supplier.openingBalance || 0);

    const balanceBefore = Number(
      (openingBalance + totalDebit - totalCredit).toFixed(2)
    );

    const paymentReference =
      reference || `SUPPLIER-PAYMENT-${Date.now()}`;

    const paymentDescription =
      description !== undefined
        ? String(description)
        : notes || "Supplier payment";

    // Create Supplier Payment
    createdPayment = await SupplierLedger.create({
      supplierId: supplier._id,
      type: "PAYMENT",
      amount: paymentAmount,
      debit: 0,
      credit: paymentAmount,
      balanceAfter: balanceBefore - paymentAmount,
      paymentMethod: method,
      accountId: selectedAccount?._id || null,
      transactionId: transactionId || "",
      reference: paymentReference,
      description: paymentDescription,
      createdBy: {
        adminId: req.admin?.adminId || null,
        name: req.admin?.name || "",
        username: req.admin?.username || "",
      },
      transactionDate: paymentDate,
    });

    // Create Account Ledger Withdrawal
    if (selectedAccount) {
      createdAccountLedger = await AccountLedger.create({
        accountId: selectedAccount._id,
        supplierPaymentId: createdPayment._id,
        transactionType: "WITHDRAWAL",
        direction: "OUT",
        amount: paymentAmount,
        reference: paymentReference,
        transactionId: transactionId || "",
        description: paymentDescription,
        transactionDate: paymentDate,
        createdBy: {
          adminId: req.admin?.adminId || null,
          name: req.admin?.name || "",
          username: req.admin?.username || "",
        },
      });
    }

    // Recalculate supplier balances
    await recalculateSupplierLedgerBalances(supplier._id);

    const updatedPayment = await SupplierLedger.findById(
      createdPayment._id
    );

    const balanceAfter = updatedPayment.balanceAfter;

    // Activity Log
    try {
      await ActivityLog.create({
        adminId: req.admin?.adminId || null,
        adminName: req.admin?.name || "",
        adminUsername: req.admin?.username || "",
        action: "SUPPLIER_PAYMENT",
        module: "SUPPLIER",
        description: `Supplier payment ৳${paymentAmount} - ${supplier.supplierName}`,
        targetId: supplier._id,
        targetName: supplier.supplierName,
        metadata: {
          amount: paymentAmount,
          paymentMethod: method,
          accountId: selectedAccount?._id || null,
          accountName: selectedAccount?.accountName || "",
          transactionId: transactionId || "",
          reference: paymentReference,
          transactionDate: paymentDate,
          balanceBefore,
          balanceAfter,
          notes: paymentDescription,
        },
      });
    } catch (activityError) {
      console.error(
        "Supplier Payment Activity Log Error:",
        activityError.message
      );
    }

    res.status(201).json({
      success: true,
      message: "Supplier payment recorded successfully",
      payment: updatedPayment,
      balanceBefore,
      balanceAfter,
    });
  } catch (error) {
    // Rollback Account Ledger if created
    if (createdAccountLedger?._id) {
      await AccountLedger.findByIdAndDelete(
        createdAccountLedger._id
      ).catch(() => {});
    }

    // Rollback Supplier Ledger if created
    if (createdPayment?._id) {
      await SupplierLedger.findByIdAndDelete(
        createdPayment._id
      ).catch(() => {});

      await recalculateSupplierLedgerBalances(
        createdPayment.supplierId
      ).catch((rollbackError) => {
        console.error(
          "Supplier Ledger Rollback Error:",
          rollbackError.message
        );
      });
    }

    console.error("Supplier Payment Error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});


// ======================================
// EDIT / CORRECT SUPPLIER PAYMENT
// PUT /api/suppliers/:id/payments/:paymentId
// ======================================


router.put("/:id/payments/:paymentId", async (req, res) => {
  let payment = null;
  let accountLedgers = [];
  let originalPayment = null;
  let originalAccountLedgers = [];

  let createdAccountLedgerId = null;
  let oldSupplierId = null;
  let targetSupplierId = null;

  try {
    const { id, paymentId } = req.params;

    if (
      !mongoose.Types.ObjectId.isValid(id) ||
      !mongoose.Types.ObjectId.isValid(paymentId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid supplier or payment ID",
      });
    }

    payment = await SupplierLedger.findById(paymentId);

    if (!payment || payment.type !== "PAYMENT") {
      return res.status(404).json({
        success: false,
        message: "Supplier payment not found",
      });
    }

    if (String(payment.supplierId) !== String(id)) {
      return res.status(400).json({
        success: false,
        message: "Payment does not belong to this supplier",
      });
    }

    if (payment.isVoided) {
      return res.status(400).json({
        success: false,
        message: "Voided payment cannot be edited",
      });
    }

    const {
      amount,
      paymentMethod,
      accountId,
      transactionId,
      reference,
      description,
      transactionDate,
      notes,
      supplierId: newSupplierId,
      reason,
    } = req.body;

    if (!String(reason || "").trim()) {
      return res.status(400).json({
        success: false,
        message: "Correction reason is required",
      });
    }

    oldSupplierId = payment.supplierId;
    targetSupplierId = newSupplierId || oldSupplierId;

    if (!mongoose.Types.ObjectId.isValid(targetSupplierId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid destination supplier ID",
      });
    }

    const targetSupplier = await Supplier.findById(targetSupplierId);

    if (!targetSupplier) {
      return res.status(404).json({
        success: false,
        message: "Destination supplier not found",
      });
    }

    // Validate amount
    const newAmount =
      amount !== undefined
        ? Number(amount)
        : Number(payment.amount);

    if (!Number.isFinite(newAmount) || newAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid payment amount is required",
      });
    }

    // Validate payment method
    const newMethod =
      paymentMethod !== undefined
        ? String(paymentMethod).toUpperCase()
        : payment.paymentMethod;

    if (!PAYMENT_METHODS.includes(newMethod)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment method",
      });
    }

    const methodChanged = newMethod !== payment.paymentMethod;

    let finalAccountId;

    if (accountId !== undefined) {
      finalAccountId = accountId || null;
    } else if (methodChanged) {
      finalAccountId = null;
    } else {
      finalAccountId = payment.accountId || null;
    }

    const accountRequiredMethods = ["CASH", "BANK", "BKASH"];

    if (
      accountRequiredMethods.includes(newMethod) &&
      !finalAccountId
    ) {
      return res.status(400).json({
        success: false,
        message: "Please select an account for this payment method",
      });
    }

    // Validate selected account
    let selectedAccount = null;

    if (finalAccountId) {
      if (!mongoose.Types.ObjectId.isValid(finalAccountId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid account ID",
        });
      }

      selectedAccount = await Account.findOne({
        _id: finalAccountId,
        isActive: true,
      });

      if (!selectedAccount) {
        return res.status(404).json({
          success: false,
          message: "Selected account not found or inactive",
        });
      }

      if (selectedAccount.accountType !== newMethod) {
        return res.status(400).json({
          success: false,
          message: "Selected account does not match payment method",
        });
      }
    }

    // Validate transaction date
    let newDate = payment.transactionDate;

    if (transactionDate !== undefined) {
      newDate = new Date(transactionDate);

      if (Number.isNaN(newDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid payment date",
        });
      }
    }

    const newTransactionId =
      transactionId !== undefined
        ? String(transactionId)
        : payment.transactionId || "";

    const newReference =
      reference !== undefined
        ? String(reference)
        : payment.reference || "";

    const newDescription =
      description !== undefined
        ? String(description)
        : notes !== undefined
          ? String(notes)
          : payment.description || "";

    // Find ALL linked Account Ledger records
    accountLedgers = await AccountLedger.find({
      supplierPaymentId: payment._id,
    }).sort({ createdAt: 1 });

    // Keep original documents for rollback
    originalPayment = payment.toObject();

    originalAccountLedgers = accountLedgers.map((item) =>
      item.toObject()
    );

    // Old values
    const oldValues = {
      supplierId: String(payment.supplierId),
      amount: payment.amount,
      paymentMethod: payment.paymentMethod,
      accountId: payment.accountId || null,
      transactionId: payment.transactionId || "",
      reference: payment.reference || "",
      transactionDate: payment.transactionDate,
      description: payment.description || "",
    };

    // New values
    const newValues = {
      supplierId: String(targetSupplierId),
      amount: newAmount,
      paymentMethod: newMethod,
      accountId: selectedAccount?._id || null,
      transactionId: newTransactionId,
      reference: newReference,
      transactionDate: newDate,
      description: newDescription,
    };

    // Save correction history
    payment.correctionHistory.push({
      correctedAt: new Date(),
      correctedBy: {
        adminId: req.admin?.adminId || null,
        name: req.admin?.name || "",
        username: req.admin?.username || "",
      },
      reason: String(reason).trim(),
      oldValues,
      newValues,
    });

    // Update Supplier Ledger
    payment.supplierId = targetSupplierId;
    payment.amount = newAmount;
    payment.debit = 0;
    payment.credit = newAmount;
    payment.paymentMethod = newMethod;
    payment.accountId = selectedAccount?._id || null;
    payment.transactionId = newTransactionId;
    payment.reference = newReference;
    payment.transactionDate = newDate;
    payment.description = newDescription;

    await payment.save();

    // =====================================
    // FIX: Keep only ONE active Account Ledger
    // =====================================

    if (selectedAccount) {
      // Prefer an existing active record
      let mainLedger = accountLedgers.find(
        (item) => !item.isVoided
      );

      // If no record exists, reuse an old voided record
      if (!mainLedger && accountLedgers.length > 0) {
        mainLedger = accountLedgers[0];
      }

      // If no linked record exists, create one
      if (!mainLedger) {
        mainLedger = new AccountLedger({
          supplierPaymentId: payment._id,
        });

        createdAccountLedgerId = mainLedger._id;
      }

      // Update the main withdrawal
      mainLedger.accountId = selectedAccount._id;
      mainLedger.supplierPaymentId = payment._id;
      mainLedger.transactionType = "WITHDRAWAL";
      mainLedger.direction = "OUT";
      mainLedger.amount = newAmount;
      mainLedger.reference = newReference;
      mainLedger.transactionId = newTransactionId;
      mainLedger.description = newDescription;
      mainLedger.transactionDate = newDate;

      mainLedger.isVoided = false;
      mainLedger.voidedAt = null;
      mainLedger.voidReason = "";

      await mainLedger.save();

      // Void every extra linked withdrawal
      for (const extraLedger of accountLedgers) {
        if (
          String(extraLedger._id) !==
          String(mainLedger._id)
        ) {
          extraLedger.isVoided = true;
          extraLedger.voidedAt = new Date();
          extraLedger.voidReason =
            "Duplicate supplier payment ledger entry";

          await extraLedger.save();
        }
      }
    } else {
      // No account selected: void ALL linked withdrawals
      for (const ledger of accountLedgers) {
        if (!ledger.isVoided) {
          ledger.isVoided = true;
          ledger.voidedAt = new Date();
          ledger.voidReason =
            "Supplier payment account selection removed during correction";

          await ledger.save();
        }
      }
    }

    // Recalculate supplier balances
    await recalculateSupplierLedgerBalances(oldSupplierId);

    if (String(oldSupplierId) !== String(targetSupplierId)) {
      await recalculateSupplierLedgerBalances(targetSupplierId);
    }

    // Activity Log
    try {
      await ActivityLog.create({
        adminId: req.admin?.adminId || null,
        adminName: req.admin?.name || "",
        adminUsername: req.admin?.username || "",
        action: "SUPPLIER_PAYMENT_CORRECTED",
        module: "SUPPLIER",
        description: `Supplier payment corrected - ${targetSupplier.supplierName}`,
        targetId: payment._id,
        targetName: targetSupplier.supplierName,
        metadata: {
          reason: String(reason).trim(),
          oldValues,
          newValues,
        },
      });
    } catch (activityError) {
      console.error(
        "Payment Correction Activity Error:",
        activityError.message
      );
    }

    const updatedPayment = await SupplierLedger.findById(
      payment._id
    );

    return res.json({
      success: true,
      message: "Supplier payment corrected successfully",
      payment: updatedPayment,
    });

  } catch (error) {
    console.error("Supplier Payment Correction Error:", error);

    // Rollback newly created Account Ledger
    if (createdAccountLedgerId) {
      await AccountLedger.findByIdAndDelete(
        createdAccountLedgerId
      ).catch(() => {});
    }

    // Restore original Account Ledger records
    for (const originalLedger of originalAccountLedgers) {
      await AccountLedger.replaceOne(
        { _id: originalLedger._id },
        originalLedger
      ).catch((rollbackError) => {
        console.error(
          "Account Ledger Rollback Error:",
          rollbackError.message
        );
      });
    }

    // Rollback Supplier Ledger
    if (originalPayment?._id) {
      await SupplierLedger.replaceOne(
        { _id: originalPayment._id },
        originalPayment
      ).catch((rollbackError) => {
        console.error(
          "Supplier Payment Rollback Error:",
          rollbackError.message
        );
      });

      await recalculateSupplierLedgerBalances(
        oldSupplierId
      ).catch(() => {});

      if (
        targetSupplierId &&
        String(oldSupplierId) !== String(targetSupplierId)
      ) {
        await recalculateSupplierLedgerBalances(
          targetSupplierId
        ).catch(() => {});
      }
    }

    return res.status(500).json({
      success: false,
      message:
        error.message || "Supplier payment correction failed",
    });
  }
});




// ======================================
// VOID / CANCEL SUPPLIER PAYMENT
// PATCH /api/suppliers/:id/payments/:paymentId/void
// ======================================

router.patch("/:id/payments/:paymentId/void", async (req, res) => {
  try {
    const { id, paymentId } = req.params;
    const { reason } = req.body;

    if (
      !mongoose.Types.ObjectId.isValid(id) ||
      !mongoose.Types.ObjectId.isValid(paymentId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid supplier or payment ID",
      });
    }

    if (!String(reason || "").trim()) {
      return res.status(400).json({
        success: false,
        message: "Void reason is required",
      });
    }

    const payment = await SupplierLedger.findById(paymentId);

    if (!payment || payment.type !== "PAYMENT") {
      return res.status(404).json({
        success: false,
        message: "Supplier payment not found",
      });
    }

    if (String(payment.supplierId) !== String(id)) {
      return res.status(400).json({
        success: false,
        message: "Payment does not belong to this supplier",
      });
    }

    if (payment.isVoided) {
      return res.status(400).json({
        success: false,
        message: "Payment is already voided",
      });
    }

    const supplier = await Supplier.findById(id);

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: "Supplier not found",
      });
    }

    const oldValues = {
      amount: payment.amount,
      credit: payment.credit,
      paymentMethod: payment.paymentMethod,
      accountId: payment.accountId || null,
      transactionId: payment.transactionId,
      transactionDate: payment.transactionDate,
      description: payment.description,
    };

    // Void Supplier Ledger Payment
    payment.isVoided = true;
    payment.voidedAt = new Date();

    payment.voidedBy = {
      adminId: req.admin?.adminId || null,
      name: req.admin?.name || "",
      username: req.admin?.username || "",
    };

    payment.voidReason = String(reason).trim();

    await payment.save();

    // Void linked Account Ledger Withdrawal
    const accountLedger = await AccountLedger.findOne({
      supplierPaymentId: payment._id,
    });

    if (accountLedger && !accountLedger.isVoided) {
      accountLedger.isVoided = true;
      accountLedger.voidedAt = new Date();
      accountLedger.voidReason = String(reason).trim();

      await accountLedger.save();
    }

    await recalculateSupplierLedgerBalances(supplier._id);

    // Activity Log
    try {
      await ActivityLog.create({
        adminId: req.admin?.adminId || null,
        adminName: req.admin?.name || "",
        adminUsername: req.admin?.username || "",
        action: "SUPPLIER_PAYMENT_VOIDED",
        module: "SUPPLIER",
        description: `Supplier payment voided - ${supplier.supplierName}`,
        targetId: payment._id,
        targetName: supplier.supplierName,
        metadata: {
          reason: String(reason).trim(),
          oldValues,
          amount: payment.amount,
        },
      });
    } catch (activityError) {
      console.error(
        "Payment Void Activity Error:",
        activityError.message
      );
    }

    res.json({
      success: true,
      message: "Supplier payment voided successfully",
      payment,
    });
  } catch (error) {
    console.error("Supplier Payment Void Error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});



// ======================================
// GET SUPPLIER LEDGER
// GET /api/suppliers/:id/ledger
// ======================================


router.get("/:id/ledger", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid supplier ID",
      });
    }

    const supplier = await Supplier.findById(id);

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: "Supplier not found",
      });
    }

    // ======================================
    // FILTER PARAMETERS
    // ======================================
    const {
      startDate,
      endDate,
      type,
      paymentMethod,
      search,
      minAmount,
      maxAmount,
    } = req.query;

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(
      100,
      Math.max(1, Number(req.query.limit) || 50)
    );

    const skip = (page - 1) * limit;

    // ======================================
    // BASE QUERY
    // ======================================
    const filter = {
      supplierId: supplier._id,
    };

    // Transaction Type
   const allowedTypes = [
  "PURCHASE",
  "PURCHASE_RETURN",
  "PAYMENT",
  "ADJUSTMENT",
  "COMMISSION_INVOICE",
];

    if (type && allowedTypes.includes(type)) {
      filter.type = type;
    }

    // Payment Method
    const allowedMethods = [
      "CASH",
      "BANK",
      "BKASH",
      "NAGAD",
      "ROCKET",
      "OTHER",
    ];

    if (paymentMethod && allowedMethods.includes(paymentMethod)) {
      filter.paymentMethod = paymentMethod;
    }

    // Date Filter
    if (startDate || endDate) {
      filter.transactionDate = {};

      if (startDate) {
        const start = new Date(`${startDate}T00:00:00.000+06:00`);

        if (Number.isNaN(start.getTime())) {
          return res.status(400).json({
            success: false,
            message: "Invalid start date",
          });
        }

        filter.transactionDate.$gte = start;
      }

      if (endDate) {
        const end = new Date(`${endDate}T23:59:59.999+06:00`);

        if (Number.isNaN(end.getTime())) {
          return res.status(400).json({
            success: false,
            message: "Invalid end date",
          });
        }

        filter.transactionDate.$lte = end;
      }
    }

    // Amount Filter
    if (minAmount !== undefined || maxAmount !== undefined) {
      const amountConditions = {};

      if (minAmount !== undefined && minAmount !== "") {
        const min = Number(minAmount);

        if (!Number.isFinite(min) || min < 0) {
          return res.status(400).json({
            success: false,
            message: "Invalid minimum amount",
          });
        }

        amountConditions.$gte = min;
      }

      if (maxAmount !== undefined && maxAmount !== "") {
        const max = Number(maxAmount);

        if (!Number.isFinite(max) || max < 0) {
          return res.status(400).json({
            success: false,
            message: "Invalid maximum amount",
          });
        }

        amountConditions.$lte = max;
      }

      if (
        amountConditions.$gte !== undefined &&
        amountConditions.$lte !== undefined &&
        amountConditions.$gte > amountConditions.$lte
      ) {
        return res.status(400).json({
          success: false,
          message: "Minimum amount cannot exceed maximum amount",
        });
      }

      filter.$or = [
        { amount: amountConditions },
        { debit: amountConditions },
        { credit: amountConditions },
      ];
    }

    // ======================================
    // SEARCH FILTER
    // Lot Number, Transaction ID, Reference,
    // Description
    // ======================================
    if (search && search.trim()) {
      const keyword = search.trim();

      const escapedKeyword = keyword.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      );

      const regex = new RegExp(escapedKeyword, "i");

      const matchingLots = await Lot.find({
        lotCode: regex,
      }).select("_id");

      const searchConditions = [
        { transactionId: regex },
        { reference: regex },
        { description: regex },
      ];

      if (matchingLots.length > 0) {
        searchConditions.push({
          lotId: {
            $in: matchingLots.map((lot) => lot._id),
          },
        });
      }

      if (filter.$or) {
        filter.$and = [
          { $or: filter.$or },
          { $or: searchConditions },
        ];

        delete filter.$or;
      } else {
        filter.$or = searchConditions;
      }
    }

    // ======================================
    // PAGINATED TRANSACTIONS
    // ======================================
    const [transactions, totalTransactions] = await Promise.all([
      SupplierLedger.find(filter)
        .populate({
          path: "lotId",
          select: "lotCode productName",
        })
        .sort({
          transactionDate: 1,
          createdAt: 1,
          _id: 1,
        })
        .skip(skip)
        .limit(limit),

      SupplierLedger.countDocuments(filter),
    ]);

    // ======================================
    // FILTERED SUMMARY
    // Voided payments excluded
    // ======================================
    const filteredSummary = await SupplierLedger.aggregate([
      {
        $match: {
          ...filter,
          $and: [
            ...(filter.$and || []),
            {
              $or: [
  {
    type: {
      $nin: ["PAYMENT", "COMMISSION_INVOICE"],
    },
  },
  { isVoided: { $ne: true } },
]
            },
          ],
        },
      },
      {
        $group: {
          _id: null,
          totalDebit: { $sum: "$debit" },
          totalCredit: { $sum: "$credit" },
          totalTransactions: { $sum: 1 },
        },
      },
    ]);

    const summary = filteredSummary[0] || {
      totalDebit: 0,
      totalCredit: 0,
      totalTransactions: 0,
    };

    // ======================================
    // OVERALL SUPPLIER BALANCE
    // Always calculated from full history
    // ======================================
    const overallSummary = await SupplierLedger.aggregate([
      {
        $match: {
          supplierId: supplier._id,
      $or: [
  {
    type: {
      $nin: ["PAYMENT", "COMMISSION_INVOICE"],
    },
  },
  { isVoided: { $ne: true } },
]
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

    const overall = overallSummary[0] || {
      totalDebit: 0,
      totalCredit: 0,
    };

    const openingBalance = Number(supplier.openingBalance || 0);

    const totalDebit = Number(overall.totalDebit || 0);
    const totalCredit = Number(overall.totalCredit || 0);

    const currentBalance =
      openingBalance + totalDebit - totalCredit;

    // ======================================
    // RESPONSE
    // ======================================
    res.json({
      success: true,
      supplier,

      openingBalance,
      totalDebit,
      totalCredit,
      currentBalance,

      filteredSummary: {
        totalDebit: Number(summary.totalDebit || 0),
        totalCredit: Number(summary.totalCredit || 0),
        totalTransactions: Number(summary.totalTransactions || 0),
      },

      transactions,

      pagination: {
        page,
        limit,
        totalTransactions,
        totalPages: Math.ceil(totalTransactions / limit),
        hasNextPage: page * limit < totalTransactions,
        hasPrevPage: page > 1,
      },
    });

  } catch (error) {
    console.error("Supplier Ledger Error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});


// ======================================
// GET ALL SUPPLIERS TRANSACTION REPORT
// GET /api/suppliers/all-report
// ======================================

router.get("/all-report", async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      supplierId,
      type,
      paymentMethod,
      minAmount,
      maxAmount,
      search,
    } = req.query;

    const filter = {};

    // Supplier Filter
    if (supplierId) {
      if (!mongoose.Types.ObjectId.isValid(supplierId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid supplier ID",
        });
      }

      filter.supplierId = new mongoose.Types.ObjectId(supplierId);
    }

    // Transaction Type
 const allowedTypes = [
  "PURCHASE",
  "PURCHASE_RETURN",
  "PAYMENT",
  "ADJUSTMENT",
  "COMMISSION_INVOICE",
];

    if (type && allowedTypes.includes(type)) {
      filter.type = type;
    }

    // Payment Method
    if (paymentMethod && PAYMENT_METHODS.includes(paymentMethod)) {
      filter.paymentMethod = paymentMethod;
    }

    // Date Filter (Bangladesh Time)
    if (startDate || endDate) {
      filter.transactionDate = {};

      if (startDate) {
        const start = new Date(
          `${startDate}T00:00:00.000+06:00`
        );

        if (Number.isNaN(start.getTime())) {
          return res.status(400).json({
            success: false,
            message: "Invalid start date",
          });
        }

        filter.transactionDate.$gte = start;
      }

      if (endDate) {
        const end = new Date(
          `${endDate}T23:59:59.999+06:00`
        );

        if (Number.isNaN(end.getTime())) {
          return res.status(400).json({
            success: false,
            message: "Invalid end date",
          });
        }

        filter.transactionDate.$lte = end;
      }

      if (
        filter.transactionDate.$gte &&
        filter.transactionDate.$lte &&
        filter.transactionDate.$gte > filter.transactionDate.$lte
      ) {
        return res.status(400).json({
          success: false,
          message: "Start date cannot be after end date",
        });
      }
    }

    // Amount Filter
    if (
      (minAmount !== undefined && minAmount !== "") ||
      (maxAmount !== undefined && maxAmount !== "")
    ) {
      const amountConditions = {};

      if (minAmount !== undefined && minAmount !== "") {
        const min = Number(minAmount);

        if (!Number.isFinite(min) || min < 0) {
          return res.status(400).json({
            success: false,
            message: "Invalid minimum amount",
          });
        }

        amountConditions.$gte = min;
      }

      if (maxAmount !== undefined && maxAmount !== "") {
        const max = Number(maxAmount);

        if (!Number.isFinite(max) || max < 0) {
          return res.status(400).json({
            success: false,
            message: "Invalid maximum amount",
          });
        }

        amountConditions.$lte = max;
      }

      if (
        amountConditions.$gte !== undefined &&
        amountConditions.$lte !== undefined &&
        amountConditions.$gte > amountConditions.$lte
      ) {
        return res.status(400).json({
          success: false,
          message: "Minimum amount cannot exceed maximum amount",
        });
      }

      filter.$or = [
        { amount: amountConditions },
        { debit: amountConditions },
        { credit: amountConditions },
      ];
    }

    // Search Supplier, Transaction ID, Reference,
    // Description and Lot Number
    if (search && search.trim()) {
      const keyword = search.trim();

      const escapedKeyword = keyword.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      );

      const regex = new RegExp(escapedKeyword, "i");

      const matchingSuppliers = await Supplier.find({
        $or: [
          { supplierName: regex },
          { companyName: regex },
          { mobile: regex },
        ],
      }).select("_id");

      const matchingLots = await Lot.find({
        lotCode: regex,
      }).select("_id");

      const searchConditions = [
        { transactionId: regex },
        { reference: regex },
        { description: regex },
      ];

      if (matchingSuppliers.length > 0) {
        searchConditions.push({
          supplierId: {
            $in: matchingSuppliers.map((item) => item._id),
          },
        });
      }

      if (matchingLots.length > 0) {
        searchConditions.push({
          lotId: {
            $in: matchingLots.map((item) => item._id),
          },
        });
      }

      if (filter.$or) {
        filter.$and = [
          { $or: filter.$or },
          { $or: searchConditions },
        ];

        delete filter.$or;
      } else {
        filter.$or = searchConditions;
      }
    }

    // Get All Matching Transactions
    const transactions = await SupplierLedger.find(filter)
      .populate({
        path: "supplierId",
        select: "supplierName companyName mobile address",
      })
      .populate({
        path: "lotId",
        select: "lotCode",
      })
      .sort({
        transactionDate: 1,
        createdAt: 1,
        _id: 1,
      })
      .lean();

    // Report Summary
    const summary = {
      totalTransactions: transactions.length,
      totalPurchase: 0,
      totalPayment: 0,
      totalPurchaseReturn: 0,
      totalAdjustmentDebit: 0,
      totalAdjustmentCredit: 0,
      totalDebit: 0,
      totalCredit: 0,
      totalVoidedPayment: 0,
      supplierCount: 0,
    };

    const supplierMap = new Map();

    const reportTransactions = transactions.map((item) => {
      
const isVoided =
  item.isVoided === true &&
  ["PAYMENT", "COMMISSION_INVOICE"].includes(item.type);
  
      const debit = isVoided
        ? 0
        : Number(item.debit || 0);

      const credit = isVoided
        ? 0
        : Number(item.credit || 0);

      const amount = Number(item.amount || 0);

      summary.totalDebit += debit;
      summary.totalCredit += credit;

      if (isVoided) {
        summary.totalVoidedPayment += amount;
      }

      if (item.type === "PURCHASE") {
        summary.totalPurchase += debit;
      }

      if (item.type === "PAYMENT" && !isVoided) {
        summary.totalPayment += credit;
      }

      if (item.type === "PURCHASE_RETURN") {
        summary.totalPurchaseReturn += credit;
      }

      if (item.type === "ADJUSTMENT") {
        summary.totalAdjustmentDebit += debit;
        summary.totalAdjustmentCredit += credit;
      }

      const supplier = item.supplierId;
      const key = supplier
        ? String(supplier._id)
        : "UNKNOWN";

      if (!supplierMap.has(key)) {
        supplierMap.set(key, {
          supplierId: supplier?._id || null,
          supplierName: supplier?.supplierName || "Unknown Supplier",
          mobile: supplier?.mobile || "",
          address: supplier?.address || "",
          transactionCount: 0,
          totalPurchase: 0,
          totalPayment: 0,
          totalPurchaseReturn: 0,
          totalDebit: 0,
          totalCredit: 0,
        });
      }

      const supplierSummary = supplierMap.get(key);

      supplierSummary.transactionCount += 1;
      supplierSummary.totalDebit += debit;
      supplierSummary.totalCredit += credit;

      if (item.type === "PURCHASE") {
        supplierSummary.totalPurchase += debit;
      }

      if (item.type === "PAYMENT" && !isVoided) {
        supplierSummary.totalPayment += credit;
      }

      if (item.type === "PURCHASE_RETURN") {
        supplierSummary.totalPurchaseReturn += credit;
      }

      return {
        ...item,
        isVoided,
        debit,
        credit,
        supplierName: supplier?.supplierName || "Unknown Supplier",
        lotCode: item.lotId?.lotCode || "",
      };
    });

    // Format Supplier Summary
    const supplierSummary = Array.from(
      supplierMap.values()
    ).map((item) => ({
      ...item,
      totalPurchase: Number(item.totalPurchase.toFixed(2)),
      totalPayment: Number(item.totalPayment.toFixed(2)),
      totalPurchaseReturn: Number(
        item.totalPurchaseReturn.toFixed(2)
      ),
      totalDebit: Number(item.totalDebit.toFixed(2)),
      totalCredit: Number(item.totalCredit.toFixed(2)),
    }));

    summary.supplierCount = supplierSummary.length;

    // Round Summary Values
    Object.keys(summary).forEach((key) => {
      if (key !== "totalTransactions" && key !== "supplierCount") {
        summary[key] = Number(summary[key].toFixed(2));
      }
    });

    res.json({
      success: true,
      filters: {
        startDate: startDate || "",
        endDate: endDate || "",
        supplierId: supplierId || "",
        type: type || "",
        paymentMethod: paymentMethod || "",
        minAmount: minAmount || "",
        maxAmount: maxAmount || "",
        search: search || "",
      },
      summary,
      supplierSummary,
      transactions: reportTransactions,
    });
  } catch (error) {
    console.error("All Supplier Report Error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});


// ======================================
// GET SINGLE SUPPLIER
// GET /api/suppliers/:id
// ======================================
router.get("/:id", async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id);

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: "Supplier not found",
      });
    }

    res.json({
      success: true,
      supplier,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Invalid supplier ID",
    });
  }
});

// ======================================
// UPDATE SUPPLIER
// PUT /api/suppliers/:id
// ======================================
router.put("/:id", async (req, res) => {
  try {
    const supplier = await Supplier.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: "Supplier not found",
      });
    }

    res.json({
      success: true,
      message: "Supplier updated successfully",
      supplier,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

// ======================================
// DELETE SUPPLIER
// ======================================
router.delete("/:id", async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id);

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: "Supplier not found",
      });
    }

    const hasLedger = await SupplierLedger.exists({
      supplierId: supplier._id,
    });

    if (hasLedger) {
      return res.status(400).json({
        success: false,
        message:
          "এই Supplier-এর লেনদেন আছে। Delete না করে Deactivate করুন।",
      });
    }

    await Supplier.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "Supplier deleted successfully",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

export default router;
