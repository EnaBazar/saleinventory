
import express from "express";
import mongoose from "mongoose";
import Sale from "../models/Sale.js";
import Lot from "../models/Lot.js";
import Product from "../models/Product.js";
import Customer from "../models/Customer.js";
import CustomerLedger from "../models/CustomerLedger.js";
import SalesReturn from "../models/SalesReturn.js";
import Account from "../models/Account.js";
import AccountLedger from "../models/AccountLedger.js";


const router = express.Router();

// ========================================
// RECALCULATE CUSTOMER LEDGER BALANCES
// ========================================
async function recalculateCustomerLedgerBalances(customerId, session) {
  const customer = await Customer.findById(customerId).session(session);

  if (!customer) {
    throw new Error("Customer not found");
  }

  const transactions = await CustomerLedger.find({
    customerId,
  })
    .sort({
      transactionDate: 1,
      createdAt: 1,
      _id: 1,
    })
    .session(session);

  let balance = Number(customer.openingBalance || 0);

  const operations = [];

  for (const transaction of transactions) {
    if (transaction.isVoided) {
      continue;
    }

    balance +=
      Number(transaction.debit || 0) -
      Number(transaction.credit || 0);

    operations.push({
      updateOne: {
        filter: { _id: transaction._id },
        update: {
          $set: { balanceAfter: balance },
        },
      },
    });
  }

  if (operations.length) {
    await CustomerLedger.bulkWrite(operations, { session });
  }

  return balance;
}

// ========================================
// CUSTOMER SEARCH
// GET /api/sales/customers/search?q=
// ========================================

router.get("/customers/search", async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();

    if (!q) {
      return res.json({
        success: true,
        data: [],
      });
    }

    const customers = await Customer.find({
      isActive: true,
      $or: [
        { customerName: { $regex: q, $options: "i" } },
        { companyName: { $regex: q, $options: "i" } },
        { mobile: { $regex: q, $options: "i" } },
      ],
    })
      .select(
        "customerName companyName contactPerson mobile alternateMobile address customerType openingBalance"
      )
      .limit(15)
      .lean();

    // Get customer IDs
    const customerIds = customers.map((customer) => customer._id);

    // Calculate current balance from Customer Ledger
    const ledgerBalances = await CustomerLedger.aggregate([
      {
        $match: {
          customerId: { $in: customerIds },
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

    // Create balance lookup
    const balanceMap = new Map();

    ledgerBalances.forEach((ledger) => {
      balanceMap.set(
        String(ledger._id),
        Number(ledger.totalDebit || 0) -
          Number(ledger.totalCredit || 0)
      );
    });

    // Attach current balance to each customer
    const customersWithBalance = customers.map((customer) => {
      const openingBalance = Number(customer.openingBalance || 0);
      const ledgerBalance = balanceMap.get(String(customer._id)) || 0;

      return {
        ...customer,
        currentBalance: openingBalance + ledgerBalance,
      };
    });

    return res.json({
      success: true,
      data: customersWithBalance,
    });
  } catch (error) {
    console.error("Sales Customer Search Error:", error);

    return res.status(500).json({
      success: false,
      message: "Customer search failed",
    });
  }
});


// ========================================
// PRODUCT SEARCH
// GET /api/sales/products/search?q=
// ========================================
router.get("/products/search", async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();

    if (!q) {
      return res.json({
        success: true,
        data: [],
      });
    }

    const products = await Product.find({
      isActive: true,
      productName: { $regex: q, $options: "i" },
    })
      .select(
        "productName category subcategory brand stockType currentStockKg currentStockBags"
      )
      .limit(20);

    return res.json({
      success: true,
      data: products,
    });
  } catch (error) {
    console.error("Sales Product Search Error:", error);

    return res.status(500).json({
      success: false,
      message: "Product search failed",
    });
  }
});

// ========================================
// ACTIVE LOT SEARCH BY PRODUCT
// GET /api/sales/lots/:productId
// ========================================
router.get("/lots/:productId", async (req, res) => {
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
      remainingBags: { $gt: 0 },
    })
      .populate("supplierId", "supplierName mobile")
      .sort({ purchaseDate: 1, createdAt: 1 });

    return res.json({
      success: true,
      count: lots.length,
      data: lots,
    });
  } catch (error) {
    console.error("Sales Lot Search Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch available lots",
    });
  }
});

// ========================================
// CREATE SALES INVOICE
// POST /api/sales
// ========================================

