
import express from "express";
import mongoose from "mongoose";

import LoanProvider from "../models/LoanProvider.js";
import LoanTransaction from "../models/LoanTransaction.js";
import Account from "../models/Account.js";
import AccountLedger from "../models/AccountLedger.js";

const router = express.Router();

// ========================================
// HELPER: CALCULATE ACCOUNT BALANCE
// ========================================
async function getAccountBalance(accountId, session) {
  const result = await AccountLedger.aggregate([
    {
      $match: {
        accountId: new mongoose.Types.ObjectId(accountId),
        isVoided: { $ne: true },
      },
    },
    {
      $group: {
        _id: null,
        balance: {
          $sum: {
            $cond: [
              { $eq: ["$direction", "IN"] },
              "$amount",
              { $multiply: ["$amount", -1] },
            ],
          },
        },
      },
    },
  ]).session(session);

  return result[0]?.balance || 0;
}

// ========================================
// HELPER: CALCULATE LOAN BALANCE
// ========================================
async function getLoanSummary(provider, session = null) {
  const aggregate = LoanTransaction.aggregate([
    {
      $match: {
        providerId: provider._id,
        isVoided: { $ne: true },
      },
    },
    {
      $group: {
        _id: "$transactionType",

        totalPrincipal: {
          $sum: "$principalAmount",
        },

        totalInterest: {
          $sum: "$interestAmount",
        },

        totalAmount: {
          $sum: "$totalAmount",
        },
      },
    },
  ]);

  if (session) {
    aggregate.session(session);
  }

  const result = await aggregate;

  const received = result.find(
    (item) => item._id === "RECEIVED"
  );

  const repayment = result.find(
    (item) => item._id === "REPAYMENT"
  );

  const openingBalance = Number(provider.openingBalance || 0);

  const totalReceived = received?.totalPrincipal || 0;
  const totalPrincipalRepaid = repayment?.totalPrincipal || 0;
  const totalInterestPaid = repayment?.totalInterest || 0;

  const currentOutstanding =
    openingBalance + totalReceived - totalPrincipalRepaid;

  return {
    openingBalance,
    totalReceived,
    totalPrincipalRepaid,
    totalInterestPaid,
    currentOutstanding,
  };
}

// ========================================
// GET LOAN SUMMARY
// GET /api/loans/providers/:id/summary
// ========================================
router.get("/providers/:id/summary", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid loan provider ID",
      });
    }

    const provider = await LoanProvider.findById(id);

    if (!provider) {
      return res.status(404).json({
        success: false,
        message: "Loan provider not found",
      });
    }

    const summary = await getLoanSummary(provider);

    res.status(200).json({
      success: true,
      data: {
        provider,
        ...summary,
      },
    });
  } catch (error) {
    console.error("LOAN SUMMARY ERROR:", error);

    res.status(500).json({
      success: false,
      message: error.message || "Failed to load loan summary",
    });
  }
});

