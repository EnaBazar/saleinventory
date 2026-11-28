import express from "express";

import Sale from "../models/Sale.js";
import SalesReturn from "../models/SalesReturn.js";
import CommissionInvoice from "../models/CommissionInvoice.js";
import Expense from "../models/Expense.js";
import Account from "../models/Account.js";
import AccountLedger from "../models/AccountLedger.js";
import Customer from "../models/Customer.js";
import CustomerLedger from "../models/CustomerLedger.js";
import Supplier from "../models/Supplier.js";
import SupplierLedger from "../models/SupplierLedger.js";
import LoanProvider from "../models/LoanProvider.js";
import LoanTransaction from "../models/LoanTransaction.js";
import Lot from "../models/Lot.js";
import StockOut from "../models/StockOut.js";
import OwnerCapitalLedger from "../models/OwnerCapitalLedger.js";

const router = express.Router();

const money = (value) =>
  Number(Number(value || 0).toFixed(2));

const num = (value) => Number(value || 0);

const sum = (items, getter) =>
  money(
    (items || []).reduce(
      (total, item) => total + num(getter(item)),
      0
    )
  );

const getDhakaDateString = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const values = {};
  for (const part of parts) {
    values[part.type] = part.value;
  }

  return `${values.year}-${values.month}-${values.day}`;
};

const calculateOwnSale = (sale) => {
  const allItems = sale.items || [];
  const ownItems = allItems.filter(
    (item) => item.stockType === "OWN"
  );

  if (!ownItems.length) return null;

  const totalProductValue = allItems.reduce(
    (total, item) => total + num(item.productTotal),
    0
  );

  const ownProductTotal = ownItems.reduce(
    (total, item) => total + num(item.productTotal),
    0
  );

  const ownLabourTotal = ownItems.reduce(
    (total, item) => total + num(item.labourTotal),
    0
  );

  const ownCostTotal = ownItems.reduce(
    (total, item) => total + num(item.costTotal),
    0
  );

  const ownBags = ownItems.reduce(
    (total, item) => total + num(item.bags),
    0
  );

  const ownWeightKg = ownItems.reduce(
    (total, item) => total + num(item.weightKg),
    0
  );

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

  const ownInvoiceValue =
    ownSales + ownOtherCost - ownDiscount;

  const grandTotal = num(sale.grandTotal);

  const paymentRatio =
    grandTotal > 0
      ? Math.min(
          1,
          Math.max(0, ownInvoiceValue / grandTotal)
        )
      : 0;

  const ownPaid = num(sale.paidAmount) * paymentRatio;
  const ownDue = Math.max(0, ownInvoiceValue - ownPaid);

  return {
    sales: money(ownSales),
    productTotal: money(ownProductTotal),
    labourTotal: money(ownLabourTotal),
    costTotal: money(ownCostTotal),
    otherCost: money(ownOtherCost),
    discount: money(ownDiscount),
    profit: money(ownProfit),
    bags: money(ownBags),
    weightKg: money(ownWeightKg),
    paid: money(ownPaid),
    due: money(ownDue),
    ratio: ownRatio,
  };
};

const calculateOwnReturn = (returnDoc) => {
  const allItems = returnDoc.items || [];
  const ownItems = allItems.filter(
    (item) => item.stockType === "OWN"
  );

  if (!ownItems.length) return null;

  const allReturnAmount = allItems.reduce(
    (total, item) => total + num(item.returnAmount),
    0
  );

  const ownProductTotal = ownItems.reduce(
    (total, item) => total + num(item.productTotal),
    0
  );

  const ownLabourTotal = ownItems.reduce(
    (total, item) => total + num(item.labourTotal),
    0
  );

  const ownCostTotal = ownItems.reduce(
    (total, item) => total + num(item.costTotal),
    0
  );

  const ownBags = ownItems.reduce(
    (total, item) => total + num(item.bags),
    0
  );

  const ownWeightKg = ownItems.reduce(
    (total, item) => total + num(item.weightKg),
    0
  );

  const ownReturnAmount = ownProductTotal + ownLabourTotal;

  const ownRatio =
    allReturnAmount > 0
      ? ownReturnAmount / allReturnAmount
      : 0;

  return {
    amount: money(ownReturnAmount),
    costTotal: money(ownCostTotal),
    profit: money(ownReturnAmount - ownCostTotal),
    bags: money(ownBags),
    weightKg: money(ownWeightKg),
    amountAdjusted: money(
      num(returnDoc.amountAdjusted) * ownRatio
    ),
    refundAmount: money(
      num(returnDoc.refundAmount) * ownRatio
    ),
  };
};

