
import express from "express";
import mongoose from "mongoose";

import LoanProvider from "../models/LoanProvider.js";
import LoanTransaction from "../models/LoanTransaction.js";
import Account from "../models/Account.js";
import AccountLedger from "../models/AccountLedger.js";
import LoanAdjustment from "../models/LoanAdjustment.js";

const router = express.Router();

// ========================================
// ACCOUNT BALANCE
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
// SAFE TRANSACTION LOCK
// ========================================
async function lockDocument(Model, document, session, label) {
  const result = await Model.updateOne(
    {
      _id: document._id,
      __v: document.__v,
    },
    {
      $inc: { __v: 1 },
    },
    { session }
  );

  if (result.modifiedCount !== 1) {
    throw new Error(
      `${label} is being updated by another transaction. Please try again.`
    );
  }
}


// ========================================
// LOAN SUMMARY
// GET /api/loans/:providerId/summary
// ========================================
router.get("/:providerId/summary", async (req, res) => {
  try {
    const { providerId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(providerId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid loan provider ID",
      });
    }

    const provider = await LoanProvider.findById(providerId).lean();

    if (!provider) {
      return res.status(404).json({
        success: false,
        message: "Loan provider not found",
      });
    }


    const transactions = await LoanTransaction.aggregate([
      {
        $match: {
          providerId: new mongoose.Types.ObjectId(providerId),
          isVoided: { $ne: true },
        },
      },
      {
        $group: {
          _id: "$transactionType",
          totalPrincipal: { $sum: "$principalAmount" },
          totalInterest: { $sum: "$interestAmount" },
          totalAmount: { $sum: "$totalAmount" },
          count: { $sum: 1 },
        },
      },
    ]);

    const received = transactions.find(
      (item) => item._id === "RECEIVED"
    );

    const repayment = transactions.find(
      (item) => item._id === "REPAYMENT"
    );

    const totalReceived = received?.totalPrincipal || 0;
    const totalPrincipalRepaid = repayment?.totalPrincipal || 0;
    const totalInterestPaid = repayment?.totalInterest || 0;

    const outstanding =
      provider.openingBalance +
      totalReceived -
      totalPrincipalRepaid;

    res.status(200).json({
      success: true,
      data: {
        provider,
        openingBalance: provider.openingBalance,
        totalReceived,
        totalPrincipalRepaid,
        totalInterestPaid,
        totalRepayment:
          (repayment?.totalAmount || 0),
        outstanding,
        totalTransactions:
          (received?.count || 0) + (repayment?.count || 0),
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
// LOAN TRANSACTION HISTORY
// GET /api/loans/:providerId/transactions
// ========================================
router.get("/:providerId/transactions", async (req, res) => {
  try {
    const { providerId } = req.params;
    const {
      fromDate,
      toDate,
      transactionType,
      status = "ACTIVE",
      page = 1,
      limit = 50,
    } = req.query;

    if (!mongoose.Types.ObjectId.isValid(providerId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid loan provider ID",
      });
    }

    const filter = {
      providerId,
    };

    if (status === "ACTIVE") {
      filter.isVoided = { $ne: true };
    } else if (status === "VOIDED") {
      filter.isVoided = true;
    }

    if (
      transactionType &&
      ["RECEIVED", "REPAYMENT"].includes(transactionType)
    ) {
      filter.transactionType = transactionType;
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

    const [transactions, total] = await Promise.all([
      LoanTransaction.find(filter)
        .populate("accountId", "accountName accountType bankName")
        .sort({ transactionDate: -1, createdAt: -1 })
        .skip((currentPage - 1) * pageLimit)
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
    console.error("LOAN HISTORY ERROR:", error);

    res.status(500).json({
      success: false,
      message: error.message || "Failed to load loan transactions",
    });
  }
});

// ========================================
// LOAN RECEIVED
// POST /api/loans/received
// ========================================
router.post("/received", async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const {
      providerId,
      accountId,
      amount,
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

    const receivedAmount = Number(amount);

    if (!Number.isFinite(receivedAmount) || receivedAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Received amount must be greater than zero",
      });
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

    let savedTransaction;

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
await lockDocument(
  Account,
  account,
  session,
  "Account"
);


      const [loanTransaction] = await LoanTransaction.create(
        [
          {
            providerId: provider._id,
            loanType: provider.providerType,
            transactionType: "RECEIVED",
            accountId: account._id,
            principalAmount: receivedAmount,
            interestAmount: 0,
            totalAmount: receivedAmount,
            transactionDate: date,
            reference: reference || "",
            description: description || "Loan Received",
            createdBy: req.admin || {},
          },
        ],
        { session }
      );

      await AccountLedger.create(
        [
          {
            accountId: account._id,
            transactionType: "DEPOSIT",
            direction: "IN",
            amount: receivedAmount,
            transactionId: String(loanTransaction._id),
            reference: reference || "",
            description: `Loan Received - ${provider.providerName}`,
            transactionDate: date,
            createdBy: req.admin || {},
          },
        ],
        { session }
      );

      savedTransaction = loanTransaction;
    });

    res.status(201).json({
      success: true,
      message: "Loan received successfully",
      data: savedTransaction,
    });
  } catch (error) {
    console.error("LOAN RECEIVED ERROR:", error);

    res.status(400).json({
      success: false,
      message: error.message || "Failed to receive loan",
    });
  } finally {
    await session.endSession();
  }
});

// ========================================
// LOAN REPAYMENT
// POST /api/loans/repayment
// ========================================
router.post("/repayment", async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const {
      providerId,
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
        message: "Invalid repayment amount",
      });
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

    let savedTransaction;

    await session.withTransaction(async () => {
      const provider = await LoanProvider.findOne({
        _id: providerId,
        isActive: true,
      }).session(session);

      if (!provider) {
        throw new Error("Loan provider not found or inactive");
      }

await lockDocument(
  LoanProvider,
  provider,
  session,
  "Loan provider"
);

      if (provider.providerType === "BANK" && interest !== 0) {
        throw new Error(
          "Bank loan repayment does not allow a separate interest amount"
        );
      }

      const totalAmount = principal + interest;

      if (totalAmount <= 0) {
        throw new Error("Repayment amount must be greater than zero");
      }

      const account = await Account.findOne({
        _id: accountId,
        isActive: true,
      }).session(session);

      if (!account) {
        throw new Error("Account not found or inactive");
      }

await lockDocument(
  Account,
  account,
  session,
  "Account"
);

      // Calculate current principal outstanding
      const history = await LoanTransaction.aggregate([
        {
          $match: {
            providerId: provider._id,
            isVoided: { $ne: true },
          },
        },
        {
          $group: {
            _id: "$transactionType",
            principal: { $sum: "$principalAmount" },
          },
        },
      ]).session(session);

      const received = history.find(
        (item) => item._id === "RECEIVED"
      )?.principal || 0;

      const repaid = history.find(
        (item) => item._id === "REPAYMENT"
      )?.principal || 0;

      const outstanding =
        provider.openingBalance + received - repaid;

      if (principal > outstanding) {
        throw new Error(
          `Principal repayment exceeds outstanding loan. Current outstanding: ${outstanding}`
        );
      }

      // Check selected account balance
      const accountBalance = await getAccountBalance(
        account._id,
        session
      );

      if (totalAmount > accountBalance) {
        throw new Error(
          `Insufficient account balance. Available balance: ${accountBalance}`
        );
      }

      const [loanTransaction] = await LoanTransaction.create(
        [
          {
            providerId: provider._id,
            loanType: provider.providerType,
            transactionType: "REPAYMENT",
            accountId: account._id,
            principalAmount: principal,
            interestAmount: interest,
            totalAmount,
            transactionDate: date,
            reference: reference || "",
            description: description || "Loan Repayment",
            createdBy: req.admin || {},
          },
        ],
        { session }
      );

      await AccountLedger.create(
        [
          {
            accountId: account._id,
            transactionType: "WITHDRAWAL",
            direction: "OUT",
            amount: totalAmount,
            transactionId: String(loanTransaction._id),
            reference: reference || "",
            description: `Loan Repayment - ${provider.providerName}`,
            transactionDate: date,
            createdBy: req.admin || {},
          },
        ],
        { session }
      );

      savedTransaction = loanTransaction;
    });

    res.status(201).json({
      success: true,
      message: "Loan repayment successful",
      data: savedTransaction,
    });
  } catch (error) {
    console.error("LOAN REPAYMENT ERROR:", error);

    res.status(400).json({
      success: false,
      message: error.message || "Failed to repay loan",
    });
  } finally {
    await session.endSession();
  }
});




