import express from "express";
import Sale from "../models/Sale.js";
import SalesReturn from "../models/SalesReturn.js";

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

export default router;