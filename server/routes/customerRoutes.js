
import express from "express";
import mongoose from "mongoose";
import Customer from "../models/Customer.js";
import CustomerLedger from "../models/CustomerLedger.js";
import ActivityLog from "../models/ActivityLog.js";

const router = express.Router();

const PAYMENT_METHODS = [
  "CASH",
  "BANK",
  "BKASH",
  "NAGAD",
  "ROCKET",
  "OTHER",
];

// ========================================
// RECALCULATE CUSTOMER LEDGER BALANCES
// ========================================


async function recalculateCustomerLedgerBalances(customerId) {
  if (!customerId) return;

  const customer = await Customer.findById(customerId);
  if (!customer) return;

  const transactions = await CustomerLedger.find({
    customerId,
  }).sort({
    transactionDate: 1,
    createdAt: 1,
    _id: 1,
  });

  let balance = Number(customer.openingBalance || 0);

  const bulkOperations = [];

  for (const transaction of transactions) {
    // সব ধরনের Voided Transaction বাদ যাবে
    if (transaction.isVoided === true) {
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
    await CustomerLedger.bulkWrite(bulkOperations);
  }

  return Number(balance.toFixed(2));
}


// ========================================
// ADD NEW CUSTOMER
// ========================================

router.post("/", async (req, res) => {
  try {
    const {
      customerName,
      companyName,
      contactPerson,
      mobile,
      alternateMobile,
      address,
      customerType,
      openingBalance,
      notes,
    } = req.body;

    if (!customerName || !customerName.trim()) {
      return res.status(400).json({
        success: false,
        message: "Customer name is required",
      });
    }

    const validCustomerTypes = [
      "REGULAR",
      "WHOLESALE",
      "RETAIL",
    ];

    const selectedType = customerType || "REGULAR";

    if (!validCustomerTypes.includes(selectedType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid customer type",
      });
    }

    const initialBalance = Number(openingBalance || 0);

    if (!Number.isFinite(initialBalance)) {
      return res.status(400).json({
        success: false,
        message: "Invalid opening balance",
      });
    }

    const customer = await Customer.create({
      customerName: customerName.trim(),
      companyName,
      contactPerson,
      mobile,
      alternateMobile,
      address,
      customerType: selectedType,
      openingBalance: initialBalance,
      notes,
    });

    res.status(201).json({
      success: true,
      message: "Customer added successfully",
      customer,
    });
  } catch (error) {
    console.error("Add Customer Error:", error);

    res.status(500).json({
      success: false,
      message: error.message || "Failed to add customer",
    });
  }
});

// ========================================
// GET ALL CUSTOMERS
// ========================================

router.get("/", async (req, res) => {
  try {
    const customers = await Customer.find()
      .sort({ createdAt: -1 })
      .lean();

    const ledgerSummary = await CustomerLedger.aggregate([
      {
     $match: {
  isVoided: { $ne: true },
},
      },
      {
        $group: {
          _id: "$customerId",
          totalDebit: { $sum: "$debit" },
          totalCredit: { $sum: "$credit" },
        },
      },
    ]);



    const summaryMap = new Map();

    ledgerSummary.forEach((item) => {
      summaryMap.set(
        String(item._id),
        item
      );
    });

    const customersWithBalance = customers.map((customer) => {
      const summary = summaryMap.get(
        String(customer._id)
      );

      const totalDebit = Number(
        summary?.totalDebit || 0
      );

      const totalCredit = Number(
        summary?.totalCredit || 0
      );

      const currentBalance =
        Number(customer.openingBalance || 0) +
        totalDebit -
        totalCredit;

      return {
        ...customer,
        totalDebit,
        totalCredit,
        currentBalance: Number(
          currentBalance.toFixed(2)
        ),
      };
    });

    res.json({
      success: true,
      customers: customersWithBalance,
      totalCustomers: customersWithBalance.length,
    });
  } catch (error) {
    console.error("Get Customers Error:", error);

    res.status(500).json({
      success: false,
      message: error.message || "Failed to load customers",
    });
  }
});

// ========================================
// ALL CUSTOMER REPORT
// ========================================

