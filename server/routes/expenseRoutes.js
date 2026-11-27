
import express from "express";
import mongoose from "mongoose";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer";
import Expense from "../models/Expense.js";
import ExpenseCategory from "../models/ExpenseCategory.js";
import Account from "../models/Account.js";
import AccountLedger from "../models/AccountLedger.js";


const router = express.Router();




// ========================================
// PDF FONT & PUPPETEER CONFIGURATION
// ========================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const bengaliFontPath = path.join(
  __dirname,
  "../public/fonts/NotoSansBengali-Regular.ttf"
);

const englishFontPath = path.join(
  __dirname,
  "../public/fonts/Roboto.ttf"
);

function formatPDFDate(date) {
  if (!date) return "-";

  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Dhaka",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(date));
}

function formatPDFMoney(amount) {
  return Number(amount || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function escapeHTML(value) {
  return String(value ?? "-")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function generateExpensePDF(html) {
  if (
    !fs.existsSync(bengaliFontPath) ||
    !fs.existsSync(englishFontPath)
  ) {
    throw new Error("PDF font file not found. Please check fonts folder.");
  }

  const bengaliFont = fs
    .readFileSync(bengaliFontPath)
    .toString("base64");

  const englishFont = fs
    .readFileSync(englishFontPath)
    .toString("base64");

  const finalHTML = html
    .replace("</head>", `
      <style>
        @font-face {
          font-family: "NotoBengali";
          src: url(data:font/ttf;base64,${bengaliFont}) format("truetype");
          font-weight: normal;
        }

        @font-face {
          font-family: "Roboto";
          src: url(data:font/ttf;base64,${englishFont}) format("truetype");
          font-weight: normal;
        }

        body {
          font-family: "NotoBengali", "Roboto", sans-serif;
        }

        table, th, td, h1, h2, h3, p, div, span {
          font-family: "NotoBengali", "Roboto", sans-serif;
        }
      </style>
    </head>`);

  let browser;

  try {
    browser = await puppeteer.launch({
      executablePath:
        "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-gpu",
      ],
    });

    const page = await browser.newPage();

    await page.setContent(finalHTML, {
      waitUntil: "networkidle0",
    });

    await page.evaluate(async () => {
      await document.fonts.ready;
    });

    return await page.pdf({
      format: "A4",
      landscape: true,
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: false,
      margin: {
        top: "35px",
        bottom: "40px",
        left: "35px",
        right: "35px",
      },
    });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
// ========================================
// GET CURRENT ACCOUNT BALANCE
// ========================================
async function getAccountBalance(accountId, session) {
  const result = await AccountLedger.aggregate([
    {
      $match: {
        accountId: new mongoose.Types.ObjectId(accountId),
        isVoided: { $ne: true },
      },
    },
    {
      $group: {
        _id: null,
        balance: {
          $sum: {
            $cond: [
              { $eq: ["$direction", "IN"] },
              "$amount",
              { $multiply: ["$amount", -1] },
            ],
          },
        },
      },
    },
  ]).session(session);

  return result[0]?.balance || 0;
}

// ========================================
// ACCOUNT TRANSACTION LOCK
// ========================================
async function lockAccount(account, session) {
  const result = await Account.updateOne(
    {
      _id: account._id,
      __v: account.__v,
    },
    {
      $inc: { __v: 1 },
    },
    { session }
  );

  if (result.modifiedCount !== 1) {
    throw new Error(
      "Account is being updated by another transaction. Please try again."
    );
  }
}

// ========================================
// CREATE NEW EXPENSE
// POST /api/expenses
// ========================================
router.post("/", async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const {
      expenseDate,
      categoryId,
      accountId,
      amount,
      voucherNumber,
      reference,
      description,
    } = req.body;

    // Basic validation
    if (
      !mongoose.Types.ObjectId.isValid(categoryId) ||
      !mongoose.Types.ObjectId.isValid(accountId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid Expense Category and Account are required",
      });
    }

    const expenseAmount = Number(amount);

    if (!Number.isFinite(expenseAmount) || expenseAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Expense amount must be greater than zero",
      });
    }

    const date = expenseDate ? new Date(expenseDate) : new Date();

    if (Number.isNaN(date.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid Expense Date",
      });
    }

    let createdExpense = null;

    await session.withTransaction(async () => {
      // Find active category
      const category = await ExpenseCategory.findOne({
        _id: categoryId,
        isActive: true,
      }).session(session);

      if (!category) {
        throw new Error("Expense Category not found or inactive");
      }

      // Find active account
      const account = await Account.findOne({
        _id: accountId,
        isActive: true,
      }).session(session);

      if (!account) {
        throw new Error("Account not found or inactive");
      }

      // Lock account against concurrent transactions
      await lockAccount(account, session);

      // Check current balance
      const currentBalance = await getAccountBalance(
        accountId,
        session
      );

      if (expenseAmount > currentBalance) {
        throw new Error(
          `Insufficient balance. Available balance: ${currentBalance}`
        );
      }

      const adminInfo = {
        adminId: req.admin?.adminId || null,
        name: req.admin?.name || "",
        username: req.admin?.username || "",
      };

      // Create Expense
      const expenses = await Expense.create(
        [
          {
            expenseDate: date,
            categoryId: category._id,
            categoryName: category.name,

            accountId: account._id,
            accountName: account.accountName,
            accountType: account.accountType,

            amount: expenseAmount,
            voucherNumber: voucherNumber?.trim() || "",
            reference: reference?.trim() || "",
            description: description?.trim() || "",

            createdBy: adminInfo,
          },
        ],
        { session }
      );

      createdExpense = expenses[0];

      // Create Account Ledger OUT entry
      const ledgerEntries = await AccountLedger.create(
        [
          {
            accountId: account._id,
            transactionType: "EXPENSE",
            direction: "OUT",
            amount: expenseAmount,

            transactionDate: date,
            reference: reference?.trim() || "",
            transactionId: `EXP-${createdExpense._id}`,

            description:
              `Expense: ${category.name}` +
              (description?.trim()
                ? ` - ${description.trim()}`
                : ""),

            createdBy: adminInfo,
          },
        ],
        { session }
      );

      // Link Ledger with Expense
      createdExpense.ledgerId = ledgerEntries[0]._id;

      await createdExpense.save({ session });
    });

    res.status(201).json({
      success: true,
      message: "Expense created successfully",
      data: createdExpense,
    });
  } catch (error) {
    console.error("CREATE EXPENSE ERROR:", error);

    res.status(400).json({
      success: false,
      message: error.message || "Failed to create Expense",
    });
  } finally {
    await session.endSession();
  }
});