router.post("/", async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const {
      customerId,
      invoiceDate,
      items,
      otherCost = 0,
      discount = 0,
      paidAmount = 0,
      paymentMethod = "CASH",
      accountId = "",
      paymentReference = "",
      notes = "",
    } = req.body;

    // ========================================
    // VALIDATE CUSTOMER
    // ========================================

    if (!mongoose.isValidObjectId(customerId)) {
      return res.status(400).json({
        success: false,
        message: "Valid Customer is required",
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one product is required",
      });
    }

    const customer = await Customer.findOne({
      _id: customerId,
      isActive: true,
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found or inactive",
      });
    }

    // ========================================
    // VALIDATE DATE AND AMOUNTS
    // ========================================

    const parsedDate = invoiceDate
      ? new Date(invoiceDate)
      : new Date();

    if (Number.isNaN(parsedDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid invoice date",
      });
    }

    const extraCost = Number(otherCost);
    const discountAmount = Number(discount);
    const paid = Number(paidAmount);

    if (
      !Number.isFinite(extraCost) ||
      extraCost < 0 ||
      !Number.isFinite(discountAmount) ||
      discountAmount < 0 ||
      !Number.isFinite(paid) ||
      paid < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid invoice amount",
      });
    }

    const allowedPaymentMethods = [
      "CASH",
      "BANK",
      "BKASH",
      "DUE",
    ];

    if (!allowedPaymentMethods.includes(paymentMethod)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment method",
      });
    }

    // Account variable declared only once
    let selectedAccount = null;

    // ========================================
    // VALIDATE ITEMS AND CALCULATE TOTALS
    // ========================================

    const preparedItems = [];

    let totalBags = 0;
    let totalWeightKg = 0;
    let productTotal = 0;
    let totalCommission = 0;
    let totalLabour = 0;
    let totalCost = 0;
    let totalProfit = 0;

    for (const item of items) {
      if (
        !mongoose.isValidObjectId(item.productId) ||
        !mongoose.isValidObjectId(item.lotId)
      ) {
        throw new Error("Invalid Product or Lot ID");
      }

      const bags = Number(item.bags || 0);
      const weightKg = Number(item.weightKg);
      const saleRate = Number(item.saleRatePerKg);
      const commissionRate = Number(item.commissionRatePerKg || 0);
      const labourRate = Number(item.labourRatePerBag || 0);

      if (
        !Number.isInteger(bags) ||
        bags < 0 ||
        !Number.isFinite(weightKg) ||
        weightKg <= 0 ||
        !Number.isFinite(saleRate) ||
        saleRate < 0 ||
        !Number.isFinite(commissionRate) ||
        commissionRate < 0 ||
        !Number.isFinite(labourRate) ||
        labourRate < 0
      ) {
        throw new Error("Invalid product quantity or rate");
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
      }).populate("supplierId", "supplierName");

      if (!lot) {
        throw new Error(
          `Active Lot not found for ${product.productName}`
        );
      }

      if (
        bags > Number(lot.remainingBags || 0) ||
        weightKg > Number(lot.remainingWeightKg || 0)
      ) {
        throw new Error(
          `Insufficient stock in Lot ${lot.lotCode}`
        );
      }

      const lineProductTotal = Number(
        (weightKg * saleRate).toFixed(2)
      );

      const lineCommissionTotal = Number(
        (weightKg * commissionRate).toFixed(2)
      );

      const lineLabourTotal = Number(
        (bags * labourRate).toFixed(2)
      );

      const lineTotal = Number(
        (
          lineProductTotal +
          lineCommissionTotal +
          lineLabourTotal
        ).toFixed(2)
      );

      const purchasePrice = Number(
        lot.purchasePricePerKg || 0
      );

      const lineCost =
        lot.stockType === "OWN"
          ? Number((weightKg * purchasePrice).toFixed(2))
          : 0;

      const lineProfit =
        lot.stockType === "OWN"
          ? Number((lineProductTotal - lineCost).toFixed(2))
          : 0;

      preparedItems.push({
        productId: product._id,
        productName: product.productName,
        categoryName: product.category || "",
        lotId: lot._id,
        lotCode: lot.lotCode,

        supplierId: lot.supplierId?._id || null,
        supplierName: lot.supplierId?.supplierName || "",

        stockType: lot.stockType,

        bags,
        weightKg,

        purchasePricePerKg: purchasePrice,
        saleRatePerKg: saleRate,
        commissionRatePerKg: commissionRate,
        labourRatePerBag: labourRate,

        productTotal: lineProductTotal,
        commissionTotal: lineCommissionTotal,
        labourTotal: lineLabourTotal,
        lineTotal,

        costTotal: lineCost,
        profit: lineProfit,
      });

      totalBags += bags;
      totalWeightKg += weightKg;
      productTotal += lineProductTotal;
      totalCommission += lineCommissionTotal;
      totalLabour += lineLabourTotal;
      totalCost += lineCost;
      totalProfit += lineProfit;
    }

    productTotal = Number(productTotal.toFixed(2));
    totalCommission = Number(totalCommission.toFixed(2));
    totalLabour = Number(totalLabour.toFixed(2));
    totalCost = Number(totalCost.toFixed(2));
    totalProfit = Number(totalProfit.toFixed(2));

    const grandTotal = Number(
      (
        productTotal +
        totalCommission +
        totalLabour +
        extraCost -
        discountAmount
      ).toFixed(2)
    );

    if (grandTotal < 0) {
      throw new Error("Discount cannot exceed invoice total");
    }

    // ========================================
    // START DATABASE TRANSACTION
    // ========================================

    session.startTransaction();

    // ========================================
    // VALIDATE SALES PAYMENT ACCOUNT
    // ========================================

    if (paid > 0 && ["CASH", "BANK", "BKASH"].includes(paymentMethod)) {
      if (!mongoose.isValidObjectId(accountId)) {
        throw new Error("Please select a valid payment account");
      }

      selectedAccount = await Account.findOne({
        _id: accountId,
        isActive: true,
      }).session(session);

      if (!selectedAccount) {
        throw new Error("Selected account not found or inactive");
      }

      if (selectedAccount.accountType !== paymentMethod) {
        throw new Error(
          "Selected account does not match the payment method"
        );
      }
    }

    // ========================================
    // CALCULATE CUSTOMER DUE
    // ========================================

    const ledgerBefore = await CustomerLedger.find({
      customerId,
      isVoided: { $ne: true },
    }).session(session);

    let previousDue = Number(customer.openingBalance || 0);

    for (const entry of ledgerBefore) {
      previousDue +=
        Number(entry.debit || 0) -
        Number(entry.credit || 0);
    }

    const totalPayable = Number(
      (previousDue + grandTotal).toFixed(2)
    );

    if (paid > totalPayable) {
      throw new Error(
        "Paid amount cannot exceed total customer payable"
      );
    }

    const dueAmount = Number(
      (totalPayable - paid).toFixed(2)
    );

    // ========================================
    // UPDATE LOT AND PRODUCT STOCK
    // ========================================

    for (const item of preparedItems) {
      const lot = await Lot.findById(item.lotId).session(session);

      if (!lot || lot.status !== "ACTIVE") {
        throw new Error(
          `Lot ${item.lotCode} is no longer available`
        );
      }

      const updatedLot = await Lot.findOneAndUpdate(
        {
          _id: item.lotId,
          status: "ACTIVE",
          remainingBags: { $gte: item.bags },
          remainingWeightKg: { $gte: item.weightKg },
        },
        {
          $inc: {
            remainingBags: -item.bags,
            remainingWeightKg: -item.weightKg,
            soldBags: item.bags,
            soldWeightKg: item.weightKg,
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

      if (Number(updatedLot.remainingBags) === 0) {
        await Lot.updateOne(
          {
            _id: updatedLot._id,
            status: "ACTIVE",
          },
          {
            $set: { status: "COMPLETED" },
          },
          { session }
        );
      }
    }

    // ========================================
    // CREATE SALES INVOICE
    // ========================================

 
const sale = new Sale({
  customerId: customer._id,
  customerName: customer.customerName,
  companyName: customer.companyName || "",
  customerMobile: customer.mobile || "",
  customerAddress: customer.address || "",

  invoiceDate: parsedDate,

  items: preparedItems,

  totalBags,
  totalWeightKg,

  productTotal,
  totalCommission,
  totalLabour,

  otherCost: extraCost,
  discount: discountAmount,

  grandTotal,
  previousDue,
  totalPayable,
  paidAmount: paid,
  dueAmount,

  totalCost,
  totalProfit,

  paymentMethod: paid > 0 ? paymentMethod : "DUE",
  accountId: selectedAccount?._id || null,
  paymentReference,

  status: "COMPLETED",
  notes,

  createdBy: {
    adminId: req.admin?.adminId || null,
    adminName: req.admin?.name || "",
  },

  completedAt: new Date(),
});


    await sale.save({ session });

    // ========================================
    // SALES PAYMENT - ACCOUNT LEDGER
    // ========================================

    if (paid > 0 && selectedAccount) {
      await AccountLedger.create(
        [
          {
            accountId: selectedAccount._id,
            transactionType: "DEPOSIT",
            direction: "IN",
            amount: paid,
            reference: sale.invoiceNumber,
            transactionId: sale._id.toString(),
            description: `Sales Payment - ${sale.invoiceNumber}`,
            transactionDate: parsedDate,
            createdBy: {
              adminId: req.admin?.adminId || null,
              name: req.admin?.name || "",
              username: req.admin?.username || "",
            },
          },
        ],
        { session, ordered: true }
      );
    }

    // ========================================
    // CUSTOMER SALE LEDGER
    // ========================================

    await CustomerLedger.create(
      [
        {
          customerId: customer._id,
          type: "SALE",
          amount: grandTotal,
          debit: grandTotal,
          credit: 0,
          saleId: sale._id,
          reference: sale.invoiceNumber,
          description: `Sales Invoice - ${sale.invoiceNumber}`,
          transactionDate: parsedDate,
          createdBy: {
            adminId: req.admin?.adminId || null,
            name: req.admin?.name || "",
            username: req.admin?.username || "",
          },
        },
      ],
      { session, ordered: true }
    );

    // ========================================
    // CUSTOMER PAYMENT LEDGER
    // ========================================

    if (paid > 0) {
      await CustomerLedger.create(
        [
          {
            customerId: customer._id,
            type: "PAYMENT",
            amount: paid,
            debit: 0,
            credit: paid,
            saleId: sale._id,
            paymentMethod,
            transactionId: paymentReference,
            reference: sale.invoiceNumber,
            description: `Payment received - ${sale.invoiceNumber}`,
            transactionDate: parsedDate,
            createdBy: {
              adminId: req.admin?.adminId || null,
              name: req.admin?.name || "",
              username: req.admin?.username || "",
            },
          },
        ],
        { session, ordered: true }
      );
    }

    // ========================================
    // RECALCULATE CUSTOMER BALANCES
    // ========================================

    await recalculateCustomerLedgerBalances(
      customer._id,
      session
    );

    // ========================================
    // COMMIT TRANSACTION
    // ========================================

    await session.commitTransaction();

    const savedSale = await Sale.findById(sale._id)
      .populate("customerId", "customerName mobile address")
      .populate("items.productId", "productName")
      .populate("items.lotId", "lotCode");

    return res.status(201).json({
      success: true,
      message: "Sales Invoice created successfully",
      data: savedSale,
    });

  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }

    console.error("Create Sales Invoice Error:", error);

    return res.status(400).json({
      success: false,
      message: error.message || "Failed to create sales invoice",
    });

  } finally {
    await session.endSession();
  }
});


// ========================================
// GET ALL SALES INVOICES
// GET /api/sales
// ========================================
// ========================================
// SALES DASHBOARD SUMMARY
// GET /api/sales/dashboard/summary
// ========================================


