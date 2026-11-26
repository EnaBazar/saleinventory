
import mongoose from "mongoose";

const loanTransactionSchema = new mongoose.Schema(
  {
    providerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LoanProvider",
      required: true,
      index: true,
    },

    // BANK অথবা PERSON
    loanType: {
      type: String,
      enum: ["BANK", "PERSON"],
      required: true,
    },

    // টাকা গ্রহণ অথবা পরিশোধ
    transactionType: {
      type: String,
      enum: ["RECEIVED", "REPAYMENT"],
      required: true,
    },

    // যে Cash / Bank / bKash Account ব্যবহার হয়েছে
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: true,
      index: true,
    },

    // মূল ঋণের টাকা
    principalAmount: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    // শুধু Personal Loan-এর সুদ
    interestAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    // মোট টাকা গ্রহণ বা পরিশোধ
    totalAmount: {
      type: Number,
      required: true,
      min: 0.01,
    },

    transactionDate: {
      type: Date,
      default: Date.now,
      index: true,
    },

    reference: {
      type: String,
      trim: true,
      default: "",
    },

    description: {
      type: String,
      trim: true,
      default: "",
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

    // ভুল Transaction বাতিল করার ব্যবস্থা
    isVoided: {
      type: Boolean,
      default: false,
    },

    voidedAt: {
      type: Date,
      default: null,
    },

    voidReason: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

// Transaction-এর হিসাব যাচাই
// Transaction-এর হিসাব যাচাই
loanTransactionSchema.pre("validate", function () {
  const principal = Number(this.principalAmount || 0);
  const interest = Number(this.interestAmount || 0);
  const total = Number(this.totalAmount || 0);

  if (
    !Number.isFinite(principal) ||
    !Number.isFinite(interest) ||
    !Number.isFinite(total) ||
    principal < 0 ||
    interest < 0
  ) {
    throw new Error("Invalid loan transaction amount");
  }

  if (this.transactionType === "RECEIVED") {
    if (principal <= 0 || interest !== 0 || total !== principal) {
      throw new Error("Invalid loan received amount");
    }
  }

  if (this.transactionType === "REPAYMENT") {
    if (this.loanType === "BANK") {
      if (principal <= 0 || interest !== 0 || total !== principal) {
        throw new Error("Bank loan repayment must be principal only");
      }
    }

    if (this.loanType === "PERSON") {
      if (principal + interest <= 0 || total !== principal + interest) {
        throw new Error("Personal loan repayment amount is incorrect");
      }
    }
  }
});


loanTransactionSchema.index({
  providerId: 1,
  transactionDate: -1,
});

loanTransactionSchema.index({
  transactionType: 1,
  transactionDate: -1,
});

const LoanTransaction = mongoose.model(
  "LoanTransaction",
  loanTransactionSchema
);

export default LoanTransaction;
