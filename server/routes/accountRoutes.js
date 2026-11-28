
import express from "express";
import mongoose from "mongoose";
import Account from "../models/Account.js";
import AccountLedger from "../models/AccountLedger.js";
import DailyAccountClosing from "../models/DailyAccountClosing.js";


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
      isActive: true,
    },
    {
      $inc: { __v: 1 },
    },
    { session }
  );

  if (result.modifiedCount !== 1) {
    throw new Error(
      "Account is inactive or being updated by another transaction. Please try again."
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

const transactionId = new mongoose.Types.ObjectId().toString();

const common = {
  source: "MANUAL",
  transactionId,
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





// ========================================
// EDIT MANUAL ACCOUNT TRANSACTION
// PATCH /api/accounts/transactions/:id
// ========================================
router.patch("/transactions/:id", async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const { id } = req.params;
    const { amount, transactionDate, reference, description, reason } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid transaction ID" });
    }

    const newAmount = Number(amount);
    const newDate = new Date(transactionDate);

    if (!Number.isFinite(newAmount) || newAmount <= 0) {
      return res.status(400).json({ success: false, message: "Invalid amount" });
    }

    if (Number.isNaN(newDate.getTime())) {
      return res.status(400).json({ success: false, message: "Invalid date" });
    }

    if (!String(reason || "").trim()) {
      return res.status(400).json({ success: false, message: "Edit করার কারণ লিখতে হবে" });
    }

    await session.withTransaction(async () => {
      const transaction = await AccountLedger.findById(id).session(session);

      if (!transaction || transaction.isVoided) {
        throw new Error("Transaction not found or already voided");
      }

      if (
        transaction.source !== "MANUAL" ||
        !["DEPOSIT", "WITHDRAWAL", "TRANSFER_OUT", "TRANSFER_IN"].includes(transaction.transactionType)
      ) {
        throw new Error("শুধু Manual Deposit, Withdrawal ও Transfer Edit করা যাবে");
      }

      let entries = [transaction];

      if (transaction.transactionType.startsWith("TRANSFER")) {
        if (!transaction.transactionId) {
          throw new Error("Transfer ID পাওয়া যায়নি। নিরাপত্তার জন্য Edit বন্ধ");
        }

        entries = await AccountLedger.find({
          transactionId: transaction.transactionId,
          source: "MANUAL",
          isVoided: { $ne: true },
        }).session(session);

        if (
          entries.length !== 2 ||
          !entries.some((e) => e.transactionType === "TRANSFER_OUT") ||
          !entries.some((e) => e.transactionType === "TRANSFER_IN")
        ) {
          throw new Error("Transfer-এর দুইটি Entry পাওয়া যায়নি");
        }
      }

      const accountIds = [...new Set(entries.map((e) => String(e.accountId)))];

      const accounts = await Account.find({
        _id: { $in: accountIds },
        isActive: true,
      }).session(session);

      if (accounts.length !== accountIds.length) {
        throw new Error("Account পাওয়া যায়নি বা inactive");
      }

      for (const account of accounts) {
        await lockAccount(account, session);
      }

      const difference = newAmount - transaction.amount;

      if (difference !== 0) {
        for (const entry of entries) {
          const balance = await getAccountBalance(entry.accountId, session);
          const change = entry.direction === "IN" ? difference : -difference;

          if (balance + change < -0.000001) {
            throw new Error("এই Edit করলে Account Balance ঋণাত্মক হবে");
          }
        }
      }

      for (const entry of entries) {
        await AccountLedger.updateOne(
          { _id: entry._id },
          {
            $set: {
              amount: newAmount,
              transactionDate: newDate,
              reference: String(reference || "").trim(),
              description: String(description || "").trim(),
            },
          },
          { session }
        );
      }
    });

    res.status(200).json({
      success: true,
      message: "Transaction updated successfully",
    });
  } catch (error) {
    console.error("EDIT TRANSACTION ERROR:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Failed to edit transaction",
    });
  } finally {
    await session.endSession();
  }
});


