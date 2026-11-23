import mongoose from "mongoose";
import { randomBytes } from "node:crypto";
import express from "express";
import Sale from "../models/Sale.js";
import SalesReturn from "../models/SalesReturn.js";
import Lot from "../models/Lot.js";
import StockOut from "../models/StockOut.js";
import DailyStockCheck from "../models/DailyStockCheck.js";
import Product from "../models/Product.js";
import StockAdjustment from "../models/StockAdjustment.js";
import ActivityLog from "../models/ActivityLog.js";


const router = express.Router();

const TIME_ZONE = "Asia/Dhaka";

function getDateKey(date) {
  if (!date) return "";

  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(date));
}

function getWeekKey(date) {
  const dateKey = getDateKey(date);
  if (!dateKey) return "";

  const [year, month, day] = dateKey.split("-").map(Number);
  const utcDate = new Date(Date.UTC(year, month - 1, day));
  const dayOfWeek = utcDate.getUTCDay() || 7;

  utcDate.setUTCDate(utcDate.getUTCDate() - dayOfWeek + 1);

  return utcDate.toISOString().slice(0, 10);
}

function getPeriodKey(date, type) {
  const dateKey = getDateKey(date);
  if (!dateKey) return "Unknown";

  const [year, month] = dateKey.split("-");

  if (type === "yearly") return year;
  if (type === "monthly") return `${year}-${month}`;
  if (type === "weekly") return getWeekKey(date);

  return dateKey;
}

function isInsideDateRange(date, from, to) {
  const dateKey = getDateKey(date);

  if (!dateKey) return false;
  if (from && dateKey < from) return false;
  if (to && dateKey > to) return false;

  return true;
}

function round2(value) {
  return Number(Number(value || 0).toFixed(2));
}

function round3(value) {
  return Number(Number(value || 0).toFixed(3));
}


// ========================================
// DAILY STOCK CHECK OPENING STOCK
// ========================================

// DAILY STOCK CHECK OPENING STOCK

const DAILY_STOCK_START_DATE = "2026-11-23";

// Dhaka time অনুযায়ী একটি দিনের শুরু ও শেষ
function getDailyDateRange(dateKey) {
  const start = new Date(`${dateKey}T00:00:00+06:00`);

  const nextDate = new Date(`${dateKey}T00:00:00Z`);
  nextDate.setUTCDate(nextDate.getUTCDate() + 1);

  const nextDateKey = nextDate.toISOString().slice(0, 10);
  const end = new Date(`${nextDateKey}T00:00:00+06:00`);

  return { start, end };
}

