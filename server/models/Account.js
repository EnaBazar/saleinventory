
import mongoose from "mongoose";

const accountSchema = new mongoose.Schema(
  {
    accountName: {
      type: String,
      required: true,
      trim: true,
    },

    accountType: {
      type: String,
      enum: ["CASH", "BANK", "BKASH"],
      required: true,
    },

    bankName: {
      type: String,
      trim: true,
      default: "",
    },

    accountNumber: {
      type: String,
      trim: true,
      default: "",
    },

    branchName: {
      type: String,
      trim: true,
      default: "",
    },

    openingBalance: {
      type: Number,
      default: 0,
      min: 0,
    },

    openingBalanceDate: {
      type: Date,
      default: Date.now,
    },

    notes: {
      type: String,
      trim: true,
      default: "",
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    optimisticConcurrency: true,
  }
);

accountSchema.index({ accountName: 1 });
accountSchema.index({ accountType: 1, isActive: 1 });

const Account = mongoose.model("Account", accountSchema);

export default Account;