router.get("/all-report", async (req, res) => {
  try {
  
    const {
      startDate,
      endDate,
      customerId,
      type,
      paymentMethod,
      minAmount,
      maxAmount,
      search,
    } = req.query;

    const match = {};

match.isVoided = { $ne: true };

    if (customerId) {
      if (!mongoose.Types.ObjectId.isValid(customerId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid customer ID",
        });
      }

      match.customerId = new mongoose.Types.ObjectId(customerId);
    }

    if (type) match.type = type;

    if (paymentMethod) {
      match.paymentMethod = paymentMethod;
    }

    if (startDate || endDate) {
      match.transactionDate = {};

      if (startDate) {
        const start = new Date(startDate);

        if (Number.isNaN(start.getTime())) {
          return res.status(400).json({
            success: false,
            message: "Invalid start date",
          });
        }

        start.setHours(0, 0, 0, 0);
        match.transactionDate.$gte = start;
      }

      if (endDate) {
        const end = new Date(endDate);

        if (Number.isNaN(end.getTime())) {
          return res.status(400).json({
            success: false,
            message: "Invalid end date",
          });
        }

        end.setHours(23, 59, 59, 999);
        match.transactionDate.$lte = end;
      }
    }

    if (minAmount !== undefined && minAmount !== "") {
      match.amount = {
        ...(match.amount || {}),
        $gte: Number(minAmount),
      };
    }

    if (maxAmount !== undefined && maxAmount !== "") {
      match.amount = {
        ...(match.amount || {}),
        $lte: Number(maxAmount),
      };
    }

    if (
      match.amount &&
      Object.values(match.amount).some(
        (value) => !Number.isFinite(value)
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid amount filter",
      });
    }

    const pipeline = [
      { $match: match },

      {
        $lookup: {
          from: "customers",
          localField: "customerId",
          foreignField: "_id",
          as: "customer",
        },
      },

      {
        $unwind: {
          path: "$customer",
          preserveNullAndEmptyArrays: true,
        },
      },
    ];

    if (search && search.trim()) {
      const escapedSearch = search.trim().replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      );

      const regex = new RegExp(escapedSearch, "i");

      pipeline.push({
        $match: {
          $or: [
            { "customer.customerName": regex },
            { "customer.companyName": regex },
            { "customer.mobile": regex },
            { transactionId: regex },
            { reference: regex },
            { description: regex },
          ],
        },
      });
    }

    pipeline.push({
      $sort: {
        transactionDate: -1,
        createdAt: -1,
      },
    });

    const transactions = await CustomerLedger.aggregate(
      pipeline
    );

    const validTransactions = transactions.filter(
      (transaction) =>
        !(
          transaction.type === "PAYMENT" &&
          transaction.isVoided === true
        )
    );

    const totalDebit = validTransactions.reduce(
      (sum, item) => sum + Number(item.debit || 0),
      0
    );

    const totalCredit = validTransactions.reduce(
      (sum, item) => sum + Number(item.credit || 0),
      0
    );

    const totalSales = validTransactions
      .filter((item) => item.type === "SALE")
      .reduce((sum, item) => sum + Number(item.debit || 0), 0);

    const totalPayments = validTransactions
      .filter((item) => item.type === "PAYMENT")
      .reduce((sum, item) => sum + Number(item.credit || 0), 0);

    const totalSalesReturn = validTransactions
      .filter((item) => item.type === "SALE_RETURN")
      .reduce((sum, item) => sum + Number(item.credit || 0), 0);

    const customerMap = new Map();

    for (const item of transactions) {
      if (!item.customer) continue;

      const key = String(item.customerId);

      if (!customerMap.has(key)) {
        customerMap.set(key, {
          customerId: item.customerId,
          customerName: item.customer.customerName,
          companyName: item.customer.companyName,
          mobile: item.customer.mobile,
          totalTransactions: 0,
          totalDebit: 0,
          totalCredit: 0,
        });
      }

      const summary = customerMap.get(key);

      summary.totalTransactions++;

      if (
        !(
          item.type === "PAYMENT" &&
          item.isVoided === true
        )
      ) {
        summary.totalDebit += Number(item.debit || 0);
        summary.totalCredit += Number(item.credit || 0);
      }
    }

    const customerSummary = Array.from(
      customerMap.values()
    ).map((item) => ({
      ...item,
      currentBalance: Number(
        (item.totalDebit - item.totalCredit).toFixed(2)
      ),
      totalDebit: Number(item.totalDebit.toFixed(2)),
      totalCredit: Number(item.totalCredit.toFixed(2)),
    }));

    res.json({
      success: true,
      summary: {
        totalTransactions: transactions.length,
        totalSales: Number(totalSales.toFixed(2)),
        totalPayments: Number(totalPayments.toFixed(2)),
        totalSalesReturn: Number(totalSalesReturn.toFixed(2)),
        totalDebit: Number(totalDebit.toFixed(2)),
        totalCredit: Number(totalCredit.toFixed(2)),
      },
      customerSummary,
      transactions,
    });
  } catch (error) {
    console.error("All Customer Report Error:", error);

    res.status(500).json({
      success: false,
      message: error.message || "Failed to load all customer report",
    });
  }
});

