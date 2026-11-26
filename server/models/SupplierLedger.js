
import mongoose from "mongoose";

const supplierLedgerSchema = new mongoose.Schema(
  {
    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
      required: true,
      index: true,
    },
type: {
  type: String,
  enum: [
    "PURCHASE",
    "PURCHASE_RETURN",
    "PAYMENT",
    "ADJUSTMENT",
    "COMMISSION_INVOICE",
  ],
  required: true,
},
    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    debit: {
      type: Number,
      default: 0,
      min: 0,
    },

    credit: {
      type: Number,
      default: 0,
      min: 0,
    },

    balanceAfter: {
      type: Number,
      default: 0,
    },

    lotId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lot",
      default: null,
    },

    paymentMethod: {
      type: String,
      enum: ["CASH", "BANK", "BKASH", "NAGAD", "ROCKET", "OTHER"],
      default: null,
    },
    // Linked Account for Customer Collection
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      default: null,
      index: true,
    },
    transactionId: {
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

// Payment Correction History
correctionHistory: [
  {
    correctedAt: {
      type: Date,
      default: Date.now,
    },

    correctedBy: {
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

    reason: {
      type: String,
      default: "",
    },

    oldValues: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    newValues: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
],

// Payment Void Information
isVoided: {
  type: Boolean,
  default: false,
},

voidedAt: {
  type: Date,
  default: null,
},

voidedBy: {
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

voidReason: {
  type: String,
  default: "",
},

    transactionDate: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

supplierLedgerSchema.index({
  supplierId: 1,
  transactionDate: 1,
});

const SupplierLedger = mongoose.model(
  "SupplierLedger",
  supplierLedgerSchema
);

export default SupplierLedger;