const calculateCommissionSale = (sale) => {
  const items = sale.items || [];

  const totalProductValue = items.reduce(
    (total, item) => total + num(item.productTotal),
    0
  );

  const commissionItems = items.filter(
    (item) => item.stockType === "COMMISSION"
  );

  const commissionProductTotal = commissionItems.reduce(
    (total, item) => total + num(item.productTotal),
    0
  );

  const commissionIncome = items.reduce(
    (total, item) => total + num(item.commissionTotal),
    0
  );

  const commissionLabour = commissionItems.reduce(
    (total, item) => total + num(item.labourTotal),
    0
  );

  const commissionRatio =
    totalProductValue > 0
      ? commissionProductTotal / totalProductValue
      : 0;

  return {
    commissionIncome: money(commissionIncome),
    labourIncome: money(commissionLabour),
    otherCost: money(num(sale.otherCost) * commissionRatio),
    discount: money(num(sale.discount) * commissionRatio),
  };
};

const calculateCommissionReturn = (returnDoc) => {
  const items = returnDoc.items || [];
  const commissionItems = items.filter(
    (item) => item.stockType === "COMMISSION"
  );

  return {
    commissionIncome: money(
      items.reduce((total, item) => total + num(item.commissionTotal), 0)
    ),
    labourIncome: money(
      commissionItems.reduce((total, item) => total + num(item.labourTotal), 0)
    ),
  };
};

const getLedgerBalance = (rows, openingBalance = 0) => {
  const debit = sum(rows, (row) => row.debit);
  const credit = sum(rows, (row) => row.credit);

  return money(num(openingBalance) + debit - credit);
};