router.get("/dashboard/summary", async (req, res) => {
  try {
    const { period = "7", from, to } = req.query;

    const trendDays = Number(period) === 30 ? 30 : 7;
    const DAY_MS = 24 * 60 * 60 * 1000;
    const BD_OFFSET = 6 * 60 * 60 * 1000;

    const num = (value) => Number(value || 0);

    // ========================================
    // BANGLADESH DATE HELPERS
    // ========================================

    const getBangladeshDate = (date = new Date()) =>
      new Date(date.getTime() + BD_OFFSET)
        .toISOString()
        .slice(0, 10);

    const isValidDate = (value) => {
      if (
        typeof value !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(value)
      ) {
        return false;
      }

      const [year, month, day] = value.split("-").map(Number);
      const check = new Date(Date.UTC(year, month - 1, day));

      return (
        check.getUTCFullYear() === year &&
        check.getUTCMonth() === month - 1 &&
        check.getUTCDate() === day
      );
    };

    const today = getBangladeshDate();

    const fromDate = from || today;
    const toDate = to || today;

    if (!isValidDate(fromDate) || !isValidDate(toDate)) {
      return res.status(400).json({
        success: false,
        message: "Invalid date range",
      });
    }

    if (fromDate > toDate) {
      return res.status(400).json({
        success: false,
        message: "Start date cannot be after end date",
      });
    }

    const rangeStart = new Date(
      `${fromDate}T00:00:00.000+06:00`
    );

    const rangeEndExclusive = new Date(
      new Date(`${toDate}T00:00:00.000+06:00`).getTime() +
        DAY_MS
    );

    const todayStart = new Date(
      `${today}T00:00:00.000+06:00`
    );

    const tomorrowStart = new Date(
      todayStart.getTime() + DAY_MS
    );

    const trendStart = new Date(
      todayStart.getTime() - (trendDays - 1) * DAY_MS
    );

    // ========================================
    // OWN SALE CALCULATION
    // ========================================

    const calculateOwnSale = (sale) => {
      const allItems = sale.items || [];

      const ownItems = allItems.filter(
        (item) => item.stockType === "OWN"
      );

      if (!ownItems.length) {
        return null;
      }

      const totalProductValue = allItems.reduce(
        (sum, item) => sum + num(item.productTotal),
        0
      );

      const ownProductTotal = ownItems.reduce(
        (sum, item) => sum + num(item.productTotal),
        0
      );

      const ownLabourTotal = ownItems.reduce(
        (sum, item) => sum + num(item.labourTotal),
        0
      );

      const ownCostTotal = ownItems.reduce(
        (sum, item) => sum + num(item.costTotal),
        0
      );

      const ownBags = ownItems.reduce(
        (sum, item) => sum + num(item.bags),
        0
      );

      const ownWeightKg = ownItems.reduce(
        (sum, item) => sum + num(item.weightKg),
        0
      );

      // OWN share of invoice-level other cost and discount
      const ownRatio =
        totalProductValue > 0
          ? ownProductTotal / totalProductValue
          : 0;

      const ownOtherCost = num(sale.otherCost) * ownRatio;
      const ownDiscount = num(sale.discount) * ownRatio;

      const ownSales = ownProductTotal + ownLabourTotal;

      const ownProfit =
        ownSales -
        ownCostTotal -
        ownOtherCost -
        ownDiscount;

      // Allocate invoice payment proportionally to OWN invoice value
      const ownInvoiceValue =
        ownSales + ownOtherCost - ownDiscount;

      const grandTotal = num(sale.grandTotal);

      const paymentRatio =
        grandTotal > 0
          ? Math.min(1, Math.max(0, ownInvoiceValue / grandTotal))
          : 0;

      const ownPaid = num(sale.paidAmount) * paymentRatio;

      const ownDue = Math.max(0, ownInvoiceValue - ownPaid);

      return {
        sales: ownSales,
        productTotal: ownProductTotal,
        labourTotal: ownLabourTotal,
        costTotal: ownCostTotal,
        otherCost: ownOtherCost,
        discount: ownDiscount,
        profit: ownProfit,
        bags: ownBags,
        weightKg: ownWeightKg,
        paid: ownPaid,
        due: ownDue,
      };
    };

    // ========================================
    // OWN SALES RETURN CALCULATION
    // ========================================

    const calculateOwnReturn = (returnDoc) => {
      const allItems = returnDoc.items || [];

      const ownItems = allItems.filter(
        (item) => item.stockType === "OWN"
      );

      if (!ownItems.length) {
        return null;
      }

      const allReturnAmount = allItems.reduce(
        (sum, item) => sum + num(item.returnAmount),
        0
      );

      const ownProductTotal = ownItems.reduce(
        (sum, item) => sum + num(item.productTotal),
        0
      );

      const ownLabourTotal = ownItems.reduce(
        (sum, item) => sum + num(item.labourTotal),
        0
      );

      const ownCostTotal = ownItems.reduce(
        (sum, item) => sum + num(item.costTotal),
        0
      );

      const ownBags = ownItems.reduce(
        (sum, item) => sum + num(item.bags),
        0
      );

      const ownWeightKg = ownItems.reduce(
        (sum, item) => sum + num(item.weightKg),
        0
      );

      const ownReturnAmount =
        ownProductTotal + ownLabourTotal;

      const ownRatio =
        allReturnAmount > 0
          ? ownReturnAmount / allReturnAmount
          : 0;

      return {
        amount: ownReturnAmount,
        costTotal: ownCostTotal,

        // Return profit adjustment includes returned labour amount
        profit: ownReturnAmount - ownCostTotal,

        bags: ownBags,
        weightKg: ownWeightKg,

        // Customer ledger adjustment/refund allocated proportionally
        amountAdjusted: num(returnDoc.amountAdjusted) * ownRatio,
        refundAmount: num(returnDoc.refundAmount) * ownRatio,
      };
    };

    // ========================================
    // LOAD COMPLETED SALES AND RETURNS
    // ========================================

    const [sales, returns] = await Promise.all([
      Sale.find({ status: "COMPLETED" })
        .select(
          "invoiceDate grandTotal paidAmount otherCost discount items"
        )
        .lean(),

      SalesReturn.find({ status: "COMPLETED" })
        .select(
          "returnDate returnAmount amountAdjusted refundAmount items"
        )
        .lean(),
    ]);

    // ========================================
    // ALL-TIME OWN SALES SUMMARY
    // ========================================

    let totalInvoices = 0;
    let totalSales = 0;
    let totalBags = 0;
    let totalWeightKg = 0;
    let totalOwnSaleProfit = 0;

    for (const sale of sales) {
      const own = calculateOwnSale(sale);

      if (!own) continue;

      totalInvoices++;
      totalSales += own.sales;
      totalBags += own.bags;
      totalWeightKg += own.weightKg;
      totalOwnSaleProfit += own.profit;
    }

    // ========================================
    // ALL-TIME OWN RETURN SUMMARY
    // ========================================

    let totalReturns = 0;
    let totalReturnAmount = 0;
    let returnedBags = 0;
    let returnedWeightKg = 0;
    let totalOwnReturnProfit = 0;
    let totalAmountAdjusted = 0;
    let totalRefundAmount = 0;

    for (const returnDoc of returns) {
      const own = calculateOwnReturn(returnDoc);

      if (!own) continue;

      totalReturns++;
      totalReturnAmount += own.amount;
      returnedBags += own.bags;
      returnedWeightKg += own.weightKg;
      totalOwnReturnProfit += own.profit;
      totalAmountAdjusted += own.amountAdjusted;
      totalRefundAmount += own.refundAmount;
    }

    // ========================================
    // SELECTED DATE RANGE OWN SALES
    // ========================================

    let todayInvoices = 0;
    let todaySales = 0;
    let todayBags = 0;
    let todayWeightKg = 0;
    let todayOwnSaleProfit = 0;
    let todaySaleDue = 0;

    for (const sale of sales) {
      if (
        !sale.invoiceDate ||
        sale.invoiceDate < rangeStart ||
        sale.invoiceDate >= rangeEndExclusive
      ) {
        continue;
      }

      const own = calculateOwnSale(sale);

      if (!own) continue;

      todayInvoices++;
      todaySales += own.sales;
      todayBags += own.bags;
      todayWeightKg += own.weightKg;
      todayOwnSaleProfit += own.profit;
      todaySaleDue += own.due;
    }

    // ========================================
    // SELECTED DATE RANGE OWN RETURNS
    // ========================================

    let todayReturnAmount = 0;
    let todayOwnReturnProfit = 0;
    let todayReturnCount = 0;

    for (const returnDoc of returns) {
      if (
        !returnDoc.returnDate ||
        returnDoc.returnDate < rangeStart ||
        returnDoc.returnDate >= rangeEndExclusive
      ) {
        continue;
      }

      const own = calculateOwnReturn(returnDoc);

      if (!own) continue;

      todayReturnCount++;
      todayReturnAmount += own.amount;
      todayOwnReturnProfit += own.profit;
    }

    // ========================================
    // CUSTOMER PAYMENT SUMMARY
    // Customer payments remain separate from OWN sales.
    // ========================================

    const [paymentSummaryResult, todayPaymentResult] =
      await Promise.all([
        CustomerLedger.aggregate([
          {
            $match: {
              type: "PAYMENT",
              isVoided: { $ne: true },
            },
          },
          {
            $group: {
              _id: null,
              totalPaid: { $sum: "$credit" },
            },
          },
        ]),

        CustomerLedger.aggregate([
          {
            $match: {
              type: "PAYMENT",
              isVoided: { $ne: true },
              transactionDate: {
                $gte: rangeStart,
                $lt: rangeEndExclusive,
              },
            },
          },
          {
            $group: {
              _id: null,
              totalPaid: { $sum: "$credit" },
            },
          },
        ]),
      ]);

    const paymentSummary = paymentSummaryResult[0] || {};
    const todayPayment = todayPaymentResult[0] || {};

    // ========================================
    // CURRENT CUSTOMER DUE
    // ========================================

    const [openingBalanceResult, ledgerBalanceResult] =
      await Promise.all([
        Customer.aggregate([
          {
            $group: {
              _id: null,
              totalOpeningBalance: {
                $sum: "$openingBalance",
              },
            },
          },
        ]),

        CustomerLedger.aggregate([
          {
            $match: {
              isVoided: { $ne: true },
            },
          },
          {
            $group: {
              _id: null,
              totalDebit: { $sum: "$debit" },
              totalCredit: { $sum: "$credit" },
            },
          },
        ]),
      ]);

    const totalOpeningBalance = num(
      openingBalanceResult[0]?.totalOpeningBalance
    );

    const totalDebit = num(ledgerBalanceResult[0]?.totalDebit);
    const totalCredit = num(ledgerBalanceResult[0]?.totalCredit);

    const currentCustomerDue = Number(
      (
        totalOpeningBalance +
        totalDebit -
        totalCredit
      ).toFixed(2)
    );

    // ========================================
    // SALES AND RETURN TRENDS - OWN ONLY
    // ========================================

    const trendMap = new Map();

    for (const sale of sales) {
      if (
        !sale.invoiceDate ||
        sale.invoiceDate < trendStart ||
        sale.invoiceDate >= tomorrowStart
      ) {
        continue;
      }

      const own = calculateOwnSale(sale);

      if (!own) continue;

      const date = getBangladeshDate(sale.invoiceDate);

      const existing = trendMap.get(date) || {
        date,
        sales: 0,
        returns: 0,
        netSales: 0,
        invoices: 0,
        saleProfit: 0,
        returnProfit: 0,
        ownProfit: 0,
      };

      existing.sales += own.sales;
      existing.invoices++;
      existing.saleProfit += own.profit;

      existing.netSales = Number(
        (existing.sales - existing.returns).toFixed(2)
      );

      existing.ownProfit = Number(
        (existing.saleProfit - existing.returnProfit).toFixed(2)
      );

      trendMap.set(date, existing);
    }

    for (const returnDoc of returns) {
      if (
        !returnDoc.returnDate ||
        returnDoc.returnDate < trendStart ||
        returnDoc.returnDate >= tomorrowStart
      ) {
        continue;
      }

      const own = calculateOwnReturn(returnDoc);

      if (!own) continue;

      const date = getBangladeshDate(returnDoc.returnDate);

      const existing = trendMap.get(date) || {
        date,
        sales: 0,
        returns: 0,
        netSales: 0,
        invoices: 0,
        saleProfit: 0,
        returnProfit: 0,
        ownProfit: 0,
      };

      existing.returns += own.amount;
      existing.returnProfit += own.profit;

      existing.netSales = Number(
        (existing.sales - existing.returns).toFixed(2)
      );

      existing.ownProfit = Number(
        (existing.saleProfit - existing.returnProfit).toFixed(2)
      );

      trendMap.set(date, existing);
    }

    // ========================================
    // FILL MISSING TREND DATES
    // ========================================

    const salesTrend = [];

    for (let i = 0; i < trendDays; i++) {
      const date = getBangladeshDate(
        new Date(trendStart.getTime() + i * DAY_MS)
      );

      const item = trendMap.get(date);

      salesTrend.push(
        item
          ? {
              ...item,
              sales: Number(item.sales.toFixed(2)),
              returns: Number(item.returns.toFixed(2)),
              netSales: Number(item.netSales.toFixed(2)),
              saleProfit: Number(item.saleProfit.toFixed(2)),
              returnProfit: Number(item.returnProfit.toFixed(2)),
              ownProfit: Number(item.ownProfit.toFixed(2)),
            }
          : {
              date,
              sales: 0,
              returns: 0,
              netSales: 0,
              invoices: 0,
              saleProfit: 0,
              returnProfit: 0,
              ownProfit: 0,
            }
      );
    }

    // ========================================
    // FINAL DASHBOARD RESPONSE
    // ========================================

    const money = (value) =>
      Number(Number(value || 0).toFixed(2));

    return res.json({
      success: true,

      data: {
        today: {
          from: fromDate,
          to: toDate,

          invoices: todayInvoices,

          sales: money(todaySales),

          returnAmount: money(todayReturnAmount),

          netSales: money(todaySales - todayReturnAmount),

          saleProfit: money(todayOwnSaleProfit),

          returnProfit: money(todayOwnReturnProfit),

          ownProfit: money(
            todayOwnSaleProfit - todayOwnReturnProfit
          ),

          bags: money(todayBags),

          weightKg: money(todayWeightKg),

          paid: money(todayPayment.totalPaid),

          saleDue: money(todaySaleDue),
        },

        overall: {
          totalInvoices,

          totalSales: money(totalSales),

          totalReturnAmount: money(totalReturnAmount),

          netSales: money(totalSales - totalReturnAmount),

          totalOwnSaleProfit: money(totalOwnSaleProfit),

          totalOwnReturnProfit: money(totalOwnReturnProfit),

          ownProfit: money(
            totalOwnSaleProfit - totalOwnReturnProfit
          ),

          totalBags: money(totalBags),

          returnedBags: money(returnedBags),

          netBags: money(totalBags - returnedBags),

          totalWeightKg: money(totalWeightKg),

          returnedWeightKg: money(returnedWeightKg),

          netWeightKg: money(totalWeightKg - returnedWeightKg),

          totalPaid: money(paymentSummary.totalPaid),

          currentDue: currentCustomerDue,
        },

        returns: {
          totalReturns,

          returnAmount: money(totalReturnAmount),

          ownReturnProfit: money(totalOwnReturnProfit),

          amountAdjusted: money(totalAmountAdjusted),

          refundAmount: money(totalRefundAmount),

          returnedBags: money(returnedBags),

          returnedWeightKg: money(returnedWeightKg),
        },

        salesTrend,

        trendDays,
      },
    });
  } catch (error) {
    console.error("Sales Dashboard Summary Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load sales dashboard summary",
      error: error.message,
    });
  }
});



