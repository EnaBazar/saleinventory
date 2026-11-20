
import mongoose from "mongoose";
import { randomInt } from "node:crypto";

const productSchema = new mongoose.Schema(
  {
    productName: {
      type: String,
      required: true,
      trim: true,
    },

    // Automatically Generated Lot Number
    lotCode: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      uppercase: true,
    },

    purchaseStatus: {
      type: String,
      enum: ["PENDING", "PURCHASED"],
      default: "PENDING",
    },

    category: {
      type: String,
      required: true,
      trim: true,
    },

    subcategory: {
      type: String,
      trim: true,
      default: "",
    },

    brand: {
      type: String,
      trim: true,
      default: "",
    },

    stockType: {
      type: String,
      enum: ["OWN", "COMMISSION"],
      default: "OWN",
      required: true,
    },

    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
      default: null,
    },

    packingType: {
      type: String,
      default: "BAG",
      enum: ["BAG", "LOOSE", "BOX", "OTHER"],
    },

    unit: {
      type: String,
      default: "KG",
      enum: ["KG", "GRAM", "TON", "PCS"],
    },

    purchasePrice: {
      type: Number,
      default: 0,
      min: 0,
    },

    salePrice: {
      type: Number,
      default: 0,
      min: 0,
    },

    currentStockKg: {
      type: Number,
      default: 0,
      min: 0,
    },

    currentStockBags: {
      type: Number,
      default: 0,
      min: 0,
    },

    minimumStockKg: {
      type: Number,
      default: 0,
      min: 0,
    },

    description: {
      type: String,
      default: "",
      trim: true,
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

// Generate Lot Number automatically
productSchema.pre("validate", async function () {
  if (!this.isNew || this.lotCode) return;

  const prefix =
    this.productName
      .replace(/[^a-zA-Z0-9]/g, "")
      .substring(0, 3)
      .toUpperCase() || "PRD";

  let code;
  let exists = true;

  while (exists) {
    code = `${prefix}-LOT-${randomInt(100000, 1000000)}`;

    exists = await mongoose.models.Product.exists({
      lotCode: code,
    });
  }

  this.lotCode = code;
});

// Product Search
productSchema.index({
  productName: "text",
});

const Product = mongoose.model("Product", productSchema);

export default Product;