// ========================================
// LOAN DIRECT EDIT / ADJUSTMENT
// PUT /api/loans/adjust/:transactionId
// ========================================
router.put("/adjust/:transactionId", async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const { transactionId } = req.params;

    const {
      providerId,
      accountId,
      principalAmount,
      interestAmount = 0,
      transactionDate,
      reference = "",
      description = "",
      reason,
    } = req.body;

    if (
      !mongoose.Types.ObjectId.isValid(transactionId) ||
      !mongoose.Types.ObjectId.isValid(providerId) ||
      !mongoose.Types.ObjectId.isValid(accountId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid transaction, provider or account ID",
      });
    }

    if (!reason || !String(reason).trim()) {
      return res.status(400).json({
        success: false,
        message: "Correction reason is required",
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
        message: "Invalid loan amount",
      });
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

    let savedTransaction;
    let savedAdjustment;

    await session.withTransaction(async () => {
      // Find original transaction
      let original = await LoanTransaction.findOne({
        _id: transactionId,
        isVoided: { $ne: true },
      }).session(session);

      if (!original) {
        throw new Error("Active loan transaction not found");
      }

      const oldProviderId = String(original.providerId);
      const newProviderId = String(providerId);
      const oldAccountId = String(original.accountId);
      const newAccountId = String(accountId);

      const provider = await LoanProvider.findOne({
        _id: providerId,
        isActive: true,
      }).session(session);

      if (!provider) {
        throw new Error("New loan provider not found or inactive");
      }

      const oldProvider = await LoanProvider.findById(
        original.providerId
      ).session(session);

      if (!oldProvider) {
        throw new Error("Original loan provider not found");
      }

      const account = await Account.findOne({
        _id: accountId,
        isActive: true,
      }).session(session);

      if (!account) {
        throw new Error("New account not found or inactive");
      }

      const oldAccount = await Account.findById(
        original.accountId
      ).session(session);

      if (!oldAccount) {
        throw new Error("Original account not found");
      }

      let oldLedger = await AccountLedger.findOne({
        transactionId: String(original._id),
        isVoided: { $ne: true },
      }).session(session);

      if (!oldLedger) {
        throw new Error("Original account ledger entry not found");
      }

      if (String(oldLedger.accountId) !== oldAccountId) {
        throw new Error("Original loan and account ledger do not match");
      }

      // Validate transaction amounts
      const totalAmount = principal + interest;

      if (original.transactionType === "RECEIVED") {
        if (principal <= 0 || interest !== 0) {
          throw new Error(
            "Loan received must contain principal only"
          );
        }
      } else if (original.transactionType === "REPAYMENT") {
        if (provider.providerType === "BANK" && interest !== 0) {
          throw new Error(
            "Bank loan repayment does not allow interest"
          );
        }

        if (totalAmount <= 0) {
          throw new Error(
            "Repayment amount must be greater than zero"
          );
        }
      } else {
        throw new Error("Invalid loan transaction type");
      }

      const correctedTotal =
        original.transactionType === "RECEIVED"
          ? principal
          : totalAmount;

      const newDirection =
        original.transactionType === "RECEIVED" ? "IN" : "OUT";

      // Lock transaction and ledger first
      await lockDocument(
        LoanTransaction,
        original,
        session,
        "Loan transaction"
      );

      await lockDocument(
        AccountLedger,
        oldLedger,
        session,
        "Account ledger"
      );

      // Lock both providers in consistent order
      const providerLocks = [
        { id: oldProviderId, doc: oldProvider },
        { id: newProviderId, doc: provider },
      ];

      providerLocks.sort((a, b) => a.id.localeCompare(b.id));

      const lockedProviderIds = new Set();

      for (const item of providerLocks) {
        if (!lockedProviderIds.has(item.id)) {
          await lockDocument(
            LoanProvider,
            item.doc,
            session,
            "Loan provider"
          );
          lockedProviderIds.add(item.id);
        }
      }

      // Lock both accounts in consistent order
      const accountLocks = [
        { id: oldAccountId, doc: oldAccount },
        { id: newAccountId, doc: account },
      ];

      accountLocks.sort((a, b) => a.id.localeCompare(b.id));

      const lockedAccountIds = new Set();

      for (const item of accountLocks) {
        if (!lockedAccountIds.has(item.id)) {
          await lockDocument(
            Account,
            item.doc,
            session,
            "Account"
          );
          lockedAccountIds.add(item.id);
        }
      }

      // Reload locked documents
      original = await LoanTransaction.findOne({
        _id: transactionId,
        isVoided: { $ne: true },
      }).session(session);

      oldLedger = await AccountLedger.findOne({
        transactionId: String(transactionId),
        isVoided: { $ne: true },
      }).session(session);

      if (!original || !oldLedger) {
        throw new Error("Transaction changed during correction");
      }

      if (
        String(original.providerId) !== oldProviderId ||
        String(original.accountId) !== oldAccountId ||
        String(oldLedger.accountId) !== oldAccountId
      ) {
        throw new Error(
          "Transaction changed by another operation. Please retry."
        );
      }
const expectedLedgerType =
  original.transactionType === "RECEIVED"
    ? "DEPOSIT"
    : "WITHDRAWAL";

const expectedDirection =
  original.transactionType === "RECEIVED"
    ? "IN"
    : "OUT";

if (
  oldLedger.transactionType !== expectedLedgerType ||
  oldLedger.direction !== expectedDirection ||
  Math.abs(
    Number(oldLedger.amount) - Number(original.totalAmount)
  ) > 0.000001
) {
  throw new Error(
    "Original loan and account ledger do not match. Correction stopped."
  );
}



      // Calculate provider outstanding excluding original transaction
      async function getOutstanding(providerDoc) {
        const history = await LoanTransaction.aggregate([
          {
            $match: {
              providerId: providerDoc._id,
              isVoided: { $ne: true },
              _id: { $ne: original._id },
            },
          },
          {
            $group: {
              _id: "$transactionType",
              principal: { $sum: "$principalAmount" },
            },
          },
        ]).session(session);

        const received =
          history.find((x) => x._id === "RECEIVED")?.principal || 0;

        const repaid =
          history.find((x) => x._id === "REPAYMENT")?.principal || 0;

        return (
          Number(providerDoc.openingBalance || 0) +
          received -
          repaid
        );
      }

      const oldOutstanding = await getOutstanding(oldProvider);

      if (oldProviderId !== newProviderId && oldOutstanding < -0.000001) {
        throw new Error(
          "Original provider already has a negative outstanding balance. Correction stopped."
        );
      }

      const newOutstanding = await getOutstanding(provider);

      if (newOutstanding < -0.000001) {
        throw new Error(
          "Selected provider has a negative outstanding balance. Please check its history first."
        );
      }

      if (
        original.transactionType === "REPAYMENT" &&
        principal > newOutstanding + 0.000001
      ) {
        throw new Error(
          `Principal exceeds outstanding loan. Available: ${newOutstanding}`
        );
      }

      // Calculate account balances
      const oldDirection =
        oldLedger.direction === "IN" ? 1 :
        oldLedger.direction === "OUT" ? -1 : null;

      if (oldDirection === null) {
        throw new Error("Invalid original account ledger direction");
      }

      const oldAccountBalance = await getAccountBalance(
        oldAccount._id,
        session
      );

      const oldAccountBalanceAfterRemoval =
        oldAccountBalance - oldDirection * Number(oldLedger.amount);

      const sameAccount = oldAccountId === newAccountId;

      const newAccountBalance = sameAccount
        ? oldAccountBalanceAfterRemoval
        : await getAccountBalance(account._id, session);

      const correctedBalance =
        newAccountBalance +
        (newDirection === "IN" ? 1 : -1) * correctedTotal;

      if (
        oldAccountBalanceAfterRemoval < -0.000001 ||
        correctedBalance < -0.000001
      ) {
        throw new Error(
          "Correction would make an account balance negative"
        );
      }

      // Capture original data
      const beforeData = {
        providerId: original.providerId,
        accountId: original.accountId,
        loanType: original.loanType,
        transactionType: original.transactionType,
        principalAmount: original.principalAmount,
        interestAmount: original.interestAmount,
        totalAmount: original.totalAmount,
        transactionDate: original.transactionDate,
        reference: original.reference,
        description: original.description,
      };

      const beforeLedgerData = {
        accountId: oldLedger.accountId,
        transactionType: oldLedger.transactionType,
        direction: oldLedger.direction,
        amount: oldLedger.amount,
        transactionId: oldLedger.transactionId,
        reference: oldLedger.reference,
        description: oldLedger.description,
        transactionDate: oldLedger.transactionDate,
      };

      // Update loan transaction
      original.providerId = provider._id;
      original.accountId = account._id;
      original.loanType = provider.providerType;
      original.principalAmount = principal;
      original.interestAmount = interest;
      original.totalAmount = correctedTotal;
      original.transactionDate = date;
      original.reference = String(reference || "");
      original.description = String(description || "");

      await original.save({ session });

      // Update linked account ledger
      oldLedger.accountId = account._id;
      oldLedger.transactionType =
        original.transactionType === "RECEIVED"
          ? "DEPOSIT"
          : "WITHDRAWAL";
      oldLedger.direction = newDirection;
      oldLedger.amount = correctedTotal;
      oldLedger.reference = String(reference || "");
      oldLedger.description =
        original.transactionType === "RECEIVED"
          ? `Loan Received - ${provider.providerName}`
          : `Loan Repayment - ${provider.providerName}`;
      oldLedger.transactionDate = date;

      await oldLedger.save({ session });

      // Capture corrected data
      const afterData = {
        providerId: original.providerId,
        accountId: original.accountId,
        loanType: original.loanType,
        transactionType: original.transactionType,
        principalAmount: original.principalAmount,
        interestAmount: original.interestAmount,
        totalAmount: original.totalAmount,
        transactionDate: original.transactionDate,
        reference: original.reference,
        description: original.description,
      };

      const afterLedgerData = {
        accountId: oldLedger.accountId,
        transactionType: oldLedger.transactionType,
        direction: oldLedger.direction,
        amount: oldLedger.amount,
        transactionId: oldLedger.transactionId,
        reference: oldLedger.reference,
        description: oldLedger.description,
        transactionDate: oldLedger.transactionDate,
      };

      const [adjustment] = await LoanAdjustment.create(
        [
          {
            loanTransactionId: original._id,
            providerId: provider._id,
            adjustmentMethod: "DIRECT_EDIT",
            reason: String(reason).trim(),
            beforeData,
            afterData,
            beforeLedgerData,
            afterLedgerData,
            adjustedBy: req.admin || {},
          },
        ],
        { session }
      );

      savedTransaction = original;
      savedAdjustment = adjustment;
    });

    return res.status(200).json({
      success: true,
      message: "Loan transaction corrected successfully",
      data: {
        transaction: savedTransaction,
        adjustment: savedAdjustment,
      },
    });
  } catch (error) {
    console.error("LOAN DIRECT EDIT ERROR:", error);

    return res.status(400).json({
      success: false,
      message: error.message || "Loan correction failed",
    });
  } finally {
    await session.endSession();
  }
});



