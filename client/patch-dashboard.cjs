const fs = require("fs");

const appPath = "D:\\saleinventory\\client\\src\\App.jsx";
const salesPath = "D:\\saleinventory\\server\\routes\\salesRoutes.js";
const app = fs.readFileSync(appPath, "utf8");
const sales = fs.readFileSync(salesPath, "utf8");

const activeMarker = '  const [activePage, setActivePage] = useState("Dashboard");';
const trendMarker = 'const trendDays = Number(period) === 30 ? 30 : 7;';
const startMarker = "  function renderDashboard() {";
const endMarker = "\nfunction renderInventoryDashboard()";

if (!app.includes(activeMarker)) throw new Error("Dashboard state পাওয়া যায়নি");
if (!sales.includes(trendMarker)) throw new Error("Sales trend code পাওয়া যায়নি");
if (!app.includes(startMarker) || !app.includes(endMarker)) throw new Error("Dashboard function পাওয়া যায়নি");
if (app.includes("dashboardLiveData")) throw new Error("Live Dashboard code আগে থেকেই আছে");

const liveState = `
  const [dashboardLiveData, setDashboardLiveData] = useState(null);
  const [dashboardLiveLoading, setDashboardLiveLoading] = useState(false);
  const [dashboardLiveError, setDashboardLiveError] = useState("");

  useEffect(() => {
    if (activePage !== "Dashboard") return;
    let cancelled = false;

    async function loadDashboardLiveData() {
      setDashboardLiveLoading(true);
      setDashboardLiveError("");

      try {
        const now = new Date();
        const bdNow = new Date(now.getTime() + 6 * 60 * 60 * 1000);
        const today = bdNow.toISOString().slice(0, 10);
        const yearStart = bdNow.getUTCFullYear() + "-01-01";

        const results = await Promise.allSettled([
          apiRequest("/sales/dashboard/summary?from=" + yearStart + "&to=" + today + "&period=365"),
          apiRequest("/financial-summary?from=" + yearStart + "&to=" + today),
          apiRequest("/products"),
          apiRequest("/customers"),
          apiRequest("/sales")
        ]);

        if (cancelled) return;

        const valueAt = (index) =>
          results[index].status === "fulfilled" ? results[index].value : null;

        const errors = results.map((result, index) => {
          if (result.status === "fulfilled") return null;
          const names = ["Sales Summary", "Financial Summary", "Products", "Customers", "Invoices"];
          return names[index] + ": " + (result.reason?.message || "লোড হয়নি");
        }).filter(Boolean);

        const salesSummary = valueAt(0)?.data || {};
        const financialSummary = valueAt(1)?.data || {};
        const products = valueAt(2)?.products || [];
        const customers = valueAt(3)?.customers || [];
        const invoices = valueAt(4)?.data || [];

        const monthBuckets = Array.from({ length: 12 }, (_, index) => {
          const date = new Date(bdNow.getUTCFullYear(), bdNow.getUTCMonth() - 11 + index, 1);
          return {
            key: date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0"),
            month: date.toLocaleString("en", { month: "short" }),
            sales: 0
          };
        });

        const monthMap = new Map(monthBuckets.map((item) => [item.key, item]));

        (salesSummary.salesTrend || []).forEach((item) => {
          const month = monthMap.get(String(item.date || "").slice(0, 7));
          if (month) month.sales += Number(item.netSales ?? item.sales ?? 0);
        });

        setDashboardLiveData({
          salesSummary,
          financialSummary,
          products: Array.isArray(products) ? products : [],
          customers: Array.isArray(customers) ? customers : [],
          invoices: Array.isArray(invoices) ? invoices.slice(0, 5) : [],
          monthlySales: monthBuckets
        });

        setDashboardLiveError(errors.join(" | "));
      } catch (error) {
        if (!cancelled) setDashboardLiveError(error.message || "Dashboard data load failed");
      } finally {
        if (!cancelled) setDashboardLiveLoading(false);
      }
    }

    loadDashboardLiveData();
    return () => { cancelled = true; };
  }, [activePage]);
`;