// ========================================
// GET LOAN TRANSACTION HISTORY
// GET /api/loans/transactions
// ========================================
router.get("/transactions", async (req, res) => {
  try {
    const {
      providerId,
      transactionType,
      fromDate,
      toDate,
      page = 1,
      limit = 50,
      status = "ACTIVE",
    } = req.query;

    const filter = {};

    if (providerId) {
      if (!mongoose.Types.ObjectId.isValid(providerId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid provider ID",
        });
      }

      filter.providerId = providerId;
    }

    if (
      transactionType &&
      ["RECEIVED", "REPAYMENT"].includes(transactionType)
    ) {
      filter.transactionType = transactionType;
    }

    if (status === "ACTIVE") {
      filter.isVoided = { $ne: true };
    } else if (status === "VOIDED") {
      filter.isVoided = true;
    }

    if (fromDate || toDate) {
      filter.transactionDate = {};

      if (fromDate) {
        const start = new Date(fromDate);

        if (Number.isNaN(start.getTime())) {
          return res.status(400).json({
            success: false,
            message: "Invalid start date",
          });
        }

        start.setHours(0, 0, 0, 0);
        filter.transactionDate.$gte = start;
      }

      if (toDate) {
        const end = new Date(toDate);

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

    const currentPage = Math.max(1, Number(page) || 1);
    const pageLimit = Math.min(100, Math.max(1, Number(limit) || 50));
    const skip = (currentPage - 1) * pageLimit;

    const [transactions, total] = await Promise.all([
      LoanTransaction.find(filter)
        .populate("providerId", "providerName providerType bankName")
        .populate("accountId", "accountName accountType bankName")
        .sort({ transactionDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(pageLimit)
        .lean(),

      LoanTransaction.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: transactions,
      pagination: {
        currentPage,
        totalPages: Math.ceil(total / pageLimit),
        totalTransactions: total,
        limit: pageLimit,
      },
    });
  } catch (error) {
    console.error("LOAN TRANSACTION HISTORY ERROR:", error);

    res.status(500).json({
      success: false,
      message: error.message || "Failed to load loan transactions",
    });
  }
});

// ========================================
// CREATE LOAN RECEIVED / REPAYMENT
// POST /api/loans/transactions
// ========================================
router.post("/transactions", async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const {
      providerId,
      transactionType,
      accountId,
      principalAmount,
      interestAmount = 0,
      transactionDate,
      reference,
      description,
    } = req.body;

    if (
      !mongoose.Types.ObjectId.isValid(providerId) ||
      !mongoose.Types.ObjectId.isValid(accountId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid provider or account ID",
      });
    }

    if (!["RECEIVED", "REPAYMENT"].includes(transactionType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid loan transaction type",
      });
    }

    const principal = Number(principalAmount);
    const interest = Number(interestAmount);

    if (
      !Number.isFinite(principal) ||
      !Number.isFinite(interest) ||
      principal < 0 ||
      interest < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid principal or interest amount",
      });
    }

    if (transactionType === "RECEIVED") {
      if (principal <= 0 || interest !== 0) {
        return res.status(400).json({
          success: false,
          message: "Loan received amount must be principal only",
        });
      }
    }

    const date = transactionDate
      ? new Date(transactionDate)
      : new Date();

    if (Number.isNaN(date.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid transaction date",
      });
    }

    let createdTransaction = null;

    await session.withTransaction(async () => {
      const provider = await LoanProvider.findOne({
        _id: providerId,
        isActive: true,
      }).session(session);

      if (!provider) {
        throw new Error("Loan provider not found or inactive");
      }

      const account = await Account.findOne({
        _id: accountId,
        isActive: true,
      }).session(session);

      if (!account) {
        throw new Error("Account not found or inactive");
      }

      const loanType = provider.providerType;

      // Bank loan-এ interest field ব্যবহার করা যাবে না
      if (loanType === "BANK" && interest !== 0) {
        throw new Error(
          "Bank loan repayment does not support separate interest"
        );
      }

      let totalAmount = 0;

      if (transactionType === "RECEIVED") {
        totalAmount = principal;
      }

      if (transactionType === "REPAYMENT") {
        totalAmount = principal + interest;

        if (totalAmount <= 0) {
          throw new Error("Repayment amount must be greater than zero");
        }

        if (loanType === "BANK" && principal <= 0) {
          throw new Error("Bank loan repayment must reduce principal");
        }

        const summary = await getLoanSummary(provider, session);

        if (principal > summary.currentOutstanding) {
          throw new Error(
            `Principal repayment exceeds outstanding loan. Current outstanding: ${summary.currentOutstanding}`
          );
        }

        const accountBalance = await getAccountBalance(
          accountId,
          session
        );

        if (totalAmount > accountBalance) {
          throw new Error(
            `Insufficient account balance. Available balance: ${accountBalance}`
          );
        }
      }

      const adminInfo = {
        adminId: req.admin?.adminId || null,
        name: req.admin?.name || "",
        username: req.admin?.username || "",
      };

      const [loanTransaction] = await LoanTransaction.create(
        [
          {
            providerId: provider._id,
            loanType,
            transactionType,
            accountId: account._id,
            principalAmount: principal,
            interestAmount: interest,
            totalAmount,
            transactionDate: date,
            reference: reference || "",
            description: description || "",
            createdBy: adminInfo,
          },
        ],
        { session }
      );

      const ledgerDirection =
        transactionType === "RECEIVED" ? "IN" : "OUT";

      const ledgerType =
        transactionType === "RECEIVED" ? "DEPOSIT" : "WITHDRAWAL";

      const ledgerDescription =
        transactionType === "RECEIVED"
          ? `Loan Received - ${provider.providerName}`
          : `Loan Repayment - ${provider.providerName}`;

      await AccountLedger.create(
        [
          {
            accountId: account._id,
            transactionType: ledgerType,
            direction: ledgerDirection,
            amount: totalAmount,
            reference: reference || "",
            transactionId: `LOAN-${loanTransaction._id}`,
            description:
              description || ledgerDescription,
            transactionDate: date,
            createdBy: adminInfo,
          },
        ],
        { session }
      );

      createdTransaction = loanTransaction;
    });

    res.status(201).json({
      success: true,
      message:
        transactionType === "RECEIVED"
          ? "Loan received successfully"
          : "Loan repayment completed successfully",
      data: createdTransaction,
    });
  } catch (error) {
    console.error("LOAN TRANSACTION ERROR:", error);

    res.status(400).json({
      success: false,
      message: error.message || "Loan transaction failed",
    });
  } finally {
    await session.endSession();
  }
});

export default router;
