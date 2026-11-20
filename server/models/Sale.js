
import mongoose from "mongoose";
import { randomBytes } from "node:crypto";

const saleItemSchema = new mongoose.Schema(
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

    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
      default: null,
    },

    supplierName: {
      type: String,
      default: "",
    },

    stockType: {
      type: String,
      enum: ["OWN", "COMMISSION"],
      default: "OWN",
    },

    bags: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    weightKg: {
      type: Number,
      required: true,
      min: 0,
    },

    purchasePricePerKg: {
      type: Number,
      min: 0,
      default: 0,
    },

    saleRatePerKg: {
      type: Number,
      required: true,
      min: 0,
    },

    commissionRatePerKg: {
      type: Number,
      min: 0,
      default: 0,
    },

    labourRatePerBag: {
      type: Number,
      min: 0,
      default: 0,
    },

    productTotal: {
      type: Number,
      default: 0,
    },

    commissionTotal: {
      type: Number,
      default: 0,
    },

    labourTotal: {
      type: Number,
      default: 0,
    },

    lineTotal: {
      type: Number,
      default: 0,
    },

    costTotal: {
      type: Number,
      default: 0,
    },

    profit: {
      type: Number,
      default: 0,
    },
  },
  { _id: true }
);

const saleSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      unique: true,
      required: true,
      trim: true,
    },

    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },

    customerName: {
      type: String,
      required: true,
    },

    companyName: {
      type: String,
      default: "",
    },

    customerMobile: {
      type: String,
      default: "",
    },

    customerAddress: {
      type: String,
      default: "",
    },

    invoiceDate: {
      type: Date,
      default: Date.now,
    },

    items: {
      type: [saleItemSchema],
      validate: {
        validator: function (items) {
          return items && items.length > 0;
        },
        message: "At least one product is required.",
      },
    },

    totalBags: {
      type: Number,
      default: 0,
    },

    totalWeightKg: {
      type: Number,
      default: 0,
    },

    productTotal: {
      type: Number,
      default: 0,
    },

    totalCommission: {
      type: Number,
      default: 0,
    },

    totalLabour: {
      type: Number,
      default: 0,
    },

    otherCost: {
      type: Number,
      default: 0,
    },

    discount: {
      type: Number,
      default: 0,
    },

    grandTotal: {
      type: Number,
      default: 0,
    },

    previousDue: {
      type: Number,
      default: 0,
    },

    totalPayable: {
      type: Number,
      default: 0,
    },

    paidAmount: {
      type: Number,
      default: 0,
    },

    dueAmount: {
      type: Number,
      default: 0,
    },

    totalCost: {
      type: Number,
      default: 0,
    },

    totalProfit: {
      type: Number,
      default: 0,
    },

    paymentMethod: {
      type: String,
      enum: [
        "CASH",
        "BANK",
        "BKASH",
        "NAGAD",
        "ROCKET",
        "OTHER",
        "DUE",
      ],
      default: "CASH",
    },

    paymentReference: {
      type: String,
      default: "",
    },

    status: {
      type: String,
      enum: ["DRAFT", "COMPLETED", "CANCELLED"],
      default: "DRAFT",
    },
    
    // Sales Return transaction lock version
returnVersion: {
  type: Number,
  default: 0,
  min: 0,
},
    notes: {
      type: String,
      default: "",
    },

    createdBy: {
      adminId: {
        type: mongoose.Schema.Types.ObjectId,
        default: null,
      },
      adminName: {
        type: String,
        default: "",
      },
    },

    completedAt: {
      type: Date,
      default: null,
    },

    cancelledAt: {
      type: Date,
      default: null,
    },

    cancelledBy: {
      adminId: {
        type: mongoose.Schema.Types.ObjectId,
        default: null,
      },
      adminName: {
        type: String,
        default: "",
      },
    },

    cancellationDetails: {
      reason: {
        type: String,
        default: "",
      },

      previousDueAdjusted: {
        type: Number,
        default: 0,
      },

      refundAmount: {
        type: Number,
        default: 0,
      },

      cancelledBy: {
        type: String,
        default: "",
      },

      cancelledAt: {
        type: Date,
        default: null,
      },
    },


  },
  { timestamps: true }
);

// Automatically generate invoice number
saleSchema.pre("validate", function () {
  if (this.isNew && !this.invoiceNumber) {
    const date = new Date();
    const datePart = [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0"),
    ].join("");

    const randomPart = randomBytes(3).toString("hex").toUpperCase();

    this.invoiceNumber = `SAL-${datePart}-${randomPart}`;
  }
});

// Indexes
saleSchema.index({ customerId: 1, invoiceDate: -1 });
saleSchema.index({ invoiceDate: -1 });
saleSchema.index({ status: 1 });
saleSchema.index({ "items.productId": 1 });
saleSchema.index({ "items.lotId": 1 });

const Sale = mongoose.model("Sale", saleSchema);

export default Sale;
