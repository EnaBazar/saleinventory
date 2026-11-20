
import mongoose from "mongoose";

const supplierSchema = new mongoose.Schema(
  {
    supplierName: {
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

supplierSchema.index({ supplierName: 1 });
supplierSchema.index({ mobile: 1 });

const Supplier = mongoose.model("Supplier", supplierSchema);

export default Supplier;
