
import mongoose from "mongoose";

const loanAdjustmentSchema = new mongoose.Schema(
  {
    loanTransactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LoanTransaction",
      required: true,
      index: true,
    },

    providerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LoanProvider",
      required: true,
      index: true,
    },

    adjustmentMethod: {
      type: String,
      enum: ["DIRECT_EDIT", "REVERSE_NEW"],
      required: true,
    },

    replacementTransactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LoanTransaction",
      default: null,
    },

    reason: {
      type: String,
      required: true,
      trim: true,
    },

    beforeData: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },

    afterData: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },

    beforeLedgerData: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    afterLedgerData: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    adjustedBy: {
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

    adjustedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

loanAdjustmentSchema.index({
  providerId: 1,
  adjustedAt: -1,
});

const LoanAdjustment = mongoose.model(
  "LoanAdjustment",
  loanAdjustmentSchema
);

export default LoanAdjustment;