// ========================================
// GET ALL SALES INVOICES WITH RETURN INFO
// GET /api/sales
// ========================================

router.get("/", async (req, res) => {
  try {
    const { search, status, from, to } = req.query;

    const filter = {};

    if (status) {
      filter.status = status;
    }

  
if (from || to) {
  filter.invoiceDate = {};

  // Bangladesh timezone: UTC+6
  if (from) {
    filter.invoiceDate.$gte = new Date(
      `${from}T00:00:00.000+06:00`
    );
  }

  if (to) {
    filter.invoiceDate.$lte = new Date(
      `${to}T23:59:59.999+06:00`
    );
  }
}


    if (search) {
      const regex = new RegExp(
        String(search).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        "i"
      );

      filter.$or = [
        { invoiceNumber: regex },
        { customerName: regex },
        { customerMobile: regex },
      ];
    }

    // GET SALES
    const sales = await Sale.find(filter)
      .populate("customerId", "customerName mobile")
      .sort({ invoiceDate: -1, createdAt: -1 })
      .limit(200);

    // NO SALES FOUND
    if (!sales.length) {
      return res.json({
        success: true,
        count: 0,
        data: [],
      });
    }

    // GET ALL COMPLETED RETURNS FOR THESE SALES
    const saleIds = sales.map((sale) => sale._id);

    const returns = await SalesReturn.find({
      saleId: { $in: saleIds },
      status: "COMPLETED",
    })
      .select(
        "saleId returnNumber returnDate totalBags totalWeightKg returnAmount items"
      )
      .sort({ returnDate: -1 });

    // GROUP RETURNS BY SALE ID
    const returnMap = new Map();

    for (const item of returns) {
      const key = item.saleId.toString();

      if (!returnMap.has(key)) {
        returnMap.set(key, {
          returnedBags: 0,
          returnedWeightKg: 0,
          returnedAmount: 0,
          returnedItems: [],
          returnCount: 0,
        });
      }

      const current = returnMap.get(key);

      current.returnedBags += Number(item.totalBags || 0);
      current.returnedWeightKg += Number(item.totalWeightKg || 0);
      current.returnedAmount += Number(item.returnAmount || 0);
      current.returnCount += 1;

      for (const returnItem of item.items || []) {
        current.returnedItems.push({
          returnNumber: item.returnNumber,
          returnDate: item.returnDate,
          productId: returnItem.productId,
          productName: returnItem.productName,
          lotCode: returnItem.lotCode,
          bags: Number(returnItem.bags || 0),
          weightKg: Number(returnItem.weightKg || 0),
          returnAmount: Number(returnItem.returnAmount || 0),
        });
      }
    }

    // ATTACH RETURN SUMMARY WITHOUT MODIFYING ORIGINAL SALE
    const salesWithReturns = sales.map((sale) => {
      const saleData = sale.toObject();

      const returnInfo = returnMap.get(sale._id.toString()) || {
        returnedBags: 0,
        returnedWeightKg: 0,
        returnedAmount: 0,
        returnedItems: [],
        returnCount: 0,
      };

      const originalBags = Number(sale.totalBags || 0);
      const originalWeight = Number(sale.totalWeightKg || 0);

      const returnedBags = Number(returnInfo.returnedBags || 0);
      const returnedWeightKg = Number(
        returnInfo.returnedWeightKg || 0
      );

      const returnedAmount = Number(
        returnInfo.returnedAmount || 0
      );

      // FULL RETURN CHECK
      const bagsFullyReturned =
        originalBags <= 0 ||
        returnedBags >= originalBags - 0.001;

      const weightFullyReturned =
        originalWeight <= 0 ||
        returnedWeightKg >= originalWeight - 0.001;

      let returnStatus = "NO RETURN";

      if (returnedAmount > 0 || returnedWeightKg > 0 || returnedBags > 0) {
        if (bagsFullyReturned && weightFullyReturned) {
          returnStatus = "FULL RETURN";
        } else {
          returnStatus = "PARTIAL RETURN";
        }
      }

      return {
        ...saleData,

        // RETURN SUMMARY
        returnedBags,
        returnedWeightKg,
        returnedAmount,

        // NET SALES AMOUNT
        netSalesAmount: Number(
          (Number(sale.grandTotal || 0) - returnedAmount).toFixed(2)
        ),

        returnStatus,
        returnCount: returnInfo.returnCount,
        returnedItems: returnInfo.returnedItems,
      };
    });

    return res.json({
      success: true,
      count: salesWithReturns.length,
      data: salesWithReturns,
    });

  } catch (error) {
    console.error("Get Sales Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch sales invoices",
    });
  }
});






