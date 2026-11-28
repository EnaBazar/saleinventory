import mongoose from "mongoose";

const ownerCapitalLedgerSchema = new mongoose.Schema(
  {
    transactionType: {
      type: String,
      enum: ["OPENING_CAPITAL", "CAPITAL_DEPOSIT", "OWNER_WITHDRAWAL"],
      required: true,
      index: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },

    transactionDate: {
      type: Date,
      required: true,
      index: true,
    },

    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      default: null,
    },

    linkedAccountLedgerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AccountLedger",
      default: null,
    },

    transactionId: {
      type: String,
      default: "",
      index: true,
    },

    reference: {
      type: String,
      trim: true,
      default: "",
    },

    description: {
      type: String,
      trim: true,
      default: "",
    },

    createdBy: {
      adminId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Admin",
        default: null,
      },
      name: {
        type: String,
        default: "",
      },
      username: {
        type: String,
        default: "",
      },
    },

    isVoided: {
      type: Boolean,
      default: false,
      index: true,
    },

    voidedAt: {
      type: Date,
      default: null,
    },

    voidReason: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

ownerCapitalLedgerSchema.index({
  transactionDate: -1,
  transactionType: 1,
});

export default mongoose.model(
  "OwnerCapitalLedger",
  ownerCapitalLedgerSchema
);