// ========================================
// DELETE (VOID) MANUAL ACCOUNT TRANSACTION
// PATCH /api/accounts/transactions/:id/void
// ========================================
router.patch("/transactions/:id/void", async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid transaction ID",
      });
    }

    if (!String(reason || "").trim()) {
      return res.status(400).json({
        success: false,
        message: "Delete করার কারণ লিখতে হবে",
      });
    }

    await session.withTransaction(async () => {
      const transaction = await AccountLedger.findById(id).session(session);

      if (!transaction || transaction.isVoided) {
        throw new Error("Transaction not found or already deleted");
      }

      if (
        transaction.source !== "MANUAL" ||
        ![
          "DEPOSIT",
          "WITHDRAWAL",
          "TRANSFER_OUT",
          "TRANSFER_IN",
        ].includes(transaction.transactionType)
      ) {
        throw new Error("শুধু Manual Transaction Delete করা যাবে");
      }

      let entries = [transaction];

      if (transaction.transactionType.startsWith("TRANSFER")) {
        if (!transaction.transactionId) {
          throw new Error("Transfer ID পাওয়া যায়নি। নিরাপত্তার জন্য Delete বন্ধ");
        }

        entries = await AccountLedger.find({
          transactionId: transaction.transactionId,
          source: "MANUAL",
          isVoided: { $ne: true },
        }).session(session);

        if (
          entries.length !== 2 ||
          !entries.some((e) => e.transactionType === "TRANSFER_OUT") ||
          !entries.some((e) => e.transactionType === "TRANSFER_IN")
        ) {
          throw new Error("Transfer-এর দুইটি Entry পাওয়া যায়নি");
        }
      }

      const accountIds = [...new Set(entries.map((e) => String(e.accountId)))];

      const accounts = await Account.find({
        _id: { $in: accountIds },
        isActive: true,
      }).session(session);

      if (accounts.length !== accountIds.length) {
        throw new Error("Account পাওয়া যায়নি বা inactive");
      }

      for (const account of accounts) {
        await lockAccount(account, session);
      }

      for (const entry of entries) {
        const balance = await getAccountBalance(entry.accountId, session);

        const newBalance =
          entry.direction === "IN"
            ? balance - entry.amount
            : balance + entry.amount;

        if (newBalance < -0.000001) {
          throw new Error(
            "এই Transaction Delete করলে Account Balance ঋণাত্মক হবে"
          );
        }
      }

      await AccountLedger.updateMany(
        { _id: { $in: entries.map((e) => e._id) } },
        {
          $set: {
            isVoided: true,
            voidedAt: new Date(),
            voidReason: String(reason).trim(),
          },
        },
        { session }
      );
    });

    res.status(200).json({
      success: true,
      message: "Transaction deleted successfully",
    });
  } catch (error) {
    console.error("DELETE TRANSACTION ERROR:", error);

    res.status(400).json({
      success: false,
      message: error.message || "Failed to delete transaction",
    });
  } finally {
    await session.endSession();
  }
});


