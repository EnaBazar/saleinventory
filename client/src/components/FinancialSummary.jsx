import React, { useEffect, useState } from "react";

const API = "http://localhost:5000/api";

const money = (value) =>
  `৳ ${Number(value || 0).toLocaleString("en-BD", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const today = new Date();
const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
const dateValue = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

export default function FinancialSummary() {
  const [from, setFrom] = useState(dateValue(firstDay));
  const [to, setTo] = useState(dateValue(today));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadSummary = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `${API}/financial-summary?from=${from}&to=${to}`,
        { credentials: "include" }
      );

      const result = await response.json();

      if (!response.ok || result.success === false) {
        throw new Error(result.message || "Financial Summary লোড করা যায়নি");
      }

      setData(result.data);
    } catch (err) {
      setError(err.message || "ডেটা লোড করতে সমস্যা হয়েছে");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSummary();
  }, []);

  const pl = data?.profitLoss || {};
  const position = data?.position || {};

  const cards = [
    { label: "OWN Product Gross Profit", value: pl.ownGrossProfit, color: "#15803d" },
    { label: "Sale Commission Income", value: pl.saleCommissionIncome, color: "#2563eb" },
    { label: "Supplier Commission Income", value: pl.supplierCommissionIncome, color: "#7c3aed" },
    { label: "Sale Labour Income", value: pl.saleLabourIncome, color: "#0891b2" },
    { label: "Sales Discount", value: pl.salesDiscount, color: "#ea580c" },
    { label: "Commission Invoice Costs", value: pl.commissionInvoiceCosts, color: "#dc2626" },
    { label: "Operating Expenses", value: pl.operatingExpenses, color: "#dc2626" },
    { label: "Loan Interest Expense", value: pl.loanInterestExpense, color: "#dc2626" },
  ];

  const positionCards = [
    { label: "Cash & Bank", value: position.cashAndBank },
    { label: "Customer Receivable", value: position.customerReceivable },
    { label: "Supplier Payable", value: position.supplierPayable },
    { label: "Loan Outstanding", value: position.loanOutstanding },
    { label: "OWN Inventory Value", value: position.ownInventoryValue },
    { label: "Commission Stock (KG)", value: position.commissionInventoryKg, isKg: true },
  ];

  const cardStyle = {
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: 10,
    padding: 16,
    minWidth: 0,
  };

  const headingStyle = {
    fontSize: 17,
    fontWeight: 700,
    color: "#1e293b",
    margin: "0 0 14px",
  };

  return (
    <div style={{ padding: 16, maxWidth: 1500, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, color: "#0f172a", fontSize: 23 }}>Financial Summary</h2>
          <p style={{ margin: "5px 0 0", color: "#64748b", fontSize: 13 }}>
            ব্যবসার আয়, ব্যয়, লাভ-ক্ষতি ও আর্থিক অবস্থার সারসংক্ষেপ
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={{ padding: 9, border: "1px solid #cbd5e1", borderRadius: 7 }} />
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} style={{ padding: 9, border: "1px solid #cbd5e1", borderRadius: 7 }} />
          <button onClick={loadSummary} disabled={loading} style={{ padding: "10px 18px", background: "#f97316", color: "#fff", border: 0, borderRadius: 7, cursor: "pointer", fontWeight: 700 }}>
            {loading ? "লোড হচ্ছে..." : "রিপোর্ট দেখুন"}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: 13, background: "#fef2f2", color: "#b91c1c", border: "1px solid #fecaca", borderRadius: 8, marginBottom: 15 }}>
          {error}
        </div>
      )}

      {loading && !data && <p style={{ color: "#64748b" }}>Financial Summary লোড হচ্ছে...</p>}

      {data && (
        <>
          <div style={{ ...cardStyle, marginBottom: 18, background: "#fff7ed", borderColor: "#fed7aa" }}>
            <div style={{ color: "#9a3412", fontSize: 13, fontWeight: 600 }}>NET PROFIT / LOSS</div>
            <div style={{ fontSize: 30, fontWeight: 800, color: Number(pl.netProfit) >= 0 ? "#15803d" : "#dc2626", marginTop: 5 }}>
              {money(pl.netProfit)}
            </div>
            <div style={{ color: "#64748b", fontSize: 12, marginTop: 5 }}>
              নির্বাচিত সময়ের হিসাব অনুযায়ী
            </div>
          </div>

          <section style={{ marginBottom: 22 }}>
            <h3 style={headingStyle}>Profit & Loss — আয় ও ব্যয়</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 12 }}>
              {cards.map((item) => (
                <div key={item.label} style={cardStyle}>
                  <div style={{ fontSize: 12, color: "#64748b", marginBottom: 9 }}>{item.label}</div>
                  <div style={{ fontSize: 19, fontWeight: 750, color: item.color }}>{money(item.value)}</div>
                </div>
              ))}
            </div>
          </section>

          <section style={{ marginBottom: 22 }}>
            <h3 style={headingStyle}>Other Cost Payable</h3>
            <div style={cardStyle}>
              <div style={{ fontSize: 12, color: "#64748b" }}>নির্বাচিত সময়ে Sales Invoice-এ যোগ হওয়া Other Cost</div>
              <div style={{ fontSize: 22, fontWeight: 750, color: "#c2410c", marginTop: 8 }}>
                {money(pl.otherCostPayable)}
              </div>
              <p style={{ fontSize: 12, color: "#64748b", margin: "8px 0 0" }}>
                এটি ব্যবসার আয় নয় এবং Net Profit-এ যোগ করা হয়নি। Supplier নির্বাচন ও পরিশোধের আলাদা রেকর্ড না থাকায় এটি প্রকৃত বকেয়া ব্যালেন্স নয়; শুধু এই সময়ে যোগ হওয়া মোট পরিমাণ।
              </p>
            </div>
          </section>

          <section style={{ marginBottom: 22 }}>
            <h3 style={headingStyle}>Financial Position</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 12 }}>
              {positionCards.map((item) => (
                <div key={item.label} style={cardStyle}>
                  <div style={{ fontSize: 12, color: "#64748b", marginBottom: 9 }}>{item.label}</div>
                  <div style={{ fontSize: 19, fontWeight: 750, color: "#334155" }}>
                    {item.isKg ? `${Number(item.value || 0).toLocaleString("en-BD")} KG` : money(item.value)}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section style={{ marginBottom: 22 }}>
            <h3 style={headingStyle}>Account-wise Balance</h3>
            <div style={{ ...cardStyle, overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 450 }}>
                <thead>
                  <tr style={{ background: "#f8fafc", textAlign: "left" }}>
                    {["Account Name", "Account Type", "Balance"].map((heading) => (
                      <th key={heading} style={{ padding: 11, borderBottom: "1px solid #e2e8f0", fontSize: 12, color: "#475569" }}>{heading}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(position.accountSummary || []).map((account) => (
                    <tr key={account.accountId}>
                      <td style={{ padding: 11, borderBottom: "1px solid #f1f5f9" }}>{account.accountName}</td>
                      <td style={{ padding: 11, borderBottom: "1px solid #f1f5f9" }}>{account.accountType}</td>
                      <td style={{ padding: 11, borderBottom: "1px solid #f1f5f9", fontWeight: 700 }}>{money(account.balance)}</td>
                    </tr>
                  ))}
                  {(!position.accountSummary || position.accountSummary.length === 0) && (
                    <tr><td colSpan="3" style={{ padding: 15, textAlign: "center", color: "#64748b" }}>কোনো Account Data পাওয়া যায়নি</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section style={{ ...cardStyle, marginBottom: 20 }}>
            <h3 style={headingStyle}>Report Information</h3>
            <div style={{ display: "flex", gap: 25, flexWrap: "wrap", color: "#475569", fontSize: 13 }}>
              <span>Total Sales: <strong>{pl.salesCount || 0}</strong></span>
              <span>Total Returns: <strong>{pl.returnsCount || 0}</strong></span>
              <span>Commission Invoices: <strong>{pl.commissionInvoiceCount || 0}</strong></span>
              <span>Stock Out: <strong>{data.notes?.stockOutCount || 0}</strong></span>
            </div>
            <p style={{ fontSize: 12, color: "#64748b", marginBottom: 0 }}>
              {data.notes?.stockOutTreatment || ""}
            </p>
            <p style={{ fontSize: 12, color: "#64748b", marginBottom: 0 }}>
              {data.notes?.ownerCapitalTreatment || ""}
            </p>
          </section>
        </>
      )}
    </div>
  );
}