// ========================================
// LOAN REVERSE + NEW ENTRY
// POST /api/loans/reverse/:transactionId
// ========================================
router.post("/reverse/:transactionId", async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const { transactionId } = req.params;

    const {
      providerId,
      accountId,
      principalAmount,
      interestAmount = 0,
      transactionDate,
      reference = "",
      description = "",
      reason,
    } = req.body;

    if (
      !mongoose.Types.ObjectId.isValid(transactionId) ||
      !mongoose.Types.ObjectId.isValid(providerId) ||
      !mongoose.Types.ObjectId.isValid(accountId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid transaction, provider or account ID",
      });
    }

    if (!reason || !String(reason).trim()) {
      return res.status(400).json({
        success: false,
        message: "Correction reason is required",
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
        message: "Invalid loan amount",
      });
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

    let savedOriginal;
    let savedReplacement;
    let savedAdjustment;

    await session.withTransaction(async () => {
      // Find original active transaction
      let original = await LoanTransaction.findOne({
        _id: transactionId,
        isVoided: { $ne: true },
      }).session(session);

      if (!original) {
        throw new Error("Active loan transaction not found");
      }

      const oldProviderId = String(original.providerId);
      const newProviderId = String(providerId);
      const oldAccountId = String(original.accountId);
      const newAccountId = String(accountId);

      const oldProvider = await LoanProvider.findById(
        original.providerId
      ).session(session);

      const provider = await LoanProvider.findOne({
        _id: providerId,
        isActive: true,
      }).session(session);

      if (!oldProvider || !provider) {
        throw new Error("Original or new loan provider not found");
      }

      const oldAccount = await Account.findById(
        original.accountId
      ).session(session);

      const account = await Account.findOne({
        _id: accountId,
        isActive: true,
      }).session(session);

      if (!oldAccount || !account) {
        throw new Error("Original or new account not found");
      }

      let oldLedger = await AccountLedger.findOne({
        transactionId: String(original._id),
        isVoided: { $ne: true },
      }).session(session);

      if (!oldLedger) {
        throw new Error("Original account ledger entry not found");
      }

      if (String(oldLedger.accountId) !== oldAccountId) {
        throw new Error("Original loan and ledger account do not match");
      }

      if (
        original.transactionType !== "RECEIVED" &&
        original.transactionType !== "REPAYMENT"
      ) {
        throw new Error("Invalid original loan transaction type");
      }

      const totalAmount = principal + interest;

      if (original.transactionType === "RECEIVED") {
        if (principal <= 0 || interest !== 0) {
          throw new Error(
            "Loan received must contain principal only"
          );
        }
      } else {
        if (provider.providerType === "BANK" && interest !== 0) {
          throw new Error(
            "Bank loan repayment does not allow interest"
          );
        }

        if (totalAmount <= 0) {
          throw new Error(
            "Repayment amount must be greater than zero"
          );
        }
      }

      const correctedTotal =
        original.transactionType === "RECEIVED"
          ? principal
          : totalAmount;

      const newDirection =
        original.transactionType === "RECEIVED" ? "IN" : "OUT";

      const expectedOldDirection =
        original.transactionType === "RECEIVED" ? "IN" : "OUT";

      if (
        oldLedger.direction !== expectedOldDirection ||
        Number(oldLedger.amount) !== Number(original.totalAmount)
      ) {
        throw new Error(
          "Original loan and ledger amounts do not match. Please check the records first."
        );
      }

      // Lock original transaction and ledger
      await lockDocument(
        LoanTransaction,
        original,
        session,
        "Loan transaction"
      );

      await lockDocument(
        AccountLedger,
        oldLedger,
        session,
        "Account ledger"
      );

      // Lock providers in consistent order
      const providerLocks = [
        { id: oldProviderId, doc: oldProvider },
        { id: newProviderId, doc: provider },
      ].sort((a, b) => a.id.localeCompare(b.id));

      const lockedProviderIds = new Set();

      for (const item of providerLocks) {
        if (!lockedProviderIds.has(item.id)) {
          await lockDocument(
            LoanProvider,
            item.doc,
            session,
            "Loan provider"
          );

          lockedProviderIds.add(item.id);
        }
      }

      // Lock accounts in consistent order
      const accountLocks = [
        { id: oldAccountId, doc: oldAccount },
        { id: newAccountId, doc: account },
      ].sort((a, b) => a.id.localeCompare(b.id));

      const lockedAccountIds = new Set();

      for (const item of accountLocks) {
        if (!lockedAccountIds.has(item.id)) {
          await lockDocument(
            Account,
            item.doc,
            session,
            "Account"
          );

          lockedAccountIds.add(item.id);
        }
      }


      // Reload locked records before making changes
      original = await LoanTransaction.findOne({
        _id: transactionId,
        isVoided: { $ne: true },
      }).session(session);

      oldLedger = await AccountLedger.findOne({
        transactionId: String(transactionId),
        isVoided: { $ne: true },
      }).session(session);

      if (!original || !oldLedger) {
        throw new Error(
          "Original transaction changed during correction"
        );
      }

      if (
        String(original.providerId) !== oldProviderId ||
        String(original.accountId) !== oldAccountId ||
        String(oldLedger.accountId) !== oldAccountId ||
        original.transactionType !==
          (oldLedger.transactionType === "DEPOSIT"
            ? "RECEIVED"
            : "REPAYMENT")
      ) {
        throw new Error(
          "Original transaction and ledger do not match. Please retry."
        );
      }

      if (
        Number(oldLedger.amount) !== Number(original.totalAmount)
      ) {
        throw new Error(
          "Original transaction amount and ledger amount do not match."
        );
      }

      // Calculate outstanding excluding original transaction
      async function getOutstanding(providerDoc) {
        const history = await LoanTransaction.aggregate([
          {
            $match: {
              providerId: providerDoc._id,
              isVoided: { $ne: true },
              _id: { $ne: original._id },
            },
          },
          {
            $group: {
              _id: "$transactionType",
              principal: { $sum: "$principalAmount" },
            },
          },
        ]).session(session);

        const received =
          history.find((x) => x._id === "RECEIVED")?.principal || 0;

        const repaid =
          history.find((x) => x._id === "REPAYMENT")?.principal || 0;

        return (
          Number(providerDoc.openingBalance || 0) +
          received -
          repaid
        );
      }

      const oldOutstanding = await getOutstanding(oldProvider);

      if (
        oldProviderId !== newProviderId &&
        oldOutstanding < -0.000001
      ) {
        throw new Error(
          "Original provider has a negative outstanding balance. Correction stopped."
        );
      }

      const newOutstanding = await getOutstanding(provider);

      if (newOutstanding < -0.000001) {
        throw new Error(
          "Selected provider has a negative outstanding balance."
        );
      }

      if (
        original.transactionType === "REPAYMENT" &&
        principal > newOutstanding + 0.000001
      ) {
        throw new Error(
          `Principal exceeds outstanding loan. Available: ${newOutstanding}`
        );
      }

      // Check account balances after removing old ledger effect
      const oldDirection =
        oldLedger.direction === "IN" ? 1 : -1;

      const oldAccountBalance = await getAccountBalance(
        oldAccount._id,
        session
      );

      const oldBalanceAfterRemoval =
        oldAccountBalance -
        oldDirection * Number(oldLedger.amount);

      const sameAccount = oldAccountId === newAccountId;

      const newAccountBalance = sameAccount
        ? oldBalanceAfterRemoval
        : await getAccountBalance(account._id, session);

      const correctedBalance =
        newAccountBalance +
        (newDirection === "IN" ? 1 : -1) * correctedTotal;

      if (
        oldBalanceAfterRemoval < -0.000001 ||
        correctedBalance < -0.000001
      ) {
        throw new Error(
          "Correction would make an account balance negative"
        );
      }

      // Save original data for audit
      const beforeData = {
        providerId: original.providerId,
        accountId: original.accountId,
        loanType: original.loanType,
        transactionType: original.transactionType,
        principalAmount: original.principalAmount,
        interestAmount: original.interestAmount,
        totalAmount: original.totalAmount,
        transactionDate: original.transactionDate,
        reference: original.reference,
        description: original.description,
      };

      const beforeLedgerData = {
        accountId: oldLedger.accountId,
        transactionType: oldLedger.transactionType,
        direction: oldLedger.direction,
        amount: oldLedger.amount,
        transactionId: oldLedger.transactionId,
        reference: oldLedger.reference,
        description: oldLedger.description,
        transactionDate: oldLedger.transactionDate,
      };

      // Void old loan transaction
      original.isVoided = true;
      original.voidedAt = new Date();
      original.voidReason = String(reason).trim();

      await original.save({ session });

      // Void old account ledger
      oldLedger.isVoided = true;
      oldLedger.voidedAt = new Date();
      oldLedger.voidReason = String(reason).trim();

      await oldLedger.save({ session });

      // Create replacement loan transaction
      const [replacement] = await LoanTransaction.create(
        [
          {
            providerId: provider._id,
            loanType: provider.providerType,
            transactionType: original.transactionType,
            accountId: account._id,
            principalAmount: principal,
            interestAmount: interest,
            totalAmount: correctedTotal,
            transactionDate: date,
            reference: String(reference || ""),
            description: String(description || "Corrected loan transaction"),
            createdBy: req.admin || {},
          },
        ],
        { session }
      );

      // Create replacement account ledger
      const [replacementLedger] = await AccountLedger.create(
        [
          {
            accountId: account._id,
            transactionType:
              original.transactionType === "RECEIVED"
                ? "DEPOSIT"
                : "WITHDRAWAL",
            direction: newDirection,
            amount: correctedTotal,
            transactionId: String(replacement._id),
            reference: String(reference || ""),
            description:
              original.transactionType === "RECEIVED"
                ? `Loan Received - ${provider.providerName} (Corrected)`
                : `Loan Repayment - ${provider.providerName} (Corrected)`,
            transactionDate: date,
            createdBy: req.admin || {},
          },
        ],
        { session }
      );

      // Save replacement data for audit
      const afterData = {
        providerId: replacement.providerId,
        accountId: replacement.accountId,
        loanType: replacement.loanType,
        transactionType: replacement.transactionType,
        principalAmount: replacement.principalAmount,
        interestAmount: replacement.interestAmount,
        totalAmount: replacement.totalAmount,
        transactionDate: replacement.transactionDate,
        reference: replacement.reference,
        description: replacement.description,
      };

      const afterLedgerData = {
        accountId: replacementLedger.accountId,
        transactionType: replacementLedger.transactionType,
        direction: replacementLedger.direction,
        amount: replacementLedger.amount,
        transactionId: replacementLedger.transactionId,
        reference: replacementLedger.reference,
        description: replacementLedger.description,
        transactionDate: replacementLedger.transactionDate,
      };

      // Save adjustment history
      const [adjustment] = await LoanAdjustment.create(
        [
          {
            loanTransactionId: original._id,
            providerId: provider._id,
            adjustmentMethod: "REVERSE_NEW",
            replacementTransactionId: replacement._id,
            reason: String(reason).trim(),
            beforeData,
            afterData,
            beforeLedgerData,
            afterLedgerData,
            adjustedBy: req.admin || {},
          },
        ],
        { session }
      );

      savedOriginal = original;
      savedReplacement = replacement;
      savedAdjustment = adjustment;
    });

    return res.status(200).json({
      success: true,
      message: "Loan transaction reversed and replaced successfully",
      data: {
        originalTransaction: savedOriginal,
        replacementTransaction: savedReplacement,
        adjustment: savedAdjustment,
      },
    });
  } catch (error) {
    console.error("LOAN REVERSE NEW ENTRY ERROR:", error);

    return res.status(400).json({
      success: false,
      message: error.message || "Loan reverse correction failed",
    });
  } finally {
    await session.endSession();
  }
});

export default router;