const newDashboard = `  function renderDashboard() {
    const live = dashboardLiveData || {};
    const overall = live.salesSummary?.overall || {};
    const profitLoss = live.financialSummary?.profitLoss || {};
    const position = live.financialSummary?.position || {};

    const money = (value) =>
      "৳ " + Number(value || 0).toLocaleString("en-BD", { maximumFractionDigits: 2 });

    const stats = [
      { title: "Total Sales", value: money(overall.netSales ?? overall.totalSales), icon: ShoppingCart, color: "orange", change: "Live data" },
      { title: "Own Sales Profit", value: money(overall.ownProfit), icon: TrendingUp, color: "green", change: "Live data" },
      { title: "Total Products", value: Number(live.products?.length || 0).toLocaleString("en-BD"), icon: Package, color: "blue", change: "Active records" },
      { title: "Total Customers", value: Number(live.customers?.length || 0).toLocaleString("en-BD"), icon: Users, color: "purple", change: "Customer records" }
    ];

    const lowStockProducts = (live.products || []).filter((product) =>
      product.isActive !== false &&
      Number(product.minimumStockKg || 0) > 0 &&
      Number(product.currentStockKg || 0) <= Number(product.minimumStockKg || 0)
    ).slice(0, 5);

    const recentInvoices = live.invoices || [];

    return (
      <>
        <div className="page-heading">
          <div>
            <h2>Dashboard Overview</h2>
            <p>Monitor your real business performance at a glance.</p>
          </div>
          <div className="heading-actions">
            <span className="date-button"><CalendarDays size={17} /> Last 12 Months</span>
            <button className="primary-button" onClick={() => setActivePage("Products")}>
              <Plus size={18} /> Create New
            </button>
          </div>
        </div>

        {dashboardLiveLoading && (
          <div className="panel" style={{ padding: 14, marginBottom: 16 }}>Loading live dashboard data...</div>
        )}
        {dashboardLiveError && (
          <div className="panel" style={{ padding: 14, marginBottom: 16, color: "#b45309" }}>
            কিছু Dashboard data load হয়নি: {dashboardLiveError}
          </div>
        )}

        <section className="stats-grid">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div className="stat-card" key={stat.title}>
                <div className="stat-top">
                  <div className={"stat-icon " + stat.color}><Icon size={21} /></div>
                  <button className="more-button" onClick={() => setActivePage(
                    stat.title === "Total Products" ? "Products" :
                    stat.title === "Total Customers" ? "Customers" : "Sales Invoice History"
                  )}><MoreHorizontal size={20} /></button>
                </div>
                <p className="stat-title">{stat.title}</p>
                <h3>{stat.value}</h3>
                <div className="stat-footer">
                  <span className="positive-change"><TrendingUp size={14} /> {stat.change}</span>
                  <span>Live API</span>
                </div>
              </div>
            );
          })}
        </section>

        <section className="analytics-grid">
          <div className="panel chart-panel">
            <div className="panel-header">
              <div><h3>Monthly Sales Analytics</h3><p>Net sales for the last 12 months</p></div>
              <span className="date-button">Last 12 Months</span>
            </div>
            <div className="chart-legend"><span><i className="legend-sales" /> Net Sales</span></div>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={live.monthlySales || []}>
                  <defs>
                    <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f47b20" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#f47b20" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#edf0f4" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#8993a4", fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "#8993a4", fontSize: 12 }} />
                  <Tooltip formatter={(value) => money(value)} />
                  <Area type="monotone" dataKey="sales" name="Net Sales" stroke="#f47b20" strokeWidth={2.5} fill="url(#salesFill)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="panel summary-panel">
            <div className="panel-header">
              <div><h3>Business Summary</h3><p>Financial position and profit</p></div>
              <button className="more-button" onClick={() => setActivePage("Financial Summary")}><MoreHorizontal size={20} /></button>
            </div>
            <div className="summary-item">
              <div className="summary-icon green"><Wallet size={19} /></div>
              <div className="summary-details"><span>Cash & Bank</span><strong>{money(position.cashAndBank)}</strong></div>
            </div>
            <div className="summary-item">
              <div className="summary-icon blue"><Users size={19} /></div>
              <div className="summary-details"><span>Customer Receivable</span><strong>{money(position.customerReceivable)}</strong></div>
            </div>
            <div className="summary-item">
              <div className="summary-icon orange"><ShoppingBag size={19} /></div>
              <div className="summary-details"><span>Supplier Payable</span><strong>{money(position.supplierPayable)}</strong></div>
            </div>
            <div className="profit-box">
              <div><span>Net Profit</span><strong>{money(profitLoss.netProfit)}</strong></div>
              <TrendingUp size={23} />
            </div>
          </div>
        </section>

        <section className="bottom-grid">
          <div className="panel transactions-panel">
            <div className="panel-header">
              <div><h3>Recent Transactions</h3><p>Latest real sales invoices</p></div>
              <button className="text-button" onClick={() => setActivePage("Sales Invoice History")}>
                View All <ArrowUpRight size={15} />
              </button>
            </div>
            <div className="table-wrapper">
              <table>
                <thead><tr><th>INVOICE</th><th>CUSTOMER</th><th>DATE</th><th>AMOUNT</th><th>STATUS</th></tr></thead>
                <tbody>
                  {recentInvoices.length ? recentInvoices.map((item, index) => {
                    const status = String(item.paymentStatus || item.payment_status || item.status || "Recorded");
                    const date = item.invoiceDate ? new Date(item.invoiceDate).toLocaleDateString("en-GB") : "-";
                    return (
                      <tr key={item._id || item.invoiceNumber || index}>
                        <td className="invoice-id">{item.invoiceNumber || item._id || "-"}</td>
                        <td>{item.customerName || item.customerId?.customerName || "Walk-in Customer"}</td>
                        <td>{date}</td>
                        <td className="amount">{money(item.netSalesAmount ?? item.grandTotal ?? item.totalAmount)}</td>
                        <td><span className={"status " + status.toLowerCase().replace(/\\s+/g, "-")}>{status}</span></td>
                      </tr>
                    );
                  }) : (
                    <tr><td colSpan="5" style={{ textAlign: "center", padding: 24 }}>
                      {dashboardLiveLoading ? "Loading invoices..." : "No sales invoices found"}
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="panel stock-panel">
            <div className="panel-header">
              <div><h3>Stock Alerts</h3><p>Products running low</p></div>
              <CircleAlert size={20} color="#f47b20" />
            </div>
            {lowStockProducts.length ? lowStockProducts.map((product, index) => (
              <div className="stock-alert" key={product._id || index}>
                <div className={"product-mini " + (index % 2 ? "blue-mini" : "")}>
                  {String(product.productName || "?").charAt(0).toUpperCase()}
                </div>
                <div className="stock-info">
                  <strong>{product.productName || "Unnamed Product"}</strong>
                  <span>Current: {Number(product.currentStockKg || 0).toLocaleString("en-BD")} KG | Minimum: {Number(product.minimumStockKg || 0).toLocaleString("en-BD")} KG</span>
                </div>
                <span className="stock-qty">Low</span>
              </div>
            )) : (
              <div style={{ padding: 18, textAlign: "center", color: "#64748b" }}>
                {dashboardLiveLoading ? "Checking stock..." : "No low stock products"}
              </div>
            )}
            <button className="view-stock-button" onClick={() => setActivePage("Products")}>
              Manage Inventory <ArrowUpRight size={16} />
            </button>
          </div>
        </section>
      </>
    );
  }
`;