// ========================================
// SALES COLLECTION - RECEIVE CUSTOMER PAYMENT
// ========================================

router.post("/collections", async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const {
      customerId,
      amount,
      paymentMethod,
      transactionId,
      reference,
      description,
      transactionDate,
    } = req.body;

    if (!mongoose.Types.ObjectId.isValid(customerId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid customer",
      });
    }

    const paymentAmount = Number(amount);

    if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid payment amount",
      });
    }

    const allowedMethods = [
      "CASH",
      "BANK",
      "BKASH",
      "NAGAD",
      "ROCKET",
      "OTHER",
    ];

    if (!allowedMethods.includes(paymentMethod)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment method",
      });
    }

    const paymentDate = transactionDate
      ? new Date(transactionDate)
      : new Date();

    if (Number.isNaN(paymentDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid transaction date",
      });
    }

    let savedCollection = null;
    let currentDue = 0;

    await session.withTransaction(async () => {
      const customer = await Customer.findById(customerId).session(session);

      if (!customer) {
        throw new Error("Customer not found");
      }

      const ledgerEntries = await CustomerLedger.find({
        customerId,
        isVoided: { $ne: true },
      }).session(session);

      currentDue = Number(customer.openingBalance || 0);

      for (const entry of ledgerEntries) {
        currentDue +=
          Number(entry.debit || 0) - Number(entry.credit || 0);
      }

      currentDue = Number(currentDue.toFixed(2));

      if (paymentAmount > currentDue + 0.009) {
        throw new Error(
          `Payment exceeds customer due. Current due: ${currentDue}`
        );
      }

      const created = await CustomerLedger.create(
        [
          {
            customerId,
            type: "PAYMENT",
            amount: paymentAmount,
            debit: 0,
            credit: paymentAmount,
            saleId: null,
            paymentMethod,
            transactionId: transactionId || "",
            reference: reference || "",
            description: description || "",
            transactionDate: paymentDate,
          },
        ],
        { session }
      );

      savedCollection = created[0];

      currentDue = await recalculateCustomerLedgerBalances(
        customerId,
        session
      );
    });

    return res.status(201).json({
      success: true,
      message: "Customer payment collected successfully",
      data: {
        collection: savedCollection,
        currentDue,
      },
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to collect payment",
    });
  } finally {
    await session.endSession();
  }
});


// ========================================
// SALES COLLECTION HISTORY
// ========================================

router.get("/collections", async (req, res) => {
  try {
    const {
      customerId,
      from,
      to,
      page = 1,
      limit = 20,
    } = req.query;

    const filter = {
      type: "PAYMENT",
      saleId: null,
      isVoided: { $ne: true },
    };

    if (customerId) {
      if (!mongoose.Types.ObjectId.isValid(customerId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid customer",
        });
      }

      filter.customerId = customerId;
    }

    if (from || to) {
      filter.transactionDate = {};

      if (from) {
        filter.transactionDate.$gte = new Date(from);
      }

      if (to) {
        const endDate = new Date(to);
        endDate.setHours(23, 59, 59, 999);
        filter.transactionDate.$lte = endDate;
      }
    }

    const currentPage = Math.max(1, Number(page) || 1);
    const perPage = Math.min(100, Math.max(1, Number(limit) || 20));
    const skip = (currentPage - 1) * perPage;

    const [collections, total] = await Promise.all([
      CustomerLedger.find(filter)
        .populate("customerId", "customerName companyName mobile")
        .sort({ transactionDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(perPage),

      CustomerLedger.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: collections,
      pagination: {
        total,
        page: currentPage,
        limit: perPage,
        totalPages: Math.ceil(total / perPage),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to load collection history",
    });
  }
});

// ========================================
// GET SINGLE SALES INVOICE
// GET /api/sales/:id
// ========================================

router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Invoice ID",
      });
    }

    const sale = await Sale.findById(id)
      .populate(
        "customerId",
        "customerName companyName mobile address"
      )
      .populate("items.productId", "productName")
      .populate("items.lotId", "lotCode")
      .populate("items.supplierId", "supplierName");

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: "Sales invoice not found",
      });
    }

    // ========================================
    // CURRENT CUSTOMER BALANCE
    // EXCLUDING THIS INVOICE
    // ========================================

    const customerId =
      sale.customerId?._id || sale.customerId;

    const customer = await Customer.findById(
      customerId
    ).lean();

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Invoice customer not found",
      });
    }

    const ledgerBalance = await CustomerLedger.aggregate([
      {
        $match: {
          customerId: new mongoose.Types.ObjectId(
            customerId
          ),
          saleId: { $ne: sale._id },
          isVoided: { $ne: true },
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

    const totalDebit = Number(
      ledgerBalance[0]?.totalDebit || 0
    );

    const totalCredit = Number(
      ledgerBalance[0]?.totalCredit || 0
    );

    const currentBalanceExcludingInvoice =
      Number(customer.openingBalance || 0) +
      totalDebit -
      totalCredit;

    return res.json({
      success: true,
      data: {
        ...sale.toObject(),
        currentBalanceExcludingInvoice,
      },
    });
  } catch (error) {
    console.error("Get Sale Details Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch invoice details",
    });
  }
});