// ========================================
// GET EXPENSE HISTORY
// GET /api/expenses
// ========================================
router.get("/", async (req, res) => {
  try {
    const {
      fromDate,
      toDate,
      categoryId,
      accountId,
      search,
      page = 1,
      limit = 50,
    } = req.query;

    const filter = {};

    if (categoryId) {
      if (!mongoose.Types.ObjectId.isValid(categoryId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid category ID",
        });
      }
      filter.categoryId = categoryId;
    }

    if (accountId) {
      if (!mongoose.Types.ObjectId.isValid(accountId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid account ID",
        });
      }
      filter.accountId = accountId;
    }

    if (fromDate || toDate) {
      filter.expenseDate = {};

      if (fromDate) {
        const start = new Date(fromDate);
        if (Number.isNaN(start.getTime())) {
          return res.status(400).json({
            success: false,
            message: "Invalid start date",
          });
        }
        start.setHours(0, 0, 0, 0);
        filter.expenseDate.$gte = start;
      }

      if (toDate) {
        const end = new Date(toDate);
        if (Number.isNaN(end.getTime())) {
          return res.status(400).json({
            success: false,
            message: "Invalid end date",
          });
        }
        end.setHours(23, 59, 59, 999);
        filter.expenseDate.$lte = end;
      }
    }

    if (search?.trim()) {
      const keyword = search.trim();
      filter.$or = [
        { voucherNumber: { $regex: keyword, $options: "i" } },
        { reference: { $regex: keyword, $options: "i" } },
        { description: { $regex: keyword, $options: "i" } },
        { categoryName: { $regex: keyword, $options: "i" } },
        { accountName: { $regex: keyword, $options: "i" } },
      ];
    }

    const currentPage = Math.max(1, Number(page) || 1);
    const pageLimit = Math.min(100, Math.max(1, Number(limit) || 50));
    const skip = (currentPage - 1) * pageLimit;

    const [expenses, totalExpenses, summary] = await Promise.all([
      Expense.find(filter)
        .sort({ expenseDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(pageLimit)
        .lean(),

      Expense.countDocuments(filter),

      Expense.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: "$amount" },
            totalEntries: { $sum: 1 },
          },
        },
      ]),
    ]);

    res.status(200).json({
      success: true,
      expenses,
      summary: {
        totalAmount: summary[0]?.totalAmount || 0,
        totalEntries: summary[0]?.totalEntries || 0,
      },
      pagination: {
        currentPage,
        totalPages: Math.ceil(totalExpenses / pageLimit),
        totalExpenses,
        limit: pageLimit,
      },
    });
  } catch (error) {
    console.error("EXPENSE HISTORY ERROR:", error);

    res.status(500).json({
      success: false,
      message: error.message || "Failed to load expense history",
    });
  }
});


