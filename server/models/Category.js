
import mongoose from "mongoose";

const subcategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

const categorySchema = new mongoose.Schema(
  {
    productName: {
      type: String,
      required: true,
      trim: true,
    },

    categoryName: {
      type: String,
      required: true,
      trim: true,
    },

    subcategories: {
      type: [subcategorySchema],
      default: [],
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

categorySchema.index(
  { productName: 1, categoryName: 1 },
  { unique: true }
);

const Category = mongoose.model("Category", categorySchema);

export default Category;