// ========================================
// UPDATE SALES INVOICE (EDIT)
// ========================================


router.put("/:id", async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Invoice ID",
      });
    }

 
const {
  customerId,
  invoiceDate,
  items,
  otherCost = 0,
  discount = 0,
  paidAmount = 0,
  paymentMethod = "CASH",
  accountId = "",
  paymentReference = "",
  notes = "",
} = req.body;


    if (!mongoose.isValidObjectId(customerId)) {
      return res.status(400).json({
        success: false,
        message: "Valid customer is required",
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one sale item is required",
      });
    }

    const parsedDate = new Date(invoiceDate);

    if (!invoiceDate || Number.isNaN(parsedDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Valid invoice date is required",
      });
    }

    const cost = Number(otherCost);
    const discountAmount = Number(discount);
    const paid = Number(paidAmount);

    if (
      !Number.isFinite(cost) ||
      !Number.isFinite(discountAmount) ||
      !Number.isFinite(paid) ||
      cost < 0 ||
      discountAmount < 0 ||
      paid < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid invoice amount",
      });
    }

    if (!["CASH", "BANK", "BKASH", "NAGAD", "ROCKET", "OTHER", "DUE"].includes(paymentMethod)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment method",
      });
    }

    let responseData;

    await session.withTransaction(async () => {
      const sale = await Sale.findById(id).session(session);

      if (!sale) {
        throw new Error("Sales invoice not found");
      }
if (sale.status !== "COMPLETED") {
  throw new Error("Only completed invoices can be edited");
}

// ========================================
// PREVENT EDIT IF SALES RETURN EXISTS
// ========================================

const existingReturn = await SalesReturn.findOne({
  saleId: sale._id,
  status: "COMPLETED",
}).session(session);

if (existingReturn) {
  throw new Error(
    `Invoice ${sale.invoiceNumber} has Sales Return (${existingReturn.returnNumber}). This invoice cannot be edited.`
  );
}

const oldCustomerId = String(sale.customerId);
     
      // ========================================
      // 1. RESTORE OLD INVOICE STOCK
      // ========================================
      for (const oldItem of sale.items) {
        const oldLot = await Lot.findById(oldItem.lotId).session(session);

        if (!oldLot || oldLot.status === "CANCELLED") {
          throw new Error(
            `Old lot not available: ${oldItem.lotCode || ""}`
          );
        }

        const oldBags = Number(oldItem.bags || 0);
        const oldWeight = Number(oldItem.weightKg || 0);

        oldLot.remainingBags =
          Number(oldLot.remainingBags || 0) + oldBags;

        oldLot.remainingWeightKg =
          Number(oldLot.remainingWeightKg || 0) + oldWeight;

        oldLot.soldBags =
          Math.max(0, Number(oldLot.soldBags || 0) - oldBags);

        oldLot.soldWeightKg =
          Math.max(0, Number(oldLot.soldWeightKg || 0) - oldWeight);

        oldLot.status = "ACTIVE";

        await oldLot.save({ session });

        const oldProduct = await Product.findById(
          oldItem.productId
        ).session(session);

        if (!oldProduct) {
          throw new Error("Old invoice product not found");
        }

        oldProduct.currentStockBags =
          Number(oldProduct.currentStockBags || 0) + oldBags;

        oldProduct.currentStockKg =
          Number(oldProduct.currentStockKg || 0) + oldWeight;

        await oldProduct.save({ session });
      }

      // ========================================
      // 2. FIND NEW CUSTOMER
      // ========================================
      const customer = await Customer.findOne({
        _id: customerId,
        isActive: true,
      }).session(session);

      if (!customer) {
        throw new Error("Active customer not found");
      }

      // ========================================
      // 3. CALCULATE NEW CUSTOMER PREVIOUS DUE
      // Exclude this invoice's old ledger entries
      // ========================================
      const previousLedger = await CustomerLedger.aggregate([
        {
          $match: {
            customerId: new mongoose.Types.ObjectId(customerId),
            saleId: { $ne: sale._id },
            isVoided: { $ne: true },
          },
        },
        {
          $group: {
            _id: null,
            debit: { $sum: "$debit" },
            credit: { $sum: "$credit" },
          },
        },
      ]).session(session);

      const previousDue =
        Number(customer.openingBalance || 0) +
        Number(previousLedger[0]?.debit || 0) -
        Number(previousLedger[0]?.credit || 0);

      // ========================================
      // 4. VALIDATE AND CALCULATE NEW ITEMS
      // ========================================
      const calculatedItems = [];

      let totalBags = 0;
      let totalWeightKg = 0;
      let productTotal = 0;
      let totalCommission = 0;
      let totalLabour = 0;
      let totalCost = 0;
      let totalProfit = 0;

      const lotQuantityMap = new Map();

      for (const item of items) {
        if (
          !mongoose.isValidObjectId(item.productId) ||
          !mongoose.isValidObjectId(item.lotId)
        ) {
          throw new Error("Invalid product or lot");
        }

        const bags = Number(item.bags);
        const weightKg = Number(item.weightKg);
        const saleRate = Number(item.saleRatePerKg);
        const commissionRate = Number(item.commissionRatePerKg || 0);
        const labourRate = Number(item.labourRatePerBag || 0);

        if (
          !Number.isFinite(bags) ||
          !Number.isFinite(weightKg) ||
          !Number.isFinite(saleRate) ||
          !Number.isFinite(commissionRate) ||
          !Number.isFinite(labourRate) ||
          bags <= 0 ||
          weightKg <= 0 ||
          saleRate <= 0 ||
          commissionRate < 0 ||
          labourRate < 0
        ) {
          throw new Error("Invalid sale item quantity or rate");
        }

        const product = await Product.findOne({
          _id: item.productId,
        }).session(session);

        if (!product) {
          throw new Error("Product not found");
        }

      const lot = await Lot.findOne({
  _id: item.lotId,
  productId: item.productId,
  status: { $in: ["ACTIVE", "COMPLETED"] },
})
  .populate("supplierId", "supplierName")
  .session(session);

        if (!lot) {
          throw new Error("Selected lot is not available");
        }

        const lotKey = String(lot._id);

        const previousQty = lotQuantityMap.get(lotKey) || {
          bags: 0,
          weightKg: 0,
        };

        previousQty.bags += bags;
        previousQty.weightKg += weightKg;

        lotQuantityMap.set(lotKey, previousQty);

        const stockType = lot.stockType || "OWN";

        const purchasePrice = Number(lot.purchasePricePerKg || 0);

       const lineProductTotal = Number(
  (weightKg * saleRate).toFixed(2)
);

const commissionTotal = Number(
  (stockType === "COMMISSION"
    ? weightKg * commissionRate
    : 0
  ).toFixed(2)
);

const labourTotal = Number(
  (bags * labourRate).toFixed(2)
);

const lineTotal = Number(
  (
    lineProductTotal +
    commissionTotal +
    labourTotal
  ).toFixed(2)
);

const lineCost =
  stockType === "OWN"
    ? Number((weightKg * purchasePrice).toFixed(2))
    : 0;

// Commission Lot profit will be calculated separately.
const lineProfit =
  stockType === "OWN"
    ? Number((lineProductTotal - lineCost).toFixed(2))
    : 0;


        calculatedItems.push({
          productId: product._id,
          productName: product.productName,
          categoryName: product.category || "",
          lotId: lot._id,
          lotCode: lot.lotCode,
supplierId: lot.supplierId?._id || lot.supplierId || null,
supplierName: lot.supplierId?.supplierName || "",

          stockType,
          bags,
          weightKg,
          purchasePricePerKg: purchasePrice,
          saleRatePerKg: saleRate,
          commissionRatePerKg: commissionRate,
          labourRatePerBag: labourRate,
          productTotal: lineProductTotal,
          commissionTotal,
          labourTotal,
          lineTotal,
          costTotal: lineCost,
          profit: lineProfit,
        });

        totalBags += bags;
        totalWeightKg += weightKg;
        productTotal += lineProductTotal;
        totalCommission += commissionTotal;
        totalLabour += labourTotal;
        totalCost += lineCost;
        totalProfit += lineProfit;
      }

totalBags = Number(totalBags);
totalWeightKg = Number(totalWeightKg.toFixed(2));
productTotal = Number(productTotal.toFixed(2));
totalCommission = Number(totalCommission.toFixed(2));
totalLabour = Number(totalLabour.toFixed(2));
totalCost = Number(totalCost.toFixed(2));
totalProfit = Number(totalProfit.toFixed(2));

      // ========================================
      // 5. CHECK STOCK AFTER RESTORING OLD SALE
      // ========================================
      for (const [lotId, quantity] of lotQuantityMap) {
        const lot = await Lot.findById(lotId).session(session);

        if (
          !lot ||
          Number(lot.remainingBags || 0) < quantity.bags ||
          Number(lot.remainingWeightKg || 0) < quantity.weightKg
        ) {
          throw new Error(
            `Insufficient stock in lot ${lot?.lotCode || lotId}`
          );
        }
      }

      // ========================================
      // 6. DEDUCT NEW STOCK
      // ========================================
      for (const [lotId, quantity] of lotQuantityMap) {
        const lot = await Lot.findById(lotId).session(session);

        lot.remainingBags =
          Number(lot.remainingBags || 0) - quantity.bags;

        lot.remainingWeightKg =
          Number(lot.remainingWeightKg || 0) - quantity.weightKg;

        lot.soldBags =
          Number(lot.soldBags || 0) + quantity.bags;

        lot.soldWeightKg =
          Number(lot.soldWeightKg || 0) + quantity.weightKg;

        if (lot.remainingBags === 0) {
          lot.status = "COMPLETED";
        } else {
          lot.status = "ACTIVE";
        }

        await lot.save({ session });
      }

   
      // ========================================
      // 7. CALCULATE INVOICE TOTALS
      // ========================================
     const grandTotal = Number(
  (
    productTotal +
    totalCommission +
    totalLabour +
    cost -
    discountAmount
  ).toFixed(2)
);

if (grandTotal < 0) {
  throw new Error("Invoice total cannot be negative");
}

const totalPayable = Number(
  (previousDue + grandTotal).toFixed(2)
);

if (paid > totalPayable) {
  throw new Error("Paid amount cannot exceed total payable");
}

const dueAmount = Number(
  (totalPayable - paid).toFixed(2)
);



      // ========================================
      // 7A. VALIDATE NEW PAYMENT ACCOUNT
      // ========================================

      let selectedAccount = null;

      if (paid > 0 && ["CASH", "BANK", "BKASH"].includes(paymentMethod)) {
        if (!mongoose.isValidObjectId(accountId)) {
          throw new Error("Please select a valid payment account");
        }

        selectedAccount = await Account.findOne({
          _id: accountId,
          isActive: true,
          accountType: paymentMethod,
        }).session(session);

        if (!selectedAccount) {
          throw new Error("Selected payment account is not available");
        }
      }

      // ========================================
      // 7B. VOID OLD ACCOUNT LEDGER PAYMENT
      // ========================================

      const oldAccountEntries = await AccountLedger.find({
        transactionId: sale._id.toString(),
        transactionType: "DEPOSIT",
        direction: "IN",
        isVoided: { $ne: true },
      }).session(session);

      for (const entry of oldAccountEntries) {
        entry.isVoided = true;
        entry.voidedAt = new Date();
        entry.voidReason = "Sales invoice edited";
        await entry.save({ session });
      }


      // ========================================
      // 8. VOID OLD LEDGER ENTRIES
      // ========================================
      const oldLedgerEntries = await CustomerLedger.find({
        saleId: sale._id,
        isVoided: { $ne: true },
      }).session(session);

      for (const entry of oldLedgerEntries) {
        entry.isVoided = true;
        entry.voidedAt = new Date();
        entry.voidReason = "Invoice edited";
        await entry.save({ session });
      }

      // ========================================
      // 9. UPDATE EXISTING SALE
      // ========================================
      sale.customerId = customer._id;
      sale.customerName = customer.customerName;
      sale.companyName = customer.companyName || "";
      sale.customerMobile = customer.mobile || "";
      sale.customerAddress = customer.address || "";

      sale.invoiceDate = parsedDate;
      sale.items = calculatedItems;

      sale.totalBags = totalBags;
      sale.totalWeightKg = totalWeightKg;
      sale.productTotal = productTotal;
      sale.totalCommission = totalCommission;
      sale.totalLabour = totalLabour;

      sale.otherCost = cost;
      sale.discount = discountAmount;
      sale.grandTotal = grandTotal;

      sale.previousDue = previousDue;
      sale.totalPayable = totalPayable;
      sale.paidAmount = paid;
      sale.dueAmount = dueAmount;

      sale.totalCost = totalCost;
      sale.totalProfit = totalProfit;

      sale.paymentMethod = paid === 0 ? "DUE" : paymentMethod;
      sale.accountId = selectedAccount?._id || null;
      sale.paymentReference = paymentReference;
      sale.notes = notes;

      await sale.save({ session });



      // ========================================
      // 9A. CREATE NEW ACCOUNT LEDGER PAYMENT
      // ========================================

      if (paid > 0 && selectedAccount) {
        await AccountLedger.create(
          [
            {
              accountId: selectedAccount._id,
              transactionType: "DEPOSIT",
              direction: "IN",
              amount: paid,
              reference: sale.invoiceNumber,
              transactionId: sale._id.toString(),
              description: `Edited Sales Payment - ${sale.invoiceNumber}`,
              transactionDate: parsedDate,
              createdBy: {
                adminId: req.admin?.adminId || null,
                name: req.admin?.name || "",
                username: req.admin?.username || "",
              },
            },
          ],
          { session, ordered: true }
        );
      }


      // ========================================
      // 10. CREATE NEW LEDGER ENTRIES
      // ========================================
      await CustomerLedger.create(
        [
          {
            customerId: customer._id,
            type: "SALE",
            amount: grandTotal,
            debit: grandTotal,
            credit: 0,
            saleId: sale._id,
            reference: sale.invoiceNumber,
            description: `Edited Sales Invoice ${sale.invoiceNumber}`,
            transactionDate: parsedDate,
          },
          ...(paid > 0
            ? [
                {
                  customerId: customer._id,
                  type: "PAYMENT",
                  amount: paid,
                  debit: 0,
                  credit: paid,
                  saleId: sale._id,
                  paymentMethod:
                    paymentMethod === "DUE" ? "OTHER" : paymentMethod,
                  transactionId: paymentReference,
                  reference: sale.invoiceNumber,
                  description: `Payment against edited invoice ${sale.invoiceNumber}`,
                  transactionDate: parsedDate,
                },
              ]
            : []),
        ],
      { session, ordered: true }
      );

      // ========================================
      // 11. RECALCULATE CUSTOMER LEDGERS
      // ========================================
      const customerIdsToUpdate = new Set([
        oldCustomerId,
        String(customer._id),
      ]);

      for (const customerIdToUpdate of customerIdsToUpdate) {
        await recalculateCustomerLedgerBalances(
          customerIdToUpdate,
          session
        );
      }

      responseData = {
        _id: sale._id,
        invoiceNumber: sale.invoiceNumber,
        status: sale.status,
        customerId: sale.customerId,
        grandTotal: sale.grandTotal,
        paidAmount: sale.paidAmount,
        dueAmount: sale.dueAmount,
      };
    });

    return res.json({
      success: true,
      message: "Sales invoice updated successfully",
      data: responseData,
    });
  } catch (error) {
    console.error("Update Sales Invoice Error:", error);

    return res.status(400).json({
      success: false,
      message: error.message || "Failed to update sales invoice",
    });
  } finally {
    await session.endSession();
  }
});