// ==========================================
// DATE-WISE EXPENSE REPORT
// GET /expenses/date-wise-report
// ==========================================

router.get("/date-wise-report", async (req, res) => {
  try {
    const {
      fromDate,
      toDate,
      categoryId,
      accountId,
    } = req.query;

    const match = {};

    // Date filter
    if (fromDate || toDate) {
      match.expenseDate = {};

      if (fromDate) {
        const start = new Date(fromDate);

        if (Number.isNaN(start.getTime())) {
          return res.status(400).json({
            success: false,
            message: "Invalid start date",
          });
        }

        start.setHours(0, 0, 0, 0);
        match.expenseDate.$gte = start;
      }

      if (toDate) {
        const end = new Date(toDate);

        if (Number.isNaN(end.getTime())) {
          return res.status(400).json({
            success: false,
            message: "Invalid end date",
          });
        }

        end.setHours(23, 59, 59, 999);
        match.expenseDate.$lte = end;
      }
    }

    // Category filter
    if (categoryId) {
      if (!mongoose.Types.ObjectId.isValid(categoryId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid category ID",
        });
      }

      match.categoryId = new mongoose.Types.ObjectId(categoryId);
    }

    // Account filter
    if (accountId) {
      if (!mongoose.Types.ObjectId.isValid(accountId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid account ID",
        });
      }

      match.accountId = new mongoose.Types.ObjectId(accountId);
    }

    const [dailyReport, overallSummary, expenses] = await Promise.all([
      Expense.aggregate([
        { $match: match },
        {
          $group: {
            _id: {
              year: {
                $year: {
                  date: "$expenseDate",
                  timezone: "Asia/Dhaka",
                },
              },
              month: {
                $month: {
                  date: "$expenseDate",
                  timezone: "Asia/Dhaka",
                },
              },
              day: {
                $dayOfMonth: {
                  date: "$expenseDate",
                  timezone: "Asia/Dhaka",
                },
              },
            },
            totalAmount: { $sum: "$amount" },
            totalEntries: { $sum: 1 },
          },
        },
        {
          $sort: {
            "_id.year": -1,
            "_id.month": -1,
            "_id.day": -1,
          },
        },
        {
          $project: {
            _id: 0,
            date: {
              $dateFromParts: {
                year: "$_id.year",
                month: "$_id.month",
                day: "$_id.day",
                timezone: "Asia/Dhaka",
              },
            },
            totalAmount: 1,
            totalEntries: 1,
          },
        },
      ]),

      Expense.aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: "$amount" },
            totalEntries: { $sum: 1 },
          },
        },
      ]),

      Expense.find(match)
        .sort({ expenseDate: -1, createdAt: -1 })
        .lean(),
    ]);

    res.status(200).json({
      success: true,
      dailyReport,
      expenses,
      summary: {
        totalAmount: overallSummary[0]?.totalAmount || 0,
        totalEntries: overallSummary[0]?.totalEntries || 0,
        totalDays: dailyReport.length,
      },
    });
  } catch (error) {
    console.error("DATE-WISE EXPENSE REPORT ERROR:", error);

    res.status(500).json({
      success: false,
      message: error.message || "Failed to load date-wise expense report",
    });
  }
});


// ==========================================
// CATEGORY-WISE EXPENSE REPORT
// GET /expenses/category-wise-report
// ==========================================