// আগের দিনের Date Key
function getPreviousDailyDateKey(dateKey) {
  const date = new Date(`${dateKey}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

// Daily Stock Check-এর Opening Snapshot তৈরি বা খুঁজে বের করা
async function ensureDailyStockCheck(dateKey) {
  const todayKey = getDateKey(new Date());

  if (
    dateKey < DAILY_STOCK_START_DATE ||
    dateKey > todayKey
  ) {
    throw new Error(
      `Daily Stock Check শুধু ${DAILY_STOCK_START_DATE} থেকে আজ পর্যন্ত করা যাবে।`
    );
  }

  // আগে তৈরি হয়ে থাকলে সেটিই ব্যবহার হবে
  const existingCheck = await DailyStockCheck.findOne({
    dateKey,
  });

  if (existingCheck) {
    return existingCheck;
  }

  let rows = [];
  let openingSnapshotAt = null;

  // প্রথম দিনের Snapshot
  if (dateKey === DAILY_STOCK_START_DATE) {
    openingSnapshotAt = new Date();

    const lots = await Lot.find({
      status: { $in: ["ACTIVE", "COMPLETED"] },
      remainingBags: { $gt: 0 },
    })
      .select("productId remainingBags")
      .lean();

    const stockMap = new Map();

    for (const lot of lots) {
      const productId = String(lot.productId);

      if (!productId) continue;

      stockMap.set(
        productId,
        (stockMap.get(productId) || 0) +
          Number(lot.remainingBags || 0)
      );
    }

    const productIds = Array.from(stockMap.keys());

    const products = await Product.find({
      _id: { $in: productIds },
    })
      .select("productName")
      .lean();

    const productMap = new Map(
      products.map((product) => [
        String(product._id),
        product.productName,
      ])
    );

    rows = productIds.map((productId) => ({
      productId,
      productName: productMap.get(productId) || "Unknown Product",
      openingBags: Math.max(
        0,
        Math.round(stockMap.get(productId) || 0)
      ),
      salesBags: 0,
      salesReturnBags: 0,
      expectedBags: Math.max(
        0,
        Math.round(stockMap.get(productId) || 0)
      ),
      countedBags: null,
      differenceBags: null,
      closingBags: null,
      adjustmentStatus: "PENDING",
    }));
  } else {
    // পরের দিনের Opening আগের দিনের Closing থেকে আসবে
    const previousDateKey =
      getPreviousDailyDateKey(dateKey);

    const previousCheck = await DailyStockCheck.findOne({
      dateKey: previousDateKey,
    }).lean();

    if (!previousCheck) {
      throw new Error(
        `আগের দিন (${previousDateKey}) Daily Stock Check তৈরি করা হয়নি।`
      );
    }

    const previousRows = previousCheck.rows || [];

    const previousDayCompleted = previousRows.every(
      (row) =>
        row.closingBags !== null &&
        row.closingBags !== undefined &&
        ["COMPLETED", "NOT_REQUIRED"].includes(
          row.adjustmentStatus
        )
    );

    if (!previousDayCompleted) {
      throw new Error(
        `আগের দিন (${previousDateKey})-এর Stock Check ও Adjustment সম্পূর্ণ Confirm করুন।`
      );
    }

    rows = previousRows.map((row) => ({
      productId: row.productId,
      productName: row.productName,
      openingBags: Math.max(
        0,
        Math.round(Number(row.closingBags) || 0)
      ),
      salesBags: 0,
      salesReturnBags: 0,
      expectedBags: Math.max(
        0,
        Math.round(Number(row.closingBags) || 0)
      ),
      countedBags: null,
      differenceBags: null,
      closingBags: null,
      adjustmentStatus: "PENDING",
    }));
  }

  try {
    const [createdCheck] = await DailyStockCheck.create([
      {
        dateKey,
        openingSnapshotAt,
        rows,
      },
    ]);

    return createdCheck;
  } catch (error) {
    // একই সময়ে অন্য Request Snapshot তৈরি করলে
    if (error.code === 11000) {
      const savedCheck = await DailyStockCheck.findOne({
        dateKey,
      });

      if (savedCheck) return savedCheck;
    }

    throw error;
  }
}

// নির্দিষ্ট দিনের Sales ও Sales Return Bags হিসাব
async function getDailyStockMovementRows(
  dateKey,
  openingSnapshotAt = null
) {
  const { start: dayStart, end: dayEnd } =
    getDailyDateRange(dateKey);

  // প্রথম দিনের Snapshot-এর আগের Sales বাদ
  const startDate =
    openingSnapshotAt &&
    new Date(openingSnapshotAt) > dayStart
      ? new Date(openingSnapshotAt)
      : dayStart;

  const [sales, returns] = await Promise.all([
    Sale.find({
      status: "COMPLETED",
      completedAt: {
        $gte: startDate,
        $lt: dayEnd,
      },
    })
      .select("items")
      .lean(),

    SalesReturn.find({
      status: "COMPLETED",
      returnDate: {
        $gte: startDate,
        $lt: dayEnd,
      },
    })
      .select("items")
      .lean(),
  ]);

  const movementMap = new Map();

  const getMovementRow = (item) => {
    const productId = String(item.productId || "");

    if (!productId) return null;

    if (!movementMap.has(productId)) {
      movementMap.set(productId, {
        productId,
        productName: item.productName || "Unknown Product",
        salesBags: 0,
        salesReturnBags: 0,
      });
    }

    return movementMap.get(productId);
  };

  for (const sale of sales) {
    for (const item of sale.items || []) {
      const row = getMovementRow(item);

      if (row) {
        row.salesBags += Number(item.bags || 0);
      }
    }
  }

  for (const salesReturn of returns) {
    for (const item of salesReturn.items || []) {
      const row = getMovementRow(item);

      if (row) {
        row.salesReturnBags += Number(item.bags || 0);
      }
    }
  }

  return Array.from(movementMap.values()).map((row) => ({
    ...row,
    salesBags: Math.round(row.salesBags),
    salesReturnBags: Math.round(row.salesReturnBags),
  }));
}


function getGroupInfo(item, type) {
  if (type === "lot") {
    return {
      key: String(item.lotId || item.lotCode || "UNKNOWN"),
      name: item.lotCode || "Unknown Lot",
    };
  }

  if (type === "product") {
    return {
      key: String(item.productId || item.productName || "UNKNOWN"),
      name: item.productName || "Unknown Product",
    };
  }

  if (type === "category") {
    return {
      key: String(item.categoryName || "Uncategorized"),
      name: item.categoryName || "Uncategorized",
    };
  }

  if (type === "supplier") {
    return {
      key: String(item.supplierId || item.supplierName || "UNKNOWN"),
      name: item.supplierName || "Unknown Supplier",
    };
  }

  return {
    key: "ALL",
    name: "OWN Sales",
  };
}

// ========================================
// MAIN OWN SALES REPORT
// ========================================

router.get("/own-sales", async (req, res) => {
  try {
    const allowedTypes = [
      "daily",
      "weekly",
      "monthly",
      "yearly",
      "lot",
      "product",
      "category",
      "supplier",
      "profit-loss",
    ];

    const type = String(req.query.type || "daily").toLowerCase();

    if (!allowedTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid report type",
      });
    }

    const from = req.query.from ? String(req.query.from) : "";
    const to = req.query.to ? String(req.query.to) : "";

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

    if (
      (from && !dateRegex.test(from)) ||
      (to && !dateRegex.test(to))
    ) {
      return res.status(400).json({
        success: false,
        message: "Date format must be YYYY-MM-DD",
      });
    }

    if (from && to && from > to) {
      return res.status(400).json({
        success: false,
        message: "Start date cannot be after end date",
      });
    }

    // FETCH COMPLETED SALES

    const sales = await Sale.find({
      status: "COMPLETED",
    })
      .select(
        "invoiceNumber invoiceDate customerName companyName customerAddress items otherCost discount"
      )
      .sort({ invoiceDate: 1 })
      .lean();

    // FETCH COMPLETED RETURNS

    const returns = await SalesReturn.find({
      status: "COMPLETED",
    })
      .select(
        "saleId returnNumber invoiceNumber returnDate items"
      )
      .sort({ returnDate: 1 })
      .lean();

    // INDEX RETURNS BY ORIGINAL SALE

    const returnsBySaleId = new Map();

    for (const returnDoc of returns) {
      const saleId = String(returnDoc.saleId || "");
      if (!saleId) continue;

      if (!returnsBySaleId.has(saleId)) {
        returnsBySaleId.set(saleId, []);
      }

      returnsBySaleId.get(saleId).push(returnDoc);
    }

    const groups = new Map();

    const totals = {
      totalInvoices: 0,
      totalReturns: 0,
      soldBags: 0,
      returnedBags: 0,
      netBags: 0,
      soldWeightKg: 0,
      returnedWeightKg: 0,
      netWeightKg: 0,
      grossSales: 0,
      returnAmount: 0,
      netSales: 0,
      totalCost: 0,
      returnCost: 0,
      netCost: 0,
      grossProfit: 0,
      returnProfit: 0,
      otherCost: 0,
      discount: 0,
      netProfit: 0,
    };

    const invoiceNumbers = new Set();
    const returnNumbers = new Set();

    // ========================================
    // PROCESS SALES - OWN LOT ONLY
    // ========================================

    for (const sale of sales) {
      if (!isInsideDateRange(sale.invoiceDate, from, to)) {
        continue;
      }

      const ownItems = (sale.items || []).filter(
        (item) => item.stockType === "OWN"
      );

      if (!ownItems.length) continue;

      invoiceNumbers.add(String(sale._id));

      const ownInvoiceAmount = ownItems.reduce(
        (sum, item) => sum + Number(item.lineTotal || 0),
        0
      );

      for (const item of ownItems) {
        const groupInfo = getGroupInfo(item, type);

        const isTimeBasedReport = [
          "daily",
          "weekly",
          "monthly",
          "yearly",
        ].includes(type);

        const groupKey = isTimeBasedReport
          ? getPeriodKey(sale.invoiceDate, type)
          : type === "profit-loss"
            ? "OWN_PROFIT_LOSS"
            : groupInfo.key;

        const groupName = isTimeBasedReport
          ? groupKey
          : type === "profit-loss"
            ? "OWN Profit / Loss"
            : groupInfo.name;

        if (!groups.has(groupKey)) {
          groups.set(groupKey, {
            key: groupKey,
            name: groupName,
            invoices: new Set(),
            returns: new Set(),
            invoiceDetailsMap: new Map(),

            soldBags: 0,
            returnedBags: 0,
            netBags: 0,

            soldWeightKg: 0,
            returnedWeightKg: 0,
            netWeightKg: 0,

            grossSales: 0,
            returnAmount: 0,
            netSales: 0,

            totalCost: 0,
            returnCost: 0,
            netCost: 0,

            grossProfit: 0,
            returnProfit: 0,
            otherCost: 0,
            discount: 0,
            netProfit: 0,
          });
        }

        const group = groups.get(groupKey);
        group.invoices.add(String(sale._id));

        const bags = Number(item.bags || 0);
        const weightKg = Number(item.weightKg || 0);
        const productTotal = Number(item.productTotal || 0);
        const commissionTotal = Number(item.commissionTotal || 0);
        const labourTotal = Number(item.labourTotal || 0);

        const lineRevenue =
          productTotal + commissionTotal + labourTotal;

        const itemCost = Number(item.costTotal || 0);

        const itemProfit =
          productTotal -
          itemCost +
          commissionTotal -
          labourTotal;

        const itemShare =
          ownInvoiceAmount > 0
            ? lineRevenue / ownInvoiceAmount
            : 0;

        const allocatedOtherCost =
          Number(sale.otherCost || 0) * itemShare;

        const allocatedDiscount =
          Number(sale.discount || 0) * itemShare;

        // ========================================
        // INVOICE DETAILS - TIME REPORTS ONLY
        // ========================================

        if (isTimeBasedReport) {
          const invoiceKey = String(sale._id);

          if (!group.invoiceDetailsMap.has(invoiceKey)) {
            group.invoiceDetailsMap.set(invoiceKey, {
              _id: sale._id,
              invoiceNumber: sale.invoiceNumber || "",
              date: sale.invoiceDate || null,
              customerName:
                sale.customerName || sale.companyName || "",
              address: sale.customerAddress || "",
              items: [],
            });
          }

          const invoiceDetail =
            group.invoiceDetailsMap.get(invoiceKey);

          const invoiceReturns = (
            returnsBySaleId.get(invoiceKey) || []
          ).filter((returnDoc) =>
            isInsideDateRange(returnDoc.returnDate, from, to)
          );

          const returnedItems = invoiceReturns
            .flatMap((returnDoc) => returnDoc.items || [])
            .filter((returnItem) => {
              if (returnItem.stockType !== "OWN") return false;

              if (returnItem.originalSaleItemId && item._id) {
                return (
                  String(returnItem.originalSaleItemId) ===
                  String(item._id)
                );
              }

              return (
                String(returnItem.productId || "") ===
                  String(item.productId || "") &&
                String(returnItem.lotId || "") ===
                  String(item.lotId || "")
              );
            });

          const returnedBags = returnedItems.reduce(
            (sum, returnItem) =>
              sum + Number(returnItem.bags || 0),
            0
          );

          const returnedWeightKg = returnedItems.reduce(
            (sum, returnItem) =>
              sum + Number(returnItem.weightKg || 0),
            0
          );

          const itemReturnAmount = returnedItems.reduce(
            (sum, returnItem) =>
              sum +
              Number(
                returnItem.returnAmount ||
                  Number(returnItem.productTotal || 0) +
                    Number(returnItem.commissionTotal || 0) +
                    Number(returnItem.labourTotal || 0)
              ),
            0
          );

          const returnedCost = returnedItems.reduce(
            (sum, returnItem) =>
              sum + Number(returnItem.costTotal || 0),
            0
          );

          const returnedProfit = returnedItems.reduce(
            (sum, returnItem) =>
              sum +
              Number(
                returnItem.profit !== undefined
                  ? returnItem.profit
                  : Number(returnItem.productTotal || 0) -
                      Number(returnItem.costTotal || 0) +
                      Number(returnItem.commissionTotal || 0) -
                      Number(returnItem.labourTotal || 0)
              ),
            0
          );

          invoiceDetail.items.push({
            lotId: item.lotId || null,
            lotCode: item.lotCode || "",
            productId: item.productId || null,
            productName: item.productName || "",

            bags,
            returnedBags,
            netBags: bags - returnedBags,

            weightKg,
            returnedWeightKg,
            netWeightKg: weightKg - returnedWeightKg,

            rate: Number(item.saleRatePerKg || 0),
            productTotal,
            commission: commissionTotal,
            labour: labourTotal,

            saleAmount: lineRevenue,
            returnAmount: itemReturnAmount,

            cost: itemCost,
            returnCost: returnedCost,

            profit:
              itemProfit -
              returnedProfit -
              allocatedOtherCost -
              allocatedDiscount,

            otherCost: allocatedOtherCost,
            discount: allocatedDiscount,
          });
        }

        group.soldBags += bags;
        group.soldWeightKg += weightKg;
        group.grossSales += lineRevenue;
        group.totalCost += itemCost;
        group.grossProfit += itemProfit;
        group.otherCost += allocatedOtherCost;
        group.discount += allocatedDiscount;

        totals.soldBags += bags;
        totals.soldWeightKg += weightKg;
        totals.grossSales += lineRevenue;
        totals.totalCost += itemCost;
        totals.grossProfit += itemProfit;
        totals.otherCost += allocatedOtherCost;
        totals.discount += allocatedDiscount;
      }
    }    // ========================================
    // 5. PROCESS RETURNS - OWN LOT ONLY
    // ========================================

    for (const returnDoc of returns) {
      if (
        !isInsideDateRange(
          returnDoc.returnDate,
          from,
          to
        )
      ) {
        continue;
      }

      const ownItems = (returnDoc.items || []).filter(
        (item) => item.stockType === "OWN"
      );

      if (!ownItems.length) continue;

      returnNumbers.add(String(returnDoc._id));

      for (const item of ownItems) {
        const groupInfo = getGroupInfo(item, type);

        const groupKey =
          type === "daily" ||
          type === "weekly" ||
          type === "monthly" ||
          type === "yearly"
            ? getPeriodKey(returnDoc.returnDate, type)
            : type === "profit-loss"
              ? "OWN_PROFIT_LOSS"
              : groupInfo.key;

        const groupName =
          type === "daily" ||
          type === "weekly" ||
          type === "monthly" ||
          type === "yearly"
            ? groupKey
            : type === "profit-loss"
              ? "OWN Profit / Loss"
              : groupInfo.name;

        if (!groups.has(groupKey)) {
          groups.set(groupKey, {
            key: groupKey,
            name: groupName,

            invoices: new Set(),
            returns: new Set(),
            invoiceDetailsMap: new Map(),

            soldBags: 0,
            returnedBags: 0,
            netBags: 0,

            soldWeightKg: 0,
            returnedWeightKg: 0,
            netWeightKg: 0,

            grossSales: 0,
            returnAmount: 0,
            netSales: 0,

            totalCost: 0,
            returnCost: 0,
            netCost: 0,

            grossProfit: 0,
            returnProfit: 0,
            otherCost: 0,
            discount: 0,
            netProfit: 0,
          });
        }

        const group = groups.get(groupKey);

        group.returns.add(String(returnDoc._id));

        const bags = Number(item.bags || 0);
        const weightKg = Number(item.weightKg || 0);

        const returnAmount = Number(
          item.returnAmount || 0
        );

        const returnCost = Number(
          item.costTotal || 0
        );

        // Returned Product Profit + Returned Commission
        // Labour is excluded from profit.

        const returnProductTotal = Number(
          item.productTotal || 0
        );

        const returnCommissionTotal = Number(
          item.commissionTotal || 0
        );

        const returnLabourTotal = Number(
          item.labourTotal || 0
        );

        const returnProfit =
          returnProductTotal -
          returnCost +
          returnCommissionTotal -
          returnLabourTotal;

        group.returnedBags += bags;
        group.returnedWeightKg += weightKg;

        group.returnAmount += returnAmount;
        group.returnCost += returnCost;
        group.returnProfit += returnProfit;

        totals.returnedBags += bags;
        totals.returnedWeightKg += weightKg;

        totals.returnAmount += returnAmount;
        totals.returnCost += returnCost;
        totals.returnProfit += returnProfit;
      }
    }

    // ========================================
    // 6. FINAL CALCULATIONS
    // ========================================

    const rows = Array.from(groups.values()).map(
      (group) => {
        const netBags =
          group.soldBags - group.returnedBags;

        const netWeightKg =
          group.soldWeightKg - group.returnedWeightKg;

        const netSales =
          group.grossSales - group.returnAmount;

        const netCost =
          group.totalCost - group.returnCost;

        const netProfit =
          group.grossProfit -
          group.returnProfit -
          group.otherCost -
          group.discount;

        return {
          key: group.key,
          name: group.name,

          totalInvoices: group.invoices.size,
          totalReturns: group.returns.size,

          soldBags: round3(group.soldBags),
          returnedBags: round3(group.returnedBags),
          netBags: round3(netBags),

          soldWeightKg: round3(group.soldWeightKg),
          returnedWeightKg: round3(
            group.returnedWeightKg
          ),
          netWeightKg: round3(netWeightKg),

          grossSales: round2(group.grossSales),
          returnAmount: round2(group.returnAmount),
          netSales: round2(netSales),

          totalCost: round2(group.totalCost),
          returnCost: round2(group.returnCost),
          netCost: round2(netCost),

          grossProfit: round2(group.grossProfit),
          returnProfit: round2(group.returnProfit),

          otherCost: round2(group.otherCost),
          discount: round2(group.discount),

          netProfit: round2(netProfit),

          invoiceDetails: [
            "daily",
            "weekly",
            "monthly",
            "yearly",
          ].includes(type)
            ? Array.from(group.invoiceDetailsMap.values())
                .map((invoice) => ({
                  ...invoice,
                  items: invoice.items.map((detail) => ({
                    ...detail,
                    bags: round3(detail.bags),
                    returnedBags: round3(detail.returnedBags),
                    netBags: round3(detail.netBags),
                    weightKg: round3(detail.weightKg),
                    returnedWeightKg: round3(detail.returnedWeightKg),
                    netWeightKg: round3(detail.netWeightKg),
                    rate: round2(detail.rate),
                    productTotal: round2(detail.productTotal),
                    commission: round2(detail.commission),
                    labour: round2(detail.labour),
                    saleAmount: round2(detail.saleAmount),
                    returnAmount: round2(detail.returnAmount),
                    cost: round2(detail.cost),
                    returnCost: round2(detail.returnCost),
                    profit: round2(detail.profit),
                    otherCost: round2(detail.otherCost),
                    discount: round2(detail.discount),
                  })),
                }))
                .sort(
                  (a, b) =>
                    new Date(a.date || 0) - new Date(b.date || 0)
                )
            : undefined,
        };
      }
    );

    // ========================================
    // 7. OVERALL TOTALS
    // ========================================

    totals.totalInvoices = invoiceNumbers.size;
    totals.totalReturns = returnNumbers.size;

    totals.netBags =
      totals.soldBags - totals.returnedBags;

    totals.netWeightKg =
      totals.soldWeightKg - totals.returnedWeightKg;

    totals.netSales =
      totals.grossSales - totals.returnAmount;

    totals.netCost =
      totals.totalCost - totals.returnCost;

    totals.netProfit =
      totals.grossProfit -
      totals.returnProfit -
      totals.otherCost -
      totals.discount;

    const finalTotals = {};

    for (const [key, value] of Object.entries(totals)) {
      finalTotals[key] =
        key === "totalInvoices" ||
        key === "totalReturns"
          ? value
          : key.toLowerCase().includes("bags") ||
              key.toLowerCase().includes("weight")
            ? round3(value)
            : round2(value);
    }

    // ========================================
    // 8. SORT ROWS
    // ========================================

    rows.sort((a, b) => {
      if (
        type === "daily" ||
        type === "weekly" ||
        type === "monthly" ||
        type === "yearly"
      ) {
        return a.key.localeCompare(b.key);
      }

      return b.netSales - a.netSales;
    });

    return res.json({
      success: true,
      reportType: type,
      stockType: "OWN",

      dateRange: {
        from: from || null,
        to: to || null,
      },

      summary: finalTotals,
      count: rows.length,
      data: rows,
    });
  } catch (error) {
    console.error("OWN Sales Report Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to generate OWN Sales Report",
      error: error.message,
    });
  }
});
// ========================================
// OWN SALES REGISTER (INVOICE WISE)
// ========================================

router.get("/own-sales-register", async (req, res) => {
  try {
    const { from, to } = req.query;

    const dateFilter = {};

    if (from || to) {
      dateFilter.invoiceDate = {};

      if (from) {
        dateFilter.invoiceDate.$gte = new Date(`${from}T00:00:00.000Z`);
      }

      if (to) {
        dateFilter.invoiceDate.$lte = new Date(`${to}T23:59:59.999Z`);
      }
    }

    const sales = await Sale.find({
      status: "COMPLETED",
      ...dateFilter,
    })
      .sort({ invoiceDate: -1 })
      .lean();

    const returns = await SalesReturn.find({
      status: "COMPLETED",
    }).lean();

    const returnMap = new Map();

    // Return-গুলো Invoice অনুযায়ী সাজানো
    for (const ret of returns) {
      const saleId = String(ret.saleId || "");

      if (!saleId) continue;

      if (!returnMap.has(saleId)) {
        returnMap.set(saleId, {
          items: [],
          amountAdjusted: 0,
          refundAmount: 0,
        });
      }

      const current = returnMap.get(saleId);

      current.items.push(...(ret.items || []));
      current.amountAdjusted += Number(ret.amountAdjusted || 0);
      current.refundAmount += Number(ret.refundAmount || 0);
    }

    const invoiceRows = [];
    const lotProductMap = new Map();

    const totals = {
      totalInvoices: 0,
      totalSaleAmount: 0,
      paidAmount: 0,
      dueAmount: 0,
      balanceAmount: 0,
      profit: 0,
    };

    for (const sale of sales) {
      const ownItems = (sale.items || []).filter(
        (item) => item.stockType === "OWN"
      );

      if (!ownItems.length) continue;

      const saleId = String(sale._id);
      const invoiceReturns = returnMap.get(saleId) || {
        items: [],
        amountAdjusted: 0,
        refundAmount: 0,
      };

      const ownLineTotal = ownItems.reduce(
        (sum, item) => sum + Number(item.lineTotal || 0),
        0
      );

      if (ownLineTotal <= 0) continue;

      const otherCost = Number(sale.otherCost || 0);
      const discount = Number(sale.discount || 0);

      let invoiceSaleAmount = 0;
      let invoiceCost = 0;
      let invoiceCommission = 0;
      let invoiceLabour = 0;
      let invoiceOtherCost = 0;
      let invoiceDiscount = 0;
      let invoiceReturnAmount = 0;
      let invoiceReturnProfit = 0;

      const itemDetails = [];

      for (const item of ownItems) {
        const productTotal = Number(item.productTotal || 0);
        const commission = Number(item.commissionTotal || 0);
        const labour = Number(item.labourTotal || 0);
        const lineTotal = Number(
          item.lineTotal || productTotal + commission + labour
        );
        const cost = Number(item.costTotal || 0);

        // Other Cost ও Discount শুধু OWN পণ্যে ভাগ হবে
        const share = lineTotal / ownLineTotal;

        const allocatedOtherCost = otherCost * share;
        const allocatedDiscount = discount * share;

        const itemProfit =
          productTotal - cost + commission - labour;

        const returnedItems = invoiceReturns.items.filter((retItem) => {
          if (retItem.originalSaleItemId && item._id) {
            return (
              String(retItem.originalSaleItemId) === String(item._id)
            );
          }

          return (
            String(retItem.productId || "") ===
              String(item.productId || "") &&
            String(retItem.lotId || "") === String(item.lotId || "") &&
            retItem.stockType === "OWN"
          );
        });

        const returnedBags = returnedItems.reduce(
          (sum, retItem) => sum + Number(retItem.bags || 0),
          0
        );

        const returnedWeight = returnedItems.reduce(
          (sum, retItem) => sum + Number(retItem.weightKg || 0),
          0
        );

        const returnedAmount = returnedItems.reduce(
          (sum, retItem) =>
            sum +
            Number(
              retItem.returnAmount ||
                Number(retItem.productTotal || 0) +
                  Number(retItem.commissionTotal || 0) +
                  Number(retItem.labourTotal || 0)
            ),
          0
        );

        const returnedCost = returnedItems.reduce(
          (sum, retItem) => sum + Number(retItem.costTotal || 0),
          0
        );

        const returnedProfit = returnedItems.reduce(
          (sum, retItem) =>
            sum +
            Number(
              retItem.profit !== undefined
                ? retItem.profit
                : Number(retItem.productTotal || 0) -
                    Number(retItem.costTotal || 0) +
                    Number(retItem.commissionTotal || 0) -
                    Number(retItem.labourTotal || 0)
            ),
          0
        );

        const netBags = Number(item.bags || 0) - returnedBags;
        const netWeight =
          Number(item.weightKg || 0) - returnedWeight;

        const netSaleAmount = lineTotal - returnedAmount;

        const netProfit =
          itemProfit -
          returnedProfit -
          allocatedOtherCost -
          allocatedDiscount;

        invoiceSaleAmount += lineTotal;
        invoiceCost += cost;
        invoiceCommission += commission;
        invoiceLabour += labour;
        invoiceOtherCost += allocatedOtherCost;
        invoiceDiscount += allocatedDiscount;
        invoiceReturnAmount += returnedAmount;
        invoiceReturnProfit += returnedProfit;

        itemDetails.push({
          lotId: item.lotId,
          lotCode: item.lotCode || "",
          productId: item.productId,
          productName: item.productName || "",
          bags: Number(item.bags || 0),
          returnedBags,
          netBags,
          weightKg: Number(item.weightKg || 0),
          returnedWeight,
          netWeightKg: netWeight,
          rate: Number(item.saleRatePerKg || 0),
          commission: commission,
          labour: labour,
          saleAmount: lineTotal,
          returnAmount: returnedAmount,
          netSaleAmount,
          profit: netProfit,
        });

        // Lot + Product Wise Summary
        const groupKey = `${String(item.lotId || item.lotCode || "")}_${String(
          item.productId || item.productName || ""
        )}`;

        if (!lotProductMap.has(groupKey)) {
          lotProductMap.set(groupKey, {
            lotId: item.lotId,
            lotCode: item.lotCode || "",
            productId: item.productId,
            productName: item.productName || "",
            soldBags: 0,
            returnedBags: 0,
            netBags: 0,
            soldWeightKg: 0,
            returnedWeightKg: 0,
            netWeightKg: 0,
            saleAmount: 0,
            returnAmount: 0,
            netSaleAmount: 0,
            commission: 0,
            labour: 0,
            profit: 0,
          });
        }

        const group = lotProductMap.get(groupKey);

        group.soldBags += Number(item.bags || 0);
        group.returnedBags += returnedBags;
        group.netBags += netBags;

        group.soldWeightKg += Number(item.weightKg || 0);
        group.returnedWeightKg += returnedWeight;
        group.netWeightKg += netWeight;

        group.saleAmount += lineTotal;
        group.returnAmount += returnedAmount;
        group.netSaleAmount += netSaleAmount;

        group.commission +=
          commission -
          returnedItems.reduce(
            (sum, retItem) =>
              sum + Number(retItem.commissionTotal || 0),
            0
          );

        group.labour +=
          labour -
          returnedItems.reduce(
            (sum, retItem) =>
              sum + Number(retItem.labourTotal || 0),
            0
          );

        group.profit += netProfit;
      }

      const ownInvoiceNetAmount =
        invoiceSaleAmount -
        invoiceReturnAmount -
        invoiceOtherCost -
        invoiceDiscount;

      // Invoice-এর grandTotal-এর অনুপাতে OWN অংশের Payment
      const grandTotal = Number(sale.grandTotal || 0);
      const ownShare =
        grandTotal > 0
          ? Math.min(1, invoiceSaleAmount / grandTotal)
          : 1;

      const ownPaidBeforeReturn =
        Number(sale.paidAmount || 0) * ownShare;

      const ownDueBeforeReturn = Math.max(
        0,
        invoiceSaleAmount -
          invoiceOtherCost -
          invoiceDiscount -
          ownPaidBeforeReturn
      );

      // Return-এর যে অংশ Due-এর সঙ্গে সমন্বয় হয়েছে
      const adjustedReturn = Math.min(
        ownDueBeforeReturn,
        Number(invoiceReturns.amountAdjusted || 0)
      );

      const invoiceDue = Math.max(
        0,
        ownDueBeforeReturn - adjustedReturn
      );

      const invoicePaid = Math.max(
        0,
        ownPaidBeforeReturn -
          Number(invoiceReturns.refundAmount || 0)
      );

      const invoiceProfit =
        invoiceSaleAmount -
        invoiceCost +
        invoiceCommission -
        invoiceLabour -
        invoiceReturnProfit -
        invoiceOtherCost -
        invoiceDiscount;

      const row = {
        _id: sale._id,
        date: sale.invoiceDate,
        invoiceNumber: sale.invoiceNumber || "",
        customerName:
          sale.customerName || sale.companyName || "",
        address: sale.customerAddress || "",
        saleAmount: round2(ownInvoiceNetAmount),
        paidAmount: round2(invoicePaid),
        dueAmount: round2(invoiceDue),
        balanceAmount: round2(invoiceDue),
        profit: round2(invoiceProfit),
        items: itemDetails,
      };

      invoiceRows.push(row);

      totals.totalInvoices += 1;
      totals.totalSaleAmount += ownInvoiceNetAmount;
      totals.paidAmount += invoicePaid;
      totals.dueAmount += invoiceDue;
      totals.balanceAmount += invoiceDue;
      totals.profit += invoiceProfit;
    }

    const lotProductRows = Array.from(lotProductMap.values()).map(
      (item) => ({
        ...item,
        soldWeightKg: round3(item.soldWeightKg),
        returnedWeightKg: round3(item.returnedWeightKg),
        netWeightKg: round3(item.netWeightKg),
        saleAmount: round2(item.saleAmount),
        returnAmount: round2(item.returnAmount),
        netSaleAmount: round2(item.netSaleAmount),
        commission: round2(item.commission),
        labour: round2(item.labour),
        profit: round2(item.profit),
      })
    );

    res.json({
      success: true,
      reportType: "OWN_SALES_REGISTER",
      stockType: "OWN",
      summary: {
        totalInvoices: totals.totalInvoices,
        totalSaleAmount: round2(totals.totalSaleAmount),
        paidAmount: round2(totals.paidAmount),
        dueAmount: round2(totals.dueAmount),
        balanceAmount: round2(totals.balanceAmount),
        profit: round2(totals.profit),
      },
      count: invoiceRows.length,
      data: invoiceRows,
      lotProductSummary: lotProductRows,
    });
  } catch (error) {
    console.error("OWN SALES REGISTER ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Failed to load OWN Sales Register",
      error: error.message,
    });
  }
});


// ========================================
// INVENTORY STOCK IN / STOCK OUT REPORT
// ========================================


router.get("/inventory-summary", async (req, res) => {
  try {
    // 1. FETCH ALL ACTIVE AND COMPLETED LOTS
    const lots = await Lot.find({
      status: { $in: ["ACTIVE", "COMPLETED"] },
    })
      .sort({ purchaseDate: 1, createdAt: 1 })
      .lean();

    // 2. FETCH COMPLETED NON-SALES STOCK OUTS
    const [stockOuts, adjustments] = await Promise.all([
      StockOut.find({
        status: "COMPLETED",
      })
        .select("items")
        .lean(),

      StockAdjustment.find({
        status: "COMPLETED",
      })
        .select("lotId type bags")
        .lean(),
    ]);

    // 3. GROUP NON-SALES STOCK OUT BY LOT
    const stockOutByLot = new Map();

    for (const stockOut of stockOuts) {
      for (const item of stockOut.items || []) {
        const lotId = String(item.lotId || "");

        if (!lotId) continue;

        if (!stockOutByLot.has(lotId)) {
          stockOutByLot.set(lotId, {
            bags: 0,
            weightKg: 0,
          });
        }

        const group = stockOutByLot.get(lotId);

        group.bags += Number(item.bags || 0);
        group.weightKg += Number(item.weightKg || 0);
      }
    }

    // 4. GROUP DAILY STOCK ADJUSTMENTS BY LOT
    const adjustmentByLot = new Map();

    for (const adjustment of adjustments) {
      const lotId = String(adjustment.lotId || "");

      if (!lotId) continue;

      if (!adjustmentByLot.has(lotId)) {
        adjustmentByLot.set(lotId, {
          inBags: 0,
          outBags: 0,
        });
      }

      const group = adjustmentByLot.get(lotId);
      const bags = Number(adjustment.bags || 0);

      if (adjustment.type === "IN") {
        group.inBags += bags;
      } else if (adjustment.type === "OUT") {
        group.outBags += bags;
      }
    }

    // 5. PREPARE LOT-WISE REPORT
    const data = [];

    const summary = {
      own: {
        stockInBags: 0,
        stockInWeightKg: 0,
        salesOutBags: 0,
        salesOutWeightKg: 0,
        otherOutBags: 0,
        otherOutWeightKg: 0,
        totalOutBags: 0,
        totalOutWeightKg: 0,
        availableBags: 0,
        availableWeightKg: 0,
        stockInValue: 0,
        salesOutValue: 0,
        otherOutValue: 0,
        totalOutValue: 0,
        availableValue: 0,
      },

      commission: {
        stockInBags: 0,
        stockInWeightKg: 0,
        salesOutBags: 0,
        salesOutWeightKg: 0,
        otherOutBags: 0,
        otherOutWeightKg: 0,
        totalOutBags: 0,
        totalOutWeightKg: 0,
        availableBags: 0,
        availableWeightKg: 0,
        stockInValue: 0,
        salesOutValue: 0,
        otherOutValue: 0,
        totalOutValue: 0,
        availableValue: 0,
      },
    };

    for (const lot of lots) {
      const stockType =
        lot.stockType === "COMMISSION"
          ? "COMMISSION"
          : "OWN";

      const typeSummary =
        summary[stockType.toLowerCase()];

      const lotId = String(lot._id);

      const otherOut = stockOutByLot.get(lotId) || {
        bags: 0,
        weightKg: 0,
      };

      const adjustment = adjustmentByLot.get(lotId) || {
        inBags: 0,
        outBags: 0,
      };

      const purchasePricePerKg =
        stockType === "OWN"
          ? Number(lot.purchasePricePerKg || 0)
          : 0;

      // Purchase Stock In after Purchase Return
      const purchaseStockInBags = Math.max(
        0,
        Number(lot.bagsReceived || 0) -
          Number(lot.returnedBags || 0)
      );

      const stockInBags =
        purchaseStockInBags + adjustment.inBags;

      const stockInWeightKg = Math.max(
        0,
        Number(lot.totalWeightKg || 0) -
          Number(lot.returnedWeightKg || 0)
      );

      // Sales quantities
      const salesOutBags = Number(lot.soldBags || 0);

      const salesOutWeightKg = Number(
        lot.soldWeightKg || 0
      );

      // Non-sales Stock Out + Adjustment OUT
      const otherOutBags =
        otherOut.bags + adjustment.outBags;

      const otherOutWeightKg = otherOut.weightKg;

      const totalOutBags =
        salesOutBags + otherOutBags;

      const totalOutWeightKg =
        salesOutWeightKg + otherOutWeightKg;

      // Current Available Stock
      const availableBags = Number(
        lot.remainingBags || 0
      );

      const availableWeightKg = Number(
        lot.remainingWeightKg || 0
      );

      // Cost Valuation - OWN Only
      // Bags-only Adjustment-এর কোনো KG Value নেই
      const stockInValue =
        stockType === "OWN"
          ? stockInWeightKg * purchasePricePerKg
          : 0;

      const salesOutValue =
        salesOutWeightKg * purchasePricePerKg;

      const otherOutValue =
        otherOutWeightKg * purchasePricePerKg;

      const totalOutValue =
        salesOutValue + otherOutValue;

      const availableValue =
        availableWeightKg * purchasePricePerKg;

      const row = {
        lotId: lot._id,
        lotCode: lot.lotCode || "",
        lotType: lot.lotType || "PURCHASE",

        productId: lot.productId,
        productName: lot.productName || "",
        categoryName: lot.categoryName || "",
        subcategoryName: lot.subcategoryName || "",
        supplierId: lot.supplierId || null,

        stockType,
        purchaseDate: lot.purchaseDate || null,
        status: lot.status,

        purchasePricePerKg: round2(
          purchasePricePerKg
        ),

        stockInBags: round3(stockInBags),
        stockInWeightKg: round3(stockInWeightKg),

        salesOutBags: round3(salesOutBags),
        salesOutWeightKg: round3(salesOutWeightKg),

        otherOutBags: round3(otherOutBags),
        otherOutWeightKg: round3(otherOutWeightKg),

        totalOutBags: round3(totalOutBags),
        totalOutWeightKg: round3(totalOutWeightKg),

        availableBags: round3(availableBags),
        availableWeightKg: round3(availableWeightKg),

        stockInValue: round2(stockInValue),
        salesOutValue: round2(salesOutValue),
        otherOutValue: round2(otherOutValue),
        totalOutValue: round2(totalOutValue),
        availableValue: round2(availableValue),
      };

      data.push(row);

      // UPDATE SUMMARY
      for (const key of [
        "stockInBags",
        "stockInWeightKg",
        "salesOutBags",
        "salesOutWeightKg",
        "otherOutBags",
        "otherOutWeightKg",
        "totalOutBags",
        "totalOutWeightKg",
        "availableBags",
        "availableWeightKg",
        "stockInValue",
        "salesOutValue",
        "otherOutValue",
        "totalOutValue",
        "availableValue",
      ]) {
        typeSummary[key] += row[key];
      }
    }

    // 6. ROUND SUMMARY VALUES
    for (const type of ["own", "commission"]) {
      for (const [key, value] of Object.entries(
        summary[type]
      )) {
        summary[type][key] =
          key.toLowerCase().includes("bags") ||
          key.toLowerCase().includes("weight")
            ? round3(value)
            : round2(value);
      }
    }

    // 7. OVERALL SUMMARY
    const overall = {};

    for (const key of Object.keys(summary.own)) {
      const value =
        summary.own[key] + summary.commission[key];

      overall[key] =
        key.toLowerCase().includes("bags") ||
        key.toLowerCase().includes("weight")
          ? round3(value)
          : round2(value);
    }

    return res.json({
      success: true,
      reportType: "INVENTORY_STOCK_IN_OUT",

      summary: {
        overall,
        own: summary.own,
        commission: summary.commission,
      },

      count: data.length,
      data,
    });
  } catch (error) {
    console.error("INVENTORY REPORT ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to generate Inventory Report",
      error: error.message,
    });
  }
});


// ========================================
// CURRENT STOCK REPORT
// ========================================

router.get("/current-stock-report", async (req, res) => {
  try {
    const lots = await Lot.find({
      status: { $in: ["ACTIVE", "COMPLETED"] },
    })
      .sort({ purchaseDate: 1, createdAt: 1 })
      .lean();

    const data = lots
      .map((lot) => {
        const stockType =
          lot.stockType === "COMMISSION" ? "COMMISSION" : "OWN";

        const availableBags = Number(lot.remainingBags || 0);
        const availableWeightKg = Number(lot.remainingWeightKg || 0);

        const purchasePricePerKg =
          stockType === "OWN"
            ? Number(lot.purchasePricePerKg || 0)
            : 0;

        return {
          lotId: lot._id,
          lotCode: lot.lotCode || "",
          productId: lot.productId || null,
          productName: lot.productName || "",
          stockType,
          purchaseDate: lot.purchaseDate || null,
          purchasePricePerKg: round2(purchasePricePerKg),
          availableBags: round3(availableBags),
          availableWeightKg: round3(availableWeightKg),
          availableValue: round2(
            availableWeightKg * purchasePricePerKg
          ),
        };
      })
      .filter(
        (row) => row.availableBags > 0 || row.availableWeightKg > 0
      );

    const summary = {
      own: { bags: 0, weightKg: 0, value: 0 },
      commission: { bags: 0, weightKg: 0, value: 0 },
    };

    for (const row of data) {
      const group = summary[row.stockType.toLowerCase()];
      group.bags += row.availableBags;
      group.weightKg += row.availableWeightKg;
      group.value += row.availableValue;
    }

    for (const group of Object.values(summary)) {
      group.bags = round3(group.bags);
      group.weightKg = round3(group.weightKg);
      group.value = round2(group.value);
    }

    return res.json({
      success: true,
      count: data.length,
      summary: {
        own: summary.own,
        commission: summary.commission,
        overall: {
          bags: round3(summary.own.bags + summary.commission.bags),
          weightKg: round3(
            summary.own.weightKg + summary.commission.weightKg
          ),
          value: round2(summary.own.value + summary.commission.value),
        },
      },
      data,
    });
  } catch (error) {
    console.error("CURRENT STOCK REPORT ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to generate Current Stock Report",
      error: error.message,
    });
  }
});
// ========================================
// STOCK TRANSACTION HISTORY
// ========================================

router.get("/stock-transaction-history", async (req, res) => {
  try {
    const { from, to, type, productId, stockType } = req.query;

    const startDate = from
      ? new Date(`${from}T00:00:00+06:00`)
      : null;

    const endDate = to
      ? new Date(`${to}T23:59:59.999+06:00`)
      : null;

    if (
      (startDate && Number.isNaN(startDate.getTime())) ||
      (endDate && Number.isNaN(endDate.getTime()))
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid date filter",
      });
    }

    if (startDate && endDate && startDate > endDate) {
      return res.status(400).json({
        success: false,
        message: "From date cannot be after To date",
      });
    }

    const dateMatch = (date) => {
      if (!date) return false;

      const d = new Date(date);

      if (Number.isNaN(d.getTime())) return false;
      if (startDate && d < startDate) return false;
      if (endDate && d > endDate) return false;

      return true;
    };

    const num = (value) => Number(value || 0);
    const round = (value) => Math.round(num(value) * 100) / 100;

    const transactions = [];

    // ------------------------------------
    // 1. PURCHASE / STOCK IN
    // ------------------------------------

    const lots = await Lot.find({
      status: { $in: ["ACTIVE", "COMPLETED"] },
    }).lean();

    const lotMap = new Map();

    for (const lot of lots) {
      lotMap.set(String(lot._id), lot);

      if (!dateMatch(lot.purchaseDate)) continue;

      transactions.push({
        date: lot.purchaseDate,
        type: "PURCHASE",
        reference: lot.lotCode || "",
        productId: String(lot.productId || ""),
        productName: lot.productName || "",
        lotId: String(lot._id),
        lotCode: lot.lotCode || "",
        stockType: lot.stockType || "OWN",
        bags: num(lot.bagsReceived),
        weightKg: num(lot.totalWeightKg),
        amount: round(lot.totalPurchaseAmount),
        notes: lot.notes || "",
      });

      // ------------------------------------
      // 2. PURCHASE RETURN
      // ------------------------------------

      for (const item of lot.returnHistory || []) {
        if (!dateMatch(item.returnDate)) continue;

        transactions.push({
          date: item.returnDate,
          type: "PURCHASE_RETURN",
          reference: `RETURN-${lot.lotCode || ""}`,
          productId: String(lot.productId || ""),
          productName: lot.productName || "",
          lotId: String(lot._id),
          lotCode: lot.lotCode || "",
          stockType: lot.stockType || "OWN",
          bags: num(item.bagsReturned),
          weightKg: num(item.weightReturnedKg),
          amount: round(item.returnAmount),
          notes: item.notes || "",
        });
      }
    }

    // ------------------------------------
    // 3. SALES
    // ------------------------------------

    const sales = await Sale.find({
      status: "COMPLETED",
    }).lean();

    for (const sale of sales) {
      if (!dateMatch(sale.invoiceDate)) continue;

      for (const item of sale.items || []) {
        transactions.push({
          date: sale.invoiceDate,
          type: "SALES",
          reference: sale.invoiceNumber || "",
          productId: String(item.productId || ""),
          productName: item.productName || "",
          lotId: String(item.lotId || ""),
          lotCode: item.lotCode || "",
          stockType: item.stockType || "OWN",
          bags: num(item.bags),
          weightKg: num(item.weightKg),
          amount: round(item.lineTotal),
          notes: "",
        });
      }
    }

    // ------------------------------------
    // 4. SALES RETURN
    // ------------------------------------

    const salesReturns = await SalesReturn.find({
      status: "COMPLETED",
    }).lean();

    for (const returnDoc of salesReturns) {
      if (!dateMatch(returnDoc.returnDate)) continue;

      for (const item of returnDoc.items || []) {
        transactions.push({
          date: returnDoc.returnDate,
          type: "SALES_RETURN",
          reference: returnDoc.returnNumber || "",
          invoiceNumber: returnDoc.invoiceNumber || "",
          productId: String(item.productId || ""),
          productName: item.productName || "",
          lotId: String(item.lotId || ""),
          lotCode: item.lotCode || "",
          stockType: item.stockType || "OWN",
          bags: num(item.bags),
          weightKg: num(item.weightKg),
          amount: round(item.returnAmount),
          notes: returnDoc.notes || "",
        });
      }
    }

    // ------------------------------------
    // 5. OTHER STOCK OUT
    // ------------------------------------

 
    // ------------------------------------
    // 6. DAILY STOCK ADJUSTMENTS
    // ------------------------------------

    const adjustments = await StockAdjustment.find({
      status: "COMPLETED",
    }).lean();

    for (const adjustment of adjustments) {
      if (!dateMatch(adjustment.date)) continue;

      const lot = lotMap.get(String(adjustment.lotId || ""));

      const isStockIn = adjustment.type === "IN";

      transactions.push({
        date: adjustment.date,

        type: isStockIn
          ? "STOCK_ADJUSTMENT_IN"
          : "STOCK_ADJUSTMENT_OUT",

        reference: adjustment.adjustmentNumber || "",

        productId: String(adjustment.productId || ""),
        productName: adjustment.productName || "",

        lotId: String(adjustment.lotId || ""),
        lotCode:
          adjustment.lotCode ||
          lot?.lotCode ||
          "",

        stockType: lot?.stockType || "OWN",

        bags: num(adjustment.bags),

        weightKg: 0,
        amount: 0,

        notes: adjustment.notes || adjustment.reason || "",
      });
    }


    // ------------------------------------
    // FILTERS
    // ------------------------------------

    let filtered = transactions;

    if (type && type !== "ALL") {
      filtered = filtered.filter((item) => item.type === type);
    }

    if (productId && productId !== "ALL") {
      filtered = filtered.filter(
        (item) => item.productId === String(productId)
      );
    }

    if (stockType && stockType !== "ALL") {
      filtered = filtered.filter(
        (item) => item.stockType === stockType
      );
    }

    // Latest transaction first
    filtered.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    // ------------------------------------
    // SUMMARY
    // ------------------------------------

    const summary = {
      totalTransactions: filtered.length,
      purchaseBags: 0,
      purchaseKg: 0,
      purchaseReturnBags: 0,
      purchaseReturnKg: 0,
      salesBags: 0,
      salesKg: 0,
      salesReturnBags: 0,
      salesReturnKg: 0,
      stockOutBags: 0,
      stockOutKg: 0,
      adjustmentInBags: 0,
adjustmentOutBags: 0,
    };

    for (const item of filtered) {
      if (item.type === "PURCHASE") {
        summary.purchaseBags += item.bags;
        summary.purchaseKg += item.weightKg;
      } else if (item.type === "PURCHASE_RETURN") {
        summary.purchaseReturnBags += item.bags;
        summary.purchaseReturnKg += item.weightKg;
      } else if (item.type === "SALES") {
        summary.salesBags += item.bags;
        summary.salesKg += item.weightKg;
      } else if (item.type === "SALES_RETURN") {
        summary.salesReturnBags += item.bags;
        summary.salesReturnKg += item.weightKg;
      } else if (item.type === "STOCK_OUT") {
        summary.stockOutBags += item.bags;
        summary.stockOutKg += item.weightKg;
      }
else if (item.type === "STOCK_ADJUSTMENT_IN") {
  summary.adjustmentInBags += item.bags;
} else if (item.type === "STOCK_ADJUSTMENT_OUT") {
  summary.adjustmentOutBags += item.bags;
}

    }

    for (const key of Object.keys(summary)) {
      if (key !== "totalTransactions") {
        summary[key] = round(summary[key]);
      }
    }

    return res.json({
      success: true,
      count: filtered.length,
      summary,
      data: filtered,
    });
  } catch (error) {
    console.error("STOCK TRANSACTION HISTORY ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load Stock Transaction History",
      error: error.message,
    });
  }
});


// ========================================
// DAILY STOCK CHECKING - GET
// ========================================



router.get("/daily-stock-check", async (req, res) => {
  try {
    const { date } = req.query;
    const dateKey = date || getDateKey(new Date());

    // Date format ও বাস্তব তারিখ যাচাই
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(dateKey) ||
      new Date(`${dateKey}T00:00:00Z`)
        .toISOString()
        .slice(0, 10) !== dateKey
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid date",
      });
    }

    // Opening Snapshot তৈরি বা আগের Snapshot লোড
    const dailyCheck = await ensureDailyStockCheck(dateKey);

    const savedCheck = await DailyStockCheck.findOne({
      dateKey,
    }).lean();

    if (!savedCheck) {
      throw new Error("Daily Stock Check could not be loaded.");
    }

    // দিনের Sales ও Sales Return
    const movements = await getDailyStockMovementRows(
      dateKey,
      savedCheck.openingSnapshotAt
    );

    const movementMap = new Map();

    for (const movement of movements) {
      movementMap.set(
        String(movement.productId),
        movement
      );
    }

    const savedRows = savedCheck.rows || [];
    const savedMap = new Map();

    for (const row of savedRows) {
      savedMap.set(String(row.productId), row);
    }

    // Opening Stock-এর সব Product দিয়ে শুরু
    const productIds = new Set([
      ...savedMap.keys(),
      ...movementMap.keys(),
    ]);

    const data = [];

    for (const productId of productIds) {
      const saved = savedMap.get(productId);
      const movement = movementMap.get(productId);

      const openingBags = Math.round(
        Number(saved?.openingBags || 0)
      );

      const salesBags = Math.round(
        Number(movement?.salesBags || 0)
      );

      const salesReturnBags = Math.round(
        Number(movement?.salesReturnBags || 0)
      );

      const expectedBags =
        openingBags - salesBags + salesReturnBags;

      const countedBags =
        saved?.countedBags === null ||
        saved?.countedBags === undefined
          ? null
          : Number(saved.countedBags);

      const differenceBags =
        countedBags === null
          ? null
          : countedBags - expectedBags;

      data.push({
        _id: saved?._id || null,

        productId,

        productName:
          saved?.productName ||
          movement?.productName ||
          "Unknown Product",

        openingBags,
        salesBags,
        salesReturnBags,
        expectedBags,

        countedBags,
        differenceBags,

        closingBags:
          saved?.closingBags === null ||
          saved?.closingBags === undefined
            ? null
            : Number(saved.closingBags),

        adjustmentStatus:
          saved?.adjustmentStatus || "PENDING",

        adjustmentIds: saved?.adjustmentIds || [],
      });
    }

    // Product Name অনুযায়ী সাজানো
    data.sort((a, b) =>
      a.productName.localeCompare(b.productName)
    );

    const isSaved = data.some(
      (row) => row.countedBags !== null
    );

    return res.json({
      success: true,
      date: dateKey,

      isSaved,

      isConfirmed: Boolean(
        savedCheck.adjustmentConfirmedAt
      ),

      openingSnapshotAt:
        savedCheck.openingSnapshotAt || null,

      adjustmentConfirmedAt:
        savedCheck.adjustmentConfirmedAt || null,

      notes: savedCheck.notes || "",

      count: data.length,
      data,
    });
  } catch (error) {
    console.error("Daily Stock Check GET Error:", error);

    const statusCode =
      error.message.includes("আগের দিন") ? 409 : 400;

    return res.status(statusCode).json({
      success: false,
      message:
        error.message || "Failed to load Daily Stock Check",
    });
  }
});




// ========================================
// DAILY STOCK CHECKING - SAVE
// ========================================



router.post("/daily-stock-check", async (req, res) => {
  try {
    const { date, rows, notes } = req.body;

    // Date validation
    if (
      !date ||
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      new Date(`${date}T00:00:00Z`)
        .toISOString()
        .slice(0, 10) !== date
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid date",
      });
    }

    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No stock rows provided",
      });
    }

    // Snapshot তৈরি বা আগের Snapshot লোড
    const dailyCheck = await ensureDailyStockCheck(date);

    // Confirm হয়ে গেলে আর Count পরিবর্তন করা যাবে না
    if (dailyCheck.adjustmentConfirmedAt) {
      return res.status(409).json({
        success: false,
        message: "This Daily Stock Check is already confirmed.",
      });
    }

    // দিনের Sales ও Return হিসাব
    const movements = await getDailyStockMovementRows(
      date,
      dailyCheck.openingSnapshotAt
    );

    const movementMap = new Map();

    for (const movement of movements) {
      movementMap.set(
        String(movement.productId),
        movement
      );
    }

    const existingRows = dailyCheck.rows || [];
    const existingMap = new Map();

    for (const row of existingRows) {
      existingMap.set(String(row.productId), row);
    }

    // Opening Stock ও Movement-এর সব Product
    const requiredProductIds = new Set([
      ...existingMap.keys(),
      ...movementMap.keys(),
    ]);

    const submittedMap = new Map();

    // Frontend-এর Count validation
    for (const item of rows) {
      const productId = String(item.productId || "");

      if (
        !productId ||
        !mongoose.Types.ObjectId.isValid(productId) ||
        !requiredProductIds.has(productId) ||
        submittedMap.has(productId)
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid or duplicate product in stock count.",
        });
      }

      const countedBags = Number(item.countedBags);

      if (
        !Number.isInteger(countedBags) ||
        countedBags < 0
      ) {
        return res.status(400).json({
          success: false,
          message: `Invalid counted bags for product ${productId}`,
        });
      }

      submittedMap.set(productId, countedBags);
    }

    // প্রতিটি Product-এর Physical Count দিতে হবে
    if (submittedMap.size !== requiredProductIds.size) {
      return res.status(400).json({
        success: false,
        message: "Please enter counted bags for every product.",
      });
    }

    const savedRows = [];

    for (const productId of requiredProductIds) {
      const previous = existingMap.get(productId);
      const movement = movementMap.get(productId);

      const openingBags = Math.round(
        Number(previous?.openingBags || 0)
      );

      const salesBags = Math.round(
        Number(movement?.salesBags || 0)
      );

      const salesReturnBags = Math.round(
        Number(movement?.salesReturnBags || 0)
      );

      const expectedBags =
        openingBags - salesBags + salesReturnBags;

      const countedBags = submittedMap.get(productId);

      const differenceBags =
        countedBags - expectedBags;

      savedRows.push({
        _id: previous?._id,

        productId,

        productName:
          previous?.productName ||
          movement?.productName ||
          "Unknown Product",

        openingBags,
        salesBags,
        salesReturnBags,
        expectedBags,

        countedBags,
        differenceBags,

        // Confirm না হওয়া পর্যন্ত Closing Stock চূড়ান্ত নয়
        closingBags: null,

        adjustmentStatus: "PENDING",

        adjustmentIds: previous?.adjustmentIds || [],
      });
    }

    // Save করার সময় Confirm-এর সঙ্গে সংঘর্ষ ঠেকানো
    const savedCheck = await DailyStockCheck.findOneAndUpdate(
      {
        _id: dailyCheck._id,
        adjustmentConfirmedAt: null,
      },
      {
        $set: {
          rows: savedRows,
          notes: String(notes || "").trim(),

          savedBy: {
            adminId: req.admin?.adminId || null,
            name: req.admin?.name || "",
          },
        },
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!savedCheck) {
      return res.status(409).json({
        success: false,
        message: "Daily Stock Check is already confirmed.",
      });
    }

    return res.json({
      success: true,
      message: "Daily Stock Count saved successfully.",
      data: savedCheck,
    });
  } catch (error) {
    console.error("Daily Stock Check POST Error:", error);

    const statusCode =
      error.message.includes("আগের দিন") ||
      error.message.includes("Daily Stock Check")
        ? 409
        : 500;

    return res.status(statusCode).json({
      success: false,
      message:
        error.message || "Failed to save Daily Stock Check",
    });
  }
});



router.post("/daily-stock-check/:date/confirm", async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const { date } = req.params;

    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      new Date(`${date}T00:00:00Z`)
        .toISOString()
        .slice(0, 10) !== date
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid date",
      });
    }

    let result = null;

    await session.withTransaction(async () => {
      const dailyCheck = await DailyStockCheck.findOne({
        dateKey: date,
      }).session(session);

      if (!dailyCheck) {
        throw new Error("Daily Stock Check পাওয়া যায়নি।");
      }

      if (dailyCheck.adjustmentConfirmedAt) {
        throw new Error("এই দিনের Stock Check ইতিমধ্যে Confirm করা হয়েছে।");
      }

      const rows = dailyCheck.rows || [];

      if (rows.length === 0) {
        throw new Error("কোনো Stock Row পাওয়া যায়নি।");
      }

// ======================================
// VERIFY FRESH SALES & SALES RETURN
// ======================================

const freshMovementRows = await getDailyStockMovementRows(
  date,
  dailyCheck.openingSnapshotAt
);

const freshMovementMap = new Map(
  (freshMovementRows || []).map((item) => [
    String(item.productId),
    item,
  ])
);

// নতুন Sale বা Sales Return-এর Product আছে কি না যাচাই
for (const movement of freshMovementRows || []) {
  const exists = rows.some(
    (row) =>
      String(row.productId) === String(movement.productId)
  );

  if (!exists) {
    throw new Error(
      `${movement.productName}: Save করার পর নতুন Sales বা Sales Return হয়েছে। Refresh করে আবার Save করুন।`
    );
  }
}

for (const row of rows) {
  const freshMovement = freshMovementMap.get(
    String(row.productId)
  );

  const freshSalesBags = Number(
    freshMovement?.salesBags || 0
  );

  const freshReturnBags = Number(
    freshMovement?.salesReturnBags || 0
  );

  const freshExpectedBags =
    Number(row.openingBags || 0) -
    freshSalesBags +
    freshReturnBags;

  if (
    freshSalesBags !== Number(row.salesBags || 0) ||
    freshReturnBags !== Number(row.salesReturnBags || 0) ||
    freshExpectedBags !== Number(row.expectedBags || 0)
  ) {
    throw new Error(
      `${row.productName}: Save করার পর Sales বা Sales Return পরিবর্তন হয়েছে। আবার Refresh করে Physical Count Save করুন।`
    );
  }
}

      // সব Product-এর Physical Count দেওয়া হয়েছে কি না
      for (const row of rows) {
        if (
          row.countedBags === null ||
          row.countedBags === undefined ||
          !Number.isInteger(Number(row.countedBags)) ||
          Number(row.countedBags) < 0
        ) {
          throw new Error(
            `${row.productName}: Physical Count সম্পূর্ণ হয়নি।`
          );
        }
      }

      const adminInfo = {
        adminId: req.admin?.adminId || null,
        name: req.admin?.name || "",
        username: req.admin?.username || "",
      };

      // প্রতিটি Product-এর Stock Adjustment
      for (const row of rows) {
        const productId = row.productId;

        const countedBags = Number(row.countedBags);
        const expectedBags = Number(row.expectedBags);

        if (
          !Number.isFinite(expectedBags) ||
          !Number.isInteger(expectedBags)
        ) {
          throw new Error(
            `${row.productName}: Expected Bags সঠিক নয়।`
          );
        }

        const differenceBags =
          countedBags - expectedBags;

        row.differenceBags = differenceBags;

        // Count ও Expected সমান: কোনো Adjustment প্রয়োজন নেই
        if (differenceBags === 0) {
          row.closingBags = countedBags;
          row.adjustmentStatus = "NOT_REQUIRED";
          row.adjustmentIds = [];
          continue;
        }

        const product = await Product.findById(productId)
          .session(session);

        if (!product) {
          throw new Error(
            `${row.productName}: Product পাওয়া যায়নি।`
          );
        }

        const adjustmentType =
          differenceBags > 0 ? "IN" : "OUT";

        let adjustmentBags = Math.abs(differenceBags);

        const adjustmentIds = [];

        // ======================================
        // STOCK OUT: Shortage
        // Oldest Active Lot First
        // ======================================

        if (adjustmentType === "OUT") {
if (
  Number(product.currentStockBags || 0) <
  Math.abs(differenceBags)
) {
  throw new Error(
    `${row.productName}: Product Current Stock Bags পর্যাপ্ত নেই।`
  );
}

          const lots = await Lot.find({
            productId,
            status: "ACTIVE",
            remainingBags: { $gt: 0 },
          })
            .sort({
              purchaseDate: 1,
              createdAt: 1,
              _id: 1,
            })
            .session(session);

          const availableBags = lots.reduce(
            (total, lot) =>
              total + Number(lot.remainingBags || 0),
            0
          );

          if (availableBags < adjustmentBags) {
            throw new Error(
              `${row.productName}: Active Lot-এ পর্যাপ্ত Bags নেই। প্রয়োজন ${adjustmentBags}, পাওয়া যাচ্ছে ${availableBags}।`
            );
          }

          for (const lot of lots) {
            if (adjustmentBags <= 0) break;

            const lotAvailable = Number(
              lot.remainingBags || 0
            );

            const takeBags = Math.min(
              lotAvailable,
              adjustmentBags
            );

            lot.remainingBags -= takeBags;

            if (lot.remainingBags === 0) {
              lot.status = "COMPLETED";
            }

            await lot.save({ session });

            const adjustmentNumber =
              `ADJ-${date.replace(/-/g, "")}-${randomBytes(4)
                .toString("hex")
                .toUpperCase()}`;

            const [adjustment] =
              await StockAdjustment.create(
                [
                  {
                    adjustmentNumber,
                    date: new Date(),
                    type: "OUT",
                    productId,
                    productName: product.productName,
                    lotId: lot._id,
                    lotCode: lot.lotCode,
                    bags: takeBags,
                    reason: "DAILY_STOCK_CHECK",
                    dailyStockCheckId: dailyCheck._id,
                    notes: `Daily Stock Check ${date} - Shortage`,
                    createdBy: adminInfo,
                    status: "COMPLETED",
                  },
                ],
                { session }
              );

            adjustmentIds.push(adjustment._id);

            await ActivityLog.create(
              [
                {
                  adminId: adminInfo.adminId,
                  adminName: adminInfo.name,
                  adminUsername: adminInfo.username,
                  action: "STOCK_ADJUSTMENT_OUT",
                  module: "INVENTORY",
                  description:
                    `${product.productName}: ${takeBags} Bags Stock Out Adjustment`,
                  targetId: lot._id,
                  targetName: product.productName,
                  metadata: {
                    type: "OUT",
                    bags: takeBags,
                    lotId: lot._id,
                    lotCode: lot.lotCode,
                    dailyStockCheckId: dailyCheck._id,
                    date,
                  },
                },
              ],
              { session }
            );

            adjustmentBags -= takeBags;
          }

          // Product-এর Current Bags কমানো
          const updatedProduct =
            await Product.findOneAndUpdate(
              { _id: productId },
              {
                $inc: {
                  currentStockBags: -Math.abs(differenceBags),
                },
              },
              {
                new: true,
                session,
              }
            );
 
          if (!updatedProduct) {
            throw new Error(
              `${row.productName}: Product Stock Update ব্যর্থ হয়েছে।`
            );
          }
        }

        // ======================================
        // STOCK IN: Extra Bags
        // Newest Active Lot First
        // ======================================

        if (adjustmentType === "IN") {
          let lot = await Lot.findOne({
            productId,
            status: "ACTIVE",
            remainingBags: { $gt: 0 },
          })
            .sort({
              purchaseDate: -1,
              createdAt: -1,
              _id: -1,
            })
            .session(session);

          // Active Lot না থাকলে নতুন Adjustment Lot
          if (!lot) {
            lot = new Lot({
              productId,
              productName: product.productName,
              stockType: product.stockType || "OWN",

              lotType: "ADJUSTMENT",

              remainingBags: adjustmentBags,
              remainingWeightKg: 0,

              status: "ACTIVE",

              notes: `Daily Stock Check Adjustment ${date}`,
            });

            await lot.save({ session });
          } else {
            lot.remainingBags =
              Number(lot.remainingBags || 0) +
              adjustmentBags;

            await lot.save({ session });
          }

          const adjustmentNumber =
            `ADJ-${date.replace(/-/g, "")}-${randomBytes(4)
              .toString("hex")
              .toUpperCase()}`;

          const [adjustment] =
            await StockAdjustment.create(
              [
                {
                  adjustmentNumber,
                  date: new Date(),
                  type: "IN",
                  productId,
                  productName: product.productName,
                  lotId: lot._id,
                  lotCode: lot.lotCode,
                  bags: adjustmentBags,
                  reason: "DAILY_STOCK_CHECK",
                  dailyStockCheckId: dailyCheck._id,
                  notes: `Daily Stock Check ${date} - Extra Bags`,
                  createdBy: adminInfo,
                  status: "COMPLETED",
                },
              ],
              { session }
            );

          adjustmentIds.push(adjustment._id);

          await ActivityLog.create(
            [
              {
                adminId: adminInfo.adminId,
                adminName: adminInfo.name,
                adminUsername: adminInfo.username,
                action: "STOCK_ADJUSTMENT_IN",
                module: "INVENTORY",
                description:
                  `${product.productName}: ${adjustmentBags} Bags Stock In Adjustment`,
                targetId: lot._id,
                targetName: product.productName,
                metadata: {
                  type: "IN",
                  bags: adjustmentBags,
                  lotId: lot._id,
                  lotCode: lot.lotCode,
                  dailyStockCheckId: dailyCheck._id,
                  date,
                },
              },
            ],
            { session }
          );

          // Product-এর Current Bags বাড়ানো
          const updatedProduct =
            await Product.findOneAndUpdate(
              { _id: productId },
              {
                $inc: {
                  currentStockBags: adjustmentBags,
                },
              },
              {
                new: true,
                session,
              }
            );

          if (!updatedProduct) {
            throw new Error(
              `${row.productName}: Product Stock Update ব্যর্থ হয়েছে।`
            );
          }
        }

        row.closingBags = countedBags;
        row.adjustmentStatus = "COMPLETED";
        row.adjustmentIds = adjustmentIds;
      }

      // সব Product-এর Adjustment সম্পন্ন
      dailyCheck.adjustmentConfirmedAt = new Date();

      dailyCheck.adjustmentConfirmedBy = {
        adminId: adminInfo.adminId,
        name: adminInfo.name,
      };

      await dailyCheck.save({ session });

      result = dailyCheck;
    });

    return res.json({
      success: true,
      message: "Daily Stock Check Confirmed Successfully.",
      data: result,
    });
  } catch (error) {
    console.error(
      "Daily Stock Check Confirm Error:",
      error
    );

    const statusCode =
      error.message.includes("ইতিমধ্যে Confirm") ||
      error.message.includes("পাওয়া যায়নি") ||
      error.message.includes("সম্পূর্ণ হয়নি")
        ? 409
        : 400;

    return res.status(statusCode).json({
      success: false,
      message:
        error.message || "Stock Adjustment failed.",
    });
  } finally {
    await session.endSession();
  }
});

export default router;