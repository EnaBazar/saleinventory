
import express from "express";
import mongoose from "mongoose";

import SalesReturn from "../models/SalesReturn.js";
import Sale from "../models/Sale.js";
import Lot from "../models/Lot.js";
import Product from "../models/Product.js";
import Customer from "../models/Customer.js";
import CustomerLedger from "../models/CustomerLedger.js";

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
    if (transaction.isVoided) continue;

    balance +=
      Number(transaction.debit || 0) -
      Number(transaction.credit || 0);

    operations.push({
      updateOne: {
        filter: { _id: transaction._id },
        update: {
          $set: { balanceAfter: Number(balance.toFixed(2)) },
        },
      },
    });
  }

  if (operations.length) {
    await CustomerLedger.bulkWrite(operations, { session });
  }

  return Number(balance.toFixed(2));
}

// ========================================
// GET SALE INVOICE FOR RETURN
// GET /api/sales-returns/sales/:saleId
// ========================================

router.get("/sales/:saleId", async (req, res) => {
  try {
    const { saleId } = req.params;

    // ========================================
    // VALIDATE INVOICE ID
    // ========================================
    if (!mongoose.isValidObjectId(saleId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Invoice ID",
      });
    }

    // ========================================
    // FIND SALES INVOICE
    // ========================================
    const sale = await Sale.findById(saleId)
      .populate(
        "customerId",
        "customerName companyName mobile address openingBalance"
      )
      .populate("items.productId", "productName")
      .populate("items.lotId", "lotCode");

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: "Sales invoice not found",
      });
    }

    if (sale.status !== "COMPLETED") {
      return res.status(400).json({
        success: false,
        message: "Only completed invoices can be returned",
      });
    }

    // ========================================
    // VALIDATE CUSTOMER
    // ========================================
    const customer = sale.customerId;

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Invoice customer not found",
      });
    }

    // ========================================
    // GET CURRENT CUSTOMER LEDGER BALANCE
    // ========================================
    const customerLedgerEntries = await CustomerLedger.find({
      customerId: customer._id,
      isVoided: { $ne: true },
    })
      .select("debit credit")
      .lean();

    const currentCustomerBalance =
      Number(customer.openingBalance || 0) +
      customerLedgerEntries.reduce((total, entry) => {
        return (
          total +
          Number(entry.debit || 0) -
          Number(entry.credit || 0)
        );
      }, 0);

    const currentCustomerDue = Math.max(
      0,
      Number(currentCustomerBalance.toFixed(2))
    );

    // ========================================
    // GET PREVIOUS COMPLETED SALES RETURNS
    // ========================================
    const previousReturns = await SalesReturn.find({
      saleId: sale._id,
      status: "COMPLETED",
    }).lean();

    const returnedMap = new Map();

    for (const returnDoc of previousReturns) {
      for (const item of returnDoc.items || []) {
        const key = String(item.originalSaleItemId);

        const previous = returnedMap.get(key) || {
          bags: 0,
          weightKg: 0,
        };

        previous.bags += Number(item.bags || 0);
        previous.weightKg += Number(item.weightKg || 0);

        returnedMap.set(key, previous);
      }
    }

    // ========================================
    // PREPARE SALES DATA
    // ========================================
    const saleData = sale.toObject();

    saleData.currentCustomerDue = currentCustomerDue;

    saleData.items = saleData.items.map((item) => {
      const returned = returnedMap.get(String(item._id)) || {
        bags: 0,
        weightKg: 0,
      };

      const remainingBags = Number(
        (
          Number(item.bags || 0) -
          returned.bags
        ).toFixed(3)
      );

      const remainingWeightKg = Number(
        (
          Number(item.weightKg || 0) -
          returned.weightKg
        ).toFixed(3)
      );

      return {
        ...item,

        alreadyReturnedBags: Number(
          returned.bags.toFixed(3)
        ),

        alreadyReturnedWeightKg: Number(
          returned.weightKg.toFixed(3)
        ),

        returnableBags: Math.max(0, remainingBags),

        returnableWeightKg: Math.max(
          0,
          remainingWeightKg
        ),
      };
    });

    // ========================================
    // SUCCESS RESPONSE
    // ========================================
    return res.json({
      success: true,
      data: {
        sale: saleData,
        previousReturnCount: previousReturns.length,
        currentCustomerDue,
      },
    });
  } catch (error) {
    console.error("Get Sales Return Invoice Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch invoice for return",
      error: error.message,
    });
  }
});