router.get("/category-wise-report", async (req, res) => {
  try {
    const { fromDate, toDate, accountId } = req.query;

    const match = {};

    // Date filter
    if (fromDate || toDate) {
      match.expenseDate = {};

      if (fromDate) {
        const start = new Date(fromDate);

        if (Number.isNaN(start.getTime())) {
          return res.status(400).json({
            success: false,
            message: "Invalid start date",
          });
        }

        start.setHours(0, 0, 0, 0);
        match.expenseDate.$gte = start;
      }

      if (toDate) {
        const end = new Date(toDate);

        if (Number.isNaN(end.getTime())) {
          return res.status(400).json({
            success: false,
            message: "Invalid end date",
          });
        }

        end.setHours(23, 59, 59, 999);
        match.expenseDate.$lte = end;
      }
    }

    // Account filter
    if (accountId) {
      if (!mongoose.Types.ObjectId.isValid(accountId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid account ID",
        });
      }

      match.accountId = new mongoose.Types.ObjectId(accountId);
    }

    const [categoryReport, overallSummary, expenses] = await Promise.all([
      Expense.aggregate([
        { $match: match },
        {
          $group: {
            _id: "$categoryId",
            categoryName: { $first: "$categoryName" },
            totalAmount: { $sum: "$amount" },
            totalEntries: { $sum: 1 },
          },
        },
        {
          $sort: {
            totalAmount: -1,
            categoryName: 1,
          },
        },
        {
          $project: {
            _id: 0,
            categoryId: "$_id",
            categoryName: 1,
            totalAmount: 1,
            totalEntries: 1,
          },
        },
      ]),

      Expense.aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: "$amount" },
            totalEntries: { $sum: 1 },
          },
        },
      ]),

      Expense.find(match)
        .sort({ expenseDate: -1, createdAt: -1 })
        .lean(),
    ]);

    res.status(200).json({
      success: true,
      categoryReport,
      expenses,
      summary: {
        totalAmount: overallSummary[0]?.totalAmount || 0,
        totalEntries: overallSummary[0]?.totalEntries || 0,
        totalCategories: categoryReport.length,
      },
    });
  } catch (error) {
    console.error("CATEGORY-WISE EXPENSE REPORT ERROR:", error);

    res.status(500).json({
      success: false,
      message: error.message || "Failed to load category-wise expense report",
    });
  }
});



// ========================================
// EXPENSE PDF REPORT HTML TEMPLATE
// ========================================

