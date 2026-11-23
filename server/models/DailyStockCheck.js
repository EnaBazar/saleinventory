
import mongoose from "mongoose";

const dailyStockRowSchema = new mongoose.Schema(
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

    openingBags: {
      type: Number,
      default: 0,
      min: 0,
    },

    salesBags: {
      type: Number,
      default: 0,
      min: 0,
    },

    salesReturnBags: {
      type: Number,
      default: 0,
      min: 0,
    },

    expectedBags: {
      type: Number,
      default: 0,
      min: 0,
    },

    countedBags: {
      type: Number,
      default: null,
      min: 0,
    },

    differenceBags: {
      type: Number,
      default: null,
    },

    closingBags: {
      type: Number,
      default: null,
      min: 0,
    },

    adjustmentStatus: {
      type: String,
      enum: ["PENDING", "COMPLETED", "NOT_REQUIRED"],
      default: "PENDING",
    },

    adjustmentIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "StockAdjustment",
      },
    ],
  },
  { _id: true }
);

const dailyStockCheckSchema = new mongoose.Schema(
  {
    dateKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    // First day's stock snapshot time
    openingSnapshotAt: {
      type: Date,
      default: null,
    },

    rows: {
      type: [dailyStockRowSchema],
      default: [],
    },

    notes: {
      type: String,
      default: "",
      trim: true,
    },

    savedBy: {
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

    adjustmentConfirmedAt: {
      type: Date,
      default: null,
    },

    adjustmentConfirmedBy: {
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
  },
  { timestamps: true }
);

dailyStockCheckSchema.index({ dateKey: -1 });

const DailyStockCheck = mongoose.model(
  "DailyStockCheck",
  dailyStockCheckSchema
);

export default DailyStockCheck;
