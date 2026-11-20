
import mongoose from "mongoose";

const customerSchema = new mongoose.Schema(
  {
    customerName: {
      type: String,
      required: true,
      trim: true,
    },

    companyName: {
      type: String,
      trim: true,
      default: "",
    },

    contactPerson: {
      type: String,
      trim: true,
      default: "",
    },

    mobile: {
      type: String,
      trim: true,
      default: "",
    },

    alternateMobile: {
      type: String,
      trim: true,
      default: "",
    },

    address: {
      type: String,
      trim: true,
      default: "",
    },

    customerType: {
      type: String,
      enum: ["REGULAR", "WHOLESALE", "RETAIL"],
      default: "REGULAR",
    },

    openingBalance: {
      type: Number,
      default: 0,
    },

    notes: {
      type: String,
      trim: true,
      default: "",
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

customerSchema.index({ customerName: 1 });
customerSchema.index({ mobile: 1 });

const Customer = mongoose.model("Customer", customerSchema);

export default Customer;