function buildExpensePDFHTML({
  title,
  subtitle,
  summary,
  summaryHeaders,
  summaryRows,
  detailHeaders,
  detailRows,
  totalAmount = 0,
  totalLabel = "GRAND TOTAL",
}) {
  const summaryHTML = summaryRows.length
    ? summaryRows
        .map(
          (row) => `
            <tr>
              ${row
                .map(
                  (cell) => `<td>${escapeHTML(cell)}</td>`
                )
                .join("")}
            </tr>
          `
        )
        .join("")
    : `<tr><td colspan="${summaryHeaders.length}" class="empty">No records found</td></tr>`;

  const detailsHTML = detailRows.length
    ? detailRows
        .map(
          (row) => `
            <tr>
              ${row
                .map(
                  (cell) => `<td>${escapeHTML(cell)}</td>`
                )
                .join("")}
            </tr>
          `
        )
        .join("")
    : `<tr><td colspan="${detailHeaders.length}" class="empty">No transactions found</td></tr>`;

  const summaryHead = summaryHeaders
    .map((header) => `<th>${escapeHTML(header)}</th>`)
    .join("");

  const detailHead = detailHeaders
    .map((header) => `<th>${escapeHTML(header)}</th>`)
    .join("");

  return `
  <!DOCTYPE html>
  <html lang="bn">
  <head>
    <meta charset="UTF-8" />
    <title>${escapeHTML(title)}</title>

    <style>
      * {
        box-sizing: border-box;
      }

      body {
        color: #1f2937;
        font-size: 10px;
        margin: 0;
        line-height: 1.6;
      }

      .header {
        text-align: center;
        border-bottom: 2px solid #f97316;
        padding-bottom: 12px;
        margin-bottom: 15px;
      }

      .header h1 {
        margin: 0;
        font-size: 23px;
        color: #111827;
      }

      .header p {
        margin: 4px 0 0;
        color: #64748b;
        font-size: 11px;
      }

      .summary {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 10px;
        margin: 14px 0 20px;
      }

      .summary-card {
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        padding: 10px;
        background: #f8fafc;
      }

      .summary-card .label {
        color: #64748b;
        font-size: 9px;
      }

      .summary-card .value {
        font-size: 16px;
        font-weight: bold;
        color: #111827;
        margin-top: 3px;
      }

      h2 {
        font-size: 14px;
        margin: 20px 0 8px;
        color: #111827;
      }

      table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 15px;
        table-layout: auto;
      }

      th {
        background: #1f2937;
        color: #ffffff;
        font-weight: bold;
        text-align: left;
      }

      th, td {
        border: 1px solid #dbe2ea;
        padding: 6px 7px;
        vertical-align: top;
        overflow-wrap: anywhere;
      }

      tbody tr:nth-child(even) {
        background: #f8fafc;
      }

      .empty {
        text-align: center;
        color: #64748b;
        padding: 14px;
      }

      .footer {
        text-align: center;
        color: #64748b;
        font-size: 9px;
        margin-top: 20px;
        border-top: 1px solid #e2e8f0;
        padding-top: 8px;
      }

      .grand-total {
        font-weight: bold;
        background: #fff7ed !important;
      }

      @page {
        size: A4 landscape;
      }

      thead {
        display: table-header-group;
      }

      tr {
        page-break-inside: avoid;
      }
    </style>
  </head>

  <body>
    <div class="header">
      <h1>${escapeHTML(title)}</h1>
      <p>${escapeHTML(subtitle)}</p>
      <p>Generated: ${escapeHTML(
        new Date().toLocaleString("en-GB", {
          timeZone: "Asia/Dhaka",
        })
      )}</p>
    </div>

    <div class="summary">
      ${summary
        .map(
          (item) => `
            <div class="summary-card">
              <div class="label">${escapeHTML(item.label)}</div>
              <div class="value">${escapeHTML(item.value)}</div>
            </div>
          `
        )
        .join("")}
    </div>

    <h2>SUMMARY REPORT</h2>

    <table>
      <thead>
        <tr>${summaryHead}</tr>
      </thead>
      <tbody>${summaryHTML}</tbody>
    </table>

    <h2>EXPENSE TRANSACTION DETAILS</h2>

    <table>
      <thead>
        <tr>${detailHead}</tr>
      </thead>
      <tbody>
        ${detailsHTML}
        <tr class="grand-total">
          <td colspan="${Math.max(1, detailHeaders.length - 1)}">
            ${escapeHTML(totalLabel)}
          </td>
<td>${escapeHTML(formatPDFMoney(totalAmount))}</td>
        </tr>
      </tbody>
    </table>

    <div class="footer">
      Expense Management Report
    </div>
  </body>
  </html>
  `;
}


// ========================================
// COMMON EXPENSE REPORT FILTER
// ========================================

function buildExpenseReportMatch(query, includeCategory = false) {
  const {
    fromDate,
    toDate,
    categoryId,
    accountId,
  } = query;

  const match = {};

  if (fromDate || toDate) {
    match.expenseDate = {};

    if (fromDate) {
      const start = new Date(fromDate);

      if (Number.isNaN(start.getTime())) {
        throw new Error("Invalid start date");
      }

      start.setHours(0, 0, 0, 0);
      match.expenseDate.$gte = start;
    }

    if (toDate) {
      const end = new Date(toDate);

      if (Number.isNaN(end.getTime())) {
        throw new Error("Invalid end date");
      }

      end.setHours(23, 59, 59, 999);
      match.expenseDate.$lte = end;
    }
  }

  if (includeCategory && categoryId) {
    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      throw new Error("Invalid category ID");
    }

    match.categoryId = new mongoose.Types.ObjectId(categoryId);
  }

  if (accountId) {
    if (!mongoose.Types.ObjectId.isValid(accountId)) {
      throw new Error("Invalid account ID");
    }

    match.accountId = new mongoose.Types.ObjectId(accountId);
  }

  return match;
}


// ========================================
// DATE-WISE EXPENSE PDF
// GET /api/expenses/date-wise-report/pdf
// ========================================