// ========================================
// UPDATE ACCOUNT DETAILS + OPENING BALANCE ADJUSTMENT
// PUT /api/accounts/:id
// ========================================
router.put("/:id", async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid account ID",
      });
    }

    const {
      accountName,
      bankName,
      accountNumber,
      branchName,
      notes,
      openingBalance,
      adjustmentReason,
    } = req.body;

    if (
      accountName !== undefined &&
      (typeof accountName !== "string" || !accountName.trim())
    ) {
      return res.status(400).json({
        success: false,
        message: "Account name is required",
      });
    }

    const updateData = {};

    if (accountName !== undefined) {
      updateData.accountName = accountName.trim();
    }

    if (bankName !== undefined) {
      updateData.bankName = String(bankName).trim();
    }

    if (accountNumber !== undefined) {
      updateData.accountNumber = String(accountNumber).trim();
    }

    if (branchName !== undefined) {
      updateData.branchName = String(branchName).trim();
    }

    if (notes !== undefined) {
      updateData.notes = String(notes).trim();
    }

    const balanceProvided = openingBalance !== undefined;
    let newOpeningBalance;

    if (balanceProvided) {
      newOpeningBalance = Number(openingBalance);

      if (
        !Number.isFinite(newOpeningBalance) ||
        newOpeningBalance < 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid opening balance",
        });
      }
    }

    if (Object.keys(updateData).length === 0 && !balanceProvided) {
      return res.status(400).json({
        success: false,
        message: "No account details provided",
      });
    }

    let updatedAccount = null;
    let adjustmentCreated = false;

    await session.withTransaction(async () => {
      const account = await Account.findById(id).session(session);

      if (!account) {
        const error = new Error("Account not found");
        error.statusCode = 404;
        throw error;
      }

      // Prevent concurrent account updates
      await lockAccount(account, session);

      if (balanceProvided) {
        const oldOpeningBalance = Number(account.openingBalance || 0);

        const difference =
          newOpeningBalance - oldOpeningBalance;

        if (difference !== 0) {
          const reason =
            typeof adjustmentReason === "string"
              ? adjustmentReason.trim()
              : "";

          if (!reason) {
            throw new Error(
              "Opening Balance পরিবর্তনের কারণ লিখতে হবে"
            );
          }

          const currentBalance = await getAccountBalance(
            id,
            session
          );

          const newCurrentBalance =
            currentBalance + difference;

          if (newCurrentBalance < 0) {
            throw new Error(
              `এই Adjustment করলে Account Balance ঋণাত্মক হবে। বর্তমান Balance: ${currentBalance}`
            );
          }

          await AccountLedger.create(
            [
              {
                accountId: account._id,
                transactionType: "ADJUSTMENT",
                direction: difference > 0 ? "IN" : "OUT",
                amount: Math.abs(difference),
                transactionDate: new Date(),
                reference: "OPENING-BALANCE-EDIT",
                description:
                  `Opening Balance Adjustment: ${reason}`,
              },
            ],
            { session }
          );

          adjustmentCreated = true;
        }

        updateData.openingBalance = newOpeningBalance;
      }

      if (Object.keys(updateData).length > 0) {
        await Account.updateOne(
          { _id: id },
          { $set: updateData },
          {
            session,
            runValidators: true,
          }
        );
      }

      updatedAccount = await Account.findById(id)
        .session(session)
        .lean();
    });

    res.status(200).json({
      success: true,
      message: adjustmentCreated
        ? "Account updated and balance adjustment recorded successfully"
        : "Account updated successfully",
      data: updatedAccount,
      adjustmentCreated,
    });
  } catch (error) {
    console.error("ACCOUNT UPDATE ERROR:", error);

    res.status(error.statusCode || 400).json({
      success: false,
      message: error.message || "Failed to update account",
    });
  } finally {
    await session.endSession();
  }
});


// ========================================
// DEACTIVATE ACCOUNT (SAFE DELETE)
// PATCH /api/accounts/:id/deactivate
// ========================================
router.patch("/:id/deactivate", async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid account ID",
      });
    }

    let deactivatedAccount = null;

    await session.withTransaction(async () => {
      const account = await Account.findById(id).session(session);

      if (!account) {
        const error = new Error("Account not found");
        error.statusCode = 404;
        throw error;
      }

      if (!account.isActive) {
        const error = new Error("Account is already inactive");
        error.statusCode = 400;
        throw error;
      }

      // Lock account to prevent concurrent transactions
      await lockAccount(account, session);

      // Check current balance from active ledger entries
      const currentBalance = await getAccountBalance(
        account._id,
        session
      );

      if (Math.abs(currentBalance) > 0.000001) {
        const error = new Error(
          `এই Account Deactivate করা যাবে না। বর্তমান Balance: ${currentBalance}`
        );
        error.statusCode = 400;
        throw error;
      }

      await Account.updateOne(
        { _id: account._id },
        { $set: { isActive: false } },
        { session, runValidators: true }
      );

      deactivatedAccount = await Account.findById(account._id)
        .session(session)
        .lean();
    });

    res.status(200).json({
      success: true,
      message: "Account deactivated successfully",
      data: deactivatedAccount,
    });
  } catch (error) {
    console.error("ACCOUNT DEACTIVATE ERROR:", error);

    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to deactivate account",
    });
  } finally {
    await session.endSession();
  }
});


