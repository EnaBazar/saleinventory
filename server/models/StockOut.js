
import mongoose from "mongoose";

const stockOutItemSchema = new mongoose.Schema(
  {
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
      required: true,
    },

    bags: {
      type: Number,
      required: true,
      min: 0,
    },

    weightKg: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: true }
);

const stockOutSchema = new mongoose.Schema(
  {
    stockOutNumber: {
      type: String,
      unique: true,
      trim: true,
    },

    transactionDate: {
      type: Date,
      required: true,
      default: Date.now,
    },

    items: {
      type: [stockOutItemSchema],
      required: true,
      validate: {
        validator: (items) => items.length > 0,
        message: "At least one stock out item is required",
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

    reason: {
      type: String,
      required: true,
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

      adminUsername: {
        type: String,
        default: "",
      },
    },

    status: {
      type: String,
      enum: ["COMPLETED", "CANCELLED"],
      default: "COMPLETED",
    },

    cancelledAt: {
      type: Date,
      default: null,
    },

    cancellationReason: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

stockOutSchema.index({ transactionDate: -1 });
stockOutSchema.index({ "items.productId": 1 });
stockOutSchema.index({ "items.lotId": 1 });

const StockOut = mongoose.model("StockOut", stockOutSchema);

export default StockOut;