router.get("/date-wise-report/pdf", async (req, res) => {
  try {
    const match = buildExpenseReportMatch(req.query, true);

    const [dailyReport, expenses, overallSummary] =
      await Promise.all([
        Expense.aggregate([
          { $match: match },
          {
            $group: {
              _id: {
                year: {
                  $year: {
                    date: "$expenseDate",
                    timezone: "Asia/Dhaka",
                  },
                },
                month: {
                  $month: {
                    date: "$expenseDate",
                    timezone: "Asia/Dhaka",
                  },
                },
                day: {
                  $dayOfMonth: {
                    date: "$expenseDate",
                    timezone: "Asia/Dhaka",
                  },
                },
              },
              totalAmount: { $sum: "$amount" },
              totalEntries: { $sum: 1 },
            },
          },
          {
            $sort: {
              "_id.year": -1,
              "_id.month": -1,
              "_id.day": -1,
            },
          },
          {
            $project: {
              _id: 0,
              date: {
                $dateFromParts: {
                  year: "$_id.year",
                  month: "$_id.month",
                  day: "$_id.day",
                  timezone: "Asia/Dhaka",
                },
              },
              totalAmount: 1,
              totalEntries: 1,
            },
          },
        ]),

        Expense.find(match)
          .sort({ expenseDate: -1, createdAt: -1 })
          .lean(),

        Expense.aggregate([
          { $match: match },
          {
            $group: {
              _id: null,
              totalAmount: { $sum: "$amount" },
              totalEntries: { $sum: 1 },
            },
          },
        ]),
      ]);

    const totalAmount = overallSummary[0]?.totalAmount || 0;
    const totalEntries = overallSummary[0]?.totalEntries || 0;

    // Daily Summary Rows
    const summaryRows = dailyReport.map((item) => [
      formatPDFDate(item.date),
      item.totalEntries,
      formatPDFMoney(item.totalAmount),
    ]);

    // Expense Details
    const detailRows = expenses.map((item) => [
      formatPDFDate(item.expenseDate),
      item.voucherNumber || "-",
      item.categoryName || "-",
      item.accountName || "-",
      formatPDFMoney(item.amount),
      item.reference || "-",
      item.description || "-",
    ]);

    // IMPORTANT: Generate HTML before generating PDF
    const html = buildExpensePDFHTML({
      title: "Date-wise Expense Report",
      subtitle: "Daily Expense Summary & Transaction Details",

      summary: [
        {
          label: "Total Expense (BDT)",
          value: formatPDFMoney(totalAmount),
        },
        {
          label: "Total Entries",
          value: totalEntries,
        },
        {
          label: "Expense Days",
          value: dailyReport.length,
        },
        {
          label: "Report Type",
          value: "Date-wise",
        },
      ],

      summaryHeaders: [
        "Date",
        "Total Entries",
        "Total Amount (BDT)",
      ],

      summaryRows,

      detailHeaders: [
        "Date",
        "Voucher No.",
        "Category",
        "Account",
        "Amount (BDT)",
        "Reference",
        "Description",
      ],

      detailRows,
      totalAmount,
    });

    const pdfBuffer = await generateExpensePDF(html);

    const filename = `date-wise-expense-${Date.now()}.pdf`;

    res.setHeader("Content-Type", "application/pdf");

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename}"`
    );

    return res.send(pdfBuffer);

  } catch (error) {
    console.error("DATE-WISE EXPENSE PDF ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to generate date-wise PDF",
    });
  }
});



// ========================================
// CATEGORY-WISE EXPENSE PDF
// GET /api/expenses/category-wise-report/pdf
// ========================================

