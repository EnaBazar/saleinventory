
import mongoose from "mongoose";

const accountLedgerSchema = new mongoose.Schema(
  {
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: true,
      index: true,
    },
    // Linked Customer Payment
    customerPaymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CustomerLedger",
      default: null,
      index: true,
    },

    // Linked Supplier Payment
supplierPaymentId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "SupplierLedger",
  default: null,
  index: true,
},
source: {
  type: String,
  enum: [
    "MANUAL",
    "SALES",
    "CUSTOMER_PAYMENT",
    "SUPPLIER_PAYMENT",
    "OTHER"
  ],
  default: "OTHER",
  index: true,
},
   transactionType: {
  type: String,
  enum: [
    "OPENING_BALANCE",
    "DEPOSIT",
    "WITHDRAWAL",
    "EXPENSE",
    "TRANSFER_IN",
    "TRANSFER_OUT",
    "ADJUSTMENT",
  ],
  required: true,
},

    // IN = টাকা এসেছে
    // OUT = টাকা বের হয়েছে
    direction: {
      type: String,
      enum: ["IN", "OUT"],
      required: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },

    relatedAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      default: null,
    },

    reference: {
      type: String,
      trim: true,
      default: "",
    },

    transactionId: {
      type: String,
      trim: true,
      default: "",
    },

    description: {
      type: String,
      trim: true,
      default: "",
    },

    transactionDate: {
      type: Date,
      default: Date.now,
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

accountLedgerSchema.index({
  accountId: 1,
  transactionDate: 1,
});

accountLedgerSchema.index({
  transactionType: 1,
  transactionDate: 1,
});

const AccountLedger = mongoose.model(
  "AccountLedger",
  accountLedgerSchema
);

export default AccountLedger;