let updatedApp = app.replace(activeMarker, activeMarker + "\n" + liveState);
const updatedDashboardStart = updatedApp.indexOf(startMarker);
const updatedDashboardEnd = updatedApp.indexOf(endMarker, updatedDashboardStart);
if (updatedDashboardStart < 0 || updatedDashboardEnd < 0) throw new Error("Dashboard replacement boundary error");

updatedApp =
  updatedApp.slice(0, updatedDashboardStart) +
  newDashboard +
  updatedApp.slice(updatedDashboardEnd);

const updatedSales = sales.replace(
  trendMarker,
  'const trendDays = Math.min(365, Math.max(7, Number(period) || 7));'
);

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const appBackup = appPath + ".backup-live-" + stamp;
const salesBackup = salesPath + ".backup-live-" + stamp;

fs.copyFileSync(appPath, appBackup);
fs.copyFileSync(salesPath, salesBackup);

try {
  fs.writeFileSync(appPath, updatedApp, "utf8");
  fs.writeFileSync(salesPath, updatedSales, "utf8");
} catch (error) {
  fs.copyFileSync(appBackup, appPath);
  fs.copyFileSync(salesBackup, salesPath);
  throw error;
}

console.log("Dashboard Live Data patch applied.");
console.log("App backup: " + appBackup);
console.log("Sales route backup: " + salesBackup);