// ========================================
// REACTIVATE ACCOUNT
// PATCH /api/accounts/:id/activate
// ========================================
router.patch("/:id/activate", async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid account ID",
      });
    }

    let activatedAccount = null;

    await session.withTransaction(async () => {
      const account = await Account.findById(id).session(session);

      if (!account) {
        const error = new Error("Account not found");
        error.statusCode = 404;
        throw error;
      }

      if (account.isActive) {
        const error = new Error("Account is already active");
        error.statusCode = 400;
        throw error;
      }

      // Lock account to prevent concurrent transactions
      await lockAccount(account, session);

      await Account.updateOne(
        { _id: account._id },
        { $set: { isActive: true } },
        { session, runValidators: true }
      );

      activatedAccount = await Account.findById(account._id)
        .session(session)
        .lean();
    });

    res.status(200).json({
      success: true,
      message: "Account reactivated successfully",
      data: activatedAccount,
    });
  } catch (error) {
    console.error("ACCOUNT REACTIVATE ERROR:", error);

    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to reactivate account",
    });
  } finally {
    await session.endSession();
  }
});


// ========================================
// ACCOUNT STATEMENT API
// GET /accounts/statement
// ========================================
router.get("/statement", async (req, res) => {
  try {
    const { accountId, fromDate, toDate } = req.query;

    if (!accountId || !mongoose.Types.ObjectId.isValid(accountId)) {
      return res.status(400).json({
        success: false,
        message: "Valid account ID is required",
      });
    }

    if (!fromDate || !toDate) {
      return res.status(400).json({
        success: false,
        message: "From Date and To Date are required",
      });
    }

    const startDate = new Date(`${fromDate}T00:00:00.000`);
    const endDate = new Date(`${toDate}T23:59:59.999`);

    if (
      Number.isNaN(startDate.getTime()) ||
      Number.isNaN(endDate.getTime()) ||
      startDate > endDate
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid date range",
      });
    }

    const account = await Account.findById(accountId).lean();

    if (!account) {
      return res.status(404).json({
        success: false,
        message: "Account not found",
      });
    }

    const baseFilter = {
      accountId: new mongoose.Types.ObjectId(accountId),
      isVoided: { $ne: true },
    };

    // Transactions before selected period
    const openingTransactions = await AccountLedger.find({
      ...baseFilter,
      transactionDate: { $lt: startDate },
    })
      .select("direction amount")
      .lean();

    const openingBalance = openingTransactions.reduce(
      (balance, item) =>
        balance +
        (item.direction === "IN"
          ? Number(item.amount || 0)
          : -Number(item.amount || 0)),
      0
    );

    // Transactions inside selected period
    const transactions = await AccountLedger.find({
      ...baseFilter,
      transactionDate: {
        $gte: startDate,
        $lte: endDate,
      },
    })
      .populate("accountId", "accountName accountType bankName")
      .populate("relatedAccountId", "accountName accountType bankName")
      .sort({ transactionDate: 1, createdAt: 1, _id: 1 })
      .lean();

    let runningBalance = openingBalance;
    let totalIn = 0;
    let totalOut = 0;

    const rows = transactions.map((item) => {
      const amount = Number(item.amount || 0);
      const direction = item.direction;

      if (direction === "IN") {
        totalIn += amount;
        runningBalance += amount;
      } else {
        totalOut += amount;
        runningBalance -= amount;
      }

      return {
        ...item,
        amount,
        runningBalance,
      };
    });

    res.status(200).json({
      success: true,
      data: {
        account,
        fromDate,
        toDate,
        openingBalance,
        totalIn,
        totalOut,
        closingBalance: runningBalance,
        totalTransactions: rows.length,
        transactions: rows,
      },
    });
  } catch (error) {
    console.error("ACCOUNT STATEMENT ERROR:", error);

    res.status(500).json({
      success: false,
      message: error.message || "Failed to generate account statement",
    });
  }
});