// ========================================
// GET SINGLE CUSTOMER
// ========================================

router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid customer ID",
      });
    }

    const customer = await Customer.findById(id).lean();

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    
const summary = await CustomerLedger.aggregate([
  {
    $match: {
      customerId: new mongoose.Types.ObjectId(id),
      isVoided: { $ne: true },
    },
  },
  {
    $group: {
      _id: null,
      totalDebit: {
        $sum: { $ifNull: ["$debit", 0] },
      },
      totalCredit: {
        $sum: { $ifNull: ["$credit", 0] },
      },
    },
  },
]);

    const totalDebit = Number(summary[0]?.totalDebit || 0);
    const totalCredit = Number(summary[0]?.totalCredit || 0);

    const currentBalance =
      Number(customer.openingBalance || 0) +
      totalDebit -
      totalCredit;

    res.json({
      success: true,
      customer: {
        ...customer,
        totalDebit,
        totalCredit,
        currentBalance: Number(currentBalance.toFixed(2)),
      },
    });
  } catch (error) {
    console.error("Get Single Customer Error:", error);

    res.status(500).json({
      success: false,
      message: error.message || "Failed to load customer",
    });
  }
});


// ========================================
// UPDATE CUSTOMER
// ========================================

router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid customer ID",
      });
    }

    const {
      customerName,
      companyName,
      contactPerson,
      mobile,
      alternateMobile,
      address,
      customerType,
      openingBalance,
      notes,
      isActive,
    } = req.body;

    if (
      customerName !== undefined &&
      !String(customerName).trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Customer name is required",
      });
    }

    if (
      customerType !== undefined &&
      !["REGULAR", "WHOLESALE", "RETAIL"].includes(customerType)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid customer type",
      });
    }

    if (
      openingBalance !== undefined &&
      !Number.isFinite(Number(openingBalance))
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid opening balance",
      });
    }

    const updateData = {};

    if (customerName !== undefined)
      updateData.customerName = String(customerName).trim();

    if (companyName !== undefined)
      updateData.companyName = companyName;

    if (contactPerson !== undefined)
      updateData.contactPerson = contactPerson;

    if (mobile !== undefined)
      updateData.mobile = mobile;

    if (alternateMobile !== undefined)
      updateData.alternateMobile = alternateMobile;

    if (address !== undefined)
      updateData.address = address;

    if (customerType !== undefined)
      updateData.customerType = customerType;

    if (openingBalance !== undefined)
      updateData.openingBalance = Number(openingBalance);

    if (notes !== undefined)
      updateData.notes = notes;

    if (isActive !== undefined)
      updateData.isActive = isActive;

    const customer = await Customer.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    await recalculateCustomerLedgerBalances(id);

    res.json({
      success: true,
      message: "Customer updated successfully",
      customer,
    });
  } catch (error) {
    console.error("Update Customer Error:", error);

    res.status(500).json({
      success: false,
      message: error.message || "Failed to update customer",
    });
  }
});

// ========================================
// DELETE CUSTOMER
// ========================================

router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid customer ID",
      });
    }

    const customer = await Customer.findById(id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    const hasTransactions = await CustomerLedger.exists({
      customerId: id,
    });

    if (hasTransactions) {
      return res.status(400).json({
        success: false,
        message:
          "This customer has transaction history. Please deactivate instead of deleting.",
      });
    }

    await Customer.findByIdAndDelete(id);

    res.json({
      success: true,
      message: "Customer deleted successfully",
    });
  } catch (error) {
    console.error("Delete Customer Error:", error);

    res.status(500).json({
      success: false,
      message: error.message || "Failed to delete customer",
    });
  }
});

// ========================================
// ADD CUSTOMER PAYMENT
// ========================================

