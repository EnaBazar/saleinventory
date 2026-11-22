
import mongoose from "mongoose";
import { randomBytes } from "node:crypto";

// ========================================
// SALES RETURN ITEM SCHEMA
// ========================================
const salesReturnItemSchema = new mongoose.Schema(
  {
    originalSaleItemId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },

    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },

    productName: {
      type: String,
      required: true,
      trim: true,
    },
categoryName: {
  type: String,
  default: "",
  trim: true,
},
supplierId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "Supplier",
  default: null,
},

supplierName: {
  type: String,
  default: "",
  trim: true,
},
    lotId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lot",
      required: true,
    },

    lotCode: {
      type: String,
      required: true,
      trim: true,
    },

    stockType: {
      type: String,
      enum: ["OWN", "COMMISSION"],
      default: "OWN",
    },

    bags: {
      type: Number,
      default: 0,
      min: 0,
    },

    weightKg: {
      type: Number,
      required: true,
      min: 0,
    },

    saleRatePerKg: {
      type: Number,
      required: true,
      min: 0,
    },

    commissionRatePerKg: {
      type: Number,
      default: 0,
      min: 0,
    },

    labourRatePerBag: {
      type: Number,
      default: 0,
      min: 0,
    },

    productTotal: {
      type: Number,
      default: 0,
      min: 0,
    },

    commissionTotal: {
      type: Number,
      default: 0,
      min: 0,
    },

    labourTotal: {
      type: Number,
      default: 0,
      min: 0,
    },

    costTotal: {
  type: Number,
  default: 0,
  min: 0,
},

profit: {
  type: Number,
  default: 0,
},
    returnAmount: {
      type: Number,
      required: true,
      min: 0,
    },

  },
  { _id: true }
);

// ========================================
// SALES RETURN SCHEMA
// ========================================
const salesReturnSchema = new mongoose.Schema(
  {
    returnNumber: {
      type: String,
      unique: true,
      required: true,
      trim: true,
    },

    saleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Sale",
      required: true,
      index: true,
    },

    invoiceNumber: {
      type: String,
      required: true,
      trim: true,
    },

    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      index: true,
    },

    customerName: {
      type: String,
      required: true,
    },

    customerMobile: {
      type: String,
      default: "",
    },

    returnDate: {
      type: Date,
      default: Date.now,
    },

    items: {
      type: [salesReturnItemSchema],
      validate: {
        validator: function (items) {
          return items && items.length > 0;
        },
        message: "At least one return item is required.",
      },
    },

    totalBags: {
      type: Number,
      default: 0,
      min: 0,
    },

    totalWeightKg: {
      type: Number,
      default: 0,
      min: 0,
    },
    // OWN SALE RETURN COST AND PROFIT
    costTotal: {
      type: Number,
      default: 0,
      min: 0,
    },

    profit: {
      type: Number,
      default: 0,
    },
    returnAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    dueBeforeReturn: {
      type: Number,
      default: 0,
    },

    amountAdjusted: {
      type: Number,
      default: 0,
      min: 0,
    },

    refundAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    refundMethod: {
      type: String,
      enum: ["CASH", "BANK", "BKASH", "NAGAD", "ROCKET", "OTHER"],
      default: null,
    },

    refundReference: {
      type: String,
      default: "",
      trim: true,
    },

    notes: {
      type: String,
      default: "",
      trim: true,
    },

    createdBy: {
      adminId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Admin",
        default: null,
      },

      adminName: {
        type: String,
        default: "",
      },
    },

    status: {
      type: String,
      enum: ["COMPLETED"],
      default: "COMPLETED",
    },
  },
  { timestamps: true }
);

// ========================================
// AUTO GENERATE RETURN NUMBER
// ========================================
salesReturnSchema.pre("validate", function () {
  if (this.isNew && !this.returnNumber) {
    const date = new Date();

    const datePart = [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0"),
    ].join("");

    const randomPart = randomBytes(3).toString("hex").toUpperCase();

    this.returnNumber = `SRT-${datePart}-${randomPart}`;
  }
});

// ========================================
// INDEXES
// ========================================
salesReturnSchema.index({ saleId: 1, createdAt: -1 });
salesReturnSchema.index({ customerId: 1, returnDate: -1 });
salesReturnSchema.index({ returnDate: -1 });

const SalesReturn = mongoose.model(
  "SalesReturn",
  salesReturnSchema
);

export default SalesReturn;
