import React, { useCallback, useEffect, useMemo, useState } from "react";

const API = "http://localhost:5000/api";

const todayISO = () => {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};

const monthStart = () => {
  const today = todayISO();
  return `${today.slice(0, 7)}-01`;
};

const yearStart = () => `${todayISO().slice(0, 4)}-01-01`;

const money = (value) =>
  `৳ ${Number(value || 0).toLocaleString("en-BD", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const number = (value) =>
  Number(value || 0).toLocaleString("en-BD", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const dateText = (value) => {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const cardStyle = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  padding: 18,
  minWidth: 0,
};

const sectionStyle = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  padding: 18,
  marginTop: 18,
};

const inputStyle = {
  width: "100%",
  minWidth: 0,
  padding: "10px 12px",
  border: "1px solid #d1d5db",
  borderRadius: 8,
  outline: "none",
  background: "#fff",
  color: "#111827",
  boxSizing: "border-box",
};

const buttonStyle = {
  border: "none",
  borderRadius: 8,
  padding: "10px 15px",
  background: "#f97316",
  color: "#fff",
  cursor: "pointer",
  fontWeight: 600,
};

const secondaryButtonStyle = {
  border: "1px solid #d1d5db",
  borderRadius: 8,
  padding: "9px 13px",
  background: "#fff",
  color: "#374151",
  cursor: "pointer",
  fontWeight: 600,
};

function SummaryCard({ title, value, subtitle, color = "#111827" }) {
  return (
    <div style={cardStyle}>
      <div style={{ color: "#6b7280", fontSize: 13, marginBottom: 9 }}>
        {title}
      </div>

      <div
        style={{
          fontSize: 22,
          fontWeight: 750,
          color,
          overflowWrap: "anywhere",
        }}
      >
        {value}
      </div>

      {subtitle ? (
        <div style={{ color: "#9ca3af", fontSize: 12, marginTop: 7 }}>
          {subtitle}
        </div>
      ) : null}
    </div>
  );
}

function InfoRow({ label, value, color = "#111827" }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: 12,
        padding: "10px 0",
        borderBottom: "1px solid #f1f5f9",
      }}
    >
      <span style={{ color: "#6b7280", fontSize: 13 }}>{label}</span>
      <strong
        style={{
          color,
          fontSize: 14,
          textAlign: "right",
          overflowWrap: "anywhere",
        }}
      >
        {value}
      </strong>
    </div>
  );
}

function SectionTitle({ children, right }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 10,
        marginBottom: 14,
      }}
    >
      <h3 style={{ margin: 0, fontSize: 17, color: "#111827" }}>
        {children}
      </h3>
      {right}
    </div>
  );
}

export default function FinancialSummary() {
  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(todayISO);

  const [summary, setSummary] = useState(null);
  const [capitalEntries, setCapitalEntries] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [transactionType, setTransactionType] = useState("CAPITAL_DEPOSIT");
  const [amount, setAmount] = useState("");
  const [accountId, setAccountId] = useState("");
  const [transactionDate, setTransactionDate] = useState(todayISO);
  const [reference, setReference] = useState("");
  const [description, setDescription] = useState("");

  const [voidingId, setVoidingId] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const query = new URLSearchParams({ from, to });

      const [summaryResponse, capitalResponse] = await Promise.all([
        fetch(`${API}/financial-summary?${query.toString()}`, {
          method: "GET",
          credentials: "include",
        }),

        fetch(`${API}/owner-capital`, {
          method: "GET",
          credentials: "include",
        }),
      ]);

      const summaryData = await summaryResponse.json();
      const capitalData = await capitalResponse.json();

      if (!summaryResponse.ok || !summaryData.success) {
        throw new Error(
          summaryData.message || "Financial Summary load করা যায়নি"
        );
      }

      if (!capitalResponse.ok || !capitalData.success) {
        throw new Error(
          capitalData.message || "Owner Capital Ledger load করা যায়নি"
        );
      }

      setSummary(summaryData);
      setCapitalEntries(
        Array.isArray(capitalData.data) ? capitalData.data : []
      );

      const accounts = summaryData.position?.accountSummary || [];

      if (
        !accountId &&
        accounts.length > 0
      ) {
        setAccountId(String(accounts[0].accountId));
      }
    } catch (err) {
      setError(err.message || "তথ্য লোড করতে সমস্যা হয়েছে");
    } finally {
      setLoading(false);
    }
  }, [from, to, accountId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const position = summary?.position || {};
  const profitLoss = summary?.profitLoss || {};
  const ownerCapital = summary?.ownerCapital || {};

  const accounts = position.accountSummary || [];

  const activeCapitalEntries = useMemo(
    () => capitalEntries.filter((entry) => !entry.isVoided),
    [capitalEntries]
  );

  const isProfitable = Number(profitLoss.netProfit || 0) > 0;
  const isLoss = Number(profitLoss.netProfit || 0) < 0;

  const netAssets = Number(position.netAssetsBeforeOwnerCapital || 0);
  const totalLiabilities = Number(position.totalLiabilitiesShown || 0);

  const hasDebt = totalLiabilities > 0;

  const setQuickDate = (type) => {
    const today = todayISO();

    if (type === "TODAY") {
      setFrom(today);
      setTo(today);
    } else if (type === "MONTH") {
      setFrom(monthStart());
      setTo(today);
    } else if (type === "YEAR") {
      setFrom(yearStart());
      setTo(today);
    }
  };

  const submitCapital = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    const numericAmount = Number(amount);

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError("সঠিক Amount লিখুন");
      return;
    }

    if (!transactionDate) {
      setError("Transaction Date নির্বাচন করুন");
      return;
    }

    if (
      transactionType !== "OPENING_CAPITAL" &&
      !accountId
    ) {
      setError("Cash/Bank Account নির্বাচন করুন");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(`${API}/owner-capital`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          transactionType,
          amount: numericAmount,
          accountId:
            transactionType === "OPENING_CAPITAL"
              ? null
              : accountId,
          transactionDate,
          reference,
          description,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Transaction save হয়নি");
      }

      setSuccess(data.message || "Transaction সফলভাবে সংরক্ষণ হয়েছে");
      setAmount("");
      setReference("");
      setDescription("");

      await fetchData();
    } catch (err) {
      setError(err.message || "Transaction save করতে সমস্যা হয়েছে");
    } finally {
      setSaving(false);
    }
  };

  const voidCapitalEntry = async (id) => {
    const confirmed = window.confirm(
      "আপনি কি নিশ্চিত এই Capital Transaction Void করতে চান? সংশ্লিষ্ট Account Ledger-ও Void হবে।"
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");
    setVoidingId(id);

    try {
      const response = await fetch(
        `${API}/owner-capital/${id}/void`,
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            reason: "Voided by admin from Financial Summary",
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Void করা যায়নি");
      }

      setSuccess(data.message || "Transaction Void হয়েছে");
      await fetchData();
    } catch (err) {
      setError(err.message || "Transaction Void করতে সমস্যা হয়েছে");
    } finally {
      setVoidingId("");
    }
  };

  const openingCapitalExists = Number(ownerCapital.openingCapital || 0) > 0;

  if (loading && !summary) {
    return (
      <div style={{ padding: 24, color: "#6b7280" }}>
        Financial Summary লোড হচ্ছে...
      </div>
    );
  }

  return (
    <div
      style={{
        width: "100%",
        padding: "18px",
        boxSizing: "border-box",
        background: "#f8fafc",
        minHeight: "100%",
        color: "#111827",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
          marginBottom: 18,
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: 23, fontWeight: 800 }}>
            Financial Summary
          </h2>
          <p style={{ margin: "6px 0 0", color: "#6b7280", fontSize: 13 }}>
            Business Financial Health & Owner Capital
          </p>
        </div>

        <button
          type="button"
          style={secondaryButtonStyle}
          onClick={fetchData}
          disabled={loading}
        >
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {error ? (
        <div
          style={{
            background: "#fef2f2",
            border: "1px solid #fecaca",
            color: "#b91c1c",
            padding: 12,
            borderRadius: 8,
            marginBottom: 14,
          }}
        >
          {error}
        </div>
      ) : null}

      {success ? (
        <div
          style={{
            background: "#f0fdf4",
            border: "1px solid #bbf7d0",
            color: "#166534",
            padding: 12,
            borderRadius: 8,
            marginBottom: 14,
          }}
        >
          {success}
        </div>
      ) : null}

      {/* Date Filter */}
      <div style={sectionStyle}>
        <SectionTitle>Report Period</SectionTitle>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            marginBottom: 14,
          }}
        >
          <button
            type="button"
            style={secondaryButtonStyle}
            onClick={() => setQuickDate("TODAY")}
          >
            Today
          </button>

          <button
            type="button"
            style={secondaryButtonStyle}
            onClick={() => setQuickDate("MONTH")}
          >
            This Month
          </button>

          <button
            type="button"
            style={secondaryButtonStyle}
            onClick={() => setQuickDate("YEAR")}
          >
            This Year
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 12,
            alignItems: "end",
          }}
        >
          <label style={{ fontSize: 13, color: "#6b7280" }}>
            From Date
            <input
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              style={{ ...inputStyle, marginTop: 6 }}
            />
          </label>

          <label style={{ fontSize: 13, color: "#6b7280" }}>
            To Date
            <input
              type="date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
              style={{ ...inputStyle, marginTop: 6 }}
            />
          </label>

          <button
            type="button"
            style={buttonStyle}
            onClick={fetchData}
            disabled={loading || !from || !to || from > to}
          >
            Apply Date Filter
          </button>
        </div>

        <div style={{ color: "#9ca3af", fontSize: 12, marginTop: 10 }}>
          Report: {dateText(summary?.period?.from)} - {dateText(summary?.period?.to)}
        </div>
      </div>

      {/* Business Health */}
      <div style={{ marginTop: 18 }}>
        <h3 style={{ fontSize: 17, margin: "0 0 12px" }}>
          Business Health
        </h3>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
            gap: 12,
          }}
        >
          <SummaryCard
            title="Net Profit / Loss"
            value={money(profitLoss.netProfit)}
            subtitle={
              isProfitable
                ? "এই সময় ব্যবসা লাভে আছে"
                : isLoss
                  ? "এই সময় ব্যবসায় ক্ষতি হয়েছে"
                  : "এই সময় লাভ বা ক্ষতি নেই"
            }
            color={
              isProfitable
                ? "#15803d"
                : isLoss
                  ? "#dc2626"
                  : "#374151"
            }
          />

          <SummaryCard
            title="Total Assets Shown"
            value={money(position.totalAssetsShown)}
            subtitle="Cash/Bank + Receivable + Own Inventory"
            color="#0369a1"
          />

          <SummaryCard
            title="Total Liabilities Shown"
            value={money(position.totalLiabilitiesShown)}
            subtitle="Supplier Payable + Loan Outstanding"
            color={hasDebt ? "#dc2626" : "#15803d"}
          />

          <SummaryCard
            title="Net Assets"
            value={money(netAssets)}
            subtitle="Assets - Liabilities"
            color={netAssets >= 0 ? "#15803d" : "#dc2626"}
          />
        </div>

        <div
          style={{
            marginTop: 12,
            padding: 14,
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 10,
            display: "flex",
            flexWrap: "wrap",
            gap: 10,
            alignItems: "center",
          }}
        >
          <strong>Business Status:</strong>

          <span
            style={{
              color: isProfitable
                ? "#15803d"
                : isLoss
                  ? "#dc2626"
                  : "#6b7280",
              fontWeight: 700,
            }}
          >
            {isProfitable
              ? "Profitable"
              : isLoss
                ? "Loss"
                : "Break-even"}
          </span>

          <span style={{ color: "#d1d5db" }}>|</span>

          <strong>Debt Status:</strong>

          <span
            style={{
              color: hasDebt ? "#dc2626" : "#15803d",
              fontWeight: 700,
            }}
          >
            {hasDebt ? "Liabilities / Debt আছে" : "দেখানো Liability নেই"}
          </span>
        </div>
      </div>

      {/* Profit & Loss */}
      <div style={sectionStyle}>
        <SectionTitle>Profit & Loss Details</SectionTitle>

        <InfoRow label="OWN Sale Gross Profit (after OWN costs)" value={money(profitLoss.ownGrossProfit)} color="#15803d" />
        <InfoRow label="OWN Share of Other Cost" value={money(profitLoss.ownOtherCost)} />
        <InfoRow label="Sale Commission Income (net of returns)" value={money(profitLoss.saleCommissionIncome)} />
        <InfoRow label="Commission Stock Labour Income (net of returns)" value={money(profitLoss.saleLabourIncome)} />
        <InfoRow label="Commission Share of Other Cost" value={money(profitLoss.commissionShareOtherCost)} />
        <InfoRow label="Commission Share of Discount" value={money(profitLoss.commissionShareDiscount)} />
        <InfoRow label="Supplier Commission Income" value={money(profitLoss.supplierCommissionIncome)} color="#15803d" />
        <InfoRow label="Commission Invoice Costs" value={money(profitLoss.commissionInvoiceCosts)} />
        <InfoRow label="Operating Expenses" value={money(profitLoss.operatingExpenses)} />
        <InfoRow label="Loan Interest Expense" value={money(profitLoss.loanInterestExpense)} />
        <InfoRow label="Sales Other Cost (informational total)" value={money(profitLoss.otherCostPayable)} />
        <InfoRow label="Sales Discount (informational total)" value={money(profitLoss.salesDiscount)} />

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            paddingTop: 15,
            marginTop: 8,
            borderTop: "2px solid #e5e7eb",
            fontWeight: 800,
            fontSize: 17,
          }}
        >
          <span>Net Profit / Loss</span>
          <span
            style={{
              color: Number(profitLoss.netProfit || 0) >= 0
                ? "#15803d"
                : "#dc2626",
            }}
          >
            {money(profitLoss.netProfit)}
          </span>
        </div>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 16,
            color: "#6b7280",
            fontSize: 12,
            marginTop: 14,
          }}
        >
          <span>Sales: {profitLoss.salesCount || 0}</span>
          <span>Returns: {profitLoss.returnsCount || 0}</span>
          <span>Commission Invoices: {profitLoss.commissionInvoiceCount || 0}</span>
          <span>Expenses: {profitLoss.expenseCount || 0}</span>
        </div>
      </div>

      {/* Financial Position */}
      <div style={sectionStyle}>
        <SectionTitle>Financial Position</SectionTitle>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 12,
          }}
        >
          <div style={{ ...cardStyle, background: "#f8fafc" }}>
            <strong style={{ fontSize: 14 }}>Assets</strong>
            <InfoRow label="Cash & Bank" value={money(position.cashAndBank)} />
            <InfoRow label="Customer Receivable" value={money(position.customerReceivable)} />
            <InfoRow label="Own Inventory Value" value={money(position.ownInventoryValue)} />
            <InfoRow label="Total Assets Shown" value={money(position.totalAssetsShown)} color="#0369a1" />
          </div>

          <div style={{ ...cardStyle, background: "#f8fafc" }}>
            <strong style={{ fontSize: 14 }}>Liabilities</strong>
            <InfoRow label="Supplier Payable" value={money(position.supplierPayable)} />
            <InfoRow label="Loan Outstanding" value={money(position.loanOutstanding)} />
            <InfoRow label="Total Liabilities" value={money(position.totalLiabilitiesShown)} color="#dc2626" />
            <InfoRow label="Net Assets" value={money(netAssets)} color={netAssets >= 0 ? "#15803d" : "#dc2626"} />
          </div>
        </div>

        <div style={{ marginTop: 18 }}>
          <SectionTitle>Account-wise Balance</SectionTitle>

          {accounts.length === 0 ? (
            <p style={{ color: "#9ca3af", fontSize: 13 }}>
              কোনো Account পাওয়া যায়নি।
            </p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 400 }}>
                <thead>
                  <tr style={{ background: "#f8fafc", textAlign: "left" }}>
                    <th style={{ padding: 11, fontSize: 13 }}>Account</th>
                    <th style={{ padding: 11, fontSize: 13 }}>Type</th>
                    <th style={{ padding: 11, fontSize: 13, textAlign: "right" }}>Balance</th>
                  </tr>
                </thead>

                <tbody>
                  {accounts.map((account) => (
                    <tr key={account.accountId}>
                      <td style={{ padding: 11, borderTop: "1px solid #e5e7eb" }}>
                        {account.accountName}
                      </td>
                      <td style={{ padding: 11, borderTop: "1px solid #e5e7eb" }}>
                        {account.accountType}
                      </td>
                      <td style={{ padding: 11, borderTop: "1px solid #e5e7eb", textAlign: "right", fontWeight: 700 }}>
                        {money(account.balance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div style={{ marginTop: 18 }}>
          <SectionTitle>Inventory Position</SectionTitle>
          <InfoRow label="Own Inventory Value" value={money(position.ownInventoryValue)} />
          <InfoRow label="Commission Inventory Quantity" value={`${number(position.commissionInventoryKg)} KG`} />
          <p style={{ color: "#9ca3af", fontSize: 12, marginBottom: 0 }}>
            Commission Inventory আপনার মালিকানাধীন সম্পদ নয় বলে এর মূল্য Total Assets-এ যোগ করা হয়নি।
          </p>
        </div>
      </div>

      {/* Owner Capital */}
      <div style={sectionStyle}>
        <SectionTitle>Owner Capital & Withdrawal</SectionTitle>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
            gap: 12,
          }}
        >
          <SummaryCard title="Opening Capital" value={money(ownerCapital.openingCapital)} />
          <SummaryCard title="New Capital Deposits" value={money(ownerCapital.newCapitalContributions)} color="#15803d" />
          <SummaryCard title="Owner Withdrawals" value={money(ownerCapital.ownerWithdrawals)} color="#dc2626" />
          <SummaryCard title="Owner Net Capital" value={money(ownerCapital.ownerNetCapital)} color="#0369a1" />
        </div>

        <p style={{ color: "#6b7280", fontSize: 12, lineHeight: 1.6, marginTop: 12 }}>
          Owner Net Capital = Opening Capital + New Capital Deposits - Owner Withdrawals.
          এটি P&L-এর আয়/খরচ নয়। Opening Capital Cash/Bank-এ দ্বিতীয়বার যোগ হয় না।
          Net Assets এবং Owner Net Capital আলাদা হিসাব।
        </p>

        <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid #e5e7eb" }}>
          <SectionTitle>Add Owner Capital Transaction</SectionTitle>

          <form onSubmit={submitCapital}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
                gap: 12,
              }}
            >
              <label style={{ fontSize: 13, color: "#6b7280" }}>
                Transaction Type
                <select
                  value={transactionType}
                  onChange={(event) => setTransactionType(event.target.value)}
                  style={{ ...inputStyle, marginTop: 6 }}
                >
                  <option value="CAPITAL_DEPOSIT">Capital Deposit</option>
                  <option value="OWNER_WITHDRAWAL">Owner Withdrawal</option>
                  <option
                    value="OPENING_CAPITAL"
                    disabled={openingCapitalExists}
                  >
                    Opening Capital
                  </option>
                </select>
              </label>

              <label style={{ fontSize: 13, color: "#6b7280" }}>
                Amount (৳)
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="Enter amount"
                  style={{ ...inputStyle, marginTop: 6 }}
                  required
                />
              </label>

              {transactionType !== "OPENING_CAPITAL" ? (
                <label style={{ fontSize: 13, color: "#6b7280" }}>
                  Cash / Bank Account
                  <select
                    value={accountId}
                    onChange={(event) => setAccountId(event.target.value)}
                    style={{ ...inputStyle, marginTop: 6 }}
                    required
                  >
                    <option value="">Select Account</option>
                    {accounts.map((account) => (
                      <option
                        key={account.accountId}
                        value={account.accountId}
                      >
                        {account.accountName} ({account.accountType})
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              <label style={{ fontSize: 13, color: "#6b7280" }}>
                Transaction Date
                <input
                  type="date"
                  value={transactionDate}
                  onChange={(event) => setTransactionDate(event.target.value)}
                  style={{ ...inputStyle, marginTop: 6 }}
                  required
                />
              </label>

              <label style={{ fontSize: 13, color: "#6b7280" }}>
                Reference
                <input
                  type="text"
                  value={reference}
                  onChange={(event) => setReference(event.target.value)}
                  placeholder="Optional reference"
                  style={{ ...inputStyle, marginTop: 6 }}
                />
              </label>

              <label style={{ fontSize: 13, color: "#6b7280" }}>
                Description
                <input
                  type="text"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Optional note"
                  style={{ ...inputStyle, marginTop: 6 }}
                />
              </label>
            </div>

            {transactionType === "OPENING_CAPITAL" ? (
              <p style={{ color: "#b45309", fontSize: 12, marginTop: 12 }}>
                Opening Capital শুধু Owner Equity Ledger-এ যোগ হবে। Cash/Bank Account-এর ব্যালেন্স পরিবর্তন হবে না।
              </p>
            ) : transactionType === "CAPITAL_DEPOSIT" ? (
              <p style={{ color: "#15803d", fontSize: 12, marginTop: 12 }}>
                Capital Deposit নির্বাচিত Cash/Bank Account-এর ব্যালেন্স বাড়াবে। এটি Sales Income নয়।
              </p>
            ) : (
              <p style={{ color: "#b91c1c", fontSize: 12, marginTop: 12 }}>
                Owner Withdrawal নির্বাচিত Account-এর ব্যালেন্স কমাবে। পর্যাপ্ত ব্যালেন্স না থাকলে Withdrawal হবে না। এটি Business Expense নয়।
              </p>
            )}

            <button
              type="submit"
              style={{ ...buttonStyle, marginTop: 14 }}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save Capital Transaction"}
            </button>
          </form>
        </div>

        <div style={{ marginTop: 22 }}>
          <SectionTitle>Owner Capital Ledger History</SectionTitle>

          {capitalEntries.length === 0 ? (
            <p style={{ color: "#9ca3af", fontSize: 13 }}>
              এখনো কোনো Owner Capital Transaction নেই।
            </p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  minWidth: 760,
                  borderCollapse: "collapse",
                }}
              >
                <thead>
                  <tr style={{ background: "#f8fafc", textAlign: "left" }}>
                    {["Date", "Type", "Account", "Amount", "Reference", "Status", "Action"].map((title) => (
                      <th key={title} style={{ padding: 11, fontSize: 12, color: "#6b7280" }}>
                        {title}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {capitalEntries.map((entry) => {
                    const typeLabel = {
                      OPENING_CAPITAL: "Opening Capital",
                      CAPITAL_DEPOSIT: "Capital Deposit",
                      OWNER_WITHDRAWAL: "Owner Withdrawal",
                    }[entry.transactionType] || entry.transactionType;

                    const accountName =
                      entry.accountId?.accountName || "-";

                    return (
                      <tr key={entry._id}>
                        <td style={{ padding: 11, borderTop: "1px solid #e5e7eb", fontSize: 13 }}>
                          {dateText(entry.transactionDate)}
                        </td>

                        <td style={{ padding: 11, borderTop: "1px solid #e5e7eb", fontSize: 13 }}>
                          {typeLabel}
                        </td>

                        <td style={{ padding: 11, borderTop: "1px solid #e5e7eb", fontSize: 13 }}>
                          {accountName}
                        </td>

                        <td style={{ padding: 11, borderTop: "1px solid #e5e7eb", fontSize: 13, fontWeight: 700 }}>
                          {money(entry.amount)}
                        </td>

                        <td style={{ padding: 11, borderTop: "1px solid #e5e7eb", fontSize: 13 }}>
                          {entry.reference || "-"}
                        </td>

                        <td style={{ padding: 11, borderTop: "1px solid #e5e7eb", fontSize: 13 }}>
                          <span style={{ color: entry.isVoided ? "#dc2626" : "#15803d", fontWeight: 700 }}>
                            {entry.isVoided ? "VOIDED" : "ACTIVE"}
                          </span>
                        </td>

                        <td style={{ padding: 11, borderTop: "1px solid #e5e7eb" }}>
                          {!entry.isVoided ? (
                            <button
                              type="button"
                              onClick={() => voidCapitalEntry(entry._id)}
                              disabled={voidingId === entry._id}
                              style={{
                                ...secondaryButtonStyle,
                                color: "#dc2626",
                                borderColor: "#fecaca",
                                padding: "6px 10px",
                                fontSize: 12,
                              }}
                            >
                              {voidingId === entry._id ? "Voiding..." : "Void"}
                            </button>
                          ) : (
                            <span style={{ color: "#9ca3af", fontSize: 12 }}>
                              No action
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Report Notes */}
      <div style={sectionStyle}>
        <SectionTitle>Report Information</SectionTitle>

        <InfoRow label="Sales in selected period" value={profitLoss.salesCount || 0} />
        <InfoRow label="Sales Returns" value={profitLoss.returnsCount || 0} />
        <InfoRow label="Stock Out Count" value={summary?.notes?.stockOutCount || 0} />

        <p style={{ color: "#6b7280", fontSize: 12, lineHeight: 1.7, marginBottom: 0 }}>
          {summary?.notes?.stockOutTreatment}
          <br />
          {summary?.notes?.commissionInventoryTreatment}
          <br />
          {summary?.notes?.ownerCapitalTreatment}
          <br />
          {summary?.notes?.netAssetsTreatment}
        </p>
      </div>
    </div>
  );
}