router.get("/category-wise-report/pdf", async (req, res) => {
  try {
    const match = buildExpenseReportMatch(req.query, false);

    const [categoryReport, expenses, overallSummary] =
      await Promise.all([
        Expense.aggregate([
          { $match: match },
          {
            $group: {
              _id: "$categoryId",
              categoryName: { $first: "$categoryName" },
              totalAmount: { $sum: "$amount" },
              totalEntries: { $sum: 1 },
            },
          },
          {
            $sort: {
              totalAmount: -1,
              categoryName: 1,
            },
          },
          {
            $project: {
              _id: 0,
              categoryId: "$_id",
              categoryName: 1,
              totalAmount: 1,
              totalEntries: 1,
            },
          },
        ]),

        Expense.find(match)
          .sort({ expenseDate: -1, createdAt: -1 })
          .lean(),

        Expense.aggregate([
          { $match: match },
          {
            $group: {
              _id: null,
              totalAmount: { $sum: "$amount" },
              totalEntries: { $sum: 1 },
            },
          },
        ]),
      ]);

    const totalAmount = overallSummary[0]?.totalAmount || 0;
    const totalEntries = overallSummary[0]?.totalEntries || 0;

    const summaryRows = categoryReport.map((item) => {
      const share = totalAmount > 0
        ? (item.totalAmount / totalAmount) * 100
        : 0;

      return [
        item.categoryName || "-",
        item.totalEntries,
        formatPDFMoney(item.totalAmount),
        `${share.toFixed(1)}%`,
      ];
    });

    const detailRows = expenses.map((item) => [
      item.categoryName || "-",
      formatPDFDate(item.expenseDate),
      item.voucherNumber || "-",
      item.accountName || "-",
      formatPDFMoney(item.amount),
      item.reference || "-",
      item.description || "-",
    ]);

    const html = buildExpensePDFHTML({
      title: "Category-wise Expense Report",
      subtitle: "Category Summary & Transaction Details",
      summary: [
        { label: "Total Expense (BDT)", value: formatPDFMoney(totalAmount) },
        { label: "Total Entries", value: totalEntries },
        { label: "Total Categories", value: categoryReport.length },
        { label: "Report Type", value: "Category-wise" },
      ],
      summaryHeaders: [
        "Category",
        "Total Entries",
        "Total Amount (BDT)",
        "Expense Share",
      ],
      summaryRows,
      detailHeaders: [
        "Category",
        "Date",
        "Voucher No.",
        "Account",
        "Amount (BDT)",
        "Reference",
        "Description",
      ],
      detailRows,
      totalAmount,
    });

    const pdfBuffer = await generateExpensePDF(html);

    const filename = `category-wise-expense-${Date.now()}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename}"`
    );

    return res.send(pdfBuffer);
  } catch (error) {
    console.error("CATEGORY-WISE EXPENSE PDF ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to generate category-wise PDF",
    });
  }
});


