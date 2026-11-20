
import mongoose from "mongoose";
import { randomInt } from "node:crypto";

const lotSchema = new mongoose.Schema(
  {
    lotCode: {
      type: String,
      unique: true,
      required: true,
      trim: true,
      uppercase: true,
    },

    // Product information
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

    subcategoryName: {
      type: String,
      default: "",
      trim: true,
    },

    // Supplier information
    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
      default: null,
    },

    stockType: {
      type: String,
      enum: ["OWN", "COMMISSION"],
      default: "OWN",
      required: true,
    },

    // Purchase information
    purchaseDate: {
      type: Date,
      default: null,
    },

    bagsReceived: {
      type: Number,
      default: 0,
      min: 0,
    },

    totalWeightKg: {
      type: Number,
      default: 0,
      min: 0,
    },

    purchasePricePerKg: {
      type: Number,
      default: 0,
      min: 0,
    },

    totalPurchaseAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Returned quantity
    returnedBags: {
      type: Number,
      default: 0,
      min: 0,
    },

    returnedWeightKg: {
      type: Number,
      default: 0,
      min: 0,
    },

    returnedPurchaseAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Current stock
    remainingBags: {
      type: Number,
      default: 0,
      min: 0,
    },

    remainingWeightKg: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Sold quantity
    soldBags: {
      type: Number,
      default: 0,
      min: 0,
    },

    soldWeightKg: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Purchase Edit History
    editHistory: [
      {
        editedAt: {
          type: Date,
          default: Date.now,
        },

        oldValues: {
          type: mongoose.Schema.Types.Mixed,
          default: {},
        },

        newValues: {
          type: mongoose.Schema.Types.Mixed,
          default: {},
        },
        editedBy: {
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

        reason: {
          type: String,
          default: "",
          trim: true,
        },


      },
    ],

    // Purchase Return History
    returnHistory: [
      {
        returnDate: {
          type: Date,
          default: Date.now,
        },

        bagsReturned: {
          type: Number,
          default: 0,
          min: 0,
        },

        weightReturnedKg: {
          type: Number,
          default: 0,
          min: 0,
        },

        purchasePricePerKg: {
          type: Number,
          default: 0,
          min: 0,
        },

        returnAmount: {
          type: Number,
          default: 0,
          min: 0,
        },

returnedBy: {
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

        notes: {
          type: String,
          default: "",
          trim: true,
        },
      },
    ],

    status: {
      type: String,
      enum: ["PENDING", "ACTIVE", "COMPLETED", "CANCELLED"],
      default: "PENDING",
    },

    notes: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { timestamps: true }
);

// Automatically generate unique Lot Code
lotSchema.pre("validate", async function () {
  if (!this.isNew || this.lotCode) return;

  const prefix =
    this.productName
      .replace(/[^a-zA-Z0-9]/g, "")
      .substring(0, 3)
      .toUpperCase() || "PRD";

  let exists = true;
  let code = "";

  while (exists) {
    code = `${prefix}-LOT-${randomInt(100000, 1000000)}`;

    exists = await mongoose.models.Lot.exists({
      lotCode: code,
    });
  }

  this.lotCode = code;
});

// Initialize stock only for a purchased lot
lotSchema.pre("validate", function () {
  if (!this.isNew) return;

  if (this.status === "PENDING") {
    this.remainingBags = 0;
    this.remainingWeightKg = 0;
    this.totalPurchaseAmount = 0;
    return;
  }

   this.remainingBags = this.bagsReceived || 0;
  this.remainingWeightKg = this.totalWeightKg || 0;

  if (this.stockType === "COMMISSION") {
    this.purchasePricePerKg = 0;
    this.totalPurchaseAmount = 0;
  } else {
    this.totalPurchaseAmount =
      (this.totalWeightKg || 0) *
      (this.purchasePricePerKg || 0);
  }
});

// Indexes
lotSchema.index({ productId: 1, status: 1 });
lotSchema.index({ supplierId: 1 });
lotSchema.index({ purchaseDate: -1 });

const Lot = mongoose.model("Lot", lotSchema);

export default Lot;