// ========================================
// DAILY ACCOUNT CLOSING PREVIEW
// GET /api/accounts/daily-closing/preview
// ========================================
router.get("/daily-closing/preview", async (req, res) => {
  try {
    const { accountId, closingDate } = req.query;

    if (
      !accountId ||
      !mongoose.Types.ObjectId.isValid(accountId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid account ID is required",
      });
    }

    if (!closingDate || !/^\d{4}-\d{2}-\d{2}$/.test(closingDate)) {
      return res.status(400).json({
        success: false,
        message: "Valid closing date is required",
      });
    }

    // Bangladesh local day: UTC+6
    const startDate = new Date(`${closingDate}T00:00:00.000+06:00`);
    const endDate = new Date(`${closingDate}T23:59:59.999+06:00`);

    if (
      Number.isNaN(startDate.getTime()) ||
      Number.isNaN(endDate.getTime()) ||
      startDate > endDate
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid closing date",
      });
    }

    const account = await Account.findById(accountId).lean();

    if (!account) {
      return res.status(404).json({
        success: false,
        message: "Account not found",
      });
    }

    // Check whether this account is already closed
    const existingClosing = await DailyAccountClosing.findOne({
      accountId,
      closingDate,
    }).lean();

    // Opening balance before selected day
    const openingResult = await AccountLedger.aggregate([
      {
        $match: {
          accountId: new mongoose.Types.ObjectId(accountId),
          isVoided: { $ne: true },
          transactionDate: { $lt: startDate },
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

    const openingBalance = Number(
      openingResult[0]?.balance || 0
    );

    // Today's transactions
    const dailyResult = await AccountLedger.aggregate([
      {
        $match: {
          accountId: new mongoose.Types.ObjectId(accountId),
          isVoided: { $ne: true },
          transactionDate: {
            $gte: startDate,
            $lte: endDate,
          },
        },
      },
      {
        $group: {
          _id: "$direction",
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ]);

    const totalIn = Number(
      dailyResult.find((item) => item._id === "IN")?.total || 0
    );

    const totalOut = Number(
      dailyResult.find((item) => item._id === "OUT")?.total || 0
    );

    const totalTransactions = dailyResult.reduce(
      (sum, item) => sum + Number(item.count || 0),
      0
    );

    const systemClosingBalance =
      openingBalance + totalIn - totalOut;

    res.status(200).json({
      success: true,
      data: {
        account,
        closingDate,
        openingBalance,
        totalIn,
        totalOut,
        systemClosingBalance,
        totalTransactions,
        alreadyClosed: Boolean(existingClosing),
        existingClosing,
        requiresPhysicalCount: account.accountType === "CASH",
      },
    });
  } catch (error) {
    console.error("DAILY CLOSING PREVIEW ERROR:", error);

    res.status(500).json({
      success: false,
      message: error.message || "Failed to load closing preview",
    });
  }
});


 // ========================================
 // CONFIRM DAILY ACCOUNT CLOSING
 // POST /api/accounts/daily-closing
 // ========================================
router.post("/daily-closing", async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const { accountId, closingDate, actualClosingBalance, remarks } =
      req.body;

    if (
      !accountId ||
      !mongoose.Types.ObjectId.isValid(accountId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid account ID is required",
      });
    }

    if (
      !closingDate ||
      !/^\d{4}-\d{2}-\d{2}$/.test(closingDate)
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid closing date is required",
      });
    }

    const startDate = new Date(
      `${closingDate}T00:00:00.000+06:00`
    );
    const endDate = new Date(
      `${closingDate}T23:59:59.999+06:00`
    );

  const dateParts = closingDate.split("-").map(Number);

const calendarDate = new Date(
  Date.UTC(dateParts[0], dateParts[1] - 1, dateParts[2])
);

if (
  Number.isNaN(startDate.getTime()) ||
  Number.isNaN(endDate.getTime()) ||
  calendarDate.toISOString().slice(0, 10) !== closingDate
) {
      return res.status(400).json({
        success: false,
        message: "Invalid closing date",
      });
    }

    const todayBD = new Date(
      Date.now() + 6 * 60 * 60 * 1000
    ).toISOString().slice(0, 10);

    if (closingDate > todayBD) {
      return res.status(400).json({
        success: false,
        message: "Future date closing is not allowed",
      });
    }

    let savedClosing = null;

    await session.withTransaction(async () => {
      const account = await Account.findOne({
        _id: accountId,
        isActive: true,
      }).session(session);

      if (!account) {
        throw new Error("Account not found or inactive");
      }

      // Prevent simultaneous account transactions
      await lockAccount(account, session);

      const existing = await DailyAccountClosing.findOne({
        accountId,
        closingDate,
      }).session(session);

      if (existing) {
        throw new Error(
          "এই Account-এর এই তারিখের Closing ইতিমধ্যে করা হয়েছে"
        );
      }

      // Calculate opening balance
      const openingResult = await AccountLedger.aggregate([
        {
          $match: {
            accountId: account._id,
            isVoided: { $ne: true },
            transactionDate: { $lt: startDate },
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

      const openingBalance = Number(
        openingResult[0]?.balance || 0
      );

      // Calculate daily IN and OUT
      const dailyResult = await AccountLedger.aggregate([
        {
          $match: {
            accountId: account._id,
            isVoided: { $ne: true },
            transactionDate: {
              $gte: startDate,
              $lte: endDate,
            },
          },
        },
        {
          $group: {
            _id: "$direction",
            total: { $sum: "$amount" },
          },
        },
      ]).session(session);

      const totalIn = Number(
        dailyResult.find((item) => item._id === "IN")?.total || 0
      );

      const totalOut = Number(
        dailyResult.find((item) => item._id === "OUT")?.total || 0
      );

      const systemClosingBalance =
        openingBalance + totalIn - totalOut;

      let actualBalance = systemClosingBalance;

      if (account.accountType === "CASH") {
        actualBalance = Number(actualClosingBalance);

        if (
          actualClosingBalance === undefined ||
          actualClosingBalance === null ||
          actualClosingBalance === "" ||
          !Number.isFinite(actualBalance) ||
          actualBalance < 0
        ) {
          throw new Error(
            "হাতে থাকা প্রকৃত Cash Balance লিখুন"
          );
        }
      }

      const difference =
        actualBalance - systemClosingBalance;

      const closingStatus =
        difference < -0.000001
          ? "SHORT"
          : difference > 0.000001
          ? "EXCESS"
          : "MATCHED";

      const created = await DailyAccountClosing.create(
        [
          {
            accountId: account._id,
            closingDate,
            openingBalance,
            totalIn,
            totalOut,
            systemClosingBalance,
            actualClosingBalance: actualBalance,
            difference,
            closingStatus,
            remarks: String(remarks || "").trim(),
          },
        ],
        { session }
      );

      savedClosing = created[0];
    });

    res.status(201).json({
      success: true,
      message: "Daily Account Closing completed successfully",
      data: savedClosing,
    });
  } catch (error) {
    console.error("DAILY CLOSING SAVE ERROR:", error);

    res.status(
      error.code === 11000 ? 409 : 400
    ).json({
      success: false,
      message:
        error.code === 11000
          ? "এই তারিখের Closing ইতিমধ্যে করা হয়েছে"
          : error.message || "Failed to save daily closing",
    });
  } finally {
    await session.endSession();
  }
});



 // ========================================
 // DAILY ACCOUNT CLOSING HISTORY
 // GET /api/accounts/daily-closing/history
 // ========================================
router.get("/daily-closing/history", async (req, res) => {
  try {
    const {
      accountId,
      fromDate,
      toDate,
      page = 1,
      limit = 20,
    } = req.query;

    const filter = {};

    if (accountId) {
      if (!mongoose.Types.ObjectId.isValid(accountId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid account ID",
        });
      }

      filter.accountId = accountId;
    }

    if (fromDate || toDate) {
      filter.closingDate = {};

      if (fromDate) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(fromDate)) {
          return res.status(400).json({
            success: false,
            message: "Invalid From Date",
          });
        }

        filter.closingDate.$gte = fromDate;
      }

      if (toDate) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(toDate)) {
          return res.status(400).json({
            success: false,
            message: "Invalid To Date",
          });
        }

        filter.closingDate.$lte = toDate;
      }

      if (
        fromDate &&
        toDate &&
        fromDate > toDate
      ) {
        return res.status(400).json({
          success: false,
          message: "From Date cannot be after To Date",
        });
      }
    }

    const currentPage = Math.max(1, Number(page) || 1);
    const pageLimit = Math.min(
      100,
      Math.max(1, Number(limit) || 20)
    );

    const skip = (currentPage - 1) * pageLimit;

    const [history, total] = await Promise.all([
      DailyAccountClosing.find(filter)
        .populate("accountId", "accountName accountType bankName")
        .sort({ closingDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(pageLimit)
        .lean(),

      DailyAccountClosing.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: history,
      pagination: {
        currentPage,
        totalPages: Math.ceil(total / pageLimit),
        totalRecords: total,
        limit: pageLimit,
      },
    });
  } catch (error) {
    console.error("DAILY CLOSING HISTORY ERROR:", error);

    res.status(500).json({
      success: false,
      message: error.message || "Failed to load closing history",
    });
  }
});

export default router;
