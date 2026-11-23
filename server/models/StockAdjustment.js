
import mongoose from "mongoose";

const stockAdjustmentSchema = new mongoose.Schema(
  {
    adjustmentNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    date: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },

    type: {
      type: String,
      enum: ["IN", "OUT"],
      required: true,
    },

    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
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
      index: true,
    },

    lotCode: {
      type: String,
      default: "",
      trim: true,
    },

    bags: {
      type: Number,
      required: true,
      min: 1,
    },

    reason: {
      type: String,
      default: "DAILY_STOCK_CHECK",
      trim: true,
    },

    dailyStockCheckId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DailyStockCheck",
      default: null,
      index: true,
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
      name: {
        type: String,
        default: "",
      },
      username: {
        type: String,
        default: "",
      },
    },

    status: {
      type: String,
      enum: ["COMPLETED", "CANCELLED"],
      default: "COMPLETED",
      index: true,
    },

    cancelledAt: {
      type: Date,
      default: null,
    },

    cancelledBy: {
      adminId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Admin",
        default: null,
      },
      name: {
        type: String,
        default: "",
      },
    },

    cancellationReason: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { timestamps: true }
);

stockAdjustmentSchema.index({ date: -1, type: 1 });
stockAdjustmentSchema.index({ productId: 1, date: -1 });
stockAdjustmentSchema.index({ dailyStockCheckId: 1, status: 1 });

const StockAdjustment = mongoose.model(
  "StockAdjustment",
  stockAdjustmentSchema
);

export default StockAdjustment;
