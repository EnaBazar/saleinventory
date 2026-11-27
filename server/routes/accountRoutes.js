
import express from "express";
import mongoose from "mongoose";
import Account from "../models/Account.js";
import AccountLedger from "../models/AccountLedger.js";

const router = express.Router();

// ========================================
// CALCULATE ACCOUNT BALANCE
// ========================================
async function getAccountBalance(accountId, session = null) {
  let query = AccountLedger.aggregate([
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
  ]);

  if (session) query = query.session(session);

  const result = await query;
  return result[0]?.balance || 0;
}


// ========================================
// SAFE ACCOUNT TRANSACTION LOCK
// ========================================
async function lockAccount(account, session) {
  const result = await Account.updateOne(
    {
      _id: account._id,
      __v: account.__v,
    },
    {
      $inc: { __v: 1 },
    },
    { session }
  );

  if (result.modifiedCount !== 1) {
    throw new Error(
      "Account is being updated by another transaction. Please try again."
    );
  }
}



// ========================================
// GET ALL ACCOUNTS WITH CURRENT BALANCE
// ========================================
router.get("/", async (req, res) => {
  try {
    const accounts = await Account.find()
      .sort({ accountType: 1, accountName: 1 })
      .lean();

    const balances = await AccountLedger.aggregate([
      { $match: { isVoided: { $ne: true } } },
      {
        $group: {
          _id: "$accountId",
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
    ]);

    const balanceMap = new Map(
      balances.map((item) => [
        String(item._id),
        item.balance,
      ])
    );

    const data = accounts.map((account) => ({
      ...account,
      currentBalance: balanceMap.get(String(account._id)) || 0,
    }));

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("LOAD ACCOUNTS ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to load accounts",
    });
  }
});

// ========================================
// CREATE NEW ACCOUNT
// ========================================
router.post("/", async (req, res) => {
  try {
    const {
      accountName,
      accountType,
      bankName,
      accountNumber,
      branchName,
      openingBalance,
      openingBalanceDate,
      notes,
    } = req.body;

    if (!accountName?.trim() || !accountType) {
      return res.status(400).json({
        success: false,
        message: "Account name and type are required",
      });
    }

    if (!["CASH", "BANK", "BKASH"].includes(accountType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid account type",
      });
    }

    if (accountType === "BANK" && !bankName?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Bank name is required",
      });
    }

    const openingAmount = Number(openingBalance || 0);

    if (!Number.isFinite(openingAmount) || openingAmount < 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid opening balance",
      });
    }

    const account = await Account.create({
      accountName: accountName.trim(),
      accountType,
      bankName: bankName || "",
      accountNumber: accountNumber || "",
      branchName: branchName || "",
      openingBalance: openingAmount,
      openingBalanceDate: openingBalanceDate || new Date(),
      notes: notes || "",
    });

    if (openingAmount > 0) {
      try {
        await AccountLedger.create({
          accountId: account._id,
          transactionType: "OPENING_BALANCE",
          direction: "IN",
          amount: openingAmount,
          transactionDate: openingBalanceDate || new Date(),
          description: "Account Opening Balance",
        });
      } catch (ledgerError) {
        await Account.findByIdAndDelete(account._id);
        throw ledgerError;
      }
    }

    res.status(201).json({
      success: true,
      message: "Account created successfully",
      data: account,
    });
  } catch (error) {
    console.error("ACCOUNT CREATE ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create account",
    });
  }
});