// ========================================
// EDIT EXPENSE WITH CORRECTION HISTORY
// PUT /api/expenses/:id
// ========================================
router.put("/:id", async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const { id } = req.params;

    const {
      expenseDate,
      categoryId,
      accountId,
      amount,
      voucherNumber,
      reference,
      description,
      reason,
    } = req.body;

    // Validate Expense ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Expense ID",
      });
    }

    // Validate Category and Account
    if (
      !mongoose.Types.ObjectId.isValid(categoryId) ||
      !mongoose.Types.ObjectId.isValid(accountId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid Category and Account are required",
      });
    }

    // Validate Amount
    const expenseAmount = Number(amount);

    if (!Number.isFinite(expenseAmount) || expenseAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Expense amount must be greater than zero",
      });
    }

    // Validate Reason
    if (!reason?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Expense correction reason is required",
      });
    }

    // Validate Date
    const date = new Date(expenseDate);

    if (Number.isNaN(date.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid Expense Date",
      });
    }

    const adminInfo = {
      adminId: req.admin?.adminId || null,
      name: req.admin?.name || "",
      username: req.admin?.username || "",
    };

    let updatedExpense = null;

    await session.withTransaction(async () => {
      // Find existing expense
      let expense = await Expense.findById(id).session(session);

      if (!expense) {
        throw new Error("Expense not found");
      }

      // Lock expense to prevent simultaneous edits
      const expenseLock = await Expense.updateOne(
        {
          _id: expense._id,
          __v: expense.__v,
        },
        {
          $inc: { __v: 1 },
        },
        { session }
      );

      if (expenseLock.modifiedCount !== 1) {
        throw new Error(
          "Expense is being updated by another user. Please try again."
        );
      }

      expense = await Expense.findById(id).session(session);

      // Find active category
      const category = await ExpenseCategory.findOne({
        _id: categoryId,
        isActive: true,
      }).session(session);

      if (!category) {
        throw new Error("Expense Category not found or inactive");
      }

      // Find active new account
      const newAccount = await Account.findOne({
        _id: accountId,
        isActive: true,
      }).session(session);

      if (!newAccount) {
        throw new Error("Account not found or inactive");
      }

      // Find old account
      const oldAccount = await Account.findById(
        expense.accountId
      ).session(session);

      if (!oldAccount) {
        throw new Error("Original expense account not found");
      }

      // Lock accounts in a consistent order
      const accounts = [oldAccount, newAccount].filter(
        (account, index, array) =>
          array.findIndex(
            (item) => item._id.toString() === account._id.toString()
          ) === index
      );

      accounts.sort((a, b) =>
        a._id.toString().localeCompare(b._id.toString())
      );

      for (const account of accounts) {
        await lockAccount(account, session);
      }

      // Save previous data for correction history
      const previousData = {
        expenseDate: expense.expenseDate,
        categoryId: expense.categoryId,
        categoryName: expense.categoryName,
        accountId: expense.accountId,
        accountName: expense.accountName,
        accountType: expense.accountType,
        amount: expense.amount,
        voucherNumber: expense.voucherNumber,
        reference: expense.reference,
        description: expense.description,
        ledgerId: expense.ledgerId,
      };

      // Find and void original ledger entry
      if (expense.ledgerId) {
        const oldLedger = await AccountLedger.findOne({
          _id: expense.ledgerId,
          accountId: expense.accountId,
          transactionType: "EXPENSE",
          isVoided: { $ne: true },
        }).session(session);

        if (!oldLedger) {
          throw new Error(
            "Original expense ledger entry not found or already voided"
          );
        }

        oldLedger.isVoided = true;
        oldLedger.voidedAt = new Date();
        oldLedger.voidReason = reason.trim();

        await oldLedger.save({ session });
      } else {
        throw new Error(
          "Original expense has no linked ledger entry. Cannot safely edit."
        );
      }

      // Check available balance after reversing old expense
      const currentBalance = await getAccountBalance(
        newAccount._id,
        session
      );

      if (expenseAmount > currentBalance) {
        throw new Error(
          `Insufficient balance. Available balance: ${currentBalance}`
        );
      }

      // Create replacement ledger entry
      const newLedgerEntries = await AccountLedger.create(
        [
          {
            accountId: newAccount._id,
            transactionType: "EXPENSE",
            direction: "OUT",
            amount: expenseAmount,
            transactionDate: date,
            reference: reference?.trim() || "",
            transactionId: `EXP-${expense._id}`,
            description:
              `Expense: ${category.name}` +
              (description?.trim()
                ? ` - ${description.trim()}`
                : ""),
            createdBy: adminInfo,
          },
        ],
        { session }
      );

      // Add correction history
      expense.editHistory.push({
        editedAt: new Date(),
        editedBy: adminInfo,
        previousData,
        reason: reason.trim(),
      });

      // Update expense
      expense.expenseDate = date;
      expense.categoryId = category._id;
      expense.categoryName = category.name;

      expense.accountId = newAccount._id;
      expense.accountName = newAccount.accountName;
      expense.accountType = newAccount.accountType;

      expense.amount = expenseAmount;
      expense.voucherNumber = voucherNumber?.trim() || "";
      expense.reference = reference?.trim() || "";
      expense.description = description?.trim() || "";

      expense.ledgerId = newLedgerEntries[0]._id;
      expense.updatedBy = adminInfo;

      await expense.save({ session });

      updatedExpense = expense;
    });

    return res.status(200).json({
      success: true,
      message: "Expense updated successfully",
      data: updatedExpense,
    });
  } catch (error) {
    console.error("EDIT EXPENSE ERROR:", error);

    return res.status(400).json({
      success: false,
      message: error.message || "Failed to update Expense",
    });
  } finally {
    await session.endSession();
  }
});


 // ========================================
 // GET EXPENSE CORRECTION HISTORY
 // GET /api/expenses/:id/correction-history
 // ========================================
router.get("/:id/correction-history", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Expense ID",
      });
    }

    const expense = await Expense.findById(id)
      .select(
        "voucherNumber categoryName accountName amount editHistory createdBy updatedBy createdAt updatedAt"
      )
      .lean();

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: "Expense not found",
      });
    }

    const history = (expense.editHistory || [])
      .slice()
      .reverse();

    return res.status(200).json({
      success: true,
      expense: {
        _id: expense._id,
        voucherNumber: expense.voucherNumber,
        categoryName: expense.categoryName,
        accountName: expense.accountName,
        amount: expense.amount,
        createdBy: expense.createdBy,
        updatedBy: expense.updatedBy,
        createdAt: expense.createdAt,
        updatedAt: expense.updatedAt,
      },
      totalCorrections: history.length,
      history,
    });
  } catch (error) {
    console.error("EXPENSE CORRECTION HISTORY ERROR:", error);

    return res.status(500).json({
      success: false,
      message:
        error.message || "Failed to load expense correction history",
    });
  }
});

export default router;
