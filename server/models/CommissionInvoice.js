
import mongoose from "mongoose";

const commissionInvoiceItemSchema = new mongoose.Schema(
  {
    bags: { type: Number, required: true, min: 0 },
    weightKg: { type: Number, required: true, min: 0 },
    ratePerKg: { type: Number, required: true, min: 0 },
    amount: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const commissionInvoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    lotId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lot",
      required: true,
    },

    lotCode: { type: String, required: true, trim: true },

    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },

    productName: { type: String, required: true, trim: true },

    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
      required: true,
    },

    supplierName: { type: String, required: true, trim: true },

    invoiceDate: {
      type: Date,
      default: Date.now,
    },

    items: {
      type: [commissionInvoiceItemSchema],
      required: true,
      validate: {
        validator: (items) =>
          Array.isArray(items) && items.length > 0,
        message: "At least one commission invoice item is required.",
      },
    },

    totalBags: { type: Number, required: true, min: 0 },
    totalWeightKg: { type: Number, required: true, min: 0 },
    grossAmount: { type: Number, required: true, min: 0 },

    transportCost: { type: Number, default: 0, min: 0 },
    labourRatePerBag: { type: Number, default: 0, min: 0 },
    labourCost: { type: Number, default: 0, min: 0 },
    commissionRatePerKg: { type: Number, default: 0, min: 0 },
    commissionCost: { type: Number, default: 0, min: 0 },
    otherCost: { type: Number, default: 0, min: 0 },

    totalDeduction: { type: Number, required: true, min: 0 },
    netSupplierPayable: { type: Number, required: true, min: 0 },

    notes: {
      type: String,
      default: "",
      trim: true,
    },

    status: {
      type: String,
      enum: ["COMPLETED", "CANCELLED"],
      default: "COMPLETED",
    },

    createdBy: {
      adminId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Admin",
        default: null,
      },
      name: { type: String, default: "" },
      username: { type: String, default: "" },
    },

    // Commission Invoice Edit History
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
          name: { type: String, default: "" },
          username: { type: String, default: "" },
        },

        reason: {
          type: String,
          default: "",
          trim: true,
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

    completedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// একই Lot-এর সর্বোচ্চ একটি COMPLETED Invoice থাকবে
commissionInvoiceSchema.index(
  { lotId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: "COMPLETED",
    },
  }
);

commissionInvoiceSchema.index({
  supplierId: 1,
  invoiceDate: -1,
});

commissionInvoiceSchema.index({
  invoiceDate: -1,
});

const CommissionInvoice = mongoose.model(
  "CommissionInvoice",
  commissionInvoiceSchema
);

export default CommissionInvoice;
