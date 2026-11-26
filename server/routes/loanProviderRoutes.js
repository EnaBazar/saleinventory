
import express from "express";
import mongoose from "mongoose";
import LoanProvider from "../models/LoanProvider.js";
import LoanTransaction from "../models/LoanTransaction.js";

const router = express.Router();

// ========================================
// GET ALL LOAN PROVIDERS
// GET /api/loans/providers
// ========================================
router.get("/", async (req, res) => {
  try {
    const { search = "", providerType, status = "ACTIVE" } = req.query;

    const filter = {};

    if (providerType && ["BANK", "PERSON"].includes(providerType)) {
      filter.providerType = providerType;
    }

    if (status === "ACTIVE") {
      filter.isActive = true;
    } else if (status === "INACTIVE") {
      filter.isActive = false;
    }

    if (search.trim()) {
      filter.$or = [
        { providerName: { $regex: search.trim(), $options: "i" } },
        { mobile: { $regex: search.trim(), $options: "i" } },
        { bankName: { $regex: search.trim(), $options: "i" } },
        { accountNumber: { $regex: search.trim(), $options: "i" } },
      ];
    }

    const providers = await LoanProvider.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      count: providers.length,
      data: providers,
    });
  } catch (error) {
    console.error("LOAD LOAN PROVIDERS ERROR:", error);

    res.status(500).json({
      success: false,
      message: error.message || "Failed to load loan providers",
    });
  }
});

// ========================================
// GET SINGLE LOAN PROVIDER
// GET /api/loans/providers/:id
// ========================================
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid loan provider ID",
      });
    }

    const provider = await LoanProvider.findById(id).lean();

    if (!provider) {
      return res.status(404).json({
        success: false,
        message: "Loan provider not found",
      });
    }

    res.status(200).json({
      success: true,
      data: provider,
    });
  } catch (error) {
    console.error("GET LOAN PROVIDER ERROR:", error);

    res.status(500).json({
      success: false,
      message: error.message || "Failed to load loan provider",
    });
  }
});

// ========================================
// CREATE LOAN PROVIDER
// POST /api/loans/providers
// ========================================
router.post("/", async (req, res) => {
  try {
    const {
      providerName,
      providerType,
      mobile,
      address,
      bankName,
      accountNumber,
      branchName,
      openingBalance,
      openingBalanceDate,
      notes,
    } = req.body;

    if (!providerName?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Provider name is required",
      });
    }

    if (!["BANK", "PERSON"].includes(providerType)) {
      return res.status(400).json({
        success: false,
        message: "Provider type must be BANK or PERSON",
      });
    }

    if (providerType === "BANK" && !bankName?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Bank name is required for bank loan",
      });
    }

    const openingAmount = Number(openingBalance || 0);

    if (!Number.isFinite(openingAmount) || openingAmount < 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid opening loan balance",
      });
    }

    const date = openingBalanceDate
      ? new Date(openingBalanceDate)
      : new Date();

    if (Number.isNaN(date.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid opening balance date",
      });
    }

    const provider = await LoanProvider.create({
      providerName: providerName.trim(),
      providerType,
      mobile: mobile || "",
      address: address || "",
      bankName: providerType === "BANK" ? bankName || "" : "",
      accountNumber: providerType === "BANK" ? accountNumber || "" : "",
      branchName: providerType === "BANK" ? branchName || "" : "",
      openingBalance: openingAmount,
      openingBalanceDate: date,
      notes: notes || "",
    });

    res.status(201).json({
      success: true,
      message: "Loan provider created successfully",
      data: provider,
    });
  } catch (error) {
    console.error("CREATE LOAN PROVIDER ERROR:", error);

    res.status(500).json({
      success: false,
      message: error.message || "Failed to create loan provider",
    });
  }
});

// ========================================
// UPDATE LOAN PROVIDER
// PUT /api/loans/providers/:id
// ========================================
router.put("/:id", async (req, res) => {
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

    const {
      providerName,
      providerType,
      mobile,
      address,
      bankName,
      accountNumber,
      branchName,
      openingBalance,
      openingBalanceDate,
      notes,
    } = req.body;

    const hasTransactions = await LoanTransaction.exists({
      providerId: provider._id,
    });

    if (hasTransactions && openingBalance !== undefined) {
      const newOpeningBalance = Number(openingBalance);

      if (
        !Number.isFinite(newOpeningBalance) ||
        newOpeningBalance !== provider.openingBalance
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Loan transactions already exist. Opening balance cannot be changed.",
        });
      }
    }

    if (providerName !== undefined) {
      if (!providerName.trim()) {
        return res.status(400).json({
          success: false,
          message: "Provider name is required",
        });
      }

      provider.providerName = providerName.trim();
    }

    if (providerType !== undefined) {
      if (!["BANK", "PERSON"].includes(providerType)) {
        return res.status(400).json({
          success: false,
          message: "Invalid provider type",
        });
      }

      if (providerType !== provider.providerType && hasTransactions) {
        return res.status(400).json({
          success: false,
          message:
            "Provider type cannot be changed after loan transactions exist.",
        });
      }

      provider.providerType = providerType;
    }

    const finalType = provider.providerType;

    if (finalType === "BANK") {
      const finalBankName =
        bankName !== undefined ? bankName : provider.bankName;

      if (!finalBankName?.trim()) {
        return res.status(400).json({
          success: false,
          message: "Bank name is required for bank loan",
        });
      }

      provider.bankName = finalBankName;
      if (accountNumber !== undefined) {
        provider.accountNumber = accountNumber;
      }
      if (branchName !== undefined) {
        provider.branchName = branchName;
      }
    } else {
      provider.bankName = "";
      provider.accountNumber = "";
      provider.branchName = "";
    }

    if (mobile !== undefined) provider.mobile = mobile;
    if (address !== undefined) provider.address = address;
    if (notes !== undefined) provider.notes = notes;

    if (openingBalance !== undefined && !hasTransactions) {
      const amount = Number(openingBalance);

      if (!Number.isFinite(amount) || amount < 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid opening loan balance",
        });
      }

      provider.openingBalance = amount;
    }

    if (openingBalanceDate !== undefined && !hasTransactions) {
      const date = new Date(openingBalanceDate);

      if (Number.isNaN(date.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid opening balance date",
        });
      }

      provider.openingBalanceDate = date;
    }

    await provider.save();

    res.status(200).json({
      success: true,
      message: "Loan provider updated successfully",
      data: provider,
    });
  } catch (error) {
    console.error("UPDATE LOAN PROVIDER ERROR:", error);

    res.status(500).json({
      success: false,
      message: error.message || "Failed to update loan provider",
    });
  }
});

// ========================================
// ACTIVATE / DEACTIVATE LOAN PROVIDER
// PATCH /api/loans/providers/:id/status
// ========================================
router.patch("/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid loan provider ID",
      });
    }

    if (typeof isActive !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "isActive must be true or false",
      });
    }

    const provider = await LoanProvider.findByIdAndUpdate(
      id,
      { isActive },
      { new: true, runValidators: true }
    );

    if (!provider) {
      return res.status(404).json({
        success: false,
        message: "Loan provider not found",
      });
    }

    res.status(200).json({
      success: true,
      message: isActive
        ? "Loan provider activated successfully"
        : "Loan provider deactivated successfully",
      data: provider,
    });
  } catch (error) {
    console.error("LOAN PROVIDER STATUS ERROR:", error);

    res.status(500).json({
      success: false,
      message: error.message || "Failed to update provider status",
    });
  }
});

export default router;