router.post("/:id/payments", async (req, res) => {
  try {
    const { id } = req.params;

    const {
      amount,
      paymentMethod,
      transactionId,
      reference,
      description,
      transactionDate,
    } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid customer ID",
      });
    }

    const customer = await Customer.findById(id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    const paymentAmount = Number(amount);

    if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Payment amount must be greater than zero",
      });
    }

    if (!PAYMENT_METHODS.includes(paymentMethod)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment method",
      });
    }

    const payment = await CustomerLedger.create({
      customerId: id,
      type: "PAYMENT",
      amount: paymentAmount,
      debit: 0,
      credit: paymentAmount,
      paymentMethod,
      transactionId: transactionId || "",
      reference: reference || "",
      description: description || "Customer payment",
      transactionDate: transactionDate
        ? new Date(transactionDate)
        : new Date(),
    });

    await recalculateCustomerLedgerBalances(id);

    res.status(201).json({
      success: true,
      message: "Customer payment added successfully",
      payment,
    });
  } catch (error) {
    console.error("Add Customer Payment Error:", error);

    res.status(500).json({
      success: false,
      message: error.message || "Failed to add customer payment",
    });
  }
});
// ========================================
// EDIT CUSTOMER PAYMENT
// ========================================

router.put("/:id/payments/:paymentId", async (req, res) => {
  try {
    const { id, paymentId } = req.params;

    const {
      amount,
      paymentMethod,
      transactionId,
      reference,
      description,
      transactionDate,
      reason,
    } = req.body;

    if (
      !mongoose.Types.ObjectId.isValid(id) ||
      !mongoose.Types.ObjectId.isValid(paymentId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid customer or payment ID",
      });
    }

    if (!reason || !reason.trim()) {
      return res.status(400).json({
        success: false,
        message: "Correction reason is required",
      });
    }

    const payment = await CustomerLedger.findOne({
      _id: paymentId,
      customerId: id,
      type: "PAYMENT",
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Customer payment not found",
      });
    }

    if (payment.isVoided) {
      return res.status(400).json({
        success: false,
        message: "Voided payment cannot be edited",
      });
    }

    const updateData = {};

    if (amount !== undefined) {
      const newAmount = Number(amount);

      if (!Number.isFinite(newAmount) || newAmount <= 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid payment amount",
        });
      }

      updateData.amount = newAmount;
      updateData.credit = newAmount;
    }

    if (paymentMethod !== undefined) {
      if (!PAYMENT_METHODS.includes(paymentMethod)) {
        return res.status(400).json({
          success: false,
          message: "Invalid payment method",
        });
      }

      updateData.paymentMethod = paymentMethod;
    }

    if (transactionId !== undefined)
      updateData.transactionId = transactionId;

    if (reference !== undefined)
      updateData.reference = reference;

    if (description !== undefined)
      updateData.description = description;

    if (transactionDate !== undefined) {
      const newDate = new Date(transactionDate);

      if (Number.isNaN(newDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid transaction date",
        });
      }

      updateData.transactionDate = newDate;
    }

    const oldValues = {
      amount: payment.amount,
      credit: payment.credit,
      paymentMethod: payment.paymentMethod,
      transactionId: payment.transactionId,
      reference: payment.reference,
      description: payment.description,
      transactionDate: payment.transactionDate,
    };

    const newValues = {
      ...oldValues,
      ...updateData,
    };

    payment.correctionHistory.push({
      correctedAt: new Date(),
      reason: reason.trim(),
      oldValues,
      newValues,
    });

    Object.assign(payment, updateData);

    await payment.save();

    await recalculateCustomerLedgerBalances(id);

    res.json({
      success: true,
      message: "Customer payment updated successfully",
      payment,
    });
  } catch (error) {
    console.error("Edit Customer Payment Error:", error);

    res.status(500).json({
      success: false,
      message: error.message || "Failed to update customer payment",
    });
  }
});

// ========================================
// VOID CUSTOMER PAYMENT
// ========================================

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
        message: "Invalid customer or payment ID",
      });
    }

    if (!reason || !reason.trim()) {
      return res.status(400).json({
        success: false,
        message: "Void reason is required",
      });
    }

    const payment = await CustomerLedger.findOne({
      _id: paymentId,
      customerId: id,
      type: "PAYMENT",
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Customer payment not found",
      });
    }

    if (payment.isVoided) {
      return res.status(400).json({
        success: false,
        message: "Payment is already voided",
      });
    }

    payment.isVoided = true;
    payment.voidedAt = new Date();
    payment.voidReason = reason.trim();

    await payment.save();

    await recalculateCustomerLedgerBalances(id);

    res.json({
      success: true,
      message: "Customer payment voided successfully",
      payment,
    });
  } catch (error) {
    console.error("Void Customer Payment Error:", error);

    res.status(500).json({
      success: false,
      message: error.message || "Failed to void customer payment",
    });
  }
});
// ========================================
// CUSTOMER STATEMENT
// ========================================