// ========================================
// GET ACCOUNT TRANSACTION HISTORY
// GET /api/accounts/transactions
// ========================================
router.get("/transactions", async (req, res) => {
  try {
    const {
      accountId,
      transactionType,
      fromDate,
      toDate,
      page = 1,
      limit = 50,
    } = req.query;

    const filter = {};
    // Show only active transactions by default
const status = req.query.status || "ACTIVE";

if (status === "ACTIVE") {
  filter.isVoided = { $ne: true };
} else if (status === "VOIDED") {
  filter.isVoided = true;
}
// ALL হলে কোনো isVoided filter থাকবে না

    if (accountId) {
      if (!mongoose.Types.ObjectId.isValid(accountId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid account ID",
        });
      }

      filter.accountId = accountId;
    }

    if (
      transactionType &&
  [
  "OPENING_BALANCE",
  "DEPOSIT",
  "WITHDRAWAL",
  "EXPENSE",
  "TRANSFER_IN",
  "TRANSFER_OUT",
  "ADJUSTMENT",
].includes(transactionType)
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
    const skip = (currentPage - 1) * pageLimit;

    const [transactions, totalTransactions] = await Promise.all([
      AccountLedger.find(filter)
        .populate("accountId", "accountName accountType bankName")
        .populate("relatedAccountId", "accountName accountType bankName")
        .sort({ transactionDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(pageLimit)
        .lean(),

      AccountLedger.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: transactions,
      pagination: {
        currentPage,
        totalPages: Math.ceil(totalTransactions / pageLimit),
        totalTransactions,
        limit: pageLimit,
      },
    });
  } catch (error) {
    console.error("ACCOUNT TRANSACTION HISTORY ERROR:", error);

    res.status(500).json({
      success: false,
      message: error.message || "Failed to load transaction history",
    });
  }
});

// ========================================
// DEPOSIT / WITHDRAW / TRANSFER
// POST /api/accounts/transactions
// ========================================
router.post("/transactions", async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const {
      transactionType,
      accountId,
      relatedAccountId,
      amount,
      transactionDate,
      reference,
      description,
    } = req.body;

    if (!["DEPOSIT", "WITHDRAWAL", "TRANSFER"].includes(transactionType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid transaction type",
      });
    }

    if (
      !mongoose.Types.ObjectId.isValid(accountId) ||
      (transactionType === "TRANSFER" &&
        !mongoose.Types.ObjectId.isValid(relatedAccountId))
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid account ID",
      });
    }

    const transactionAmount = Number(amount);

    if (!Number.isFinite(transactionAmount) || transactionAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Amount must be greater than zero",
      });
    }

    if (
      transactionType === "TRANSFER" &&
      String(accountId) === String(relatedAccountId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Source and destination accounts must be different",
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

    let createdEntries = [];

    await session.withTransaction(async () => {
      const sourceAccount = await Account.findOne({
        _id: accountId,
        isActive: true,
      }).session(session);

      if (!sourceAccount) {
        throw new Error("Source account not found or inactive");
      }
     
      await lockAccount(sourceAccount, session);

      const sourceBalance = await getAccountBalance(
        accountId,
        session
      );

      if (
        transactionType === "WITHDRAWAL" ||
        transactionType === "TRANSFER"
      ) {
        if (transactionAmount > sourceBalance) {
          throw new Error(
            `Insufficient balance. Available balance: ${sourceBalance}`
          );
        }
      }

      const common = {
        amount: transactionAmount,
        transactionDate: date,
        reference: reference || "",
        description: description || "",
      };

      if (transactionType === "DEPOSIT") {
        const entries = await AccountLedger.create(
          [
            {
              ...common,
              accountId,
              transactionType: "DEPOSIT",
              direction: "IN",
            },
          ],
          { session }
        );

        createdEntries = entries;
      }

      if (transactionType === "WITHDRAWAL") {
        const entries = await AccountLedger.create(
          [
            {
              ...common,
              accountId,
              transactionType: "WITHDRAWAL",
              direction: "OUT",
            },
          ],
          { session }
        );

        createdEntries = entries;
      }

      if (transactionType === "TRANSFER") {
        const destinationAccount = await Account.findOne({
          _id: relatedAccountId,
          isActive: true,
        }).session(session);

        if (!destinationAccount) {
          throw new Error("Destination account not found or inactive");
        }

await lockAccount(destinationAccount, session);

        const entries = await AccountLedger.create(
          [
            {
              ...common,
              accountId,
              relatedAccountId,
              transactionType: "TRANSFER_OUT",
              direction: "OUT",
            },
            {
              ...common,
              accountId: relatedAccountId,
              relatedAccountId: accountId,
              transactionType: "TRANSFER_IN",
              direction: "IN",
            },
          ],
          { session }
        );

        createdEntries = entries;
      }
    });

    res.status(201).json({
      success: true,
      message: "Transaction completed successfully",
      data: createdEntries,
    });
  } catch (error) {
    console.error("ACCOUNT TRANSACTION ERROR:", error);

    res.status(400).json({
      success: false,
      message: error.message || "Transaction failed",
    });
  } finally {
    await session.endSession();
  }
});

export default router;