// ========================================
// CREATE SALES RETURN
// POST /api/sales-returns
// ========================================
router.post("/", async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const {
      saleId,
      items,
      returnDate,
      refundMethod = "CASH",
      refundReference = "",
      notes = "",
    } = req.body;

    if (!mongoose.isValidObjectId(saleId)) {
      return res.status(400).json({
        success: false,
        message: "Valid Sales Invoice is required",
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one return item is required",
      });
    }

    const parsedReturnDate = returnDate
      ? new Date(returnDate)
      : new Date();

    if (Number.isNaN(parsedReturnDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid return date",
      });
    }

    const allowedRefundMethods = [
      "CASH",
      "BANK",
      "BKASH",
      "NAGAD",
      "ROCKET",
      "OTHER",
    ];

    if (!allowedRefundMethods.includes(refundMethod)) {
      return res.status(400).json({
        success: false,
        message: "Invalid refund method",
      });
    }

    // One original invoice item can appear only once
    // in a single return request.
    const itemIds = items.map((item) =>
      String(item.originalSaleItemId || "")
    );

    if (new Set(itemIds).size !== itemIds.length) {
      return res.status(400).json({
        success: false,
        message: "Duplicate invoice item found in return request",
      });
    }

    let responseData;

    await session.withTransaction(async () => {
      // ========================================
      // 1. FIND ORIGINAL SALE
      // ========================================
    const sale = await Sale.findById(saleId).session(session);

if (!sale) {
  throw new Error("Sales invoice not found");
}

if (sale.status !== "COMPLETED") {
  throw new Error("Only completed invoices can be returned");
}

// ========================================
// SALES RETURN TRANSACTION LOCK
// Prevent concurrent returns on same invoice
// ========================================

const lockedSale = await Sale.findOneAndUpdate(
  {
    _id: sale._id,
    status: "COMPLETED",
  },
  {
    $inc: {
      returnVersion: 1,
    },
  },
  {
    new: true,
    session,
    runValidators: true,
  }
);

if (!lockedSale) {
  throw new Error(
    "Invoice is no longer available for Sales Return. Please refresh and try again."
  );
}

      const customer = await Customer.findById(
        sale.customerId
      ).session(session);

      if (!customer || !customer.isActive) {
        throw new Error("Invoice customer not found or inactive");
      }

      // ========================================
      // 2. FIND PREVIOUS RETURNS
      // ========================================
      const previousReturns = await SalesReturn.find({
        saleId: sale._id,
        status: "COMPLETED",
      }).session(session);

      const returnedMap = new Map();

      for (const returnDoc of previousReturns) {
        for (const returnedItem of returnDoc.items || []) {
          const key = String(returnedItem.originalSaleItemId);

          const previous = returnedMap.get(key) || {
            bags: 0,
            weightKg: 0,
          };

          previous.bags += Number(returnedItem.bags || 0);
          previous.weightKg += Number(returnedItem.weightKg || 0);

          returnedMap.set(key, previous);
        }
      }

      // ========================================
      // 3. VALIDATE RETURN ITEMS
      // ========================================
      const preparedItems = [];

      let totalBags = 0;
      let totalWeightKg = 0;
      let totalReturnAmount = 0;

      for (const requestItem of items) {
        const originalItemId = requestItem.originalSaleItemId;

        if (!mongoose.isValidObjectId(originalItemId)) {
          throw new Error("Invalid original invoice item ID");
        }

        const originalItem = sale.items.id(originalItemId);

        if (!originalItem) {
          throw new Error(
            "Return item does not belong to this invoice"
          );
        }

        const bags = Number(requestItem.bags || 0);
        const weightKg = Number(requestItem.weightKg || 0);

        if (
          !Number.isInteger(bags) ||
          bags < 0 ||
          !Number.isFinite(weightKg) ||
          weightKg < 0 ||
          (bags === 0 && weightKg === 0)
        ) {
          throw new Error(
            `Invalid return quantity for ${originalItem.productName}`
          );
        }

        const previous = returnedMap.get(String(originalItem._id)) || {
          bags: 0,
          weightKg: 0,
        };

        const alreadyReturnedBags = Number(previous.bags || 0);
        const alreadyReturnedWeight = Number(previous.weightKg || 0);

        const remainingBags = Number(
          (
            Number(originalItem.bags || 0) -
            alreadyReturnedBags
          ).toFixed(3)
        );

        const remainingWeight = Number(
          (
            Number(originalItem.weightKg || 0) -
            alreadyReturnedWeight
          ).toFixed(3)
        );

        if (
          bags > remainingBags + 0.0001 ||
          weightKg > remainingWeight + 0.0001
        ) {
          throw new Error(
            `Return quantity exceeds sold quantity for ${originalItem.productName}. Remaining: ${remainingBags} bags, ${remainingWeight} KG`
          );
        }

        // ========================================
        // RETURN AMOUNT FROM ORIGINAL SALE RATES
        // ========================================
   
const saleRate = Number(
  originalItem.saleRatePerKg || 0
);

const labourRate = Number(
  originalItem.labourRatePerBag || 0
);

const originalWeight = Number(
  originalItem.weightKg || 0
);

const originalBags = Number(
  originalItem.bags || 0
);

const commissionRate = Number(
  originalItem.commissionRatePerKg || 0
);

const productTotal =
  originalWeight > 0
    ? Number(
        (
          Number(originalItem.productTotal || 0) *
          weightKg /
          originalWeight
        ).toFixed(2)
      )
    : 0;

const labourTotal =
  originalBags > 0
    ? Number(
        (
          Number(originalItem.labourTotal || 0) *
          bags /
          originalBags
        ).toFixed(2)
      )
    : 0;

const commissionTotal =
  originalWeight > 0
    ? Number(
        (
          Number(originalItem.commissionTotal || 0) *
          weightKg /
          originalWeight
        ).toFixed(2)
      )
    : 0;


      
        const returnAmount = Number(
          (
            productTotal +
            commissionTotal +
            labourTotal
          ).toFixed(2)
        );

        if (returnAmount <= 0) {
          throw new Error(
            `Return amount must be greater than zero for ${originalItem.productName}`
          );
        }

        preparedItems.push({
          originalSaleItemId: originalItem._id,

          productId: originalItem.productId,
          productName: originalItem.productName,

          lotId: originalItem.lotId,
          lotCode: originalItem.lotCode,

          stockType: originalItem.stockType,

          bags,
          weightKg,

          saleRatePerKg: saleRate,
          commissionRatePerKg: commissionRate,
          labourRatePerBag: labourRate,

          productTotal,
          commissionTotal,
          labourTotal,
          returnAmount,
        });

        totalBags += bags;
        totalWeightKg += weightKg;
        totalReturnAmount += returnAmount;
      }

      totalWeightKg = Number(totalWeightKg.toFixed(3));
      totalReturnAmount = Number(totalReturnAmount.toFixed(2));

      // ========================================
      // 4. CALCULATE CUSTOMER DUE BEFORE RETURN
      // ========================================
      const customerLedger = await CustomerLedger.find({
        customerId: customer._id,
        isVoided: { $ne: true },
      }).session(session);

      let dueBeforeReturn = Number(customer.openingBalance || 0);

      for (const entry of customerLedger) {
        dueBeforeReturn +=
          Number(entry.debit || 0) -
          Number(entry.credit || 0);
      }

      dueBeforeReturn = Number(dueBeforeReturn.toFixed(2));

      // Return credit first adjusts positive outstanding due.
      // Remaining amount is refunded to customer.
      const amountAdjusted = Number(
        Math.min(
          totalReturnAmount,
          Math.max(0, dueBeforeReturn)
        ).toFixed(2)
      );

      const refundAmount = Number(
        (totalReturnAmount - amountAdjusted).toFixed(2)
      );

      // ========================================
      // 5. RESTORE ORIGINAL LOT AND PRODUCT STOCK
      // ========================================
      for (const item of preparedItems) {
        const updatedLot = await Lot.findOneAndUpdate(
          {
            _id: item.lotId,
            productId: item.productId,
            status: { $in: ["ACTIVE", "COMPLETED"] },
            soldBags: { $gte: item.bags },
            soldWeightKg: { $gte: item.weightKg },
          },
          {
            $inc: {
              remainingBags: item.bags,
              remainingWeightKg: item.weightKg,
              soldBags: -item.bags,
              soldWeightKg: -item.weightKg,
            },
            $set: {
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
            `Cannot restore stock in Lot ${item.lotCode}. Lot may be missing, cancelled, or sold stock has changed.`
          );
        }

        const updatedProduct = await Product.findOneAndUpdate(
          {
            _id: item.productId,
          },
          {
            $inc: {
              currentStockBags: item.bags,
              currentStockKg: item.weightKg,
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
      // 6. CREATE SALES RETURN RECORD
      // ========================================
      const salesReturn = new SalesReturn({
        saleId: sale._id,
        invoiceNumber: sale.invoiceNumber,

        customerId: customer._id,
        customerName: customer.customerName,
        customerMobile: customer.mobile || "",

        returnDate: parsedReturnDate,

        items: preparedItems,

        totalBags,
        totalWeightKg,

        returnAmount: totalReturnAmount,

        dueBeforeReturn,
        amountAdjusted,
        refundAmount,

        refundMethod: refundAmount > 0 ? refundMethod : null,
        refundReference: refundAmount > 0 ? refundReference : "",

        notes,

        createdBy: {
          adminId: req.admin?.adminId || null,
          adminName: req.admin?.name || "",
        },

        status: "COMPLETED",
      });

      await salesReturn.save({ session });

      // ========================================
      // 7. CUSTOMER LEDGER - SALES RETURN CREDIT
      // ========================================
      await CustomerLedger.create(
        [
          {
            customerId: customer._id,
            type: "SALE_RETURN",
            amount: totalReturnAmount,
            debit: 0,
            credit: totalReturnAmount,
            saleId: sale._id,
            reference: salesReturn.returnNumber,
            description:
              `Sales Return ${salesReturn.returnNumber} against ${sale.invoiceNumber}`,
            transactionDate: parsedReturnDate,
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
      // 8. CUSTOMER LEDGER - REFUND DEBIT
      // ========================================
      if (refundAmount > 0) {
        await CustomerLedger.create(
          [
            {
              customerId: customer._id,
              type: "ADJUSTMENT",
              amount: refundAmount,
              debit: refundAmount,
              credit: 0,
              saleId: sale._id,
              paymentMethod: refundMethod,
              transactionId: refundReference,
              reference: salesReturn.returnNumber,
              description:
                `Cash refund against Sales Return ${salesReturn.returnNumber}`,
              transactionDate: parsedReturnDate,
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
      // 9. RECALCULATE CUSTOMER LEDGER
      // ========================================
      const currentBalance =
        await recalculateCustomerLedgerBalances(
          customer._id,
          session
        );

      responseData = {
        returnId: salesReturn._id,
        returnNumber: salesReturn.returnNumber,
        invoiceNumber: sale.invoiceNumber,
        customerName: customer.customerName,

        totalBags,
        totalWeightKg,

        returnAmount: totalReturnAmount,
        dueBeforeReturn,
        amountAdjusted,
        refundAmount,

        refundMethod:
          refundAmount > 0 ? refundMethod : null,

        currentBalance,
      };
    });

    return res.status(201).json({
      success: true,
      message: "Sales Return completed successfully",
      data: responseData,
    });
  } catch (error) {
    console.error("Create Sales Return Error:", error);

    return res.status(400).json({
      success: false,
      message: error.message || "Failed to create Sales Return",
    });
  } finally {
    await session.endSession();
  }
});

// ========================================
// GET ALL SALES RETURNS
// GET /api/sales-returns
// ========================================
router.get("/", async (req, res) => {
  try {
    const { search, from, to } = req.query;

    const filter = {
      status: "COMPLETED",
    };

    if (from || to) {
      filter.returnDate = {};

      if (from) {
        const startDate = new Date(from);

        if (Number.isNaN(startDate.getTime())) {
          return res.status(400).json({
            success: false,
            message: "Invalid start date",
          });
        }

        filter.returnDate.$gte = startDate;
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
        filter.returnDate.$lte = endDate;
      }
    }

    if (search) {
      const regex = new RegExp(
        String(search).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        "i"
      );

      filter.$or = [
        { returnNumber: regex },
        { invoiceNumber: regex },
        { customerName: regex },
        { customerMobile: regex },
      ];
    }

    const returns = await SalesReturn.find(filter)
      .populate("customerId", "customerName mobile")
      .populate("saleId", "invoiceNumber invoiceDate")
      .sort({ returnDate: -1, createdAt: -1 })
      .limit(200);

    return res.json({
      success: true,
      count: returns.length,
      data: returns,
    });
  } catch (error) {
    console.error("Get Sales Returns Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch Sales Returns",
    });
  }
});

// ========================================
// GET SINGLE SALES RETURN
// GET /api/sales-returns/:id
// ========================================
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Sales Return ID",
      });
    }

    const salesReturn = await SalesReturn.findById(id)
      .populate("customerId", "customerName companyName mobile address")
      .populate("saleId", "invoiceNumber invoiceDate status")
      .populate("items.productId", "productName")
      .populate("items.lotId", "lotCode");

    if (!salesReturn) {
      return res.status(404).json({
        success: false,
        message: "Sales Return not found",
      });
    }

    return res.json({
      success: true,
      data: salesReturn,
    });
  } catch (error) {
    console.error("Get Sales Return Details Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch Sales Return details",
    });
  }
});

export default router;