router.get("/", async (req, res) => {
  try {
    const todayString = getDhakaDateString();

    const currentYear = todayString.slice(0, 4);
    const currentMonth = todayString.slice(5, 7);

    const defaultFrom = `${currentYear}-${currentMonth}-01`;

    const fromString = req.query.from || defaultFrom;
    const toString = req.query.to || todayString;

    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(fromString) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(toString)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid date format. Use YYYY-MM-DD.",
      });
    }

    const from = new Date(
      `${fromString}T00:00:00.000+06:00`
    );

    const to = new Date(
      `${toString}T23:59:59.999+06:00`
    );

    if (
      Number.isNaN(from.getTime()) ||
      Number.isNaN(to.getTime()) ||
      from > to
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid date range",
      });
    }

    const period = {
      $gte: from,
      $lte: to,
    };

    const upToDate = {
      $lte: to,
    };

    const [
      sales,
      returns,
      commissionInvoices,
      expenses,
      interestTransactions,
      accounts,
      accountLedgers,
      customers,
      customerLedgers,
      suppliers,
      supplierLedgers,
      loanProviders,
      loanTransactions,
      lots,
      stockOutCount,
      ownerCapitalEntries,
    ] = await Promise.all([
      Sale.find({
        status: "COMPLETED",
        invoiceDate: period,
      }).lean(),

      SalesReturn.find({
        status: "COMPLETED",
        returnDate: period,
      }).lean(),

      CommissionInvoice.find({
        status: "COMPLETED",
        invoiceDate: period,
      }).lean(),

      Expense.find({
        expenseDate: period,
      }).lean(),

      LoanTransaction.find({
        transactionType: "REPAYMENT",
        isVoided: { $ne: true },
        transactionDate: period,
      }).lean(),

      Account.find({}).lean(),

      AccountLedger.find({
        isVoided: { $ne: true },
        transactionDate: upToDate,
      }).lean(),

      Customer.find({}).lean(),

      CustomerLedger.find({
        isVoided: { $ne: true },
        transactionDate: upToDate,
      }).lean(),

      Supplier.find({}).lean(),

      SupplierLedger.find({
        isVoided: { $ne: true },
        transactionDate: upToDate,
      }).lean(),

      LoanProvider.find({}).lean(),

      LoanTransaction.find({
        isVoided: { $ne: true },
        transactionDate: upToDate,
      }).lean(),

      Lot.find({}).lean(),

      StockOut.countDocuments({
        status: "COMPLETED",
        transactionDate: period,
      }),

      OwnerCapitalLedger.find({
        isVoided: { $ne: true },
        transactionDate: upToDate,
      }).lean(),
    ]);

    // ------------------------------
    // Profit & Loss: OWN Sale
    // ------------------------------

    const ownSaleCalculations = sales
      .map(calculateOwnSale)
      .filter(Boolean);

    const ownReturnCalculations = returns
      .map(calculateOwnReturn)
      .filter(Boolean);

    const ownGrossProfit = money(
      sum(ownSaleCalculations, (item) => item.profit) -
      sum(ownReturnCalculations, (item) => item.profit)
    );

    // ------------------------------
    // Commission Sale & Return
    // ------------------------------

    const commissionSaleCalculations =
      sales.map(calculateCommissionSale);

    const commissionReturnCalculations =
      returns.map(calculateCommissionReturn);

    const saleCommissionIncome = money(
      sum(commissionSaleCalculations, (item) => item.commissionIncome) -
      sum(commissionReturnCalculations, (item) => item.commissionIncome)
    );

    const saleLabourIncome = money(
      sum(commissionSaleCalculations, (item) => item.labourIncome) -
      sum(commissionReturnCalculations, (item) => item.labourIncome)
    );

    const commissionShareOtherCost = sum(
      commissionSaleCalculations,
      (item) => item.otherCost
    );

    const commissionShareDiscount = sum(
      commissionSaleCalculations,
      (item) => item.discount
    );

    const ownOtherCost = sum(
      ownSaleCalculations,
      (item) => item.otherCost
    );

    const otherCostPayable = sum(
      sales,
      (sale) => sale.otherCost
    );

    const salesDiscount = sum(
      sales,
      (sale) => sale.discount
    );

    // ------------------------------
    // Commission Invoice
    // ------------------------------

    const supplierCommissionIncome = sum(
      commissionInvoices,
      (item) => item.commissionCost
    );

    const commissionInvoiceCosts = sum(
      commissionInvoices,
      (item) =>
        num(item.transportCost) +
        num(item.labourCost) +
        num(item.otherCost)
    );

    // ------------------------------
    // Expenses & Loan Interest
    // ------------------------------

    const operatingExpenses = sum(
      expenses,
      (item) => item.amount
    );

    const loanInterestExpense = sum(
      interestTransactions,
      (item) => item.interestAmount
    );

    const netProfit = money(
      ownGrossProfit +
      saleCommissionIncome +
      saleLabourIncome -
      commissionShareOtherCost -
      commissionShareDiscount +
      supplierCommissionIncome -
      commissionInvoiceCosts -
      operatingExpenses -
      loanInterestExpense
    );

    // ------------------------------
    // Cash & Bank
    // ------------------------------

    const accountSummary = accounts.map((account) => {
      const rows = accountLedgers.filter(
        (entry) =>
          String(entry.accountId) === String(account._id)
      );

      const incoming = sum(
        rows.filter((row) => row.direction === "IN"),
        (row) => row.amount
      );

      const outgoing = sum(
        rows.filter((row) => row.direction === "OUT"),
        (row) => row.amount
      );

      return {
        accountId: account._id,
        accountName: account.accountName,
        accountType: account.accountType,
        balance: money(incoming - outgoing),
      };
    });

    const cashAndBank = sum(
      accountSummary,
      (item) => item.balance
    );

    // ------------------------------
    // Customer Receivable
    // ------------------------------

    const customerSummary = customers.map((customer) => {
      const rows = customerLedgers.filter(
        (entry) =>
          String(entry.customerId) === String(customer._id)
      );

      return {
        customerId: customer._id,
        customerName: customer.name || customer.customerName || "",
        balance: getLedgerBalance(
          rows,
          customer.openingBalance
        ),
      };
    });

    const customerReceivable = money(
      sum(
        customerSummary,
        (item) => Math.max(0, item.balance)
      )
    );

    // ------------------------------
    // Supplier Payable
    // ------------------------------

    const supplierSummary = suppliers.map((supplier) => {
      const rows = supplierLedgers.filter(
        (entry) =>
          String(entry.supplierId) === String(supplier._id)
      );

      return {
        supplierId: supplier._id,
        supplierName: supplier.name || supplier.supplierName || "",
        balance: getLedgerBalance(
          rows,
          supplier.openingBalance
        ),
      };
    });

    const supplierPayable = money(
      sum(
        supplierSummary,
        (item) => Math.max(0, item.balance)
      )
    );

    // ------------------------------
    // Loan Outstanding
    // ------------------------------

    const loanSummary = loanProviders.map((provider) => {
      const rows = loanTransactions.filter(
        (entry) =>
          String(entry.loanProviderId) === String(provider._id)
      );

      const receivedPrincipal = sum(
        rows.filter(
          (row) => row.transactionType === "RECEIVED"
        ),
        (row) => row.principalAmount
      );

      const repaidPrincipal = sum(
        rows.filter(
          (row) => row.transactionType === "REPAYMENT"
        ),
        (row) => row.principalAmount
      );

      return {
        loanProviderId: provider._id,
        name: provider.name || provider.providerName || "",
        outstanding: money(
          num(provider.openingBalance) +
          receivedPrincipal -
          repaidPrincipal
        ),
      };
    });

    const loanOutstanding = money(
      sum(
        loanSummary,
        (item) => Math.max(0, item.outstanding)
      )
    );

    // ------------------------------
    // Inventory Assets
    // ------------------------------

    const ownInventoryValue = sum(
      lots.filter((lot) => lot.stockType === "OWN"),
      (lot) =>
        num(lot.remainingWeightKg) *
        num(lot.purchasePricePerKg)
    );

    const commissionInventoryKg = sum(
      lots.filter(
        (lot) => lot.stockType === "COMMISSION"
      ),
      (lot) => lot.remainingWeightKg
    );

    // Commission stock is not owned inventory,
    // therefore it is not included in asset value.

    // ------------------------------
    // Owner Capital
    // ------------------------------

    const openingCapital = sum(
      ownerCapitalEntries.filter(
        (entry) =>
          entry.transactionType === "OPENING_CAPITAL"
      ),
      (entry) => entry.amount
    );

    const newCapitalContributions = sum(
      ownerCapitalEntries.filter(
        (entry) =>
          entry.transactionType === "CAPITAL_DEPOSIT"
      ),
      (entry) => entry.amount
    );

    const ownerWithdrawals = sum(
      ownerCapitalEntries.filter(
        (entry) =>
          entry.transactionType === "OWNER_WITHDRAWAL"
      ),
      (entry) => entry.amount
    );

    const ownerNetCapital = money(
      openingCapital +
      newCapitalContributions -
      ownerWithdrawals
    );

    const totalAssetsShown = money(
      cashAndBank +
      customerReceivable +
      ownInventoryValue
    );

    const totalLiabilitiesShown = money(
      supplierPayable +
      loanOutstanding
    );

    const netAssetsBeforeOwnerCapital = money(
      totalAssetsShown - totalLiabilitiesShown
    );

    return res.json({
      success: true,

      period: {
        from: from.toISOString(),
        to: to.toISOString(),
        fromDate: fromString,
        toDate: toString,
      },

      profitLoss: {
        ownGrossProfit,
        ownOtherCost,
        saleCommissionIncome,
        saleLabourIncome,
        commissionShareOtherCost: money(commissionShareOtherCost),
        commissionShareDiscount: money(commissionShareDiscount),
        otherCostPayable,
        salesDiscount,
        supplierCommissionIncome,
        commissionInvoiceCosts,
        operatingExpenses,
        loanInterestExpense,
        netProfit,

        salesCount: sales.length,
        returnsCount: returns.length,
        commissionInvoiceCount: commissionInvoices.length,
        expenseCount: expenses.length,
      },

      position: {
        cashAndBank,
        accountSummary,

        customerReceivable,
        customerSummary,

        supplierPayable,
        supplierSummary,

        loanOutstanding,
        loanSummary,

        ownInventoryValue,
        commissionInventoryKg,

        totalAssetsShown,
        totalLiabilitiesShown,
        netAssetsBeforeOwnerCapital,
      },

      ownerCapital: {
        openingCapital,
        newCapitalContributions,
        ownerWithdrawals,
        ownerNetCapital,
        entryCount: ownerCapitalEntries.length,
      },

      notes: {
        stockOutCount,

        stockOutTreatment:
          "Stock Out-এর প্রকৃত খরচের নির্ভরযোগ্য হিসাব না থাকায় Stock Out-কে Net Profit/Loss-এ যোগ করা হয়নি।",

        commissionInventoryTreatment:
          "Commission Stock ব্যবসার মালিকানাধীন সম্পদ নয়; তাই এর কেজি দেখানো হয়েছে, সম্পদের টাকায় যোগ করা হয়নি।",

        ownerCapitalTreatment:
          "Owner Capital ও Withdrawal P&L-এর আয় বা খরচ নয়। Opening Capital শুধু Equity Ledger-এ রাখা হয়েছে; Cash/Bank-এ দ্বিতীয়বার যোগ করা হয়নি।",

        netAssetsTreatment:
          "Net Assets = প্রদর্শিত সম্পদ - প্রদর্শিত দায়। Owner Net Capital-এর সঙ্গে এটি সবসময় সমান নাও হতে পারে; পূর্বের সঞ্চিত লাভ-ক্ষতি ও অসম্পূর্ণ হিসাবের কারণে পার্থক্য থাকতে পারে।",
      },
    });
  } catch (error) {
    console.error("Financial summary error:", error);

    return res.status(500).json({
      success: false,
      message: "Could not generate financial summary",
      error: error.message,
    });
  }
});

export default router;