// ========================================
// CANCEL SALES INVOICE
// PATCH /api/sales/:id/cancel
// ========================================

router.patch("/:id/cancel", async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const { id } = req.params;
    const reason = String(req.body.reason || "").trim();

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Invoice ID",
      });
    }

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: "Cancellation reason is required",
      });
    }

    session.startTransaction();

    // ========================================
    // FIND INVOICE
    // ========================================

    const sale = await Sale.findById(id).session(session);

    if (!sale) {
      throw new Error("Sales invoice not found");
    }

    if (sale.status === "CANCELLED") {
      throw new Error("This invoice is already cancelled");
    }

   if (sale.status !== "COMPLETED") {
  throw new Error("Only completed invoices can be cancelled");
}

// ========================================
// PREVENT CANCEL IF SALES RETURN EXISTS
// ========================================

const existingReturn = await SalesReturn.findOne({
  saleId: sale._id,
  status: "COMPLETED",
}).session(session);

if (existingReturn) {
  throw new Error(
    `Invoice ${sale.invoiceNumber} has Sales Return (${existingReturn.returnNumber}). This invoice cannot be cancelled.`
  );
}

const customer = await Customer.findById(
  sale.customerId
).session(session);

    if (!customer) {
      throw new Error("Invoice customer not found");
    }

    // ========================================
    // FIND INVOICE LEDGER ENTRIES
    // ========================================

    const saleLedgerEntries = await CustomerLedger.find({
      saleId: sale._id,
      customerId: sale.customerId,
      isVoided: { $ne: true },
    }).session(session);

    const saleEntries = saleLedgerEntries.filter(
      (entry) => entry.type === "SALE"
    );

    const paymentEntries = saleLedgerEntries.filter(
      (entry) => entry.type === "PAYMENT"
    );

    if (saleEntries.length !== 1) {
      throw new Error(
        "Invoice SALE ledger entry is missing or duplicated. Please check the customer ledger."
      );
    }

    const invoicePaid = Number(
      paymentEntries.reduce(
        (sum, entry) => sum + Number(entry.credit || 0),
        0
      ).toFixed(2)
    );

    const recordedPaid = Number(
      Number(sale.paidAmount || 0).toFixed(2)
    );

    if (Math.abs(invoicePaid - recordedPaid) > 0.01) {
      throw new Error(
        "Invoice payment ledger does not match the invoice paid amount. Please check the payment records before cancelling."
      );
    }

    // ========================================
    // CALCULATE CURRENT OLD DUE
    // EXCLUDE THIS INVOICE'S LEDGER ENTRIES
    // ========================================

    const allCustomerEntries = await CustomerLedger.find({
      customerId: sale.customerId,
      isVoided: { $ne: true },
    }).session(session);

    let currentOldDue = Number(
      customer.openingBalance || 0
    );

    for (const entry of allCustomerEntries) {
      if (String(entry.saleId || "") === String(sale._id)) {
        continue;
      }

      currentOldDue +=
        Number(entry.debit || 0) -
        Number(entry.credit || 0);
    }

    currentOldDue = Number(currentOldDue.toFixed(2));

    // Invoice payment will first adjust current old due.
    // Remaining amount will be refunded.

    const amountAdjusted = Math.min(
      invoicePaid,
      Math.max(0, currentOldDue)
    );

    const refundAmount = Number(
      (invoicePaid - amountAdjusted).toFixed(2)
    );

    // ========================================
    // RESTORE LOT AND PRODUCT STOCK
    // ========================================

    for (const item of sale.items) {
      const bags = Number(item.bags || 0);
      const weightKg = Number(item.weightKg || 0);

      if (
        !item.lotId ||
        !item.productId ||
        !Number.isInteger(bags) ||
        bags < 0 ||
        !Number.isFinite(weightKg) ||
        weightKg < 0 ||
        (bags === 0 && weightKg === 0)
      ) {
        throw new Error(
          `Invalid stock information in invoice item: ${item.productName}`
        );
      }

      // Restore Lot stock.
      const updatedLot = await Lot.findOneAndUpdate(
        {
          _id: item.lotId,
          status: { $in: ["ACTIVE", "COMPLETED"] },
          soldBags: { $gte: bags },
          soldWeightKg: { $gte: weightKg },
        },
        {
          $inc: {
            remainingBags: bags,
            remainingWeightKg: weightKg,
            soldBags: -bags,
            soldWeightKg: -weightKg,
          },
          $set: {
            // A completed lot becomes active again.
            // An already active lot remains active.
            status: "ACTIVE",
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
          `Cannot restore stock for Lot ${item.lotCode}. Lot may be missing, cancelled, or its sold stock has changed.`
        );
      }

      // Restore Product stock.
      const updatedProduct = await Product.findOneAndUpdate(
        {
          _id: item.productId,
        },
        {
          $inc: {
            currentStockBags: bags,
            currentStockKg: weightKg,
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
          `Product not found: ${item.productName}`
        );
      }
    }

    // ========================================
    // VOID INVOICE SALE LEDGER ENTRY
    // ========================================

    await CustomerLedger.updateOne(
      {
        _id: saleEntries[0]._id,
        isVoided: { $ne: true },
      },
      {
        $set: {
          isVoided: true,
          voidedAt: new Date(),
          voidedBy:
            req.admin?.name ||
            req.admin?.username ||
            "Admin",
          voidReason: `Invoice cancelled: ${reason}`,
        },
      },
      { session }
    );

    // ========================================
    // CREATE REFUND ADJUSTMENT
    // ========================================

    if (refundAmount > 0) {
      await CustomerLedger.create(
        [
          {
            customerId: sale.customerId,
            type: "ADJUSTMENT",
            amount: refundAmount,
            debit: refundAmount,
            credit: 0,
            saleId: sale._id,
            reference: sale.invoiceNumber,
            description:
              `Refund for cancelled invoice - ${sale.invoiceNumber}`,
            transactionDate: new Date(),
            createdBy: {
              adminId: req.admin?.adminId || null,
              name: req.admin?.name || "",
              username: req.admin?.username || "",
            },
          },
        ],
        { session }
      );
    }

    // ========================================
    // UPDATE INVOICE STATUS
    // ========================================

    const cancelledAt = new Date();

    sale.status = "CANCELLED";
    sale.cancelledAt = cancelledAt;

    sale.cancelledBy = {
      adminId: req.admin?.adminId || null,
      adminName: req.admin?.name || "",
    };

    sale.cancellationDetails = {
      reason,
      previousDueAdjusted: amountAdjusted,
      refundAmount,
      cancelledBy:
        req.admin?.name ||
        req.admin?.username ||
        "Admin",
      cancelledAt,
    };

    await sale.save({ session });

    // ========================================
    // RECALCULATE CUSTOMER LEDGER
    // ========================================

    const finalBalance =
      await recalculateCustomerLedgerBalances(
        sale.customerId,
        session
      );

    // ========================================
    // COMMIT TRANSACTION
    // ========================================

    await session.commitTransaction();

    return res.json({
      success: true,
      message: "Sales invoice cancelled successfully",
      data: {
        invoiceNumber: sale.invoiceNumber,
        status: sale.status,
        previousDueAdjusted: amountAdjusted,
        refundAmount,
        currentBalance: finalBalance,
      },
    });
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }

    console.error("Cancel Sales Invoice Error:", error);

    return res.status(400).json({
      success: false,
      message:
        error.message || "Failed to cancel sales invoice",
    });
  } finally {
    await session.endSession();
  }
});

export default router;
