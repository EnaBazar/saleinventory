
import express from "express";
import mongoose from "mongoose";

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import LoanProvider from "../models/LoanProvider.js";
import LoanTransaction from "../models/LoanTransaction.js";
import puppeteer from "puppeteer";




const router = express.Router();

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

// ========================================
// HELPERS
// ========================================

function parseBangladeshDate(value, endOfDay = false) {
  if (!value) return null;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const time = endOfDay ? "23:59:59.999" : "00:00:00.000";
  const date = new Date(`${value}T${time}+06:00`);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function formatDate(date) {
  if (!date) return "-";

  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Dhaka",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(date));
}

function money(value) {
  return `৳ ${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function safeText(value) {
  return String(value ?? "").trim() || "-";
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[char]);
}

// ========================================
// PDF ROUTE
// ========================================

router.get("/:providerId/statement.pdf", async (req, res) => {
  let browser = null;

  try {
    const { providerId } = req.params;
    const { fromDate, toDate } = req.query;

    if (!mongoose.Types.ObjectId.isValid(providerId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid loan provider ID",
      });
    }

    if (
      !fs.existsSync(bengaliFontPath) ||
      !fs.existsSync(englishFontPath)
    ) {
      return res.status(500).json({
        success: false,
        message: "PDF font file not found",
      });
    }

    const startDate = fromDate
      ? parseBangladeshDate(fromDate)
      : new Date("2000-01-01T00:00:00+06:00");

    const endDate = toDate
      ? parseBangladeshDate(toDate, true)
      : new Date("2100-12-31T23:59:59.999+06:00");

    if (!startDate || !endDate || startDate > endDate) {
      return res.status(400).json({
        success: false,
        message: "Invalid statement date range",
      });
    }

    const provider = await LoanProvider.findById(providerId).lean();

    if (!provider) {
      return res.status(404).json({
        success: false,
        message: "Loan provider not found",
      });
    }

    const openingBalance = Number(provider.openingBalance || 0);

    const openingBalanceDate = provider.openingBalanceDate
      ? new Date(provider.openingBalanceDate)
      : new Date(0);

    // Opening balance effective within the selected period.
    const openingBalanceInPeriod =
      openingBalanceDate > startDate &&
      openingBalanceDate <= endDate
        ? openingBalance
        : 0;

    // Opening outstanding at the beginning of the period.
    let openingOutstanding =
      openingBalanceDate <= startDate ? openingBalance : 0;

    const transactions = await LoanTransaction.find({
      providerId: provider._id,
      transactionDate: { $lte: endDate },
    })
      .populate("accountId", "accountName accountType bankName")
      .sort({ transactionDate: 1, createdAt: 1 })
      .lean();

    let periodReceived = 0;
    let periodPrincipalRepaid = 0;
    let periodInterestPaid = 0;

    const periodTransactions = [];

    for (const transaction of transactions) {
      const transactionDate = new Date(transaction.transactionDate);

      if (transactionDate < openingBalanceDate) {
        continue;
      }

      const isVoided = transaction.isVoided === true;
      const isBeforePeriod = transactionDate < startDate;

      if (isBeforePeriod && !isVoided) {
        if (transaction.transactionType === "RECEIVED") {
          openingOutstanding += Number(
            transaction.principalAmount || 0
          );
        }

        if (transaction.transactionType === "REPAYMENT") {
          openingOutstanding -= Number(
            transaction.principalAmount || 0
          );
        }
      }

      if (!isBeforePeriod) {
        periodTransactions.push(transaction);

        if (!isVoided) {
          if (transaction.transactionType === "RECEIVED") {
            periodReceived += Number(
              transaction.principalAmount || 0
            );
          }

          if (transaction.transactionType === "REPAYMENT") {
            periodPrincipalRepaid += Number(
              transaction.principalAmount || 0
            );

            periodInterestPaid += Number(
              transaction.interestAmount || 0
            );
          }
        }
      }
    }

    const closingOutstanding =
      openingOutstanding +
      openingBalanceInPeriod +
      periodReceived -
      periodPrincipalRepaid;

    // Add opening balance as a statement entry if it falls in the period.
    const statementRows = [...periodTransactions];

    if (openingBalanceInPeriod > 0) {
      statementRows.push({
        transactionType: "OPENING_BALANCE",
        principalAmount: openingBalanceInPeriod,
        interestAmount: 0,
        transactionDate: openingBalanceDate,
        description: "প্রাথমিক ঋণ",
        accountId: null,
        isVoided: false,
        isOpeningBalance: true,
      });
    }

    statementRows.sort(
      (a, b) =>
        new Date(a.transactionDate) - new Date(b.transactionDate)
    );

    // ========================================
    // FONT EMBEDDING
    // ========================================

    const bengaliFont = fs.readFileSync(bengaliFontPath).toString("base64");
    const englishFont = fs.readFileSync(englishFontPath).toString("base64");

    // ========================================
    // PROVIDER DETAILS
    // ========================================

    const details = [
      ["নাম", safeText(provider.providerName)],
      [
        "ধরন",
        provider.providerType === "BANK"
          ? "ব্যাংক ঋণ"
          : "ব্যক্তিগত ঋণ",
      ],
      ["মোবাইল", safeText(provider.mobile)],
      ["ঠিকানা", safeText(provider.address)],
    ];

    if (provider.providerType === "BANK") {
      details.push(
        ["ব্যাংকের নাম", safeText(provider.bankName)],
        ["অ্যাকাউন্ট নম্বর", safeText(provider.accountNumber)],
        ["শাখা", safeText(provider.branchName)]
      );
    }

    const detailHtml = details.map(([label, value]) => `
      <div class="detail-row">
        <span class="detail-label">${escapeHtml(label)}</span>
        <span class="detail-value">${escapeHtml(value)}</span>
      </div>
    `).join("");

    // ========================================
    // SUMMARY
    // ========================================

    const summaryRows = [
      ["প্রাথমিক ঋণ", money(openingBalance)],
      ["সময়ের শুরুতে বকেয়া", money(openingOutstanding)],
      ...(openingBalanceInPeriod > 0
        ? [["এই সময়ে যুক্ত প্রাথমিক ঋণ", money(openingBalanceInPeriod)]]
        : []),
      ["এই সময়ে ঋণ গ্রহণ", money(periodReceived)],
      ["মূল ঋণ পরিশোধ", money(periodPrincipalRepaid)],
      ["সুদ পরিশোধ", money(periodInterestPaid)],
      ["সময়ের শেষে বকেয়া", money(closingOutstanding)],
    ];

    const summaryHtml = summaryRows.map(([label, value], index) => `
      <div class="summary-row ${index === summaryRows.length - 1 ? "total-row" : ""}">
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(value)}</strong>
      </div>
    `).join("");

    // ========================================
    // TRANSACTION TABLE
    // ========================================

    const transactionHtml = statementRows.length
      ? statementRows.map((transaction) => {
          const isVoided = transaction.isVoided === true;
          const isReceived =
            transaction.transactionType === "RECEIVED" ||
            transaction.transactionType === "OPENING_BALANCE";

          const description = transaction.description ||
            (isReceived ? "ঋণ গ্রহণ" : "ঋণ পরিশোধ");

          const accountName =
            transaction.accountId?.accountName || "-";

          return `
            <tr class="${isVoided ? "voided-row" : ""}">
              <td>${escapeHtml(formatDate(transaction.transactionDate))}</td>
              <td>
                <div>${escapeHtml(description)}</div>
                <small>${escapeHtml(accountName)}</small>
              </td>
              <td class="amount">${isReceived ? escapeHtml(money(transaction.principalAmount)) : "-"}</td>
              <td class="amount">${!isReceived ? escapeHtml(money(transaction.principalAmount)) : "-"}</td>
              <td class="amount">${Number(transaction.interestAmount || 0) > 0
                ? escapeHtml(money(transaction.interestAmount))
                : "-"}</td>
              <td>${isVoided ? "বাতিল" : "কার্যকর"}</td>
            </tr>
          `;
        }).join("")
      : `
        <tr>
          <td colspan="6" class="empty-row">
            এই সময়সীমায় কোনো লেনদেন পাওয়া যায়নি।
          </td>
        </tr>
      `;

    // ========================================
    // HTML DOCUMENT
    // ========================================

    const html = `
      <!DOCTYPE html>
      <html lang="bn">
      <head>
        <meta charset="UTF-8">

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

          * {
            box-sizing: border-box;
          }

          body {
            font-family: "NotoBengali", "Roboto", sans-serif;
            color: #1e293b;
            font-size: 11px;
            line-height: 1.8;
          }

          .header {
            text-align: center;
            padding-bottom: 15px;
            border-bottom: 1px solid #d1d5db;
            margin-bottom: 22px;
          }

          .brand {
            color: #ea580c;
            font-size: 25px;
            font-weight: bold;
          }

          .title {
            font-size: 19px;
            margin-top: 5px;
            color: #111827;
          }

          .subtitle {
            font-family: "Roboto", sans-serif;
            font-size: 11px;
            color: #64748b;
            letter-spacing: 1px;
          }

          .section-title {
            font-size: 14px;
            font-weight: bold;
            color: #111827;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 6px;
            margin: 18px 0 10px;
          }

          .detail-row {
            display: flex;
            padding: 3px 0;
          }

          .detail-label {
            width: 145px;
            color: #64748b;
          }

          .detail-value {
            flex: 1;
            color: #1e293b;
          }

          .period {
            color: #475569;
            line-height: 2;
          }

          .summary {
            border: 1px solid #e2e8f0;
            border-radius: 7px;
            padding: 10px 15px;
          }

          .summary-row {
            display: flex;
            justify-content: space-between;
            padding: 5px 0;
            border-bottom: 1px solid #f1f5f9;
          }

          .summary-row strong {
            font-family: "Roboto", sans-serif;
            font-weight: normal;
            min-width: 150px;
            text-align: right;
          }

          .total-row {
            color: #ea580c;
            font-weight: bold;
            border-bottom: none;
            border-top: 1px solid #e2e8f0;
            margin-top: 5px;
            padding-top: 10px;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 9px;
          }

          thead {
            display: table-header-group;
          }

          th {
            background: #f1f5f9;
            color: #334155;
            font-weight: bold;
            padding: 9px 5px;
            text-align: left;
          }

          td {
            padding: 9px 5px;
            border-bottom: 1px solid #e2e8f0;
            vertical-align: top;
          }

          td small {
            display: block;
            color: #64748b;
            font-family: "Roboto", sans-serif;
            font-size: 8px;
          }

          .amount {
            text-align: right;
            font-family: "Roboto", sans-serif;
            white-space: nowrap;
          }

          .voided-row {
            color: #dc2626;
          }

          .empty-row {
            text-align: center;
            padding: 20px;
            color: #64748b;
          }

          .note {
            margin-top: 25px;
            padding: 12px;
            background: #f8fafc;
            color: #64748b;
            font-size: 9px;
            line-height: 1.9;
          }

          .prepared {
            margin-top: 15px;
            text-align: right;
            color: #64748b;
            font-size: 9px;
          }

          @page {
            size: A4;
            margin: 35px 35px 40px 35px;
          }
        </style>
      </head>

      <body>

        <div class="header">
          <div class="brand">ইনা বাজার</div>
          <div class="title">ঋণ হিসাব বিবরণী</div>
          <div class="subtitle">LOAN STATEMENT</div>
        </div>

        <div class="section-title">ঋণ প্রদানকারীর তথ্য</div>
        ${detailHtml}

        <div class="section-title">বিবরণীর সময়সীমা</div>

        <div class="period">
          শুরুর তারিখ: ${escapeHtml(formatDate(startDate))}<br>
          শেষের তারিখ: ${escapeHtml(formatDate(endDate))}<br>
          প্রারম্ভিক ঋণের তারিখ: ${escapeHtml(formatDate(provider.openingBalanceDate))}
        </div>

        <div class="section-title">ঋণের সারসংক্ষেপ</div>
        <div class="summary">
          ${summaryHtml}
        </div>

        <div class="section-title">লেনদেনের বিবরণ</div>

        <table>
          <thead>
            <tr>
              <th style="width: 13%">তারিখ</th>
              <th style="width: 24%">বিবরণ</th>
              <th style="width: 16%; text-align:right">গ্রহণ</th>
              <th style="width: 16%; text-align:right">পরিশোধ</th>
              <th style="width: 13%; text-align:right">সুদ</th>
              <th style="width: 18%">অবস্থা</th>
            </tr>
          </thead>

          <tbody>
            ${transactionHtml}
          </tbody>
        </table>

        <div class="note">
          দ্রষ্টব্য: বাতিল লেনদেন প্রদর্শিত হলেও ঋণের বকেয়া হিসাবে অন্তর্ভুক্ত নয়।
          ব্যক্তিগত ঋণের সুদ মূল ঋণের বকেয়া কমায় না।
        </div>

        <div class="prepared">
          প্রস্তুতের তারিখ: ${escapeHtml(formatDate(new Date()))}
        </div>

      </body>
      </html>
    `;

    // ========================================
    // GENERATE PDF USING CHROMIUM
    // ========================================

   browser = await puppeteer.launch({
  executablePath:
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  headless: true,
  args: [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-gpu"
  ]
});

    const page = await browser.newPage();

    await page.setContent(html, {
      waitUntil: "networkidle0",
    });

    await page.evaluate(async () => {
      await document.fonts.ready;
    });

    const pdfBuffer = await page.pdf({
      format: "A4",
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

    await browser.close();
    browser = null;

    const safeFilename = `Loan-Statement-${String(
      provider.providerName || "Provider"
    ).replace(/[^a-zA-Z0-9-]/g, "-")}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${safeFilename}"`
    );

    res.setHeader("Content-Length", pdfBuffer.length);

    return res.end(pdfBuffer);

  } catch (error) {
    console.error("LOAN STATEMENT ERROR:", error);

    if (browser) {
      try {
        await browser.close();
      } catch (closeError) {
        console.error("BROWSER CLOSE ERROR:", closeError);
      }
    }

    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to generate loan statement",
      });
    }

    if (!res.destroyed && !res.writableEnded) {
      res.destroy();
    }
  }
});

export default router;
