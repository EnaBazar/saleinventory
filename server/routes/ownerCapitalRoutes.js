import express from "express";
import mongoose from "mongoose";

import OwnerCapitalLedger from "../models/OwnerCapitalLedger.js";
import Account from "../models/Account.js";
import AccountLedger from "../models/AccountLedger.js";

const router = express.Router();

const money = (value) =>
  Number(Number(value || 0).toFixed(2));

const getAccountBalance = async (accountId, session) => {
  const rows = await AccountLedger.aggregate([
    {
      $match: {
        accountId: new mongoose.Types.ObjectId(accountId),
        isVoided: { $ne: true },
      },
    },
    {
      $group: {
        _id: "$direction",
        total: { $sum: "$amount" },
      },
    },
  ]).session(session);

  const incoming = rows.find((row) => row._id === "IN")?.total || 0;
  const outgoing = rows.find((row) => row._id === "OUT")?.total || 0;

  return money(incoming - outgoing);
};

const getAdminInfo = (req) => ({
  adminId: req.admin?.adminId || null,
  name: req.admin?.name || "",
  username: req.admin?.username || "",
});

const validDate = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

// GET /api/owner-capital
router.get("/", async (req, res) => {
  try {
    const filter = {};

    if (req.query.to) {
      const to = new Date(`${req.query.to}T23:59:59.999+06:00`);

      if (Number.isNaN(to.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid end date",
        });
      }

      filter.transactionDate = { $lte: to };
    }

    if (req.query.from) {
      const from = new Date(`${req.query.from}T00:00:00.000+06:00`);

      if (Number.isNaN(from.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid start date",
        });
      }

      filter.transactionDate = {
        ...(filter.transactionDate || {}),
        $gte: from,
      };
    }

    const entries = await OwnerCapitalLedger.find(filter)
      .populate("accountId", "accountName accountType")
      .sort({ transactionDate: -1, createdAt: -1 })
      .lean();

    return res.json({
      success: true,
      data: entries,
    });
  } catch (error) {
    console.error("Owner capital list error:", error);

    return res.status(500).json({
      success: false,
      message: "Could not load owner capital ledger",
    });
  }
});

// POST /api/owner-capital
router.post("/", async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const {
      transactionType,
      amount,
      accountId,
      transactionDate,
      reference,
      description,
    } = req.body;

    const allowedTypes = [
      "OPENING_CAPITAL",
      "CAPITAL_DEPOSIT",
      "OWNER_WITHDRAWAL",
    ];

    if (!allowedTypes.includes(transactionType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid capital transaction type",
      });
    }

    const numericAmount = money(amount);

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Amount must be greater than zero",
      });
    }

    const date = validDate(transactionDate);

    if (!date) {
      return res.status(400).json({
        success: false,
        message: "Invalid transaction date",
      });
    }

    const needsAccount = transactionType !== "OPENING_CAPITAL";

    if (needsAccount && !mongoose.isValidObjectId(accountId)) {
      return res.status(400).json({
        success: false,
        message: "Please select a valid Cash/Bank account",
      });
    }

    await session.withTransaction(async () => {
      // Opening Capital একবারই active রাখা হবে।
      if (transactionType === "OPENING_CAPITAL") {
        const existingOpening = await OwnerCapitalLedger.findOne({
          transactionType: "OPENING_CAPITAL",
          isVoided: { $ne: true },
        }).session(session);

        if (existingOpening) {
          const error = new Error(
            "Opening Capital already exists. Void the previous entry before adding another."
          );
          error.statusCode = 409;
          throw error;
        }
      }

      let account = null;
      let linkedLedger = null;

      if (needsAccount) {
        account = await Account.findOne({
          _id: accountId,
          isActive: true,
        }).session(session);

        if (!account) {
          const error = new Error("Selected account was not found or is inactive");
          error.statusCode = 404;
          throw error;
        }

        const lockedAccount = await Account.findOneAndUpdate(
          {
            _id: account._id,
            isActive: true,
            __v: account.__v,
          },
          {
            $inc: { __v: 1 },
          },
          {
            new: true,
            session,
          }
        );

        if (!lockedAccount) {
          const error = new Error(
            "Account was updated by another transaction. Please try again."
          );
          error.statusCode = 409;
          throw error;
        }

        if (transactionType === "OWNER_WITHDRAWAL") {
          const balance = await getAccountBalance(account._id, session);

          if (balance < numericAmount) {
            const error = new Error(
              `Insufficient account balance. Available balance: ${balance}`
            );
            error.statusCode = 400;
            throw error;
          }
        }
      }

      const [ownerEntry] = await OwnerCapitalLedger.create(
        [
          {
            transactionType,
            amount: numericAmount,
            transactionDate: date,
            accountId: needsAccount ? account._id : null,
            reference: String(reference || "").trim(),
            description: String(description || "").trim(),
            createdBy: getAdminInfo(req),
            transactionId: new mongoose.Types.ObjectId().toString(),
          },
        ],
        { session }
      );

      if (needsAccount) {
        const isDeposit = transactionType === "CAPITAL_DEPOSIT";

        const [accountEntry] = await AccountLedger.create(
          [
            {
              accountId: account._id,
              source: "OTHER",
              transactionType: isDeposit ? "DEPOSIT" : "WITHDRAWAL",
              direction: isDeposit ? "IN" : "OUT",
              amount: numericAmount,
              reference: String(reference || "").trim(),
              transactionId: ownerEntry.transactionId,
              description:
                String(description || "").trim() ||
                (isDeposit ? "Owner Capital Deposit" : "Owner Withdrawal"),
              transactionDate: date,
              createdBy: getAdminInfo(req),
              isVoided: false,
            },
          ],
          { session }
        );

        ownerEntry.linkedAccountLedgerId = accountEntry._id;
        await ownerEntry.save({ session });
      }
    });

    return res.status(201).json({
      success: true,
      message: "Owner capital transaction saved successfully",
    });
  } catch (error) {
    console.error("Owner capital create error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Could not save owner capital transaction",
    });
  } finally {
    await session.endSession();
  }
});

// PATCH /api/owner-capital/:id/void
router.patch("/:id/void", async (req, res) => {
  const session = await mongoose.startSession();

  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid transaction ID",
      });
    }

    await session.withTransaction(async () => {
      const entry = await OwnerCapitalLedger.findOne({
        _id: req.params.id,
        isVoided: { $ne: true },
      }).session(session);

      if (!entry) {
        const error = new Error("Active owner capital entry not found");
        error.statusCode = 404;
        throw error;
      }

      entry.isVoided = true;
      entry.voidedAt = new Date();
      entry.voidReason = String(req.body.reason || "Voided by admin").trim();

      await entry.save({ session });

      if (entry.linkedAccountLedgerId) {
        const linkedEntry = await AccountLedger.findOne({
          _id: entry.linkedAccountLedgerId,
          isVoided: { $ne: true },
        }).session(session);

        if (linkedEntry) {
          linkedEntry.isVoided = true;
          linkedEntry.voidedAt = new Date();
          linkedEntry.voidReason = `Owner capital entry voided: ${entry._id}`;
          await linkedEntry.save({ session });
        }
      }
    });

    return res.json({
      success: true,
      message: "Owner capital transaction voided successfully",
    });
  } catch (error) {
    console.error("Owner capital void error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Could not void owner capital transaction",
    });
  } finally {
    await session.endSession();
  }
});

export default router;