router.get("/:id/statement", async (req, res) => {
  try {
    const { id } = req.params;
    const { startDate, endDate } = req.query;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid customer ID",
      });
    }

    const customer = await Customer.findById(id).lean();

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    const dateFilter = {};

    if (startDate) {
      const start = new Date(startDate);

      if (Number.isNaN(start.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid start date",
        });
      }

      start.setHours(0, 0, 0, 0);
      dateFilter.$gte = start;
    }

    if (endDate) {
      const end = new Date(endDate);

      if (Number.isNaN(end.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid end date",
        });
      }

      end.setHours(23, 59, 59, 999);
      dateFilter.$lte = end;
    }

    // সব Voided Transaction বাদ
    const allTransactions = await CustomerLedger.find({
      customerId: id,
      isVoided: { $ne: true },
    })
      .sort({
        transactionDate: 1,
        createdAt: 1,
        _id: 1,
      })
      .lean();

    const openingDate = startDate
      ? new Date(startDate)
      : null;

    if (openingDate) {
      openingDate.setHours(0, 0, 0, 0);
    }

    let openingBalance = Number(
      customer.openingBalance || 0
    );

    const statementTransactions = [];

    for (const transaction of allTransactions) {
      const transactionDate = new Date(
        transaction.transactionDate
      );

      // নির্বাচিত Start Date-এর আগের Transaction
      // Opening Balance-এ যোগ হবে
      if (
        openingDate &&
        transactionDate < openingDate
      ) {
        openingBalance +=
          Number(transaction.debit || 0) -
          Number(transaction.credit || 0);

        continue;
      }

      // Date Filter
      if (
        Object.keys(dateFilter).length > 0 &&
        (
          (dateFilter.$gte &&
            transactionDate < dateFilter.$gte) ||
          (dateFilter.$lte &&
            transactionDate > dateFilter.$lte)
        )
      ) {
        continue;
      }

      statementTransactions.push(transaction);
    }

    let runningBalance = Number(
      openingBalance.toFixed(2)
    );

    let totalDebit = 0;
    let totalCredit = 0;
    let totalSales = 0;
    let totalPayments = 0;
    let totalSalesReturn = 0;
    let totalAdjustments = 0;

    const transactions = statementTransactions.map(
      (transaction) => {
        const debit = Number(transaction.debit || 0);
        const credit = Number(transaction.credit || 0);

        runningBalance += debit - credit;

        totalDebit += debit;
        totalCredit += credit;

        if (transaction.type === "SALE") {
          totalSales += debit;
        }

        if (transaction.type === "PAYMENT") {
          totalPayments += credit;
        }

        if (transaction.type === "SALE_RETURN") {
          totalSalesReturn += credit;
        }

        if (transaction.type === "ADJUSTMENT") {
          totalAdjustments += debit - credit;
        }

        return {
          ...transaction,
          balanceAfter: Number(
            runningBalance.toFixed(2)
          ),
        };
      }
    );

    res.json({
      success: true,
      customer,
      summary: {
        openingBalance: Number(
          openingBalance.toFixed(2)
        ),
        totalSales: Number(totalSales.toFixed(2)),
        totalPayments: Number(totalPayments.toFixed(2)),
        totalSalesReturn: Number(
          totalSalesReturn.toFixed(2)
        ),
        totalAdjustments: Number(
          totalAdjustments.toFixed(2)
        ),
        totalDebit: Number(totalDebit.toFixed(2)),
        totalCredit: Number(totalCredit.toFixed(2)),
        closingBalance: Number(
          runningBalance.toFixed(2)
        ),
      },
      transactions,
    });
  } catch (error) {
    console.error("Customer Statement Error:", error);

    res.status(500).json({
      success: false,
      message:
        error.message || "Failed to load customer statement",
    });
  }
});






// ======================================
// GET ALL CUSTOMERS TRANSACTION REPORT
// GET /api/customers/all-report
// ======================================






// ========================================
// CUSTOMER LEDGER WITH FILTERS
// ========================================

