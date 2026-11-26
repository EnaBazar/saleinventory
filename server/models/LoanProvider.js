
import mongoose from "mongoose";

const loanProviderSchema = new mongoose.Schema(
  {
    providerName: {
      type: String,
      required: true,
      trim: true,
    },
    providerType: {
      type: String,
      enum: ["BANK", "PERSON"],
      required: true,
    },
    mobile: {
      type: String,
      trim: true,
      default: "",
    },
    address: {
      type: String,
      trim: true,
      default: "",
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

loanProviderSchema.index({ providerName: 1, providerType: 1 });

const LoanProvider = mongoose.model(
  "LoanProvider",
  loanProviderSchema
);

export default LoanProvider;
