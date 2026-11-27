
import mongoose from "mongoose";

const expenseSchema = new mongoose.Schema(
  {
    expenseDate: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },

    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ExpenseCategory",
      required: true,
      index: true,
    },

    // Category name snapshot
    categoryName: {
      type: String,
      required: true,
      trim: true,
    },

    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: true,
      index: true,
    },

    // Account details snapshot
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

    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },

    voucherNumber: {
      type: String,
      trim: true,
      default: "",
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

    ledgerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AccountLedger",
      default: null,
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

    updatedBy: {
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

    editHistory: [
      {
        editedAt: {
          type: Date,
          default: Date.now,
        },
        editedBy: {
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
        previousData: {
          type: mongoose.Schema.Types.Mixed,
          default: {},
        },
        reason: {
          type: String,
          trim: true,
          default: "",
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

expenseSchema.index({ expenseDate: -1, createdAt: -1 });
expenseSchema.index({ categoryId: 1, expenseDate: -1 });
expenseSchema.index({ accountId: 1, expenseDate: -1 });

const Expense = mongoose.model("Expense", expenseSchema);

export default Expense;