router.get("/:id/ledger", async (req, res) => {
  try {
    const { id } = req.params;

    const {
      startDate,
      endDate,
      type,
      paymentMethod,
      minAmount,
      maxAmount,
      search,
      page = 1,
      limit = 20,
    } = req.query;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid customer ID",
      });
    }

    const customer = await Customer.findById(id).lean();

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    // সব ধরনের Voided Transaction বাদ
    const filter = {
      customerId: id,
      isVoided: { $ne: true },
    };

    if (type) {
      filter.type = type;
    }

    if (paymentMethod) {
      filter.paymentMethod = paymentMethod;
    }

    // DATE FILTER
    if (startDate || endDate) {
      filter.transactionDate = {};

      if (startDate) {
        const start = new Date(startDate);

        if (Number.isNaN(start.getTime())) {
          return res.status(400).json({
            success: false,
            message: "Invalid start date",
          });
        }

        start.setHours(0, 0, 0, 0);
        filter.transactionDate.$gte = start;
      }

      if (endDate) {
        const end = new Date(endDate);

        if (Number.isNaN(end.getTime())) {
          return res.status(400).json({
            success: false,
            message: "Invalid end date",
          });
        }

        end.setHours(23, 59, 59, 999);
        filter.transactionDate.$lte = end;
      }
    }

    // AMOUNT FILTER
    if (
      (minAmount !== undefined && minAmount !== "") ||
      (maxAmount !== undefined && maxAmount !== "")
    ) {
      filter.amount = {};

      if (minAmount !== undefined && minAmount !== "") {
        filter.amount.$gte = Number(minAmount);
      }

      if (maxAmount !== undefined && maxAmount !== "") {
        filter.amount.$lte = Number(maxAmount);
      }

      if (
        Object.values(filter.amount).some(
          (value) => !Number.isFinite(value)
        )
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid amount filter",
        });
      }
    }

    // SEARCH FILTER
    if (search && search.trim()) {
      const escapedSearch = search
        .trim()
        .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

      const regex = new RegExp(escapedSearch, "i");

      filter.$or = [
        { transactionId: regex },
        { reference: regex },
        { description: regex },
      ];
    }

    const pageNumber = Math.max(1, Number(page) || 1);

    const pageLimit = Math.min(
      100,
      Math.max(1, Number(limit) || 20)
    );

    // TOTAL VALID TRANSACTIONS
    const totalTransactions =
      await CustomerLedger.countDocuments(filter);

    // TRANSACTION LIST
    const transactions = await CustomerLedger.find(filter)
      .sort({
        transactionDate: -1,
        createdAt: -1,
        _id: -1,
      })
      .skip((pageNumber - 1) * pageLimit)
      .limit(pageLimit)
      .lean();

    // FILTERED SUMMARY
    const filteredSummary = await CustomerLedger.aggregate([
      {
        $match: filter,
      },
      {
        $group: {
          _id: null,

          totalDebit: {
            $sum: {
              $ifNull: ["$debit", 0],
            },
          },

          totalCredit: {
            $sum: {
              $ifNull: ["$credit", 0],
            },
          },

          totalTransactions: {
            $sum: 1,
          },
        },
      },
    ]);

    // OVERALL SUMMARY
    // সব Non-Voided Transaction-এর হিসাব
    const overallSummary = await CustomerLedger.aggregate([
      {
        $match: {
          customerId: new mongoose.Types.ObjectId(id),
          isVoided: { $ne: true },
        },
      },
      {
        $group: {
          _id: null,

          totalDebit: {
            $sum: {
              $ifNull: ["$debit", 0],
            },
          },

          totalCredit: {
            $sum: {
              $ifNull: ["$credit", 0],
            },
          },
        },
      },
    ]);

    const filtered = filteredSummary[0] || {};
    const overall = overallSummary[0] || {};

    const totalDebit = Number(overall.totalDebit || 0);
    const totalCredit = Number(overall.totalCredit || 0);

    const currentBalance =
      Number(customer.openingBalance || 0) +
      totalDebit -
      totalCredit;

    res.json({
      success: true,
      customer,
      transactions,

      summary: {
        filteredTotalDebit: Number(
          (filtered.totalDebit || 0).toFixed(2)
        ),

        filteredTotalCredit: Number(
          (filtered.totalCredit || 0).toFixed(2)
        ),

        filteredTotalTransactions:
          filtered.totalTransactions || 0,

        totalDebit: Number(totalDebit.toFixed(2)),

        totalCredit: Number(totalCredit.toFixed(2)),

        currentBalance: Number(
          currentBalance.toFixed(2)
        ),
      },

      pagination: {
        page: pageNumber,
        limit: pageLimit,
        totalTransactions,

        totalPages: Math.ceil(
          totalTransactions / pageLimit
        ),
      },
    });
  } catch (error) {
    console.error("Customer Ledger Error:", error);

    res.status(500).json({
      success: false,
      message:
        error.message || "Failed to load customer ledger",
    });
  }
});



export default router;
