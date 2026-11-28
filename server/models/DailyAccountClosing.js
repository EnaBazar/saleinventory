
import mongoose from "mongoose";

const dailyAccountClosingSchema = new mongoose.Schema(
  {
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: true,
    },

    closingDate: {
      type: String,
      required: true,
    },

    openingBalance: {
      type: Number,
      required: true,
      default: 0,
    },

    totalIn: {
      type: Number,
      default: 0,
    },

    totalOut: {
      type: Number,
      default: 0,
    },

    systemClosingBalance: {
      type: Number,
      required: true,
    },

    actualClosingBalance: {
      type: Number,
      required: true,
    },

    difference: {
      type: Number,
      required: true,
      default: 0,
    },

    closingStatus: {
      type: String,
      enum: ["MATCHED", "SHORT", "EXCESS"],
      required: true,
    },

    remarks: {
      type: String,
      default: "",
    },

    closedBy: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
  },
  { timestamps: true }
);

dailyAccountClosingSchema.index(
  { accountId: 1, closingDate: 1 },
  { unique: true }
);

const DailyAccountClosing = mongoose.model(
  "DailyAccountClosing",
  dailyAccountClosingSchema
);

export default DailyAccountClosing;
