
import { Fragment, useEffect, useState } from "react";
import {
 LayoutDashboard, Package, ShoppingCart, ShoppingBag, Users,
Truck, Warehouse, Wallet, BarChart3, Settings, Bell, Search,
Menu, X, ChevronDown, TrendingUp, ArrowUpRight, Plus,
MoreHorizontal, CircleAlert, CalendarDays, LogOut, Edit, Trash2,
Tags, ClipboardList,
MapPin,
Printer,
Download,
FileText,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";
import toast, { Toaster } from "react-hot-toast";
import "./App.css";
import AdminLogin from "./components/AdminLogin";


const API = "http://localhost:5000/api";


const navigation = [
  {
    title: "MAIN MENU",
    items: [
      { label: "Dashboard", icon: LayoutDashboard },
      { label: "Products", icon: Package },
      { label: "Categories", icon: Tags },
     

{
  label: "Sales",
  icon: ShoppingCart,
  children: [
    { label: "Sales Dashboard", icon: LayoutDashboard },
    { label: "New Sales Invoice", icon: Plus },
    { label: "Sales Invoice History", icon: ClipboardList },
    { label: "Sales Collection", icon: Wallet },

    { label: "Daily Sales Summary", icon: BarChart3 },
    { label: "Weekly Sales Summary", icon: BarChart3 },
    { label: "Monthly Sales Summary", icon: BarChart3 },
    { label: "Yearly Sales Summary", icon: BarChart3 },

    { label: "Lot Wise Sales", icon: Package },
    { label: "Product Wise Sales", icon: Package },
    { label: "Category Wise Sales", icon: Tags },
    { label: "Supplier Wise Sales", icon: Truck },
    { label: "OWN Profit / Loss", icon: Wallet },
  ],
},


      { label: "Purchases", icon: ShoppingBag },
{
  label: "Customers",
  icon: Users,
  children: [
   { label: "Customer List", icon: Users },
  { label: "Customer Due Summary", icon: FileText },
  { label: "Customer Payment", icon: Wallet },
  ],
},
      { label: "Suppliers", icon: Truck },
    ],
  },
  {
    title: "MANAGEMENT",
    items: [
  
      {
  label: "Inventory",
  icon: Warehouse,
  children: [
    { label: "Inventory Dashboard", icon: LayoutDashboard },
    { label: "Stock In", icon: Plus },
    { label: "Stock Out", icon: Package },
    { label: "Stock Transfer", icon: Truck },
    { label: "Stock Adjustment", icon: Settings },
    { label: "Stock Return", icon: ClipboardList },

    { label: "Stock Transaction History", icon: ClipboardList },

    { label: "Current Stock Report", icon: BarChart3 },
    { label: "Warehouse Wise Stock", icon: Warehouse },
    { label: "Stock Movement Report", icon: BarChart3 },
    { label: "Low Stock Report", icon: BarChart3 },
    { label: "Stock Valuation", icon: Wallet },
  ],
},
      {
        label: "Commission",
        icon: FileText,
        children: [
          { label: "Commission Management", icon: FileText },
          { label: "Commission History", icon: ClipboardList },
          { label: "Commission Reports", icon: BarChart3 },
        ],
      },
      { label: "Accounts", icon: Wallet },
      { label: "Reports", icon: BarChart3 },
      { label: "Activity Log", icon: ClipboardList },
      { label: "Settings", icon: Settings },
    ],
  },
];


const chartData = [
  { month: "Jan", sales: 18000, purchase: 12000 },
  { month: "Feb", sales: 25000, purchase: 17000 },
  { month: "Mar", sales: 21000, purchase: 15000 },
  { month: "Apr", sales: 34000, purchase: 22000 },
  { month: "May", sales: 29000, purchase: 19000 },
  { month: "Jun", sales: 42000, purchase: 28000 },
  { month: "Jul", sales: 38000, purchase: 24000 },
  { month: "Aug", sales: 51000, purchase: 32000 },
  { month: "Sep", sales: 45000, purchase: 30000 },
  { month: "Oct", sales: 58000, purchase: 36000 },
  { month: "Nov", sales: 53000, purchase: 34000 },
  { month: "Dec", sales: 68000, purchase: 41000 },
];

const stats = [
  { title: "Total Sales", value: "৳ 4,85,250", change: "+12.8%", icon: ShoppingCart, color: "orange" },
  { title: "Total Purchase", value: "৳ 2,45,800", change: "+8.2%", icon: ShoppingBag, color: "blue" },
  { title: "Total Products", value: "1,250", change: "+5.4%", icon: Package, color: "purple" },
  { title: "Total Customers", value: "850", change: "+10.5%", icon: Users, color: "green" },
];

const transactions = [
  { id: "#INV-1025", customer: "Rahim Ahmed", date: "14 Nov 2026", amount: "৳ 12,500", status: "Paid" },
  { id: "#INV-1024", customer: "Karim Traders", date: "14 Nov 2026", amount: "৳ 8,200", status: "Pending" },
  { id: "#INV-1023", customer: "Sadia Enterprise", date: "13 Nov 2026", amount: "৳ 15,750", status: "Paid" },
  { id: "#INV-1022", customer: "Hasan Store", date: "13 Nov 2026", amount: "৳ 5,400", status: "Overdue" },
];

const emptyProduct = {
  productName: "",
  category: "",
  subcategory: "",
  brand: "",
  stockType: "OWN",
  supplier: "",
  packingType: "BAG",
  unit: "KG",
  purchasePrice: 0,
  salePrice: 0,
  minimumStockKg: 0,
  description: "",
};

const emptySupplier = {
  supplierName: "",
  companyName: "",
  contactPerson: "",
  mobile: "",
  alternateMobile: "",
  address: "",
  openingBalance: 0,
  notes: "",
};

const inputStyle = {
  width: "100%",
  padding: "11px 12px",
  border: "1px solid #dce1e8",
  borderRadius: "8px",
  outline: "none",
  fontSize: "14px",
  boxSizing: "border-box",
  background: "#fff",
};

const fieldStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "7px",
  marginBottom: "15px",
};

function App() {
  const [activePage, setActivePage] = useState("Dashboard");
 
  useEffect(() => {
  if (activePage === "New Sales Invoice") {
    openSalesForm();
  }
}, [activePage]);
 
 
  const [sidebarOpen, setSidebarOpen] = useState(false);
// ADMIN AUTHENTICATION
const [adminUser, setAdminUser] = useState(null);
const [authChecking, setAuthChecking] = useState(true);

  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);

  // COMMISSION MANAGEMENT STATES
const [commissionLots, setCommissionLots] = useState([]);
const [commissionLoading, setCommissionLoading] = useState(false);
const [commissionError, setCommissionError] = useState("");
const [selectedCommissionLot, setSelectedCommissionLot] = useState(null);

const [commissionItems, setCommissionItems] = useState([
  {
    bags: "",
    weightKg: "",
    ratePerKg: "",
  },
]);

const [commissionSaving, setCommissionSaving] = useState(false);
const [commissionNotes, setCommissionNotes] = useState("");
const [commissionTransportCost, setCommissionTransportCost] = useState(0);
const [commissionLabourRate, setCommissionLabourRate] = useState(0);
const [commissionRatePerKg, setCommissionRatePerKg] = useState(0);
const [commissionOtherCost, setCommissionOtherCost] = useState(0);

// COMMISSION INVOICE HISTORY
const [commissionInvoices, setCommissionInvoices] = useState([]);
const [commissionHistoryLoading, setCommissionHistoryLoading] = useState(false);
const [commissionHistoryError, setCommissionHistoryError] = useState("");

const [commissionReports, setCommissionReports] = useState(null);
const [commissionReportsLoading, setCommissionReportsLoading] = useState(false);

const [editingCommissionInvoice, setEditingCommissionInvoice] = useState(null);
const [commissionEditSaving, setCommissionEditSaving] = useState(false);
const [commissionEditReason, setCommissionEditReason] = useState("");
const [expandedMenus, setExpandedMenus] = useState({});
const [commissionReportFilters, setCommissionReportFilters] = useState({
  startDate: "",
  endDate: "",
  supplierId: "",
  lotId: "",
});
const [commissionSupplierSearch, setCommissionSupplierSearch] = useState("");
const [showCommissionSupplierSuggestions, setShowCommissionSupplierSuggestions] = useState(false);
const [commissionLotSearch, setCommissionLotSearch] = useState("");
const [showCommissionLotSuggestions, setShowCommissionLotSuggestions] = useState(false);


// ======================================
// CUSTOMER MANAGEMENT STATES
// ======================================

const [customers, setCustomers] = useState([]);
const [customerLoading, setCustomerLoading] = useState(false);
const [customerSearch, setCustomerSearch] = useState("");

const [showCustomerForm, setShowCustomerForm] = useState(false);
const [editingCustomerId, setEditingCustomerId] = useState(null);

const [customerForm, setCustomerForm] = useState({
  customerName: "",
  companyName: "",
  contactPerson: "",
  mobile: "",
  alternateMobile: "",
  address: "",
  customerType: "REGULAR",
  openingBalance: "0",
  notes: "",
});

// Customer Due Summary
const [dueSummaryCustomers, setDueSummaryCustomers] = useState([]);
const [dueSummaryLoading, setDueSummaryLoading] = useState(false);

const [dueSummary, setDueSummary] = useState({
  totalDueCustomers: 0,
  totalDueAmount: 0,
});

const [dueStartDate, setDueStartDate] = useState("");
const [dueEndDate, setDueEndDate] = useState("");
const [dueCustomerSearch, setDueCustomerSearch] = useState("");
const [dueCustomerAddress, setDueCustomerAddress] = useState("");


  const [categories, setCategories] = useState([]);
const [categoryLoading, setCategoryLoading] = useState(false);
const [categoryForm, setCategoryForm] = useState({
  productName: "",
  categoryName: "",
});

const [selectedActivity, setSelectedActivity] = useState(null);
// Activity Log States
const [activities, setActivities] = useState([]);
const [activityLoading, setActivityLoading] = useState(false);
const [activityPage, setActivityPage] = useState(1);
const [activityTotalPages, setActivityTotalPages] = useState(1);
const [activitySearch, setActivitySearch] = useState("");
const [activityModule, setActivityModule] = useState("");
const [activityAction, setActivityAction] = useState("");
const [activityStartDate, setActivityStartDate] = useState("");
const [activityEndDate, setActivityEndDate] = useState("");
// CHECK ADMIN LOGIN SESSION
useEffect(() => {
  let isMounted = true;

  async function checkAdminSession() {
    try {
      const result = await apiRequest("/auth/me");

      if (isMounted) {
        setAdminUser(result.data.admin);
      }
    } catch (error) {
      if (isMounted) {
        setAdminUser(null);
      }
    } finally {
      if (isMounted) {
        setAuthChecking(false);
      }
    }
  }

  checkAdminSession();

  return () => {
    isMounted = false;
  };
}, []);


const [editingSubcategoryId, setEditingSubcategoryId] = useState(null);
const [editingSubcategoryName, setEditingSubcategoryName] = useState("");
const [editingCategoryName, setEditingCategoryName] = useState("");
const [editingCategoryProduct, setEditingCategoryProduct] = useState("");

const [editingCategoryId, setEditingCategoryId] = useState(null);
const [newSubcategory, setNewSubcategory] = useState("");

  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchText, setSearchText] = useState("");

  const [productForm, setProductForm] = useState(emptyProduct);
  const [supplierForm, setSupplierForm] = useState(emptySupplier);

// Supplier Payment States
const [showPaymentForm, setShowPaymentForm] = useState(false);
const [paymentSupplier, setPaymentSupplier] = useState(null);
// CUSTOMER PAYMENT STATES
const [paymentCustomer, setPaymentCustomer] = useState(null);
const [customerPaymentForm, setCustomerPaymentForm] = useState({
  amount: "",
  paymentMethod: "CASH",
  transactionId: "",
  transactionDate: new Date().toISOString().split("T")[0],
  notes: "",
});
const [showCustomerPaymentForm, setShowCustomerPaymentForm] = useState(false);
const [customerPaymentLoading, setCustomerPaymentLoading] = useState(false);
const [paymentLoading, setPaymentLoading] = useState(false);

const [paymentForm, setPaymentForm] = useState({
  amount: "",
  paymentMethod: "CASH",
  transactionId: "",
  transactionDate: new Date().toISOString().split("T")[0],
  notes: "",
});

// Supplier Ledger States
const [showSupplierLedger, setShowSupplierLedger] = useState(false);
const [ledgerSupplier, setLedgerSupplier] = useState(null);
const [ledgerData, setLedgerData] = useState(null);
const [ledgerLoading, setLedgerLoading] = useState(false);


// CUSTOMER LEDGER STATES
const [showCustomerLedger, setShowCustomerLedger] = useState(false);
const [ledgerCustomer, setLedgerCustomer] = useState(null);
const [customerLedgerData, setCustomerLedgerData] = useState(null);
const [customerLedgerLoading, setCustomerLedgerLoading] = useState(false);

// CUSTOMER STATEMENT STATES
const [showCustomerStatement, setShowCustomerStatement] = useState(false);
const [customerStatementData, setCustomerStatementData] = useState(null);
const [statementCustomer, setStatementCustomer] = useState(null);
const [customerStatementLoading, setCustomerStatementLoading] = useState(false);

const [customerStatementFilters, setCustomerStatementFilters] = useState({
  startDate: "",
  endDate: "",
});
const [customerStatementType, setCustomerStatementType] = useState("ALL");

// Supplier Ledger Filter States
const [ledgerFilters, setLedgerFilters] = useState({
  startDate: "",
  endDate: "",
  type: "",
  paymentMethod: "",
  search: "",
  minAmount: "",
  maxAmount: "",
});
// CUSTOMER LEDGER FILTERS
const [customerLedgerFilters, setCustomerLedgerFilters] = useState({
  startDate: "",
  endDate: "",
  type: "",
  paymentMethod: "",
  search: "",
  minAmount: "",
  maxAmount: "",
});

const [customerLedgerPage, setCustomerLedgerPage] = useState(1);

const [ledgerPage, setLedgerPage] = useState(1);
const [ledgerLimit] = useState(50);
// Supplier Statement States
const [showSupplierStatement, setShowSupplierStatement] = useState(false);
const [statementType, setStatementType] = useState("ALL");
const [statementSupplier, setStatementSupplier] = useState(null);
const [statementData, setStatementData] = useState(null);
const [statementLoading, setStatementLoading] = useState(false);

const [statementStartDate, setStatementStartDate] = useState("");
const [statementEndDate, setStatementEndDate] = useState("");

// ======================================
// ALL SUPPLIER REPORT STATES
// ======================================

const [allSupplierReport, setAllSupplierReport] = useState(null);
const [allSupplierReportLoading, setAllSupplierReportLoading] = useState(false);
const [purchasePaymentReport, setPurchasePaymentReport] = useState(null);
const [purchasePaymentReportLoading, setPurchasePaymentReportLoading] = useState(false);


const [allSupplierReportFilters, setAllSupplierReportFilters] = useState({
  startDate: "",
  endDate: "",
  supplierId: "",
  type: "",
  paymentMethod: "",
  minAmount: "",
  maxAmount: "",
  search: "",
});
const [supplierReportSearch, setSupplierReportSearch] = useState("");
const [showSupplierReportSupplierOptions, setShowSupplierReportSupplierOptions] = useState(false);

const [allCustomerReport, setAllCustomerReport] = useState(null);
const [allCustomerReportLoading, setAllCustomerReportLoading] = useState(false);

const [allCustomerReportFilters, setAllCustomerReportFilters] = useState({
  startDate: "",
  endDate: "",
  customerId: "",
  type: "",
  paymentMethod: "",
  minAmount: "",
  maxAmount: "",
  search: "",
});

const [customerReportSearch, setCustomerReportSearch] = useState("");
const [showCustomerReportCustomerOptions, setShowCustomerReportCustomerOptions] = useState(false);

// Supplier Payment Correction States
const [showPaymentEdit, setShowPaymentEdit] = useState(false);
const [editingPayment, setEditingPayment] = useState(null);
const [paymentEditLoading, setPaymentEditLoading] = useState(false);

const [paymentEditForm, setPaymentEditForm] = useState({
  amount: "",
  paymentMethod: "CASH",
  transactionId: "",
  transactionDate: "",
  description: "",
  supplierId: "",
  reason: "",
});

// Supplier Payment History States
const [showPaymentHistory, setShowPaymentHistory] = useState(false);
const [selectedPaymentHistory, setSelectedPaymentHistory] = useState(null);



// Supplier Payment Void States
const [showPaymentVoid, setShowPaymentVoid] = useState(false);
const [voidingPayment, setVoidingPayment] = useState(null);
const [paymentVoidReason, setPaymentVoidReason] = useState("");
const [paymentVoidLoading, setPaymentVoidLoading] = useState(false);

// Customer Payment Correction States
const [showCustomerPaymentEdit, setShowCustomerPaymentEdit] = useState(false);
const [editingCustomerPayment, setEditingCustomerPayment] = useState(null);
const [customerPaymentEditLoading, setCustomerPaymentEditLoading] = useState(false);

const [customerPaymentEditForm, setCustomerPaymentEditForm] = useState({
  amount: "",
  paymentMethod: "CASH",
  transactionId: "",
  reference: "",
  transactionDate: "",
  description: "",
  reason: "",
});

const [showCustomerPaymentVoid, setShowCustomerPaymentVoid] = useState(false);
const [voidingCustomerPayment, setVoidingCustomerPayment] = useState(null);
const [customerPaymentVoidReason, setCustomerPaymentVoidReason] = useState("");
const [customerPaymentVoidLoading, setCustomerPaymentVoidLoading] = useState(false);
// Purchase / Lot States
// Purchase / Lot States
const [lots, setLots] = useState([]);
// PURCHASE HISTORY FILTER STATES
const [purchaseFilters, setPurchaseFilters] = useState({
  startDate: "",
  endDate: "",
  supplier: "",
  product: "",
  lotCode: "",
  status: "",
});
const [lotLoading, setLotLoading] = useState(false);
const [showPurchaseForm, setShowPurchaseForm] = useState(false);

const [purchaseForm, setPurchaseForm] = useState({
  supplierId: "",
  productId: "",
  purchaseDate: new Date().toISOString().split("T")[0],
  bagsReceived: "",
  totalWeightKg: "",
  purchasePricePerKg: "",
  notes: "",
});
// ======================================
// PURCHASE LOT EDIT STATES
// ======================================

const [showLotEditForm, setShowLotEditForm] = useState(false);
const [editingLot, setEditingLot] = useState(null);
const [lotEditLoading, setLotEditLoading] = useState(false);

const [lotEditForm, setLotEditForm] = useState({
  supplierId: "",
  purchaseDate: "",
  bagsReceived: "",
  totalWeightKg: "",
  purchasePricePerKg: "",
  notes: "",
  editReason: "",
});

// PURCHASE EDIT HISTORY STATES
const [showEditHistory, setShowEditHistory] = useState(false);
const [selectedEditHistory, setSelectedEditHistory] = useState(null);

function openEditHistory(lot) {
  setSelectedEditHistory(lot);
  setShowEditHistory(true);
}


// Purchase Return States
const [showReturnForm, setShowReturnForm] = useState(false);
const [returnLot, setReturnLot] = useState(null);
const [returnLoading, setReturnLoading] = useState(false);

const [returnForm, setReturnForm] = useState({
  bagsReturned: "0",
  weightReturnedKg: "",
  returnDate: new Date().toISOString().split("T")[0],
  notes: "",
});

// ======================================
// SALES MODULE STATES
// ======================================

// Sales Invoice List
const [salesInvoices, setSalesInvoices] = useState([]);
const [salesLoading, setSalesLoading] = useState(false);
const [salesSearch, setSalesSearch] = useState("");
const [salesStatusFilter, setSalesStatusFilter] = useState("");
const [salesStartDate, setSalesStartDate] = useState("");
const [salesEndDate, setSalesEndDate] = useState("");

// ======================================
// SALES DASHBOARD STATES
// ======================================

const [salesDashboard, setSalesDashboard] = useState(null);
const [salesDashboardLoading, setSalesDashboardLoading] = useState(false);
const [salesDashboardPeriod, setSalesDashboardPeriod] = useState("7");
const [salesDashboardStartDate, setSalesDashboardStartDate] = useState(() =>
  new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString().slice(0, 10)
);
// ========================================
// OWN SALES REPORT STATES
// ========================================

const [ownSalesReport, setOwnSalesReport] = useState(null);
const [ownSalesRegister, setOwnSalesRegister] = useState(null);
const [expandedOwnInvoiceId, setExpandedOwnInvoiceId] = useState(null);
const [expandedOwnSalesGroupKey, setExpandedOwnSalesGroupKey] = useState(null);
const [expandedOwnSalesGroupInvoiceId, setExpandedOwnSalesGroupInvoiceId] = useState(null);
const [ownSalesReportLoading, setOwnSalesReportLoading] = useState(false);

const [ownSalesReportFrom, setOwnSalesReportFrom] = useState(() =>
  new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString().slice(0, 10)
);

const [ownSalesReportTo, setOwnSalesReportTo] = useState(() =>
  new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString().slice(0, 10)
);

const [salesDashboardEndDate, setSalesDashboardEndDate] = useState(() =>
  new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString().slice(0, 10)
);
// Sales Invoice Form
const [showSalesForm, setShowSalesForm] = useState(false);
const [salesSaving, setSalesSaving] = useState(false);

// Customer Autocomplete
const [salesCustomerSearch, setSalesCustomerSearch] = useState("");
const [salesCustomerOptions, setSalesCustomerOptions] = useState([]);
const [salesCustomerLoading, setSalesCustomerLoading] = useState(false);
const [selectedSalesCustomer, setSelectedSalesCustomer] = useState(null);
const [showSalesCustomerOptions, setShowSalesCustomerOptions] = useState(false);



// ========================================
// SALES COLLECTION STATES
// ========================================

const [collectionCustomerSearch, setCollectionCustomerSearch] = useState("");
const [collectionCustomerOptions, setCollectionCustomerOptions] = useState([]);
const [collectionCustomerLoading, setCollectionCustomerLoading] = useState(false);
const [selectedCollectionCustomer, setSelectedCollectionCustomer] = useState(null);
const [showCollectionCustomerOptions, setShowCollectionCustomerOptions] = useState(false);

const [collectionAmount, setCollectionAmount] = useState("");
const [collectionPaymentMethod, setCollectionPaymentMethod] = useState("CASH");
const [collectionTransactionId, setCollectionTransactionId] = useState("");
const [collectionReference, setCollectionReference] = useState("");
const [collectionDescription, setCollectionDescription] = useState("");
const [collectionTransactionDate, setCollectionTransactionDate] = useState(
  new Date().toISOString().slice(0, 10)
);

const [collectionLoading, setCollectionLoading] = useState(false);
const [collectionHistory, setCollectionHistory] = useState([]);
const [collectionHistoryLoading, setCollectionHistoryLoading] = useState(false);
// Product Autocomplete
const [salesProductSearch, setSalesProductSearch] = useState("");
const [salesProductOptions, setSalesProductOptions] = useState([]);
const [salesProductLoading, setSalesProductLoading] = useState(false);
const [showSalesProductOptions, setShowSalesProductOptions] = useState(false);

// Selected Product and Lot
const [selectedSalesProduct, setSelectedSalesProduct] = useState(null);
const [salesAvailableLots, setSalesAvailableLots] = useState([]);
const [salesLotLoading, setSalesLotLoading] = useState(false);
const [selectedSalesLot, setSelectedSalesLot] = useState(null);

// Sales Invoice Line Form
const [salesLineForm, setSalesLineForm] = useState({
  bags: "",
  weightKg: "",
  saleRatePerKg: "",
  commissionRatePerKg: "",
  labourRatePerBag: "",
});

// Invoice Items
const [salesItems, setSalesItems] = useState([]);

// Invoice Additional Information
const [salesForm, setSalesForm] = useState({
  invoiceDate: new Date().toISOString().split("T")[0],
  otherCost: "0",
  discount: "0",
  paidAmount: "0",
  paymentMethod: "CASH",
  paymentReference: "",
  notes: "",
});

// Sales Invoice Details
const [showSalesDetails, setShowSalesDetails] = useState(false);
const [selectedSalesInvoice, setSelectedSalesInvoice] = useState(null);
const [salesDetailsLoading, setSalesDetailsLoading] = useState(false);
const [editingSalesInvoiceId, setEditingSalesInvoiceId] = useState(null);
const [editingOriginalCustomerId, setEditingOriginalCustomerId] = useState(null);
const [editingSalesPreviousDue, setEditingSalesPreviousDue] = useState(null);

// Sales Return States
const [showSalesReturn, setShowSalesReturn] = useState(false);
const [salesReturnLoading, setSalesReturnLoading] = useState(false);
const [salesReturnSubmitting, setSalesReturnSubmitting] = useState(false);
const [selectedSalesReturn, setSelectedSalesReturn] = useState(null);
const [salesReturnItems, setSalesReturnItems] = useState([]);
const [salesReturnRefundMethod, setSalesReturnRefundMethod] = useState("CASH");
const [salesReturnNotes, setSalesReturnNotes] = useState("");
const [cancelReason, setCancelReason] = useState("");
const [cancellingSalesInvoice, setCancellingSalesInvoice] = useState(false);
const [editingOriginalItems, setEditingOriginalItems] = useState([]);

async function apiRequest(url, options = {}) {
  const response = await fetch(`${API}${url}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const responseText = await response.text();

  let data;

  try {
    data = responseText ? JSON.parse(responseText) : {};
  } catch (error) {
    throw new Error(
      `Server JSON পাঠায়নি! HTTP ${response.status}: ${responseText.slice(0, 250)}`
    );
  }

  if (!response.ok || data.success === false) {
    throw new Error(
      data.message || `HTTP Error: ${response.status}`
    );
  }

  return data;
}

// ======================================
// SALES MODULE API FUNCTIONS
// ======================================

// Load Sales Invoice List

// Load Sales Invoice List
async function loadSalesInvoices(overrides = {}) {
  try {
    setSalesLoading(true);

    const search = overrides.search ?? salesSearch;
    const status = overrides.status ?? salesStatusFilter;
    const startDate = overrides.startDate ?? salesStartDate;
    const endDate = overrides.endDate ?? salesEndDate;

    const params = new URLSearchParams();

    if (search.trim()) {
      params.append("search", search.trim());
    }

    if (status) {
      params.append("status", status);
    }

    // Search বা Date Range না থাকলে শুধু আজকের Invoice দেখাবে
    if (!startDate && !endDate && !search.trim()) {
      const dateParts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Dhaka",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).formatToParts(new Date());

      const today = `${dateParts.find(p => p.type === "year").value}-${dateParts.find(p => p.type === "month").value}-${dateParts.find(p => p.type === "day").value}`;

      params.append("from", today);
      params.append("to", today);
    } else {
      if (startDate) params.append("from", startDate);
      if (endDate) params.append("to", endDate);
    }

    const result = await apiRequest(`/sales?${params.toString()}`);

    setSalesInvoices(result.data || []);
  } catch (error) {
    toast.error(error.message || "Sales load করা যায়নি");
  } finally {
    setSalesLoading(false);
  }
}

// ======================================
// LOAD SALES DASHBOARD
// ======================================

async function loadSalesDashboard(
  period = salesDashboardPeriod,
  startDate = salesDashboardStartDate,
  endDate = salesDashboardEndDate
) {
  try {
    if (!startDate || !endDate) {
      toast.error("Start Date এবং End Date নির্বাচন করুন");
      return;
    }
    if (startDate > endDate) {
      toast.error("Start Date, End Date-এর পরে হতে পারবে না");
      return;
    }

    setSalesDashboardLoading(true);

    const result = await apiRequest(
      `/sales/dashboard/summary?period=${period}&from=${encodeURIComponent(startDate)}&to=${encodeURIComponent(endDate)}`
    );

    setSalesDashboard(result.data || null);
  } catch (error) {
    toast.error(error.message || "Sales Dashboard load করা যায়নি");
  } finally {
    setSalesDashboardLoading(false);
  }
}

// ========================================
// LOAD OWN SALES REGISTER
// ========================================

async function loadOwnSalesRegister(
  from = ownSalesReportFrom,
  to = ownSalesReportTo
) {
  try {
    if (!from || !to) {
      toast.error("Start Date এবং End Date নির্বাচন করুন");
      return;
    }

    if (from > to) {
      toast.error("Start Date, End Date-এর পরে হতে পারবে না");
      return;
    }

    setOwnSalesReportLoading(true);
    setOwnSalesRegister(null);
    setExpandedOwnInvoiceId(null);

    const result = await apiRequest(
      `/reports/own-sales-register?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
    );

    setOwnSalesRegister(result || null);
  } catch (error) {
    toast.error(error.message || "OWN Sales Register load করা যায়নি");
  } finally {
    setOwnSalesReportLoading(false);
  }
}

// ========================================
// LOAD OWN SALES REPORT
// ========================================

async function loadOwnSalesReport(
  type = "daily",
  from = ownSalesReportFrom,
  to = ownSalesReportTo
) {
  try {
    if (!from || !to) {
      toast.error("Start Date এবং End Date নির্বাচন করুন");
      return;
    }

    if (from > to) {
      toast.error("Start Date, End Date-এর পরে হতে পারবে না");
      return;
    }

    setOwnSalesReportLoading(true);

    const result = await apiRequest(
      `/reports/own-sales?type=${encodeURIComponent(type)}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
    );

  setOwnSalesReport(result || null);
  } catch (error) {
    toast.error(
      error.message || "OWN Sales Report load করা যায়নি"
    );
  } finally {
    setOwnSalesReportLoading(false);
  }
}

// Search Customer for Sales
async function searchSalesCustomers(value) {
  setSalesCustomerSearch(value);
  setSelectedSalesCustomer(null);
  setShowSalesCustomerOptions(true);

  if (!value.trim()) {
    setSalesCustomerOptions([]);
    return;
  }

  try {
    setSalesCustomerLoading(true);

    const result = await apiRequest(
      `/sales/customers/search?q=${encodeURIComponent(value)}`
    );

    setSalesCustomerOptions(result.data || []);
  } catch (error) {
    toast.error(error.message || "Customer search failed");
  } finally {
    setSalesCustomerLoading(false);
  }
}


// ========================================
// SALES COLLECTION CUSTOMER SEARCH
// ========================================

async function searchCollectionCustomers(value) {
  setCollectionCustomerSearch(value);
  setSelectedCollectionCustomer(null);
  setShowCollectionCustomerOptions(true);

  if (!value.trim()) {
    setCollectionCustomerOptions([]);
    return;
  }

  try {
    setCollectionCustomerLoading(true);

    const result = await apiRequest(
      `/sales/customers/search?q=${encodeURIComponent(value)}`
    );

    setCollectionCustomerOptions(result.data || []);
  } catch (error) {
    toast.error(error.message || "Customer search failed");
  } finally {
    setCollectionCustomerLoading(false);
  }
}

// ========================================
// LOAD SALES COLLECTION HISTORY
// ========================================

async function loadCollectionHistory() {
  try {
    setCollectionHistoryLoading(true);

    const result = await apiRequest("/sales/collections");

    setCollectionHistory(result.data || []);
  } catch (error) {
    toast.error(error.message || "Collection history load করা যায়নি");
  } finally {
    setCollectionHistoryLoading(false);
  }
}

// ========================================
// SUBMIT SALES COLLECTION
// ========================================

async function submitSalesCollection() {
  if (!selectedCollectionCustomer?._id) {
    toast.error("প্রথমে Customer নির্বাচন করুন");
    return;
  }

  const amount = Number(collectionAmount);

  if (!Number.isFinite(amount) || amount <= 0) {
    toast.error("সঠিক Collection Amount লিখুন");
    return;
  }

  const currentDue = Number(
    selectedCollectionCustomer.currentBalance || 0
  );

  if (amount > currentDue + 0.009) {
    toast.error(`Customer-এর বর্তমান বকেয়া ${currentDue.toFixed(2)} টাকা`);
    return;
  }

  try {
    setCollectionLoading(true);

    const result = await apiRequest("/sales/collections", {
  method: "POST",
  body: JSON.stringify({
    customerId: selectedCollectionCustomer._id,
    amount,
    paymentMethod: collectionPaymentMethod,
    transactionId: collectionTransactionId,
    reference: collectionReference,
    description: collectionDescription,
    transactionDate: collectionTransactionDate,
  }),
});

    toast.success(result.message || "Collection successful");

    setCollectionAmount("");
    setCollectionTransactionId("");
    setCollectionReference("");
    setCollectionDescription("");

    setSelectedCollectionCustomer(null);
    setCollectionCustomerSearch("");
    setCollectionCustomerOptions([]);
    setShowCollectionCustomerOptions(false);

    await loadCollectionHistory();
  } catch (error) {
    toast.error(error.message || "Collection failed");
  } finally {
    setCollectionLoading(false);
  }
}
// Select Customer
function selectSalesCustomer(customer) {
  setSelectedSalesCustomer(customer);
  setSalesCustomerSearch(
    `${customer.customerName || ""}${
      customer.mobile ? ` - ${customer.mobile}` : ""
    }`
  );
  setShowSalesCustomerOptions(false);
  setSalesCustomerOptions([]);
}

// Search Product for Sales
async function searchSalesProducts(value) {
  setSalesProductSearch(value);
  setSelectedSalesProduct(null);
  setSelectedSalesLot(null);
  setSalesAvailableLots([]);
  setShowSalesProductOptions(true);

  if (!value.trim()) {
    setSalesProductOptions([]);
    return;
  }

  try {
    setSalesProductLoading(true);

    const result = await apiRequest(
      `/sales/products/search?q=${encodeURIComponent(value)}`
    );

    setSalesProductOptions(result.data || []);
  } catch (error) {
    toast.error(error.message || "Product search failed");
  } finally {
    setSalesProductLoading(false);
  }
}

// Select Product and Load Available Lots
async function selectSalesProduct(product) {
  setSelectedSalesProduct(product);
  setSalesProductSearch(product.productName || "");
  setShowSalesProductOptions(false);
  setSalesProductOptions([]);
  setSelectedSalesLot(null);
  setSalesAvailableLots([]);
  setSalesLineForm({
    bags: "",
    weightKg: "",
    saleRatePerKg: product.salePrice || "",
    commissionRatePerKg: "",
    labourRatePerBag: "",
  });

  try {
    setSalesLotLoading(true);

    const result = await apiRequest(`/sales/lots/${product._id}`);

    setSalesAvailableLots(result.data || []);
  } catch (error) {
    toast.error(error.message || "Product Lot load করা যায়নি");
  } finally {
    setSalesLotLoading(false);
  }
}

// Select Lot
function selectSalesLot(lotId) {
  const lot = salesAvailableLots.find(
    (item) => item._id === lotId
  );

  if (!lot) {
    setSelectedSalesLot(null);
    return;
  }

  setSelectedSalesLot(lot);

  setSalesLineForm((prev) => ({
    ...prev,
    bags: "",
    weightKg: "",
  }));
}

// Reset Sales Form
function resetSalesForm() {
  setSelectedSalesCustomer(null);
  setSalesCustomerSearch("");
  setSalesCustomerOptions([]);

  setSelectedSalesProduct(null);
  setSalesProductSearch("");
  setSalesProductOptions([]);

  setSelectedSalesLot(null);
  setSalesAvailableLots([]);

  setSalesLineForm({
    bags: "",
    weightKg: "",
    saleRatePerKg: "",
    commissionRatePerKg: "",
    labourRatePerBag: "",
  });

  setSalesItems([]);

  setSalesForm({
    invoiceDate: new Date().toISOString().split("T")[0],
    otherCost: "0",
    discount: "0",
    paidAmount: "0",
    paymentMethod: "CASH",
    paymentReference: "",
    notes: "",
  });

  setEditingSalesInvoiceId(null);
  setEditingOriginalCustomerId(null);
  setEditingSalesPreviousDue(null);
  setEditingOriginalItems([]);
}


// ======================================
// SALES ITEM CALCULATION
// ======================================

// Add Product / Lot to Sales Invoice

function addSalesItem() {
  if (!selectedSalesProduct) {
    toast.error("প্রথমে Product নির্বাচন করুন");
    return;
  }

  if (!selectedSalesLot) {
    toast.error("প্রথমে Lot নির্বাচন করুন");
    return;
  }

  const bags = Number(salesLineForm.bags || 0);
  const weightKg = Number(salesLineForm.weightKg || 0);
  const saleRatePerKg = Number(salesLineForm.saleRatePerKg || 0);
  const commissionRatePerKg = Number(
    salesLineForm.commissionRatePerKg || 0
  );
  const labourRatePerBag = Number(
    salesLineForm.labourRatePerBag || 0
  );

  if (bags <= 0 || weightKg <= 0) {
    toast.error("Bags এবং Weight সঠিকভাবে দিন");
    return;
  }

  if (saleRatePerKg <= 0) {
    toast.error("Sale Rate দিন");
    return;
  }

  const selectedLotId = String(selectedSalesLot._id);

  // ========================================
  // OLD INVOICE STOCK RESTORE FOR EDIT MODE
  // ========================================
  const oldInvoiceStock = editingSalesInvoiceId
    ? editingOriginalItems
        .filter((item) => {
          const lotId =
            item.lotId?._id || item.lotId;

          return String(lotId) === selectedLotId;
        })
        .reduce(
          (total, item) => ({
            bags: total.bags + Number(item.bags || 0),
            weightKg:
              total.weightKg + Number(item.weightKg || 0),
          }),
          { bags: 0, weightKg: 0 }
        )
    : { bags: 0, weightKg: 0 };

  // Actual available stock + old invoice stock
  const availableBags =
    Number(selectedSalesLot.remainingBags || 0) +
    oldInvoiceStock.bags;

  const availableWeightKg =
    Number(selectedSalesLot.remainingWeightKg || 0) +
    oldInvoiceStock.weightKg;

  // ========================================
  // ALREADY ADDED ITEMS
  // ========================================
  const alreadyAdded = salesItems
    .filter(
      (item) => String(item.lotId) === selectedLotId
    )
    .reduce(
      (total, item) => ({
        bags: total.bags + Number(item.bags || 0),
        weightKg:
          total.weightKg + Number(item.weightKg || 0),
      }),
      { bags: 0, weightKg: 0 }
    );

  if (bags + alreadyAdded.bags > availableBags) {
    toast.error("এই Lot-এর মোট Bags Stock-এর চেয়ে বেশি হচ্ছে");
    return;
  }

  if (weightKg + alreadyAdded.weightKg > availableWeightKg) {
    toast.error("এই Lot-এর মোট KG Stock-এর চেয়ে বেশি হচ্ছে");
    return;
  }

  // ========================================
  // CALCULATE TOTALS
  // ========================================
  const productTotal = weightKg * saleRatePerKg;
  const commissionTotal = weightKg * commissionRatePerKg;
  const labourTotal = bags * labourRatePerBag;

  const lineTotal =
    productTotal + commissionTotal + labourTotal;

  setSalesItems((prev) => [
    ...prev,
    {
      productId: selectedSalesProduct._id,
      productName: selectedSalesProduct.productName,
      lotId: selectedSalesLot._id,
      lotCode: selectedSalesLot.lotCode,
      supplierId:
        selectedSalesLot.supplierId?._id ||
        selectedSalesLot.supplierId ||
        "",
      supplierName:
        selectedSalesLot.supplierId?.supplierName ||
        selectedSalesLot.supplierName ||
        "",
      stockType:
        selectedSalesLot.stockType ||
        selectedSalesProduct.stockType ||
        "OWN",
      bags,
      weightKg,
      purchasePricePerKg: Number(
        selectedSalesLot.purchasePricePerKg || 0
      ),
      saleRatePerKg,
      commissionRatePerKg,
      labourRatePerBag,
      productTotal,
      commissionTotal,
      labourTotal,
      lineTotal,
    },
  ]);

  setSalesLineForm({
    bags: "",
    weightKg: "",
    saleRatePerKg,
    commissionRatePerKg,
    labourRatePerBag,
  });

  toast.success("Product Invoice-এ যোগ হয়েছে");
}


// Remove Sales Item
function removeSalesItem(index) {
  setSalesItems((prev) =>
    prev.filter((_, itemIndex) => itemIndex !== index)
  );
}

// Update Sales Item
function updateSalesItem(index, field, value) {
  setSalesItems((prev) =>
    prev.map((item, itemIndex) => {
      if (itemIndex !== index) return item;

      const updated = {
        ...item,
        [field]: value,
      };

      const bags = Number(updated.bags || 0);
      const weightKg = Number(updated.weightKg || 0);
      const saleRatePerKg = Number(updated.saleRatePerKg || 0);
      const commissionRatePerKg = Number(
        updated.commissionRatePerKg || 0
      );
      const labourRatePerBag = Number(
        updated.labourRatePerBag || 0
      );

      updated.productTotal = weightKg * saleRatePerKg;
      updated.commissionTotal =
        weightKg * commissionRatePerKg;
      updated.labourTotal = bags * labourRatePerBag;

      updated.lineTotal =
        updated.productTotal +
        updated.commissionTotal +
        updated.labourTotal;

      return updated;
    })
  );
}

// Invoice Summary
const salesSummary = salesItems.reduce(
  (summary, item) => ({
    totalBags: summary.totalBags + Number(item.bags || 0),
    totalWeightKg:
      summary.totalWeightKg + Number(item.weightKg || 0),
    productTotal:
      summary.productTotal + Number(item.productTotal || 0),
    totalCommission:
      summary.totalCommission + Number(item.commissionTotal || 0),
    totalLabour:
      summary.totalLabour + Number(item.labourTotal || 0),
  }),
  {
    totalBags: 0,
    totalWeightKg: 0,
    productTotal: 0,
    totalCommission: 0,
    totalLabour: 0,
  }
);

const salesGrandTotal =
  salesSummary.productTotal +
  salesSummary.totalCommission +
  salesSummary.totalLabour +
  Number(salesForm.otherCost || 0) -
  Number(salesForm.discount || 0);

const salesPreviousDue =
  editingSalesInvoiceId &&
  editingOriginalCustomerId === selectedSalesCustomer?._id &&
  editingSalesPreviousDue !== null
    ? Number(editingSalesPreviousDue)
    : Number(
        selectedSalesCustomer?.currentBalance ??
        selectedSalesCustomer?.balance ??
        selectedSalesCustomer?.openingBalance ??
        0
      );

const salesTotalPayable = salesPreviousDue + salesGrandTotal;

const salesPaidAmount = Number(salesForm.paidAmount || 0);

const salesDueAmount = salesTotalPayable - salesPaidAmount;


// ======================================
// SAVE SALES INVOICE
// ======================================


async function saveSalesInvoice() {
  if (!selectedSalesCustomer) {
    toast.error("Customer নির্বাচন করুন");
    return;
  }

  if (salesItems.length === 0) {
    toast.error("Invoice-এ অন্তত একটি Product যোগ করুন");
    return;
  }

  if (salesGrandTotal < 0) {
    toast.error("Discount Invoice Total-এর চেয়ে বেশি হতে পারবে না");
    return;
  }

  if (salesPaidAmount < 0 || salesPaidAmount > salesTotalPayable) {
    toast.error("Payment Amount সঠিক নয়");
    return;
  }

  if (!salesForm.invoiceDate) {
    toast.error("Invoice Date দিন");
    return;
  }

  // Popup আগে খুলব, যাতে browser popup blocker আটকাতে না পারে
  const printWindow = window.open(
    "",
    "_blank",
    "width=420,height=700"
  );

  const payload = {
    customerId: selectedSalesCustomer._id,
    invoiceDate: salesForm.invoiceDate,
    items: salesItems.map((item) => ({
      productId: item.productId,
      lotId: item.lotId,
      bags: Number(item.bags),
      weightKg: Number(item.weightKg),
      saleRatePerKg: Number(item.saleRatePerKg),
      commissionRatePerKg: Number(item.commissionRatePerKg),
      labourRatePerBag: Number(item.labourRatePerBag),
    })),
    otherCost: Number(salesForm.otherCost || 0),
    discount: Number(salesForm.discount || 0),
    paidAmount: salesPaidAmount,
    paymentMethod: salesForm.paymentMethod,
    paymentReference: salesForm.paymentReference,
    notes: salesForm.notes,
  };

  try {
    setSalesSaving(true);

const result = await apiRequest(
  editingSalesInvoiceId
    ? `/sales/${editingSalesInvoiceId}`
    : "/sales",
  {
    method: editingSalesInvoiceId ? "PUT" : "POST",
    body: JSON.stringify(payload),
  }
);

    const sale = result.data;

    toast.success(
      result.message || "Sales Invoice সফলভাবে তৈরি হয়েছে"
    );

    // =====================================
    // AUTO PRINT SALES INVOICE
    // =====================================

    if (printWindow && sale) {
      const money = (value) =>
        Number(value || 0).toLocaleString("en-BD", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });

      const escapeHTML = (value) =>
        String(value ?? "").replace(/[&<>"']/g, (char) => ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[char]);

      const invoiceDate = sale.invoiceDate
        ? new Date(sale.invoiceDate).toLocaleDateString("en-GB")
        : "";

      const itemRows = (sale.items || [])
        .map((item) => `
          <tr>
            <td>
              <strong>${escapeHTML(item.productName)}</strong>
              <small>${escapeHTML(item.lotCode || "")}</small>
            </td>
            <td class="center">${Number(item.bags || 0)}</td>
            <td class="right">${money(item.weightKg)}</td>
            <td class="right">${money(item.saleRatePerKg)}</td>
            <td class="right">${money(item.lineTotal)}</td>
          </tr>
        `)
        .join("");

      printWindow.document.open();

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8" />
          <title>${escapeHTML(sale.invoiceNumber)}</title>

          <style>
            @page {
              size: 3.5in 9in;
              margin: 0;
            }

            * {
              box-sizing: border-box;
            }

            html, body {
              width: 3.5in;
              margin: 0;
              padding: 0;
              font-family: Arial, sans-serif;
              color: #111;
              font-size: 10px;
            }

            .invoice {
              width: 3.5in;
              min-height: 9in;
              padding: 0.12in;
            }

            .header {
              text-align: center;
              border-bottom: 1px dashed #555;
              padding-bottom: 9px;
              margin-bottom: 9px;
            }

            .header h2 {
              margin: 0 0 5px;
              font-size: 16px;
            }

            .header p {
              margin: 3px 0;
              font-size: 10px;
            }

            .invoice-info {
              display: flex;
              justify-content: space-between;
              margin-bottom: 9px;
              font-size: 9px;
            }

            .customer {
              border-bottom: 1px dashed #555;
              padding-bottom: 8px;
              margin-bottom: 9px;
              line-height: 1.6;
              overflow-wrap: anywhere;
            }

            .customer strong {
              font-size: 11px;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              table-layout: fixed;
              font-size: 8px;
            }

            th {
              border-top: 1px solid #333;
              border-bottom: 1px solid #333;
              padding: 5px 2px;
              text-align: left;
            }

            td {
              padding: 5px 2px;
              border-bottom: 1px dotted #bbb;
              overflow-wrap: anywhere;
              vertical-align: top;
            }

            th:first-child,
            td:first-child {
              width: 29%;
            }

            th:nth-child(2),
            td:nth-child(2) {
              width: 10%;
            }

            th:nth-child(3),
            td:nth-child(3) {
              width: 16%;
            }

            th:nth-child(4),
            td:nth-child(4) {
              width: 19%;
            }

            th:nth-child(5),
            td:nth-child(5) {
              width: 26%;
            }

            small {
              display: block;
              font-size: 7px;
              color: #555;
            }

            .center {
              text-align: center;
            }

            .right {
              text-align: right;
            }

            .summary {
              margin-top: 10px;
              border-top: 1px dashed #555;
              padding-top: 7px;
            }

            .summary-row {
              display: flex;
              justify-content: space-between;
              padding: 3px 0;
              font-size: 9px;
              gap: 5px;
            }

            .summary-row strong {
              text-align: right;
            }

            .grand {
              border-top: 1px solid #333;
              border-bottom: 1px solid #333;
              margin-top: 4px;
              padding: 6px 0;
              font-size: 12px;
              font-weight: bold;
            }

            .due {
              font-size: 12px;
              font-weight: bold;
              padding-top: 6px;
            }

            .footer {
              text-align: center;
              border-top: 1px dashed #555;
              margin-top: 12px;
              padding-top: 7px;
              font-size: 8px;
            }
          </style>
        </head>

        <body>
          <div class="invoice">

            <div class="header">
              <h2>SALES INVOICE</h2>
              <p>${escapeHTML(sale.invoiceNumber || "")}</p>
            </div>

            <div class="invoice-info">
              <span>Date: ${escapeHTML(invoiceDate)}</span>
              <span>Invoice: ${escapeHTML(sale.status || "COMPLETED")}</span>
            </div>

            <div class="customer">
              <strong>${escapeHTML(sale.customerName)}</strong>
              ${sale.companyName
                ? `<div>${escapeHTML(sale.companyName)}</div>`
                : ""}
              ${sale.customerMobile
                ? `<div>Mobile: ${escapeHTML(sale.customerMobile)}</div>`
                : ""}
              ${sale.customerAddress
                ? `<div>Address: ${escapeHTML(sale.customerAddress)}</div>`
                : ""}
            </div>

            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th class="center">Bag</th>
                  <th class="right">KG</th>
                  <th class="right">Rate</th>
                  <th class="right">Total</th>
                </tr>
              </thead>

              <tbody>
                ${itemRows}
              </tbody>
            </table>

            <div class="summary">

              <div class="summary-row">
                <span>Product Total</span>
                <strong>${money(sale.productTotal)}</strong>
              </div>

              <div class="summary-row">
                <span>Commission</span>
                <strong>${money(sale.totalCommission)}</strong>
              </div>

              <div class="summary-row">
                <span>Labour</span>
                <strong>${money(sale.totalLabour)}</strong>
              </div>

              <div class="summary-row">
                <span>Other Cost</span>
                <strong>${money(sale.otherCost)}</strong>
              </div>

              <div class="summary-row">
                <span>Discount</span>
                <strong>${money(sale.discount)}</strong>
              </div>

              <div class="summary-row grand">
                <span>Grand Total</span>
                <strong>${money(sale.grandTotal)}</strong>
              </div>

              <div class="summary-row">
                <span>Previous Due</span>
                <strong>${money(sale.previousDue)}</strong>
              </div>

              <div class="summary-row">
                <span>Total Payable</span>
                <strong>${money(sale.totalPayable)}</strong>
              </div>

              <div class="summary-row">
                <span>Paid Amount</span>
                <strong>${money(sale.paidAmount)}</strong>
              </div>

              <div class="summary-row due">
                <span>Due Amount</span>
                <strong>${money(sale.dueAmount)}</strong>
              </div>

            </div>

            <div class="footer">
              Thank You
            </div>

          </div>
        </body>
        </html>
      `);

      printWindow.document.close();

      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
      }, 500);

    } else if (!printWindow) {
      toast.error(
        "Invoice Save হয়েছে, কিন্তু Browser Popup Block করেছে। Popup Allow করুন।"
      );
    }

    // =====================================
    // EXISTING RESET AND RELOAD
    // =====================================

    setShowSalesForm(false);
    resetSalesForm();

    await loadSalesInvoices();
    await loadProducts();
    await loadLots();
    await loadCustomers();

  } catch (error) {
    if (printWindow && !printWindow.closed) {
      printWindow.close();
    }

    toast.error(
      error.message || "Sales Invoice তৈরি করা যায়নি"
    );
  } finally {
    setSalesSaving(false);
  }
}


// Open New Sales Invoice
function openSalesForm() {
  resetSalesForm();
  setShowSalesForm(true);
}

// View Sales Invoice Details
async function loadSalesDetails(invoiceId) {
  try {
    setSalesDetailsLoading(true);
    setShowSalesDetails(true);
    setSelectedSalesInvoice(null);

    const result = await apiRequest(`/sales/${invoiceId}`);

    setSelectedSalesInvoice(result.data);
  } catch (error) {
    toast.error(error.message || "Invoice Details load করা যায়নি");
    setShowSalesDetails(false);
  } finally {
    setSalesDetailsLoading(false);
  }
}

// ========================================
// LOAD SALES RETURN DETAILS
// ========================================
async function loadSalesReturnDetails(invoiceId) {
  try {
    setSalesReturnLoading(true);
    setShowSalesReturn(true);
    setSelectedSalesReturn(null);
    setSalesReturnItems([]);
    setSalesReturnRefundMethod("CASH");
    setSalesReturnNotes("");

    const result = await apiRequest(
      `/sales-returns/sales/${invoiceId}`
    );

    const saleData = result.data?.sale;

    if (!saleData) {
      throw new Error("Invoice তথ্য পাওয়া যায়নি");
    }

    setSelectedSalesReturn(saleData);

    setSalesReturnItems(
      (saleData.items || []).map((item) => ({
        originalSaleItemId: item._id,
        productId: item.productId,
        productName: item.productName,
        lotCode: item.lotCode,
        stockType: item.stockType,

        originalBags: Number(item.bags || 0),
        originalWeightKg: Number(item.weightKg || 0),

        alreadyReturnedBags: Number(item.alreadyReturnedBags || 0),
        alreadyReturnedWeightKg: Number(
          item.alreadyReturnedWeightKg || 0
        ),

        returnableBags: Number(item.returnableBags || 0),
        returnableWeightKg: Number(item.returnableWeightKg || 0),

        saleRatePerKg: Number(item.saleRatePerKg || 0),

        commissionTotal: Number(item.commissionTotal || 0),
        productTotal: Number(item.productTotal || 0),
        labourTotal: Number(item.labourTotal || 0),

        returnBags: 0,
        returnWeightKg: 0,
      }))
    );
  } catch (error) {
    toast.error(error.message || "Sales Return Details load করা যায়নি");
    setShowSalesReturn(false);
  } finally {
    setSalesReturnLoading(false);
  }
}


// ========================================
// UPDATE SALES RETURN ITEM
// ========================================
function updateSalesReturnItem(index, field, value) {
  setSalesReturnItems((previousItems) =>
    previousItems.map((item, i) => {
      if (i !== index) return item;

      const updatedItem = { ...item };
      const numberValue = Number(value);

      if (field === "returnBags") {
        updatedItem.returnBags = Math.min(
          Math.max(0, numberValue || 0),
          item.returnableBags
        );
      }

      if (field === "returnWeightKg") {
        updatedItem.returnWeightKg = Math.min(
          Math.max(0, numberValue || 0),
          item.returnableWeightKg
        );
      }

      return updatedItem;
    })
  );
}


// ========================================
// SUBMIT SALES RETURN
// ========================================

async function submitSalesReturn() {
  try {
    if (!selectedSalesReturn?._id) {
      toast.error("Sales Invoice পাওয়া যায়নি");
      return;
    }

    const returnItems = salesReturnCalculation.items
      .filter(
        (item) =>
          Number(item.returnBags || 0) > 0 ||
          Number(item.returnWeightKg || 0) > 0
      )
      .map((item) => ({
        originalSaleItemId: item.originalSaleItemId,
        bags: Number(item.returnBags || 0),
        weightKg: Number(item.returnWeightKg || 0),
      }));

    if (returnItems.length === 0) {
      toast.error("কমপক্ষে একটি Product Return Quantity দিন");
      return;
    }

    if (salesReturnCalculation.returnAmount <= 0) {
      toast.error("Return Amount সঠিক নয়");
      return;
    }

    if (
      salesReturnCalculation.refundAmount > 0 &&
      !salesReturnRefundMethod
    ) {
      toast.error("Refund Method নির্বাচন করুন");
      return;
    }

    const confirmed = window.confirm(
      `আপনি কি Sales Return Confirm করতে চান?\n\n` +
      `Return Amount: ৳${salesReturnCalculation.returnAmount.toFixed(2)}\n` +
      `Due Adjustment: ৳${salesReturnCalculation.amountAdjusted.toFixed(2)}\n` +
      `Refund Amount: ৳${salesReturnCalculation.refundAmount.toFixed(2)}`
    );

    if (!confirmed) return;

    setSalesReturnSubmitting(true);

    const result = await apiRequest("/sales-returns", {
      method: "POST",
      body: JSON.stringify({
        saleId: selectedSalesReturn._id,
        items: returnItems,
        refundMethod: salesReturnRefundMethod,
        notes: salesReturnNotes.trim(),
      }),
    });

    toast.success(
      result.message || "Sales Return সফলভাবে সম্পন্ন হয়েছে"
    );

    setShowSalesReturn(false);
    setSelectedSalesReturn(null);
    setSalesReturnItems([]);

    await loadSalesInvoices();

  } catch (error) {
    toast.error(error.message || "Sales Return সম্পন্ন করা যায়নি");
  } finally {
    setSalesReturnSubmitting(false);
  }
}


// ========================================
// SALES RETURN FINANCIAL CALCULATION
// ========================================

const salesReturnCalculation = (() => {
  const items = salesReturnItems.map((item) => {
    const baseWeight = Number(item.originalWeightKg || 0);
    const baseBags = Number(item.originalBags || 0);

    const qtyReturnWeight = Number(item.returnWeightKg || 0);
    const qtyReturnBags = Number(item.returnBags || 0);

    const productTotal =
      baseWeight > 0
        ? (Number(item.productTotal || 0) / baseWeight) *
          qtyReturnWeight
        : 0;

    const commissionTotal =
      baseWeight > 0
        ? (Number(item.commissionTotal || 0) / baseWeight) *
          qtyReturnWeight
        : 0;

    const labourTotal =
      baseBags > 0
        ? (Number(item.labourTotal || 0) / baseBags) *
          qtyReturnBags
        : 0;

    return {
      ...item,
      calculatedReturnAmount:
        productTotal + commissionTotal + labourTotal,
    };
  });

  const returnAmount = items.reduce(
    (total, item) => total + item.calculatedReturnAmount,
    0
  );

  const previousDue = Math.max(
    0,
    Number(selectedSalesReturn?.currentCustomerDue || 0)
  );

  const amountAdjusted = Math.min(returnAmount, previousDue);

  const refundAmount = Math.max(
    0,
    returnAmount - amountAdjusted
  );

  return {
    items,
    returnAmount,
    previousDue,
    amountAdjusted,
    refundAmount,
    remainingDue: Math.max(0, previousDue - amountAdjusted),
  };
})();





async function editSalesInvoice(invoiceId) {
  try {
    toast.loading("Invoice loading...", { id: "edit-sales" });

    const result = await apiRequest(`/sales/${invoiceId}`);

    const invoice = result.data;

    if (!invoice || invoice.status !== "COMPLETED") {
      toast.error("এই Invoice Edit করা যাবে না", {
        id: "edit-sales",
      });
      return;
    }

    const customer = invoice.customerId;

    if (!customer?._id) {
      throw new Error("Invoice customer information পাওয়া যায়নি");
    }

    // ========================================
    // EDIT MODE STATE
    // ========================================
    setEditingSalesInvoiceId(invoice._id);
    setEditingOriginalCustomerId(String(customer._id));
    setEditingOriginalItems(invoice.items || []);

    // ========================================
    // CUSTOMER
    // ========================================
    const customerResult = await apiRequest(
      `/sales/customers/search?q=${encodeURIComponent(
        customer.customerName || customer.mobile || ""
      )}`
    );

    const matchedCustomer = (customerResult.data || []).find(
      (item) => String(item._id) === String(customer._id)
    );

   const currentBalanceExcludingInvoice = Number(
  invoice.currentBalanceExcludingInvoice ?? 0
);

const selectedCustomer = {
  ...(matchedCustomer || customer),
  currentBalance: currentBalanceExcludingInvoice,
};

setSelectedSalesCustomer(selectedCustomer);



    setSalesCustomerSearch(
      `${customer.customerName || ""}${
        customer.mobile ? ` - ${customer.mobile}` : ""
      }`
    );

    setSalesCustomerOptions([]);
    setShowSalesCustomerOptions(false);

    // ========================================
    // ORIGINAL PREVIOUS DUE
    // ========================================
    setEditingSalesPreviousDue(
      Number(invoice.previousDue || 0)
    );

    // ========================================
    // INVOICE ITEMS
    // ========================================
    const loadedItems = (invoice.items || []).map((item) => {
      const product = item.productId;
      const lot = item.lotId;

      return {
        productId: product?._id || product,
        productName:
          product?.productName || item.productName || "",

        lotId: lot?._id || lot,
        lotCode: lot?.lotCode || item.lotCode || "",

        supplierId:
          item.supplierId?._id ||
          item.supplierId ||
          "",

        supplierName: item.supplierName || "",

        stockType: item.stockType || "OWN",

        bags: Number(item.bags || 0),
        weightKg: Number(item.weightKg || 0),

        purchasePricePerKg: Number(
          item.purchasePricePerKg || 0
        ),

        saleRatePerKg: Number(item.saleRatePerKg || 0),

        commissionRatePerKg: Number(
          item.commissionRatePerKg || 0
        ),

        labourRatePerBag: Number(
          item.labourRatePerBag || 0
        ),

        productTotal: Number(item.productTotal || 0),
        commissionTotal: Number(item.commissionTotal || 0),
        labourTotal: Number(item.labourTotal || 0),
        lineTotal: Number(item.lineTotal || 0),
      };
    });

    setSalesItems(loadedItems);

    // ========================================
    // OTHER FORM FIELDS
    // ========================================
    const dateValue = invoice.invoiceDate
      ? new Date(invoice.invoiceDate)
      : new Date();

    setSalesForm({
      invoiceDate: dateValue.toISOString().split("T")[0],
      otherCost: String(invoice.otherCost || 0),
      discount: String(invoice.discount || 0),
      paidAmount: String(invoice.paidAmount || 0),
      paymentMethod: invoice.paymentMethod || "CASH",
      paymentReference: invoice.paymentReference || "",
      notes: invoice.notes || "",
    });

    // ========================================
    // OPEN SALES FORM
    // ========================================
    setShowSalesDetails(false);
    setShowSalesForm(true);

    toast.success("Invoice Edit করার জন্য Load হয়েছে", {
      id: "edit-sales",
    });
  } catch (error) {
    console.error("Edit Sales Invoice Load Error:", error);

    toast.error(
      error.message || "Invoice Edit-এর জন্য Load করা যায়নি",
      { id: "edit-sales" }
    );
  }
}

// ========================================
// CANCEL SALES INVOICE
// ========================================
async function cancelSalesInvoice(invoiceId) {
  const reason = window.prompt("Invoice cancel করার কারণ লিখুন:");

  if (!reason || !reason.trim()) {
    toast.error("Cancellation reason দিতে হবে");
    return;
  }

  const confirmed = window.confirm(
    "আপনি কি নিশ্চিত এই Invoice Cancel করতে চান? Stock এবং Customer Ledger সমন্বয় করা হবে।"
  );

  if (!confirmed) return;

  try {
    setCancellingSalesInvoice(true);

    const result = await apiRequest(`/sales/${invoiceId}/cancel`, {
      method: "PATCH",
      body: JSON.stringify({
        reason: reason.trim(),
      }),
    });

    toast.success(result.message || "Invoice successfully cancelled");

    setCancelReason("");

    // Cancel হওয়ার পর Invoice Details আবার Load
    await loadSalesDetails(invoiceId);

  } catch (error) {
    toast.error(error.message || "Invoice cancel করা যায়নি");
  } finally {
    setCancellingSalesInvoice(false);
  }
}

  async function loadProducts() {
    try {
      setLoading(true);
      const data = await apiRequest("/products");
      setProducts(data.products || []);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadSuppliers() {
    try {
      setLoading(true);
      const data = await apiRequest("/suppliers");
      setSuppliers(data.suppliers || []);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }
async function loadCustomers() {
  try {
    setCustomerLoading(true);
    const data = await apiRequest("/customers");
    setCustomers(data.customers || []);
  } catch (error) {
    toast.error(error.message);
  } finally {
    setCustomerLoading(false);
  }
}

// ========================================
// LOAD CUSTOMER DUE SUMMARY
// ========================================

async function loadCustomerDueSummary(filters = {}) {
  try {
    setDueSummaryLoading(true);

    const params = new URLSearchParams();

    if (filters.startDate) {
      params.append("startDate", filters.startDate);
    }

    if (filters.endDate) {
      params.append("endDate", filters.endDate);
    }

    if (filters.search) {
      params.append("search", filters.search);
    }

    if (filters.address) {
      params.append("address", filters.address);
    }

    const query = params.toString();

    const data = await apiRequest(
      `/customers/due-summary${query ? `?${query}` : ""}`
    );

    setDueSummaryCustomers(data.customers || []);
    setDueSummary(data.summary || {
      totalDueCustomers: 0,
      totalDueAmount: 0,
    });
  } catch (error) {
    toast.error(error.message);
  } finally {
    setDueSummaryLoading(false);
  }
}

// LOAD PENDING COMMISSION LOTS
async function loadCommissionLots() {
  try {
    setCommissionLoading(true);
    setCommissionError("");

    const result = await apiRequest("/commission/pending");

    const lots =
      result.lots ||
      result.data?.lots ||
      result.data ||
      [];

    setCommissionLots(Array.isArray(lots) ? lots : []);
  } catch (error) {
    setCommissionError(error.message);
    toast.error(error.message);
  } finally {
    setCommissionLoading(false);
  }
}
// LOAD COMMISSION INVOICE HISTORY
async function loadCommissionInvoices() {
  try {
    setCommissionHistoryLoading(true);
    setCommissionHistoryError("");

    const result = await apiRequest("/commission");

    const invoices =
      result.invoices ||
      result.data?.invoices ||
      result.data ||
      [];

    setCommissionInvoices(
      Array.isArray(invoices) ? invoices : []
    );
  } catch (error) {
    setCommissionHistoryError(error.message);
    toast.error(error.message);
  } finally {
    setCommissionHistoryLoading(false);
  }
}
// CANCEL COMMISSION INVOICE
async function cancelCommissionInvoice(invoiceId) {
  const reason = window.prompt(
    "Enter reason for cancelling this Commission Invoice:"
  );

  if (reason === null) return;

  if (!reason.trim()) {
    toast.error("Cancellation reason is required");
    return;
  }

  const confirmed = window.confirm(
    "Are you sure you want to cancel this Commission Invoice?"
  );

  if (!confirmed) return;

  try {
    const result = await apiRequest(
      `/commission/${invoiceId}/cancel`,
      {
        method: "PATCH",
        body: JSON.stringify({
          reason: reason.trim(),
        }),
      }
    );

    toast.success(
      result.message || "Commission Invoice cancelled successfully"
    );

    await loadCommissionInvoices();
  } catch (error) {
    toast.error(error.message);
  }
}
// OPEN COMMISSION INVOICE FOR EDIT
function openCommissionInvoiceEdit(invoice) {
  setEditingCommissionInvoice(invoice);

  setCommissionItems(
    invoice.items.map((item) => ({
      bags: String(item.bags ?? ""),
      weightKg: String(item.weightKg ?? ""),
      ratePerKg: String(item.ratePerKg ?? ""),
    }))
  );

  setCommissionTransportCost(invoice.transportCost ?? 0);
  setCommissionLabourRate(invoice.labourRatePerBag ?? 0);
  setCommissionRatePerKg(invoice.commissionRatePerKg ?? 0);
  setCommissionOtherCost(invoice.otherCost ?? 0);
  setCommissionNotes(invoice.notes || "");
  setCommissionEditReason("");
}
// UPDATE COMMISSION INVOICE
async function updateCommissionInvoice() {
  if (!editingCommissionInvoice) {
    toast.error("No Commission Invoice selected");
    return;
  }

  if (!commissionEditReason.trim()) {
    toast.error("Edit reason is required");
    return;
  }

  try {
    setCommissionEditSaving(true);

    const result = await apiRequest(
      `/commission/${editingCommissionInvoice._id}`,
      {
        method: "PATCH",
        body: JSON.stringify({
          invoiceDate: editingCommissionInvoice.invoiceDate,

          items: commissionItems.map((item) => ({
            bags: Number(item.bags),
            weightKg: Number(item.weightKg),
            ratePerKg: Number(item.ratePerKg),
          })),

          transportCost: Number(commissionTransportCost || 0),
          labourRatePerBag: Number(commissionLabourRate || 0),
          commissionRatePerKg: Number(commissionRatePerKg || 0),
          otherCost: Number(commissionOtherCost || 0),

          notes: commissionNotes.trim(),
          reason: commissionEditReason.trim(),
        }),
      }
    );

    toast.success(
      result.message || "Commission Invoice updated successfully"
    );

    setEditingCommissionInvoice(null);
    setCommissionEditReason("");

    await loadCommissionInvoices();
    await loadCommissionLots();
  } catch (error) {
    toast.error(error.message);
  } finally {
    setCommissionEditSaving(false);
  }
}
function resetCommissionReportFilters() {
  setCommissionReportFilters({
    startDate: "",
    endDate: "",
    supplierId: "",
    lotId: "",
  });

  setCommissionSupplierSearch("");
  setCommissionLotSearch("");

  setShowCommissionSupplierSuggestions(false);
  setShowCommissionLotSuggestions(false);
}
// LOAD COMMISSION REPORTS
async function loadCommissionReports() {
  try {
    setCommissionReportsLoading(true);

    const params = new URLSearchParams();

    if (commissionReportFilters.startDate) {
      params.set("startDate", commissionReportFilters.startDate);
    }

    if (commissionReportFilters.endDate) {
      params.set("endDate", commissionReportFilters.endDate);
    }

    if (commissionReportFilters.supplierId) {
      params.set("supplierId", commissionReportFilters.supplierId);
    }

    if (commissionReportFilters.lotId) {
      params.set("lotId", commissionReportFilters.lotId);
    }

    const result = await apiRequest(
      `/commission/reports?${params.toString()}`
    );
setCommissionReports({
  summary: result.summary || {},
  invoices: result.data || [],
  supplierOptions: result.supplierOptions || [],
  lotOptions: result.lotOptions || [],
});

  } catch (error) {
    toast.error(error.message);
  } finally {
    setCommissionReportsLoading(false);
  }
}


async function loadLots() {
  try {
    setLotLoading(true);

    const result = await apiRequest("/lots");

    setLots(result.data || []);
  } catch (error) {
    toast.error(error.message || "Purchase history load করা যায়নি");
  } finally {
    setLotLoading(false);
  }
}

async function loadActivities(page = 1, resetFilters = false) {
  try {
    setActivityLoading(true);

    const params = new URLSearchParams({
      page: String(page),
      limit: "20",
    });

    if (!resetFilters && activitySearch.trim()) {
      params.set("search", activitySearch.trim());
    }

    if (!resetFilters && activityModule) {
      params.set("module", activityModule);
    }

    if (!resetFilters && activityAction) {
      params.set("action", activityAction);
    }

    if (!resetFilters && activityStartDate) {
      params.set("startDate", activityStartDate);
    }

    if (!resetFilters && activityEndDate) {
      params.set("endDate", activityEndDate);
    }

    const result = await apiRequest(`/activities?${params.toString()}`);

    setActivities(result.data?.activities || []);
    setActivityPage(result.data?.page || 1);
    setActivityTotalPages(result.data?.totalPages || 1);
  } catch (error) {
    toast.error(error.message || "Activity Log load করা যায়নি");
  } finally {
    setActivityLoading(false);
  }
}


useEffect(() => {
  if (activePage === "Purchases") {
    loadPurchasePaymentReport();
  }
}, [
  activePage,
  purchaseFilters.startDate,
  purchaseFilters.endDate,
]);

useEffect(() => {
  if (activePage === "Activity Log") {
    loadActivities(1);
  }
}, [activePage]);

useEffect(() => {
  if (activePage === "Sales") {
    loadSalesInvoices();
  }
}, [activePage]);

// Load Sales Dashboard when dashboard page opens
useEffect(() => {
  if (activePage === "Sales Dashboard") {
    loadSalesDashboard();
  }
}, [activePage]);

// Load OWN Sales Reports when report page opens


useEffect(() => {
  const reportPages = {
    "Daily Sales Summary": "daily",
    "Weekly Sales Summary": "weekly",
    "Monthly Sales Summary": "monthly",
    "Yearly Sales Summary": "yearly",
    "Lot Wise Sales": "lot",
    "Product Wise Sales": "product",
    "Category Wise Sales": "category",
    "Supplier Wise Sales": "supplier",
    "OWN Profit / Loss": "profit-loss",
  };

  const reportType = reportPages[activePage];

  if (!reportType) return;

  if (reportType === "profit-loss") {
    loadOwnSalesRegister();
    return;
  }

  // Local date format: YYYY-MM-DD
  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  const today = new Date();

  let from = ownSalesReportFrom;
  let to = ownSalesReportTo;

  if (reportType === "daily") {
    from = formatDate(today);
    to = formatDate(today);
  }

  if (reportType === "weekly") {
    // Saturday to Friday
    const day = today.getDay();
    const daysFromSaturday = (day + 1) % 7;

    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - daysFromSaturday);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    from = formatDate(weekStart);
    to = formatDate(weekEnd);
  }

  if (reportType === "monthly") {
    const monthStart = new Date(
      today.getFullYear(),
      today.getMonth(),
      1
    );

    const monthEnd = new Date(
      today.getFullYear(),
      today.getMonth() + 1,
      0
    );

    from = formatDate(monthStart);
    to = formatDate(monthEnd);
  }

  if (reportType === "yearly") {
    from = `${today.getFullYear()}-01-01`;
    to = `${today.getFullYear()}-12-31`;
  }

  // Update Date Input fields
  setOwnSalesReportFrom(from);
  setOwnSalesReportTo(to);

  // Automatically load report
  loadOwnSalesReport(reportType, from, to);

}, [activePage]);


const purchaseTotalAmount =
  purchaseForm.productId &&
  products.find(
    (p) => String(p._id) === String(purchaseForm.productId)
  )?.stockType === "COMMISSION"
    ? 0
    : (Number(purchaseForm.totalWeightKg) || 0) *
      (Number(purchaseForm.purchasePricePerKg) || 0);
async function submitPurchase(e) {
  e.preventDefault();

  if (!purchaseForm.productId) {
    toast.error("Please select a product");
    return;
  }

  if (Number(purchaseForm.totalWeightKg) <= 0) {
    toast.error("Total weight must be greater than zero");
    return;
  }

  if (Number(purchaseForm.purchasePricePerKg) < 0) {
    toast.error("Invalid purchase price");
    return;
  }

  try {
    setLotLoading(true);

    const result = await apiRequest("/lots", {
      method: "POST",
      body: JSON.stringify(purchaseForm),
    });

    toast.success(result.message || "Purchase added successfully");

    setPurchaseForm({
      supplierId: "",
      productId: "",
      purchaseDate: new Date().toISOString().split("T")[0],
      bagsReceived: "",
      totalWeightKg: "",
      purchasePricePerKg: "",
      notes: "",
    });

    setShowPurchaseForm(false);

    await loadLots();
    await loadProducts();
  } catch (error) {
    toast.error(error.message || "Purchase save করা যায়নি");
  } finally {
    setLotLoading(false);
  }
}


// ======================================
// PURCHASE RETURN FUNCTIONS
// ======================================

function openPurchaseReturn(lot) {
  setReturnLot(lot);

  setReturnForm({
    bagsReturned: "0",
    weightReturnedKg: "",
    returnDate: new Date().toISOString().split("T")[0],
    notes: "",
  });

  setShowReturnForm(true);
}

async function submitPurchaseReturn(e) {
  e.preventDefault();

  if (!returnLot) {
    toast.error("Lot পাওয়া যায়নি");
    return;
  }

  const bagsReturned = Number(returnForm.bagsReturned || 0);
  const weightReturnedKg = Number(returnForm.weightReturnedKg || 0);

  if (!Number.isInteger(bagsReturned) || bagsReturned < 0) {
    toast.error("সঠিক বস্তার সংখ্যা দিন");
    return;
  }

  if (weightReturnedKg <= 0) {
    toast.error("ফেরত দেওয়ার কেজি লিখুন");
    return;
  }

  if (bagsReturned > Number(returnLot.remainingBags || 0)) {
    toast.error("অবশিষ্ট বস্তার চেয়ে বেশি ফেরত দেওয়া যাবে না");
    return;
  }

  if (weightReturnedKg > Number(returnLot.remainingWeightKg || 0)) {
    toast.error("অবশিষ্ট স্টকের চেয়ে বেশি ফেরত দেওয়া যাবে না");
    return;
  }

  try {
    setReturnLoading(true);

    const result = await apiRequest(`/lots/${returnLot._id}/returns`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        bagsReturned,
        weightReturnedKg,
        returnDate: returnForm.returnDate,
        notes: returnForm.notes,
      }),
    });

    toast.success(result.message || "Purchase Return সফল হয়েছে");

    setShowReturnForm(false);
    setReturnLot(null);

    await loadLots();
    await loadProducts();
  } catch (error) {
    toast.error(error.message || "Purchase Return করা যায়নি");
  } finally {
    setReturnLoading(false);
  }
}

// ======================================
// OPEN LOT EDIT FORM
// ======================================

function openLotEdit(lot) {
  setEditingLot(lot);

  setLotEditForm({
    supplierId:
      lot.supplierId?._id || lot.supplierId || "",
    purchaseDate: lot.purchaseDate
      ? new Date(lot.purchaseDate).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0],
    bagsReceived: String(lot.bagsReceived ?? 0),
    totalWeightKg: String(lot.totalWeightKg ?? ""),
    purchasePricePerKg: String(lot.purchasePricePerKg ?? ""),
    notes: lot.notes || "",
    editReason: "",
  });

  setShowLotEditForm(true);
}

// ======================================
// SUBMIT LOT EDIT
// ======================================

async function submitLotEdit(e) {
  e.preventDefault();

  if (!editingLot) {
    toast.error("Purchase Lot পাওয়া যায়নি");
    return;
  }

  const bagsReceived = Number(lotEditForm.bagsReceived);
  const totalWeightKg = Number(lotEditForm.totalWeightKg);
  const purchasePricePerKg = Number(lotEditForm.purchasePricePerKg);

  if (!Number.isInteger(bagsReceived) || bagsReceived < 0) {
    toast.error("সঠিক বস্তার সংখ্যা দিন");
    return;
  }

  if (!Number.isFinite(totalWeightKg) || totalWeightKg <= 0) {
    toast.error("সঠিক Total Weight দিন");
    return;
  }

  if (!Number.isFinite(purchasePricePerKg) || purchasePricePerKg < 0) {
    toast.error("সঠিক Purchase Price দিন");
    return;
  }

  try {
    setLotEditLoading(true);

    const result = await apiRequest(`/lots/${editingLot._id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
     body: JSON.stringify({
  supplierId: lotEditForm.supplierId || null,
  purchaseDate: lotEditForm.purchaseDate,
  bagsReceived,
  totalWeightKg,
  purchasePricePerKg,
  editReason: lotEditForm.editReason.trim(),
}),
    });

    toast.success(result.message || "Purchase Lot সফলভাবে আপডেট হয়েছে");

    setShowLotEditForm(false);
    setEditingLot(null);

    await loadLots();
    await loadProducts();
  } catch (error) {
    toast.error(error.message || "Purchase Edit করা যায়নি");
  } finally {
    setLotEditLoading(false);
  }
}

const loadCategories = async () => {
  try {
    setCategoryLoading(true);
    const result = await apiRequest("/categories");

    if (result.success) {
      setCategories(result.categories || []);
    }
  } catch (error) {
    toast.error("Categories load করা যায়নি");
  } finally {
    setCategoryLoading(false);
  }
};


useEffect(() => {
  if (activePage === "Products") loadProducts();
  if (activePage === "Suppliers") loadSuppliers();
if (activePage === "Customer List") {
  loadCustomers();
}

if (activePage === "Customer Due Summary") {
  loadCustomerDueSummary({
    startDate: dueStartDate,
    endDate: dueEndDate,
    search: dueCustomerSearch,
    address: dueCustomerAddress,
  });
}
  if (activePage === "Categories") loadCategories();

  if (activePage === "Purchases") {
    loadProducts();
    loadSuppliers();
    loadLots();
  }
  if (activePage === "Commission Management") loadCommissionLots();

if (activePage === "Commission History") {
  loadCommissionInvoices();
}

if (activePage === "Commission Reports") {
  loadCommissionReports();
  loadSuppliers();
  loadLots();
}

}, [activePage]);
 

function openProductForm(product = null) {
  // Product Form খোলার আগে Category ও Supplier Load
  loadCategories();
  loadSuppliers();

  if (product) {
    setEditingId(product._id);

    setProductForm({
      productName: product.productName || "",
      category: product.category || "",
      subcategory: product.subcategory || "",
      brand: product.brand || "",
      stockType: product.stockType || "OWN",
      supplier: product.supplier?._id || product.supplier || "",
      packingType: product.packingType || "BAG",
      unit: product.unit || "KG",
      purchasePrice: product.purchasePrice || 0,
      salePrice: product.salePrice || 0,
      minimumStockKg: product.minimumStockKg || 0,
      description: product.description || "",
    });
  } else {
    setEditingId(null);
    setProductForm({ ...emptyProduct });
  }

  setShowForm(true);
}



  function openSupplierForm(supplier = null) {
    if (supplier) {
      setEditingId(supplier._id);
      setSupplierForm({
        supplierName: supplier.supplierName || "",
        companyName: supplier.companyName || "",
        contactPerson: supplier.contactPerson || "",
        mobile: supplier.mobile || "",
        alternateMobile: supplier.alternateMobile || "",
        address: supplier.address || "",
        openingBalance: supplier.openingBalance || 0,
        notes: supplier.notes || "",
      });
    } else {
      setEditingId(null);
      setSupplierForm({ ...emptySupplier });
    }

    setShowForm(true);
  }


  function openCustomerForm(customer = null) {
  if (customer) {
    setEditingCustomerId(customer._id);

    setCustomerForm({
      customerName: customer.customerName || "",
      companyName: customer.companyName || "",
      contactPerson: customer.contactPerson || "",
      mobile: customer.mobile || "",
      alternateMobile: customer.alternateMobile || "",
      address: customer.address || "",
      customerType: customer.customerType || "REGULAR",
      openingBalance: customer.openingBalance || 0,
      notes: customer.notes || "",
    });
  } else {
    setEditingCustomerId(null);

    setCustomerForm({
      customerName: "",
      companyName: "",
      contactPerson: "",
      mobile: "",
      alternateMobile: "",
      address: "",
      customerType: "REGULAR",
      openingBalance: "0",
      notes: "",
    });
  }

  setShowCustomerForm(true);
}
const saveCategory = async () => {
  try {
    if (!categoryForm.productName.trim()) {
      toast.error("Product Name দিন");
      return;
    }

    if (!categoryForm.categoryName.trim()) {
      toast.error("Category Name দিন");
      return;
    }

    const result = await apiRequest("/categories", {
      method: "POST",
      body: JSON.stringify({
        productName: categoryForm.productName.trim(),
        categoryName: categoryForm.categoryName.trim(),
      }),
    });

    if (result.success) {
      toast.success("Category successfully added");
      setCategoryForm({
        productName: "",
        categoryName: "",
      });
      loadCategories();
    } else {
      toast.error(result.message || "Category add করা যায়নি");
    }
  } catch (error) {
    toast.error(error.message || "Category add করতে সমস্যা হয়েছে");
  }
};


const updateCategory = async (categoryId) => {
  if (!editingCategoryProduct.trim()) {
    toast.error("Product Name দিন");
    return;
  }

  if (!editingCategoryName.trim()) {
    toast.error("Category Name দিন");
    return;
  }

  try {
    const result = await apiRequest(`/categories/${categoryId}`, {
      method: "PUT",
      body: JSON.stringify({
        productName: editingCategoryProduct.trim(),
        categoryName: editingCategoryName.trim(),
      }),
    });

    if (result.success) {
      toast.success("Category updated successfully");
      setEditingCategoryId(null);
      setEditingCategoryName("");
      setEditingCategoryProduct("");
      loadCategories();
    } else {
      toast.error(result.message || "Category update করা যায়নি");
    }
  } catch (error) {
    toast.error(error.message || "সমস্যা হয়েছে");
  }
};


const deactivateCategory = async (id) => {
  if (!window.confirm("এই Category Deactivate করতে চান?")) return;

  try {
    const result = await apiRequest(`/categories/${id}`, {
      method: "DELETE",
    });

    if (result.success) {
      toast.success("Category deactivated");
      loadCategories();
    } else {
      toast.error(result.message || "Category deactivate করা যায়নি");
    }
  } catch (error) {
    toast.error(error.message || "সমস্যা হয়েছে");
  }
};

  async function saveProduct(e) {
    e.preventDefault();

    try {
      const payload = {
        ...productForm,
        purchasePrice: Number(productForm.purchasePrice),
        salePrice: Number(productForm.salePrice),
        minimumStockKg: Number(productForm.minimumStockKg),
        supplier: productForm.supplier || null,
      };

      const url = editingId
        ? `/products/${editingId}`
        : "/products";

      await apiRequest(url, {
        method: editingId ? "PUT" : "POST",
        body: JSON.stringify(payload),
      });

      toast.success(editingId ? "Product updated" : "Product added");
      setShowForm(false);
      setEditingId(null);
      setProductForm({ ...emptyProduct });
      loadProducts();
    } catch (error) {
      toast.error(error.message);
    }
  }

  async function saveSupplier(e) {
    e.preventDefault();

    try {
      const payload = {
        ...supplierForm,
        openingBalance: Number(supplierForm.openingBalance),
      };

      const url = editingId
        ? `/suppliers/${editingId}`
        : "/suppliers";

      await apiRequest(url, {
        method: editingId ? "PUT" : "POST",
        body: JSON.stringify(payload),
      });

      toast.success(editingId ? "Supplier updated" : "Supplier added");
      setShowForm(false);
      setEditingId(null);
      setSupplierForm({ ...emptySupplier });
      loadSuppliers();
    } catch (error) {
      toast.error(error.message);
    }
  }


  async function saveCustomer(e) {
  e.preventDefault();

  try {
    const payload = {
      ...customerForm,
      openingBalance: Number(customerForm.openingBalance),
    };

    const url = editingCustomerId
      ? `/customers/${editingCustomerId}`
      : "/customers";

    await apiRequest(url, {
      method: editingCustomerId ? "PUT" : "POST",
      body: JSON.stringify(payload),
    });

    toast.success(
      editingCustomerId ? "Customer updated" : "Customer added"
    );

    setShowCustomerForm(false);
    setEditingCustomerId(null);

    setCustomerForm({
      customerName: "",
      companyName: "",
      contactPerson: "",
      mobile: "",
      alternateMobile: "",
      address: "",
      customerType: "REGULAR",
      openingBalance: "0",
      notes: "",
    });

    loadCustomers();
  } catch (error) {
    toast.error(error.message);
  }
}
// ======================================
// OPEN SUPPLIER PAYMENT FORM
// ======================================
function openSupplierPayment(supplier) {
  setPaymentSupplier(supplier);

  setPaymentForm({
    amount: "",
    paymentMethod: "CASH",
    transactionId: "",
    transactionDate: new Date().toISOString().split("T")[0],
    notes: "",
  });

  setShowPaymentForm(true);
}

function openCustomerPayment(customer) {
  setPaymentCustomer(customer);

  setCustomerPaymentForm({
    amount: "",
    paymentMethod: "CASH",
    transactionId: "",
    transactionDate: new Date().toISOString().split("T")[0],
    notes: "",
  });

  setShowCustomerPaymentForm(true);
}
// ======================================
// SUBMIT SUPPLIER PAYMENT
// ======================================
async function submitSupplierPayment(e) {
  e.preventDefault();

  if (!paymentSupplier) {
    toast.error("Supplier নির্বাচন করা হয়নি");
    return;
  }

  const amount = Number(paymentForm.amount);

  if (!amount || amount <= 0) {
    toast.error("সঠিক Payment Amount দিন");
    return;
  }

  try {
    setPaymentLoading(true);

    const result = await apiRequest(
      `/suppliers/${paymentSupplier._id}/payments`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...paymentForm,
          amount,
        }),
      }
    );

    toast.success(
      result.message || "Supplier Payment সফলভাবে সংরক্ষণ হয়েছে"
    );

    setShowPaymentForm(false);
    setPaymentSupplier(null);

    setPaymentForm({
      amount: "",
      paymentMethod: "CASH",
      transactionId: "",
      transactionDate: new Date().toISOString().split("T")[0],
      notes: "",
    });

  } catch (error) {
    toast.error(error.message || "Payment সংরক্ষণ করা যায়নি");
  } finally {
    setPaymentLoading(false);
  }
}
async function submitCustomerPayment(e) {
  e.preventDefault();

  if (!paymentCustomer) {
    toast.error("Customer নির্বাচন করা হয়নি");
    return;
  }

  const amount = Number(customerPaymentForm.amount);

  if (!amount || amount <= 0) {
    toast.error("সঠিক Payment Amount দিন");
    return;
  }

  try {
    setCustomerPaymentLoading(true);

    const result = await apiRequest(
      `/customers/${paymentCustomer._id}/payments`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...customerPaymentForm,
          amount,
        }),
      }
    );

    toast.success(
      result.message || "Customer Payment সফলভাবে সংরক্ষণ হয়েছে"
    );

    setShowCustomerPaymentForm(false);
    setPaymentCustomer(null);

    setCustomerPaymentForm({
      amount: "",
      paymentMethod: "CASH",
      transactionId: "",
      transactionDate: new Date().toISOString().split("T")[0],
      notes: "",
    });

    loadCustomers();
  } catch (error) {
    toast.error(error.message || "Payment সংরক্ষণ করা যায়নি");
  } finally {
    setCustomerPaymentLoading(false);
  }
}
// OPEN PAYMENT HISTORY
function openPaymentHistory(item) {
  if (!item || item.type !== "PAYMENT") {
    toast.error("Payment তথ্য পাওয়া যায়নি");
    return;
  }

  setSelectedPaymentHistory(item);
  setShowPaymentHistory(true);
}

// ======================================
// OPEN PAYMENT EDIT
// ======================================
function openPaymentEdit(item, supplier) {
  if (!item || item.type !== "PAYMENT" || item.isVoided) {
    toast.error("এই Payment Edit করা যাবে না");
    return;
  }

  const paymentDate = item.transactionDate || item.createdAt;

  setEditingPayment(item);

  setPaymentEditForm({
    amount: String(item.amount || item.credit || ""),
    paymentMethod: item.paymentMethod || "CASH",
    transactionId: item.transactionId || "",
    transactionDate: paymentDate
      ? new Date(paymentDate).toISOString().split("T")[0]
      : "",
    description: item.description || "",
    supplierId: String(supplier?._id || ledgerSupplier?._id || ""),
    reason: "",
  });

  setShowPaymentEdit(true);
}

// ======================================
// SUBMIT PAYMENT EDIT
// ======================================
async function submitPaymentEdit(e) {
  e.preventDefault();

  if (!editingPayment || !ledgerSupplier) {
    toast.error("Payment তথ্য পাওয়া যায়নি");
    return;
  }

  const amount = Number(paymentEditForm.amount);

  if (!amount || amount <= 0) {
    toast.error("সঠিক Payment Amount দিন");
    return;
  }

  if (!paymentEditForm.reason.trim()) {
    toast.error("Correction Reason লিখুন");
    return;
  }

  if (!paymentEditForm.transactionDate) {
    toast.error("Payment Date নির্বাচন করুন");
    return;
  }

  try {
    setPaymentEditLoading(true);

    const result = await apiRequest(
      `/suppliers/${ledgerSupplier._id}/payments/${editingPayment._id}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount,
          paymentMethod: paymentEditForm.paymentMethod,
          transactionId: paymentEditForm.transactionId,
          transactionDate: paymentEditForm.transactionDate,
          notes: paymentEditForm.description,
          supplierId: paymentEditForm.supplierId,
          reason: paymentEditForm.reason,
        }),
      }
    );

    toast.success(
      result.message || "Payment Correction সফল হয়েছে"
    );

    setShowPaymentEdit(false);
    setEditingPayment(null);

    await loadSupplierLedger(ledgerSupplier);

  } catch (error) {
    toast.error(error.message || "Payment Correction করা যায়নি");
  } finally {
    setPaymentEditLoading(false);
  }
}

async function submitCustomerPaymentEdit(e) {
  e.preventDefault();

  if (!editingCustomerPayment || !ledgerCustomer) {
    toast.error("Customer Payment তথ্য পাওয়া যায়নি");
    return;
  }

  const amount = Number(customerPaymentEditForm.amount);

  if (!amount || amount <= 0) {
    toast.error("সঠিক Payment Amount দিন");
    return;
  }

  if (!customerPaymentEditForm.reason.trim()) {
    toast.error("Correction Reason লিখুন");
    return;
  }

  if (!customerPaymentEditForm.transactionDate) {
    toast.error("Payment Date নির্বাচন করুন");
    return;
  }

  try {
    setCustomerPaymentEditLoading(true);

    const result = await apiRequest(
      `/customers/${ledgerCustomer._id}/payments/${editingCustomerPayment._id}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount,
          paymentMethod: customerPaymentEditForm.paymentMethod,
          transactionId: customerPaymentEditForm.transactionId,
          reference: customerPaymentEditForm.reference,
          transactionDate: customerPaymentEditForm.transactionDate,
          description: customerPaymentEditForm.description,
          reason: customerPaymentEditForm.reason,
        }),
      }
    );

    toast.success(
      result.message || "Customer Payment Correction সফল হয়েছে"
    );

    setShowCustomerPaymentEdit(false);
    setEditingCustomerPayment(null);

    await loadCustomerLedger(
      ledgerCustomer,
      1,
      customerLedgerFilters
    );

    await loadCustomerDueSummary({
      startDate: dueStartDate,
      endDate: dueEndDate,
      search: dueCustomerSearch,
      address: dueCustomerAddress,
    });

  } catch (error) {
    toast.error(
      error.message || "Customer Payment Correction করা যায়নি"
    );
  } finally {
    setCustomerPaymentEditLoading(false);
  }
}

// ======================================
// OPEN PAYMENT VOID
// ======================================
function openPaymentVoid(item) {
  if (!item || item.type !== "PAYMENT" || item.isVoided) {
    toast.error("এই Payment Void করা যাবে না");
    return;
  }

  setVoidingPayment(item);
  setPaymentVoidReason("");
  setShowPaymentVoid(true);
}

// ======================================
// SUBMIT PAYMENT VOID
// ======================================
async function submitPaymentVoid(e) {
  e.preventDefault();

  if (!voidingPayment || !ledgerSupplier) {
    toast.error("Payment তথ্য পাওয়া যায়নি");
    return;
  }

  if (!paymentVoidReason.trim()) {
    toast.error("Void করার কারণ লিখুন");
    return;
  }

  try {
    setPaymentVoidLoading(true);

    const result = await apiRequest(
      `/suppliers/${ledgerSupplier._id}/payments/${voidingPayment._id}/void`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reason: paymentVoidReason,
        }),
      }
    );

    toast.success(
      result.message || "Payment সফলভাবে Void হয়েছে"
    );

    setShowPaymentVoid(false);
    setVoidingPayment(null);
    setPaymentVoidReason("");

    await loadSupplierLedger(ledgerSupplier);

  } catch (error) {
    toast.error(error.message || "Payment Void করা যায়নি");
  } finally {
    setPaymentVoidLoading(false);
  }
}

async function submitCustomerPaymentVoid(e) {
  e.preventDefault();

  if (!voidingCustomerPayment || !ledgerCustomer) {
    toast.error("Customer Payment তথ্য পাওয়া যায়নি");
    return;
  }

  if (!customerPaymentVoidReason.trim()) {
    toast.error("Void করার কারণ লিখুন");
    return;
  }

  try {
    setCustomerPaymentVoidLoading(true);

    const result = await apiRequest(
      `/customers/${ledgerCustomer._id}/payments/${voidingCustomerPayment._id}/void`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reason: customerPaymentVoidReason,
        }),
      }
    );

    toast.success(
      result.message || "Customer Payment সফলভাবে Void হয়েছে"
    );

    setShowCustomerPaymentVoid(false);
    setVoidingCustomerPayment(null);
    setCustomerPaymentVoidReason("");

    await loadCustomerLedger(
      ledgerCustomer,
      1,
      customerLedgerFilters
    );

    await loadCustomerDueSummary({
      startDate: dueStartDate,
      endDate: dueEndDate,
      search: dueCustomerSearch,
      address: dueCustomerAddress,
    });

  } catch (error) {
    toast.error(
      error.message || "Customer Payment Void করা যায়নি"
    );
  } finally {
    setCustomerPaymentVoidLoading(false);
  }
}

// ======================================
// LOAD SUPPLIER LEDGER
// ======================================

async function loadSupplierLedger(
  supplier,
  page = 1,
  filters = ledgerFilters
) {
  try {
    setLedgerLoading(true);
    setLedgerSupplier(supplier);
    setShowSupplierLedger(true);
    setLedgerPage(page);

    const params = new URLSearchParams();

    params.append("page", page);
    params.append("limit", ledgerLimit);

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== "" && value !== null && value !== undefined) {
        params.append(key, value);
      }
    });

    const result = await apiRequest(
      `/suppliers/${supplier._id}/ledger?${params.toString()}`
    );

    setLedgerData(result.data || result);

  } catch (error) {
    toast.error(error.message || "Supplier Ledger লোড করা যায়নি");
    setShowSupplierLedger(false);
  } finally {
    setLedgerLoading(false);
  }
}

async function loadCustomerLedger(
  customer,
  page = 1,
  filters = {}
) {
  try {
    setCustomerLedgerLoading(true);
    setCustomerLedgerPage(page);
setCustomerLedgerFilters(filters);
    setLedgerCustomer(customer);
    setShowCustomerLedger(true);

    const params = new URLSearchParams();

    params.append("page", page);
    params.append("limit", ledgerLimit);

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== "" && value !== null && value !== undefined) {
        params.append(key, value);
      }
    });

    const result = await apiRequest(
      `/customers/${customer._id}/ledger?${params.toString()}`
    );
setCustomerLedgerData({
  ...result,
  ...(result.data || {}),
});

  } catch (error) {
    toast.error(error.message || "Customer Ledger লোড করা যায়নি");
  
  } finally {
    setCustomerLedgerLoading(false);
  }
}

async function loadCustomerStatement(
  customer,
  startDate = "",
  endDate = ""
) {
  try {
    setCustomerStatementLoading(true);
    setStatementCustomer(customer);
    setShowCustomerStatement(true);

    setCustomerStatementFilters({
      startDate,
      endDate,
    });

    const params = new URLSearchParams();

    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);

    const result = await apiRequest(
      `/customers/${customer._id}/statement?${params.toString()}`
    );

    setCustomerStatementData(result.data || result);

  } catch (error) {
    toast.error(
      error.message || "Customer Statement লোড করা যায়নি"
    );
  } finally {
    setCustomerStatementLoading(false);
  }
}

async function loadSupplierStatement(
  supplier = statementSupplier,
  startDate = statementStartDate,
  endDate = statementEndDate
) {
  if (!supplier?._id) {
    toast.error("Supplier পাওয়া যায়নি");
    return;
  }

  try {
    setStatementLoading(true);
    setStatementSupplier(supplier);
    setStatementData(null);
    setShowSupplierStatement(true);

    const params = new URLSearchParams();

    if (startDate) {
      params.append("startDate", startDate);
    }

    if (endDate) {
      params.append("endDate", endDate);
    }

    const query = params.toString()
      ? `?${params.toString()}`
      : "";

    const result = await apiRequest(
      `/suppliers/${supplier._id}/statement${query}`
    );

    setStatementData(result.data || result);

  } catch (error) {
    toast.error(error.message || "Supplier Statement লোড করা যায়নি");
    setShowSupplierStatement(false);
  } finally {
    setStatementLoading(false);
  }
}


// ======================================
// LOAD ALL SUPPLIER REPORT
// ======================================

async function loadAllSupplierReport(
  filters = allSupplierReportFilters
) {
  try {
    setAllSupplierReportLoading(true);
    setAllSupplierReport(null);

    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        params.append(key, value);
      }
    });

    const query = params.toString()
      ? `?${params.toString()}`
      : "";

    const result = await apiRequest(
      `/suppliers/all-report${query}`
    );

    setAllSupplierReport(result.data || result);

  } catch (error) {
    toast.error(
      error.message || "All Supplier Report লোড করা যায়নি"
    );
  } finally {
    setAllSupplierReportLoading(false);
  }
}



async function loadAllCustomerReport(
  filters = allCustomerReportFilters
) {
  try {
    setAllCustomerReportLoading(true);
    setAllCustomerReport(null);

    // ========================================
    // BUILD QUERY PARAMS
    // ========================================
    const params = new URLSearchParams();

    Object.entries(filters || {}).forEach(([key, value]) => {
      if (
        value !== undefined &&
        value !== null &&
        value !== ""
      ) {
        params.append(key, String(value));
      }
    });

    const query = params.toString()
      ? `?${params.toString()}`
      : "";

    // ========================================
    // API CALL
    // ========================================
    const result = await apiRequest(
      `/customers/all-report${query}`
    );

    // ========================================
    // NORMALIZE API RESPONSE
    // ========================================
    let raw = result;

    for (let i = 0; i < 3; i++) {
      if (
        raw?.data &&
        !raw?.summary &&
        !raw?.customerSummary &&
        !raw?.transactions
      ) {
        raw = raw.data;
      } else {
        break;
      }
    }

    if (
      !raw ||
      !raw.summary ||
      !Array.isArray(raw.customerSummary) ||
      !Array.isArray(raw.transactions)
    ) {
      throw new Error("Customer Report Data Invalid");
    }

    const rawSummary = raw.summary;

    const rawTransactions = raw.transactions;

    const rawCustomers = raw.customerSummary;

    // ========================================
    // NORMALIZE TRANSACTIONS
    // ========================================
    const transactions = rawTransactions.map((item) => {
      const customer = item.customer || {};

      return {
        ...item,

        customerName:
          customer.customerName ||
          item.customerName ||
          "Unknown Customer",

        companyName:
          customer.companyName ||
          item.companyName ||
          "",

        mobile:
          customer.mobile ||
          item.mobile ||
          "",

        address:
          customer.address ||
          item.address ||
          "",

        openingBalance: Number(
          customer.openingBalance ||
          item.openingBalance ||
          0
        ),
      };
    });

    // ========================================
    // CUSTOMER TRANSACTION MAP
    // ========================================
    const customerMap = new Map();

    // First initialize from customerSummary
    rawCustomers.forEach((customer) => {
      const id = String(customer.customerId || "");

      if (!id) return;

      customerMap.set(id, {
        ...customer,

        customerId: id,

        transactionCount: Number(
          customer.transactionCount ??
          customer.totalTransactions ??
          0
        ),

        openingBalance: Number(
          customer.openingBalance || 0
        ),

        totalSales: 0,
        totalPayment: 0,
        totalSalesReturn: 0,
        totalAdjustmentDebit: 0,
        totalAdjustmentCredit: 0,

        totalDebit: Number(customer.totalDebit || 0),
        totalCredit: Number(customer.totalCredit || 0),
      });
    });

    // ========================================
    // PROCESS TRANSACTIONS
    // ========================================
    transactions.forEach((item) => {
      const id = String(
        item.customerId ||
        item.customer?._id ||
        ""
      );

      if (!id) return;

      if (!customerMap.has(id)) {
        customerMap.set(id, {
          customerId: id,
          customerName: item.customerName,
          companyName: item.companyName,
          mobile: item.mobile,
          address: item.address,
          transactionCount: 0,
          openingBalance: 0,
          totalSales: 0,
          totalPayment: 0,
          totalSalesReturn: 0,
          totalAdjustmentDebit: 0,
          totalAdjustmentCredit: 0,
          totalDebit: 0,
          totalCredit: 0,
        });
      }

      const customer = customerMap.get(id);

      // Customer information
      customer.customerName =
        item.customerName ||
        customer.customerName ||
        "Unknown Customer";

      customer.companyName =
        item.companyName ||
        customer.companyName ||
        "";

      customer.mobile =
        item.mobile ||
        customer.mobile ||
        "";

      customer.address =
        item.address ||
        customer.address ||
        "";

      customer.openingBalance = Number(
        item.openingBalance ??
        customer.openingBalance ??
        0
      );

      customer.transactionCount += 1;

      const debit = Number(item.debit || 0);
      const credit = Number(item.credit || 0);
      const amount = Number(item.amount || 0);

      customer.totalDebit += 0;
      customer.totalCredit += 0;

      // Category-wise totals
      switch (item.type) {
        case "SALE":
          customer.totalSales += amount;
          break;

        case "PAYMENT":
          customer.totalPayment += amount;
          break;

        case "SALE_RETURN":
          customer.totalSalesReturn += amount;
          break;

        case "ADJUSTMENT":
          customer.totalAdjustmentDebit += debit;
          customer.totalAdjustmentCredit += credit;
          break;

        default:
          break;
      }
    });

    // ========================================
    // CUSTOMER SUMMARY
    // ========================================
    const customerSummary = Array.from(
      customerMap.values()
    ).map((customer) => {
      const totalDebit = Number(customer.totalDebit || 0);
      const totalCredit = Number(customer.totalCredit || 0);
      const openingBalance = Number(
        customer.openingBalance || 0
      );

      const netBalance =
        openingBalance +
        totalDebit -
        totalCredit;

      return {
        ...customer,

        transactionCount: Number(
          customer.transactionCount || 0
        ),

        openingBalance,

        totalSales: Number(customer.totalSales || 0),

        totalPayment: Number(
          customer.totalPayment || 0
        ),

        totalSalesReturn: Number(
          customer.totalSalesReturn || 0
        ),

        totalAdjustmentDebit: Number(
          customer.totalAdjustmentDebit || 0
        ),

        totalAdjustmentCredit: Number(
          customer.totalAdjustmentCredit || 0
        ),

        totalDebit,
        totalCredit,

        netBalance,
        currentBalance: netBalance,
      };
    });

    // ========================================
    // SUMMARY TOTALS
    // ========================================
    const totalOpeningBalance = customerSummary.reduce(
      (sum, customer) =>
        sum + Number(customer.openingBalance || 0),
      0
    );

    const totalDebit = Number(
      rawSummary.totalDebit || 0
    );

    const totalCredit = Number(
      rawSummary.totalCredit || 0
    );

    const totalSales = Number(
      rawSummary.totalSales || 0
    );

    const totalPayment = Number(
      rawSummary.totalPayment ??
      rawSummary.totalPayments ??
      0
    );

    const totalSalesReturn = Number(
      rawSummary.totalSalesReturn || 0
    );

    const totalAdjustmentDebit = customerSummary.reduce(
      (sum, customer) =>
        sum + Number(customer.totalAdjustmentDebit || 0),
      0
    );

    const totalAdjustmentCredit = customerSummary.reduce(
      (sum, customer) =>
        sum + Number(customer.totalAdjustmentCredit || 0),
      0
    );

    const netCustomerBalance =
      totalOpeningBalance +
      totalDebit -
      totalCredit;

    // ========================================
    // FINAL SUMMARY
    // ========================================
    const summary = {
      ...rawSummary,

      customerCount: customerSummary.length,

      totalCustomers: customerSummary.length,

      totalTransactions: Number(
        rawSummary.totalTransactions ??
        transactions.length
      ),

      totalOpeningBalance,

      totalSales,
      totalPayment,
      totalPayments: totalPayment,

      totalSalesReturn,

      totalDebit,
      totalCredit,

      totalAdjustmentDebit,
      totalAdjustmentCredit,

      netCustomerBalance,
    };

    // ========================================
    // FINAL REPORT
    // ========================================
    const finalReport = {
      success: true,
      summary,
      customerSummary,
      transactions,
    };

    console.log(
      "NORMALIZED ALL CUSTOMER REPORT:",
      finalReport
    );

    setAllCustomerReport(finalReport);

  } catch (error) {
    console.error(
      "ALL CUSTOMER REPORT ERROR:",
      error
    );

    toast.error(
      error.message ||
      "All Customer Report লোড করা যায়নি"
    );

  } finally {
    setAllCustomerReportLoading(false);
  }
}



async function loadPurchasePaymentReport() {
  try {
    setPurchasePaymentReportLoading(true);

    const params = new URLSearchParams();

    if (purchaseFilters.startDate) {
      params.append("startDate", purchaseFilters.startDate);
    }

    if (purchaseFilters.endDate) {
      params.append("endDate", purchaseFilters.endDate);
    }

    params.append("type", "PAYMENT");

    const query = params.toString()
      ? `?${params.toString()}`
      : "";

    const result = await apiRequest(
      `/suppliers/all-report${query}`
    );

    setPurchasePaymentReport(result.data || result);

  } catch (error) {
    toast.error(
      error.message || "Supplier Payment Report লোড করা যায়নি"
    );
  } finally {
    setPurchasePaymentReportLoading(false);
  }
}
// ======================================
// SUPPLIER PAYMENT MODAL
// ======================================

function renderSupplierPaymentModal() {
  return (
    <div style={modalOverlayStyle}>
      <div
        style={{
          ...modalStyle,
          maxWidth: 560,
          width: "95%",
        }}
      >
        <div style={modalHeaderStyle}>
          <div>
            <h2>Supplier Payment</h2>
            <p style={{ margin: "5px 0 0", color: "#64748b" }}>
              Record supplier payment
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowPaymentForm(false)}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={submitSupplierPayment}>
          <div style={{ padding: 20 }}>

            {/* Supplier Information */}
            <div
              style={{
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: 10,
                padding: 15,
                marginBottom: 20,
              }}
            >
              <h3
                style={{
                  margin: "0 0 12px",
                  fontSize: 15,
                  color: "#334155",
                }}
              >
                Supplier Information
              </h3>

              <div style={{ marginBottom: 8 }}>
                <span style={{ color: "#64748b", fontSize: 13 }}>
                  Supplier Name
                </span>
                <div style={{ fontWeight: 600, color: "#1e293b" }}>
                  {paymentSupplier?.supplierName || "N/A"}
                </div>
              </div>

              <div style={{ marginBottom: 8 }}>
                <span style={{ color: "#64748b", fontSize: 13 }}>
                  Address
                </span>
                <div style={{ color: "#334155" }}>
                  {paymentSupplier?.address || "N/A"}
                </div>
              </div>

              <div>
                <span style={{ color: "#64748b", fontSize: 13 }}>
                  Mobile
                </span>
                <div style={{ color: "#334155" }}>
                  {paymentSupplier?.mobile || "N/A"}
                </div>
              </div>
            </div>

            {/* Payment Amount */}
            <label>Payment Amount (৳)</label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              required
              placeholder="Enter payment amount"
              style={inputStyle}
              value={paymentForm.amount}
              onChange={(e) =>
                setPaymentForm({
                  ...paymentForm,
                  amount: e.target.value,
                })
              }
            />

            {/* Payment Method */}
            <label>Payment Method</label>
            <select
              style={inputStyle}
              value={paymentForm.paymentMethod}
              onChange={(e) =>
                setPaymentForm({
                  ...paymentForm,
                  paymentMethod: e.target.value,
                })
              }
            >
              <option value="CASH">Cash</option>
              <option value="BANK">Bank</option>
              <option value="BKASH">bKash</option>
              <option value="NAGAD">Nagad</option>
              <option value="ROCKET">Rocket</option>
              <option value="OTHER">Other</option>
            </select>

            {/* Transaction Date */}
            <label>Transaction Date</label>
            <input
              type="date"
              required
              style={inputStyle}
              value={paymentForm.transactionDate}
              onChange={(e) =>
                setPaymentForm({
                  ...paymentForm,
                  transactionDate: e.target.value,
                })
              }
            />

            {/* Transaction ID */}
            <label>Transaction ID</label>
            <input
              type="text"
              style={inputStyle}
              placeholder="Auto Generated on Save"
              value={paymentForm.transactionId}
              onChange={(e) =>
                setPaymentForm({
                  ...paymentForm,
                  transactionId: e.target.value,
                })
              }
            />

            {/* Notes */}
            <label>Notes</label>
            <textarea
              style={inputStyle}
              rows="3"
              placeholder="Payment notes..."
              value={paymentForm.notes}
              onChange={(e) =>
                setPaymentForm({
                  ...paymentForm,
                  notes: e.target.value,
                })
              }
            />
          </div>

          <div style={modalFooterStyle}>
            <button
              type="button"
              className="secondary-button"
              onClick={() => setShowPaymentForm(false)}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="primary-button"
              disabled={paymentLoading}
            >
              {paymentLoading ? "Saving..." : "Save Payment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


function renderCustomerPaymentModal() {
  const paymentInputStyle = {
    ...inputStyle,
    width: "100%",
    marginTop: 7,
    borderRadius: 9,
    minHeight: 43,
  };

  const sectionTitleStyle = {
    fontSize: 14,
    fontWeight: 700,
    color: "#334155",
    margin: "0 0 13px",
  };

  const labelStyle = {
    display: "block",
    fontSize: 13,
    fontWeight: 600,
    color: "#475569",
    marginTop: 14,
  };

  return (
    <div style={modalOverlayStyle}>
      <div
        style={{
          ...modalStyle,
          maxWidth: 560,
          width: "95%",
          borderRadius: 16,
          overflow: "hidden",
          padding: 0,
        }}
      >
        {/* HEADER */}
        <div
          style={{
            padding: "20px 22px",
            background: "#fff",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: 21, color: "#1e293b" }}>
              Customer Payment
            </h2>
            <p
              style={{
                margin: "5px 0 0",
                fontSize: 13,
                color: "#64748b",
              }}
            >
              Record customer payment
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowCustomerPaymentForm(false)}
            style={{
              border: "none",
              background: "#f1f5f9",
              borderRadius: 9,
              width: 36,
              height: 36,
              cursor: "pointer",
              color: "#475569",
            }}
          >
            <X size={19} />
          </button>
        </div>

        <form onSubmit={submitCustomerPayment}>
          <div
            style={{
              padding: 22,
              maxHeight: "70vh",
              overflowY: "auto",
            }}
          >
            {/* CUSTOMER INFORMATION */}
            <div
              style={{
                padding: 17,
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: 12,
              }}
            >
              <h3 style={sectionTitleStyle}>
                Customer Information
              </h3>

              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, color: "#64748b" }}>
                  Customer Name
                </div>
                <strong style={{ color: "#1e293b", fontSize: 16 }}>
                  {paymentCustomer?.customerName || "-"}
                </strong>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: 12,
                }}
              >
                <div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>
                    Address
                  </div>
                  <div style={{ fontSize: 14, color: "#334155" }}>
                    {paymentCustomer?.address || "-"}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>
                    Mobile Number
                  </div>
                  <div style={{ fontSize: 14, color: "#334155" }}>
                    {paymentCustomer?.mobile || "-"}
                  </div>
                </div>
              </div>
            </div>

            {/* PAYMENT DETAILS */}
            <div style={{ marginTop: 22 }}>
              <h3 style={sectionTitleStyle}>
                Payment Details
              </h3>

              <label style={labelStyle}>
                Payment Amount (৳)
              </label>

              <input
                type="number"
                min="0.01"
                step="0.01"
                required
                placeholder="Enter payment amount"
                style={{
                  ...paymentInputStyle,
                  fontSize: 19,
                  fontWeight: 700,
                  color: "#15803d",
                  minHeight: 50,
                }}
                value={customerPaymentForm.amount}
                onChange={(e) =>
                  setCustomerPaymentForm({
                    ...customerPaymentForm,
                    amount: e.target.value,
                  })
                }
              />

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: 14,
                }}
              >
                <div>
                  <label style={labelStyle}>
                    Payment Method
                  </label>

                  <select
                    style={paymentInputStyle}
                    value={customerPaymentForm.paymentMethod}
                    onChange={(e) =>
                      setCustomerPaymentForm({
                        ...customerPaymentForm,
                        paymentMethod: e.target.value,
                      })
                    }
                  >
                    <option value="CASH">Cash</option>
                    <option value="BANK">Bank</option>
                    <option value="BKASH">bKash</option>
                    <option value="NAGAD">Nagad</option>
                    <option value="ROCKET">Rocket</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div>
                  <label style={labelStyle}>
                    Transaction Date
                  </label>

                  <input
                    type="date"
                    required
                    style={paymentInputStyle}
                    value={customerPaymentForm.transactionDate}
                    onChange={(e) =>
                      setCustomerPaymentForm({
                        ...customerPaymentForm,
                        transactionDate: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              {/* AUTO TRANSACTION ID */}
              <label style={labelStyle}>
                Transaction ID
              </label>

              <div
                style={{
                  ...paymentInputStyle,
                  minHeight: 43,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0 12px",
                  background: "#f1f5f9",
                  color: "#64748b",
                  border: "1px solid #e2e8f0",
                }}
              >
                <span>Auto Generated on Save</span>
                <span style={{ fontSize: 11 }}>
                  AUTO
                </span>
              </div>

              {/* NOTES */}
              <label style={labelStyle}>
                Notes
              </label>

              <textarea
                style={{
                  ...paymentInputStyle,
                  minHeight: 85,
                  resize: "vertical",
                }}
                rows="3"
                placeholder="Write payment notes..."
                value={customerPaymentForm.notes}
                onChange={(e) =>
                  setCustomerPaymentForm({
                    ...customerPaymentForm,
                    notes: e.target.value,
                  })
                }
              />
            </div>
          </div>

          {/* FOOTER */}
          <div
            style={{
              padding: "16px 22px",
              borderTop: "1px solid #e2e8f0",
              display: "flex",
              justifyContent: "flex-end",
              gap: 10,
              background: "#fff",
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              className="secondary-button"
              onClick={() => setShowCustomerPaymentForm(false)}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="primary-button"
              disabled={customerPaymentLoading}
            >
              {customerPaymentLoading
                ? "Saving..."
                : "Save Payment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}



// ======================================
// SUPPLIER LEDGER MODAL
// ======================================

function renderSupplierLedgerModal() {
  const transactions = ledgerData?.transactions || [];

  return (
    <div style={modalOverlayStyle}>
      <div
  className="supplier-ledger-print-area"
  style={{ ...modalStyle, maxWidth: 1000, width: "95%" }}
>
        <div style={modalHeaderStyle}>
          <div>
            <h2>Supplier Ledger</h2>
          <p style={{ margin: "5px 0 3px", fontWeight: 600 }}>
  {ledgerSupplier?.supplierName || "Supplier"}
</p>

<p
  style={{
    margin: 0,
    fontSize: 13,
    color: "#6b7280",
  }}
>
  <MapPin size={14} style={{ verticalAlign: "middle", marginRight: 5 }} />
  {ledgerSupplier?.address || "Address not provided"}
</p>
          </div>

          <button
            type="button"
            onClick={() => setShowSupplierLedger(false)}
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: 20 }}>


<div
  className="supplier-ledger-filter-panel"
  style={{
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: 20,
    marginBottom: 22,
    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
  }}
>
  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 18,
      flexWrap: "wrap",
      gap: 10,
    }}
  >
    <div>
      <h3 style={{ margin: 0, fontSize: 17, color: "#111827" }}>
        Find Transactions
      </h3>
      <small style={{ color: "#6b7280" }}>
        Search and filter supplier transactions
      </small>
    </div>

    <span
      style={{
        background: "#fff7ed",
        color: "#ea580c",
        padding: "6px 12px",
        borderRadius: 20,
        fontSize: 12,
        fontWeight: 600,
      }}
    >
      Advanced Filter
    </span>
  </div>

  <div style={{ marginBottom: 16 }}>
    <label style={{ display: "block", marginBottom: 7, fontWeight: 600 }}>
      Search Transactions
    </label>

    <input
      type="text"
      placeholder="Search Lot Number, Transaction ID or Reference..."
      value={ledgerFilters.search}
      onChange={(e) =>
        setLedgerFilters((prev) => ({
          ...prev,
          search: e.target.value,
        }))
      }
      style={{
        width: "100%",
        boxSizing: "border-box",
        padding: "12px 14px",
        border: "1px solid #d1d5db",
        borderRadius: 8,
        fontSize: 14,
      }}
    />
  </div>

  <div
    style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
      gap: 15,
    }}
  >
    <div>
      <label style={{ display: "block", marginBottom: 7, fontWeight: 600 }}>
        Start Date
      </label>
      <input
        type="date"
        value={ledgerFilters.startDate}
        onChange={(e) =>
          setLedgerFilters((prev) => ({
            ...prev,
            startDate: e.target.value,
          }))
        }
        style={{ width: "100%", boxSizing: "border-box", padding: 11, border: "1px solid #d1d5db", borderRadius: 8 }}
      />
    </div>

    <div>
      <label style={{ display: "block", marginBottom: 7, fontWeight: 600 }}>
        End Date
      </label>
      <input
        type="date"
        value={ledgerFilters.endDate}
        onChange={(e) =>
          setLedgerFilters((prev) => ({
            ...prev,
            endDate: e.target.value,
          }))
        }
        style={{ width: "100%", boxSizing: "border-box", padding: 11, border: "1px solid #d1d5db", borderRadius: 8 }}
      />
    </div>

    <div>
      <label style={{ display: "block", marginBottom: 7, fontWeight: 600 }}>
        Transaction Type
      </label>
      <select
        value={ledgerFilters.type}
        onChange={(e) =>
          setLedgerFilters((prev) => ({
            ...prev,
            type: e.target.value,
          }))
        }
        style={{ width: "100%", boxSizing: "border-box", padding: 11, border: "1px solid #d1d5db", borderRadius: 8 }}
      >
        <option value="">All Types</option>
        <option value="PURCHASE">Purchase</option>
        <option value="PURCHASE_RETURN">Purchase Return</option>
        <option value="PAYMENT">Payment</option>
        <option value="ADJUSTMENT">Adjustment</option>
      </select>
    </div>

    <div>
      <label style={{ display: "block", marginBottom: 7, fontWeight: 600 }}>
        Payment Method
      </label>
      <select
        value={ledgerFilters.paymentMethod}
        onChange={(e) =>
          setLedgerFilters((prev) => ({
            ...prev,
            paymentMethod: e.target.value,
          }))
        }
        style={{ width: "100%", boxSizing: "border-box", padding: 11, border: "1px solid #d1d5db", borderRadius: 8 }}
      >
        <option value="">All Methods</option>
        <option value="CASH">Cash</option>
        <option value="BANK">Bank</option>
        <option value="BKASH">bKash</option>
        <option value="NAGAD">Nagad</option>
        <option value="ROCKET">Rocket</option>
        <option value="OTHER">Other</option>
      </select>
    </div>

    <div>
      <label style={{ display: "block", marginBottom: 7, fontWeight: 600 }}>
        Minimum Amount (৳)
      </label>
      <input
        type="number"
        min="0"
        placeholder="Minimum amount"
        value={ledgerFilters.minAmount}
        onChange={(e) =>
          setLedgerFilters((prev) => ({
            ...prev,
            minAmount: e.target.value,
          }))
        }
        style={{ width: "100%", boxSizing: "border-box", padding: 11, border: "1px solid #d1d5db", borderRadius: 8 }}
      />
    </div>

    <div>
      <label style={{ display: "block", marginBottom: 7, fontWeight: 600 }}>
        Maximum Amount (৳)
      </label>
      <input
        type="number"
        min="0"
        placeholder="Maximum amount"
        value={ledgerFilters.maxAmount}
        onChange={(e) =>
          setLedgerFilters((prev) => ({
            ...prev,
            maxAmount: e.target.value,
          }))
        }
        style={{ width: "100%", boxSizing: "border-box", padding: 11, border: "1px solid #d1d5db", borderRadius: 8 }}
      />
    </div>
  </div>

  <div
    style={{
      display: "flex",
      justifyContent: "flex-end",
      gap: 10,
      marginTop: 20,
      paddingTop: 16,
      borderTop: "1px solid #f3f4f6",
      flexWrap: "wrap",
    }}
  >
    <button
      type="button"
      className="secondary-button"
      onClick={() => {
        const emptyFilters = {
          startDate: "",
          endDate: "",
          type: "",
          paymentMethod: "",
          search: "",
          minAmount: "",
          maxAmount: "",
        };

        setLedgerFilters(emptyFilters);
        loadSupplierLedger(ledgerSupplier, 1, emptyFilters);
      }}
      disabled={ledgerLoading}
      style={{ padding: "11px 20px", borderRadius: 8 }}
    >
      Clear Filter
    </button>

    <button
      type="button"
      onClick={() =>
        loadSupplierLedger(ledgerSupplier, 1, ledgerFilters)
      }
      disabled={ledgerLoading}
      style={{
        padding: "11px 24px",
        borderRadius: 8,
        background: "#f97316",
        color: "#fff",
        border: "none",
        fontWeight: 700,
        cursor: "pointer",
      }}
    >
      {ledgerLoading ? "Searching..." : "Apply Filter"}
    </button>
<button
  type="button"
  className="secondary-button"
  onClick={() => window.print()}
  disabled={!ledgerData || ledgerLoading || transactions.length === 0}
  style={{
    padding: "11px 20px",
    borderRadius: 8,
    fontWeight: 700,
  }}
>
  <Printer size={16} style={{ verticalAlign: "middle", marginRight: 6 }} />
  Print Report
</button>

  </div>
</div>


          {ledgerLoading ? (
            <p>Loading ledger...</p>
          ) : ledgerData ? (
            <>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: 12,
                  marginBottom: 20,
                }}
              >
                <div className="panel" style={{ padding: 15 }}>
                  <small>Opening Balance</small>
                  <h3>
                    ৳ {Number(ledgerData.openingBalance || 0).toLocaleString()}
                  </h3>
                </div>

                <div className="panel" style={{ padding: 15 }}>
                  <small>Total Debit</small>
                  <h3>
                    ৳ {Number(
  ledgerData.filteredSummary?.totalDebit || 0
).toLocaleString()}
                  </h3>
                </div>

                <div className="panel" style={{ padding: 15 }}>
                  <small>Total Credit</small>
                  <h3>
                    ৳ {Number(
  ledgerData.filteredSummary?.totalCredit || 0
).toLocaleString()}
                  </h3>
                </div>

                <div className="panel" style={{ padding: 15 }}>
                  <small>Current Balance</small>
                  <h3>
                    ৳ {Number(ledgerData.currentBalance || 0).toLocaleString()}
                  </h3>
                </div>
              </div>

              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>DATE</th>
                      <th>TYPE</th>
                      <th>DESCRIPTION</th>
                      <th>METHOD</th>
                      <th>DEBIT</th>
                      <th>CREDIT</th>
                      <th>BALANCE</th>
                      <th>ACTION</th>
                    </tr>
                  </thead>

                  <tbody>
                    {transactions.map((item) => {
                      console.log("CUSTOMER LEDGER TRANSACTIONS:", transactions);
                      const isVoided =
                        item.type === "PAYMENT" &&
                        item.isVoided === true;

                      return (
                        <tr key={item._id}>
                          <td>
                            {item.transactionDate
                              ? new Date(item.transactionDate).toLocaleDateString()
                              : "-"}
                          </td>

                          <td>
                            <div>
                              {item.type || "-"}
                            </div>

                            {isVoided && (
                              <span
                                style={{
                                  display: "inline-block",
                                  marginTop: 5,
                                  padding: "3px 8px",
                                  borderRadius: 4,
                                  background: "#fee2e2",
                                  color: "#b91c1c",
                                  fontSize: 11,
                                  fontWeight: 700,
                                }}
                              >
                                VOIDED
                              </span>
                            )}
                          </td>

                          <td>
                            {item.description || item.reference || "-"}

                            {item.transactionId && (
                              <small style={{ display: "block" }}>
                                ID: {item.transactionId}
                              </small>
                            )}

                            {isVoided && (
                              <div
                                style={{
                                  marginTop: 5,
                                  color: "#b91c1c",
                                  fontSize: 12,
                                }}
                              >
                                Original Amount: ৳{" "}
                                {Number(item.amount || 0).toLocaleString()}

                                <br />

                                Void Reason: {item.voidReason || "Not provided"}
                              </div>
                            )}
                          </td>

                          <td>{item.paymentMethod || "-"}</td>

                          <td>
                            ৳ {Number(
                              isVoided ? 0 : item.debit || 0
                            ).toLocaleString()}
                          </td>

                          <td>
                            ৳ {Number(
                              isVoided ? 0 : item.credit || 0
                            ).toLocaleString()}
                          </td>

                          <td>
                            ৳ {Number(item.balanceAfter || 0).toLocaleString()}
                          </td>

<td>
  {item.type === "PAYMENT" && !item.isVoided ? (
    <div style={{ display: "flex", gap: 6 }}>
      <button
        type="button"
        className="secondary-button"
        onClick={() => openPaymentEdit(item, ledgerSupplier)}
        style={{ padding: "6px 10px", fontSize: 12 }}
      >
        Edit
      </button>

      <button
        type="button"
        onClick={() => openPaymentVoid(item)}
        style={{
          padding: "6px 10px",
          fontSize: 12,
          background: "#dc2626",
          color: "#fff",
          border: "none",
          borderRadius: 5,
          cursor: "pointer",
        }}
      >
        Void
      </button>

      <button
  type="button"
  className="secondary-button"
  onClick={() => openPaymentHistory(item)}
  style={{ padding: "6px 10px", fontSize: 12 }}
>
  History
</button>
    </div>
  ) : item.type === "PAYMENT" && item.isVoided ? (
    <span style={{ color: "#b91c1c", fontWeight: 700 }}>
      VOIDED
    </span>
  ) : (
    "-"
  )}
</td>


                        </tr>
                      );
                    })}

                    {transactions.length === 0 && (
                      <tr>
                        <td colSpan="8" style={{ textAlign: "center" }}>
                          No transactions found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
<div
  className="supplier-ledger-pagination"
  style={{
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
    marginTop: 18,
    padding: 12,
    borderTop: "1px solid #ddd",
  }}
>
  <div>
    <strong>
      Page {ledgerData.pagination?.page || 1}
      {" "}of{" "}
      {ledgerData.pagination?.totalPages || 1}
    </strong>

    <small style={{ display: "block", marginTop: 4 }}>
      Total Transactions:{" "}
      {Number(
        ledgerData.pagination?.totalTransactions || 0
      ).toLocaleString()}
    </small>
  </div>

  <div style={{ display: "flex", gap: 8 }}>
    <button
      type="button"
      className="secondary-button"
      disabled={
        ledgerLoading ||
        !ledgerData.pagination?.hasPrevPage
      }
      onClick={() =>
        loadSupplierLedger(
          ledgerSupplier,
          ledgerPage - 1,
          ledgerFilters
        )
      }
    >
      Previous
    </button>

    <button
      type="button"
      disabled={
        ledgerLoading ||
        !ledgerData.pagination?.hasNextPage
      }
      onClick={() =>
        loadSupplierLedger(
          ledgerSupplier,
          ledgerPage + 1,
          ledgerFilters
        )
      }
    >
      Next
    </button>
  </div>
</div>

            </>
          ) : (
            <p>Ledger data পাওয়া যায়নি।</p>
          )}
        </div>

       <div className="supplier-ledger-modal-footer" style={modalFooterStyle}>
          <button
            className="secondary-button"
            onClick={() => setShowSupplierLedger(false)}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}




function renderCustomerLedgerModal() {
  const transactions = customerLedgerData?.transactions || [];
  const pagination = customerLedgerData?.pagination || {};
  const customerSummary = customerLedgerData?.summary || {};

  const emptyFilters = {
    startDate: "",
    endDate: "",
    type: "",
    paymentMethod: "",
    search: "",
    minAmount: "",
    maxAmount: "",
  };

  const money = (value) =>
    Number(value || 0).toLocaleString("en-BD", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const openingBalance =
    customerLedgerData?.customer?.openingBalance ??
    customerSummary.openingBalance ??
    0;

  const closingBalance =
    customerSummary.closingBalance ??
    customerSummary.currentBalance ??
    0;

  const cardStyle = {
    padding: 18,
    borderRadius: 12,
    border: "1px solid #e2e8f0",
    background: "#ffffff",
    boxShadow: "0 2px 8px rgba(15,23,42,0.04)",
    minWidth: 0,
  };

  const filterInputStyle = {
    width: "100%",
    boxSizing: "border-box",
    padding: "10px 12px",
    border: "1px solid #dbe2ea",
    borderRadius: 8,
    outline: "none",
    background: "#fff",
    color: "#334155",
    fontSize: 13,
    marginTop: 6,
  };

  const filterLabelStyle = {
    fontSize: 12,
    fontWeight: 700,
    color: "#475569",
  };

  const typeBadge = (type, isVoided) => {
    if (isVoided) {
      return {
        background: "#fee2e2",
        color: "#b91c1c",
        label: "VOIDED",
      };
    }

    const styles = {
      SALE: {
        background: "#dbeafe",
        color: "#1d4ed8",
        label: "SALE",
      },
      SALE_RETURN: {
        background: "#fef3c7",
        color: "#92400e",
        label: "SALE RETURN",
      },
      PAYMENT: {
        background: "#dcfce7",
        color: "#15803d",
        label: "PAYMENT",
      },
      ADJUSTMENT: {
        background: "#f3e8ff",
        color: "#7e22ce",
        label: "ADJUSTMENT",
      },
    };

    return (
      styles[type] || {
        background: "#f1f5f9",
        color: "#475569",
        label: type || "OTHER",
      }
    );
  };

  const actionButton = {
    border: "1px solid #dbe2ea",
    borderRadius: 7,
    padding: "6px 10px",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
    whiteSpace: "nowrap",
  };

  return (
    <div
      className="customer-ledger-print-overlay"
      style={{
        ...modalOverlayStyle,
        padding: 12,
        background: "rgba(15,23,42,0.65)",
        backdropFilter: "blur(4px)",
        overflowY: "auto",
      }}
    >
      <div
        className="customer-ledger-print-area"
        style={{
          ...modalStyle,
          width: "98%",
          maxWidth: 1450,
          maxHeight: "96vh",
          overflowY: "auto",
          borderRadius: 16,
          padding: 0,
          background: "#f8fafc",
          boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
        }}
      >
        {/* HEADER */}
        <div
          className="customer-statement-header"
          style={{
            padding: "22px 25px",
            background: "#ffffff",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 15,
          }}
        >
          <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
            <div
              style={{
                width: 48,
                height: 48,
                minWidth: 48,
                borderRadius: 12,
                background: "#fff7ed",
                color: "#ea580c",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <FileText size={25} />
            </div>

            <div>
              <h2
                style={{
                  margin: 0,
                  color: "#0f172a",
                  fontSize: 21,
                  fontWeight: 800,
                }}
              >
                Customer Ledger
              </h2>

              <h3
                style={{
                  margin: "5px 0 0",
                  color: "#334155",
                  fontSize: 16,
                }}
              >
                {ledgerCustomer?.customerName || "Customer"}
              </h3>

              <p
                style={{
                  margin: "5px 0 0",
                  color: "#64748b",
                  fontSize: 12,
                }}
              >
                <MapPin
                  size={13}
                  style={{ verticalAlign: "middle", marginRight: 4 }}
                />
                {ledgerCustomer?.address || "Address not provided"}
                {ledgerCustomer?.mobile
                  ? `  |  ${ledgerCustomer.mobile}`
                  : ""}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowCustomerLedger(false)}
            style={{
              width: 38,
              height: 38,
              border: "1px solid #e2e8f0",
              background: "#f8fafc",
              color: "#475569",
              borderRadius: 9,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            title="Close Ledger"
          >
            <X size={20} />
          </button>
        </div>

        <div
          className="customer-statement-body"
          style={{ padding: 22 }}
        >
          {/* SUMMARY CARDS */}
          {customerLedgerData && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
                gap: 14,
                marginBottom: 20,
              }}
            >
              <div style={cardStyle}>
                <div style={{ color: "#64748b", fontSize: 12, fontWeight: 700 }}>
                  OPENING BALANCE
                </div>
                <h2 style={{ color: "#334155", fontSize: 21, margin: "12px 0 0" }}>
                  ৳ {money(openingBalance)}
                </h2>
              </div>

              <div style={cardStyle}>
                <div style={{ color: "#64748b", fontSize: 12, fontWeight: 700 }}>
                  TOTAL DEBIT
                </div>
                <h2 style={{ color: "#dc2626", fontSize: 21, margin: "12px 0 0" }}>
                  ৳ {money(customerSummary.totalDebit)}
                </h2>
              </div>

              <div style={cardStyle}>
                <div style={{ color: "#64748b", fontSize: 12, fontWeight: 700 }}>
                  TOTAL CREDIT
                </div>
                <h2 style={{ color: "#16a34a", fontSize: 21, margin: "12px 0 0" }}>
                  ৳ {money(customerSummary.totalCredit)}
                </h2>
              </div>

              <div
                style={{
                  ...cardStyle,
                  background: "#fff7ed",
                  borderColor: "#fed7aa",
                }}
              >
                <div style={{ color: "#9a3412", fontSize: 12, fontWeight: 700 }}>
                  CURRENT BALANCE
                </div>
                <h2 style={{ color: "#c2410c", fontSize: 21, margin: "12px 0 0" }}>
                  ৳ {money(closingBalance)}
                </h2>
              </div>
            </div>
          )}

          {/* FILTER PANEL */}
          <div
            className="customer-ledger-filter-panel customer-statement-filter"
            style={{
              background: "#ffffff",
              padding: 20,
              borderRadius: 12,
              border: "1px solid #e2e8f0",
              marginBottom: 20,
              boxShadow: "0 2px 8px rgba(15,23,42,0.03)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 8,
                marginBottom: 16,
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: 16, color: "#0f172a" }}>
                  <Search
                    size={17}
                    style={{ verticalAlign: "middle", marginRight: 7 }}
                  />
                  Find Transactions
                </h3>
                <small style={{ color: "#64748b" }}>
                  Filter customer transaction history
                </small>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: 14,
              }}
            >
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={filterLabelStyle}>Search Transactions</label>
                <input
                  type="text"
                  style={filterInputStyle}
                  placeholder="Search Transaction ID or Reference..."
                  value={customerLedgerFilters.search}
                  onChange={(e) =>
                    setCustomerLedgerFilters((prev) => ({
                      ...prev,
                      search: e.target.value,
                    }))
                  }
                />
              </div>

              <div>
                <label style={filterLabelStyle}>Start Date</label>
                <input
                  type="date"
                  style={filterInputStyle}
                  value={customerLedgerFilters.startDate}
                  onChange={(e) =>
                    setCustomerLedgerFilters((prev) => ({
                      ...prev,
                      startDate: e.target.value,
                    }))
                  }
                />
              </div>

              <div>
                <label style={filterLabelStyle}>End Date</label>
                <input
                  type="date"
                  style={filterInputStyle}
                  value={customerLedgerFilters.endDate}
                  onChange={(e) =>
                    setCustomerLedgerFilters((prev) => ({
                      ...prev,
                      endDate: e.target.value,
                    }))
                  }
                />
              </div>

              <div>
                <label style={filterLabelStyle}>Transaction Type</label>
                <select
                  style={filterInputStyle}
                  value={customerLedgerFilters.type}
                  onChange={(e) =>
                    setCustomerLedgerFilters((prev) => ({
                      ...prev,
                      type: e.target.value,
                    }))
                  }
                >
                  <option value="">All Types</option>
                  <option value="SALE">Sale</option>
                  <option value="SALE_RETURN">Sale Return</option>
                  <option value="PAYMENT">Payment</option>
                  <option value="ADJUSTMENT">Adjustment</option>
                </select>
              </div>

              <div>
                <label style={filterLabelStyle}>Payment Method</label>
                <select
                  style={filterInputStyle}
                  value={customerLedgerFilters.paymentMethod}
                  onChange={(e) =>
                    setCustomerLedgerFilters((prev) => ({
                      ...prev,
                      paymentMethod: e.target.value,
                    }))
                  }
                >
                  <option value="">All Methods</option>
                  <option value="CASH">Cash</option>
                  <option value="BANK">Bank</option>
                  <option value="BKASH">bKash</option>
                  <option value="NAGAD">Nagad</option>
                  <option value="ROCKET">Rocket</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label style={filterLabelStyle}>Minimum Amount (৳)</label>
                <input
                  type="number"
                  min="0"
                  style={filterInputStyle}
                  placeholder="Minimum amount"
                  value={customerLedgerFilters.minAmount}
                  onChange={(e) =>
                    setCustomerLedgerFilters((prev) => ({
                      ...prev,
                      minAmount: e.target.value,
                    }))
                  }
                />
              </div>

              <div>
                <label style={filterLabelStyle}>Maximum Amount (৳)</label>
                <input
                  type="number"
                  min="0"
                  style={filterInputStyle}
                  placeholder="Maximum amount"
                  value={customerLedgerFilters.maxAmount}
                  onChange={(e) =>
                    setCustomerLedgerFilters((prev) => ({
                      ...prev,
                      maxAmount: e.target.value,
                    }))
                  }
                />
              </div>
            </div>

    <div
  style={{
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
    justifyContent: "flex-end",
    alignItems: "center",
    marginTop: 20,
    paddingTop: 18,
    borderTop: "1px solid #f1f5f9",
  }}
>
              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  setCustomerLedgerFilters(emptyFilters);
                  loadCustomerLedger(ledgerCustomer, 1, emptyFilters);
                }}
                disabled={customerLedgerLoading}
              >
                Clear Filter
              </button>

              <button
                type="button"
                className="primary-button"
                onClick={() =>
                  loadCustomerLedger(
                    ledgerCustomer,
                    1,
                    customerLedgerFilters
                  )
                }
                disabled={customerLedgerLoading}
              >
                <Search size={15} style={{ verticalAlign: "middle", marginRight: 5 }} />
                {customerLedgerLoading ? "Searching..." : "Apply Filter"}
              </button>

              <button
                type="button"
                className="secondary-button"
                onClick={() => window.print()}
                disabled={
                  !customerLedgerData ||
                  customerLedgerLoading ||
                  transactions.length === 0
                }
              >
                <Printer size={15} style={{ verticalAlign: "middle", marginRight: 5 }} />
                Print Report
              </button>
            </div>
          </div>

          {/* TRANSACTION TABLE */}
          {customerLedgerLoading ? (
            <div
              style={{
                background: "#fff",
                borderRadius: 12,
                padding: 35,
                textAlign: "center",
                color: "#64748b",
              }}
            >
              Loading customer ledger...
            </div>
          ) : customerLedgerData ? (
            <>
              <div
                style={{
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: 12,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    padding: "16px 18px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 8,
                    borderBottom: "1px solid #e2e8f0",
                  }}
                >
                  <div>
                    <h3 style={{ margin: 0, fontSize: 16, color: "#0f172a" }}>
                      Transaction History
                    </h3>
                    <small style={{ color: "#64748b" }}>
                      Customer account activity and balance
                    </small>
                  </div>

                  <span
                    style={{
                      background: "#f1f5f9",
                      color: "#475569",
                      padding: "6px 10px",
                      borderRadius: 20,
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    {Number(pagination.totalTransactions || 0).toLocaleString()} Transactions
                  </span>
                </div>

                <div
                  className="table-wrapper"
                  style={{
                    overflowX: "auto",
                    width: "100%",
                  }}
                >
                  <table
                    className="customer-statement-table"
                    style={{
                      width: "100%",
                      minWidth: 1050,
                      borderCollapse: "collapse",
                      fontSize: 13,
                    }}
                  >
                    <thead>
                      <tr style={{ background: "#f1f5f9" }}>
                        {[
                          "DATE",
                          "TYPE",
                          "DESCRIPTION",
                          "METHOD",
                          "DEBIT",
                          "CREDIT",
                          "BALANCE",
                          "ACTION",
                        ].map((heading) => (
                          <th
                            key={heading}
                            style={{
                              padding: "13px 12px",
                              textAlign: "left",
                              color: "#475569",
                              fontSize: 11,
                              fontWeight: 800,
                              whiteSpace: "nowrap",
                              borderBottom: "1px solid #e2e8f0",
                            }}
                          >
                            {heading}
                          </th>
                        ))}
                      </tr>
                    </thead>

                    <tbody>
                      {transactions.map((item) => {
                        const isVoided =
                          item.type === "PAYMENT" &&
                          item.isVoided === true;

                        const badge = typeBadge(item.type, isVoided);

                        return (
                          <tr
                            key={item._id}
                            style={{
                              borderBottom: "1px solid #f1f5f9",
                              background: isVoided ? "#fffafa" : "#ffffff",
                            }}
                          >
                            <td style={{ padding: "13px 12px", whiteSpace: "nowrap", color: "#475569" }}>
                              {item.transactionDate
                                ? new Date(item.transactionDate).toLocaleDateString("en-GB")
                                : "-"}
                            </td>

                            <td style={{ padding: "13px 12px" }}>
                              <span
                                style={{
                                  display: "inline-block",
                                  padding: "5px 9px",
                                  borderRadius: 20,
                                  background: badge.background,
                                  color: badge.color,
                                  fontSize: 10,
                                  fontWeight: 800,
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {badge.label}
                              </span>
                            </td>

                            <td style={{ padding: "13px 12px", minWidth: 190, color: "#334155" }}>
                              <div style={{ fontWeight: 600 }}>
                                {item.description || item.reference || "-"}
                              </div>

                              {item.transactionId && (
                                <small style={{ display: "block", marginTop: 4, color: "#94a3b8" }}>
                                  ID: {item.transactionId}
                                </small>
                              )}

                              {isVoided && (
                                <div
                                  style={{
                                    marginTop: 7,
                                    padding: 8,
                                    background: "#fff1f2",
                                    borderRadius: 6,
                                    color: "#be123c",
                                    fontSize: 11,
                                  }}
                                >
                                  Original Amount: ৳ {money(item.amount)}
                                  <br />
                                  Reason: {item.voidReason || "Not provided"}
                                </div>
                              )}
                            </td>

                            <td style={{ padding: "13px 12px", color: "#64748b", whiteSpace: "nowrap" }}>
                              {item.paymentMethod || "-"}
                            </td>

                            <td style={{ padding: "13px 12px", color: "#dc2626", fontWeight: 600, whiteSpace: "nowrap" }}>
                              ৳ {money(isVoided ? 0 : item.debit)}
                            </td>

                            <td style={{ padding: "13px 12px", color: "#16a34a", fontWeight: 600, whiteSpace: "nowrap" }}>
                              ৳ {money(isVoided ? 0 : item.credit)}
                            </td>

                            <td style={{ padding: "13px 12px", fontWeight: 800, color: "#0f172a", whiteSpace: "nowrap" }}>
                              ৳ {money(item.balanceAfter)}
                            </td>

                            <td style={{ padding: "13px 12px", whiteSpace: "nowrap" }}>
                              {item.type === "PAYMENT" && !isVoided ? (
                                <div style={{ display: "flex", gap: 6 }}>
                                  <button
                                    type="button"
                                    style={{
                                      ...actionButton,
                                      background: "#eff6ff",
                                      color: "#1d4ed8",
                                      borderColor: "#bfdbfe",
                                    }}
                                    onClick={() => {
                                      setEditingCustomerPayment(item);

                                      setCustomerPaymentEditForm({
                                        amount: item.amount || item.credit || "",
                                        paymentMethod: item.paymentMethod || "CASH",
                                        transactionId: item.transactionId || "",
                                        reference: item.reference || "",
                                        transactionDate: item.transactionDate
                                          ? new Date(item.transactionDate).toISOString().slice(0, 10)
                                          : "",
                                        description: item.description || "",
                                        reason: "",
                                      });

                                      setShowCustomerPaymentEdit(true);
                                    }}
                                  >
                                    <Edit size={12} style={{ verticalAlign: "middle", marginRight: 3 }} />
                                    Edit
                                  </button>

                                  <button
                                    type="button"
                                    style={{
                                      ...actionButton,
                                      background: "#fff1f2",
                                      color: "#be123c",
                                      borderColor: "#fecdd3",
                                    }}
                                    onClick={() => {
                                      setVoidingCustomerPayment(item);
                                      setCustomerPaymentVoidReason("");
                                      setShowCustomerPaymentVoid(true);
                                    }}
                                  >
                                    <Trash2 size={12} style={{ verticalAlign: "middle", marginRight: 3 }} />
                                    Void
                                  </button>
                                </div>
                              ) : (
                                <span style={{ color: "#cbd5e1" }}>—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}

                      {transactions.length === 0 && (
                        <tr>
                          <td
                            colSpan="8"
                            style={{
                              textAlign: "center",
                              padding: 40,
                              color: "#94a3b8",
                            }}
                          >
                            <FileText size={30} style={{ marginBottom: 8, opacity: 0.5 }} />
                            <div>No transactions found</div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* PAGINATION */}
              <div
                className="customer-ledger-pagination"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                  flexWrap: "wrap",
                  marginTop: 16,
                  padding: "15px 18px",
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: 12,
                }}
              >
                <div>
                  <strong style={{ color: "#334155", fontSize: 13 }}>
                    Page {pagination.page || 1} of {pagination.totalPages || 1}
                  </strong>

                  <small style={{ display: "block", marginTop: 4, color: "#64748b" }}>
                    Total Transactions:{" "}
                    {Number(pagination.totalTransactions || 0).toLocaleString()}
                  </small>
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    className="secondary-button"
                    disabled={
                      customerLedgerLoading ||
                      !pagination.hasPrevPage
                    }
                    onClick={() =>
                      loadCustomerLedger(
                        ledgerCustomer,
                        customerLedgerPage - 1,
                        customerLedgerFilters
                      )
                    }
                  >
                    Previous
                  </button>

                  <button
                    type="button"
                    className="primary-button"
                    disabled={
                      customerLedgerLoading ||
                      !pagination.hasNextPage
                    }
                    onClick={() =>
                      loadCustomerLedger(
                        ledgerCustomer,
                        customerLedgerPage + 1,
                        customerLedgerFilters
                      )
                    }
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div style={{ padding: 25, textAlign: "center", color: "#64748b" }}>
              Customer Ledger data পাওয়া যায়নি।
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div
          className="customer-ledger-modal-footer"
          style={{
            padding: "15px 22px",
            background: "#ffffff",
            borderTop: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <button
            type="button"
            className="secondary-button"
            onClick={() => setShowCustomerLedger(false)}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}





function renderCustomerStatementModal() {
  const data = customerStatementData || {};
  const summary = data.summary || {};
  const transactions = data.transactions || [];

  const filteredTransactions =
    customerStatementType === "ALL"
      ? transactions
      : transactions.filter(
          (item) => item.type === customerStatementType
        );

  const money = (value) =>
    Number(value || 0).toLocaleString("en-BD", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  return (
   <div
  className="customer-statement-print-overlay"
  style={modalOverlayStyle}
>
<div
  className="customer-statement-print-area"
  style={{ ...modalStyle, maxWidth: 1200, width: "96%" }}
>
        <div className="customer-statement-header">
          <div>
            <h2>Customer Statement</h2>
            <p>
              {statementCustomer?.customerName || "Customer"}
              {statementCustomer?.mobile
                ? ` | ${statementCustomer.mobile}`
                : ""}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowCustomerStatement(false)}
          >
            <X size={20} />
          </button>
        </div>

        <div className="customer-statement-body">
          {/* FILTER */}
     <div
  className="customer-statement-filter"
  style={{
    display: "flex",
    flexWrap: "wrap",
    alignItems: "end",
    gap: 12,
  }}
>
            <div>
              <label>Transaction Type</label>
              <select
                style={inputStyle}
                value={customerStatementType}
                onChange={(e) =>
                  setCustomerStatementType(e.target.value)
                }
              >
                <option value="ALL">All Transactions</option>
                <option value="SALE">Sale</option>
                <option value="PAYMENT">Payment</option>
                <option value="SALE_RETURN">Sales Return</option>
                <option value="ADJUSTMENT">Adjustment</option>
              </select>
            </div>

            <div>
              <label>Start Date</label>
              <input
                type="date"
                style={inputStyle}
                value={customerStatementFilters.startDate}
                onChange={(e) =>
                  setCustomerStatementFilters((prev) => ({
                    ...prev,
                    startDate: e.target.value,
                  }))
                }
              />
            </div>

            <div>
              <label>End Date</label>
              <input
                type="date"
                style={inputStyle}
                value={customerStatementFilters.endDate}
                onChange={(e) =>
                  setCustomerStatementFilters((prev) => ({
                    ...prev,
                    endDate: e.target.value,
                  }))
                }
              />
            </div>

            <button
              className="primary-button"
              onClick={() =>
                loadCustomerStatement(
                  statementCustomer,
                  customerStatementFilters.startDate,
                  customerStatementFilters.endDate
                )
              }
              disabled={customerStatementLoading}
            >
              Filter Statement
            </button>

            <button
              className="secondary-button"
              onClick={() => {
                setCustomerStatementFilters({
                  startDate: "",
                  endDate: "",
                });
                setCustomerStatementType("ALL");
                loadCustomerStatement(statementCustomer, "", "");
              }}
              disabled={customerStatementLoading}
            >
              All Dates
            </button>
          </div>

          {customerStatementLoading ? (
            <p>Loading statement...</p>
          ) : customerStatementData ? (
            <>
              {/* SUMMARY */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(170px, 1fr))",
                  gap: 12,
                  marginBottom: 20,
                }}
              >
              
{[
  ["Opening Balance", summary.openingBalance, false],
  ["Total Sales", summary.totalSales, false],
  ["Total Payments", summary.totalPayments, false],
  ["Sales Return", summary.totalSalesReturn, false],
  ["Total Debit", summary.totalDebit, false],
  ["Total Credit", summary.totalCredit, false],
  ["Closing Balance", summary.closingBalance, true],
].map(([label, value, isBalance]) => (
  <div
    key={label}
    className={`customer-statement-card ${
      isBalance ? "balance-card" : ""
    }`}
  >
    <small>{label}</small>
    <h3>৳ {money(value)}</h3>
  </div>
))}

              </div>

              {/* TRANSACTION TABLE */}
              <div className="table-wrapper">
               <table className="customer-statement-table">
                  <thead>
                    <tr>
                      <th>DATE</th>
                      <th>TYPE</th>
                      <th>DESCRIPTION</th>
                      <th>METHOD</th>
                      <th>DEBIT</th>
                      <th>CREDIT</th>
                      <th>BALANCE</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredTransactions.map((item) => {
                      const isVoided =
                        item.type === "PAYMENT" &&
                        item.isVoided === true;

                      return (
                        <tr key={item._id}>
                          <td>
                            {item.transactionDate
                              ? new Date(
                                  item.transactionDate
                                ).toLocaleDateString("en-GB")
                              : "-"}
                          </td>

                          <td>
                            <div>{item.type || "-"}</div>

                            {isVoided && (
                              <span
                                style={{
                                  display: "inline-block",
                                  marginTop: 5,
                                  padding: "3px 8px",
                                  borderRadius: 4,
                                  background: "#fee2e2",
                                  color: "#b91c1c",
                                  fontSize: 11,
                                  fontWeight: 700,
                                }}
                              >
                                VOIDED
                              </span>
                            )}
                          </td>

                          <td>
                            {item.description || item.reference || "-"}
                            {item.transactionId && (
                              <small style={{ display: "block" }}>
                                ID: {item.transactionId}
                              </small>
                            )}
                          </td>

                          <td>{item.paymentMethod || "-"}</td>

                          <td>
                            ৳ {money(isVoided ? 0 : item.debit)}
                          </td>

                          <td>
                            ৳ {money(isVoided ? 0 : item.credit)}
                          </td>

                          <td>
                            <strong>
                              ৳ {money(item.balanceAfter)}
                            </strong>
                          </td>
                        </tr>
                      );
                    })}

                    {filteredTransactions.length === 0 && (
                      <tr>
                        <td
                          colSpan="7"
                          style={{
                            textAlign: "center",
                            padding: 25,
                          }}
                        >
                          No transactions found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div style={{ marginTop: 20, textAlign: "right" }}>
                <h3>
                  Closing Balance: ৳ {money(summary.closingBalance)}
                </h3>
              </div>
            </>
          ) : (
            <p>Statement data পাওয়া যায়নি।</p>
          )}
        </div>

       <div className="customer-statement-footer">
          <button
            className="secondary-button"
            onClick={() => setShowCustomerStatement(false)}
          >
            Close
          </button>

          <button
            className="primary-button"
            onClick={() => window.print()}
            disabled={!customerStatementData || customerStatementLoading}
          >
            <Printer size={16} style={{ marginRight: 6 }} />
            Print Statement
          </button>
        </div>
      </div>
    </div>
  );
}




function renderSupplierStatementModal() {
  const summary = statementData?.summary || {};
  const transactions = statementData?.transactions || [];

  const filteredTransactions =
    statementType === "ALL"
      ? transactions
      : transactions.filter((item) => item.type === statementType);

  const money = (value) =>
    Number(value || 0).toLocaleString("en-BD", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  return (
    <div
      className="supplier-statement-print-overlay"
      style={modalOverlayStyle}
    >
      <div
        className="supplier-statement-print-area"
        style={{ ...modalStyle, maxWidth: 1200, width: "96%" }}
      >
        {/* HEADER */}
        <div className="customer-statement-header">
          <div>
            <h2>Supplier Statement</h2>
            <p>
              {statementSupplier?.supplierName || "Supplier"}
              {statementSupplier?.mobile
                ? ` | ${statementSupplier.mobile}`
                : ""}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowSupplierStatement(false)}
          >
            <X size={20} />
          </button>
        </div>

        <div className="customer-statement-body">
          {/* FILTERS */}
          <div className="customer-statement-filter">
            <div>
              <label>Transaction Type</label>
              <select
                style={inputStyle}
                value={statementType}
                onChange={(e) => setStatementType(e.target.value)}
              >
                <option value="ALL">All Transactions</option>
                <option value="PURCHASE">Purchase</option>
                <option value="PAYMENT">Payment</option>
                <option value="PURCHASE_RETURN">Purchase Return</option>
                <option value="ADJUSTMENT">Adjustment</option>
              </select>
            </div>

            <div>
              <label>Start Date</label>
              <input
                type="date"
                style={inputStyle}
                value={statementStartDate}
                onChange={(e) => setStatementStartDate(e.target.value)}
              />
            </div>

            <div>
              <label>End Date</label>
              <input
                type="date"
                style={inputStyle}
                value={statementEndDate}
                onChange={(e) => setStatementEndDate(e.target.value)}
              />
            </div>

            <button
              className="primary-button"
              onClick={() =>
                loadSupplierStatement(
                  statementSupplier,
                  statementStartDate,
                  statementEndDate
                )
              }
              disabled={statementLoading}
            >
              Filter Statement
            </button>

            <button
              className="secondary-button"
              onClick={() => {
                setStatementStartDate("");
                setStatementEndDate("");
                loadSupplierStatement(statementSupplier, "", "");
              }}
              disabled={statementLoading}
            >
              All Dates
            </button>
          </div>

          {statementLoading ? (
            <p>Loading statement...</p>
          ) : statementData ? (
            <>
              {/* SUMMARY CARDS */}
              <div className="customer-statement-summary">
                {[
                  ["Opening Balance", summary.openingBalance],
                  ["Total Purchase", summary.totalPurchase],
                  ["Total Payment", summary.totalPayment],
                  ["Purchase Return", summary.totalPurchaseReturn],
                  ["Total Debit", summary.totalDebit],
                  ["Total Credit", summary.totalCredit],
                  ["Closing Balance", summary.closingBalance],
                ].map(([label, value]) => (
                  <div className="customer-statement-card" key={label}>
                    <small>{label}</small>
                    <h3>৳ {money(value)}</h3>
                  </div>
                ))}
              </div>

              {/* TRANSACTION TABLE */}
              <div className="table-wrapper">
                <table className="customer-statement-table">
                  <thead>
                    <tr>
                      <th>DATE</th>
                      <th>TYPE</th>
                      <th>LOT / PRODUCT</th>
                      <th>DESCRIPTION</th>
                      <th>METHOD</th>
                      <th>DEBIT</th>
                      <th>CREDIT</th>
                      <th>BALANCE</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredTransactions.map((item) => {
                      const isVoided =
                        item.type === "PAYMENT" &&
                        item.isVoided === true;

                      return (
                        <tr key={item._id}>
                          <td>
                            {item.transactionDate
                              ? new Date(
                                  item.transactionDate
                                ).toLocaleDateString("en-GB")
                              : "-"}
                          </td>

                          <td>
                            <div>{item.type || "-"}</div>

                            {isVoided && (
                              <span
                                style={{
                                  display: "inline-block",
                                  marginTop: 5,
                                  padding: "3px 8px",
                                  borderRadius: 4,
                                  background: "#fee2e2",
                                  color: "#b91c1c",
                                  fontSize: 11,
                                  fontWeight: 700,
                                }}
                              >
                                VOIDED
                              </span>
                            )}
                          </td>

                          <td>
                            {item.lotDetails ? (
                              <>
                                <strong>{item.lotDetails.lotCode}</strong>
                                <small style={{ display: "block" }}>
                                  {item.lotDetails.productName}
                                </small>
                              </>
                            ) : (
                              "-"
                            )}
                          </td>

                          <td>
                            {item.description || item.reference || "-"}

                            {item.transactionId && (
                              <small style={{ display: "block" }}>
                                ID: {item.transactionId}
                              </small>
                            )}

                            {isVoided && (
                              <div
                                style={{
                                  marginTop: 5,
                                  color: "#b91c1c",
                                  fontSize: 12,
                                }}
                              >
                                Original Amount: ৳ {money(item.amount)}
                                <br />
                                Void Reason: {item.voidReason || "Not provided"}
                              </div>
                            )}
                          </td>

                          <td>{item.paymentMethod || "-"}</td>
                          <td>৳ {money(isVoided ? 0 : item.debit)}</td>
                          <td>৳ {money(isVoided ? 0 : item.credit)}</td>
                          <td>
                            <strong>৳ {money(item.balanceAfter)}</strong>
                          </td>
                        </tr>
                      );
                    })}

                    {filteredTransactions.length === 0 && (
                      <tr>
                        <td
                          colSpan="8"
                          style={{
                            textAlign: "center",
                            padding: 25,
                          }}
                        >
                          No transactions found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* CLOSING BALANCE */}
              <div className="customer-statement-footer">
                <h3>
                  Closing Balance: ৳ {money(summary.closingBalance)}
                </h3>
              </div>
            </>
          ) : (
            <p>Statement data পাওয়া যায়নি।</p>
          )}
        </div>

        {/* FOOTER BUTTONS */}
        <div className="modal-footer">
          <button
            className="secondary-button"
            onClick={() => setShowSupplierStatement(false)}
          >
            Close
          </button>

          <button
            className="primary-button"
            onClick={() => window.print()}
            disabled={!statementData || statementLoading}
          >
            Print Statement
          </button>
        </div>
      </div>
    </div>
  );
}



function renderPaymentEditModal() {
  return (
    <div style={modalOverlayStyle}>
      <div style={{ ...modalStyle, maxWidth: 650, width: "95%" }}>
        <div style={modalHeaderStyle}>
          <div>
            <h2>Edit Supplier Payment</h2>
            <p>Payment Correction</p>
          </div>

          <button
            type="button"
            onClick={() => setShowPaymentEdit(false)}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={submitPaymentEdit}>
          <div style={{ padding: 20 }}>
            <div style={{ marginBottom: 15 }}>
              <label>Supplier</label>
              <select
                style={inputStyle}
                value={paymentEditForm.supplierId}
                onChange={(e) =>
                  setPaymentEditForm((prev) => ({
                    ...prev,
                    supplierId: e.target.value,
                  }))
                }
                required
              >
                <option value="">Select Supplier</option>

                {suppliers.map((supplier) => (
                  <option key={supplier._id} value={supplier._id}>
                    {supplier.supplierName}
                    {supplier.mobile ? ` - ${supplier.mobile}` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: 15 }}>
              <label>Payment Amount (৳)</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                style={inputStyle}
                value={paymentEditForm.amount}
                onChange={(e) =>
                  setPaymentEditForm((prev) => ({
                    ...prev,
                    amount: e.target.value,
                  }))
                }
                required
              />
            </div>

            <div style={{ marginBottom: 15 }}>
              <label>Payment Date</label>
              <input
                type="date"
                style={inputStyle}
                value={paymentEditForm.transactionDate}
                onChange={(e) =>
                  setPaymentEditForm((prev) => ({
                    ...prev,
                    transactionDate: e.target.value,
                  }))
                }
                required
              />
            </div>

            <div style={{ marginBottom: 15 }}>
              <label>Payment Method</label>
              <select
                style={inputStyle}
                value={paymentEditForm.paymentMethod}
                onChange={(e) =>
                  setPaymentEditForm((prev) => ({
                    ...prev,
                    paymentMethod: e.target.value,
                  }))
                }
                required
              >
                <option value="CASH">Cash</option>
                <option value="BANK">Bank</option>
                <option value="BKASH">bKash</option>
                <option value="NAGAD">Nagad</option>
                <option value="ROCKET">Rocket</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div style={{ marginBottom: 15 }}>
              <label>Transaction ID / Reference</label>
              <input
                type="text"
                style={inputStyle}
                value={paymentEditForm.transactionId}
                onChange={(e) =>
                  setPaymentEditForm((prev) => ({
                    ...prev,
                    transactionId: e.target.value,
                  }))
                }
              />
            </div>

            <div style={{ marginBottom: 15 }}>
              <label>Notes</label>
              <textarea
                style={inputStyle}
                rows="3"
                value={paymentEditForm.description}
                onChange={(e) =>
                  setPaymentEditForm((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
              />
            </div>

            <div style={{ marginBottom: 15 }}>
              <label>Correction Reason *</label>
              <textarea
                style={inputStyle}
                rows="3"
                placeholder="Why are you correcting this payment?"
                value={paymentEditForm.reason}
                onChange={(e) =>
                  setPaymentEditForm((prev) => ({
                    ...prev,
                    reason: e.target.value,
                  }))
                }
                required
              />
            </div>

            <div
              style={{
                background: "#fff7ed",
                color: "#9a3412",
                padding: 12,
                borderRadius: 6,
                fontSize: 13,
              }}
            >
              Payment পরিবর্তন করলে পুরোনো ও নতুন Supplier-এর Ledger
              Balance পুনরায় হিসাব করা হবে।
            </div>
          </div>

          <div style={modalFooterStyle}>
            <button
              type="button"
              className="secondary-button"
              onClick={() => setShowPaymentEdit(false)}
              disabled={paymentEditLoading}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="primary-button"
              disabled={paymentEditLoading}
            >
              {paymentEditLoading ? "Saving..." : "Save Correction"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function renderCustomerPaymentEditModal() {
  return (
    <div style={modalOverlayStyle}>
      <div style={{ ...modalStyle, maxWidth: 650, width: "95%" }}>
        <div style={modalHeaderStyle}>
          <div>
            <h2>Edit Customer Payment</h2>
            <p>Customer Payment Correction</p>
          </div>

          <button
            type="button"
            onClick={() => setShowCustomerPaymentEdit(false)}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={submitCustomerPaymentEdit}>
          <div style={{ padding: 20 }}>
            <div style={{ marginBottom: 15 }}>
              <label>Payment Amount (৳)</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                style={inputStyle}
                value={customerPaymentEditForm.amount}
                onChange={(e) =>
                  setCustomerPaymentEditForm((prev) => ({
                    ...prev,
                    amount: e.target.value,
                  }))
                }
                required
              />
            </div>

            <div style={{ marginBottom: 15 }}>
              <label>Payment Date</label>
              <input
                type="date"
                style={inputStyle}
                value={customerPaymentEditForm.transactionDate}
                onChange={(e) =>
                  setCustomerPaymentEditForm((prev) => ({
                    ...prev,
                    transactionDate: e.target.value,
                  }))
                }
                required
              />
            </div>

            <div style={{ marginBottom: 15 }}>
              <label>Payment Method</label>
              <select
                style={inputStyle}
                value={customerPaymentEditForm.paymentMethod}
                onChange={(e) =>
                  setCustomerPaymentEditForm((prev) => ({
                    ...prev,
                    paymentMethod: e.target.value,
                  }))
                }
                required
              >
                <option value="CASH">Cash</option>
                <option value="BANK">Bank</option>
                <option value="BKASH">bKash</option>
                <option value="NAGAD">Nagad</option>
                <option value="ROCKET">Rocket</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div style={{ marginBottom: 15 }}>
              <label>Transaction ID</label>
              <input
                type="text"
                style={inputStyle}
                value={customerPaymentEditForm.transactionId}
                onChange={(e) =>
                  setCustomerPaymentEditForm((prev) => ({
                    ...prev,
                    transactionId: e.target.value,
                  }))
                }
              />
            </div>

            <div style={{ marginBottom: 15 }}>
              <label>Reference</label>
              <input
                type="text"
                style={inputStyle}
                value={customerPaymentEditForm.reference}
                onChange={(e) =>
                  setCustomerPaymentEditForm((prev) => ({
                    ...prev,
                    reference: e.target.value,
                  }))
                }
              />
            </div>

            <div style={{ marginBottom: 15 }}>
              <label>Notes</label>
              <textarea
                style={inputStyle}
                rows="3"
                value={customerPaymentEditForm.description}
                onChange={(e) =>
                  setCustomerPaymentEditForm((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
              />
            </div>

            <div style={{ marginBottom: 15 }}>
              <label>Correction Reason *</label>
              <textarea
                style={inputStyle}
                rows="3"
                placeholder="কেন এই Payment সংশোধন করছেন?"
                value={customerPaymentEditForm.reason}
                onChange={(e) =>
                  setCustomerPaymentEditForm((prev) => ({
                    ...prev,
                    reason: e.target.value,
                  }))
                }
                required
              />
            </div>

            <div
              style={{
                background: "#fff7ed",
                color: "#9a3412",
                padding: 12,
                borderRadius: 6,
                fontSize: 13,
              }}
            >
              Payment পরিবর্তন করলে Customer Ledger Balance পুনরায় হিসাব করা হবে।
            </div>
          </div>

          <div style={modalFooterStyle}>
            <button
              type="button"
              className="secondary-button"
              onClick={() => setShowCustomerPaymentEdit(false)}
              disabled={customerPaymentEditLoading}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="primary-button"
              disabled={customerPaymentEditLoading}
            >
              {customerPaymentEditLoading ? "Saving..." : "Save Correction"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
function renderCustomerPaymentVoidModal() {
  return (
    <div style={modalOverlayStyle}>
      <div style={{ ...modalStyle, maxWidth: 500, width: "95%" }}>
        <div style={modalHeaderStyle}>
          <div>
            <h2 style={{ color: "#b91c1c" }}>
              Void Customer Payment
            </h2>
            <p>Payment বাতিল করার নিশ্চিতকরণ</p>
          </div>

          <button
            type="button"
            onClick={() => setShowCustomerPaymentVoid(false)}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={submitCustomerPaymentVoid}>
          <div style={{ padding: 20 }}>
            <div
              className="panel"
              style={{
                padding: 15,
                marginBottom: 18,
              }}
            >
              <small>Payment Amount</small>
              <h2 style={{ margin: "5px 0" }}>
                ৳ {Number(
                  voidingCustomerPayment?.amount ||
                  voidingCustomerPayment?.credit ||
                  0
                ).toLocaleString("en-BD")}
              </h2>

              <small>
                Method: {voidingCustomerPayment?.paymentMethod || "-"}
              </small>
            </div>

            <div
              style={{
                background: "#fee2e2",
                color: "#991b1b",
                padding: 12,
                borderRadius: 6,
                marginBottom: 18,
                fontSize: 13,
              }}
            >
              সতর্কতা: এই Payment Void করলে Customer-এর Ledger
              Balance থেকে এর Credit বাদ যাবে। রেকর্ড মুছে ফেলা হবে না।
            </div>

            <div>
              <label>Void Reason *</label>
              <textarea
                style={inputStyle}
                rows="4"
                placeholder="কেন এই Payment বাতিল করছেন?"
                value={customerPaymentVoidReason}
                onChange={(e) =>
                  setCustomerPaymentVoidReason(e.target.value)
                }
                required
              />
            </div>
          </div>

          <div style={modalFooterStyle}>
            <button
              type="button"
              className="secondary-button"
              onClick={() => setShowCustomerPaymentVoid(false)}
              disabled={customerPaymentVoidLoading}
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={customerPaymentVoidLoading}
              style={{
                background: "#dc2626",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                padding: "10px 18px",
                cursor: "pointer",
              }}
            >
              {customerPaymentVoidLoading
                ? "Processing..."
                : "Confirm Void"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function renderPaymentVoidModal() {
  return (
    <div style={modalOverlayStyle}>
      <div style={{ ...modalStyle, maxWidth: 500, width: "95%" }}>
        <div style={modalHeaderStyle}>
          <div>
            <h2 style={{ color: "#b91c1c" }}>Void Supplier Payment</h2>
            <p>Payment বাতিল করার নিশ্চিতকরণ</p>
          </div>

          <button
            type="button"
            onClick={() => setShowPaymentVoid(false)}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={submitPaymentVoid}>
          <div style={{ padding: 20 }}>
            <div
              className="panel"
              style={{
                padding: 15,
                marginBottom: 18,
              }}
            >
              <small>Payment Amount</small>
              <h2 style={{ margin: "5px 0" }}>
                ৳ {Number(
                  voidingPayment?.amount ||
                  voidingPayment?.credit ||
                  0
                ).toLocaleString("en-BD")}
              </h2>

              <small>
                Method: {voidingPayment?.paymentMethod || "-"}
              </small>
            </div>

            <div
              style={{
                background: "#fee2e2",
                color: "#991b1b",
                padding: 12,
                borderRadius: 6,
                marginBottom: 18,
                fontSize: 13,
              }}
            >
              সতর্কতা: এই Payment Void করলে Supplier-এর Ledger
              Balance থেকে এর Credit বাদ যাবে। রেকর্ড মুছে ফেলা হবে না।
            </div>

            <div>
              <label>Void Reason *</label>
              <textarea
                style={inputStyle}
                rows="4"
                placeholder="কেন এই Payment বাতিল করছেন?"
                value={paymentVoidReason}
                onChange={(e) =>
                  setPaymentVoidReason(e.target.value)
                }
                required
              />
            </div>
          </div>

          <div style={modalFooterStyle}>
            <button
              type="button"
              className="secondary-button"
              onClick={() => setShowPaymentVoid(false)}
              disabled={paymentVoidLoading}
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={paymentVoidLoading}
              style={{
                background: "#dc2626",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                padding: "10px 18px",
                cursor: "pointer",
              }}
            >
              {paymentVoidLoading ? "Processing..." : "Confirm Void"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function renderPaymentHistoryModal() {
  const payment = selectedPaymentHistory;

  if (!payment) return null;

  const correctionHistory = payment.correctionHistory || [];

  const formatDate = (date) => {
    if (!date) return "-";

    return new Date(date).toLocaleString();
  };

  return (
    <div style={modalOverlayStyle}>
      <div style={{ ...modalStyle, maxWidth: 750, width: "95%" }}>
        <div style={modalHeaderStyle}>
          <div>
            <h2>Payment History</h2>
            <p>Payment Correction & Void Records</p>
          </div>

          <button
            type="button"
            onClick={() => setShowPaymentHistory(false)}
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: 20 }}>
          <div className="panel" style={{ padding: 15, marginBottom: 18 }}>
            <h3 style={{ marginTop: 0 }}>Original Payment Details</h3>

            <p>
              <strong>Amount:</strong> ৳{" "}
              {Number(payment.amount || 0).toLocaleString()}
            </p>

            <p>
              <strong>Payment Method:</strong>{" "}
              {payment.paymentMethod || "-"}
            </p>

            <p>
              <strong>Transaction ID:</strong>{" "}
              {payment.transactionId || "-"}
            </p>

            <p>
              <strong>Date:</strong>{" "}
              {formatDate(payment.transactionDate)}
            </p>

            <p>
              <strong>Created By:</strong>{" "}
              {payment.createdBy?.name ||
                payment.createdBy?.username ||
                "-"}
            </p>
          </div>

          <h3>Correction History ({correctionHistory.length})</h3>

          {correctionHistory.length === 0 ? (
            <p style={{ color: "#6b7280" }}>
              No correction history found.
            </p>
          ) : (
            correctionHistory.map((history, index) => (
              <div
                key={history._id || index}
                className="panel"
                style={{
                  padding: 15,
                  marginBottom: 12,
                  borderLeft: "4px solid #f97316",
                }}
              >
                <strong>Correction #{index + 1}</strong>

                <p>
                  <strong>Date:</strong>{" "}
                  {formatDate(history.correctedAt)}
                </p>

                <p>
                  <strong>Corrected By:</strong>{" "}
                  {history.correctedBy?.name ||
                    history.correctedBy?.username ||
                    "-"}
                </p>

                <p>
                  <strong>Reason:</strong>{" "}
                  {history.reason || "-"}
                </p>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                    gap: 12,
                  }}
                >
                  <div style={{ background: "#fef2f2", padding: 12, borderRadius: 8 }}>
                    <strong>Old Values</strong>

                    {Object.entries(history.oldValues || {}).map(
                      ([key, value]) => (
                        <p key={key} style={{ margin: "6px 0", fontSize: 13 }}>
                          {key}: {String(value ?? "-")}
                        </p>
                      )
                    )}
                  </div>

                  <div style={{ background: "#f0fdf4", padding: 12, borderRadius: 8 }}>
                    <strong>New Values</strong>

                    {Object.entries(history.newValues || {}).map(
                      ([key, value]) => (
                        <p key={key} style={{ margin: "6px 0", fontSize: 13 }}>
                          {key}: {String(value ?? "-")}
                        </p>
                      )
                    )}
                  </div>
                </div>
              </div>
            ))
          )}

          {payment.isVoided && (
            <div
              className="panel"
              style={{
                padding: 15,
                marginTop: 18,
                borderLeft: "4px solid #dc2626",
              }}
            >
              <h3 style={{ color: "#b91c1c", marginTop: 0 }}>
                Payment Voided
              </h3>

              <p>
                <strong>Void Date:</strong>{" "}
                {formatDate(payment.voidedAt)}
              </p>

              <p>
                <strong>Voided By:</strong>{" "}
                {payment.voidedBy?.name ||
                  payment.voidedBy?.username ||
                  "-"}
              </p>

              <p>
                <strong>Void Reason:</strong>{" "}
                {payment.voidReason || "-"}
              </p>
            </div>
          )}
        </div>

        <div style={modalFooterStyle}>
          <button
            type="button"
            className="secondary-button"
            onClick={() => setShowPaymentHistory(false)}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}


function renderPurchaseReturnModal() {
  if (!returnLot) return null;

  const returnAmount =
    Number(returnForm.weightReturnedKg || 0) *
    Number(returnLot.purchasePricePerKg || 0);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: 15,
        overflowY: "auto",
      }}
    >
      <div
        style={{
          background: "#fff",
          width: "100%",
          maxWidth: 550,
          borderRadius: 14,
          padding: 24,
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 10px 35px rgba(0,0,0,0.2)",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20,
          }}
        >
          <div>
            <h2 style={{ margin: 0 }}>Purchase Return</h2>
            <p style={{ color: "#7b8494", margin: "5px 0 0" }}>
              Return unsold stock to supplier.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setShowReturnForm(false);
              setReturnLot(null);
            }}
            style={{
              border: "none",
              background: "#f3f4f6",
              borderRadius: 8,
              padding: 8,
              cursor: "pointer",
              fontSize: 20,
            }}
          >
            ×
          </button>
        </div>

        {/* Lot Information */}
        <div
          style={{
            background: "#f8fafc",
            border: "1px solid #e5e7eb",
            borderRadius: 10,
            padding: 16,
            marginBottom: 20,
          }}
        >
          <div style={{ marginBottom: 10 }}>
            <small style={{ color: "#7b8494" }}>Product</small>
            <h3 style={{ margin: "4px 0" }}>
              {returnLot.productId?.productName ||
                returnLot.productName ||
                "-"}
            </h3>
          </div>

          <div className="form-grid">
            <div>
              <small style={{ color: "#7b8494" }}>Lot Code</small>
              <p style={{ margin: "5px 0", fontWeight: 600 }}>
                {returnLot.lotCode || "-"}
              </p>
            </div>

            <div>
              <small style={{ color: "#7b8494" }}>Supplier</small>
              <p style={{ margin: "5px 0", fontWeight: 600 }}>
                {returnLot.supplierId?.supplierName || "-"}
              </p>
            </div>

            <div>
              <small style={{ color: "#7b8494" }}>
                Remaining Bags
              </small>
              <p style={{ margin: "5px 0", fontWeight: 600 }}>
                {Number(returnLot.remainingBags || 0)}
              </p>
            </div>

            <div>
              <small style={{ color: "#7b8494" }}>
                Remaining Weight
              </small>
              <p style={{ margin: "5px 0", fontWeight: 600 }}>
                {Number(returnLot.remainingWeightKg || 0).toLocaleString("en-BD")} KG
              </p>
            </div>

            <div>
              <small style={{ color: "#7b8494" }}>
                Purchase Price / KG
              </small>
              <p style={{ margin: "5px 0", fontWeight: 600 }}>
                ৳ {Number(returnLot.purchasePricePerKg || 0).toLocaleString("en-BD")}
              </p>
            </div>
          </div>
        </div>

        {/* Return Form */}
        <form onSubmit={submitPurchaseReturn}>
          <div className="form-grid">
            <div>
              <label>Bags to Return</label>

              <input
                type="number"
                min="0"
                max={Number(returnLot.remainingBags || 0)}
                step="1"
                style={inputStyle}
                value={returnForm.bagsReturned}
                onChange={(e) =>
                  setReturnForm({
                    ...returnForm,
                    bagsReturned: e.target.value,
                  })
                }
                placeholder="Enter bags"
              />

              <small style={{ color: "#7b8494" }}>
                Maximum: {Number(returnLot.remainingBags || 0)} bags
              </small>
            </div>

            <div>
              <label>Weight to Return (KG) *</label>

              <input
                type="number"
                min="0.01"
                max={Number(returnLot.remainingWeightKg || 0)}
                step="0.01"
                required
                style={inputStyle}
                value={returnForm.weightReturnedKg}
                onChange={(e) =>
                  setReturnForm({
                    ...returnForm,
                    weightReturnedKg: e.target.value,
                  })
                }
                placeholder="Enter actual KG"
              />

              <small style={{ color: "#7b8494" }}>
                Maximum: {Number(returnLot.remainingWeightKg || 0)} KG
              </small>
            </div>

            <div>
              <label>Return Date *</label>

              <input
                type="date"
                required
                style={inputStyle}
                value={returnForm.returnDate}
                onChange={(e) =>
                  setReturnForm({
                    ...returnForm,
                    returnDate: e.target.value,
                  })
                }
              />
            </div>
          </div>

          {/* Return Amount */}
          <div
            style={{
              marginTop: 20,
              padding: 18,
              background: "#fff4e8",
              borderRadius: 10,
            }}
          >
            <p style={{ margin: 0, color: "#7b8494" }}>
              Supplier Return Credit
            </p>

            <h2 style={{ margin: "8px 0 0", color: "#f07822" }}>
              ৳{" "}
              {returnAmount.toLocaleString("en-BD", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </h2>

            <small style={{ color: "#7b8494" }}>
              Returned KG × Purchase Price per KG
            </small>
          </div>

          {/* Notes */}
          <div style={{ marginTop: 18 }}>
            <label>Return Notes</label>

            <textarea
              style={{ ...inputStyle, minHeight: 80 }}
              placeholder="Return reason or notes (optional)"
              value={returnForm.notes}
              onChange={(e) =>
                setReturnForm({
                  ...returnForm,
                  notes: e.target.value,
                })
              }
            />
          </div>

          {/* Buttons */}
          <div
            style={{
              display: "flex",
              gap: 10,
              marginTop: 22,
            }}
          >
            <button
              type="submit"
              className="primary-button"
              disabled={
                returnLoading ||
                Number(returnForm.weightReturnedKg || 0) <= 0 ||
                Number(returnForm.weightReturnedKg || 0) >
                  Number(returnLot.remainingWeightKg || 0) ||
                Number(returnForm.bagsReturned || 0) >
                  Number(returnLot.remainingBags || 0)
              }
            >
              {returnLoading ? "Processing..." : "Confirm Return"}
            </button>

            <button
              type="button"
              className="secondary-button"
              disabled={returnLoading}
              onClick={() => {
                setShowReturnForm(false);
                setReturnLot(null);
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


function renderLotEditModal() {
  if (!editingLot) return null;

  const editedTotalAmount =
    Number(lotEditForm.totalWeightKg || 0) *
    Number(lotEditForm.purchasePricePerKg || 0);





    
  return (



    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10000,
        padding: 15,
        overflowY: "auto",
      }}
    >
      <div
        style={{
          background: "#fff",
          width: "100%",
          maxWidth: 600,
          borderRadius: 14,
          padding: 24,
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 10px 35px rgba(0,0,0,0.2)",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 22,
          }}
        >
          <div>
            <h2 style={{ margin: 0 }}>Edit Purchase</h2>
            <p style={{ color: "#7b8494", margin: "5px 0 0" }}>
              Lot: {editingLot.lotCode}
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setShowLotEditForm(false);
              setEditingLot(null);
            }}
            style={{
              border: "none",
              background: "#f3f4f6",
              borderRadius: 8,
              padding: 8,
              cursor: "pointer",
              fontSize: 20,
            }}
          >
            ×
          </button>
        </div>

        {/* Product Information */}
        <div
          style={{
            padding: 15,
            background: "#f8fafc",
            borderRadius: 10,
            marginBottom: 20,
          }}
        >
          <strong>
            {editingLot.productId?.productName ||
              editingLot.productName ||
              "-"}
          </strong>

          <div
            style={{
              display: "flex",
              gap: 20,
              flexWrap: "wrap",
              marginTop: 10,
              fontSize: 13,
              color: "#64748b",
            }}
          >
            <span>
              Sold: {Number(editingLot.soldWeightKg || 0)} KG
            </span>

            <span>
              Returned: {Number(editingLot.returnedWeightKg || 0)} KG
            </span>

            <span>
              Remaining: {Number(editingLot.remainingWeightKg || 0)} KG
            </span>
          </div>

          <small style={{ color: "#d97706", display: "block", marginTop: 10 }}>
            Sold and returned stock cannot be reduced through Purchase Edit.
          </small>
        </div>

        {/* Edit Form */}
        <form onSubmit={submitLotEdit}>
          <div className="form-grid">
            {/* Supplier */}
            <div>
              <label>Supplier</label>

              <select
                style={inputStyle}
                value={lotEditForm.supplierId}
                onChange={(e) =>
                  setLotEditForm({
                    ...lotEditForm,
                    supplierId: e.target.value,
                  })
                }
              >
                <option value="">Select Supplier (Optional)</option>

                {suppliers
                  .filter((s) => s.isActive !== false)
                  .map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.supplierName}
                    </option>
                  ))}
              </select>
            </div>

            {/* Purchase Date */}
            <div>
              <label>Purchase Date *</label>

              <input
                type="date"
                required
                style={inputStyle}
                value={lotEditForm.purchaseDate}
                onChange={(e) =>
                  setLotEditForm({
                    ...lotEditForm,
                    purchaseDate: e.target.value,
                  })
                }
              />
            </div>

            {/* Bags */}
            <div>
              <label>Original Bags *</label>

              <input
                type="number"
                min="0"
                step="1"
                required
                style={inputStyle}
                value={lotEditForm.bagsReceived}
                onChange={(e) =>
                  setLotEditForm({
                    ...lotEditForm,
                    bagsReceived: e.target.value,
                  })
                }
              />
            </div>

            {/* Weight */}
            <div>
              <label>Original Weight (KG) *</label>

              <input
                type="number"
                min="0.01"
                step="0.01"
                required
                style={inputStyle}
                value={lotEditForm.totalWeightKg}
                onChange={(e) =>
                  setLotEditForm({
                    ...lotEditForm,
                    totalWeightKg: e.target.value,
                  })
                }
              />
            </div>

            {/* Purchase Price */}
            <div>
              <label>Purchase Price / KG *</label>

              <input
                type="number"
                min="0"
                step="0.01"
                required
                style={inputStyle}
                value={lotEditForm.purchasePricePerKg}
                onChange={(e) =>
                  setLotEditForm({
                    ...lotEditForm,
                    purchasePricePerKg: e.target.value,
                  })
                }
              />
            </div>
<div className="form-group">
  <div
  style={{
    display: "flex",
    flexDirection: "column",
    gap: 8,
    width: "100%",
    marginTop: 15,
  }}
>
  <label
    style={{
      fontWeight: 600,
      fontSize: 14,
      color: "#374151",
    }}
  >
    পরিবর্তনের কারণ (Edit Reason)
  </label>

  <textarea
    value={lotEditForm.editReason}
    onChange={(e) =>
      setLotEditForm({
        ...lotEditForm,
        editReason: e.target.value,
      })
    }
    placeholder="যেমন: Supplier ভুল ছিল, ওজন সংশোধন..."
    rows={3}
    required
    style={{
      display: "block",
      width: "100%",
      minHeight: 90,
      padding: 12,
      border: "1px solid #d1d5db",
      borderRadius: 8,
      background: "#ffffff",
      color: "#111827",
      fontSize: 14,
      outline: "none",
      resize: "vertical",
      boxSizing: "border-box",
      fontFamily: "inherit",
    }}
  />
</div>
</div>

          </div>

          {/* New Total Amount */}
          <div
            style={{
              marginTop: 20,
              padding: 18,
              background: "#fff4e8",
              borderRadius: 10,
            }}
          >
            <p style={{ margin: 0, color: "#7b8494" }}>
              Updated Purchase Amount
            </p>

            <h2 style={{ margin: "8px 0 0", color: "#f07822" }}>
              ৳{" "}
              {editedTotalAmount.toLocaleString("en-BD", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </h2>
          </div>

          {/* Buttons */}
          <div
            style={{
              display: "flex",
              gap: 10,
              marginTop: 22,
            }}
          >
            <button
              type="submit"
              className="primary-button"
              disabled={lotEditLoading}
            >
              {lotEditLoading ? "Updating..." : "Update Purchase"}
            </button>

            <button
              type="button"
              className="secondary-button"
              disabled={lotEditLoading}
              onClick={() => {
                setShowLotEditForm(false);
                setEditingLot(null);
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>


  );
}

function renderEditHistoryModal() {
  if (!selectedEditHistory) return null;

  const history = selectedEditHistory.editHistory || [];
const getSupplierName = (supplierId) => {
  if (!supplierId) return "-";

  if (typeof supplierId === "object") {
    return supplierId.supplierName || "-";
  }

  const supplier = suppliers.find(
    (s) => String(s._id) === String(supplierId)
  );

  return supplier?.supplierName || "Unknown Supplier";
};



  return (
    <div className="modal-overlay">
      <div
        className="modal-content"
        style={{
          width: "95%",
          maxWidth: 900,
          maxHeight: "85vh",
          overflowY: "auto",
        }}
      >
        <div style={pageHeaderStyle}>
          <div>
            <h2 style={{ margin: 0 }}>Purchase Edit History</h2>
            <p style={{ color: "#7b8494", margin: "6px 0 0" }}>
              Lot: {selectedEditHistory.lotCode || "-"}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowEditHistory(false)}
            style={{
              border: "none",
              background: "transparent",
              cursor: "pointer",
            }}
          >
            <X size={22} />
          </button>
        </div>

        {history.length === 0 ? (
          <div style={{ textAlign: "center", padding: 35 }}>
            <p style={{ color: "#6b7280" }}>
              এই Purchase-এর কোনো Edit History নেই।
            </p>
          </div>
        ) : (
          <div style={{ marginTop: 20 }}>
            {[...history].reverse().map((item, index) => {
              const oldData = item.oldValues || {};
              const newData = item.newValues || {};

              const formatDate = (date) =>
                date
                  ? new Date(date).toLocaleDateString("en-GB")
                  : "-";

              return (
                <div
                  key={item._id || index}
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: 10,
                    padding: 16,
                    marginBottom: 15,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                      gap: 10,
                    }}
                  >
                    <strong>Revision #{history.length - index}</strong>

                    <span style={{ color: "#64748b", fontSize: 13 }}>
                      {item.editedAt
                        ? new Date(item.editedAt).toLocaleString("en-GB")
                        : "-"}
                    </span>
                  </div>

                  <div className="table-wrapper" style={{ marginTop: 12 }}>
                    <table>
                      <thead>
                        <tr>
                          <th>FIELD</th>
                          <th>OLD VALUE</th>
                          <th>NEW VALUE</th>
                        </tr>
                      </thead>

                      <tbody>
                    <tr>
  <td>Supplier</td>
  <td>{getSupplierName(oldData.supplierId)}</td>
  <td>{getSupplierName(newData.supplierId)}</td>
</tr>

                        <tr>
                          <td>Purchase Date</td>
                          <td>{formatDate(oldData.purchaseDate)}</td>
                          <td>{formatDate(newData.purchaseDate)}</td>
                        </tr>

                        <tr>
                          <td>Bags</td>
                          <td>{oldData.bagsReceived ?? "-"}</td>
                          <td>{newData.bagsReceived ?? "-"}</td>
                        </tr>

                        <tr>
                          <td>Total KG</td>
                          <td>{oldData.totalWeightKg ?? "-"}</td>
                          <td>{newData.totalWeightKg ?? "-"}</td>
                        </tr>

                        <tr>
                          <td>Price / KG</td>
                          <td>{oldData.purchasePricePerKg ?? "-"}</td>
                          <td>{newData.purchasePricePerKg ?? "-"}</td>
                        </tr>

                        <tr>
                          <td>Purchase Amount</td>
                          <td>{oldData.totalPurchaseAmount ?? "-"}</td>
                          <td>{newData.totalPurchaseAmount ?? "-"}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div
                    style={{
                      marginTop: 12,
                      padding: 12,
                      background: "#f5f3ff",
                      borderRadius: 8,
                    }}
                  >
                    <strong>Edit Reason:</strong>
                    <p style={{ margin: "6px 0 0" }}>
                      {item.reason || "No reason provided"}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div style={{ textAlign: "right", marginTop: 15 }}>
          <button
            type="button"
            onClick={() => setShowEditHistory(false)}
            className="btn"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

  async function deactivateProduct(id) {
    if (!window.confirm("এই Product Deactivate করতে চান?")) return;

    try {
      await apiRequest(`/products/${id}`, { method: "DELETE" });
      toast.success("Product deactivated");
      loadProducts();
    } catch (error) {
      toast.error(error.message);
    }
  }

  const addSubcategory = async (categoryId) => {
  if (!newSubcategory.trim()) {
    toast.error("Subcategory Name দিন");
    return;
  }

  try {
    const result = await apiRequest(
      `/categories/${categoryId}/subcategories`,
      {
        method: "POST",
        body: JSON.stringify({
          name: newSubcategory.trim(),
        }),
      }
    );

    if (result.success) {
      toast.success("Subcategory added successfully");
      setNewSubcategory("");
      loadCategories();
    } else {
      toast.error(result.message || "Subcategory add করা যায়নি");
    }
  } catch (error) {
    toast.error(error.message || "সমস্যা হয়েছে");
  }
};


const updateSubcategory = async (categoryId, subId) => {
  if (!editingSubcategoryName.trim()) {
    toast.error("Subcategory Name দিন");
    return;
  }

  try {
    const result = await apiRequest(
      `/categories/${categoryId}/subcategories/${subId}`,
      {
        method: "PUT",
        body: JSON.stringify({
          name: editingSubcategoryName.trim(),
        }),
      }
    );

    if (result.success) {
      toast.success("Subcategory updated successfully");
      setEditingSubcategoryId(null);
      setEditingSubcategoryName("");
      loadCategories();
    } else {
      toast.error(result.message || "Update করা যায়নি");
    }
  } catch (error) {
    toast.error(error.message || "সমস্যা হয়েছে");
  }
};

const deactivateSubcategory = async (categoryId, subId) => {
  if (!window.confirm("এই Subcategory Deactivate করতে চান?")) return;

  try {
    const result = await apiRequest(
      `/categories/${categoryId}/subcategories/${subId}`,
      { method: "DELETE" }
    );

    if (result.success) {
      toast.success("Subcategory deactivated");
      loadCategories();
    } else {
      toast.error(result.message || "Deactivate করা যায়নি");
    }
  } catch (error) {
    toast.error(error.message || "সমস্যা হয়েছে");
  }
};


  async function deactivateSupplier(supplier) {
    if (!window.confirm("এই Supplier Deactivate করতে চান?")) return;

    try {
      await apiRequest(`/suppliers/${supplier._id}`, {
        method: "PUT",
        body: JSON.stringify({ isActive: false }),
      });
      toast.success("Supplier deactivated");
      loadSuppliers();
    } catch (error) {
      toast.error(error.message);
    }
  }
async function deactivateCustomer(customer) {
  if (!window.confirm("এই Customer Deactivate করতে চান?")) return;

  try {
    await apiRequest(`/customers/${customer._id}`, {
      method: "DELETE",
    });

    toast.success("Customer deactivated");
    loadCustomers();
  } catch (error) {
    toast.error(error.message);
  }
}
  const filteredProducts = products.filter((item) =>
    `${item.productName} ${item.sku} ${item.category}`
      .toLowerCase()
      .includes(searchText.toLowerCase())
  );

  const filteredSuppliers = suppliers.filter((item) =>
    `${item.supplierName} ${item.companyName} ${item.mobile}`
      .toLowerCase()
      .includes(searchText.toLowerCase())
  );

const filteredCustomers = customers.filter((item) =>
  `${item.customerName || ""} ${item.companyName || ""} ${item.mobile || ""}`
    .toLowerCase()
    .includes(customerSearch.toLowerCase())
);

  const pageDescription = {
    Dashboard: "Welcome back! Here's what's happening today.",
    Products: "Manage your wholesale products and stock.",
    Suppliers: "Manage your suppliers and supplier information.",
    Categories: "Manage product categories and subcategories",
  };

  function renderDashboard() {
    return (
      <>
        <div className="page-heading">
          <div>
            <h2>Dashboard Overview</h2>
            <p>Monitor your business performance at a glance.</p>
          </div>
          <div className="heading-actions">
            <button className="date-button">
              <CalendarDays size={17} /> This Year <ChevronDown size={15} />
            </button>
            <button className="primary-button" onClick={() => setActivePage("Products")}>
              <Plus size={18} /> Create New
            </button>
          </div>
        </div>

        <section className="stats-grid">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div className="stat-card" key={stat.title}>
                <div className="stat-top">
                  <div className={`stat-icon ${stat.color}`}>
                    <Icon size={21} />
                  </div>
                  <button className="more-button"><MoreHorizontal size={20} /></button>
                </div>
                <p className="stat-title">{stat.title}</p>
                <h3>{stat.value}</h3>
                <div className="stat-footer">
                  <span className="positive-change">
                    <TrendingUp size={14} /> {stat.change}
                  </span>
                  <span>vs last month</span>
                </div>
              </div>
            );
          })}
        </section>

        <section className="analytics-grid">
          <div className="panel chart-panel">
            <div className="panel-header">
              <div>
                <h3>Sales & Purchase Analytics</h3>
                <p>Monthly business performance</p>
              </div>
              <button className="date-button">2026 <ChevronDown size={15} /></button>
            </div>
            <div className="chart-legend">
              <span><i className="legend-sales" /> Sales</span>
              <span><i className="legend-purchase" /> Purchase</span>
            </div>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f47b20" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#f47b20" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="purchaseFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6098e8" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#6098e8" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#edf0f4" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#8993a4", fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "#8993a4", fontSize: 12 }} />
                  <Tooltip formatter={(value) => `৳ ${value.toLocaleString()}`} />
                  <Area type="monotone" dataKey="sales" stroke="#f47b20" strokeWidth={2.5} fill="url(#salesFill)" />
                  <Area type="monotone" dataKey="purchase" stroke="#6098e8" strokeWidth={2.5} fill="url(#purchaseFill)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="panel summary-panel">
            <div className="panel-header">
              <div><h3>Business Summary</h3><p>Financial overview</p></div>
              <button className="more-button"><MoreHorizontal size={20} /></button>
            </div>
            <div className="summary-item">
              <div className="summary-icon green"><TrendingUp size={19} /></div>
              <div className="summary-details"><span>Total Revenue</span><strong>৳ 4,85,250</strong></div>
            </div>
            <div className="summary-item">
              <div className="summary-icon blue"><ShoppingBag size={19} /></div>
              <div className="summary-details"><span>Total Expenses</span><strong>৳ 2,45,800</strong></div>
            </div>
            <div className="summary-item">
              <div className="summary-icon orange"><Wallet size={19} /></div>
              <div className="summary-details"><span>Net Profit</span><strong className="profit-value">৳ 2,39,450</strong></div>
            </div>
            <div className="profit-box">
              <div><span>Profit Growth</span><strong>+18.6%</strong></div>
              <TrendingUp size={23} />
            </div>
          </div>
        </section>

        <section className="bottom-grid">
          <div className="panel transactions-panel">
            <div className="panel-header">
              <div><h3>Recent Transactions</h3><p>Latest sales and invoices</p></div>
              <button className="text-button">View All <ArrowUpRight size={15} /></button>
            </div>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr><th>INVOICE</th><th>CUSTOMER</th><th>DATE</th><th>AMOUNT</th><th>STATUS</th></tr>
                </thead>
                <tbody>
                  {transactions.map((item) => (
                    <tr key={item.id}>
                      <td className="invoice-id">{item.id}</td>
                      <td>{item.customer}</td>
                      <td>{item.date}</td>
                      <td className="amount">{item.amount}</td>
                      <td><span className={`status ${item.status.toLowerCase()}`}>{item.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="panel stock-panel">
            <div className="panel-header">
              <div><h3>Stock Alerts</h3><p>Products running low</p></div>
              <CircleAlert size={20} color="#f47b20" />
            </div>
            <div className="stock-alert">
              <div className="product-mini">O</div>
              <div className="stock-info"><strong>Onion</strong><span>Wholesale product</span></div>
              <span className="stock-qty">Low</span>
            </div>
            <div className="stock-alert">
              <div className="product-mini blue-mini">P</div>
              <div className="stock-info"><strong>Potato</strong><span>Wholesale product</span></div>
              <span className="stock-qty">Low</span>
            </div>
            <button className="view-stock-button" onClick={() => setActivePage("Products")}>
              Manage Inventory <ArrowUpRight size={16} />
            </button>
          </div>
        </section>
      </>
    );
  }

 
function renderInventoryDashboard() {
  return (
    <>
      <div className="page-heading">
        <div>
          <h2>Inventory Dashboard</h2>
          <p>Monitor your stock, warehouses and inventory activities.</p>
        </div>
        <div className="heading-actions">
          <button
            className="primary-button"
            onClick={() => setActivePage("Stock In")}
          >
            <Plus size={18} /> Stock In
          </button>
        </div>
      </div>

      <section className="stats-grid">
        <div className="stat-card">
          <div className="stat-top">
            <div className="stat-icon blue">
              <Package size={21} />
            </div>
          </div>
          <p className="stat-title">Total Products</p>
          <h3>0</h3>
          <div className="stat-footer">All inventory products</div>
        </div>

        <div className="stat-card">
          <div className="stat-top">
            <div className="stat-icon green">
              <Warehouse size={21} />
            </div>
          </div>
          <p className="stat-title">Total Warehouses</p>
          <h3>0</h3>
          <div className="stat-footer">Available warehouses</div>
        </div>

        <div className="stat-card">
          <div className="stat-top">
            <div className="stat-icon orange">
              <TrendingUp size={21} />
            </div>
          </div>
          <p className="stat-title">Total Stock In</p>
          <h3>0</h3>
          <div className="stat-footer">Stock received</div>
        </div>

        <div className="stat-card">
          <div className="stat-top">
            <div className="stat-icon red">
              <CircleAlert size={21} />
            </div>
          </div>
          <p className="stat-title">Low Stock Items</p>
          <h3>0</h3>
          <div className="stat-footer">Products below minimum stock</div>
        </div>
      </section>

      <section className="analytics-grid">
        <div className="panel">
          <div className="panel-header">
            <div>
              <h3>Inventory Overview</h3>
              <p>Stock management summary</p>
            </div>
          </div>

          <div style={{ padding: "25px 0" }}>
            <h3 style={{ fontSize: 18, marginBottom: 10 }}>
              Welcome to Inventory Management
            </h3>
            <p style={{ color: "#8993a4", lineHeight: 1.7 }}>
              Manage your warehouses, stock in, stock out,
              stock transfers and inventory reports from here.
            </p>
          </div>
        </div>

        <div className="panel stock-panel">
          <div className="panel-header">
            <div>
              <h3>Quick Actions</h3>
              <p>Inventory operations</p>
            </div>
          </div>

          {[
            ["Stock In", "Receive new stock"],
            ["Stock Out", "Issue or remove stock"],
            ["Stock Transfer", "Transfer between warehouses"],
            ["Current Stock Report", "View available stock"],
          ].map(([label, description]) => (
            <button
              key={label}
              className="view-stock-button"
              style={{
                width: "100%",
                justifyContent: "space-between",
                marginBottom: 10,
              }}
              onClick={() => setActivePage(label)}
            >
              <span>
                <strong>{label}</strong>
                <br />
                <small>{description}</small>
              </span>
              <ArrowUpRight size={16} />
            </button>
          ))}
        </div>
      </section>
    </>
  );
}


function renderProducts() {
  return (
    <div className="panel" style={{ padding: 22 }}>
      <div style={pageHeaderStyle}>
        <div>
          <h2 style={{ margin: 0 }}>Product List</h2>
          <p style={{ color: "#7b8494", margin: "6px 0 0" }}>
            Total Products: {products.filter((p) => p.isActive !== false).length}
          </p>
        </div>

        <button className="primary-button" onClick={() => openProductForm()}>
          <Plus size={18} /> Add Product
        </button>
      </div>

      <input
        style={{ ...inputStyle, maxWidth: 350, margin: "15px 0" }}
        placeholder="Search product, lot code or category..."
        value={searchText}
        onChange={(e) => setSearchText(e.target.value)}
      />

      {loading ? (
        <p>Loading products...</p>
      ) : (

        
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>PRODUCT</th>
                <th>LOT CODE</th>
                <th>CATEGORY</th>
                <th>SUBCATEGORY</th>
                <th>TYPE</th>
                <th>STOCK</th>
                <th>ACTION</th>
              </tr>
            </thead>

            <tbody>
              {filteredProducts
                .filter((p) => p.isActive !== false)
                .map((p) => (
                  <tr key={p._id}>
                    <td>
                      <strong>{p.productName}</strong>
                    </td>

                    <td>
                      <strong>{p.lotCode || "-"}</strong>
                    </td>

                    <td>{p.category}</td>

                    <td>{p.subcategory || "-"}</td>

                    <td>{p.stockType}</td>

                    <td>
                      {Number(p.currentStockKg || 0).toLocaleString("en-BD")} KG
                    </td>

                    <td>
                      <button
                        style={actionButtonStyle}
                        onClick={() => openProductForm(p)}
                        title="Edit"
                      >
                        <Edit size={16} />
                      </button>

                      <button
                        style={actionButtonStyle}
                        onClick={() => deactivateProduct(p._id)}
                        title="Delete / Deactivate"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}

              {filteredProducts.filter((p) => p.isActive !== false).length === 0 && (
                <tr>
                  <td
                    colSpan="7"
                    style={{ textAlign: "center", padding: 25 }}
                  >
                    No products found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}


const renderCategories = () => {
  const totalSubcategories = categories.reduce(
    (total, category) =>
      total +
      (category.subcategories || []).filter((sub) => sub.isActive).length,
    0
  );

  return (
    <div className="category-page">

      {/* Header */}
      <div className="category-hero">
        <div>
          <h2>Category Management</h2>
          <p>
            Manage product categories and subcategories in one place.
          </p>
        </div>
      </div>

      {/* Statistics */}
      <div className="category-stats">
        <div className="category-stat">
          <span>Total Categories</span>
          <strong>{categories.length}</strong>
        </div>

        <div className="category-stat">
          <span>Total Subcategories</span>
          <strong>{totalSubcategories}</strong>
        </div>
      </div>

      {/* Add Category */}
      <div className="category-panel">
        <div className="category-panel-header">
          <div>
            <h3>Add New Category</h3>
            <p>First select or enter a product name, then add its category.</p>
          </div>
        </div>

        <div className="category-form-grid">
          <div className="category-field">
            <label>Product Name</label>
            <input
              type="text"
              placeholder="Example: Onion"
              value={categoryForm.productName}
              onChange={(e) =>
                setCategoryForm({
                  ...categoryForm,
                  productName: e.target.value,
                })
              }
            />
          </div>

          <div className="category-field">
            <label>Category Name</label>
            <input
              type="text"
              placeholder="Example: Deshi Onion"
              value={categoryForm.categoryName}
              onChange={(e) =>
                setCategoryForm({
                  ...categoryForm,
                  categoryName: e.target.value,
                })
              }
            />
          </div>

          <button
            type="button"
            className="category-primary-btn"
            onClick={saveCategory}
          >
            <Plus size={16} style={{ verticalAlign: "middle", marginRight: 6 }} />
            Add Category
          </button>
        </div>
      </div>

      {/* Category List */}
      <div className="category-panel">
        <div className="category-panel-header">
          <div>
            <h3>Category List</h3>
            <p>All your products and their categories.</p>
          </div>
        </div>

        {categoryLoading ? (
          <div className="category-empty">
            Loading categories...
          </div>
        ) : categories.length === 0 ? (
          <div className="category-empty">
            No categories found. Add your first category above.
          </div>
        ) : (
          <div className="category-list">
            {categories.map((category) => (
              <div className="category-card" key={category._id}>


{editingCategoryId === category._id && (
  <div className="category-edit-form">
    <h4>Edit Category</h4>

    <div className="category-form-grid">
      <div className="category-field">
        <label>Product Name</label>
        <input
          value={editingCategoryProduct}
          onChange={(e) =>
            setEditingCategoryProduct(e.target.value)
          }
        />
      </div>

      <div className="category-field">
        <label>Category Name</label>
        <input
          value={editingCategoryName}
          onChange={(e) =>
            setEditingCategoryName(e.target.value)
          }
        />
      </div>

      <button
        type="button"
        className="category-primary-btn"
        onClick={() => updateCategory(category._id)}
      >
        Save Changes
      </button>

      <button
        type="button"
        onClick={() => {
          setEditingCategoryId(null);
          setEditingCategoryName("");
          setEditingCategoryProduct("");
        }}
      >
        Cancel
      </button>
    </div>
  </div>
)}




                <div className="category-card-top">
                  <div>
                    <span className="category-product-name">
                      {category.productName}
                    </span>

                    <h4>{category.categoryName}</h4>
                  </div>

                
<div className="category-actions">
  <button
    type="button"
    className="category-edit-btn"
    onClick={() => {
      setEditingCategoryId(category._id);
      setEditingCategoryProduct(category.productName);
      setEditingCategoryName(category.categoryName);
    }}
  >
    Edit
  </button>

  <button
    type="button"
    className="category-danger-btn"
    onClick={() => deactivateCategory(category._id)}
  >
    <Trash2
      size={13}
      style={{ verticalAlign: "middle", marginRight: 4 }}
    />
    Deactivate
  </button>
</div>



                </div>

                {/* Subcategories */}
                <div className="subcategory-section">
                  <span className="subcategory-title">
                    SUBCATEGORIES
                  </span>

                  


<div className="subcategory-tags">
  {(category.subcategories || [])
    .filter((sub) => sub.isActive)
    .map((sub) => (
      <div className="subcategory-tag" key={sub._id}>
        {editingSubcategoryId === sub._id ? (
          <>
            <input
              value={editingSubcategoryName}
              onChange={(e) =>
                setEditingSubcategoryName(e.target.value)
              }
              autoFocus
            />

            <button
              type="button"
              onClick={() =>
                updateSubcategory(category._id, sub._id)
              }
            >
              Save
            </button>

            <button
              type="button"
              onClick={() => {
                setEditingSubcategoryId(null);
                setEditingSubcategoryName("");
              }}
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <span>{sub.name}</span>

            <button
              type="button"
              onClick={() => {
                setEditingSubcategoryId(sub._id);
                setEditingSubcategoryName(sub.name);
              }}
            >
              Edit
            </button>

            <button
              type="button"
              onClick={() =>
                deactivateSubcategory(category._id, sub._id)
              }
            >
              Delete
            </button>
          </>
        )}
      </div>
    ))}

  {(category.subcategories || []).filter(
    (sub) => sub.isActive
  ).length === 0 && (
    <span style={{ fontSize: 11, color: "#a0a8b4" }}>
      No subcategories added yet
    </span>
  )}
</div>



                  {/* Add Subcategory */}
                  <div className="subcategory-form">
                    <input
                      type="text"
                      placeholder="Enter new subcategory name..."
                      value={newSubcategory}
                      onChange={(e) =>
                        setNewSubcategory(e.target.value)
                      }
                    />

                    <button
                      type="button"
                      onClick={() => addSubcategory(category._id)}
                    >
                      <Plus
                        size={14}
                        style={{ verticalAlign: "middle", marginRight: 4 }}
                      />
                      Add Subcategory
                    </button>
                  </div>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};


function getFilteredLots() {
  return lots.filter((lot) => {
    const { startDate, endDate, supplier, product, lotCode, status } =
      purchaseFilters;

    const purchaseDate = lot.purchaseDate
      ? new Date(lot.purchaseDate).toISOString().slice(0, 10)
      : "";

    if (startDate && purchaseDate < startDate) return false;
    if (endDate && purchaseDate > endDate) return false;

    const supplierName =
      lot.supplierId?.supplierName || "";

    if (
      supplier &&
      !supplierName.toLowerCase().includes(supplier.toLowerCase())
    ) {
      return false;
    }

    const productName =
      lot.productId?.productName || lot.productName || "";

    if (
      product &&
      !productName.toLowerCase().includes(product.toLowerCase())
    ) {
      return false;
    }

    if (
      lotCode &&
      !(lot.lotCode || "").toLowerCase().includes(lotCode.toLowerCase())
    ) {
      return false;
    }

    if (status && (lot.status || "") !== status) {
      return false;
    }

    return true;
  });
}


function renderPurchases() {
  const pendingProducts = products.filter(
    (p) =>
      p.isActive !== false &&
      p.purchaseStatus === "PENDING"
  );

    const selectedPurchaseProduct = pendingProducts.find(
    (p) => String(p._id) === String(purchaseForm.productId)
  );

  const isCommissionPurchase =
    selectedPurchaseProduct?.stockType === "COMMISSION";

  const filteredLots = getFilteredLots();

const supplierPaymentSummary = (
  purchasePaymentReport?.supplierSummary || []
)
  .filter((supplier) => {
    const search = (purchaseFilters.supplier || "")
      .trim()
      .toLowerCase();

    if (!search) return true;

    return (supplier.supplierName || "")
      .toLowerCase()
      .includes(search);
  })
  .map((supplier) => {
    const purchaseSupplier = suppliers.find(
      (item) =>
        String(item._id) === String(supplier.supplierId)
    );

    return {
      supplierId: supplier.supplierId,
      supplierName: supplier.supplierName,
      totalPayment: Number(supplier.totalPayment || 0),
      currentBalance: Number(
        purchaseSupplier?.currentBalance || 0
      ),
    };
  })
  .sort((a, b) => b.totalPayment - a.totalPayment);




const purchaseGrandTotal = filteredLots.reduce(
  (total, lot) => {
    total.purchaseAmount += Number(lot.totalPurchaseAmount || 0);
    total.returnAmount += Number(lot.returnedPurchaseAmount || 0);
    total.netPurchase +=
      Number(lot.totalPurchaseAmount || 0) -
      Number(lot.returnedPurchaseAmount || 0);

    return total;
  },
  {
    purchaseAmount: 0,
    returnAmount: 0,
    netPurchase: 0,
  }
);

const supplierPurchaseSummary = Object.values(
  filteredLots.reduce((acc, lot) => {
    const supplierName =
      lot.supplierId?.supplierName || "Unknown Supplier";

    if (!acc[supplierName]) {
      acc[supplierName] = {
        supplierName,
        totalLots: 0,
        totalBags: 0,
        purchaseAmount: 0,
        returnAmount: 0,
        netPurchase: 0,
      };
    }

    const purchase = Number(lot.totalPurchaseAmount || 0);
    const returned = Number(lot.returnedPurchaseAmount || 0);

    acc[supplierName].totalLots += 1;
    acc[supplierName].totalBags += Number(lot.bagsReceived || 0);
    acc[supplierName].purchaseAmount += purchase;
    acc[supplierName].returnAmount += returned;
    acc[supplierName].netPurchase += purchase - returned;

    return acc;
  }, {})
).sort((a, b) => b.netPurchase - a.netPurchase);

const downloadPurchaseHistoryCSV = () => {
  const escapeCSV = (value) =>
    `"${String(value ?? "").replace(/"/g, '""')}"`;

  const rows = [
    ["PURCHASE HISTORY REPORT"],
    ["Report Generated", new Date().toLocaleString("en-BD")],
    [],
    ["PURCHASE SUMMARY"],
    ["Total Bags", purchaseFilterSummary.totalBags],
    ["Returned Bags", purchaseFilterSummary.returnedBags],
    ["Remaining Bags", purchaseFilterSummary.remainingBags],
    ["Original Weight KG", purchaseFilterSummary.totalWeight],
    ["Remaining Weight KG", purchaseFilterSummary.remainingWeight],
    ["Purchase Amount", purchaseFilterSummary.purchaseAmount],
    ["Return Amount", purchaseFilterSummary.returnAmount],
    ["Net Purchase", purchaseFilterSummary.netPurchase],
    [],

    [],
["SUPPLIER-WISE PURCHASE SUMMARY"],
[
  "Supplier Name",
  "Total Lots",
  "Total Bags",
  "Purchase Amount",
  "Return Amount",
  "Net Purchase",
],
...supplierPurchaseSummary.map((supplier) => [
  supplier.supplierName,
  supplier.totalLots,
  supplier.totalBags,
  supplier.purchaseAmount,
  supplier.returnAmount,
  supplier.netPurchase,
]),
    [],
    ["SUPPLIER-WISE PAYMENT SUMMARY"],
    [
      "Supplier Name",
      "Total Payment",
      "Current Ledger Balance",
    ],
    ...supplierPaymentSummary.map((supplier) => [
      supplier.supplierName,
      supplier.totalPayment,
      supplier.currentBalance,
    ]),
 
[
  "GRAND TOTAL",
  supplierPaymentSummary.reduce(
    (sum, item) => sum + item.totalPayment,
    0
  ),
  "",
],

[],
["SUPPLIER OUTSTANDING REPORT"],
[
  "SL",
  "Supplier Name",
  "Address",
  "Opening Balance",
  "Total Purchase",
  "Purchase Return",
  "Total Payment",
  "Current Outstanding",
  "Status",
],

...supplierOutstandingSummary.map((supplier, index) => [
  index + 1,
  supplier.supplierName,
  supplier.address,
  supplier.openingBalance,
  supplier.totalPurchase,
  supplier.totalReturn,
  supplier.totalPayment,
  supplier.currentBalance,
  supplier.currentBalance > 0
    ? "Payable"
    : supplier.currentBalance < 0
    ? "Advance"
    : "Settled",
]),

[
  "GRAND TOTAL",
  "",
  "",
  supplierOutstandingSummary.reduce(
    (sum, item) => sum + item.openingBalance,
    0
  ),
  supplierOutstandingSummary.reduce(
    (sum, item) => sum + item.totalPurchase,
    0
  ),
  supplierOutstandingSummary.reduce(
    (sum, item) => sum + item.totalReturn,
    0
  ),
  supplierOutstandingSummary.reduce(
    (sum, item) => sum + item.totalPayment,
    0
  ),
  supplierOutstandingSummary.reduce(
    (sum, item) => sum + item.currentBalance,
    0
  ),
  "Net Balance",
],

[],
["PURCHASE LOT DETAILS"],

    [
      "Lot Code",
      "Date",
      "Product",
      "Supplier",
      "Original Bags",
      "Returned Bags",
      "Remaining Bags",
      "Original KG",
      "Remaining KG",
      "Price Per KG",
      "Purchase Amount",
      "Return Amount",
      "Net Purchase",
      "Status",
    ],
    ...filteredLots.map((lot) => [
      lot.lotCode,
      lot.purchaseDate
        ? new Date(lot.purchaseDate).toLocaleDateString("en-GB")
        : "",
      lot.productId?.productName || lot.productName || "",
      lot.supplierId?.supplierName || "",
      Number(lot.bagsReceived || 0),
      Number(lot.returnedBags || 0),
      Number(lot.remainingBags || 0),
      Number(lot.totalWeightKg || 0),
      Number(lot.remainingWeightKg || 0),
      Number(lot.purchasePricePerKg || 0),
      Number(lot.totalPurchaseAmount || 0),
      Number(lot.returnedPurchaseAmount || 0),
      Number(lot.totalPurchaseAmount || 0) -
        Number(lot.returnedPurchaseAmount || 0),
      lot.status || "",
    ]),
  ];

  const csvContent =
    "\uFEFF" +
    rows.map((row) => row.map(escapeCSV).join(",")).join("\r\n");

  const blob = new Blob([csvContent], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "purchase-history-report.csv";
  link.click();

  URL.revokeObjectURL(url);
};


  // PURCHASE FILTER SUMMARY
  const purchaseFilterSummary = filteredLots.reduce(
    (acc, lot) => {
      acc.totalBags += Number(lot.bagsReceived || 0);
      acc.returnedBags += Number(lot.returnedBags || 0);
      acc.remainingBags += Number(lot.remainingBags || 0);

      acc.totalWeight += Number(lot.totalWeightKg || 0);
      acc.remainingWeight += Number(lot.remainingWeightKg || 0);

      acc.purchaseAmount += Number(lot.totalPurchaseAmount || 0);
      acc.returnAmount += Number(lot.returnedPurchaseAmount || 0);

      return acc;
    },
    {
      totalBags: 0,
      returnedBags: 0,
      remainingBags: 0,
      totalWeight: 0,
      remainingWeight: 0,
      purchaseAmount: 0,
      returnAmount: 0,
    }
  );

// SUPPLIER OUTSTANDING SUMMARY
const supplierOutstandingSummary = suppliers
  .filter((supplier) => supplier.isActive !== false)
  .filter((supplier) => {
    const search = (purchaseFilters.supplier || "")
      .trim()
      .toLowerCase();

    return (
      !search ||
      (supplier.supplierName || "")
        .toLowerCase()
        .includes(search)
    );
  })
  .map((supplier) => {
    const supplierId = String(supplier._id);

    const supplierLots = filteredLots.filter(
      (lot) =>
        String(lot.supplierId?._id || lot.supplierId) === supplierId
    );

    const paymentData = (
      purchasePaymentReport?.supplierSummary || []
    ).find(
      (item) => String(item.supplierId) === supplierId
    );

    const totalPurchase = supplierLots.reduce(
      (sum, lot) =>
        sum + Number(lot.totalPurchaseAmount || 0),
      0
    );

    const totalReturn = supplierLots.reduce(
      (sum, lot) =>
        sum + Number(lot.returnedPurchaseAmount || 0),
      0
    );

    return {
      supplierId,
      supplierName: supplier.supplierName,
      address: supplier.address || "",
      openingBalance: Number(supplier.openingBalance || 0),
      totalPurchase,
      totalReturn,
      totalPayment: Number(paymentData?.totalPayment || 0),
      currentBalance: Number(supplier.currentBalance || 0),
    };
  })
  .sort((a, b) => b.currentBalance - a.currentBalance);





  purchaseFilterSummary.netPurchase =
    purchaseFilterSummary.purchaseAmount -
    purchaseFilterSummary.returnAmount;

  return (
    <div className="panel" style={{ padding: 22 }}>
      <div style={pageHeaderStyle}>
      
               <div
  style={{
    marginTop: 35,
    marginBottom: 15,
    padding: "16px 18px",
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderLeft: "5px solid #f97316",
    borderRadius: 8,
  }}
>
  <h2
    style={{
      margin: 0,
      fontSize: 21,
      fontWeight: 800,
      color: "#0f172a",
    }}
  >
Purchase Management
  </h2>

  <p
    style={{
      margin: "5px 0 0",
      fontSize: 13,
      color: "#64748b",
    }}
  >
 Purchase products and manage stock lots.

  </p>

  
</div>

        <button
          className="primary-button"
          onClick={() => setShowPurchaseForm(!showPurchaseForm)}
        >
          <Plus size={18} />
          New Purchase
        </button>
      </div>

      {showPurchaseForm && (
        <form
          onSubmit={submitPurchase}
          style={{
            marginTop: 25,
            padding: 22,
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            background: "#fafbfc",
          }}
        >
          <h3 style={{ marginTop: 0 }}>New Purchase Entry</h3>

          <div className="form-grid">
            {/* Pending Product */}
            <div>
              <label>Pending Product *</label>

              <select
                style={inputStyle}
                value={purchaseForm.productId}
                required
                onChange={(e) => {
                  const selectedProduct = pendingProducts.find(
                    (p) => p._id === e.target.value
                  );

                  setPurchaseForm({
  ...purchaseForm,
  productId: e.target.value,
  supplierId: selectedProduct
    ? selectedProduct.supplier?._id ||
      selectedProduct.supplier ||
      ""
    : "",
  purchasePricePerKg:
    selectedProduct?.stockType === "COMMISSION" ? "0" : "",
});
                }}
              >
                <option value="">Select Pending Product</option>

                {pendingProducts.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.productName} - {p.lotCode || "No Lot Code"}
                  </option>
                ))}
              </select>

              {pendingProducts.length === 0 && (
                <small
                  style={{
                    color: "#dc2626",
                    display: "block",
                    marginTop: 6,
                  }}
                >
                  No pending products available. Please add a new Product Entry first.
                </small>
              )}
            </div>

            {/* Supplier */}
            <div>
              <label>Supplier</label>

              <select
                style={inputStyle}
                value={purchaseForm.supplierId}
                onChange={(e) =>
                  setPurchaseForm({
                    ...purchaseForm,
                    supplierId: e.target.value,
                  })
                }
              >
                <option value="">Select Supplier (Optional)</option>

                {suppliers
                  .filter((s) => s.isActive !== false)
                  .map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.supplierName}
                    </option>
                  ))}
              </select>
            </div>

            {/* Purchase Date */}
            <div>
              <label>Purchase Date *</label>

              <input
                type="date"
                style={inputStyle}
                value={purchaseForm.purchaseDate}
                required
                onChange={(e) =>
                  setPurchaseForm({
                    ...purchaseForm,
                    purchaseDate: e.target.value,
                  })
                }
              />
            </div>

            {/* Bags */}
            <div>
              <label>Number of Bags</label>

              <input
                type="number"
                min="0"
                step="1"
                style={inputStyle}
                placeholder="Enter bag quantity"
                value={purchaseForm.bagsReceived}
                onChange={(e) =>
                  setPurchaseForm({
                    ...purchaseForm,
                    bagsReceived: e.target.value,
                  })
                }
              />
            </div>

            {/* Total Weight */}
            <div>
              <label>Total Weight (KG) *</label>

              <input
                type="number"
                min="0.01"
                step="0.01"
                required
                style={inputStyle}
                placeholder="Enter actual weight"
                value={purchaseForm.totalWeightKg}
                onChange={(e) =>
                  setPurchaseForm({
                    ...purchaseForm,
                    totalWeightKg: e.target.value,
                  })
                }
              />
            </div>

     {/* Purchase Price */}
<div>
  <label>
    Purchase Price Per KG
    {!isCommissionPurchase && " *"}
  </label>

  <input
    type="number"
    min="0"
    step="0.01"
    required={!isCommissionPurchase}
    disabled={isCommissionPurchase}
    style={{
      ...inputStyle,
      background: isCommissionPurchase ? "#e5e7eb" : "#ffffff",
      cursor: isCommissionPurchase ? "not-allowed" : "text",
    }}
    placeholder={
      isCommissionPurchase
        ? "Commission Product - No Purchase Rate"
        : "Enter price per KG"
    }
    value={
      isCommissionPurchase
        ? "0"
        : purchaseForm.purchasePricePerKg
    }
    onChange={(e) =>
      setPurchaseForm({
        ...purchaseForm,
        purchasePricePerKg: e.target.value,
      })
    }
  />

  {isCommissionPurchase && (
    <small
      style={{
        color: "#b45309",
        display: "block",
        marginTop: 5,
      }}
    >
      Commission product: Purchase rate is not applicable.
    </small>
  )}
</div>
          </div>

          {/* Total Purchase Amount */}
          <div
            style={{
              marginTop: 20,
              padding: 18,
              background: "#fff4e8",
              borderRadius: 10,
            }}
          >
            <p style={{ margin: 0, color: "#7b8494" }}>
              Total Purchase Amount
            </p>

            <h2 style={{ margin: "8px 0 0", color: "#f07822" }}>
              ৳{" "}
              {purchaseTotalAmount.toLocaleString("en-BD", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </h2>
          </div>

          {/* Notes */}
          <div style={{ marginTop: 18 }}>
            <label>Notes</label>

            <textarea
              style={{ ...inputStyle, minHeight: 80 }}
              placeholder="Purchase notes (optional)"
              value={purchaseForm.notes}
              onChange={(e) =>
                setPurchaseForm({
                  ...purchaseForm,
                  notes: e.target.value,
                })
              }
            />
          </div>

          {/* Buttons */}
          <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
            <button
              type="submit"
              className="primary-button"
              disabled={lotLoading || pendingProducts.length === 0}
            >
              {lotLoading ? "Saving..." : "Save Purchase"}
            </button>

            <button
              type="button"
              className="secondary-button"
              onClick={() => setShowPurchaseForm(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Purchase History */}
      
<div className="purchase-history-print-area" style={{ marginTop: 30 }}>
  <div
    style={{
      ...pageHeaderStyle,
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 12,
      flexWrap: "wrap",
    }}
  >
    <div>
      <h3 style={{ margin: 0 }}>Purchase History / Lot List</h3>

      <p
        style={{
          color: "#64748b",
          fontSize: 13,
          margin: "6px 0 0",
        }}
      >
        Showing {filteredLots.length} of {lots.length} purchase lots
      </p>

      <p style={{ color: "#7b8494", margin: "6px 0 0" }}>
        Each purchase is maintained as a separate lot.
      </p>
      <p
  className="purchase-print-date"
  style={{
    color: "#64748b",
    fontSize: 12,
    margin: "8px 0 0",
  }}
>
  Report Generated: {new Date().toLocaleString("en-BD")}
</p>
    </div>

    {/* EXPORT CSV & PRINT BUTTONS */}
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <button
        type="button"
        className="secondary-button"
        onClick={downloadPurchaseHistoryCSV}
        disabled={filteredLots.length === 0}
      >
        <Download size={17} /> Export CSV
      </button>

      <button
        type="button"
        className="secondary-button"
        onClick={() => window.print()}
        disabled={filteredLots.length === 0}
      >
        <Printer size={17} /> Print / PDF
      </button>
    </div>
  </div>

  {/* এখান থেকে আপনার আগের PURCHASE HISTORY FILTER কোড চলবে */}


        {/* PURCHASE HISTORY FILTER */}
     <div
  className="purchase-history-filter-panel"
  style={{
    marginTop: 18,
            padding: 18,
            border: "1px solid #e2e8f0",
            borderRadius: 12,
            background: "#f8fafc",
          }}
        >
          <h3 style={{ margin: "0 0 15px", fontSize: 16 }}>
            Purchase History Filters
          </h3>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 14,
            }}
          >
            <div>
              <label>Start Date</label>
              <input
                type="date"
                style={inputStyle}
                value={purchaseFilters.startDate}
                onChange={(e) =>
                  setPurchaseFilters((prev) => ({
                    ...prev,
                    startDate: e.target.value,
                  }))
                }
              />
            </div>

            <div>
              <label>End Date</label>
              <input
                type="date"
                style={inputStyle}
                value={purchaseFilters.endDate}
                onChange={(e) =>
                  setPurchaseFilters((prev) => ({
                    ...prev,
                    endDate: e.target.value,
                  }))
                }
              />
            </div>

            <div>
              <label>Supplier Name</label>
              <input
                style={inputStyle}
                placeholder="Search supplier..."
                value={purchaseFilters.supplier}
                onChange={(e) =>
                  setPurchaseFilters((prev) => ({
                    ...prev,
                    supplier: e.target.value,
                  }))
                }
              />
            </div>

            <div>
              <label>Product Name</label>
              <input
                style={inputStyle}
                placeholder="Search product..."
                value={purchaseFilters.product}
                onChange={(e) =>
                  setPurchaseFilters((prev) => ({
                    ...prev,
                    product: e.target.value,
                  }))
                }
              />
            </div>

            <div>
              <label>Lot Code</label>
              <input
                style={inputStyle}
                placeholder="Search lot code..."
                value={purchaseFilters.lotCode}
                onChange={(e) =>
                  setPurchaseFilters((prev) => ({
                    ...prev,
                    lotCode: e.target.value,
                  }))
                }
              />
            </div>

            <div>
              <label>Lot Status</label>
              <select
                style={inputStyle}
                value={purchaseFilters.status}
                onChange={(e) =>
                  setPurchaseFilters((prev) => ({
                    ...prev,
                    status: e.target.value,
                  }))
                }
              >
                <option value="">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>
          </div>

          <div style={{ marginTop: 15 }}>
            <button
              type="button"
              className="secondary-button"
              onClick={() =>
                setPurchaseFilters({
                  startDate: "",
                  endDate: "",
                  supplier: "",
                  product: "",
                  lotCode: "",
                  status: "",
                })
              }
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* PURCHASE FILTER SUMMARY */}


        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
            gap: 14,
            marginTop: 18,
          }}
        >
          {[
            {
              title: "Total Bags",
              value: purchaseFilterSummary.totalBags.toLocaleString("en-BD"),
              color: "#2563eb",
            },
            {
              title: "Returned Bags",
              value: purchaseFilterSummary.returnedBags.toLocaleString("en-BD"),
              color: "#dc2626",
            },
            {
              title: "Remaining Bags",
              value: purchaseFilterSummary.remainingBags.toLocaleString("en-BD"),
              color: "#16a34a",
            },
            {
              title: "Original Weight",
              value: `${purchaseFilterSummary.totalWeight.toLocaleString("en-BD")} KG`,
              color: "#2563eb",
            },
            {
              title: "Remaining Weight",
              value: `${purchaseFilterSummary.remainingWeight.toLocaleString("en-BD")} KG`,
              color: "#16a34a",
            },
            {
              title: "Purchase Amount",
              value: `৳ ${purchaseFilterSummary.purchaseAmount.toLocaleString("en-BD")}`,
              color: "#2563eb",
            },
            {
              title: "Return Amount",
              value: `৳ ${purchaseFilterSummary.returnAmount.toLocaleString("en-BD")}`,
              color: "#dc2626",
            },
            {
              title: "Net Purchase",
              value: `৳ ${purchaseFilterSummary.netPurchase.toLocaleString("en-BD")}`,
              color: "#16a34a",
            },
          ].map((item) => (
            <div
              key={item.title}
              style={{
                padding: 16,
                border: "1px solid #e2e8f0",
                borderRadius: 10,
                background: "#fff",
              }}
            >
              <p style={{ margin: 0, color: "#64748b", fontSize: 13 }}>
                {item.title}
              </p>

              <h3
                style={{
                  margin: "9px 0 0",
                  color: item.color,
                  fontSize: 18,
                }}
              >
                {item.value}
              </h3>
            </div>
          ))}
        </div>



<div
  style={{
    marginTop: 35,
    marginBottom: 15,
    padding: "16px 18px",
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderLeft: "5px solid #f97316",
    borderRadius: 8,
  }}
>
  <h2
    style={{
      margin: 0,
      fontSize: 21,
      fontWeight: 800,
      color: "#0f172a",
    }}
  >
  Supplier-wise Payment Summary
  </h2>

  <p
    style={{
      margin: "5px 0 0",
      fontSize: 13,
      color: "#64748b",
    }}
  >
   Supplier-wise Purchase outstanding balance
  </p>
</div>

{/* SUPPLIER-WISE PURCHASE SUMMARY */}
<div
  style={{
    marginTop: 22,
    padding: 18,
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: 12,
  }}
>


  <div className="table-wrapper">
    <table>
      <thead>
        <tr>
          <th>SUPPLIER NAME</th>
          <th>TOTAL LOTS</th>
          <th>TOTAL BAGS</th>
          <th>PURCHASE AMOUNT</th>
          <th>RETURN AMOUNT</th>
          <th>NET PURCHASE</th>
        </tr>
      </thead>

      <tbody>
        {supplierPurchaseSummary.map((supplier) => (
          <tr key={supplier.supplierName}>
            <td>
              <strong>{supplier.supplierName}</strong>
            </td>
            <td>{supplier.totalLots}</td>
            <td>{supplier.totalBags.toLocaleString("en-BD")}</td>
            <td>
              ৳ {supplier.purchaseAmount.toLocaleString("en-BD")}
            </td>
            <td style={{ color: "#dc2626" }}>
              ৳ {supplier.returnAmount.toLocaleString("en-BD")}
            </td>
            <td style={{ color: "#15803d", fontWeight: "bold" }}>
              ৳ {supplier.netPurchase.toLocaleString("en-BD")}
            </td>
          </tr>
        ))}

        {supplierPurchaseSummary.length === 0 && (
          <tr>
            <td colSpan={6} style={{ textAlign: "center", padding: 20 }}>
              No supplier purchase records found.
            </td>
          </tr>
        )}
      </tbody>
    </table>


  </div>
</div>


{/* PURCHASE HISTORY SECTION HEADING */}
<div
  style={{
    marginTop: 35,
    marginBottom: 15,
    padding: "16px 18px",
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderLeft: "5px solid #f97316",
    borderRadius: 8,
  }}
>
  <h2
    style={{
      margin: 0,
      fontSize: 21,
      fontWeight: 800,
      color: "#0f172a",
    }}
  >
  Supplier-wise Payment Summary
  </h2>

  <p
    style={{
      margin: "5px 0 0",
      fontSize: 13,
      color: "#64748b",
    }}
  >
   Supplier-wise payment and current outstanding balance
  </p>
</div>
{/* SUPPLIER-WISE PAYMENT SUMMARY */}
<div style={{ marginTop: 25 }}>
  

  {purchasePaymentReportLoading ? (
    <p>Payment Report Loading...</p>
  ) : (
    <div className="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>SL</th>
            <th>Supplier Name</th>
            <th>Total Payment</th>
            <th>Current Ledger Balance</th>
          </tr>
        </thead>

        <tbody>
          {supplierPaymentSummary.length === 0 ? (
            <tr>
              <td colSpan={4} style={{ textAlign: "center" }}>
                No Payment Found
              </td>
            </tr>
          ) : (
            supplierPaymentSummary.map((supplier, index) => (
              <tr key={supplier.supplierId}>
                <td>{index + 1}</td>
                <td>{supplier.supplierName}</td>
                <td>
                  ৳{supplier.totalPayment.toLocaleString("en-BD")}
                </td>
                <td>
                  ৳{supplier.currentBalance.toLocaleString("en-BD")}
                </td>
              </tr>
            ))
          )}
        </tbody>

        <tfoot>
          <tr style={{ fontWeight: 700, background: "#fff7ed" }}>
            <td colSpan={2}>Grand Total</td>
            <td>
              ৳{supplierPaymentSummary
                .reduce((sum, item) => sum + item.totalPayment, 0)
                .toLocaleString("en-BD")}
            </td>
            <td>—</td>
          </tr>
        </tfoot>
      </table>
    </div>
  )}
</div>


{/* PURCHASE HISTORY SECTION HEADING */}
<div
  style={{
    marginTop: 35,
    marginBottom: 15,
    padding: "16px 18px",
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderLeft: "5px solid #f97316",
    borderRadius: 8,
  }}
>
  <h2
    style={{
      margin: 0,
      fontSize: 21,
      fontWeight: 800,
      color: "#0f172a",
    }}
  >
    Supplier Outstanding Report
  </h2>

  <p
    style={{
      margin: "5px 0 0",
      fontSize: 13,
      color: "#64748b",
    }}
  >
   Supplier-wise purchase, payment and current outstanding balance
  </p>
</div>
{/* SUPPLIER OUTSTANDING REPORT */}
<div style={{ marginTop: 30 }}>
 

 

  <div className="table-wrapper">
    <table>
      <thead>
        <tr>
          <th>SL</th>
          <th>Supplier Name</th>
          <th>Address</th>
          <th>Opening Balance</th>
          <th>Total Purchase</th>
          <th>Purchase Return</th>
          <th>Total Payment</th>
          <th>Current Outstanding</th>
        </tr>
      </thead>

      <tbody>
        {supplierOutstandingSummary.length === 0 ? (
          <tr>
            <td colSpan={8} style={{ textAlign: "center", padding: 20 }}>
              No supplier data found
            </td>
          </tr>
        ) : (
          supplierOutstandingSummary.map((supplier, index) => (
            <tr key={supplier.supplierId}>
              <td>{index + 1}</td>
              <td style={{ fontWeight: 600 }}>
                {supplier.supplierName}
              </td>
              <td>{supplier.address || "—"}</td>
              <td>
                {supplier.openingBalance.toLocaleString("en-BD", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </td>
              <td>
                {supplier.totalPurchase.toLocaleString("en-BD", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </td>
              <td>
                {supplier.totalReturn.toLocaleString("en-BD", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </td>
              <td>
                {supplier.totalPayment.toLocaleString("en-BD", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </td>
              <td
                style={{
                  fontWeight: 700,
                  color:
                    supplier.currentBalance > 0
                      ? "#dc2626"
                      : supplier.currentBalance < 0
                      ? "#16a34a"
                      : "#64748b",
                }}
              >
                {supplier.currentBalance.toLocaleString("en-BD", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
                <div style={{ fontSize: 10 }}>
                  {supplier.currentBalance > 0
                    ? "Payable"
                    : supplier.currentBalance < 0
                    ? "Advance"
                    : "Settled"}
                </div>
              </td>
            </tr>
          ))
        )}
      </tbody>

      <tfoot>
        <tr style={{ fontWeight: 700, background: "#fff7ed" }}>
          <td colSpan={3}>Grand Total</td>
          <td>
            {supplierOutstandingSummary
              .reduce((sum, item) => sum + item.openingBalance, 0)
              .toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </td>
          <td>
            {supplierOutstandingSummary
              .reduce((sum, item) => sum + item.totalPurchase, 0)
              .toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </td>
          <td>
            {supplierOutstandingSummary
              .reduce((sum, item) => sum + item.totalReturn, 0)
              .toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </td>
          <td>
            {supplierOutstandingSummary
              .reduce((sum, item) => sum + item.totalPayment, 0)
              .toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </td>
          <td>
            {supplierOutstandingSummary
              .reduce((sum, item) => sum + item.currentBalance, 0)
              .toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </td>
        </tr>
      </tfoot>
    </table>
  </div>
</div>


{/* PURCHASE HISTORY SECTION HEADING */}
<div
  style={{
    marginTop: 35,
    marginBottom: 15,
    padding: "16px 18px",
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderLeft: "5px solid #f97316",
    borderRadius: 8,
  }}
>
  <h2
    style={{
      margin: 0,
      fontSize: 21,
      fontWeight: 800,
      color: "#0f172a",
    }}
  >
    Purchase History
  </h2>

  <p
    style={{
      margin: "5px 0 0",
      fontSize: 13,
      color: "#64748b",
    }}
  >
    Complete purchase lot details, returns and remaining stock
  </p>
</div>
        {/* PURCHASE HISTORY TABLE */}
        {lotLoading ? (
          <p>Loading purchase history...</p>
        ) : (
          <div className="table-wrapper" style={{ marginTop: 25 }}>
 
            <table>
              <thead >
                <tr >
                  <th>LOT CODE</th>
                  <th>DATE</th>
                  <th>PRODUCT</th>
                  <th>SUPPLIER</th>
                  <th>ORIGINAL BAGS</th>
                  <th>RETURNED BAGS</th>
                  <th>REMAINING BAGS</th>
                  <th>ORIGINAL KG</th>
                  <th>REMAINING KG</th>
                  <th>PRICE / KG</th>
                  <th>PURCHASE AMOUNT</th>
                  <th>RETURN AMOUNT</th>
                  <th>NET PURCHASE</th>
                  <th>STATUS</th>
                  <th>RETURN</th>
                  <th>ACTION</th>
                  <th>EDIT HISTORY</th>
                </tr>
              </thead>

              <tbody>
                {filteredLots.map((lot) => {
                  const purchaseAmount = Number(
                    lot.totalPurchaseAmount || 0
                  );
                  const returnAmount = Number(
                    lot.returnedPurchaseAmount || 0
                  );
                  const netPurchase = purchaseAmount - returnAmount;

                  return (
                    <tr key={lot._id}>
                      <td>
                        <strong>{lot.lotCode || "-"}</strong>
                      </td>

                      <td>
                        {lot.purchaseDate
                          ? new Date(lot.purchaseDate).toLocaleDateString("en-GB")
                          : "-"}
                      </td>

                      <td>
                        {lot.productId?.productName || lot.productName || "-"}
                      </td>

                      <td>
                        {lot.supplierId?.supplierName || "-"}
                      </td>

                      <td>{Number(lot.bagsReceived || 0)}</td>

                      <td style={{ color: "#dc2626" }}>
                        {Number(lot.returnedBags || 0)}
                      </td>

                      <td>
                        <strong>{Number(lot.remainingBags || 0)}</strong>
                      </td>

                      <td>
                        {Number(lot.totalWeightKg || 0).toLocaleString("en-BD")} KG
                      </td>

                      <td>
                        <strong>
                          {Number(lot.remainingWeightKg || 0).toLocaleString("en-BD")} KG
                        </strong>
                      </td>

                      <td>
                        ৳ {Number(lot.purchasePricePerKg || 0).toLocaleString("en-BD")}
                      </td>

                      <td>
                        ৳ {purchaseAmount.toLocaleString("en-BD")}
                      </td>

                      <td style={{ color: "#dc2626" }}>
                        ৳ {returnAmount.toLocaleString("en-BD")}
                      </td>

                      <td>
                        <strong style={{ color: "#15803d" }}>
                          ৳ {netPurchase.toLocaleString("en-BD")}
                        </strong>
                      </td>

                      <td>
                        <span
                          style={{
                            padding: "5px 10px",
                            borderRadius: 20,
                            fontSize: 12,
                            background:
                              lot.status === "ACTIVE" ? "#dcfce7" : "#f3f4f6",
                            color:
                              lot.status === "ACTIVE" ? "#15803d" : "#6b7280",
                          }}
                        >
                          {lot.status || "-"}
                        </span>
                      </td>

                      <td>
                        {lot.status === "ACTIVE" &&
                        Number(lot.remainingWeightKg || 0) > 0 ? (
                          <button
                            type="button"
                            onClick={() => openPurchaseReturn(lot)}
                            style={{
                              padding: "7px 13px",
                              border: "none",
                              borderRadius: 7,
                              background: "#f07822",
                              color: "#fff",
                              cursor: "pointer",
                              fontWeight: 600,
                            }}
                          >
                            Return
                          </button>
                        ) : (
                          <span style={{ color: "#9ca3af" }}>-</span>
                        )}
                      </td>

                      {/* Edit Purchase */}
                      <td>
                        <button
                          type="button"
                          onClick={() => openLotEdit(lot)}
                          style={{
                            padding: "7px 13px",
                            border: "1px solid #2563eb",
                            borderRadius: 7,
                            background: "#eff6ff",
                            color: "#2563eb",
                            cursor: "pointer",
                            fontWeight: 600,
                          }}
                        >
                          <Edit
                            size={14}
                            style={{ marginRight: 5, verticalAlign: "middle" }}
                          />
                          Edit
                        </button>
                      </td>

                      {/* View Edit History */}
                      <td>
                        <button
                          type="button"
                          onClick={() => openEditHistory(lot)}
                          style={{
                            padding: "7px 13px",
                            border: "1px solid #7c3aed",
                            borderRadius: 7,
                            background: "#f5f3ff",
                            color: "#7c3aed",
                            cursor: "pointer",
                            fontWeight: 600,
                          }}
                        >
                          View History
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {filteredLots.length === 0 && (
                  <tr>
                    <td
                      colSpan="17"
                      style={{
                        textAlign: "center",
                        padding: 30,
                      }}
                    >
                      No purchase records found. Add your first purchase.
                    </td>
                  </tr>
                )}
              </tbody>

<tfoot>
  <tr style={{ background: "#fff7ed", fontWeight: "bold" }}>
    <td colSpan={10} style={{ textAlign: "right", padding: 12 }}>
      GRAND TOTAL
    </td>

    <td style={{ color: "#2563eb" }}>
      ৳ {purchaseGrandTotal.purchaseAmount.toLocaleString("en-BD")}
    </td>

    <td style={{ color: "#dc2626" }}>
      ৳ {purchaseGrandTotal.returnAmount.toLocaleString("en-BD")}
    </td>

    <td style={{ color: "#15803d" }}>
      ৳ {purchaseGrandTotal.netPurchase.toLocaleString("en-BD")}
    </td>

    <td colSpan={4}></td>
  </tr>
</tfoot>

            </table>
          </div>
        )}
      </div>
    </div>
  );
}




function renderCommissionManagement() {
  // =====================================
  // SUMMARY CARD STYLE
  // =====================================
  const summaryCard = {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: 7,
    padding: 16,
    boxShadow: "0 1px 3px rgba(15,23,42,0.04)",
  };

  // =====================================
  // TABLE STYLES
  // =====================================
  const tableHeaderStyle = {
    padding: "11px 12px",
    background: "#f1f5f9",
    color: "#475569",
    fontSize: 10,
    fontWeight: 700,
    textAlign: "left",
    whiteSpace: "nowrap",
    borderBottom: "1px solid #e2e8f0",
  };

  const tableCellStyle = {
    padding: "11px 12px",
    fontSize: 12,
    color: "#334155",
    borderBottom: "1px solid #e2e8f0",
    whiteSpace: "nowrap",
  };

  // =====================================
  // PENDING LOT TOTALS
  // =====================================
  const totalBags = commissionLots.reduce(
    (sum, lot) => sum + Number(lot.remainingBags || 0),
    0
  );

  const totalWeight = commissionLots.reduce(
    (sum, lot) => sum + Number(lot.remainingWeightKg || 0),
    0
  );

  // =====================================
  // COMMISSION INVOICE CALCULATIONS
  // =====================================
  const commissionTotalBags = commissionItems.reduce(
    (sum, item) => sum + Number(item.bags || 0),
    0
  );

  const commissionTotalWeight = commissionItems.reduce(
    (sum, item) => sum + Number(item.weightKg || 0),
    0
  );

  const commissionGrossAmount = commissionItems.reduce(
    (sum, item) =>
      sum +
      Number(item.weightKg || 0) *
        Number(item.ratePerKg || 0),
    0
  );

  const commissionLabourCost =
    commissionTotalBags * Number(commissionLabourRate || 0);

  const commissionDeduction =
    Number(commissionTransportCost || 0) +
    commissionLabourCost +
    commissionTotalWeight * Number(commissionRatePerKg || 0) +
    Number(commissionOtherCost || 0);

  const commissionNetPayable =
    commissionGrossAmount - commissionDeduction;

  const commissionExpectedBags = Number(
    selectedCommissionLot?.soldBags || 0
  );

  const commissionBagsMatch =
    commissionTotalBags === commissionExpectedBags;

  // =====================================
  // RENDER
  // =====================================
  return (
    <div
      className="panel"
      style={{
        padding: 16,
        background: "#f8fafc",
        minHeight: "100%",
      }}
    >
      {/* =================================
          CREATE COMMISSION INVOICE MODAL
      ================================== */}
      {selectedCommissionLot && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,23,42,0.65)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 12,
          }}
        >
          <div
            style={{
              background: "#ffffff",
              width: "100%",
              maxWidth: 950,
              maxHeight: "92vh",
              overflowY: "auto",
              borderRadius: 9,
              boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
            }}
          >
            {/* MODAL HEADER */}
            <div
              style={{
                background: "#172554",
                padding: "16px 20px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                position: "sticky",
                top: 0,
                zIndex: 2,
              }}
            >
              <div>
                <h3
                  style={{
                    color: "#fff",
                    margin: 0,
                    fontSize: 17,
                    fontWeight: 700,
                  }}
                >
                  Create Commission Invoice
                </h3>
                <p
                  style={{
                    color: "#cbd5e1",
                    fontSize: 11,
                    margin: "4px 0 0",
                  }}
                >
                  Lot: {selectedCommissionLot.lotCode || "-"}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedCommissionLot(null)}
                style={{
                  background: "transparent",
                  border: "1px solid #64748b",
                  color: "#fff",
                  borderRadius: 5,
                  padding: "5px 10px",
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: 18 }}>
              {/* LOT INFORMATION */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit,minmax(150px,1fr))",
                  gap: 10,
                  marginBottom: 18,
                }}
              >
                {[
                  [
                    "Product",
                    selectedCommissionLot.productId?.productName ||
                      selectedCommissionLot.productName ||
                      "-",
                  ],
                  [
                    "Supplier",
                    selectedCommissionLot.supplierId?.supplierName ||
                      selectedCommissionLot.supplierName ||
                      "-",
                  ],
                  ["Lot Bags", selectedCommissionLot.soldBags ?? 0],
                  [
                    "Lot Weight (KG)",
                    Number(
                      selectedCommissionLot.soldWeightKg || 0
                    ).toFixed(2),
                  ],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    style={{
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      borderRadius: 6,
                      padding: 12,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 10,
                        color: "#64748b",
                        fontWeight: 700,
                      }}
                    >
                      {label}
                    </div>
                    <div
                      style={{
                        fontSize: 14,
                        color: "#172554",
                        fontWeight: 700,
                        marginTop: 5,
                      }}
                    >
                      {value}
                    </div>
                  </div>
                ))}
              </div>

              {/* COMMISSION ITEMS */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 10,
                  marginBottom: 10,
                }}
              >
                <h4
                  style={{
                    margin: 0,
                    color: "#172554",
                    fontSize: 14,
                    fontWeight: 700,
                  }}
                >
                  Commission Items
                </h4>

                <button
                  type="button"
                  onClick={() =>
                    setCommissionItems((prev) => [
                      ...prev,
                      {
                        bags: "",
                        weightKg: "",
                        ratePerKg: "",
                      },
                    ])
                  }
                  className="secondary-button"
                  style={{
                    fontSize: 11,
                    padding: "7px 12px",
                  }}
                >
                  + Add Item
                </button>
              </div>

              <div
                style={{
                  overflowX: "auto",
                  marginBottom: 14,
                }}
              >
                <table
                  style={{
                    width: "100%",
                    minWidth: 650,
                    borderCollapse: "collapse",
                  }}
                >
                  <thead>
                    <tr style={{ background: "#f1f5f9" }}>
                      {[
                        "SL",
                        "BAGS",
                        "WEIGHT (KG)",
                        "RATE / KG",
                        "AMOUNT",
                        "ACTION",
                      ].map((heading) => (
                        <th
                          key={heading}
                          style={tableHeaderStyle}
                        >
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {commissionItems.map((item, index) => (
                      <tr key={index}>
                        <td style={tableCellStyle}>
                          {index + 1}
                        </td>

                        {["bags", "weightKg", "ratePerKg"].map(
                          (field) => (
                            <td
                              key={field}
                              style={{ padding: 6 }}
                            >
                              <input
                                type="number"
                                min="0"
                                step="any"
                                value={item[field]}
                                onChange={(e) => {
                                  const value = e.target.value;

                                  setCommissionItems((prev) =>
                                    prev.map((row, i) =>
                                      i === index
                                        ? {
                                            ...row,
                                            [field]: value,
                                          }
                                        : row
                                    )
                                  );
                                }}
                                style={{
                                  width: "100%",
                                  minWidth: 85,
                                  padding: 8,
                                  border: "1px solid #cbd5e1",
                                  borderRadius: 5,
                                  fontSize: 12,
                                  boxSizing: "border-box",
                                }}
                              />
                            </td>
                          )
                        )}

                        <td
                          style={{
                            ...tableCellStyle,
                            fontWeight: 700,
                            color: "#172554",
                          }}
                        >
                          {(
                            Number(item.weightKg || 0) *
                            Number(item.ratePerKg || 0)
                          ).toFixed(2)}
                        </td>

                        <td style={{ padding: 6 }}>
                          <button
                            type="button"
                            disabled={commissionItems.length === 1}
                            onClick={() =>
                              setCommissionItems((prev) =>
                                prev.filter((_, i) => i !== index)
                              )
                            }
                            style={{
                              border: "1px solid #fecaca",
                              background: "#fef2f2",
                              color: "#dc2626",
                              borderRadius: 5,
                              padding: "5px 9px",
                              cursor: "pointer",
                            }}
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* BAGS VALIDATION */}
              <div
                style={{
                  padding: 11,
                  background: commissionBagsMatch
                    ? "#f0fdf4"
                    : "#fff7ed",
                  border: `1px solid ${
                    commissionBagsMatch
                      ? "#bbf7d0"
                      : "#fed7aa"
                  }`,
                  borderRadius: 6,
                  marginBottom: 18,
                  fontSize: 12,
                  color: commissionBagsMatch
                    ? "#15803d"
                    : "#c2410c",
                  fontWeight: 700,
                }}
              >
                Invoice Bags: {commissionTotalBags} / Required Bags:{" "}
                {commissionExpectedBags}
                {" — "}
                {commissionBagsMatch
                  ? "Bags Matched"
                  : "Bags Not Matched"}
              </div>

              {/* DEDUCTIONS */}
              <h4
                style={{
                  color: "#172554",
                  fontSize: 14,
                  fontWeight: 700,
                  margin: "0 0 12px",
                }}
              >
                Other Charges & Deductions
              </h4>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit,minmax(170px,1fr))",
                  gap: 12,
                }}
              >
                {[
                  [
                    "Transport Cost",
                    commissionTransportCost,
                    setCommissionTransportCost,
                  ],
                  [
                    "Labour Rate / Bag",
                    commissionLabourRate,
                    setCommissionLabourRate,
                  ],
                  [
                    "Commission Rate / KG",
                    commissionRatePerKg,
                    setCommissionRatePerKg,
                  ],
                  [
                    "Other Cost",
                    commissionOtherCost,
                    setCommissionOtherCost,
                  ],
                ].map(([label, value, setter]) => (
                  <div key={label}>
                    <label
                      style={{
                        display: "block",
                        fontSize: 11,
                        color: "#475569",
                        fontWeight: 600,
                        marginBottom: 5,
                      }}
                    >
                      {label}
                    </label>

                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={value}
                      onChange={(e) =>
                        setter(e.target.value)
                      }
                      style={{
                        width: "100%",
                        padding: "9px 10px",
                        border: "1px solid #cbd5e1",
                        borderRadius: 5,
                        fontSize: 12,
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                ))}
              </div>

              {/* NOTES */}
              <div style={{ marginTop: 15 }}>
                <label
                  style={{
                    display: "block",
                    fontSize: 11,
                    color: "#475569",
                    fontWeight: 600,
                    marginBottom: 5,
                  }}
                >
                  Notes
                </label>

                <textarea
                  value={commissionNotes}
                  onChange={(e) =>
                    setCommissionNotes(e.target.value)
                  }
                  rows={2}
                  placeholder="Optional invoice notes..."
                  style={{
                    width: "100%",
                    padding: 10,
                    border: "1px solid #cbd5e1",
                    borderRadius: 5,
                    fontSize: 12,
                    resize: "vertical",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              {/* TOTALS */}
              <div
                style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: 7,
                  padding: 14,
                  marginTop: 18,
                }}
              >
                {[
                  ["Total Bags", commissionTotalBags],
                  [
                    "Total Weight (KG)",
                    commissionTotalWeight.toFixed(2),
                  ],
                  [
                    "Gross Amount",
                    commissionGrossAmount.toFixed(2),
                  ],
                  [
                    "Transport Cost",
                    Number(commissionTransportCost || 0).toFixed(2),
                  ],
                  [
                    "Labour Cost",
                    commissionLabourCost.toFixed(2),
                  ],
                  [
                    "Commission Cost",
                    (
                      commissionTotalWeight *
                      Number(commissionRatePerKg || 0)
                    ).toFixed(2),
                  ],
                  [
                    "Other Cost",
                    Number(commissionOtherCost || 0).toFixed(2),
                  ],
                  [
                    "Total Deduction",
                    commissionDeduction.toFixed(2),
                  ],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 10,
                      padding: "5px 0",
                      fontSize: 12,
                      color: "#475569",
                    }}
                  >
                    <span>{label}</span>
                    <strong>{value}</strong>
                  </div>
                ))}

                <div
                  style={{
                    borderTop: "2px solid #cbd5e1",
                    marginTop: 8,
                    paddingTop: 12,
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 16,
                    color: "#172554",
                    fontWeight: 800,
                  }}
                >
                  <span>Net Supplier Payable</span>
                  <span>
                    {commissionNetPayable.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* FOOTER ACTIONS */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 10,
                  flexWrap: "wrap",
                  marginTop: 18,
                }}
              >
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() =>
                    setSelectedCommissionLot(null)
                  }
                  style={{ padding: "9px 16px" }}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="primary-button"
                  disabled={
                    commissionSaving ||
                    !commissionBagsMatch ||
                    commissionItems.some(
                      (item) =>
                        !Number(item.bags) ||
                        !Number(item.weightKg) ||
                        item.ratePerKg === "" ||
                        Number(item.bags) <= 0 ||
                        Number(item.weightKg) <= 0 ||
                        Number(item.ratePerKg) < 0
                    ) ||
                    commissionNetPayable < 0
                  }
                  onClick={createCommissionInvoice}
                  style={{
                    padding: "9px 18px",
                    opacity:
                      commissionSaving || !commissionBagsMatch
                        ? 0.5
                        : 1,
                  }}
                >
                  {commissionSaving
                    ? "Saving..."
                    : "Save Commission Invoice"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =================================
          PAGE HEADER
      ================================== */}
      <div
        style={{
          background: "#172554",
          borderRadius: 7,
          padding: "17px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <div>
          <h2
            style={{
              color: "#ffffff",
              fontSize: 19,
              fontWeight: 700,
              margin: 0,
            }}
          >
            Commission Management
          </h2>

          <p
            style={{
              color: "#cbd5e1",
              fontSize: 11,
              margin: "5px 0 0",
            }}
          >
            Manage completed commission lots and invoices
          </p>
        </div>

        <button
          type="button"
          className="secondary-button"
          onClick={loadCommissionLots}
          disabled={commissionLoading}
          style={{
            background: "#ffffff",
            color: "#172554",
            border: "none",
            padding: "8px 14px",
            fontSize: 12,
            fontWeight: 600,
            opacity: commissionLoading ? 0.6 : 1,
          }}
        >
          {commissionLoading ? "Loading..." : "↻ Refresh"}
        </button>
      </div>

      {/* =================================
          SUMMARY CARDS
      ================================== */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(170px, 1fr))",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <div
          style={{
            ...summaryCard,
            borderTop: "3px solid #f97316",
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: "#64748b",
              textTransform: "uppercase",
            }}
          >
            Pending Lots
          </div>

          <div
            style={{
              fontSize: 24,
              fontWeight: 800,
              color: "#172554",
              marginTop: 7,
            }}
          >
            {commissionLots.length}
          </div>
        </div>

        <div
          style={{
            ...summaryCard,
            borderTop: "3px solid #2563eb",
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: "#64748b",
              textTransform: "uppercase",
            }}
          >
            Total Bags
          </div>

          <div
            style={{
              fontSize: 24,
              fontWeight: 800,
              color: "#172554",
              marginTop: 7,
            }}
          >
            {totalBags.toLocaleString()}
          </div>
        </div>

        <div
          style={{
            ...summaryCard,
            borderTop: "3px solid #16a34a",
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: "#64748b",
              textTransform: "uppercase",
            }}
          >
            Total Weight (KG)
          </div>

          <div
            style={{
              fontSize: 24,
              fontWeight: 800,
              color: "#172554",
              marginTop: 7,
            }}
          >
            {totalWeight.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
        </div>
      </div>

      {/* =================================
          PENDING LOTS SECTION
      ================================== */}
      <div
        style={{
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: 7,
          boxShadow: "0 1px 3px rgba(15,23,42,0.04)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "14px 16px",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <div>
            <h3
              style={{
                margin: 0,
                fontSize: 14,
                fontWeight: 700,
                color: "#172554",
              }}
            >
              Pending Commission Lots
            </h3>

            <p
              style={{
                margin: "4px 0 0",
                fontSize: 10,
                color: "#64748b",
              }}
            >
              Completed lots awaiting commission invoice
            </p>
          </div>

          <span
            style={{
              background: "#fff7ed",
              color: "#c2410c",
              border: "1px solid #fed7aa",
              borderRadius: 20,
              padding: "4px 10px",
              fontSize: 10,
              fontWeight: 700,
            }}
          >
            {commissionLots.length} LOTS
          </span>
        </div>

        {commissionError && (
          <div
            style={{
              margin: 12,
              padding: 11,
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: 5,
              color: "#b91c1c",
              fontSize: 12,
            }}
          >
            {commissionError}
          </div>
        )}

        {commissionLoading ? (
          <div
            style={{
              padding: 45,
              textAlign: "center",
              color: "#64748b",
              fontSize: 12,
            }}
          >
            Loading commission lots...
          </div>
        ) : commissionLots.length === 0 ? (
          <div
            style={{
              padding: "45px 15px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: 30,
                marginBottom: 10,
                color: "#94a3b8",
              }}
            >
              📋
            </div>

            <div
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: "#334155",
              }}
            >
              No Pending Commission Lots
            </div>

            <p
              style={{
                fontSize: 11,
                color: "#94a3b8",
                marginTop: 5,
              }}
            >
              Completed commission lots will appear here.
            </p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                minWidth: 850,
              }}
            >
              <thead>
                <tr>
                  <th style={tableHeaderStyle}>LOT CODE</th>
                  <th style={tableHeaderStyle}>PURCHASE DATE</th>
                  <th style={tableHeaderStyle}>PRODUCT</th>
                  <th style={tableHeaderStyle}>SUPPLIER</th>
                  <th
                    style={{
                      ...tableHeaderStyle,
                      textAlign: "right",
                    }}
                  >
                    BAGS
                  </th>
                  <th
                    style={{
                      ...tableHeaderStyle,
                      textAlign: "right",
                    }}
                  >
                    WEIGHT (KG)
                  </th>
                  <th
                    style={{
                      ...tableHeaderStyle,
                      textAlign: "center",
                    }}
                  >
                    ACTION
                  </th>
                </tr>
              </thead>

              <tbody>
                {commissionLots.map((lot) => (
                  <tr key={lot._id}>
                    <td
                      style={{
                        ...tableCellStyle,
                        fontWeight: 700,
                        color: "#172554",
                      }}
                    >
                      {lot.lotCode || "-"}
                    </td>

                    <td style={tableCellStyle}>
                      {lot.purchaseDate
                        ? new Date(
                            lot.purchaseDate
                          ).toLocaleDateString()
                        : "-"}
                    </td>

                    <td style={tableCellStyle}>
                      {lot.productId?.productName ||
                        lot.productName ||
                        "-"}
                    </td>

                    <td style={tableCellStyle}>
                      {lot.supplierId?.supplierName ||
                        lot.supplierName ||
                        "-"}
                    </td>

                    <td
                      style={{
                        ...tableCellStyle,
                        textAlign: "right",
                        fontWeight: 600,
                      }}
                    >
                      {Number(
                        lot.remainingBags || 0
                      ).toLocaleString()}
                    </td>

                    <td
                      style={{
                        ...tableCellStyle,
                        textAlign: "right",
                        fontWeight: 600,
                      }}
                    >
                      {Number(
                        lot.remainingWeightKg || 0
                      ).toFixed(2)}
                    </td>

                    <td
                      style={{
                        ...tableCellStyle,
                        textAlign: "center",
                      }}
                    >
                      <button
                        type="button"
                        className="primary-button"
                        onClick={() =>
                          setSelectedCommissionLot(lot)
                        }
                        style={{
                          padding: "6px 11px",
                          fontSize: 11,
                          whiteSpace: "nowrap",
                        }}
                      >
                        Create Invoice
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function renderCommissionHistory() {
  const summaryCard = {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: 7,
    padding: 16,
    boxShadow: "0 1px 3px rgba(15,23,42,0.04)",
  };

  const tableHeaderStyle = {
    padding: "11px 12px",
    background: "#f1f5f9",
    color: "#475569",
    fontSize: 10,
    fontWeight: 700,
    textAlign: "left",
    whiteSpace: "nowrap",
    borderBottom: "1px solid #e2e8f0",
  };

  const tableCellStyle = {
    padding: "11px 12px",
    fontSize: 12,
    color: "#334155",
    borderBottom: "1px solid #e2e8f0",
    whiteSpace: "nowrap",
  };

  const completedInvoices = commissionInvoices.filter(
    (invoice) => invoice.status === "COMPLETED"
  );

  const cancelledInvoices = commissionInvoices.filter(
    (invoice) => invoice.status === "CANCELLED"
  );

  const totalBags = completedInvoices.reduce(
    (sum, invoice) => sum + Number(invoice.totalBags || 0),
    0
  );

  const totalNetPayable = completedInvoices.reduce(
    (sum, invoice) => sum + Number(invoice.netSupplierPayable || 0),
    0
  );

  return (
    <div
      className="panel"
      style={{
        padding: 16,
        background: "#f8fafc",
        minHeight: "100%",
      }}
    >
      {/* PAGE HEADER */}
      <div
        style={{
          background: "#172554",
          borderRadius: 7,
          padding: "17px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <div>
          <h2
            style={{
              color: "#ffffff",
              fontSize: 19,
              fontWeight: 700,
              margin: 0,
            }}
          >
            Commission Invoice History
          </h2>

          <p
            style={{
              color: "#cbd5e1",
              fontSize: 11,
              margin: "5px 0 0",
            }}
          >
            View, edit and manage completed commission invoices
          </p>
        </div>

        <button
          type="button"
          className="secondary-button"
          onClick={loadCommissionInvoices}
          disabled={commissionHistoryLoading}
          style={{
            background: "#ffffff",
            color: "#172554",
            border: "none",
            padding: "8px 14px",
            fontSize: 12,
            fontWeight: 600,
            opacity: commissionHistoryLoading ? 0.6 : 1,
          }}
        >
          {commissionHistoryLoading ? "Loading..." : "↻ Refresh"}
        </button>
      </div>

      {/* SUMMARY CARDS */}


      
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
          gap: 12,
          marginBottom: 16,
        }}
      >
        {[
          {
            label: "Total Invoices",
            value: commissionInvoices.length,
            color: "#2563eb",
          },
          {
            label: "Completed Invoices",
            value: completedInvoices.length,
            color: "#16a34a",
          },
          {
            label: "Cancelled Invoices",
            value: cancelledInvoices.length,
            color: "#dc2626",
          },
          {
            label: "Total Bags",
            value: totalBags.toLocaleString(),
            color: "#f97316",
          },
          {
            label: "Net Supplier Payable",
            value: totalNetPayable.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }),
            color: "#0d9488",
          },
        ].map((card) => (
          <div
            key={card.label}
            style={{
              ...summaryCard,
              borderTop: `3px solid ${card.color}`,
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: "#64748b",
                textTransform: "uppercase",
              }}
            >
              {card.label}
            </div>

            <div
              style={{
                fontSize: 23,
                fontWeight: 800,
                color: "#172554",
                marginTop: 7,
                overflowWrap: "anywhere",
              }}
            >
              {card.value}
            </div>
          </div>
        ))}
      </div>

      {/* EDIT INVOICE FORM */}
      {editingCommissionInvoice && (
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: 7,
            marginBottom: 16,
            boxShadow: "0 1px 3px rgba(15,23,42,0.04)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              background: "#172554",
              padding: "14px 16px",
            }}
          >
            <h3
              style={{
                color: "#ffffff",
                fontSize: 15,
                margin: 0,
                fontWeight: 700,
              }}
            >
              Edit Commission Invoice
            </h3>

            <p
              style={{
                color: "#cbd5e1",
                fontSize: 11,
                margin: "5px 0 0",
              }}
            >
              Invoice: {editingCommissionInvoice.invoiceNumber}
            </p>
          </div>

          <div style={{ padding: 16 }}>
            <div style={{ marginBottom: 15 }}>
              <label
                style={{
                  display: "block",
                  fontSize: 11,
                  color: "#475569",
                  fontWeight: 600,
                  marginBottom: 5,
                }}
              >
                Edit Reason *
              </label>

              <textarea
                value={commissionEditReason}
                onChange={(e) => setCommissionEditReason(e.target.value)}
                placeholder="Enter reason for editing"
                rows={2}
                style={{
                  width: "100%",
                  padding: 10,
                  border: "1px solid #cbd5e1",
                  borderRadius: 5,
                  fontSize: 12,
                  boxSizing: "border-box",
                  resize: "vertical",
                }}
              />
            </div>

            <h4
              style={{
                color: "#172554",
                fontSize: 13,
                fontWeight: 700,
                margin: "0 0 10px",
              }}
            >
              Invoice Items
            </h4>

            <div style={{ overflowX: "auto", marginBottom: 16 }}>
              <table
                style={{
                  width: "100%",
                  minWidth: 550,
                  borderCollapse: "collapse",
                }}
              >
                <thead>
                  <tr>
                    {["SL", "BAGS", "WEIGHT (KG)", "RATE / KG", "AMOUNT"].map(
                      (heading) => (
                        <th key={heading} style={tableHeaderStyle}>
                          {heading}
                        </th>
                      )
                    )}
                  </tr>
                </thead>

                <tbody>
                  {commissionItems.map((item, index) => (
                    <tr key={index}>
                      <td style={tableCellStyle}>{index + 1}</td>

                      {["bags", "weightKg", "ratePerKg"].map((field) => (
                        <td key={field} style={{ padding: 6 }}>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={item[field]}
                            onChange={(e) =>
                              setCommissionItems((prev) =>
                                prev.map((row, i) =>
                                  i === index
                                    ? { ...row, [field]: e.target.value }
                                    : row
                                )
                              )
                            }
                            style={{
                              width: "100%",
                              minWidth: 85,
                              padding: 8,
                              border: "1px solid #cbd5e1",
                              borderRadius: 5,
                              fontSize: 12,
                              boxSizing: "border-box",
                            }}
                          />
                        </td>
                      ))}

                      <td
                        style={{
                          ...tableCellStyle,
                          fontWeight: 700,
                          color: "#172554",
                        }}
                      >
                        {(
                          Number(item.weightKg || 0) *
                          Number(item.ratePerKg || 0)
                        ).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h4
              style={{
                color: "#172554",
                fontSize: 13,
                fontWeight: 700,
                margin: "0 0 12px",
              }}
            >
              Other Charges & Deductions
            </h4>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))",
                gap: 12,
              }}
            >
              {[
                ["Transport Cost", commissionTransportCost, setCommissionTransportCost],
                ["Labour Rate / Bag", commissionLabourRate, setCommissionLabourRate],
                ["Commission Rate / KG", commissionRatePerKg, setCommissionRatePerKg],
                ["Other Cost", commissionOtherCost, setCommissionOtherCost],
              ].map(([label, value, setter]) => (
                <div key={label}>
                  <label
                    style={{
                      display: "block",
                      fontSize: 11,
                      color: "#475569",
                      fontWeight: 600,
                      marginBottom: 5,
                    }}
                  >
                    {label}
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={value}
                    onChange={(e) => setter(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "9px 10px",
                      border: "1px solid #cbd5e1",
                      borderRadius: 5,
                      fontSize: 12,
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              ))}
            </div>

            <div style={{ marginTop: 14 }}>
              <label
                style={{
                  display: "block",
                  fontSize: 11,
                  color: "#475569",
                  fontWeight: 600,
                  marginBottom: 5,
                }}
              >
                Notes
              </label>

              <textarea
                value={commissionNotes}
                onChange={(e) => setCommissionNotes(e.target.value)}
                rows={2}
                style={{
                  width: "100%",
                  padding: 10,
                  border: "1px solid #cbd5e1",
                  borderRadius: 5,
                  fontSize: 12,
                  boxSizing: "border-box",
                  resize: "vertical",
                }}
              />
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
                flexWrap: "wrap",
                marginTop: 16,
              }}
            >
              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  setEditingCommissionInvoice(null);
                  setCommissionEditReason("");
                }}
                disabled={commissionEditSaving}
                style={{ padding: "9px 16px" }}
              >
                Close
              </button>

              <button
                type="button"
                className="primary-button"
                onClick={updateCommissionInvoice}
                disabled={commissionEditSaving || !commissionEditReason.trim()}
                style={{ padding: "9px 16px" }}
              >
                {commissionEditSaving ? "Updating..." : "Update Invoice"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HISTORY TABLE */}
      <div
        style={{
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: 7,
          boxShadow: "0 1px 3px rgba(15,23,42,0.04)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "14px 16px",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <div>
            <h3
              style={{
                margin: 0,
                fontSize: 14,
                fontWeight: 700,
                color: "#172554",
              }}
            >
              All Commission Invoices
            </h3>

            <p
              style={{
                margin: "4px 0 0",
                fontSize: 10,
                color: "#64748b",
              }}
            >
              Complete invoice records and transaction status
            </p>
          </div>

          <span
            style={{
              background: "#eff6ff",
              color: "#1d4ed8",
              border: "1px solid #bfdbfe",
              borderRadius: 20,
              padding: "4px 10px",
              fontSize: 10,
              fontWeight: 700,
            }}
          >
            {commissionInvoices.length} INVOICES
          </span>
        </div>

        {commissionHistoryError && (
          <div
            style={{
              margin: 12,
              padding: 11,
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: 5,
              color: "#b91c1c",
              fontSize: 12,
            }}
          >
            {commissionHistoryError}
          </div>
        )}

        {commissionHistoryLoading ? (
          <div
            style={{
              padding: 45,
              textAlign: "center",
              color: "#64748b",
              fontSize: 12,
            }}
          >
            Loading commission invoices...
          </div>
        ) : commissionInvoices.length === 0 ? (
          <div style={{ padding: "45px 15px", textAlign: "center" }}>
            <div style={{ fontSize: 30, marginBottom: 10 }}>📋</div>

            <div
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: "#334155",
              }}
            >
              No Commission Invoices Found
            </div>

            <p
              style={{
                fontSize: 11,
                color: "#94a3b8",
                marginTop: 5,
              }}
            >
              Completed commission invoices will appear here.
            </p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                minWidth: 1100,
              }}
            >
              <thead>
                <tr>
                  <th style={tableHeaderStyle}>INVOICE DATE</th>
                  <th style={tableHeaderStyle}>INVOICE NUMBER</th>
                  <th style={tableHeaderStyle}>SUPPLIER</th>
                  <th style={tableHeaderStyle}>LOT</th>
                  <th style={{ ...tableHeaderStyle, textAlign: "right" }}>
                    BAGS
                  </th>
                  <th style={{ ...tableHeaderStyle, textAlign: "right" }}>
                    GROSS
                  </th>
                  <th style={{ ...tableHeaderStyle, textAlign: "right" }}>
                    DEDUCTION
                  </th>
                  <th style={{ ...tableHeaderStyle, textAlign: "right" }}>
                    NET PAYABLE
                  </th>
                  <th style={tableHeaderStyle}>STATUS</th>
                  <th style={{ ...tableHeaderStyle, textAlign: "center" }}>
                    ACTION
                  </th>
                </tr>
              </thead>

              <tbody>
                {commissionInvoices.map((invoice) => (
                  <tr key={invoice._id}>
                    <td style={tableCellStyle}>
                      {invoice.invoiceDate
                        ? new Date(invoice.invoiceDate).toLocaleDateString()
                        : "-"}
                    </td>

                    <td
                      style={{
                        ...tableCellStyle,
                        fontWeight: 700,
                        color: "#172554",
                      }}
                    >
                      {invoice.invoiceNumber || "-"}
                    </td>

                    <td style={tableCellStyle}>
                      {invoice.supplierName || invoice.supplierId?.name || "-"}
                    </td>

                    <td style={tableCellStyle}>
                      {invoice.lotCode || "-"}
                    </td>

                    <td style={{ ...tableCellStyle, textAlign: "right" }}>
                      {Number(invoice.totalBags || 0).toLocaleString()}
                    </td>

                    <td style={{ ...tableCellStyle, textAlign: "right" }}>
                      {Number(invoice.grossAmount || 0).toFixed(2)}
                    </td>

                    <td style={{ ...tableCellStyle, textAlign: "right" }}>
                      {Number(invoice.totalDeduction || 0).toFixed(2)}
                    </td>

                    <td
                      style={{
                        ...tableCellStyle,
                        textAlign: "right",
                        fontWeight: 700,
                        color: "#172554",
                      }}
                    >
                      {Number(invoice.netSupplierPayable || 0).toFixed(2)}
                    </td>

                    <td style={tableCellStyle}>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "4px 9px",
                          borderRadius: 20,
                          fontSize: 10,
                          fontWeight: 700,
                          background:
                            invoice.status === "COMPLETED"
                              ? "#f0fdf4"
                              : "#fef2f2",
                          color:
                            invoice.status === "COMPLETED"
                              ? "#15803d"
                              : "#dc2626",
                          border:
                            invoice.status === "COMPLETED"
                              ? "1px solid #bbf7d0"
                              : "1px solid #fecaca",
                        }}
                      >
                        {invoice.status || "-"}
                      </span>
                    </td>

                    <td style={{ ...tableCellStyle, textAlign: "center" }}>
                      {invoice.status === "COMPLETED" ? (
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "center",
                            gap: 6,
                          }}
                        >
                          <button
                            type="button"
                            className="secondary-button"
                            onClick={() => openCommissionInvoiceEdit(invoice)}
                            style={{ padding: "5px 9px", fontSize: 11 }}
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            className="danger-button"
                            onClick={() => cancelCommissionInvoice(invoice._id)}
                            style={{ padding: "5px 9px", fontSize: 11 }}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <span style={{ color: "#94a3b8", fontSize: 11 }}>
                          No Action
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}




function renderCommissionReports() {
  const summary = commissionReports?.summary || {};

  const reportCards = [
    ["Completed Invoices", summary.completedInvoices || 0, "#2563eb"],
    ["Cancelled Invoices", summary.cancelledInvoices || 0, "#dc2626"],
    ["Total Bags", summary.totalBags || 0, "#0891b2"],
    ["Total Weight (KG)", summary.totalWeightKg || 0, "#7c3aed"],
    ["Gross Amount", summary.grossAmount || 0, "#16a34a"],
    ["Pocket Lot Profit", summary.pocketLotProfit || 0, "#16a34a"],
    ["Transport Cost", summary.transportCost || 0, "#d97706"],
    ["Labour Cost", summary.labourCost || 0, "#0d9488"],
    ["Commission Cost", summary.commissionCost || 0, "#6366f1"],
    ["Other Cost", summary.otherCost || 0, "#64748b"],
    ["Total Deduction", summary.totalDeduction || 0, "#ea580c"],
    ["Net Supplier Payable", summary.netSupplierPayable || 0, "#15803d"],
  ];

  const formatNumber = (value) =>
    Number(value || 0).toLocaleString("en-BD", {
      maximumFractionDigits: 2,
    });

  return (
    <div
      className="panel"
      style={{
        padding: 16,
        background: "#f8fafc",
        minHeight: "100%",
      }}
    >
      {/* HEADER */}
      <div
        style={{
          background: "#172554",
          borderRadius: 7,
          padding: "17px 20px",
          marginBottom: 16,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              color: "#ffffff",
              fontSize: 19,
              fontWeight: 700,
            }}
          >
            Commission Reports
          </h2>

          <p
            style={{
              margin: "5px 0 0",
              color: "#cbd5e1",
              fontSize: 11,
            }}
          >
            Commission invoice summary and financial reports
          </p>
        </div>

        <button
          type="button"
          onClick={loadCommissionReports}
          disabled={commissionReportsLoading}
          style={{
            background: "#ffffff",
            color: "#172554",
            border: "none",
            borderRadius: 5,
            padding: "9px 15px",
            fontSize: 12,
            fontWeight: 700,
            cursor: commissionReportsLoading ? "not-allowed" : "pointer",
            opacity: commissionReportsLoading ? 0.7 : 1,
          }}
        >
          {commissionReportsLoading ? "Loading..." : "↻ Refresh Reports"}
        </button>
      </div>

      {commissionReportsLoading ? (
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: 7,
            padding: 30,
            textAlign: "center",
            color: "#64748b",
            fontSize: 13,
          }}
        >
          Loading commission reports...
        </div>
      ) : (
        <>
      
  {/* COMMISSION REPORT FILTERS */}
  <div
    style={{
      background: "#ffffff",
      border: "1px solid #e2e8f0",
      borderRadius: 7,
      padding: 16,
      marginBottom: 18,
    }}
  >
    <h3
      style={{
        margin: "0 0 14px",
        fontSize: 14,
        color: "#172554",
        fontWeight: 700,
      }}
    >
      Filter Commission Reports
    </h3>

    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        gap: 12,
        alignItems: "end",
      }}
    >
      <div>
        <label style={{ display: "block", fontSize: 11, marginBottom: 6 }}>
          Start Date
        </label>
        <input
          type="date"
          value={commissionReportFilters.startDate}
          onChange={(e) =>
            setCommissionReportFilters((prev) => ({
              ...prev,
              startDate: e.target.value,
            }))
          }
          style={{ width: "100%", padding: 9, border: "1px solid #cbd5e1", borderRadius: 5 }}
        />
      </div>

      <div>
        <label style={{ display: "block", fontSize: 11, marginBottom: 6 }}>
          End Date
        </label>
        <input
          type="date"
          value={commissionReportFilters.endDate}
          onChange={(e) =>
            setCommissionReportFilters((prev) => ({
              ...prev,
              endDate: e.target.value,
            }))
          }
          style={{ width: "100%", padding: 9, border: "1px solid #cbd5e1", borderRadius: 5 }}
        />
      </div>

<div style={{ position: "relative" }}>
  <label style={{ display: "block", fontSize: 11, marginBottom: 6 }}>
    Supplier
  </label>

  <input
    type="text"
    value={commissionSupplierSearch}
    placeholder="Search Supplier..."
    onFocus={() => setShowCommissionSupplierSuggestions(true)}
    onChange={(e) => {
      setCommissionSupplierSearch(e.target.value);
      setShowCommissionSupplierSuggestions(true);

      setCommissionReportFilters((prev) => ({
        ...prev,
        supplierId: "",
      }));
    }}
    style={{
      width: "100%",
      padding: 9,
      border: "1px solid #cbd5e1",
      borderRadius: 5,
      boxSizing: "border-box",
    }}
  />

  {showCommissionSupplierSuggestions && (
    <div
      style={{
        position: "absolute",
        top: "100%",
        left: 0,
        right: 0,
        background: "#ffffff",
        border: "1px solid #cbd5e1",
        borderRadius: 5,
        maxHeight: 180,
        overflowY: "auto",
        zIndex: 100,
      }}
    >
      <div
        onClick={() => {
          setCommissionReportFilters((prev) => ({
            ...prev,
            supplierId: "",
          }));
          setCommissionSupplierSearch("");
          setShowCommissionSupplierSuggestions(false);
        }}
        style={{ padding: 9, cursor: "pointer", fontSize: 12 }}
      >
        All Suppliers
      </div>

      {(commissionReports?.supplierOptions || [])
        .filter((supplier) =>
          (supplier.supplierName || "")
            .toLowerCase()
            .includes(commissionSupplierSearch.toLowerCase())
        )
        .map((supplier) => (
          <div
            key={supplier._id}
            onClick={() => {
              setCommissionReportFilters((prev) => ({
                ...prev,
                supplierId: supplier._id,
              }));
              setCommissionSupplierSearch(supplier.supplierName);
              setShowCommissionSupplierSuggestions(false);
            }}
            style={{
              padding: 9,
              cursor: "pointer",
              fontSize: 12,
              borderTop: "1px solid #f1f5f9",
            }}
          >
            {supplier.supplierName}
          </div>
        ))}
    </div>
  )}
</div>

    <div style={{ position: "relative" }}>
  <label style={{ display: "block", fontSize: 11, marginBottom: 6 }}>
    Lot
  </label>

  <input
    type="text"
    value={commissionLotSearch}
    placeholder="Search Lot..."
    onFocus={() => setShowCommissionLotSuggestions(true)}
    onChange={(e) => {
      setCommissionLotSearch(e.target.value);
      setShowCommissionLotSuggestions(true);

      setCommissionReportFilters((prev) => ({
        ...prev,
        lotId: "",
      }));
    }}
    style={{
      width: "100%",
      padding: 9,
      border: "1px solid #cbd5e1",
      borderRadius: 5,
      boxSizing: "border-box",
    }}
  />

  {showCommissionLotSuggestions && (
    <div
      style={{
        position: "absolute",
        top: "100%",
        left: 0,
        right: 0,
        background: "#ffffff",
        border: "1px solid #cbd5e1",
        borderRadius: 5,
        maxHeight: 180,
        overflowY: "auto",
        zIndex: 100,
      }}
    >
      <div
        onClick={() => {
          setCommissionReportFilters((prev) => ({
            ...prev,
            lotId: "",
          }));
          setCommissionLotSearch("");
          setShowCommissionLotSuggestions(false);
        }}
        style={{ padding: 9, cursor: "pointer", fontSize: 12 }}
      >
        All Lots
      </div>

      {(commissionReports?.lotOptions || [])
        .filter((lot) =>
          (lot.lotCode || "")
            .toLowerCase()
            .includes(commissionLotSearch.toLowerCase())
        )
        .map((lot) => (
          <div
            key={lot._id}
            onClick={() => {
              setCommissionReportFilters((prev) => ({
                ...prev,
                lotId: lot._id,
              }));
              setCommissionLotSearch(lot.lotCode);
              setShowCommissionLotSuggestions(false);
            }}
            style={{
              padding: 9,
              cursor: "pointer",
              fontSize: 12,
              borderTop: "1px solid #f1f5f9",
            }}
          >
            {lot.lotCode}
          </div>
        ))}
    </div>
  )}
</div>
      <button
        type="button"
        onClick={loadCommissionReports}
        disabled={commissionReportsLoading}
        style={{
          padding: 10,
          background: "#172554",
          color: "#ffffff",
          border: "none",
          borderRadius: 5,
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        Apply Filters
      </button>

      <button
  type="button"
  onClick={() => {
    resetCommissionReportFilters();
    setTimeout(() => loadCommissionReports(), 0);
  }}
  style={{
    padding: 10,
    background: "#64748b",
    color: "#ffffff",
    border: "none",
    borderRadius: 5,
    fontWeight: 700,
    cursor: "pointer",
  }}
>
  ↻ Reset Filters
</button>
    </div>
  </div>

  {/* SUMMARY CARDS */}


          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 12,
              marginBottom: 18,
            }}
          >
            {reportCards.map(([label, value, color]) => (
              <div
                key={label}
                style={{
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderTop: `3px solid ${color}`,
                  borderRadius: 7,
                  padding: 16,
                  boxShadow: "0 1px 3px rgba(15,23,42,0.04)",
                }}
              >
                <div
                  style={{
                    color: "#64748b",
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                >
                  {label}
                </div>

                <div
                  style={{
                    fontSize: 20,
                    fontWeight: 700,
                    marginTop: 8,
                    color: "#172554",
                    overflowWrap: "anywhere",
                  }}
                >
                  {formatNumber(value)}
                </div>
              </div>
            ))}
          </div>

          {/* INVOICE REPORT TABLE */}
          <div
           id="commission-invoice-report"
            style={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: 7,
              overflow: "hidden",
            }}
          >
            <style>{`
  @page {
    size: A4 landscape;
    margin: 10mm;
  }

  @media print {
    body * {
      visibility: hidden !important;
    }

    #commission-invoice-report,
    #commission-invoice-report * {
      visibility: visible !important;
    }

    #commission-invoice-report {
      position: absolute !important;
      left: 0 !important;
      top: 0 !important;
      width: 100% !important;
      border: none !important;
      overflow: visible !important;
    }

    #commission-invoice-report .no-print {
      display: none !important;
    }

    #commission-invoice-report div {
      overflow: visible !important;
    }

    #commission-invoice-report table {
      width: 100% !important;
      min-width: 0 !important;
      border-collapse: collapse !important;
    }

    #commission-invoice-report th,
    #commission-invoice-report td {
      font-size: 13px !important;
      padding: 5px !important;
    }
  }
`}</style>
            <div
              style={{
                padding: "14px 16px",
                borderBottom: "1px solid #e2e8f0",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              <div>
                <h3
                  style={{
                    margin: 0,
                    color: "#172554",
                    fontSize: 14,
                    fontWeight: 700,
                  }}
                >
                  Commission Invoice Report
                </h3>

                <p
                  style={{
                    margin: "4px 0 0",
                    color: "#64748b",
                    fontSize: 11,
                  }}
                >
                  Invoice-wise commission and supplier payable details
                </p>
              </div>

             
<div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
  <span
    style={{
      background: "#f1f5f9",
      color: "#475569",
      padding: "5px 10px",
      borderRadius: 5,
      fontSize: 11,
      fontWeight: 600,
    }}
  >
    Total Records: {(commissionReports?.invoices || []).length}
  </span>

  <button
  type="button"
  className="no-print"
  onClick={() => window.print()}
    style={{
      background: "#1d4ed8",
      color: "#ffffff",
      border: "none",
      borderRadius: 5,
      padding: "7px 13px",
      fontSize: 11,
      fontWeight: 700,
      cursor: "pointer",
    }}
  >
    🖨 Print Report
  </button>
</div>

            </div>

            <div style={{ overflowX: "auto" }}>
              <table
                className="data-table"
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  minWidth: 1050,
                }}
              >
                <thead>
                  <tr style={{ background: "#f1f5f9" }}>
                    {[
                      "Invoice Number",
                      "Date",
                      "Supplier",
                      "Lot Code",
                      "Bags",
                      "Weight KG",
                      "Gross",
                      "Deduction",
                      "Net Payable",
                      "Pocket Lot Profit",
                      "Status",
                    ].map((heading) => (
                      <th
                        key={heading}
                        style={{
                          padding: "11px 12px",
                          fontSize: 10,
                          fontWeight: 700,
                          color: "#475569",
                          textAlign: "left",
                          whiteSpace: "nowrap",
                          borderBottom: "1px solid #e2e8f0",
                        }}
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {(commissionReports?.invoices || []).map((invoice) => (
                    <tr key={invoice._id}>
                      <td
                        style={{
                          padding: "11px 12px",
                          fontSize: 12,
                          fontWeight: 600,
                          color: "#172554",
                          borderBottom: "1px solid #e2e8f0",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {invoice.invoiceNumber || "-"}
                      </td>

                      <td
                        style={{
                          padding: "11px 12px",
                          fontSize: 12,
                          color: "#475569",
                          borderBottom: "1px solid #e2e8f0",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {invoice.invoiceDate
                          ? new Date(invoice.invoiceDate).toLocaleDateString()
                          : "-"}
                      </td>

                      <td
                        style={{
                          padding: "11px 12px",
                          fontSize: 12,
                          color: "#334155",
                          borderBottom: "1px solid #e2e8f0",
                        }}
                      >
                        {invoice.supplierName || "-"}
                      </td>

                      <td
                        style={{
                          padding: "11px 12px",
                          fontSize: 12,
                          color: "#475569",
                          borderBottom: "1px solid #e2e8f0",
                        }}
                      >
                        {invoice.lotCode || "-"}
                      </td>

                      <td
                        style={{
                          padding: "11px 12px",
                          fontSize: 12,
                          color: "#334155",
                          borderBottom: "1px solid #e2e8f0",
                        }}
                      >
                        {invoice.totalBags ?? 0}
                      </td>

                      <td
                        style={{
                          padding: "11px 12px",
                          fontSize: 12,
                          color: "#334155",
                          borderBottom: "1px solid #e2e8f0",
                        }}
                      >
                        {Number(invoice.totalWeightKg || 0).toFixed(2)}
                      </td>

                      <td
                        style={{
                          padding: "11px 12px",
                          fontSize: 12,
                          color: "#334155",
                          borderBottom: "1px solid #e2e8f0",
                        }}
                      >
                        {formatNumber(invoice.grossAmount)}
                      </td>

                      <td
                        style={{
                          padding: "11px 12px",
                          fontSize: 12,
                          color: "#dc2626",
                          borderBottom: "1px solid #e2e8f0",
                        }}
                      >
                        {formatNumber(invoice.totalDeduction)}
                      </td>

                      <td
                        style={{
                          padding: "11px 12px",
                          fontSize: 12,
                          fontWeight: 700,
                          color: "#15803d",
                          borderBottom: "1px solid #e2e8f0",
                        }}
                      >
                        {formatNumber(invoice.netSupplierPayable)}
                      </td>
<td
  style={{
    padding: "11px 12px",
    fontSize: 12,
    fontWeight: 700,
    color:
      Number(invoice.pocketLotProfit) >= 0
        ? "#15803d"
        : "#dc2626",
    borderBottom: "1px solid #e2e8f0",
    whiteSpace: "nowrap",
  }}
>
  {invoice.pocketLotProfit === null ||
  invoice.pocketLotProfit === undefined
    ? "-"
    : formatNumber(invoice.pocketLotProfit)}
</td>
                      <td
                        style={{
                          padding: "11px 12px",
                          borderBottom: "1px solid #e2e8f0",
                        }}
                      >
                        <span
                          style={{
                            display: "inline-block",
                            padding: "4px 9px",
                            borderRadius: 4,
                            fontSize: 10,
                            fontWeight: 700,
                            background:
                              invoice.status === "CANCELLED"
                                ? "#fee2e2"
                                : "#dcfce7",
                            color:
                              invoice.status === "CANCELLED"
                                ? "#b91c1c"
                                : "#15803d",
                          }}
                        >
                          {invoice.status || "-"}
                        </span>
                      </td>
                    </tr>
                  ))}

                  {(commissionReports?.invoices || []).length === 0 && (
                    <tr>
                      <td
                        colSpan={11}
                        style={{
                          textAlign: "center",
                          padding: 30,
                          color: "#94a3b8",
                          fontSize: 12,
                        }}
                      >
                        No commission report records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}


async function createCommissionInvoice() {
  if (!selectedCommissionLot) {
    toast.error("Please select a Commission Lot");
    return;
  }

  try {
    setCommissionSaving(true);

    const result = await apiRequest("/commission", {
      method: "POST",
      body: JSON.stringify({
        lotId: selectedCommissionLot._id,
        invoiceDate: new Date().toISOString(),

        items: commissionItems.map((item) => ({
          bags: Number(item.bags),
          weightKg: Number(item.weightKg),
          ratePerKg: Number(item.ratePerKg),
        })),

        transportCost: Number(commissionTransportCost || 0),
        labourRatePerBag: Number(commissionLabourRate || 0),
        commissionRatePerKg: Number(commissionRatePerKg || 0),
        otherCost: Number(commissionOtherCost || 0),

        notes: commissionNotes.trim(),
      }),
    });

    toast.success(
      result.message || "Commission Invoice created successfully"
    );

    setSelectedCommissionLot(null);

    setCommissionItems([
      { bags: "", weightKg: "", ratePerKg: "" },
    ]);

    setCommissionTransportCost(0);
    setCommissionLabourRate(0);
    setCommissionRatePerKg(0);
    setCommissionOtherCost(0);
    setCommissionNotes("");

    await loadCommissionLots();

  } catch (error) {
    toast.error(error.message);
  } finally {
    setCommissionSaving(false);
  }
}


function renderSales() {
const compactInput = {
  ...inputStyle,
  width: "100%",
  minWidth: 0,
  height: 34,
  padding: "4px 8px",
  fontSize: 12,
  fontWeight: 500,
  border: "1px solid #cbd5e1",
  borderRadius: 5,
  boxSizing: "border-box",
  background: "#fff",
  color: "#1e293b",
};

const fieldLabel = {
  display: "block",
  marginBottom: 4,
  fontSize: 10,
  fontWeight: 700,
  color: "#475569",
  lineHeight: 1.3,
  textTransform: "uppercase",
  letterSpacing: ".25px",
};

const sectionStyle = {
  padding: 12,
  background: "#fff",
  border: "1px solid #dbe3ed",
  borderRadius: 7,
  marginBottom: 10,
  boxShadow: "0 1px 2px rgba(15,23,42,.03)",
};

const sectionHeading = {
  margin: "0 0 10px",
  fontSize: 13,
  fontWeight: 800,
  color: "#1e293b",
  display: "flex",
  alignItems: "center",
  gap: 7,
  paddingBottom: 8,
  borderBottom: "1px solid #edf1f5",
};

  const updateSalesFormField = (field, value) => {
    setSalesForm((prev) => ({ ...prev, [field]: value }));
  };

  const updateSalesLineField = (field, value) => {
    setSalesLineForm((prev) => ({ ...prev, [field]: value }));
  };


return (
  <>
    <div className="panel" style={{ padding: 16, background: "#f8fafc" }}>
      {/* PAGE HEADER */}
      <div style={{
        marginTop: 8,
        marginBottom: 16,
        padding: "16px 20px",
        background: "#172554",
        borderRadius: 10,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12,
        flexWrap: "wrap",
        color: "#fff",
        boxShadow: "0 3px 10px rgba(15,23,42,.12)",
      }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 21, fontWeight: 800 }}>
            Sales Management
          </h2>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "#cbd5e1" }}>
            Sales invoice management and customer transactions
          </p>
        </div>

     {activePage !== "Sales Collection" &&
  activePage !== "Customer Payment" && (
  <button
    type="button"
    className="primary-button"
    onClick={openSalesForm}
    style={{ background: "#f97316", borderColor: "#f97316" }}
  >
    <Plus size={17} /> New Sales Invoice
  </button>
)}

{(activePage === "Sales Collection" ||
  activePage === "Customer Payment") && (
  <button
    type="button"
    onClick={loadCollectionHistory}
    disabled={collectionHistoryLoading}
    style={{
      background: "#0f766e",
      color: "#fff",
      border: "none",
      borderRadius: 7,
      padding: "9px 14px",
      fontWeight: 700,
      cursor: "pointer",
    }}
  >
    {collectionHistoryLoading ? "Loading..." : "Refresh Collection"}
  </button>
)}
      </div>

    
     
{/* ======================================== */}
{/* SALES COLLECTION PAGE */}
{/* ======================================== */}

{(activePage === "Sales Collection" ||
  activePage === "Customer Payment") && (
  <div style={{ display: "grid", gap: 16 }}>

    {/* COLLECTION FORM */}
    <div style={{
      background: "#fff",
      border: "1px solid #e2e8f0",
      borderRadius: 10,
      padding: 18,
    }}>
      <h3 style={{
        margin: "0 0 16px",
        color: "#172554",
        fontSize: 17,
        fontWeight: 800,
      }}>
        💰 Receive Customer Payment
      </h3>

      {/* CUSTOMER SEARCH */}
      <div style={{ marginBottom: 16, position: "relative" }}>
        <label style={{
          display: "block",
          fontSize: 12,
          fontWeight: 700,
          color: "#475569",
          marginBottom: 6,
        }}>
          Search Customer *
        </label>

        <input
          type="text"
          value={collectionCustomerSearch}
          onChange={(e) => searchCollectionCustomers(e.target.value)}
          onFocus={() => {
            if (collectionCustomerOptions.length > 0) {
              setShowCollectionCustomerOptions(true);
            }
          }}
          placeholder="Customer name or mobile number..."
          style={{
            width: "100%",
            padding: "11px 12px",
            border: "1px solid #cbd5e1",
            borderRadius: 7,
            fontSize: 13,
            boxSizing: "border-box",
          }}
        />

        {collectionCustomerLoading && (
          <div style={{ fontSize: 11, color: "#64748b", marginTop: 5 }}>
            Searching customers...
          </div>
        )}

        {showCollectionCustomerOptions &&
          collectionCustomerOptions.length > 0 && (
            <div style={{
              position: "absolute",
              top: "100%",
              left: 0,
              right: 0,
              zIndex: 20,
              background: "#fff",
              border: "1px solid #cbd5e1",
              borderRadius: 7,
              maxHeight: 220,
              overflowY: "auto",
              boxShadow: "0 5px 15px rgba(0,0,0,.12)",
            }}>
              {collectionCustomerOptions.map((customer) => (
                <button
                  key={customer._id}
                  type="button"
                  onClick={() => {
                    setSelectedCollectionCustomer(customer);
                    setCollectionCustomerSearch(
                      customer.customerName || ""
                    );
                    setShowCollectionCustomerOptions(false);
                    setCollectionCustomerOptions([]);
                    setCollectionAmount("");
                  }}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    padding: "11px 12px",
                    border: "none",
                    borderBottom: "1px solid #f1f5f9",
                    background: "#fff",
                    cursor: "pointer",
                  }}
                >
                  <div style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#172554",
                  }}>
                    {customer.customerName}
                  </div>
                  <div style={{
                    fontSize: 11,
                    color: "#64748b",
                    marginTop: 3,
                  }}>
                    {customer.mobile || ""}
                    {customer.companyName
                      ? ` • ${customer.companyName}`
                      : ""}
                  </div>
                </button>
              ))}
            </div>
          )}
      </div>

      {/* SELECTED CUSTOMER DUE */}
      {selectedCollectionCustomer && (
        <div style={{
          padding: 15,
          background: "#eff6ff",
          border: "1px solid #bfdbfe",
          borderRadius: 8,
          marginBottom: 16,
        }}>
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 10,
            flexWrap: "wrap",
          }}>
            <div>
              <div style={{
                fontSize: 14,
                fontWeight: 800,
                color: "#172554",
              }}>
                {selectedCollectionCustomer.customerName}
              </div>
              <div style={{
                fontSize: 12,
                color: "#475569",
                marginTop: 4,
              }}>
                {selectedCollectionCustomer.mobile || ""}
              </div>
            </div>

            <div style={{ textAlign: "right" }}>
              <div style={{
                fontSize: 11,
                color: "#64748b",
                fontWeight: 700,
              }}>
                CURRENT CUSTOMER DUE
              </div>
              <div style={{
                fontSize: 21,
                fontWeight: 800,
                color: "#dc2626",
                marginTop: 3,
              }}>
                ৳ {Number(
                  selectedCollectionCustomer.currentBalance || 0
                ).toLocaleString("en-BD")}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PAYMENT FIELDS */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
        gap: 13,
      }}>

        <div>
          <label style={{
            display: "block",
            fontSize: 12,
            fontWeight: 700,
            color: "#475569",
            marginBottom: 6,
          }}>
            Collection Amount (৳) *
          </label>
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={collectionAmount}
            onChange={(e) => setCollectionAmount(e.target.value)}
            placeholder="Enter amount"
            disabled={!selectedCollectionCustomer}
            style={{
              width: "100%",
              padding: 10,
              border: "1px solid #cbd5e1",
              borderRadius: 7,
              boxSizing: "border-box",
            }}
          />
        </div>

        <div>
          <label style={{
            display: "block",
            fontSize: 12,
            fontWeight: 700,
            color: "#475569",
            marginBottom: 6,
          }}>
            Payment Method *
          </label>
          <select
            value={collectionPaymentMethod}
            onChange={(e) => setCollectionPaymentMethod(e.target.value)}
            style={{
              width: "100%",
              padding: 10,
              border: "1px solid #cbd5e1",
              borderRadius: 7,
              background: "#fff",
              boxSizing: "border-box",
            }}
          >
            <option value="CASH">Cash</option>
            <option value="BANK">Bank</option>
            <option value="BKASH">bKash</option>
            <option value="NAGAD">Nagad</option>
            <option value="ROCKET">Rocket</option>
            <option value="OTHER">Other</option>
          </select>
        </div>

        <div>
          <label style={{
            display: "block",
            fontSize: 12,
            fontWeight: 700,
            color: "#475569",
            marginBottom: 6,
          }}>
            Transaction Date *
          </label>
          <input
            type="date"
            value={collectionTransactionDate}
            onChange={(e) => setCollectionTransactionDate(e.target.value)}
            style={{
              width: "100%",
              padding: 10,
              border: "1px solid #cbd5e1",
              borderRadius: 7,
              boxSizing: "border-box",
            }}
          />
        </div>

        <div>
          <label style={{
            display: "block",
            fontSize: 12,
            fontWeight: 700,
            color: "#475569",
            marginBottom: 6,
          }}>
            Transaction ID
          </label>
          <input
            type="text"
            value={collectionTransactionId}
            onChange={(e) => setCollectionTransactionId(e.target.value)}
            placeholder="Transaction ID"
            style={{
              width: "100%",
              padding: 10,
              border: "1px solid #cbd5e1",
              borderRadius: 7,
              boxSizing: "border-box",
            }}
          />
        </div>

        <div>
          <label style={{
            display: "block",
            fontSize: 12,
            fontWeight: 700,
            color: "#475569",
            marginBottom: 6,
          }}>
            Reference
          </label>
          <input
            type="text"
            value={collectionReference}
            onChange={(e) => setCollectionReference(e.target.value)}
            placeholder="Reference (optional)"
            style={{
              width: "100%",
              padding: 10,
              border: "1px solid #cbd5e1",
              borderRadius: 7,
              boxSizing: "border-box",
            }}
          />
        </div>

        <div>
          <label style={{
            display: "block",
            fontSize: 12,
            fontWeight: 700,
            color: "#475569",
            marginBottom: 6,
          }}>
            Notes
          </label>
          <input
            type="text"
            value={collectionDescription}
            onChange={(e) => setCollectionDescription(e.target.value)}
            placeholder="Payment notes (optional)"
            style={{
              width: "100%",
              padding: 10,
              border: "1px solid #cbd5e1",
              borderRadius: 7,
              boxSizing: "border-box",
            }}
          />
        </div>
      </div>

      {/* SUBMIT */}
      <div style={{
        display: "flex",
        justifyContent: "flex-end",
        marginTop: 18,
      }}>
        <button
          type="button"
          onClick={submitSalesCollection}
          disabled={
            collectionLoading ||
            !selectedCollectionCustomer ||
            !collectionAmount
          }
          style={{
            padding: "11px 22px",
            border: "none",
            borderRadius: 7,
            background: collectionLoading ? "#94a3b8" : "#0f766e",
            color: "#fff",
            fontWeight: 800,
            cursor: collectionLoading ? "not-allowed" : "pointer",
          }}
        >
          {collectionLoading ? "Processing..." : "💰 Collect Payment"}
        </button>
      </div>
    </div>

    {/* COLLECTION HISTORY */}
    <div style={{
      background: "#fff",
      border: "1px solid #e2e8f0",
      borderRadius: 10,
      padding: 16,
    }}>
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 10,
        flexWrap: "wrap",
        marginBottom: 14,
      }}>
        <h3 style={{
          margin: 0,
          color: "#172554",
          fontSize: 16,
          fontWeight: 800,
        }}>
          Collection History
        </h3>

        <button
          type="button"
          onClick={loadCollectionHistory}
          disabled={collectionHistoryLoading}
          style={{
            padding: "8px 13px",
            border: "1px solid #0f766e",
            borderRadius: 7,
            background: "#fff",
            color: "#0f766e",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          {collectionHistoryLoading ? "Loading..." : "↻ Load History"}
        </button>
      </div>

      {collectionHistoryLoading ? (
        <div style={{
          padding: 25,
          textAlign: "center",
          color: "#64748b",
        }}>
          Loading collection history...
        </div>
      ) : collectionHistory.length === 0 ? (
        <div style={{
          padding: 25,
          textAlign: "center",
          color: "#64748b",
          background: "#f8fafc",
          borderRadius: 7,
          fontSize: 13,
        }}>
          No collection records found. Load History চাপুন।
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{
            width: "100%",
            borderCollapse: "collapse",
            minWidth: 850,
            fontSize: 12,
          }}>
            <thead>
              <tr style={{ background: "#f1f5f9" }}>
                {[
                  "Date",
                  "Customer",
                  "Mobile",
                  "Payment Method",
                  "Transaction ID",
                  "Amount",
                  "Notes",
                ].map((heading) => (
                  <th
                    key={heading}
                    style={{
                      padding: "11px 9px",
                      textAlign: "left",
                      color: "#475569",
                      borderBottom: "1px solid #e2e8f0",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {collectionHistory.map((item) => (
                <tr
                  key={item._id}
                  style={{ borderBottom: "1px solid #e2e8f0" }}
                >
                  <td style={{ padding: 10, whiteSpace: "nowrap" }}>
                    {item.transactionDate
                      ? new Date(item.transactionDate).toLocaleDateString("en-GB")
                      : "-"}
                  </td>

                  <td style={{ padding: 10, fontWeight: 700 }}>
                    {item.customerId?.customerName || "Unknown"}
                  </td>

                  <td style={{ padding: 10 }}>
                    {item.customerId?.mobile || "-"}
                  </td>

                  <td style={{ padding: 10 }}>
                    {item.paymentMethod || "-"}
                  </td>

                  <td style={{ padding: 10 }}>
                    {item.transactionId || "-"}
                  </td>

                  <td style={{
                    padding: 10,
                    fontWeight: 800,
                    color: "#0f766e",
                    whiteSpace: "nowrap",
                  }}>
                    ৳ {Number(item.amount || item.credit || 0).toLocaleString("en-BD")}
                  </td>

                  <td style={{ padding: 10 }}>
                    {item.description || item.reference || "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  </div>
)}

{/* SALES DASHBOARD */}
{(activePage === "Sales Dashboard" || activePage === "Sales") && (
  <>
    {salesDashboardLoading && !salesDashboard ? (
      <div style={{
        padding: 25,
        textAlign: "center",
        background: "#fff",
        border: "1px solid #e2e8f0",
        borderRadius: 9,
      }}>
        Loading Sales Dashboard...
      </div>
    ) : salesDashboard ? (
      <>
        {/* SELECTED DAY SALES SUMMARY */}
        <div id="daily-sales-summary-print" style={{
          background: "#fff",
          padding: 12,
          borderRadius: 9,
          marginBottom: 18,
        }}>
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap",
          marginBottom: 12,
        }}>
          <h3 style={{
            margin: 0,
            color: "#172554",
            fontSize: 15,
            fontWeight: 800,
          }}>
            Daily Sales Summary
          </h3>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <label style={{ fontSize: 12, color: "#475569", fontWeight: 700 }}>From</label>
            <input
              type="date"
              value={salesDashboardStartDate}
              max={salesDashboardEndDate}
              onChange={(e) => setSalesDashboardStartDate(e.target.value)}
              style={{ padding: "7px 9px", border: "1px solid #cbd5e1", borderRadius: 7 }}
            />
            <label style={{ fontSize: 12, color: "#475569", fontWeight: 700 }}>To</label>
            <input
              type="date"
              value={salesDashboardEndDate}
              min={salesDashboardStartDate}
              onChange={(e) => setSalesDashboardEndDate(e.target.value)}
              style={{ padding: "7px 9px", border: "1px solid #cbd5e1", borderRadius: 7 }}
            />
            <button
              type="button"
              onClick={() => loadSalesDashboard(salesDashboardPeriod, salesDashboardStartDate, salesDashboardEndDate)}
              disabled={salesDashboardLoading}
              style={{ padding: "7px 12px", border: "1px solid #0f766e", borderRadius: 7, background: "#0f766e", color: "#fff", fontWeight: 700, cursor: "pointer" }}
            >
              {salesDashboardLoading ? "Loading..." : "Filter"}
            </button>
            <button
              type="button"
              onClick={() => {
                const content = document.getElementById("daily-sales-summary-print");
                if (!content) return;
                const printWindow = window.open("", "_blank", "width=900,height=700");
                if (!printWindow) { toast.error("Print window blocked. Please allow popups."); return; }
                printWindow.document.write(`<!doctype html><html><head><title>Daily Sales Summary</title><style>body{font-family:Arial,sans-serif;padding:24px;color:#172554}h2{margin:0 0 18px}.summary{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.summary>div{border:1px solid #cbd5e1;border-radius:8px;padding:14px}.summary span{font-size:12px;color:#64748b}.summary h3{font-size:20px;margin:8px 0 0}@media print{body{padding:0}}</style></head><body><h2>Sales Summary - ${salesDashboardStartDate} to ${salesDashboardEndDate}</h2><div class="summary">${Array.from(content.querySelectorAll("[data-daily-card='true']")).map((card) => `<div>${card.innerHTML}</div>`).join("")}</div></body></html>`);
                printWindow.document.close();
                printWindow.focus();
                setTimeout(() => { printWindow.print(); printWindow.close(); }, 300);
              }}
              style={{ padding: "7px 12px", border: "1px solid #2563eb", borderRadius: 7, background: "#2563eb", color: "#fff", fontWeight: 700, cursor: "pointer" }}
            >
              🖨️ Print
            </button>
          </div>
        </div>
        <div style={{ fontSize: 11, color: "#64748b", marginBottom: 10 }}>Selected Range: {salesDashboardStartDate} to {salesDashboardEndDate}</div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: 10,
          marginBottom: 20,
        }}>
          {[
            {
              title: "Today's Invoices",
              value: salesDashboard.today.invoices,
              color: "#2563eb",
              icon: "📄",
            },
            {
              title: "Today's Sales",
              value: `৳ ${Number(salesDashboard.today.netSales || 0).toLocaleString("en-BD")}`,
              color: "#ea580c",
              icon: "💰",
            },
            {
              title: "Today's Bags",
              value: Number(salesDashboard.today.bags || 0).toLocaleString("en-BD"),
              color: "#16a34a",
              icon: "📦",
            },
            {
              title: "Today's Weight KG",
              value: Number(salesDashboard.today.weightKg || 0).toLocaleString("en-BD"),
              color: "#7c3aed",
              icon: "⚖️",
            },
            {
              title: "Today's OWN Profit",
              value: `৳ ${Number(salesDashboard.today.ownProfit || 0).toLocaleString("en-BD")}`,
              color: "#16a34a",
              icon: "📈",
            },
            {
              title: "Today's Paid",
              value: `৳ ${Number(salesDashboard.today.paid || 0).toLocaleString("en-BD")}`,
              color: "#0891b2",
              icon: "💵",
            },
            {
              title: "Daily Sale Due",
              value: `৳ ${Number(salesDashboard.today.saleDue || 0).toLocaleString("en-BD")}`,
              color: "#dc2626",
              icon: "⚠️",
            },
          ].map((item) => (
            <div key={item.title} data-daily-card="true" style={{
              padding: "13px 15px",
              border: "1px solid #e2e8f0",
              borderRadius: 9,
              background: "#fff",
              borderTop: `3px solid ${item.color}`,
            }}>
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}>
                <span style={{
                  fontSize: 11,
                  color: "#64748b",
                  fontWeight: 700,
                }}>
                  {item.title}
                </span>
                <span>{item.icon}</span>
              </div>

              <h3 style={{
                margin: "8px 0 0",
                color: item.color,
                fontSize: 19,
                fontWeight: 800,
              }}>
                {item.value}
              </h3>
            </div>
          ))}
        </div>
        </div>

        {/* OVERALL SUMMARY */}
        <h3 style={{
          margin: "0 0 10px",
          color: "#172554",
          fontSize: 15,
          fontWeight: 800,
        }}>
          Overall Sales Summary
        </h3>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: 10,
          marginBottom: 20,
        }}>
          {[
            {
              title: "Total Invoices",
              value: salesDashboard.overall.totalInvoices,
              color: "#2563eb",
              icon: "📄",
            },
            {
              title: "Net Bags Sold",
              value: Number(salesDashboard.overall.netBags || 0).toLocaleString("en-BD"),
              color: "#16a34a",
              icon: "📦",
            },
            {
              title: "Net Weight KG",
              value: Number(salesDashboard.overall.netWeightKg || 0).toLocaleString("en-BD"),
              color: "#7c3aed",
              icon: "⚖️",
            },
            {
              title: "Net Sales",
              value: `৳ ${Number(salesDashboard.overall.netSales || 0).toLocaleString("en-BD")}`,
              color: "#ea580c",
              icon: "💰",
            },
            {
              title: "Total OWN Profit",
              value: `৳ ${Number(salesDashboard.overall.ownProfit || 0).toLocaleString("en-BD")}`,
              color: "#16a34a",
              icon: "📈",
            },
            {
              title: "Total Paid",
              value: `৳ ${Number(salesDashboard.overall.totalPaid || 0).toLocaleString("en-BD")}`,
              color: "#0891b2",
              icon: "💵",
            },
            {
              title: "Current Due",
              value: `৳ ${Number(salesDashboard.overall.currentDue || 0).toLocaleString("en-BD")}`,
              color: "#dc2626",
              icon: "⚠️",
            },
          ].map((item) => (
            <div key={item.title} style={{
              padding: "13px 15px",
              border: "1px solid #e2e8f0",
              borderRadius: 9,
              background: "#fff",
              borderTop: `3px solid ${item.color}`,
            }}>
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}>
                <span style={{
                  fontSize: 11,
                  color: "#64748b",
                  fontWeight: 700,
                }}>
                  {item.title}
                </span>
                <span>{item.icon}</span>
              </div>

              <h3 style={{
                margin: "8px 0 0",
                color: item.color,
                fontSize: 19,
                fontWeight: 800,
              }}>
                {item.value}
              </h3>
            </div>
          ))}
        </div>

        {/* RETURN SUMMARY */}
        <h3 style={{
          margin: "0 0 10px",
          color: "#172554",
          fontSize: 15,
          fontWeight: 800,
        }}>
          Sales Return Summary
        </h3>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: 10,
          marginBottom: 20,
        }}>
          {[
            {
              title: "Total Returns",
              value: salesDashboard.returns.totalReturns,
              color: "#ea580c",
            },
            {
              title: "Return Amount",
              value: `৳ ${Number(salesDashboard.returns.returnAmount || 0).toLocaleString("en-BD")}`,
              color: "#dc2626",
            },
            {
              title: "Amount Adjusted",
              value: `৳ ${Number(salesDashboard.returns.amountAdjusted || 0).toLocaleString("en-BD")}`,
              color: "#2563eb",
            },
            {
              title: "Refund Amount",
              value: `৳ ${Number(salesDashboard.returns.refundAmount || 0).toLocaleString("en-BD")}`,
              color: "#7c3aed",
            },
            {
              title: "Returned Bags",
              value: Number(salesDashboard.returns.returnedBags || 0).toLocaleString("en-BD"),
              color: "#c2410c",
            },
            {
              title: "Returned Weight KG",
              value: Number(salesDashboard.returns.returnedWeightKg || 0).toLocaleString("en-BD"),
              color: "#64748b",
            },
          ].map((item) => (
            <div key={item.title} style={{
              padding: "13px 15px",
              border: "1px solid #e2e8f0",
              borderRadius: 9,
              background: "#fff",
              borderTop: `3px solid ${item.color}`,
            }}>
              <span style={{
                fontSize: 11,
                color: "#64748b",
                fontWeight: 700,
              }}>
                {item.title}
              </span>

              <h3 style={{
                margin: "8px 0 0",
                color: item.color,
                fontSize: 19,
                fontWeight: 800,
              }}>
                {item.value}
              </h3>
            </div>
          ))}
        </div>

        {/* SALES TREND */}
        <div style={{
          padding: 15,
          border: "1px solid #e2e8f0",
          borderRadius: 9,
          background: "#fff",
          marginBottom: 20,
        }}>
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
            marginBottom: 18,
          }}>
            <div>
              <h3 style={{
                margin: 0,
                fontSize: 15,
                fontWeight: 800,
                color: "#172554",
              }}>
                Sales Trend
              </h3>
              <p style={{
                margin: "4px 0 0",
                fontSize: 11,
                color: "#64748b",
              }}>
                Daily sales performance
              </p>
            </div>

            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
            }}>
              <select
                value={salesDashboardPeriod}
                onChange={(e) => {
                  setSalesDashboardPeriod(e.target.value);
                  loadSalesDashboard(e.target.value);
                }}
                style={{
                  padding: "7px 10px",
                  border: "1px solid #cbd5e1",
                  borderRadius: 6,
                  fontSize: 12,
                  background: "#fff",
                }}
              >
                <option value="7">Last 7 Days</option>
                <option value="30">Last 30 Days</option>
              </select>

              <button
                type="button"
                className="secondary-button"
                onClick={() => loadSalesDashboard()}
                disabled={salesDashboardLoading}
              >
                {salesDashboardLoading ? "Loading..." : "Refresh"}
              </button>
            </div>
          </div>

          {salesDashboard.salesTrend?.length > 0 ? (
            <>
              {(() => {
                const maxSales = Math.max(
                  1,
                  ...salesDashboard.salesTrend.map(
                    (item) => Number(item.netSales || 0)
                  )
                );

                return (
                  <div style={{
                    display: "flex",
                    alignItems: "flex-end",
                    gap: salesDashboardPeriod === "30" ? 3 : 12,
                    height: 210,
                    overflowX: "auto",
                    padding: "10px 3px 0",
                    borderBottom: "1px solid #e2e8f0",
                  }}>
                    {salesDashboard.salesTrend.map((item) => {
                      const sales = Number(item.netSales || 0);
                      const height = Math.max(
                        sales > 0 ? 5 : 2,
                        (sales / maxSales) * 155
                      );

                      return (
                        <div
                          key={item.date}
                          title={`${item.date}\nNet Sales: ৳ ${sales.toLocaleString("en-BD")}\nReturns: ৳ ${Number(item.returns || 0).toLocaleString("en-BD")}\nInvoices: ${item.invoices}`}
                          style={{
                            flex: "1 0 22px",
                            minWidth: salesDashboardPeriod === "30" ? 16 : 30,
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "flex-end",
                            alignItems: "center",
                            height: "100%",
                          }}
                        >
                          <div style={{
                            fontSize: 9,
                            color: "#64748b",
                            marginBottom: 4,
                            whiteSpace: "nowrap",
                          }}>
                            {sales > 0
                              ? sales >= 100000
                                ? `${(sales / 100000).toFixed(1)}L`
                                : sales >= 1000
                                ? `${(sales / 1000).toFixed(1)}K`
                                : sales.toFixed(0)
                              : ""}
                          </div>

                          <div style={{
                            width: "75%",
                            height: `${height}px`,
                            minHeight: 2,
                            background: "#2563eb",
                            borderRadius: "5px 5px 0 0",
                          }} />

                          <div style={{
                            fontSize: 9,
                            color: "#64748b",
                            marginTop: 6,
                            whiteSpace: "nowrap",
                            transform: salesDashboardPeriod === "30"
                              ? "rotate(-45deg)"
                              : "none",
                            transformOrigin: "top center",
                          }}>
                            {new Date(item.date + "T12:00:00").toLocaleDateString(
                              "en-GB",
                              { day: "2-digit", month: "short" }
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

              <div style={{
                display: "flex",
                gap: 18,
                flexWrap: "wrap",
                marginTop: 18,
                fontSize: 11,
                color: "#64748b",
              }}>
                <span>
                  <span style={{
                    display: "inline-block",
                    width: 9,
                    height: 9,
                    background: "#2563eb",
                    borderRadius: 2,
                    marginRight: 5,
                  }} />
                  Net Sales
                </span>
                <span>
                  Hover over a bar to see sales, returns and invoices
                </span>
              </div>
            </>
          ) : (
            <p style={{
              textAlign: "center",
              padding: 25,
              color: "#64748b",
              fontSize: 12,
            }}>
              No sales trend data available.
            </p>
          )}
        </div>
      </>
    ) : (
      <div style={{
        padding: 20,
        textAlign: "center",
        color: "#dc2626",
        background: "#fff",
        borderRadius: 9,
      }}>
        Dashboard data পাওয়া যায়নি। Refresh করুন।
        <div style={{ marginTop: 10 }}>
          <button
            type="button"
            className="primary-button"
            onClick={() => loadSalesDashboard()}
          >
            Try Again
          </button>
        </div>
      </div>
    )}
  </>
)}


{/* OWN SALES REPORTS */}
{[
  "Daily Sales Summary",
  "Weekly Sales Summary",
  "Monthly Sales Summary",
  "Yearly Sales Summary",
  "Lot Wise Sales",
  "Product Wise Sales",
  "Category Wise Sales",
  "Supplier Wise Sales",
  "OWN Profit / Loss",
].includes(activePage) && (
  <div style={{
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
  }}>
    <h2 style={{ margin: 0, fontSize: 18, color: "#172554" }}>
      {activePage}
    </h2>

    <div style={{
      display: "flex",
      gap: 10,
      flexWrap: "wrap",
      marginTop: 15,
      alignItems: "end",
    }}>
      <div>
        <label style={fieldLabel}>Start Date</label>
        <input
          type="date"
          style={compactInput}
          value={ownSalesReportFrom}
          onChange={(e) => setOwnSalesReportFrom(e.target.value)}
        />
      </div>

      <div>
        <label style={fieldLabel}>End Date</label>
        <input
          type="date"
          style={compactInput}
          value={ownSalesReportTo}
          onChange={(e) => setOwnSalesReportTo(e.target.value)}
        />
      </div>

      <button
        type="button"
        className="primary-button"
        disabled={ownSalesReportLoading}
        onClick={() => {
          if (activePage === "OWN Profit / Loss") {
            loadOwnSalesRegister();
            return;
          }

          const reportTypes = {
            "Daily Sales Summary": "daily",
            "Weekly Sales Summary": "weekly",
            "Monthly Sales Summary": "monthly",
            "Yearly Sales Summary": "yearly",
            "Lot Wise Sales": "lot",
            "Product Wise Sales": "product",
            "Category Wise Sales": "category",
            "Supplier Wise Sales": "supplier",
          };

          loadOwnSalesReport(reportTypes[activePage]);
        }}
      >
        {ownSalesReportLoading ? "Loading..." : "Search Report"}
      </button>
    </div>

    {ownSalesReportLoading && (
      <p style={{ textAlign: "center", padding: 20 }}>
        Loading OWN Sales Report...
      </p>
    )}

    {/* OWN PROFIT / LOSS: INVOICE REGISTER */}
    {activePage === "OWN Profit / Loss" &&
      !ownSalesReportLoading && ownSalesRegister && (
     
     <>

         <div
      className="no-print"
      style={{
        display: "flex",
        justifyContent: "flex-end",
        marginTop: 15,
      }}
    >
      <button
        type="button"
        className="primary-button"
        onClick={() => window.print()}
      >
        <i className="fa fa-print" /> Print Profit / Loss
      </button>
    </div>

    <div className="own-profit-print-area">
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: 10,
          marginTop: 15,
        }}>
          {[
            ["Total Invoice No", ownSalesRegister.summary?.totalInvoices, true],
            ["Total Sale Amount", ownSalesRegister.summary?.totalSaleAmount],
            ["Paid Amount", ownSalesRegister.summary?.paidAmount],
            ["Dues Amount", ownSalesRegister.summary?.dueAmount],
            ["Balance Amount", ownSalesRegister.summary?.balanceAmount],
            ["Profit", ownSalesRegister.summary?.profit],
          ].map(([label, value, isCount]) => (
            <div key={label} style={{
              padding: 12,
              border: "1px solid #e2e8f0",
              borderRadius: 8,
              background: "#f8fafc",
            }}>
              <div style={{ fontSize: 11, color: "#64748b" }}>{label}</div>
              <strong style={{ fontSize: 17, color: "#172554" }}>
                {isCount
                  ? Number(value || 0).toLocaleString("en-BD")
                  : `৳ ${Number(value || 0).toLocaleString("en-BD", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}`}
              </strong>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 20 }}>
          <h3 style={{ margin: "0 0 10px", fontSize: 15, color: "#172554" }}>
            Invoice Wise Sales Register
          </h3>
          <div style={{ overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: 8 }}>
            <table style={{ minWidth: 1050, width: "100%" }}>
              <thead>
                <tr>
                  <th>DATE</th>
                  <th>CUSTOMER NAME</th>
                  <th>ADDRESS</th>
                  <th>INVOICE NUMBER</th>
                  <th>SALE AMOUNT</th>
                  <th>PAID</th>
                  <th>DUE</th>
                  <th>PROFIT</th>
                  <th>DETAILS</th>
                </tr>
              </thead>
              <tbody>
                {(ownSalesRegister.data || []).map((row) => {
                  const isExpanded = expandedOwnInvoiceId === row._id;

                  return (
                    <Fragment key={row._id}>
                      <tr>
                        <td>
                          {row.date
                            ? new Date(row.date).toLocaleDateString("en-GB")
                            : "-"}
                        </td>
                        <td>{row.customerName || "-"}</td>
                        <td style={{ maxWidth: 190, whiteSpace: "normal" }}>
                          {row.address || "-"}
                        </td>
                        <td>{row.invoiceNumber || "-"}</td>
                        <td>৳ {Number(row.saleAmount || 0).toLocaleString("en-BD")}</td>
                        <td>৳ {Number(row.paidAmount || 0).toLocaleString("en-BD")}</td>
                        <td>৳ {Number(row.dueAmount || 0).toLocaleString("en-BD")}</td>
                        <td>৳ {Number(row.profit || 0).toLocaleString("en-BD")}</td>
                        <td>
                          <button
                            type="button"
                            className="secondary-button"
                            style={{ padding: "5px 9px", fontSize: 11 }}
                            onClick={() =>
                              setExpandedOwnInvoiceId(isExpanded ? null : row._id)
                            }
                          >
                            {isExpanded ? "Hide" : "View Items"}
                          </button>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr key={`${row._id}-details`}>
                          <td colSpan={9} style={{ padding: 10, background: "#f8fafc" }}>
                            <div style={{ overflowX: "auto" }}>
                              <table style={{ minWidth: 950, width: "100%" }}>
                                <thead>
                                  <tr>
                                    <th>LOT</th>
                                    <th>PRODUCT</th>
                                    <th>BAGS</th>
                                    <th>WEIGHT KG</th>
                                    <th>RATE</th>
                                    <th>COMMISSION</th>
                                    <th>LABOUR</th>
                                    <th>SALE AMOUNT</th>
                                    <th>RETURN</th>
                                    <th>PROFIT</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {(row.items || []).map((item, index) => (
                                    <tr key={`${row._id}-item-${index}`}>
                                      <td>{item.lotCode || "-"}</td>
                                      <td>{item.productName || "-"}</td>
                                      <td>{Number(item.netBags ?? item.bags ?? 0)}</td>
                                      <td>{Number(item.netWeightKg ?? item.weightKg ?? 0).toLocaleString("en-BD")}</td>
                                      <td>৳ {Number(item.rate || 0).toLocaleString("en-BD")}</td>
                                      <td>৳ {Number(item.commission || 0).toLocaleString("en-BD")}</td>
                                      <td>৳ {Number(item.labour || 0).toLocaleString("en-BD")}</td>
                                      <td>৳ {Number(item.saleAmount || 0).toLocaleString("en-BD")}</td>
                                      <td>৳ {Number(item.returnAmount || 0).toLocaleString("en-BD")}</td>
                                      <td>৳ {Number(item.profit || 0).toLocaleString("en-BD")}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}

                {(!ownSalesRegister.data || ownSalesRegister.data.length === 0) && (
                  <tr>
                    <td colSpan={9} style={{ textAlign: "center", padding: 20 }}>
                      No invoice records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ marginTop: 22 }}>
          <h3 style={{ margin: "0 0 10px", fontSize: 15, color: "#172554" }}>
            Lot & Product Wise Summary
          </h3>
          <div style={{ overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: 8 }}>
            <table style={{ minWidth: 1250, width: "100%" }}>
              <thead>
                <tr>
                  <th>LOT</th>
                  <th>PRODUCT</th>
                  <th>SOLD BAGS</th>
                  <th>RETURN BAGS</th>
                  <th>NET BAGS</th>
                  <th>SOLD KG</th>
                  <th>RETURN KG</th>
                  <th>NET KG</th>
                  <th>SALE AMOUNT</th>
                  <th>RETURN AMOUNT</th>
                  <th>NET SALE</th>
                  <th>COMMISSION</th>
                  <th>LABOUR</th>
                  <th>PROFIT</th>
                </tr>
              </thead>
              <tbody>
                {(ownSalesRegister.lotProductSummary || []).map((row, index) => (
                  <tr key={`${row.lotId || row.lotCode}-${row.productId || index}`}>
                    <td>{row.lotCode || "-"}</td>
                    <td>{row.productName || "-"}</td>
                    <td>{Number(row.soldBags || 0)}</td>
                    <td>{Number(row.returnedBags || 0)}</td>
                    <td>{Number(row.netBags || 0)}</td>
                    <td>{Number(row.soldWeightKg || 0).toLocaleString("en-BD")}</td>
                    <td>{Number(row.returnedWeightKg || 0).toLocaleString("en-BD")}</td>
                    <td>{Number(row.netWeightKg || 0).toLocaleString("en-BD")}</td>
                    <td>৳ {Number(row.saleAmount || 0).toLocaleString("en-BD")}</td>
                    <td>৳ {Number(row.returnAmount || 0).toLocaleString("en-BD")}</td>
                    <td>৳ {Number(row.netSaleAmount || 0).toLocaleString("en-BD")}</td>
                    <td>৳ {Number(row.commission || 0).toLocaleString("en-BD")}</td>
                    <td>৳ {Number(row.labour || 0).toLocaleString("en-BD")}</td>
                    <td>৳ {Number(row.profit || 0).toLocaleString("en-BD")}</td>
                  </tr>
                ))}

                {(!ownSalesRegister.lotProductSummary ||
                  ownSalesRegister.lotProductSummary.length === 0) && (
                  <tr>
                    <td colSpan={14} style={{ textAlign: "center", padding: 20 }}>
                      No lot/product records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
           </div>
      </div>
      </>
    )}

    {/* EXISTING GROUPED REPORTS: KEEP UNCHANGED */}
    {activePage !== "OWN Profit / Loss" &&
      !ownSalesReportLoading && ownSalesReport && (
      <>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: 10,
          marginTop: 15,
        }}>
          {[
            ["Gross Sales", "grossSales"],
            ["Return Amount", "returnAmount"],
            ["Net Sales", "netSales"],
            ["Total Cost", "totalCost"],
            ["Net Cost", "netCost"],
            ["Gross Profit", "grossProfit"],
            ["Other Cost", "otherCost"],
            ["Discount", "discount"],
            ["Net Profit", "netProfit"],
          ].map(([label, key]) => (
            <div key={key} style={{
              padding: 12,
              border: "1px solid #e2e8f0",
              borderRadius: 8,
              background: "#f8fafc",
            }}>
              <div style={{ fontSize: 11, color: "#64748b" }}>{label}</div>
              <strong style={{ fontSize: 17, color: "#172554" }}>
                ৳ {Number(ownSalesReport.summary?.[key] || 0).toLocaleString("en-BD")}
              </strong>
            </div>
          ))}
        </div>

      <div
  className="no-print"
  style={{
    display: "flex",
    justifyContent: "flex-end",
    marginTop: 15,
  }}
>
  <button
    type="button"
    className="primary-button"
    onClick={() => window.print()}
  >
    <i className="fa fa-print" /> Print Report
  </button>
</div>

<div
  className="own-sales-print-area"
  style={{ marginTop: 18, overflowX: "auto" }}
>
          <table>
            <thead>
              <tr>
                <th>NAME / GROUP</th>
                <th>SOLD BAGS</th>
                <th>RETURN BAGS</th>
                <th>NET BAGS</th>
                <th>NET WEIGHT KG</th>
                <th>GROSS SALES</th>
                <th>RETURN AMOUNT</th>
                <th>NET SALES</th>
                <th>NET PROFIT</th>
              </tr>
            </thead>
            <tbody>
              {ownSalesReport.data?.map((row, index) => {
                const isTimeGroupedReport = [
                  "Daily Sales Summary",
                  "Weekly Sales Summary",
                  "Monthly Sales Summary",
                  "Yearly Sales Summary",
                ].includes(activePage);
                const groupKey = String(row.key ?? row.name ?? index);
                const isGroupExpanded = expandedOwnSalesGroupKey === groupKey;
                const invoiceDetails = row.invoiceDetails || [];

                return (
                  <Fragment key={`${groupKey}-${index}`}>
                    <tr>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span>{row.name || "-"}</span>
                          {isTimeGroupedReport && (
                            <button
                              type="button"
                              className="secondary-button"
                              style={{ padding: "4px 8px", fontSize: 11, whiteSpace: "nowrap" }}
                              onClick={() => {
                                setExpandedOwnSalesGroupKey(isGroupExpanded ? null : groupKey);
                                setExpandedOwnSalesGroupInvoiceId(null);
                              }}
                            >
                              {isGroupExpanded ? "Hide Invoices" : `View Invoices (${invoiceDetails.length})`}
                            </button>
                          )}
                        </div>
                      </td>
                      <td>{Number(row.soldBags || 0)}</td>
                      <td>{Number(row.returnedBags || 0)}</td>
                      <td>{Number(row.netBags || 0)}</td>
                      <td>{Number(row.netWeightKg || 0).toLocaleString("en-BD")}</td>
                      <td>৳ {Number(row.grossSales || 0).toLocaleString("en-BD")}</td>
                      <td>৳ {Number(row.returnAmount || 0).toLocaleString("en-BD")}</td>
                      <td>৳ {Number(row.netSales || 0).toLocaleString("en-BD")}</td>
                      <td>৳ {Number(row.netProfit || 0).toLocaleString("en-BD")}</td>
                    </tr>

                    {isTimeGroupedReport && isGroupExpanded && (
                      <tr>
                        <td colSpan={9} style={{ padding: 12, background: "#f8fafc" }}>
                          {invoiceDetails.length === 0 ? (
                            <p style={{ margin: 4, color: "#64748b", fontSize: 12 }}>
                              এই Group-এ কোনো Single Sale Invoice পাওয়া যায়নি।
                            </p>
                          ) : (
                            <div style={{ overflowX: "auto" }}>
                              <table style={{ minWidth: 950, width: "100%", background: "#fff" }}>
                                <thead>
                                  <tr>
                                    <th>DATE</th>
                                    <th>INVOICE NUMBER</th>
                                    <th>CUSTOMER</th>
                                    <th>OWN ITEMS</th>
                                    <th>SALE AMOUNT</th>
                                    <th>COST</th>
                                    <th>PROFIT</th>
                                    <th>DETAILS</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {invoiceDetails.map((invoice, invoiceIndex) => {
                                    const invoiceId = String(invoice._id || invoice.invoiceNumber || invoiceIndex);
                                    const isInvoiceExpanded = expandedOwnSalesGroupInvoiceId === invoiceId;
                                    const invoiceSaleAmount = (invoice.items || []).reduce(
  (sum, item) => sum + Number(item.saleAmount || 0),
  0
);

const invoiceTotalCost = (invoice.items || []).reduce(
  (sum, item) => sum + Number(item.cost || 0),
  0
);

const invoiceProfit = (invoice.items || []).reduce(
  (sum, item) => sum + Number(item.profit || 0),
  0
);
                                    return (
                                      <Fragment key={invoiceId}>
                                        <tr>
<td>{invoice.date ? new Date(invoice.date).toLocaleDateString("en-GB") : "-"}</td>                                          
                                          <td>{invoice.invoiceNumber || "-"}</td>
                                          <td>{invoice.customerName || "-"}</td>
                                          <td>{(invoice.items || []).length}</td>
                                        <td>৳ {invoiceSaleAmount.toLocaleString("en-BD", { maximumFractionDigits: 2 })}</td>
                                         <td>৳ {invoiceTotalCost.toLocaleString("en-BD", { maximumFractionDigits: 2 })}</td>
                                        <td>৳ {invoiceProfit.toLocaleString("en-BD", { maximumFractionDigits: 2 })}</td>
                                          <td>
                                            <button
                                              type="button"
                                              className="secondary-button"
                                              style={{ padding: "4px 8px", fontSize: 11 }}
                                              onClick={() => setExpandedOwnSalesGroupInvoiceId(isInvoiceExpanded ? null : invoiceId)}
                                            >
                                              {isInvoiceExpanded ? "Hide Items" : "View Items"}
                                            </button>
                                          </td>
                                        </tr>
                                        {isInvoiceExpanded && (
                                          <tr>
                                            <td colSpan={8} style={{ padding: 10, background: "#fff7ed" }}>
                                              <div style={{ overflowX: "auto" }}>
                                                <table style={{ minWidth: 1050, width: "100%" }}>
                                                  <thead>
                                                    <tr>
                                                      <th>LOT</th>
                                                      <th>PRODUCT</th>
                                                      <th>BAGS</th>
                                                      <th>WEIGHT KG</th>
                                                      <th>RATE / KG</th>
                                                      <th>PRODUCT SALE</th>
                                                      <th>COMMISSION</th>
                                                      <th>LABOUR</th>
                                                      <th>ITEM COST</th>
                                                      <th>PROFIT</th>
                                                    </tr>
                                                  </thead>
                                                  <tbody>
                                                    {(invoice.items || []).map((item, itemIndex) => (
                                                      <tr key={`${invoiceId}-item-${itemIndex}`}>
                                                        <td>{item.lotCode || "-"}</td>
                                                        <td>{item.productName || "-"}</td>
                                                        <td>{Number(item.bags || 0).toLocaleString("en-BD")}</td>
                                                        <td>{Number(item.weightKg || 0).toLocaleString("en-BD")}</td>
                                                        <td>৳ {Number(item.rate || 0).toLocaleString("en-BD")}</td>
                                                        <td>৳ {Number(item.productTotal || 0).toLocaleString("en-BD")}</td>
                                                        <td>৳ {Number(item.commission || 0).toLocaleString("en-BD")}</td>
                                                        <td>৳ {Number(item.labour || 0).toLocaleString("en-BD")}</td>
                                                       <td>৳ {Number(item.cost || 0).toLocaleString("en-BD")}</td>
                                                        <td>৳ {Number(item.profit || 0).toLocaleString("en-BD")}</td>
                                                      </tr>
                                                    ))}
                                                  </tbody>
                                                </table>
                                              </div>
                                            </td>
                                          </tr>
                                        )}
                                      </Fragment>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}

              {(!ownSalesReport.data || ownSalesReport.data.length === 0) && (
                <tr>
                  <td colSpan={9} style={{ textAlign: "center", padding: 20 }}>
                    No report records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </>
    )}

    {!ownSalesReportLoading &&
      (activePage === "OWN Profit / Loss" ? !ownSalesRegister : !ownSalesReport) && (
      <p style={{ color: "#64748b", fontSize: 12, marginTop: 12 }}>
        No report data loaded. Select dates and search.
      </p>
    )}
  </div>
)}

      {/* SALES INVOICE HISTORY */}
      {(activePage === "Sales Invoice History" || activePage === "Sales") && (
        <>
          {/* HISTORY HEADER */}
          <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 12,
      }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#172554" }}>
            Sales Invoice History
          </h2>
          <p style={{ margin: "3px 0 0", fontSize: 11, color: "#64748b" }}>
            Search and manage previous invoices
          </p>
        </div>
      </div>

      {/* FILTERS */}
      <div style={{
        padding: 12,
        border: "1px solid #e2e8f0",
        borderRadius: 9,
        background: "#fff",
        marginBottom: 15,
      }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "minmax(180px, 2fr) repeat(3, minmax(120px, 1fr))",
          gap: 9,
        }}>
          <div>
            <label style={fieldLabel}>Search Invoice / Customer</label>
            <input
              style={compactInput}
              placeholder="Invoice number or customer..."
              value={salesSearch}
              onChange={(e) => setSalesSearch(e.target.value)}
            />
          </div>

          <div>
            <label style={fieldLabel}>Start Date</label>
            <input
              type="date"
              style={compactInput}
              value={salesStartDate}
              onChange={(e) => setSalesStartDate(e.target.value)}
            />
          </div>

          <div>
            <label style={fieldLabel}>End Date</label>
            <input
              type="date"
              style={compactInput}
              value={salesEndDate}
              onChange={(e) => setSalesEndDate(e.target.value)}
            />
          </div>

          <div>
            <label style={fieldLabel}>Status</label>
            <select
              style={compactInput}
              value={salesStatusFilter}
              onChange={(e) => setSalesStatusFilter(e.target.value)}
            >
              <option value="">All Status</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="DRAFT">Draft</option>
            </select>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <button
            type="button"
            className="primary-button"
            onClick={loadSalesInvoices}
            disabled={salesLoading}
          >
            {salesLoading ? "Loading..." : "Search"}
          </button>

          <button
            type="button"
            className="secondary-button"
            
          onClick={() => {
  setSalesSearch("");
  setSalesStartDate("");
  setSalesEndDate("");
  setSalesStatusFilter("");

  loadSalesInvoices({
    search: "",
    status: "",
    startDate: "",
    endDate: "",
  });
}}
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* INVOICE TABLE */}
  
{/* INVOICE TABLE */}
<div
  className="table-wrapper"
  style={{
    marginTop: 8,
    border: "1px solid #e2e8f0",
    borderRadius: 8,
    background: "#fff",
    overflowX: "auto",
  }}
>
  <table>
    <thead>
      <tr>
        <th>INVOICE NO</th>
        <th>DATE</th>
        <th>CUSTOMER</th>
        <th>BAGS</th>
        <th>WEIGHT KG</th>
        <th>GRAND TOTAL</th>
        <th>RETURNED BAGS</th>
        <th>RETURNED WEIGHT KG</th>
        <th>RETURN AMOUNT</th>
        <th>NET SALES</th>
        <th>PAID</th>
        <th>DUE</th>
        <th>RETURN STATUS</th>
        <th>STATUS</th>
        <th>ACTION</th>
      </tr>
    </thead>

    <tbody>
      {salesLoading ? (
        <tr>
          <td colSpan={15} style={{ textAlign: "center", padding: 25 }}>
            Loading Sales Invoices...
          </td>
        </tr>
      ) : salesInvoices.length === 0 ? (
        <tr>
          <td colSpan={15} style={{ textAlign: "center", padding: 30 }}>
            No sales invoices found.
          </td>
        </tr>
      ) : salesInvoices.map((invoice) => (
        <tr key={invoice._id}>
          <td>
            <strong>{invoice.invoiceNumber || "-"}</strong>
          </td>

          <td>
            {invoice.invoiceDate
              ? new Date(invoice.invoiceDate).toLocaleDateString("en-GB")
              : "-"}
          </td>

          <td>
            {invoice.customerName ||
              invoice.customerId?.customerName ||
              "-"}
          </td>

          <td>{Number(invoice.totalBags || 0)}</td>

          <td>
            {Number(invoice.totalWeightKg || 0).toLocaleString("en-BD")}
          </td>

          <td style={{ fontWeight: 700 }}>
            ৳ {Number(invoice.grandTotal || 0).toLocaleString("en-BD")}
          </td>

          {/* RETURNED BAGS */}
          <td style={{
            color: Number(invoice.returnedBags || 0) > 0 ? "#ea580c" : "#64748b",
            fontWeight: 700,
          }}>
            {Number(invoice.returnedBags || 0)}
          </td>

          {/* RETURNED WEIGHT */}
          <td style={{
            color: Number(invoice.returnedWeightKg || 0) > 0 ? "#ea580c" : "#64748b",
            fontWeight: 700,
          }}>
            {Number(invoice.returnedWeightKg || 0).toLocaleString("en-BD")}
          </td>

          {/* RETURN AMOUNT */}
          <td style={{
            color: Number(invoice.returnedAmount || 0) > 0 ? "#dc2626" : "#64748b",
            fontWeight: 700,
          }}>
            ৳ {Number(invoice.returnedAmount || 0).toLocaleString("en-BD")}
          </td>

          {/* NET SALES */}
          <td style={{
            fontWeight: 700,
            color: "#15803d",
          }}>
            ৳ {Number(
              invoice.netSalesAmount ?? invoice.grandTotal ?? 0
            ).toLocaleString("en-BD")}
          </td>

          <td>
            ৳ {Number(invoice.paidAmount || 0).toLocaleString("en-BD")}
          </td>

          <td style={{
            color: Number(invoice.dueAmount || 0) > 0 ? "#dc2626" : "#15803d",
            fontWeight: 700,
          }}>
            ৳ {Number(invoice.dueAmount || 0).toLocaleString("en-BD")}
          </td>

          {/* RETURN STATUS */}
          <td>
            <span
              style={{
                display: "inline-block",
                padding: "4px 7px",
                borderRadius: 5,
                fontSize: 10,
                fontWeight: 700,
                whiteSpace: "nowrap",
                background:
                  invoice.returnStatus === "FULL RETURN"
                    ? "#fee2e2"
                    : invoice.returnStatus === "PARTIAL RETURN"
                    ? "#ffedd5"
                    : "#f1f5f9",
                color:
                  invoice.returnStatus === "FULL RETURN"
                    ? "#dc2626"
                    : invoice.returnStatus === "PARTIAL RETURN"
                    ? "#c2410c"
                    : "#64748b",
              }}
            >
              {invoice.returnStatus || "NO RETURN"}
            </span>
          </td>

          <td>{invoice.status || "-"}</td>

          {/* ACTION */}
          <td>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                flexWrap: "nowrap",
                whiteSpace: "nowrap",
              }}
            >
              {/* EDIT */}
              {invoice.status === "COMPLETED" && (
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => editSalesInvoice(invoice._id)}
                  style={{
                    padding: "5px 8px",
                    fontSize: 11,
                    background: "#2563eb",
                    color: "#fff",
                    border: "none",
                    borderRadius: 5,
                  }}
                >
                  Edit
                </button>
              )}

              {/* VIEW */}
              <button
                type="button"
                className="secondary-button"
                onClick={() => loadSalesDetails(invoice._id)}
                style={{ padding: "5px 8px", fontSize: 11 }}
              >
                <FileText size={13} /> View
              </button>

              {/* RETURN */}
              {invoice.status === "COMPLETED" && (
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => loadSalesReturnDetails(invoice._id)}
                  style={{
                    padding: "5px 8px",
                    fontSize: 11,
                    background: "#ea580c",
                    color: "#fff",
                    border: "none",
                    borderRadius: 5,
                  }}
                >
                  Return
                </button>
              )}

              {/* CANCEL */}
              {invoice.status === "COMPLETED" && (
                <button
                  type="button"
                  disabled={cancellingSalesInvoice}
                  onClick={() => cancelSalesInvoice(invoice._id)}
                  style={{
                    padding: "5px 8px",
                    fontSize: 11,
                    background: "#dc2626",
                    color: "#fff",
                    border: "none",
                    borderRadius: 5,
                    cursor: cancellingSalesInvoice ? "not-allowed" : "pointer",
                  }}
                >
                  Cancel
                </button>
              )}
            </div>
          </td>
        </tr>
      ))}
    </tbody>
   </table>
</div>
        </>
      )}
    </div>

    {/* NEW SALES INVOICE MODAL */}

    {showSalesForm && (
      <div style={{
        ...modalOverlayStyle,
        padding: 8,
        alignItems: "center",
      }}>
        <div style={{
          ...modalStyle,
          width: "98vw",
          maxWidth: 1550,
          height: "96vh",
          maxHeight: "96vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          padding: 0,
          borderRadius: 10,
          background: "#f8fafc",
        }}>

          {/* MODAL HEADER */}
          <div style={{
            ...modalHeaderStyle,
            flexShrink: 0,
            padding: "12px 18px",
            background: "#172554",
            color: "#fff",
            borderBottom: "3px solid #f97316",
          }}>
            <div>
           <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>
  {editingSalesInvoiceId ? "Edit Sales Invoice" : "New Sales Invoice"}
</h2>
              <p style={{ margin: "3px 0 0", fontSize: 11, color: "#cbd5e1" }}>
                Customer Sales & Inventory Transaction
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowSalesForm(false)}
              style={{ color: "#fff" }}
            >
              <X size={20} />
            </button>
          </div>

          {/* MODAL BODY */}
          <div style={{
            padding: "12px 15px",
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            overflowX: "hidden",
            background: "#f1f5f9",
          }}>

            {/* 01 CUSTOMER INFORMATION */}
            <div style={sectionStyle}>
              <h3 style={sectionHeading}>
                <span style={{ color: "#f97316" }}>01.</span>
                Customer Information
              </h3>

              <div style={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 2.5fr) minmax(180px, 1fr)",
                gap: 10,
                alignItems: "end",
              }}>
                <div style={{ position: "relative" }}>
                  <label style={fieldLabel}>Customer Name / Mobile *</label>
                  <input
                    style={compactInput}
                    placeholder="Search customer name or mobile..."
                    value={salesCustomerSearch}
                    onChange={(e) => searchSalesCustomers(e.target.value)}
                    onFocus={() => setShowSalesCustomerOptions(true)}
                  />

                  {salesCustomerLoading && (
                    <small style={{ color: "#64748b" }}>Searching customers...</small>
                  )}

                  {showSalesCustomerOptions && salesCustomerOptions.length > 0 && (
                    <div style={{
                      position: "absolute",
                      top: "100%",
                      left: 0,
                      right: 0,
                      zIndex: 30,
                      background: "#fff",
                      border: "1px solid #cbd5e1",
                      borderRadius: 7,
                      maxHeight: 220,
                      overflowY: "auto",
                      boxShadow: "0 6px 18px rgba(15,23,42,.12)",
                    }}>
                      {salesCustomerOptions.map((customer) => (
                        <button
                          type="button"
                          key={customer._id}
                          onClick={() => selectSalesCustomer(customer)}
                          style={{
                            display: "block",
                            width: "100%",
                            padding: "9px 11px",
                            textAlign: "left",
                            border: "none",
                            borderBottom: "1px solid #f1f5f9",
                            background: "#fff",
                            cursor: "pointer",
                          }}
                        >
                          <strong style={{ fontSize: 12 }}>
                            {customer.customerName}
                          </strong>
                          <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                            {customer.mobile || "-"}
                            {customer.companyName ? ` | ${customer.companyName}` : ""}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label style={fieldLabel}>Invoice Date *</label>
                  <input
                    type="date"
                    style={compactInput}
                    value={salesForm.invoiceDate}
                    onChange={(e) => updateSalesFormField("invoiceDate", e.target.value)}
                  />
                </div>
              </div>

              {selectedSalesCustomer && (
                <div style={{
                  marginTop: 9,
                  padding: "8px 11px",
                  background: "#f0fdf4",
                  border: "1px solid #bbf7d0",
                  borderRadius: 6,
                  display: "flex",
                  gap: 14,
                  alignItems: "center",
                  flexWrap: "wrap",
                  fontSize: 11,
                }}>
                  <strong style={{ color: "#166534" }}>
                    {selectedSalesCustomer.customerName}
                  </strong>
                  <span>{selectedSalesCustomer.mobile || "-"}</span>
                  <span>{selectedSalesCustomer.address || "-"}</span>
                  <strong style={{ color: "#166534" }}>
                    Current Balance: ৳ {salesPreviousDue.toLocaleString("en-BD")}
                  </strong>
                </div>
              )}
            </div>

            {/* 02 PRODUCT AND LOT */}
            <div style={sectionStyle}>
              <h3 style={sectionHeading}>
                <span style={{ color: "#f97316" }}>02.</span>
                Product & Lot Selection
              </h3>

              <div style={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 1.6fr) minmax(0, 1fr)",
                gap: 10,
              }}>
                <div style={{ position: "relative" }}>
                  <label style={fieldLabel}>Search Product *</label>
                  <input
                    style={compactInput}
                    placeholder="Search product name..."
                    value={salesProductSearch}
                    onChange={(e) => searchSalesProducts(e.target.value)}
                    onFocus={() => setShowSalesProductOptions(true)}
                  />

                  {salesProductLoading && (
                    <small style={{ color: "#64748b" }}>Searching products...</small>
                  )}

                  {showSalesProductOptions && salesProductOptions.length > 0 && (
                    <div style={{
                      position: "absolute",
                      top: "100%",
                      left: 0,
                      right: 0,
                      zIndex: 30,
                      background: "#fff",
                      border: "1px solid #cbd5e1",
                      borderRadius: 7,
                      maxHeight: 220,
                      overflowY: "auto",
                      boxShadow: "0 6px 18px rgba(15,23,42,.12)",
                    }}>
                      {salesProductOptions.map((product) => (
                        <button
                          type="button"
                          key={product._id}
                          onClick={() => selectSalesProduct(product)}
                          style={{
                            display: "block",
                            width: "100%",
                            padding: "9px 11px",
                            textAlign: "left",
                            border: "none",
                            borderBottom: "1px solid #f1f5f9",
                            background: "#fff",
                            cursor: "pointer",
                          }}
                        >
                          <strong style={{ fontSize: 12 }}>
                            {product.productName}
                          </strong>
                          <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                            {product.stockType || "-"} | Stock: {product.currentStockBags || 0} Bags / {product.currentStockKg || 0} KG
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label style={fieldLabel}>Select Available Lot *</label>
                  <select
                    style={compactInput}
                    value={selectedSalesLot?._id || ""}
                    onChange={(e) => selectSalesLot(e.target.value)}
                    disabled={!selectedSalesProduct || salesLotLoading}
                  >
                    <option value="">
                      {salesLotLoading ? "Loading lots..." : "Select available lot"}
                    </option>
                    {salesAvailableLots.map((lot) => (
                      <option key={lot._id} value={lot._id}>
                        {lot.lotCode} | {lot.stockType} | {lot.remainingBags} Bags | {lot.remainingWeightKg} KG
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {selectedSalesLot && (
                <div style={{
                  marginTop: 9,
                  padding: "8px 11px",
                  border: "1px solid #bfdbfe",
                  background: "#eff6ff",
                  borderRadius: 6,
                  fontSize: 11,
                  display: "flex",
                  gap: 14,
                  flexWrap: "wrap",
                }}>
                  <span><strong>Lot:</strong> {selectedSalesLot.lotCode}</span>
                  <span><strong>Type:</strong> {selectedSalesLot.stockType}</span>
                  <span>
                    <strong>Supplier:</strong>{" "}
                    {selectedSalesLot.supplierId?.supplierName || selectedSalesLot.supplierName || "-"}
                  </span>
                  <span><strong>Available:</strong> {selectedSalesLot.remainingBags} Bags</span>
                  <span><strong>Remaining:</strong> {selectedSalesLot.remainingWeightKg} KG</span>
                </div>
              )}
            </div>

            {/* 03 SALES ENTRY */}
            <div style={sectionStyle}>
              <h3 style={sectionHeading}>
                <span style={{ color: "#f97316" }}>03.</span>
                Sales Entry
              </h3>

              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(5, minmax(100px, 1fr))",
                gap: 8,
              }}>
                <div>
                  <label style={fieldLabel}>Bags *</label>
                  <input
                    type="number"
                    min="1"
                    style={compactInput}
                    value={salesLineForm.bags}
                    onChange={(e) => updateSalesLineField("bags", e.target.value)}
                    placeholder="Bags"
                  />
                </div>

                <div>
                  <label style={fieldLabel}>Weight KG *</label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    style={compactInput}
                    value={salesLineForm.weightKg}
                    onChange={(e) => updateSalesLineField("weightKg", e.target.value)}
                    placeholder="Weight"
                  />
                </div>

                <div>
                  <label style={fieldLabel}>Sale Rate / KG *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    style={compactInput}
                    value={salesLineForm.saleRatePerKg}
                    onChange={(e) => updateSalesLineField("saleRatePerKg", e.target.value)}
                    placeholder="Sale rate"
                  />
                </div>

                <div>
                  <label style={fieldLabel}>Commission / KG</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    style={compactInput}
                    value={salesLineForm.commissionRatePerKg}
                    onChange={(e) => updateSalesLineField("commissionRatePerKg", e.target.value)}
                    placeholder="Commission"
                  />
                </div>

                <div>
                  <label style={fieldLabel}>Labour / Bag</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    style={compactInput}
                    value={salesLineForm.labourRatePerBag}
                    onChange={(e) => updateSalesLineField("labourRatePerBag", e.target.value)}
                    placeholder="Labour"
                  />
                </div>
              </div>

              <div style={{
                display: "flex",
                justifyContent: "flex-end",
                marginTop: 10,
              }}>
                <button
                  type="button"
                  className="primary-button"
                  onClick={addSalesItem}
                  style={{ background: "#f97316", borderColor: "#f97316" }}
                >
                  <Plus size={16} /> Add Product to Invoice
                </button>
              </div>
            </div>

            {/* 04 INVOICE ITEMS */}
            <div style={sectionStyle}>
              <h3 style={sectionHeading}>
                <span style={{ color: "#f97316" }}>04.</span>
                Invoice Items
                <span style={{ fontSize: 10, color: "#64748b", fontWeight: 600 }}>
                  ({salesItems.length} items)
                </span>
              </h3>

              <div className="table-wrapper" style={{
                marginTop: 5,
                overflowX: "auto",
              }}>
                <table>
                  <thead>
                    <tr>
                      <th>PRODUCT / LOT</th>
                      <th>TYPE</th>
                      <th>BAGS</th>
                      <th>KG</th>
                      <th>SALE RATE</th>
                      <th>COMMISSION</th>
                      <th>LABOUR</th>
                      <th>TOTAL</th>
                      <th>ACTION</th>
                    </tr>
                  </thead>

                  <tbody>
                    {salesItems.length === 0 ? (
                      <tr>
                        <td colSpan={9} style={{
                          textAlign: "center",
                          padding: 22,
                          color: "#94a3b8",
                          fontSize: 12,
                        }}>
                          No products added yet. Select a product and lot above.
                        </td>
                      </tr>
                    ) : salesItems.map((item, index) => (
                      <tr key={`${item.lotId}-${index}`}>
                        <td>
                          <strong style={{ fontSize: 11 }}>{item.productName}</strong>
                          <div style={{ fontSize: 10, color: "#64748b" }}>
                            {item.lotCode}
                          </div>
                        </td>

                        <td>{item.stockType}</td>

                        <td>
                          <input
                            type="number"
                            min="1"
                            style={{ ...compactInput, width: 65, height: 30, padding: "3px 5px" }}
                            value={item.bags}
                            onChange={(e) => updateSalesItem(index, "bags", e.target.value)}
                          />
                        </td>

                        <td>
                          <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            style={{ ...compactInput, width: 75, height: 30, padding: "3px 5px" }}
                            value={item.weightKg}
                            onChange={(e) => updateSalesItem(index, "weightKg", e.target.value)}
                          />
                        </td>

                        <td>
                          <input
                            type="number"
                            min="0"
                            style={{ ...compactInput, width: 80, height: 30, padding: "3px 5px" }}
                            value={item.saleRatePerKg}
                            onChange={(e) => updateSalesItem(index, "saleRatePerKg", e.target.value)}
                          />
                        </td>

                        <td>
                          <input
                            type="number"
                            min="0"
                            style={{ ...compactInput, width: 80, height: 30, padding: "3px 5px" }}
                            value={item.commissionRatePerKg}
                            onChange={(e) => updateSalesItem(index, "commissionRatePerKg", e.target.value)}
                          />
                        </td>

                        <td>
                          <input
                            type="number"
                            min="0"
                            style={{ ...compactInput, width: 80, height: 30, padding: "3px 5px" }}
                            value={item.labourRatePerBag}
                            onChange={(e) => updateSalesItem(index, "labourRatePerBag", e.target.value)}
                          />
                        </td>

                        <td style={{ fontWeight: 700, whiteSpace: "nowrap" }}>
                          ৳ {Number(item.lineTotal || 0).toLocaleString("en-BD")}
                        </td>

                        <td>
                          <button
                            type="button"
                            className="secondary-button"
                            onClick={() => removeSalesItem(index)}
                            style={{ padding: "5px 8px", fontSize: 11 }}
                          >
                            <Trash2 size={13} /> Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 05 PAYMENT AND CHARGES */}
            <div style={sectionStyle}>
              <h3 style={sectionHeading}>
                <span style={{ color: "#f97316" }}>05.</span>
                Payment & Additional Charges
              </h3>

              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(6, minmax(110px, 1fr))",
                gap: 8,
              }}>
                <div>
                  <label style={fieldLabel}>Other Cost</label>
                  <input
                    type="number"
                    min="0"
                    style={compactInput}
                    value={salesForm.otherCost}
                    onChange={(e) => updateSalesFormField("otherCost", e.target.value)}
                    placeholder="0"
                  />
                </div>

                <div>
                  <label style={fieldLabel}>Discount</label>
                  <input
                    type="number"
                    min="0"
                    style={compactInput}
                    value={salesForm.discount}
                    onChange={(e) => updateSalesFormField("discount", e.target.value)}
                    placeholder="0"
                  />
                </div>

                <div>
                  <label style={fieldLabel}>Paid Amount</label>
                  <input
                    type="number"
                    min="0"
                    style={compactInput}
                    value={salesForm.paidAmount}
                    onChange={(e) => updateSalesFormField("paidAmount", e.target.value)}
                    placeholder="0"
                  />
                </div>

                <div>
                  <label style={fieldLabel}>Payment Method</label>
                  <select
                    style={compactInput}
                    value={salesForm.paymentMethod}
                    onChange={(e) => updateSalesFormField("paymentMethod", e.target.value)}
                  >
                    <option value="CASH">Cash</option>
                    <option value="BANK">Bank</option>
                    <option value="BKASH">bKash</option>
                    <option value="NAGAD">Nagad</option>
                    <option value="ROCKET">Rocket</option>
                    <option value="OTHER">Other</option>
                    <option value="DUE">Due</option>
                  </select>
                </div>

                <div>
                  <label style={fieldLabel}>Payment Reference</label>
                  <input
                    style={compactInput}
                    value={salesForm.paymentReference}
                    onChange={(e) => updateSalesFormField("paymentReference", e.target.value)}
                    placeholder="Transaction ID"
                  />
                </div>

                <div>
                  <label style={fieldLabel}>Notes</label>
                  <input
                    style={compactInput}
                    value={salesForm.notes}
                    onChange={(e) => updateSalesFormField("notes", e.target.value)}
                    placeholder="Invoice notes"
                  />
                </div>
              </div>
            </div>

            {/* 06 INVOICE SUMMARY */}
            <div style={{
              ...sectionStyle,
              background: "#fff",
              border: "1px solid #cbd5e1",
              marginBottom: 4,
            }}>
              <h3 style={sectionHeading}>
                <span style={{ color: "#f97316" }}>06.</span>
                Invoice Summary
              </h3>

              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(125px, 1fr))",
                gap: 8,
              }}>
                {[
                  {
                    label: "Product Total",
                    amount: salesSummary.productTotal,
                    color: "#2563eb",
                  },
                  {
                    label: "Commission Total",
                    amount: salesSummary.totalCommission,
                    color: "#7c3aed",
                  },
                  {
                    label: "Labour Total",
                    amount: salesSummary.totalLabour,
                    color: "#0891b2",
                  },
                  {
                    label: "Other Cost",
                    amount: Number(salesForm.otherCost || 0),
                    color: "#475569",
                  },
                  {
                    label: "Discount",
                    amount: Number(salesForm.discount || 0),
                    color: "#dc2626",
                  },
                ].map((item) => (
                  <div key={item.label} style={{
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: 7,
                    padding: "9px 10px",
                    minWidth: 0,
                  }}>
                    <div style={{
                      fontSize: 10,
                      color: "#64748b",
                      marginBottom: 5,
                      fontWeight: 700,
                    }}>
                      {item.label}
                    </div>
                    <div style={{
                      fontSize: 14,
                      fontWeight: 800,
                      color: item.color,
                      overflowWrap: "anywhere",
                    }}>
                      ৳ {Number(item.amount || 0).toLocaleString("en-BD")}
                    </div>
                  </div>
                ))}
              </div>

              {/* INVOICE TOTAL */}
              <div style={{
                marginTop: 9,
                padding: "12px 15px",
                background: "#172554",
                borderRadius: 7,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 10,
              }}>
                <strong style={{ color: "#fff", fontSize: 14 }}>
                  Invoice Total
                </strong>
                <strong style={{ fontSize: 21, color: "#fed7aa" }}>
                  ৳ {salesGrandTotal.toLocaleString("en-BD")}
                </strong>
              </div>

              {/* CUSTOMER BALANCE SUMMARY */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                gap: 8,
                marginTop: 9,
              }}>
                {[
                  {
                    label: "Previous Customer Due",
                    amount: salesPreviousDue,
                    color: "#64748b",
                  },
                  {
                    label: "Total Payable",
                    amount: salesTotalPayable,
                    color: "#1d4ed8",
                  },
                  {
                    label: "Paid Amount",
                    amount: salesPaidAmount,
                    color: "#15803d",
                  },
                ].map((item) => (
                  <div key={item.label} style={{
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: 7,
                    padding: "9px 10px",
                    minWidth: 0,
                  }}>
                    <div style={{
                      fontSize: 10,
                      color: "#64748b",
                      marginBottom: 5,
                      fontWeight: 700,
                    }}>
                      {item.label}
                    </div>
                    <strong style={{
                      color: item.color,
                      fontSize: 14,
                      overflowWrap: "anywhere",
                    }}>
                      ৳ {Number(item.amount || 0).toLocaleString("en-BD")}
                    </strong>
                  </div>
                ))}
              </div>

              {/* OUTSTANDING DUE */}
              <div style={{
                marginTop: 9,
                padding: "12px 15px",
                borderRadius: 7,
                background: "#fef2f2",
                border: "1px solid #fecaca",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 10,
              }}>
                <strong style={{ color: "#991b1b", fontSize: 14 }}>
                  Outstanding Due
                </strong>
                <strong style={{ color: "#dc2626", fontSize: 21 }}>
                  ৳ {salesDueAmount.toLocaleString("en-BD")}
                </strong>
              </div>
            </div>
          </div>

          {/* FIXED FOOTER */}
          <div style={{
            ...modalFooterStyle,
            flexShrink: 0,
            padding: "10px 18px",
            background: "#fff",
            borderTop: "1px solid #e2e8f0",
            position: "relative",
            zIndex: 5,
          }}>
            <button
              type="button"
              className="secondary-button"
              onClick={() => setShowSalesForm(false)}
              disabled={salesSaving}
            >
              Close
            </button>

            <button
              type="button"
              className="primary-button"
              onClick={saveSalesInvoice}
              disabled={salesSaving}
            >
{salesSaving
  ? "Saving..."
  : editingSalesInvoiceId
    ? "Update Sales Invoice"
    : "Save Sales Invoice"}
            </button>
          </div>
        </div>
      </div>
    )}

{/* SALES INVOICE DETAILS MODAL */}
{showSalesDetails && (
  <div
    style={{
      position: "fixed",
      inset: 0,
      background: "rgba(15, 23, 42, 0.55)",
      zIndex: 9999,
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      padding: 15,
    }}
    onClick={() => setShowSalesDetails(false)}
  >
    <div
      style={{
        width: "100%",
        maxWidth: 850,
        maxHeight: "90vh",
        overflowY: "auto",
        background: "#fff",
        borderRadius: 12,
        padding: 22,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        <h3 style={{ margin: 0 }}>Sales Invoice Details</h3>

        <button
          type="button"
          className="secondary-button"
          onClick={() => setShowSalesDetails(false)}
        >
          ✕ Close
        </button>
      </div>

      {salesDetailsLoading ? (
        <p style={{ textAlign: "center", padding: 30 }}>
          Loading invoice details...
        </p>
      ) : selectedSalesInvoice ? (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 12,
              marginBottom: 20,
            }}
          >
            <div>
              <small>Invoice Number</small>
              <div><strong>{selectedSalesInvoice.invoiceNumber}</strong></div>
            </div>

            <div>
              <small>Invoice Date</small>
              <div>
                <strong>
                  {new Date(selectedSalesInvoice.invoiceDate).toLocaleDateString("en-GB")}
                </strong>
              </div>
            </div>

            <div>
              <small>Status</small>
              <div><strong>{selectedSalesInvoice.status}</strong></div>
            </div>

            <div>
              <small>Customer</small>
              <div>
                <strong>{selectedSalesInvoice.customerName}</strong>
              </div>
            </div>

            <div>
              <small>Mobile</small>
              <div>{selectedSalesInvoice.customerMobile || "-"}</div>
            </div>

            <div>
              <small>Address</small>
              <div>{selectedSalesInvoice.customerAddress || "-"}</div>
            </div>
          </div>

          <h4>Product Items</h4>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#f1f5f9" }}>
                  {["Product", "Lot", "Bags", "Weight KG", "Rate", "Commission", "Labour", "Total"].map((heading) => (
                    <th
                      key={heading}
                      style={{ padding: 10, border: "1px solid #e2e8f0", textAlign: "left" }}
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {(selectedSalesInvoice.items || []).map((item, index) => (
                  <tr key={item._id || index}>
                    <td style={{ padding: 10, border: "1px solid #e2e8f0" }}>
                      {item.productName}
                    </td>
                    <td style={{ padding: 10, border: "1px solid #e2e8f0" }}>
                      {item.lotCode}
                    </td>
                    <td style={{ padding: 10, border: "1px solid #e2e8f0" }}>
                      {item.bags}
                    </td>
                    <td style={{ padding: 10, border: "1px solid #e2e8f0" }}>
                      {Number(item.weightKg || 0).toFixed(2)}
                    </td>
                    <td style={{ padding: 10, border: "1px solid #e2e8f0" }}>
                      {Number(item.saleRatePerKg || 0).toFixed(2)}
                    </td>
                    <td style={{ padding: 10, border: "1px solid #e2e8f0" }}>
                      {Number(item.commissionTotal || 0).toFixed(2)}
                    </td>
                    <td style={{ padding: 10, border: "1px solid #e2e8f0" }}>
                      {Number(item.labourTotal || 0).toFixed(2)}
                    </td>
                    <td style={{ padding: 10, border: "1px solid #e2e8f0" }}>
                      {Number(item.lineTotal || 0).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h4 style={{ marginTop: 22 }}>Invoice Summary</h4>

          <div
            style={{
              maxWidth: 350,
              marginLeft: "auto",
              display: "grid",
              gap: 9,
              fontSize: 14,
            }}
          >
            <div>Product Total: ৳ {Number(selectedSalesInvoice.productTotal || 0).toFixed(2)}</div>
            <div>Commission: ৳ {Number(selectedSalesInvoice.totalCommission || 0).toFixed(2)}</div>
            <div>Labour: ৳ {Number(selectedSalesInvoice.totalLabour || 0).toFixed(2)}</div>
            <div>Other Cost: ৳ {Number(selectedSalesInvoice.otherCost || 0).toFixed(2)}</div>
            <div>Discount: ৳ {Number(selectedSalesInvoice.discount || 0).toFixed(2)}</div>
            <hr />
            <div>Grand Total: ৳ {Number(selectedSalesInvoice.grandTotal || 0).toFixed(2)}</div>
            <div>Previous Due: ৳ {Number(selectedSalesInvoice.previousDue || 0).toFixed(2)}</div>
            <div>Total Payable: ৳ {Number(selectedSalesInvoice.totalPayable || 0).toFixed(2)}</div>
            <div>Paid: ৳ {Number(selectedSalesInvoice.paidAmount || 0).toFixed(2)}</div>
            <div>
              <strong>Due: ৳ {Number(selectedSalesInvoice.dueAmount || 0).toFixed(2)}</strong>
            </div>
          </div>

          {selectedSalesInvoice.notes && (
            <p style={{ marginTop: 20 }}>
              <strong>Notes:</strong> {selectedSalesInvoice.notes}
            </p>
          )}
{/* CANCEL INVOICE BUTTON */}
{selectedSalesInvoice.status === "COMPLETED" && (
  <div
    style={{
      display: "flex",
      justifyContent: "flex-end",
      marginTop: 25,
      paddingTop: 15,
      borderTop: "1px solid #e2e8f0",
    }}
  >
    <button
      type="button"
      disabled={cancellingSalesInvoice}
      onClick={() => cancelSalesInvoice(selectedSalesInvoice._id)}
      style={{
        background: "#dc2626",
        color: "#fff",
        border: "none",
        borderRadius: 6,
        padding: "10px 18px",
        cursor: cancellingSalesInvoice ? "not-allowed" : "pointer",
        opacity: cancellingSalesInvoice ? 0.6 : 1,
        fontWeight: 600,
      }}
    >
      {cancellingSalesInvoice ? "Cancelling..." : "Cancel Invoice"}
    </button>
  </div>
)}

        </>
      ) : (
        <p>Invoice details পাওয়া যায়নি।</p>
      )}
    </div>
  </div>





)}

{/* ========================================
    SALES RETURN MODAL
======================================== */}
{showSalesReturn && (
  <div
    style={{
      position: "fixed",
      inset: 0,
      zIndex: 10000,
      background: "rgba(15,23,42,.65)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      padding: 10,
    }}
    onClick={() => {
      if (!salesReturnSubmitting) {
        setShowSalesReturn(false);
      }
    }}
  >
    <div
      style={{
        width: "100%",
        maxWidth: 1050,
        maxHeight: "94vh",
        display: "flex",
        flexDirection: "column",
        background: "#f8fafc",
        borderRadius: 11,
        overflow: "hidden",
        boxShadow: "0 15px 45px rgba(0,0,0,.25)",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* HEADER */}
      <div
        style={{
          padding: "15px 20px",
          background: "#172554",
          color: "#fff",
          borderBottom: "3px solid #f97316",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: 19, fontWeight: 800 }}>
            Sales Return
          </h2>
          <p style={{ margin: "4px 0 0", fontSize: 11, color: "#cbd5e1" }}>
            Customer Product Return & Due Adjustment
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowSalesReturn(false)}
          disabled={salesReturnSubmitting}
          style={{
            background: "transparent",
            border: "none",
            color: "#fff",
            fontSize: 23,
            cursor: "pointer",
          }}
        >
          ×
        </button>
      </div>

      {/* BODY */}
      <div
        style={{
          padding: 15,
          overflowY: "auto",
          flex: 1,
        }}
      >
        {salesReturnLoading ? (
          <div style={{ textAlign: "center", padding: 50 }}>
            Loading Invoice Information...
          </div>
        ) : selectedSalesReturn ? (
          <>
            {/* INVOICE INFORMATION */}
            <div
              style={{
                background: "#fff",
                border: "1px solid #dbe3ed",
                borderRadius: 8,
                padding: 14,
                marginBottom: 12,
              }}
            >
              <h3 style={sectionHeading}>
                <span style={{ color: "#f97316" }}>01.</span>
                Invoice Information
              </h3>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))",
                  gap: 12,
                  fontSize: 12,
                }}
              >
                <div>
                  <label style={fieldLabel}>Invoice Number</label>
                  <strong>{selectedSalesReturn.invoiceNumber}</strong>
                </div>

                <div>
                  <label style={fieldLabel}>Customer</label>
                  <strong>
                    {selectedSalesReturn.customerName ||
                      selectedSalesReturn.customerId?.customerName ||
                      "-"}
                  </strong>
                </div>

                <div>
                  <label style={fieldLabel}>Mobile</label>
                  <strong>
                    {selectedSalesReturn.customerMobile ||
                      selectedSalesReturn.customerId?.mobile ||
                      "-"}
                  </strong>
                </div>

                <div>
                  <label style={fieldLabel}>Invoice Date</label>
                  <strong>
                    {selectedSalesReturn.invoiceDate
                      ? new Date(
                          selectedSalesReturn.invoiceDate
                        ).toLocaleDateString("en-GB")
                      : "-"}
                  </strong>
                </div>

                <div>
                  <label style={fieldLabel}>Original Invoice Total</label>
                  <strong style={{ color: "#1d4ed8" }}>
                    ৳ {Number(selectedSalesReturn.grandTotal || 0).toLocaleString("en-BD")}
                  </strong>
                </div>

                <div>
                  <label style={fieldLabel}>Customer Current Due</label>
                  <strong style={{ color: "#dc2626" }}>
                    ৳ {Number(selectedSalesReturn.currentCustomerDue || 0).toLocaleString("en-BD")}
                  </strong>
                </div>
              </div>
            </div>

            {/* PRODUCT RETURN */}
            <div
              style={{
                background: "#fff",
                border: "1px solid #dbe3ed",
                borderRadius: 8,
                padding: 14,
                marginBottom: 12,
              }}
            >
              <h3 style={sectionHeading}>
                <span style={{ color: "#f97316" }}>02.</span>
                Product Return Entry
              </h3>

              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", minWidth: 720 }}>
                  <thead>
                    <tr>
                      <th>PRODUCT / LOT</th>
                      <th>ORIGINAL BAGS</th>
                      <th>RETURNED</th>
                      <th>RETURNABLE</th>
                      <th>RETURN BAGS</th>
                      <th>RETURN KG</th>
                    </tr>
                  </thead>

                  <tbody>
                    {salesReturnItems.map((item, index) => (
                      <tr key={item.originalSaleItemId}>
                        <td>
                          <strong>{item.productName}</strong>
                          <div style={{ fontSize: 10, color: "#64748b" }}>
                            {item.lotCode || "-"} | {item.stockType}
                          </div>
                        </td>

                        <td>
                          {item.originalBags} Bags
                          <div style={{ fontSize: 10, color: "#64748b" }}>
                            {item.originalWeightKg} KG
                          </div>
                        </td>

                        <td>
                          {item.alreadyReturnedBags} Bags
                          <div style={{ fontSize: 10, color: "#64748b" }}>
                            {item.alreadyReturnedWeightKg} KG
                          </div>
                        </td>

                        <td style={{ color: "#15803d", fontWeight: 700 }}>
                          {item.returnableBags} Bags
                          <div style={{ fontSize: 10 }}>
                            {item.returnableWeightKg} KG
                          </div>
                        </td>

                        <td>
                          <input
                            type="number"
                            min="0"
                            max={item.returnableBags}
                            step="0.001"
                            style={{ ...compactInput, width: 85 }}
                            value={item.returnBags}
                            disabled={
                              item.returnableBags <= 0 ||
                              salesReturnSubmitting
                            }
                            onChange={(e) =>
                              updateSalesReturnItem(
                                index,
                                "returnBags",
                                e.target.value
                              )
                            }
                          />
                        </td>

                        <td>
                          <input
                            type="number"
                            min="0"
                            max={item.returnableWeightKg}
                            step="0.01"
                            style={{ ...compactInput, width: 95 }}
                            value={item.returnWeightKg}
                            disabled={
                              item.returnableWeightKg <= 0 ||
                              salesReturnSubmitting
                            }
                            onChange={(e) =>
                              updateSalesReturnItem(
                                index,
                                "returnWeightKg",
                                e.target.value
                              )
                            }
                          />
                        </td>
                      </tr>
                    ))}

                    {salesReturnItems.length === 0 && (
                      <tr>
                        <td colSpan={6} style={{ textAlign: "center", padding: 20 }}>
                          No products found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <p style={{ fontSize: 10, color: "#64748b", marginBottom: 0 }}>
                Return Quantity অবশ্যই Returnable Quantity-এর মধ্যে রাখতে হবে।
              </p>
            </div>

            {/* FINANCIAL SUMMARY */}
            <div
              style={{
                background: "#fff",
                border: "1px solid #dbe3ed",
                borderRadius: 8,
                padding: 14,
                marginBottom: 12,
              }}
            >
              <h3 style={sectionHeading}>
                <span style={{ color: "#f97316" }}>03.</span>
                Return Financial Summary
              </h3>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))",
                  gap: 9,
                }}
              >
                {[
                  {
                    label: "Return Amount",
                    amount: salesReturnCalculation.returnAmount,
                    color: "#1d4ed8",
                  },
                  {
                    label: "Customer Current Due",
                    amount: salesReturnCalculation.previousDue,
                    color: "#dc2626",
                  },
                  {
                    label: "Due Adjustment",
                    amount: salesReturnCalculation.amountAdjusted,
                    color: "#7c3aed",
                  },
                  {
                    label: "Refund Amount",
                    amount: salesReturnCalculation.refundAmount,
                    color: "#ea580c",
                  },
                  {
                    label: "Remaining Customer Due",
                    amount: salesReturnCalculation.remainingDue,
                    color: "#15803d",
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    style={{
                      padding: 11,
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      borderRadius: 7,
                    }}
                  >
                    <div style={fieldLabel}>{item.label}</div>
                    <strong style={{ color: item.color, fontSize: 16 }}>
                      ৳ {Number(item.amount || 0).toLocaleString("en-BD", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </strong>
                  </div>
                ))}
              </div>
            </div>

            {/* REFUND INFORMATION */}
            <div
              style={{
                background: "#fff",
                border: "1px solid #dbe3ed",
                borderRadius: 8,
                padding: 14,
              }}
            >
              <h3 style={sectionHeading}>
                <span style={{ color: "#f97316" }}>04.</span>
                Refund Information & Notes
              </h3>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
                  gap: 10,
                }}
              >
                <div>
                  <label style={fieldLabel}>Refund Method</label>
                  <select
                    style={compactInput}
                    value={salesReturnRefundMethod}
                    onChange={(e) =>
                      setSalesReturnRefundMethod(e.target.value)
                    }
                    disabled={
                      salesReturnSubmitting ||
                      salesReturnCalculation.refundAmount <= 0
                    }
                  >
                    <option value="CASH">Cash</option>
                    <option value="BANK">Bank</option>
                    <option value="BKASH">bKash</option>
                    <option value="NAGAD">Nagad</option>
                    <option value="ROCKET">Rocket</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div>
                  <label style={fieldLabel}>Return Notes</label>
                  <input
                    style={compactInput}
                    value={salesReturnNotes}
                    onChange={(e) => setSalesReturnNotes(e.target.value)}
                    placeholder="Reason for product return..."
                    disabled={salesReturnSubmitting}
                  />
                </div>
              </div>
            </div>
          </>
        ) : (
          <p style={{ textAlign: "center", padding: 30 }}>
            Invoice information পাওয়া যায়নি।
          </p>
        )}
      </div>

      {/* FOOTER */}
      <div
        style={{
          padding: "12px 16px",
          background: "#fff",
          borderTop: "1px solid #e2e8f0",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <strong style={{ fontSize: 13, color: "#1e293b" }}>
          Return: ৳ {Number(salesReturnCalculation.returnAmount || 0).toLocaleString("en-BD", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </strong>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            className="secondary-button"
            disabled={salesReturnSubmitting}
            onClick={() => setShowSalesReturn(false)}
          >
            Close
          </button>

         <button
  type="button"
  className="primary-button"
  disabled={false}
  onClick={submitSalesReturn}
  style={{
    background: "#ea580c",
    borderColor: "#ea580c",
  }}
>
  {salesReturnSubmitting ? "Processing..." : "Confirm Sales Return"}
</button>
        </div>
      </div>
    </div>
  </div>
)}


  </>
);
}




function renderActivityLog() {
  const metadata = selectedActivity?.metadata || {};

  const oldValues =
    metadata.oldValues && typeof metadata.oldValues === "object"
      ? metadata.oldValues
      : {};

  const newValues =
    metadata.newValues && typeof metadata.newValues === "object"
      ? metadata.newValues
      : {};

  const comparisonKeys = [
    ...new Set([
      ...Object.keys(oldValues),
      ...Object.keys(newValues),
    ]),
  ];

  function formatActivityValue(value) {
    if (value === null || value === undefined || value === "") {
      return "-";
    }

    if (typeof value === "boolean") {
      return value ? "Yes" : "No";
    }

    if (typeof value === "object") {
      return JSON.stringify(value, null, 2);
    }

    return String(value);
  }

  function formatActivityLabel(key) {
   const labels = {
  amount: "Amount",
  paymentMethod: "Payment Method",
  transactionId: "Transaction ID",
  transactionDate: "Transaction Date",
  balanceBefore: "Previous Balance",
  balanceAfter: "New Balance",
  notes: "Notes",
  bagsReturned: "Bags Returned",
  weightReturnedKg: "Weight Returned (KG)",
  purchasePricePerKg: "Purchase Price / KG",
  returnAmount: "Return Amount",
  returnDate: "Return Date",
  supplierId: "Supplier",
  oldValues: "Previous Values",
  newValues: "Updated Values",
  editReason: "Edit Reason",
  productName: "Product Name",
  supplierName: "Supplier Name",
  totalWeightKg: "Total Weight (KG)",
  totalPurchaseAmount: "Total Purchase Amount",
  bagsReceived: "Bags Received",
  remainingWeightKg: "Remaining Weight (KG)",
  remainingBags: "Remaining Bags",
  stockType: "Stock Type",
  purchaseDate: "Purchase Date",
  category: "Category",
  subcategory: "Subcategory",
  brand: "Brand",
  supplier: "Supplier",
  packingType: "Packing Type",
  unit: "Unit",
  purchasePrice: "Purchase Price",
  salePrice: "Sale Price",
  minimumStockKg: "Minimum Stock (KG)",
  description: "Description",
  isActive: "Active Status",
  lotCode: "Lot Code",
};
    return labels[key] ||
      key.replace(/([A-Z])/g, " $1")
        .replace(/^./, (s) => s.toUpperCase());
  }

  function formatMetadataValue(key, value) {
    if (value === null || value === undefined || value === "") {
      return "-";
    }
if (
  [
    "amount",
    "balanceBefore",
    "balanceAfter",
    "returnAmount",
    "totalPurchaseAmount",
    "purchasePricePerKg",
    "purchasePrice",
    "salePrice",
  ].includes(key)
) {
  return `৳${Number(value).toLocaleString("en-BD")}`;
}
 

    if (key === "paymentMethod") {
      return String(value).replace(/_/g, " ");
    }

    if (["transactionDate", "returnDate", "purchaseDate"].includes(key)) {
      const date = new Date(value);
      return Number.isNaN(date.getTime())
        ? String(value)
        : date.toLocaleDateString("en-BD");
    }

    return formatActivityValue(value);
  }

  return (
    <div className="panel" style={{ padding: 22 }}>
      {/* Page Header */}
      <div style={pageHeaderStyle}>
        <div>
          <h2 style={{ margin: 0 }}>Admin Activity Log</h2>
          <p style={{ color: "#7b8494", margin: "6px 0 0" }}>
            Admin-এর সকল কার্যক্রমের ইতিহাস
          </p>
        </div>

        <button
          className="btn-primary"
          onClick={() => loadActivities(activityPage)}
          disabled={activityLoading}
        >
          {activityLoading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {/* Search & Filters */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 12,
          marginTop: 20,
          marginBottom: 20,
        }}
      >
        <input
          type="text"
          placeholder="Search admin, action, description..."
          value={activitySearch}
          onChange={(e) => setActivitySearch(e.target.value)}
          style={{
            padding: 11,
            border: "1px solid #dce1e8",
            borderRadius: 8,
            width: "100%",
          }}
        />

        <select
          value={activityModule}
          onChange={(e) => setActivityModule(e.target.value)}
          style={{
            padding: 11,
            border: "1px solid #dce1e8",
            borderRadius: 8,
            width: "100%",
          }}
        >
          <option value="">All Modules</option>
          <option value="PURCHASE">Purchase</option>
          <option value="SUPPLIER">Supplier</option>
          <option value="PRODUCT">Product</option>
          <option value="INVENTORY">Inventory</option>
          <option value="SALES">Sales</option>
          <option value="CUSTOMER">Customer</option>
          <option value="ADMIN">Admin</option>
        </select>

        <select
          value={activityAction}
          onChange={(e) => setActivityAction(e.target.value)}
          style={{
            padding: 11,
            border: "1px solid #dce1e8",
            borderRadius: 8,
            width: "100%",
          }}
        >
         <option value="">All Actions</option>
<option value="PURCHASE_CREATE">Purchase Create</option>
<option value="PURCHASE_EDIT">Purchase Edit</option>
<option value="PURCHASE_RETURN">Purchase Return</option>
<option value="PRODUCT_CREATE">Product Create</option>
<option value="PRODUCT_EDIT">Product Edit</option>
<option value="PRODUCT_DEACTIVATE">Product Deactivate</option>
<option value="PRODUCT_DELETE">Product Delete</option>
<option value="SUPPLIER_PAYMENT">Supplier Payment</option>
        </select>

        <input
          type="date"
          value={activityStartDate}
          onChange={(e) => setActivityStartDate(e.target.value)}
          title="Start Date"
          style={{
            padding: 11,
            border: "1px solid #dce1e8",
            borderRadius: 8,
            width: "100%",
          }}
        />

        <input
          type="date"
          value={activityEndDate}
          onChange={(e) => setActivityEndDate(e.target.value)}
          title="End Date"
          style={{
            padding: 11,
            border: "1px solid #dce1e8",
            borderRadius: 8,
            width: "100%",
          }}
        />

        <div style={{ display: "flex", gap: 8 }}>
          <button
            className="btn-primary"
            onClick={() => loadActivities(1)}
            disabled={activityLoading}
          >
            Search / Filter
          </button>

          <button
            className="btn-secondary"
            onClick={() => {
              setActivitySearch("");
              setActivityModule("");
              setActivityAction("");
              setActivityStartDate("");
              setActivityEndDate("");
              loadActivities(1, true);
            }}
            disabled={activityLoading}
          >
            Reset
          </button>
        </div>
      </div>

      {/* Activity Table */}
      <div style={{ overflowX: "auto", marginTop: 20 }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            minWidth: 950,
          }}
        >
          <thead>
            <tr>
              {[
                "DATE & TIME",
                "ADMIN",
                "MODULE",
                "ACTION",
                "DESCRIPTION",
                "TARGET",
                "DETAILS",
              ].map((heading) => (
                <th
                  key={heading}
                  style={{
                    padding: 13,
                    textAlign: "left",
                    borderBottom: "1px solid #e5e7eb",
                    color: "#7b8494",
                    fontSize: 12,
                    whiteSpace: "nowrap",
                  }}
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {activityLoading ? (
              <tr>
                <td colSpan="7" style={{ padding: 25, textAlign: "center" }}>
                  Activity লোড হচ্ছে...
                </td>
              </tr>
            ) : activities.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ padding: 25, textAlign: "center" }}>
                  কোনো Activity পাওয়া যায়নি
                </td>
              </tr>
            ) : (
              activities.map((activity) => (
                <tr key={activity._id}>
                  <td style={{ padding: 13, borderBottom: "1px solid #eee", whiteSpace: "nowrap" }}>
                    {new Date(activity.createdAt).toLocaleString("en-BD")}
                  </td>

                  <td style={{ padding: 13, borderBottom: "1px solid #eee" }}>
                    <strong>{activity.adminName || "Unknown"}</strong>
                    <div style={{ color: "#7b8494", fontSize: 12 }}>
                      @{activity.adminUsername || ""}
                    </div>
                  </td>

                  <td style={{ padding: 13, borderBottom: "1px solid #eee" }}>
                    {activity.module}
                  </td>

                  <td style={{ padding: 13, borderBottom: "1px solid #eee" }}>
                    <strong>{activity.action}</strong>
                  </td>

                  <td style={{ padding: 13, borderBottom: "1px solid #eee" }}>
                    {activity.description || "-"}
                  </td>

                  <td style={{ padding: 13, borderBottom: "1px solid #eee" }}>
                    {activity.targetName || "-"}
                  </td>

                  <td style={{ padding: 13, borderBottom: "1px solid #eee" }}>
                    <button
                      className="btn-secondary"
                      onClick={() => setSelectedActivity(activity)}
                    >
                      Details
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: 20,
          gap: 12,
        }}
      >
        <span style={{ color: "#7b8494", fontSize: 13 }}>
          Page {activityPage} of {activityTotalPages}
        </span>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            className="btn-secondary"
            disabled={activityPage <= 1 || activityLoading}
            onClick={() => loadActivities(activityPage - 1)}
          >
            Previous
          </button>

          <button
            className="btn-primary"
            disabled={activityPage >= activityTotalPages || activityLoading}
            onClick={() => loadActivities(activityPage + 1)}
          >
            Next
          </button>
        </div>
      </div>

      {/* Activity Details Modal */}
     
{/* ========================================
    PROFESSIONAL ACTIVITY DETAILS MODAL
======================================== */}

{selectedActivity && (
  <div
    onClick={() => setSelectedActivity(null)}
    style={{
      position: "fixed",
      inset: 0,
      background: "rgba(15, 23, 42, 0.68)",
      backdropFilter: "blur(5px)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 9999,
      padding: 12,
    }}
  >
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        background: "#fff",
        width: "100%",
        maxWidth: 850,
        maxHeight: "92vh",
        overflowY: "auto",
        borderRadius: 16,
        boxShadow: "0 25px 70px rgba(0,0,0,0.25)",
      }}
    >
      {(() => {
        const activity = selectedActivity;
        const action = activity.action;
        const isEdit = ["PURCHASE_EDIT", "PRODUCT_EDIT"].includes(action);

        const actionColors = {
          PURCHASE_CREATE: "#2563eb",
          PURCHASE_EDIT: "#d97706",
          PURCHASE_RETURN: "#dc2626",
          PRODUCT_CREATE: "#059669",
          PRODUCT_EDIT: "#d97706",
          PRODUCT_DEACTIVATE: "#dc2626",
          PRODUCT_DELETE: "#dc2626",
          SUPPLIER_PAYMENT: "#0891b2",
        };

        const accent = actionColors[action] || "#64748b";

        const DetailCard = ({ label, value, color }) => (
          <div
            style={{
              background: "#f8fafc",
              border: "1px solid #e8edf3",
              borderRadius: 10,
              padding: 14,
              minWidth: 0,
            }}
          >
            <div
              style={{
                color: "#64748b",
                fontSize: 12,
                marginBottom: 7,
              }}
            >
              {label}
            </div>

            <div
              style={{
                color: color || "#172033",
                fontWeight: 700,
                fontSize: 15,
                wordBreak: "break-word",
              }}
            >
              {value === null || value === undefined || value === ""
                ? "-"
                : value}
            </div>
          </div>
        );

        const renderDetails = (data) =>
          Object.entries(data).map(([key, value]) => {
            const isNested =
              value !== null &&
              typeof value === "object" &&
              !Array.isArray(value);

            return (
              <div
                key={key}
                style={{
                  padding: "13px 15px",
                  borderBottom: "1px solid #edf0f4",
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    color: "#64748b",
                    fontWeight: 600,
                    marginBottom: 6,
                  }}
                >
                  {formatActivityLabel(key)}
                </div>

                {isNested ? (
                  <div
                    style={{
                      background: "#f8fafc",
                      borderRadius: 8,
                      padding: 10,
                    }}
                  >
                    {renderDetails(value)}
                  </div>
                ) : (
                  <div
                    style={{
                      fontSize: 14,
                      color: "#1e293b",
                      fontWeight: 500,
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                    }}
                  >
                    {formatMetadataValue(key, value)}
                  </div>
                )}
              </div>
            );
          });

        return (
          <>
            {/* HEADER */}
            <div
              style={{
                padding: "22px 24px",
                background: "#111827",
                color: "#fff",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 12,
                    color: "#cbd5e1",
                    marginBottom: 7,
                  }}
                >
                  MANAGEMENT / ACTIVITY LOG
                </div>

                <h2 style={{ margin: 0, fontSize: 21 }}>
                  Activity Details
                </h2>

                <div
                  style={{
                    display: "inline-block",
                    marginTop: 10,
                    background: accent,
                    padding: "5px 11px",
                    borderRadius: 20,
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: 0.4,
                  }}
                >
                  {action.replace(/_/g, " ")}
                </div>
              </div>

              <button
                onClick={() => setSelectedActivity(null)}
                style={{
                  border: "1px solid #475569",
                  background: "#1e293b",
                  color: "#fff",
                  width: 38,
                  height: 38,
                  borderRadius: 9,
                  cursor: "pointer",
                  fontSize: 21,
                }}
              >
                ×
              </button>
            </div>

            <div style={{ padding: 22 }}>
              {/* ADMIN INFORMATION */}
              <h3 style={{ fontSize: 15, margin: "0 0 12px" }}>
                Admin Information
              </h3>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: 12,
                }}
              >
                <DetailCard
                  label="Admin Name"
                  value={activity.adminName || "Unknown"}
                />

                <DetailCard
                  label="Username"
                  value={`@${activity.adminUsername || "-"}`}
                />

                <DetailCard
                  label="Module"
                  value={activity.module}
                />

                <DetailCard
                  label="Action"
                  value={action.replace(/_/g, " ")}
                  color={accent}
                />
              </div>

              {/* ACTIVITY INFORMATION */}
              <h3 style={{ fontSize: 15, margin: "24px 0 12px" }}>
                Activity Information
              </h3>

              <div
                style={{
                  background: "#f8fafc",
                  border: "1px solid #e8edf3",
                  borderRadius: 10,
                  padding: 15,
                  marginBottom: 12,
                }}
              >
                <div
                  style={{
                    color: "#64748b",
                    fontSize: 12,
                    marginBottom: 7,
                  }}
                >
                  Description
                </div>

                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: "#1e293b",
                  }}
                >
                  {activity.description || "-"}
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: 12,
                }}
              >
                <DetailCard
                  label="Date & Time"
                  value={new Date(activity.createdAt).toLocaleString("en-BD")}
                />

                <DetailCard
                  label="Target"
                  value={activity.targetName || "-"}
                />
              </div>

              {/* PURCHASE CREATE SUMMARY */}
              {action === "PURCHASE_CREATE" && (
                <>
                  <h3 style={{ fontSize: 15, margin: "25px 0 12px" }}>
                    Purchase Summary
                  </h3>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(155px, 1fr))",
                      gap: 12,
                    }}
                  >
                    <DetailCard
                      label="Lot Code"
                      value={metadata.lotCode}
                      color="#2563eb"
                    />

                    <DetailCard
                      label="Product"
                      value={metadata.productName}
                    />

                    <DetailCard
                      label="Supplier"
                      value={metadata.supplierName || "Not Assigned"}
                    />

                    <DetailCard
                      label="Stock Type"
                      value={metadata.stockType}
                    />

                    <DetailCard
                      label="Bags Received"
                      value={metadata.bagsReceived}
                    />

                    <DetailCard
                      label="Total Weight"
                      value={
                        metadata.totalWeightKg !== undefined
                          ? `${Number(metadata.totalWeightKg).toLocaleString("en-BD")} KG`
                          : "-"
                      }
                    />

                    <DetailCard
                      label="Price / KG"
                      value={formatMetadataValue(
                        "purchasePricePerKg",
                        metadata.purchasePricePerKg
                      )}
                    />

                    <DetailCard
                      label="Total Purchase Amount"
                      value={formatMetadataValue(
                        "totalPurchaseAmount",
                        metadata.totalPurchaseAmount
                      )}
                      color="#059669"
                    />
                  </div>

                  <div style={{ marginTop: 12 }}>
                    <DetailCard
                      label="Purchase Date"
                      value={formatMetadataValue(
                        "purchaseDate",
                        metadata.purchaseDate
                      )}
                    />
                  </div>

                  {metadata.notes && (
                    <div style={{ marginTop: 12 }}>
                      <DetailCard
                        label="Purchase Notes"
                        value={metadata.notes}
                      />
                    </div>
                  )}
                </>
              )}

              {/* PURCHASE / PRODUCT EDIT COMPARISON */}
              {isEdit && comparisonKeys.length > 0 && (
                <>
                  <h3 style={{ fontSize: 15, margin: "25px 0 12px" }}>
                    {action === "PRODUCT_EDIT"
                      ? "Product Change History"
                      : "Purchase Change History"}
                  </h3>

                  <div
                    style={{
                      border: "1px solid #e5e7eb",
                      borderRadius: 11,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr 1fr",
                        background: "#f1f5f9",
                        padding: 12,
                        gap: 8,
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                    >
                      <div>FIELD</div>
                      <div>PREVIOUS</div>
                      <div>UPDATED</div>
                    </div>

                    {comparisonKeys.map((key) => {
                      const changed =
                        JSON.stringify(oldValues[key]) !==
                        JSON.stringify(newValues[key]);

                      return (
                        <div
                          key={key}
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr 1fr",
                            gap: 8,
                            padding: 12,
                            borderTop: "1px solid #edf0f4",
                            background: changed ? "#fffbeb" : "#fff",
                            fontSize: 13,
                          }}
                        >
                          <strong style={{ wordBreak: "break-word" }}>
                            {formatActivityLabel(key)}
                          </strong>

                          <div
                            style={{
                              color: "#64748b",
                              wordBreak: "break-word",
                            }}
                          >
                            {formatMetadataValue(key, oldValues[key])}
                          </div>

                          <div
                            style={{
                              color: changed ? "#15803d" : "#64748b",
                              fontWeight: changed ? 700 : 400,
                              wordBreak: "break-word",
                            }}
                          >
                            {formatMetadataValue(key, newValues[key])}

                            {changed && (
                              <div
                                style={{
                                  fontSize: 10,
                                  marginTop: 4,
                                  color: "#15803d",
                                }}
                              >
                                UPDATED
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {metadata.editReason && (
                    <div
                      style={{
                        marginTop: 14,
                        padding: 15,
                        background: "#fff7ed",
                        border: "1px solid #fed7aa",
                        borderRadius: 10,
                      }}
                    >
                      <strong style={{ color: "#9a3412", fontSize: 13 }}>
                        Edit Reason
                      </strong>

                      <p style={{ margin: "7px 0 0", color: "#7c2d12" }}>
                        {metadata.editReason}
                      </p>
                    </div>
                  )}
                </>
              )}

              {/* OTHER ACTIVITIES */}
              {!isEdit && action !== "PURCHASE_CREATE" && (
                <>
                  <h3 style={{ fontSize: 15, margin: "25px 0 12px" }}>
                    Complete Activity Details
                  </h3>

                  <div
                    style={{
                      border: "1px solid #e5e7eb",
                      borderRadius: 10,
                      overflow: "hidden",
                    }}
                  >
                    {Object.keys(metadata).length > 0 ? (
                      renderDetails(metadata)
                    ) : (
                      <div style={{ padding: 18, color: "#64748b" }}>
                        কোনো অতিরিক্ত তথ্য পাওয়া যায়নি।
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* ACTIVITY ID */}
              <div
                style={{
                  marginTop: 24,
                  padding: 13,
                  borderRadius: 9,
                  background: "#f1f5f9",
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    color: "#64748b",
                    marginBottom: 5,
                    fontWeight: 700,
                  }}
                >
                  ACTIVITY REFERENCE ID
                </div>

                <div
                  style={{
                    fontSize: 12,
                    color: "#475569",
                    wordBreak: "break-all",
                  }}
                >
                  {activity._id}
                </div>
              </div>

              {/* FOOTER */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  marginTop: 20,
                }}
              >
                <button
                  className="btn-primary"
                  onClick={() => setSelectedActivity(null)}
                  style={{ padding: "10px 25px" }}
                >
                  Close Details
                </button>
              </div>
            </div>
          </>
        );
      })()}
    </div>
  </div>
)}

    </div>
  );
}

function renderAllSupplierReport() {


  const report = allSupplierReport;
  const summary = report?.summary || {};
  const supplierSummary = report?.supplierSummary || [];

  const netSupplierBalance =
  Number(summary.totalDebit || 0) -
  Number(summary.totalCredit || 0);
  const reportTransactions = report?.transactions || [];

  const updateFilter = (key, value) => {
    setAllSupplierReportFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const clearFilters = () => {
    const emptyFilters = {
      startDate: "",
      endDate: "",
      supplierId: "",
      type: "",
      paymentMethod: "",
      minAmount: "",
      maxAmount: "",
      search: "",
    };

    setAllSupplierReportFilters(emptyFilters);
    setSupplierReportSearch("");
    setShowSupplierReportSupplierOptions(false);
    loadAllSupplierReport(emptyFilters);
  };

  const selectedSupplier = suppliers.find(
    (s) => s._id === allSupplierReportFilters.supplierId
  );

  const filteredSupplierOptions = suppliers
    .filter((s) => s.isActive !== false)
    .filter((s) =>
      (s.supplierName || "")
        .toLowerCase()
        .includes(supplierReportSearch.trim().toLowerCase())
    );

  const money = (value) =>
    `৳ ${Number(value || 0).toLocaleString("en-BD", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

    const downloadAllSupplierReportCSV = () => {
  const escapeCSV = (value) =>
    `"${String(value ?? "").replace(/"/g, '""')}"`;

const rows = [
  ["ALL SUPPLIER REPORT"],
  ["Report Generated", new Date().toLocaleString("en-BD")],
    [],
    ["SUPPLIER-WISE SUMMARY"],
    [
      "Supplier",
      "Address",
      "Mobile",
      "Transactions",
      "Purchase",
      "Payment",
      "Purchase Return",
      "Debit",
      "Credit",
      "Net Balance",
    ],
    ...supplierSummary.map((s) => [
      s.supplierName,
      s.address,
      s.mobile,
      s.transactionCount,
      s.totalPurchase,
      s.totalPayment,
      s.totalPurchaseReturn,
      s.totalDebit,
      s.totalCredit,
      Number(s.totalDebit || 0) - Number(s.totalCredit || 0),
    ]),
    [],
    
    ["ALL TRANSACTIONS"],

...supplierSummary.map((s) => [
  s.supplierName,
  s.address,
  s.mobile,
  s.transactionCount,
  s.totalPurchase,
  s.totalPayment,
  s.totalPurchaseReturn,
  s.totalDebit,
  s.totalCredit,
  Number(s.totalDebit || 0) - Number(s.totalCredit || 0),
]),
[
  "GRAND TOTAL",
  "",
  "",
  summary.totalTransactions || 0,
  summary.totalPurchase || 0,
  summary.totalPayment || 0,
  summary.totalPurchaseReturn || 0,
  summary.totalDebit || 0,
  summary.totalCredit || 0,
  netSupplierBalance,
],
[],
["ALL TRANSACTIONS"],

    [
      "Date",
      "Supplier",
      "Type",
      "Lot Number",
      "Description",
      "Payment Method",
      "Debit",
      "Credit",
      "Status",
    ],
    ...reportTransactions.map((item) => [
      item.transactionDate
        ? new Date(item.transactionDate).toLocaleDateString("en-GB")
        : "",
      item.supplierName,
      transactionLabel(item.type),
      item.lotCode,
      item.description || item.reference,
      item.paymentMethod,
      item.debit,
      item.credit,
      item.isVoided ? "VOIDED" : "Active",
    ]),
  ];

  const csvContent =
    "\uFEFF" +
    rows.map((row) => row.map(escapeCSV).join(",")).join("\r\n");

  const blob = new Blob([csvContent], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "all-supplier-report.csv";
  link.click();

  URL.revokeObjectURL(url);
};

  const transactionLabel = (type) => {
    const labels = {
      PURCHASE: "Purchase",
      PURCHASE_RETURN: "Purchase Return",
      PAYMENT: "Supplier Payment",
      ADJUSTMENT: "Adjustment",
    };

    return labels[type] || type || "-";
  };

  return (
    <div className="panel all-supplier-report-print" style={{ padding: 22 }}>
      <div style={{
        ...pageHeaderStyle,
        flexWrap: "wrap",
        gap: 12,
      }}>
        <div>
          <h2 style={{ margin: 0 }}>All Supplier Report</h2>
          <p style={{ color: "#7b8494", margin: "6px 0 0" }}>
            All suppliers transaction summary and details
          </p>
<p style={{
  color: "#64748b",
  fontSize: 12,
  margin: "5px 0 0",
}}>
  Report Generated: {new Date().toLocaleString("en-BD")}
</p>

        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            className="secondary-button"
            onClick={() => window.print()}
            disabled={!report}
          >
            <Printer size={17} /> Print / PDF
          </button>
<button
  className="secondary-button"
  onClick={downloadAllSupplierReportCSV}
  disabled={!report || reportTransactions.length === 0}
>
  <Download size={17} /> Export CSV
</button>
          <button
            className="secondary-button"
            onClick={() => setActivePage("Suppliers")}
          >
            Back to Suppliers
          </button>
        </div>
      </div>

      {/* FILTER PANEL */}
      <div
        className="all-supplier-report-filter"
        style={{
          marginTop: 20,
          padding: 18,
          border: "1px solid #e2e8f0",
          borderRadius: 12,
          background: "#f8fafc",
        }}
      >
        <h3 style={{ margin: "0 0 15px", fontSize: 16 }}>
          Report Filters
        </h3>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
          gap: 14,
        }}>
          {/* START DATE */}
          <div>
            <label style={fieldStyle}>Start Date</label>
            <input
              type="date"
              style={inputStyle}
              value={allSupplierReportFilters.startDate}
              onChange={(e) => updateFilter("startDate", e.target.value)}
            />
          </div>

          {/* END DATE */}
          <div>
            <label style={fieldStyle}>End Date</label>
            <input
              type="date"
              style={inputStyle}
              value={allSupplierReportFilters.endDate}
              onChange={(e) => updateFilter("endDate", e.target.value)}
            />
          </div>

          {/* SEARCHABLE SUPPLIER */}
          <div style={{ position: "relative" }}>
            <label style={fieldStyle}>Supplier</label>

            <input
              style={inputStyle}
              placeholder="Search supplier name..."
              value={
                showSupplierReportSupplierOptions
                  ? supplierReportSearch
                  : selectedSupplier?.supplierName || "All Suppliers"
              }
              onFocus={() => {
                setSupplierReportSearch("");
                setShowSupplierReportSupplierOptions(true);
              }}
              onChange={(e) => {
                setSupplierReportSearch(e.target.value);
                setShowSupplierReportSupplierOptions(true);
              }}
              onBlur={() => {
                setTimeout(() => {
                  setShowSupplierReportSupplierOptions(false);
                }, 150);
              }}
            />

            {showSupplierReportSupplierOptions && (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  right: 0,
                  zIndex: 100,
                  background: "#fff",
                  border: "1px solid #dce1e8",
                  borderRadius: 8,
                  maxHeight: 230,
                  overflowY: "auto",
                  boxShadow: "0 5px 15px rgba(0,0,0,0.10)",
                }}
              >
                <div
                  onMouseDown={() => {
                    updateFilter("supplierId", "");
                    setSupplierReportSearch("");
                    setShowSupplierReportSupplierOptions(false);
                  }}
                  style={{
                    padding: "11px 12px",
                    cursor: "pointer",
                    borderBottom: "1px solid #eee",
                    fontSize: 14,
                    fontWeight: 600,
                  }}
                >
                  All Suppliers
                </div>

                {filteredSupplierOptions.map((s) => (
                  <div
                    key={s._id}
                    onMouseDown={() => {
                      updateFilter("supplierId", s._id);
                      setSupplierReportSearch("");
                      setShowSupplierReportSupplierOptions(false);
                    }}
                    style={{
                      padding: "11px 12px",
                      cursor: "pointer",
                      borderBottom: "1px solid #f1f5f9",
                      fontSize: 14,
                    }}
                  >
                    {s.supplierName}
                  </div>
                ))}

                {filteredSupplierOptions.length === 0 && (
                  <div style={{
                    padding: 12,
                    color: "#64748b",
                    fontSize: 13,
                  }}>
                    No supplier found
                  </div>
                )}
              </div>
            )}
          </div>

          {/* TRANSACTION TYPE */}
          <div>
            <label style={fieldStyle}>Transaction Type</label>
            <select
              style={inputStyle}
              value={allSupplierReportFilters.type}
              onChange={(e) => updateFilter("type", e.target.value)}
            >
              <option value="">All Types</option>
              <option value="PURCHASE">Purchase</option>
              <option value="PURCHASE_RETURN">Purchase Return</option>
              <option value="PAYMENT">Supplier Payment</option>
              <option value="ADJUSTMENT">Adjustment</option>
            </select>
          </div>

          {/* PAYMENT METHOD */}
          <div>
            <label style={fieldStyle}>Payment Method</label>
            <select
              style={inputStyle}
              value={allSupplierReportFilters.paymentMethod}
              onChange={(e) => updateFilter("paymentMethod", e.target.value)}
            >
              <option value="">All Methods</option>
              <option value="CASH">Cash</option>
              <option value="BANK">Bank</option>
              <option value="BKASH">bKash</option>
              <option value="NAGAD">Nagad</option>
              <option value="ROCKET">Rocket</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          {/* MINIMUM AMOUNT */}
          <div>
            <label style={fieldStyle}>Minimum Amount</label>
            <input
              type="number"
              min="0"
              style={inputStyle}
              placeholder="Minimum amount"
              value={allSupplierReportFilters.minAmount}
              onChange={(e) => updateFilter("minAmount", e.target.value)}
            />
          </div>

          {/* MAXIMUM AMOUNT */}
          <div>
            <label style={fieldStyle}>Maximum Amount</label>
            <input
              type="number"
              min="0"
              style={inputStyle}
              placeholder="Maximum amount"
              value={allSupplierReportFilters.maxAmount}
              onChange={(e) => updateFilter("maxAmount", e.target.value)}
            />
          </div>

          {/* GENERAL SEARCH */}
          <div>
            <label style={fieldStyle}>Search</label>
            <input
              style={inputStyle}
              placeholder="Supplier / Lot / Transaction ID"
              value={allSupplierReportFilters.search}
              onChange={(e) => updateFilter("search", e.target.value)}
            />
          </div>
        </div>

        {/* FILTER BUTTONS */}
        <div style={{
          display: "flex",
          gap: 10,
          marginTop: 16,
          flexWrap: "wrap",
        }}>
          <button
            className="primary-button"
            disabled={allSupplierReportLoading}
            onClick={() => loadAllSupplierReport()}
          >
            {allSupplierReportLoading ? "Loading..." : "Apply Filter"}
          </button>

          <button
            className="secondary-button"
            onClick={clearFilters}
            disabled={allSupplierReportLoading}
          >
            Clear Filter
          </button>
        </div>
      </div>

      {/* LOADING */}
      {allSupplierReportLoading && (
        <p style={{ textAlign: "center", padding: 25 }}>
          Loading supplier report...
        </p>
      )}

      {/* REPORT DATA */}
      {!allSupplierReportLoading && report && (
        <>
          {/* SUMMARY CARDS */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 14,
            marginTop: 20,
          }}>
            {[
              {
                title: "Total Suppliers",
                value: summary.supplierCount || 0,
                color: "#2563eb",
              },
              {
                title: "Total Purchase",
                value: money(summary.totalPurchase),
                color: "#2563eb",
              },
              {
                title: "Total Payment",
                value: money(summary.totalPayment),
                color: "#16a34a",
              },
              {
  title: "Net Supplier Balance",
  value: money(Math.abs(netSupplierBalance)),
  subtitle:
    netSupplierBalance > 0
      ? "Payable to Suppliers"
      : netSupplierBalance < 0
      ? "Supplier Advance"
      : "Fully Settled",
  color: netSupplierBalance > 0 ? "#dc2626" : "#16a34a",
},
              {
                title: "Purchase Return",
                value: money(summary.totalPurchaseReturn),
                color: "#d97706",
              },
              {
                title: "Adjustment Debit",
                value: money(summary.totalAdjustmentDebit),
                color: "#64748b",
              },
              {
                title: "Adjustment Credit",
                value: money(summary.totalAdjustmentCredit),
                color: "#64748b",
              },
            ].map((item) => (
              <div
                key={item.title}
                style={{
                  padding: 17,
                  border: "1px solid #e2e8f0",
                  borderRadius: 10,
                  background: "#fff",
                }}
              >
                <p style={{
                  margin: 0,
                  color: "#64748b",
                  fontSize: 13,
                }}>
                  {item.title}
                </p>
                <h3 style={{
                  margin: "9px 0 0",
                  color: item.color,
                  fontSize: 19,
                }}>
                  {item.value}
                </h3>
{item.subtitle && (
  <p style={{
    margin: "6px 0 0",
    fontSize: 12,
    color: item.color,
    fontWeight: 600,
  }}>
    {item.subtitle}
  </p>
)}

              </div>
            ))}
          </div>

          {/* TOTALS */}
          <div style={{
            display: "flex",
            gap: 20,
            flexWrap: "wrap",
            margin: "16px 0 22px",
            color: "#64748b",
            fontSize: 13,
          }}>
            <span>
              Total Transactions: <strong>{summary.totalTransactions || 0}</strong>
            </span>
            <span>
              Total Debit: <strong>{money(summary.totalDebit)}</strong>
            </span>
            <span>
              Total Credit: <strong>{money(summary.totalCredit)}</strong>
            </span>
            <span>
              Voided Payments: <strong>{money(summary.totalVoidedPayment)}</strong>
            </span>
          </div>

          {/* SUPPLIER WISE SUMMARY */}
          <h3 style={{ margin: "25px 0 12px" }}>
            Supplier-wise Summary
          </h3>

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>SUPPLIER</th>
                  <th>ADDRESS</th>
                  <th>MOBILE</th>
                  <th>TRANSACTIONS</th>
                  <th>TOTAL PURCHASE</th>
                  <th>TOTAL PAYMENT</th>
                  <th>PURCHASE RETURN</th>
                  <th>DEBIT</th>
                  <th>CREDIT</th>
                  <th>NET BALANCE</th>
                </tr>
              </thead>

              <tbody>
                {supplierSummary.map((s, index) => (
                  <tr key={s.supplierId || index}>
                    <td><strong>{s.supplierName}</strong></td>
                   <td>{s.address || "-"}</td>
                    <td>{s.mobile || "-"}</td>
                    <td>{s.transactionCount}</td>
                    <td>{money(s.totalPurchase)}</td>
                    <td style={{ color: "#16a34a" }}>
                      {money(s.totalPayment)}
                    </td>
                    <td>{money(s.totalPurchaseReturn)}</td>
                    <td>{money(s.totalDebit)}</td>
                    <td>{money(s.totalCredit)}</td>
                    <td
  style={{
    color:
      Number(s.totalDebit || 0) - Number(s.totalCredit || 0) > 0
        ? "#dc2626"
        : "#16a34a",
    fontWeight: 700,
  }}
>
  {money(
    Number(s.totalDebit || 0) - Number(s.totalCredit || 0)
  )}
  <small style={{ display: "block", fontWeight: 400 }}>
    {Number(s.totalDebit || 0) - Number(s.totalCredit || 0) > 0
      ? "Payable"
      : Number(s.totalDebit || 0) - Number(s.totalCredit || 0) < 0
      ? "Advance"
      : "Settled"}
  </small>
</td>
                  </tr>
                ))}
{supplierSummary.length > 0 && (
  <tr style={{ background: "#f1f5f9", fontWeight: 700 }}>
    <td colSpan="3">GRAND TOTAL</td>
    <td>{summary.totalTransactions || 0}</td>
    <td>{money(summary.totalPurchase)}</td>
    <td>{money(summary.totalPayment)}</td>
    <td>{money(summary.totalPurchaseReturn)}</td>
    <td>{money(summary.totalDebit)}</td>
    <td>{money(summary.totalCredit)}</td>
    <td>{money(netSupplierBalance)}</td>
  </tr>
)}
                {supplierSummary.length === 0 && (
                  <tr>
                    <td colSpan="8" style={{ textAlign: "center", padding: 20 }}>
                      No supplier records found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* ALL TRANSACTIONS */}
          <h3 style={{ margin: "28px 0 12px" }}>
            All Supplier Transactions
          </h3>

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>DATE</th>
                  <th>SUPPLIER</th>
                  <th>TYPE</th>
                  <th>LOT NUMBER</th>
                  <th>DESCRIPTION</th>
                  <th>METHOD</th>
                  <th>DEBIT</th>
                  <th>CREDIT</th>
                  <th>STATUS</th>
                </tr>
              </thead>

              <tbody>
                {reportTransactions.map((item) => (
                  <tr key={item._id}>
                    <td>
                      {item.transactionDate
                        ? new Date(item.transactionDate).toLocaleDateString("en-GB")
                        : "-"}
                    </td>
                    <td>
                      <strong>{item.supplierName || "Unknown Supplier"}</strong>
                    </td>
                    <td>{transactionLabel(item.type)}</td>
                    <td>{item.lotCode || "-"}</td>
                    <td>{item.description || item.reference || "-"}</td>
                    <td>{item.paymentMethod || "-"}</td>
                    <td>{money(item.debit)}</td>
                    <td>{money(item.credit)}</td>
                    <td>
                      {item.isVoided ? (
                        <span style={{ color: "#dc2626", fontWeight: 600 }}>
                          VOIDED
                        </span>
                      ) : (
                        <span style={{ color: "#16a34a" }}>
                          Active
                        </span>
                      )}
                    </td>
                  </tr>
                ))}

                {reportTransactions.length === 0 && (
                  <tr>
                    <td colSpan="10" style={{ textAlign: "center", padding: 20 }}>
                      No transactions found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {!allSupplierReportLoading && !report && (
        <div style={{
          textAlign: "center",
          padding: 35,
          color: "#64748b",
        }}>
          Apply filters to load the supplier report.
        </div>
      )}
    </div>
  );
}

function renderAllCustomerReport() {
  const report = allCustomerReport;
  const summary = report?.summary || {};
  const customerSummary = report?.customerSummary || [];
  const reportTransactions = report?.transactions || [];

 const netCustomerBalance = Number(
  summary.netCustomerBalance ??
  (
    Number(summary.totalOpeningBalance || 0) +
    Number(summary.totalDebit || 0) -
    Number(summary.totalCredit || 0)
  )
);

  const updateFilter = (key, value) => {
    setAllCustomerReportFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const clearFilters = () => {
    const emptyFilters = {
      startDate: "",
      endDate: "",
      customerId: "",
      type: "",
      paymentMethod: "",
      minAmount: "",
      maxAmount: "",
      search: "",
    };

    setAllCustomerReportFilters(emptyFilters);
    setCustomerReportSearch("");
    setShowCustomerReportCustomerOptions(false);
    loadAllCustomerReport(emptyFilters);
  };

  const selectedCustomer = customers.find(
    (c) => c._id === allCustomerReportFilters.customerId
  );

  const filteredCustomerOptions = customers
    .filter((c) => c.isActive !== false)
    .filter((c) =>
      (c.customerName || "")
        .toLowerCase()
        .includes(customerReportSearch.trim().toLowerCase())
    );

  const money = (value) =>
    `৳ ${Number(value || 0).toLocaleString("en-BD", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const transactionLabel = (type) => {
    const labels = {
      SALE: "Sale",
      SALE_RETURN: "Sale Return",
      PAYMENT: "Customer Payment",
      ADJUSTMENT: "Adjustment",
    };

    return labels[type] || type || "-";
  };

  const downloadAllCustomerReportCSV = () => {
    const escapeCSV = (value) =>
      `"${String(value ?? "").replace(/"/g, '""')}"`;

    const rows = [
      ["ALL CUSTOMER REPORT"],
      ["Report Generated", new Date().toLocaleString("en-BD")],
      [],
      ["CUSTOMER-WISE SUMMARY"],
      [
        "Customer",
        "Company",
        "Mobile",
        "Address",
        "Transactions",
        "Total Sales",
        "Total Payment",
        "Sales Return",
        "Debit",
        "Credit",
        "Net Balance",
      ],

      ...customerSummary.map((c) => [
        c.customerName,
        c.companyName,
        c.mobile,
        c.address,
        c.transactionCount,
        c.totalSales,
        c.totalPayment,
        c.totalSalesReturn,
        c.totalDebit,
        c.totalCredit,
        Number(c.totalDebit || 0) - Number(c.totalCredit || 0),
      ]),

      [
        "GRAND TOTAL",
        "",
        "",
        "",
        summary.totalTransactions || 0,
        summary.totalSales || 0,
        summary.totalPayment || 0,
        summary.totalSalesReturn || 0,
        summary.totalDebit || 0,
        summary.totalCredit || 0,
        netCustomerBalance,
      ],

      [],
      ["ALL CUSTOMER TRANSACTIONS"],
      [
        "Date",
        "Customer",
        "Type",
        "Transaction ID",
        "Description",
        "Payment Method",
        "Debit",
        "Credit",
        "Status",
      ],

      ...reportTransactions.map((item) => [
        item.transactionDate
          ? new Date(item.transactionDate).toLocaleDateString("en-GB")
          : "",
        item.customerName || "Unknown Customer",
        transactionLabel(item.type),
        item.transactionId || item.reference,
        item.description || item.reference,
        item.paymentMethod,
        item.debit,
        item.credit,
        item.isVoided ? "VOIDED" : "Active",
      ]),
    ];

    const csvContent =
      "\uFEFF" +
      rows.map((row) => row.map(escapeCSV).join(",")).join("\r\n");

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "all-customer-report.csv";
    link.click();

    URL.revokeObjectURL(url);
  };

  return (
    <div className="panel all-customer-report-print" style={{ padding: 22 }}>
      {/* HEADER */}
      <div
        style={{
          ...pageHeaderStyle,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <h2 style={{ margin: 0 }}>All Customer Report</h2>

          <p style={{ color: "#7b8494", margin: "6px 0 0" }}>
            All customers transaction summary and details
          </p>

          <p
            style={{
              color: "#64748b",
              fontSize: 12,
              margin: "5px 0 0",
            }}
          >
            Report Generated: {new Date().toLocaleString("en-BD")}
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            className="secondary-button"
            onClick={() => window.print()}
            disabled={!report}
          >
            <Printer size={17} /> Print / PDF
          </button>

          <button
            className="secondary-button"
            onClick={downloadAllCustomerReportCSV}
            disabled={!report || reportTransactions.length === 0}
          >
            <Download size={17} /> Export CSV
          </button>

          <button
            className="secondary-button"
            onClick={() => setActivePage("Customers")}
          >
            Back to Customers
          </button>
        </div>
      </div>

      {/* FILTER PANEL */}
      <div
        className="all-customer-report-filter"
        style={{
          marginTop: 20,
          padding: 18,
          border: "1px solid #e2e8f0",
          borderRadius: 12,
          background: "#f8fafc",
        }}
      >
        <h3 style={{ margin: "0 0 15px", fontSize: 16 }}>
          Report Filters
        </h3>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
            gap: 14,
          }}
        >
          {/* START DATE */}
          <div>
            <label style={fieldStyle}>Start Date</label>
            <input
              type="date"
              style={inputStyle}
              value={allCustomerReportFilters.startDate}
              onChange={(e) => updateFilter("startDate", e.target.value)}
            />
          </div>

          {/* END DATE */}
          <div>
            <label style={fieldStyle}>End Date</label>
            <input
              type="date"
              style={inputStyle}
              value={allCustomerReportFilters.endDate}
              onChange={(e) => updateFilter("endDate", e.target.value)}
            />
          </div>

          {/* SEARCHABLE CUSTOMER */}
          <div style={{ position: "relative" }}>
            <label style={fieldStyle}>Customer</label>

            <input
              style={inputStyle}
              placeholder="Search customer name..."
              value={
                showCustomerReportCustomerOptions
                  ? customerReportSearch
                  : selectedCustomer?.customerName || "All Customers"
              }
              onFocus={() => {
                setCustomerReportSearch("");
                setShowCustomerReportCustomerOptions(true);
              }}
              onChange={(e) => {
                setCustomerReportSearch(e.target.value);
                setShowCustomerReportCustomerOptions(true);
              }}
              onBlur={() => {
                setTimeout(() => {
                  setShowCustomerReportCustomerOptions(false);
                }, 150);
              }}
            />

            {showCustomerReportCustomerOptions && (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  right: 0,
                  zIndex: 100,
                  background: "#fff",
                  border: "1px solid #dce1e8",
                  borderRadius: 8,
                  maxHeight: 230,
                  overflowY: "auto",
                  boxShadow: "0 5px 15px rgba(0,0,0,0.10)",
                }}
              >
                <div
                  onMouseDown={() => {
                    updateFilter("customerId", "");
                    setCustomerReportSearch("");
                    setShowCustomerReportCustomerOptions(false);
                  }}
                  style={{
                    padding: "11px 12px",
                    cursor: "pointer",
                    borderBottom: "1px solid #eee",
                    fontSize: 14,
                    fontWeight: 600,
                  }}
                >
                  All Customers
                </div>

                {filteredCustomerOptions.map((c) => (
                  <div
                    key={c._id}
                    onMouseDown={() => {
                      updateFilter("customerId", c._id);
                      setCustomerReportSearch("");
                      setShowCustomerReportCustomerOptions(false);
                    }}
                    style={{
                      padding: "11px 12px",
                      cursor: "pointer",
                      borderBottom: "1px solid #f1f5f9",
                      fontSize: 14,
                    }}
                  >
                    {c.customerName}
                  </div>
                ))}

                {filteredCustomerOptions.length === 0 && (
                  <div
                    style={{
                      padding: 12,
                      color: "#64748b",
                      fontSize: 13,
                    }}
                  >
                    No customer found
                  </div>
                )}
              </div>
            )}
          </div>

          {/* TRANSACTION TYPE */}
          <div>
            <label style={fieldStyle}>Transaction Type</label>
            <select
              style={inputStyle}
              value={allCustomerReportFilters.type}
              onChange={(e) => updateFilter("type", e.target.value)}
            >
              <option value="">All Types</option>
              <option value="SALE">Sale</option>
              <option value="SALE_RETURN">Sale Return</option>
              <option value="PAYMENT">Customer Payment</option>
              <option value="ADJUSTMENT">Adjustment</option>
            </select>
          </div>

          {/* PAYMENT METHOD */}
          <div>
            <label style={fieldStyle}>Payment Method</label>
            <select
              style={inputStyle}
              value={allCustomerReportFilters.paymentMethod}
              onChange={(e) => updateFilter("paymentMethod", e.target.value)}
            >
              <option value="">All Methods</option>
              <option value="CASH">Cash</option>
              <option value="BANK">Bank</option>
              <option value="BKASH">bKash</option>
              <option value="NAGAD">Nagad</option>
              <option value="ROCKET">Rocket</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          {/* MINIMUM AMOUNT */}
          <div>
            <label style={fieldStyle}>Minimum Amount</label>
            <input
              type="number"
              min="0"
              style={inputStyle}
              placeholder="Minimum amount"
              value={allCustomerReportFilters.minAmount}
              onChange={(e) => updateFilter("minAmount", e.target.value)}
            />
          </div>

          {/* MAXIMUM AMOUNT */}
          <div>
            <label style={fieldStyle}>Maximum Amount</label>
            <input
              type="number"
              min="0"
              style={inputStyle}
              placeholder="Maximum amount"
              value={allCustomerReportFilters.maxAmount}
              onChange={(e) => updateFilter("maxAmount", e.target.value)}
            />
          </div>

          {/* GENERAL SEARCH */}
          <div>
            <label style={fieldStyle}>Search</label>
            <input
              style={inputStyle}
              placeholder="Customer / Transaction ID"
              value={allCustomerReportFilters.search}
              onChange={(e) => updateFilter("search", e.target.value)}
            />
          </div>
        </div>

        {/* FILTER BUTTONS */}
        <div
          style={{
            display: "flex",
            gap: 10,
            marginTop: 16,
            flexWrap: "wrap",
          }}
        >
          <button
            className="primary-button"
            disabled={allCustomerReportLoading}
            onClick={() => loadAllCustomerReport()}
          >
            {allCustomerReportLoading ? "Loading..." : "Apply Filter"}
          </button>

          <button
            className="secondary-button"
            onClick={clearFilters}
            disabled={allCustomerReportLoading}
          >
            Clear Filter
          </button>
        </div>
      </div>

      {/* LOADING */}
      {allCustomerReportLoading && (
        <p style={{ textAlign: "center", padding: 25 }}>
          Loading customer report...
        </p>
      )}

      {/* REPORT DATA */}
      {!allCustomerReportLoading && report && (
        <>
          {/* SUMMARY CARDS */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 14,
              marginTop: 20,
            }}
          >
            {[
              {
                title: "Total Customers",
                value: summary.customerCount || 0,
                color: "#2563eb",
              },
              {
                title: "Total Sales",
                value: money(summary.totalSales),
                color: "#2563eb",
              },
              {
                title: "Total Payment",
                value: money(summary.totalPayment),
                color: "#16a34a",
              },
              {
                title: "Net Customer Balance",
                value: money(Math.abs(netCustomerBalance)),
                subtitle:
                  netCustomerBalance > 0
                    ? "Receivable from Customers"
                    : netCustomerBalance < 0
                    ? "Customer Advance"
                    : "Fully Settled",
                color:
                  netCustomerBalance > 0 ? "#dc2626" : "#16a34a",
              },
              {
                title: "Sales Return",
                value: money(summary.totalSalesReturn),
                color: "#d97706",
              },
              {
                title: "Adjustment Debit",
                value: money(summary.totalAdjustmentDebit),
                color: "#64748b",
              },
              {
                title: "Adjustment Credit",
                value: money(summary.totalAdjustmentCredit),
                color: "#64748b",
              },
            ].map((item) => (
              <div
                key={item.title}
                style={{
                  padding: 17,
                  border: "1px solid #e2e8f0",
                  borderRadius: 10,
                  background: "#fff",
                }}
              >
                <p
                  style={{
                    margin: 0,
                    color: "#64748b",
                    fontSize: 13,
                  }}
                >
                  {item.title}
                </p>

                <h3
                  style={{
                    margin: "9px 0 0",
                    color: item.color,
                    fontSize: 19,
                  }}
                >
                  {item.value}
                </h3>

                {item.subtitle && (
                  <p
                    style={{
                      margin: "6px 0 0",
                      fontSize: 12,
                      color: item.color,
                      fontWeight: 600,
                    }}
                  >
                    {item.subtitle}
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* TOTALS */}
          <div
            style={{
              display: "flex",
              gap: 20,
              flexWrap: "wrap",
              margin: "16px 0 22px",
              color: "#64748b",
              fontSize: 13,
            }}
          >
            <span>
              Total Transactions:{" "}
              <strong>{summary.totalTransactions || 0}</strong>
            </span>

            <span>
              Total Debit: <strong>{money(summary.totalDebit)}</strong>
            </span>

            <span>
              Total Credit: <strong>{money(summary.totalCredit)}</strong>
            </span>

            <span>
              Voided Payments:{" "}
              <strong>{money(summary.totalVoidedPayment)}</strong>
            </span>
          </div>

          {/* CUSTOMER WISE SUMMARY */}
          <h3 style={{ margin: "25px 0 12px" }}>
            Customer-wise Summary
          </h3>

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>CUSTOMER</th>
                  <th>COMPANY</th>
                  <th>ADDRESS</th>
                  <th>MOBILE</th>
                  <th>TRANSACTIONS</th>
                  <th>TOTAL SALES</th>
                  <th>TOTAL PAYMENT</th>
                  <th>SALES RETURN</th>
                  <th>DEBIT</th>
                  <th>CREDIT</th>
                  <th>NET BALANCE</th>
                </tr>
              </thead>

              <tbody>
                {customerSummary.map((c, index) => {
                 const balance = Number(c.netBalance || 0);

                  return (
                    <tr key={c.customerId || index}>
                      <td>
                        <strong>{c.customerName}</strong>
                      </td>

                      <td>{c.companyName || "-"}</td>
                      <td>{c.address || "-"}</td>
                      <td>{c.mobile || "-"}</td>
                      <td>{c.transactionCount}</td>
                      <td>{money(c.totalSales)}</td>

                      <td style={{ color: "#16a34a" }}>
                        {money(c.totalPayment)}
                      </td>

                      <td>{money(c.totalSalesReturn)}</td>
                      <td>{money(c.totalDebit)}</td>
                      <td>{money(c.totalCredit)}</td>

                      <td
                        style={{
                          color:
                            balance > 0 ? "#dc2626" : "#16a34a",
                          fontWeight: 700,
                        }}
                      >
                        {money(balance)}

                        <small
                          style={{
                            display: "block",
                            fontWeight: 400,
                          }}
                        >
                          {balance > 0
                            ? "Receivable"
                            : balance < 0
                            ? "Advance"
                            : "Settled"}
                        </small>
                      </td>
                    </tr>
                  );
                })}

                {customerSummary.length > 0 && (
                  <tr
                    style={{
                      background: "#f1f5f9",
                      fontWeight: 700,
                    }}
                  >
                    <td colSpan="4">GRAND TOTAL</td>
                    <td>{summary.totalTransactions || 0}</td>
                    <td>{money(summary.totalSales)}</td>
                    <td>{money(summary.totalPayment)}</td>
                    <td>{money(summary.totalSalesReturn)}</td>
                    <td>{money(summary.totalDebit)}</td>
                    <td>{money(summary.totalCredit)}</td>
                    <td>{money(netCustomerBalance)}</td>
                  </tr>
                )}

                {customerSummary.length === 0 && (
                  <tr>
                    <td
                      colSpan="11"
                      style={{ textAlign: "center", padding: 20 }}
                    >
                      No customer records found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* ALL TRANSACTIONS */}
          <h3 style={{ margin: "28px 0 12px" }}>
            All Customer Transactions
          </h3>

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>DATE</th>
                  <th>CUSTOMER</th>
                  <th>TYPE</th>
                  <th>TRANSACTION ID</th>
                  <th>DESCRIPTION</th>
                  <th>METHOD</th>
                  <th>DEBIT</th>
                  <th>CREDIT</th>
                  <th>STATUS</th>
                </tr>
              </thead>

              <tbody>
                {reportTransactions.map((item) => (
                  <tr key={item._id}>
                    <td>
                      {item.transactionDate
                        ? new Date(
                            item.transactionDate
                          ).toLocaleDateString("en-GB")
                        : "-"}
                    </td>

                    <td>
                      <strong>
                        {item.customerName || "Unknown Customer"}
                      </strong>
                    </td>

                    <td>{transactionLabel(item.type)}</td>

                    <td>{item.transactionId || "-"}</td>

                    <td>
                      {item.description || item.reference || "-"}
                    </td>

                    <td>{item.paymentMethod || "-"}</td>
                    <td>{money(item.debit)}</td>
                    <td>{money(item.credit)}</td>

                    <td>
                      {item.isVoided ? (
                        <span
                          style={{
                            color: "#dc2626",
                            fontWeight: 600,
                          }}
                        >
                          VOIDED
                        </span>
                      ) : (
                        <span style={{ color: "#16a34a" }}>
                          Active
                        </span>
                      )}
                    </td>
                  </tr>
                ))}

                {reportTransactions.length === 0 && (
                  <tr>
                    <td
                      colSpan="9"
                      style={{ textAlign: "center", padding: 20 }}
                    >
                      No transactions found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {!allCustomerReportLoading && !report && (
        <div
          style={{
            textAlign: "center",
            padding: 35,
            color: "#64748b",
          }}
        >
          Apply filters to load the customer report.
        </div>
      )}
    </div>
  );
}

function renderSuppliers() {
  return (
    <div className="panel" style={{ padding: 22 }}>
      <div style={pageHeaderStyle}>
        <div>
          <h2 style={{ margin: 0 }}>Supplier List</h2>
          <p style={{ color: "#7b8494", margin: "6px 0 0" }}>
            Total Suppliers: {suppliers.length}
          </p>
        </div>

               <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            className="secondary-button"
            onClick={() => {
              setActivePage("Supplier Report");
              loadAllSupplierReport();
            }}
          >
            <BarChart3 size={18} /> All Supplier Report
          </button>

          <button
            className="primary-button"
            onClick={() => openSupplierForm()}
          >
            <Plus size={18} /> Add Supplier
          </button>
        </div>
      </div>

      <input
        style={{ ...inputStyle, maxWidth: 350, margin: "15px 0" }}
        placeholder="Search supplier name or mobile..."
        value={searchText}
        onChange={(e) => setSearchText(e.target.value)}
      />

      {loading ? (
        <p>Loading suppliers...</p>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>SUPPLIER NAME</th>
                <th>COMPANY</th>
                <th>MOBILE</th>
                <th>CONTACT PERSON</th>
                <th>OPENING BALANCE</th>
                <th>CURRENT BALANCE</th>
                <th>PAYMENT</th>
                <th>LEDGER</th>
                <th>STATEMENT</th>
                <th>ACTION</th>
              </tr>
            </thead>

            <tbody>
              {filteredSuppliers
                .filter((s) => s.isActive !== false)
                .map((s) => (
                  <tr key={s._id}>
                    <td>
                      <strong>{s.supplierName}</strong>
                    </td>

                    <td>{s.companyName || "-"}</td>
                    <td>{s.mobile || "-"}</td>
                    <td>{s.contactPerson || "-"}</td>

                    <td>
                      ৳ {Number(s.openingBalance || 0).toLocaleString("en-BD")}
                    </td>

                    <td>
                      <strong
                        style={{
                          color:
                            Number(s.currentBalance || 0) > 0
                              ? "#dc2626"
                              : Number(s.currentBalance || 0) < 0
                              ? "#16a34a"
                              : "#64748b",
                        }}
                      >
                        ৳ {Number(s.currentBalance || 0).toLocaleString("en-BD", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </strong>
                    </td>

                    <td>
                      <button
                        className="primary-button"
                        onClick={() => openSupplierPayment(s)}
                        style={{
                          padding: "7px 12px",
                          fontSize: 12,
                        }}
                      >
                        Payment
                      </button>
                    </td>

                    <td>
                      <button
                        className="secondary-button"
                        onClick={() => loadSupplierLedger(s)}
                        style={{
                          padding: "7px 12px",
                          fontSize: 12,
                        }}
                      >
                        Ledger
                      </button>
                    </td>

<td>
  <button
    className="secondary-button"
    onClick={() => {
      setStatementStartDate("");
      setStatementEndDate("");
      loadSupplierStatement(s, "", "");
    }}
    style={{
      padding: "7px 12px",
      fontSize: 12,
    }}
  >
    Statement
  </button>
</td>

                    <td>
                      <button
                        style={actionButtonStyle}
                        onClick={() => openSupplierForm(s)}
                        title="Edit"
                      >
                        <Edit size={16} />
                      </button>

                      <button
                        style={actionButtonStyle}
                        onClick={() => deactivateSupplier(s)}
                        title="Deactivate"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}

              {filteredSuppliers.filter(
                (s) => s.isActive !== false
              ).length === 0 && (
                <tr>
                  <td
                    colSpan="10"
                    style={{
                      textAlign: "center",
                      padding: 25,
                    }}
                  >
                    No suppliers found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function renderCustomers() {
  const activeCustomerList = customers.filter(
    (c) => c.isActive !== false
  );

  const totalCustomerDue = activeCustomerList.reduce(
    (total, c) => {
      const balance = Number(c.currentBalance || 0);
      return total + (balance > 0 ? balance : 0);
    },
    0
  );

  const zeroDueCustomers = activeCustomerList.filter(
    (c) => Number(c.currentBalance || 0) === 0
  ).length;

  return (
    <div className="panel" style={{ padding: 22 }}>
      <div style={pageHeaderStyle}>
        <div>
          <h2 style={{ margin: 0 }}>Customer List</h2>
          <p style={{ color: "#7b8494", margin: "6px 0 0" }}>
            Total Customers: {customers.length}
          </p>
        </div>

    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
  <button
    className="secondary-button"
    onClick={() => {
      loadAllCustomerReport();
      setActivePage("All Customer Report");
    }}
  >
     <FileText size={18} /> All Customer Report
  </button>

  <button
    className="primary-button"
    onClick={() => openCustomerForm()}
  >
    <Plus size={18} /> Add Customer
  </button>
</div>
      </div>
      {/* CUSTOMER SUMMARY */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 14,
          margin: "20px 0",
        }}
      >
        <div style={{
          background: "#eff6ff",
          padding: 18,
          borderRadius: 10,
          border: "1px solid #bfdbfe",
        }}>
          <p style={{ margin: 0, color: "#1d4ed8" }}>Total Customers</p>
          <h2 style={{ margin: "8px 0 0", color: "#1e40af" }}>
            {activeCustomerList.length}
          </h2>
        </div>

        <div style={{
          background: "#fef2f2",
          padding: 18,
          borderRadius: 10,
          border: "1px solid #fecaca",
        }}>
          <p style={{ margin: 0, color: "#dc2626" }}>Total Customer Due</p>
          <h2 style={{ margin: "8px 0 0", color: "#b91c1c" }}>
            ৳ {totalCustomerDue.toLocaleString("en-BD", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </h2>
        </div>

        <div style={{
          background: "#f0fdf4",
          padding: 18,
          borderRadius: 10,
          border: "1px solid #bbf7d0",
        }}>
          <p style={{ margin: 0, color: "#15803d" }}>Zero Due Customers</p>
          <h2 style={{ margin: "8px 0 0", color: "#166534" }}>
            {zeroDueCustomers}
          </h2>
        </div>
      </div>
      <input
        style={{ ...inputStyle, maxWidth: 350, margin: "15px 0" }}
        placeholder="Search customer name or mobile..."
        value={customerSearch}
        onChange={(e) => setCustomerSearch(e.target.value)}
      />

      {customerLoading ? (
        <p>Loading customers...</p>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>CUSTOMER NAME</th>
                <th>COMPANY</th>
                <th>MOBILE</th>
                <th>CONTACT PERSON</th>
                <th>CUSTOMER TYPE</th>
                <th>OPENING BALANCE</th>
                <th>CURRENT BALANCE</th>
                <th>PAYMENT</th>
                <th>LEDGER</th>
                <th>STATEMENT</th>
                <th>ACTION</th>
              </tr>
            </thead>

            <tbody>
              {filteredCustomers
                .filter((c) => c.isActive !== false)
                .map((c) => (
                  <tr key={c._id}>
                    <td><strong>{c.customerName}</strong></td>
                    <td>{c.companyName || "-"}</td>
                    <td>{c.mobile || "-"}</td>
                    <td>{c.contactPerson || "-"}</td>
                    <td>{c.customerType || "REGULAR"}</td>

                    <td>
                      ৳ {Number(c.openingBalance || 0).toLocaleString("en-BD")}
                    </td>

                    <td>
                      <strong
                        style={{
                          color:
                            Number(c.currentBalance || 0) > 0
                              ? "#dc2626"
                              : Number(c.currentBalance || 0) < 0
                              ? "#16a34a"
                              : "#64748b",
                        }}
                      >
                        ৳ {Number(c.currentBalance || 0).toLocaleString(
                          "en-BD",
                          {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          }
                        )}
                      </strong>
                    </td>

                    <td>
                      <button
                        className="primary-button"
                        onClick={() => openCustomerPayment(c)}
                        style={{ padding: "7px 12px", fontSize: 12 }}
                      >
                        Payment
                      </button>
                    </td>

                    <td>
                      <button
                        className="secondary-button"
                        onClick={() => loadCustomerLedger(c)}
                        style={{ padding: "7px 12px", fontSize: 12 }}
                      >
                        Ledger
                      </button>
                    </td>

                    <td>
                      <button
                        className="secondary-button"
                        onClick={() => loadCustomerStatement(c, "", "")}
                        style={{ padding: "7px 12px", fontSize: 12 }}
                      >
                        Statement
                      </button>
                    </td>

                    <td>
                      <button
                        style={actionButtonStyle}
                        onClick={() => openCustomerForm(c)}
                        title="Edit"
                      >
                        <Edit size={16} />
                      </button>

                      <button
                        style={actionButtonStyle}
                        onClick={() => deactivateCustomer(c)}
                        title="Deactivate"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}

              {filteredCustomers.filter(
                (c) => c.isActive !== false
              ).length === 0 && (
                <tr>
                  <td
                    colSpan="11"
                    style={{ textAlign: "center", padding: 25 }}
                  >
                    No customers found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
// ========================================
// CUSTOMER DUE SUMMARY
// ========================================

function renderCustomerDueSummary() {
  const formatMoney = (amount) =>
    Number(amount || 0).toLocaleString("en-BD", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const handleSearch = () => {
    loadCustomerDueSummary({
      startDate: dueStartDate,
      endDate: dueEndDate,
      search: dueCustomerSearch,
      address: dueCustomerAddress,
    });
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");

    if (!printWindow) {
      toast.error("Please allow popups to print");
      return;
    }

    const rows = dueSummaryCustomers.map((c, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${c.customerName || "-"}</td>
        <td>${c.companyName || "-"}</td>
        <td>${c.mobile || "-"}</td>
        <td>${c.address || "-"}</td>
        <td style="text-align:right">
          ${formatMoney(c.openingDueAtStart)}
        </td>
        <td style="text-align:right">
          ${formatMoney(c.currentBalance)}
        </td>
      </tr>
    `).join("");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Customer Due Summary</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 20px;
          }
          h2 { text-align: center; }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
          }
          th, td {
            border: 1px solid #999;
            padding: 8px;
            font-size: 12px;
          }
          th { background: #eee; }
          .total {
            margin-top: 15px;
            text-align: right;
            font-weight: bold;
          }
        </style>
      </head>
      <body>
        <h2>Customer Due Summary</h2>
        <p>
          Period: ${dueStartDate || "Beginning"} -
          ${dueEndDate || "Today"}
        </p>
        <table>
          <thead>
            <tr>
              <th>SL</th>
              <th>Customer</th>
              <th>Company</th>
              <th>Mobile</th>
              <th>Address</th>
              <th>Opening Due</th>
              <th>Closing Due</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <div class="total">
          Total Due Customers: ${dueSummary.totalDueCustomers || 0}
          <br />
          Total Customer Due: ৳ ${formatMoney(dueSummary.totalDueAmount)}
        </div>
        <script>
          window.onload = function() {
            window.print();
            window.onafterprint = function() {
              window.close();
            };
          };
        </script>
      </body>
      </html>
    `);

    printWindow.document.close();
  };

  return (
    <div className="panel" style={{ padding: 22 }}>
      <div style={pageHeaderStyle}>
        <div>
          <h2 style={{ margin: 0 }}>Customer Due Summary</h2>
          <p style={{ color: "#7b8494", margin: "6px 0 0" }}>
            Customers with outstanding balance
          </p>
        </div>

        <button
          className="secondary-button"
          onClick={handlePrint}
        >
          <FileText size={18} /> Print
        </button>
      </div>

      {/* SUMMARY CARDS */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 14,
          margin: "20px 0",
        }}
      >
        <div style={{
          background: "#eff6ff",
          padding: 18,
          borderRadius: 10,
          border: "1px solid #bfdbfe",
        }}>
          <p style={{ margin: 0, color: "#1d4ed8" }}>
            Total Due Customers
          </p>
          <h2 style={{ margin: "8px 0 0", color: "#1e40af" }}>
            {dueSummary.totalDueCustomers || 0}
          </h2>
        </div>

        <div style={{
          background: "#fef2f2",
          padding: 18,
          borderRadius: 10,
          border: "1px solid #fecaca",
        }}>
          <p style={{ margin: 0, color: "#dc2626" }}>
            Total Customer Due
          </p>
          <h2 style={{ margin: "8px 0 0", color: "#b91c1c" }}>
            ৳ {formatMoney(dueSummary.totalDueAmount)}
          </h2>
        </div>
      </div>

      {/* FILTERS */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 12,
          margin: "20px 0",
          alignItems: "end",
        }}
      >
        <div>
          <label>Start Date</label>
          <input
            type="date"
            style={inputStyle}
            value={dueStartDate}
            onChange={(e) => setDueStartDate(e.target.value)}
          />
        </div>

        <div>
          <label>End Date</label>
          <input
            type="date"
            style={inputStyle}
            value={dueEndDate}
            onChange={(e) => setDueEndDate(e.target.value)}
          />
        </div>

        <div>
          <label>Customer Name / Mobile</label>
          <input
            style={inputStyle}
            placeholder="Search customer..."
            value={dueCustomerSearch}
            onChange={(e) => setDueCustomerSearch(e.target.value)}
          />
        </div>

        <div>
          <label>Customer Address</label>
          <input
            style={inputStyle}
            placeholder="Search address..."
            value={dueCustomerAddress}
            onChange={(e) => setDueCustomerAddress(e.target.value)}
          />
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            className="primary-button"
            onClick={handleSearch}
          >
            Search
          </button>

          <button
            className="secondary-button"
            onClick={() => {
              setDueStartDate("");
              setDueEndDate("");
              setDueCustomerSearch("");
              setDueCustomerAddress("");

              loadCustomerDueSummary({});
            }}
          >
            Reset
          </button>
        </div>
      </div>

      {/* CUSTOMER TABLE */}
      {dueSummaryLoading ? (
        <p>Loading customer due summary...</p>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>CUSTOMER NAME</th>
                <th>COMPANY</th>
                <th>MOBILE</th>
                <th>ADDRESS</th>
                <th>OPENING DUE</th>
                <th>CURRENT DUE</th>
                <th>POCKET LIST</th>
                <th>PAYMENT</th>
           
              </tr>
            </thead>

            <tbody>
              {dueSummaryCustomers.map((c) => (
                <tr key={c._id}>
                  <td>
                    <strong>{c.customerName}</strong>
                  </td>

                  <td>{c.companyName || "-"}</td>
                  <td>{c.mobile || "-"}</td>
                  <td>{c.address || "-"}</td>

                  <td>
                    ৳ {formatMoney(c.openingDueAtStart)}
                  </td>

                  <td>
                    <strong style={{ color: "#dc2626" }}>
                      ৳ {formatMoney(c.currentBalance)}
                    </strong>
                  </td>

                  <td>
                    <button
                      className="secondary-button"
                      onClick={() => loadCustomerLedger(c)}
                      style={{ padding: "7px 12px", fontSize: 12 }}
                    >
                      Ladger
                    </button>
                  </td>

                  <td>
                    <button
                      className="primary-button"
                      onClick={() => openCustomerPayment(c)}
                      style={{ padding: "7px 12px", fontSize: 12 }}
                    >
                      Payment
                    </button>
                  </td>

                  
                </tr>
              ))}

              {dueSummaryCustomers.length === 0 && (
                <tr>
                  <td
                    colSpan="8"
                    style={{ textAlign: "center", padding: 25 }}
                  >
                    No customers with outstanding due found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
function renderProductModal() {
  return (
    <div style={modalOverlayStyle}>
      <div style={modalStyle}>
        <div style={modalHeaderStyle}>
          <h2 style={{ margin: 0 }}>
            {editingId ? "Edit Product" : "Add New Product"}
          </h2>

          <button
            style={closeButtonStyle}
            onClick={() => setShowForm(false)}
          >
            <X />
          </button>
        </div>

        <form onSubmit={saveProduct}>
          <div style={formGridStyle}>

            {/* Product Name */}
            <Field label="Product Name *">
              <input
                style={inputStyle}
                required
                value={productForm.productName}
                onChange={(e) =>
                  setProductForm({
                    ...productForm,
                    productName: e.target.value,
                    category: "",
                    subcategory: "",
                  })
                }
                placeholder="Example: Onion"
              />
            </Field>

            {/* Category Dropdown */}
            <Field label="Category *">
              <select
                style={inputStyle}
                required
                value={productForm.category}
                onChange={(e) =>
                  setProductForm({
                    ...productForm,
                    category: e.target.value,
                    subcategory: "",
                  })
                }
              >
                <option value="">Select Category</option>

                {categories
                  .filter(
                    (cat) =>
                      cat.isActive !== false &&
                      cat.productName.trim().toLowerCase() ===
                        productForm.productName.trim().toLowerCase()
                  )
                  .map((cat) => (
                    <option key={cat._id} value={cat.categoryName}>
                      {cat.categoryName}
                    </option>
                  ))}
              </select>
            </Field>

            {/* Subcategory Dropdown */}
            <Field label="Subcategory">
              <select
                style={inputStyle}
                value={productForm.subcategory}
                disabled={!productForm.category}
                onChange={(e) =>
                  setProductForm({
                    ...productForm,
                    subcategory: e.target.value,
                  })
                }
              >
                <option value="">Select Subcategory</option>

                {categories
                  .filter(
                    (cat) =>
                      cat.isActive !== false &&
                      cat.productName.trim().toLowerCase() ===
                        productForm.productName.trim().toLowerCase() &&
                      cat.categoryName === productForm.category
                  )
                  .flatMap((cat) =>
                    (cat.subcategories || [])
                      .filter((sub) => sub.isActive)
                      .map((sub) => (
                        <option key={sub._id} value={sub.name}>
                          {sub.name}
                        </option>
                      ))
                  )}
              </select>
            </Field>

            {/* Brand */}
            <Field label="Brand">
              <input
                style={inputStyle}
                value={productForm.brand}
                onChange={(e) =>
                  setProductForm({
                    ...productForm,
                    brand: e.target.value,
                  })
                }
              />
            </Field>

            {/* Stock Type */}
            <Field label="Stock Type">
              <select
                style={inputStyle}
                value={productForm.stockType}
                onChange={(e) =>
                  setProductForm({
                    ...productForm,
                    stockType: e.target.value,
                  })
                }
              >
                <option value="OWN">Own Stock</option>
                <option value="COMMISSION">Commission Stock</option>
              </select>
            </Field>

            {/* Supplier */}
            <Field label="Supplier">
              <select
                style={inputStyle}
                value={productForm.supplier}
                onChange={(e) =>
                  setProductForm({
                    ...productForm,
                    supplier: e.target.value,
                  })
                }
              >
                <option value="">No Supplier Selected</option>

                {suppliers
                  .filter((s) => s.isActive !== false)
                  .map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.supplierName}
                    </option>
                  ))}
              </select>
            </Field>

            {/* Packing Type */}
            <Field label="Packing Type">
              <select
                style={inputStyle}
                value={productForm.packingType}
                onChange={(e) =>
                  setProductForm({
                    ...productForm,
                    packingType: e.target.value,
                  })
                }
              >
                <option value="BAG">Bag</option>
                <option value="LOOSE">Loose</option>
                <option value="BOX">Box</option>
                <option value="OTHER">Other</option>
              </select>
            </Field>

            {/* Unit */}
            <Field label="Unit">
              <select
                style={inputStyle}
                value={productForm.unit}
                onChange={(e) =>
                  setProductForm({
                    ...productForm,
                    unit: e.target.value,
                  })
                }
              >
                <option value="KG">KG</option>
                <option value="GRAM">Gram</option>
                <option value="TON">Ton</option>
                <option value="PCS">Pieces</option>
              </select>
            </Field>

            {/* Minimum Stock */}
            <Field label="Minimum Stock (KG)">
              <input
                style={inputStyle}
                type="number"
                min="0"
                step="0.01"
                value={productForm.minimumStockKg}
                onChange={(e) =>
                  setProductForm({
                    ...productForm,
                    minimumStockKg: e.target.value,
                  })
                }
              />
            </Field>

          </div>

          {/* Description */}
          <Field label="Description">
            <textarea
              style={{ ...inputStyle, minHeight: 75 }}
              value={productForm.description}
              onChange={(e) =>
                setProductForm({
                  ...productForm,
                  description: e.target.value,
                })
              }
            />
          </Field>

          <p style={{ fontSize: 12, color: "#7b8494" }}>
            SKU স্বয়ংক্রিয়ভাবে তৈরি হবে। ক্রয়মূল্য Lot Entry-তে এবং বিক্রয়মূল্য Sales Entry-তে নির্ধারণ করা হবে। বস্তার নির্দিষ্ট ওজন দিতে হবে না।
          </p>

          <div style={modalFooterStyle}>
            <button
              type="button"
              className="date-button"
              onClick={() => setShowForm(false)}
            >
              Cancel
            </button>

            <button type="submit" className="primary-button">
              {editingId ? "Update Product" : "Save Product"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function renderSupplierModal() {
    return (
      <div style={modalOverlayStyle}>
        <div style={modalStyle}>
          <div style={modalHeaderStyle}>
            <h2 style={{ margin: 0 }}>{editingId ? "Edit Supplier" : "Add New Supplier"}</h2>
            <button style={closeButtonStyle} onClick={() => setShowForm(false)}><X /></button>
          </div>

          <form onSubmit={saveSupplier}>
            <div style={formGridStyle}>
              <Field label="Supplier Name *">
                <input style={inputStyle} required value={supplierForm.supplierName}
                  onChange={(e) => setSupplierForm({ ...supplierForm, supplierName: e.target.value })} />
              </Field>
              <Field label="Company Name">
                <input style={inputStyle} value={supplierForm.companyName}
                  onChange={(e) => setSupplierForm({ ...supplierForm, companyName: e.target.value })} />
              </Field>
              <Field label="Contact Person">
                <input style={inputStyle} value={supplierForm.contactPerson}
                  onChange={(e) => setSupplierForm({ ...supplierForm, contactPerson: e.target.value })} />
              </Field>
              <Field label="Mobile">
                <input style={inputStyle} value={supplierForm.mobile}
                  onChange={(e) => setSupplierForm({ ...supplierForm, mobile: e.target.value })} />
              </Field>
              <Field label="Alternate Mobile">
                <input style={inputStyle} value={supplierForm.alternateMobile}
                  onChange={(e) => setSupplierForm({ ...supplierForm, alternateMobile: e.target.value })} />
              </Field>
              <Field label="Opening Balance (৳)">
                <input style={inputStyle} type="number" step="0.01"
                  value={supplierForm.openingBalance}
                  onChange={(e) => setSupplierForm({ ...supplierForm, openingBalance: e.target.value })} />
              </Field>
            </div>

            <Field label="Address">
              <textarea style={{ ...inputStyle, minHeight: 70 }} value={supplierForm.address}
                onChange={(e) => setSupplierForm({ ...supplierForm, address: e.target.value })} />
            </Field>
            <Field label="Notes">
              <textarea style={{ ...inputStyle, minHeight: 70 }} value={supplierForm.notes}
                onChange={(e) => setSupplierForm({ ...supplierForm, notes: e.target.value })} />
            </Field>

            <div style={modalFooterStyle}>
              <button type="button" className="date-button" onClick={() => setShowForm(false)}>Cancel</button>
              <button type="submit" className="primary-button">{editingId ? "Update Supplier" : "Save Supplier"}</button>
            </div>
          </form>
        </div>
      </div>
    );
  }

function renderCustomerModal() {
  return (
    <div style={modalOverlayStyle}>
      <div style={modalStyle}>
        <div style={modalHeaderStyle}>
          <h2 style={{ margin: 0 }}>
            {editingCustomerId ? "Edit Customer" : "Add New Customer"}
          </h2>

          <button
            style={closeButtonStyle}
            onClick={() => setShowCustomerForm(false)}
          >
            <X />
          </button>
        </div>

        <form onSubmit={saveCustomer}>
          <div style={formGridStyle}>
            <Field label="Customer Name *">
              <input
                style={inputStyle}
                required
                value={customerForm.customerName}
                onChange={(e) =>
                  setCustomerForm({
                    ...customerForm,
                    customerName: e.target.value,
                  })
                }
              />
            </Field>

            <Field label="Company Name">
              <input
                style={inputStyle}
                value={customerForm.companyName}
                onChange={(e) =>
                  setCustomerForm({
                    ...customerForm,
                    companyName: e.target.value,
                  })
                }
              />
            </Field>

            <Field label="Contact Person">
              <input
                style={inputStyle}
                value={customerForm.contactPerson}
                onChange={(e) =>
                  setCustomerForm({
                    ...customerForm,
                    contactPerson: e.target.value,
                  })
                }
              />
            </Field>

            <Field label="Mobile">
              <input
                style={inputStyle}
                value={customerForm.mobile}
                onChange={(e) =>
                  setCustomerForm({
                    ...customerForm,
                    mobile: e.target.value,
                  })
                }
              />
            </Field>

            <Field label="Alternate Mobile">
              <input
                style={inputStyle}
                value={customerForm.alternateMobile}
                onChange={(e) =>
                  setCustomerForm({
                    ...customerForm,
                    alternateMobile: e.target.value,
                  })
                }
              />
            </Field>

            <Field label="Customer Type">
              <select
                style={inputStyle}
                value={customerForm.customerType}
                onChange={(e) =>
                  setCustomerForm({
                    ...customerForm,
                    customerType: e.target.value,
                  })
                }
              >
                <option value="REGULAR">Regular</option>
                <option value="WHOLESALE">Wholesale</option>
                <option value="RETAIL">Retail</option>
              </select>
            </Field>

            <Field label="Opening Balance (৳)">
              <input
                style={inputStyle}
                type="number"
                step="0.01"
                value={customerForm.openingBalance}
                onChange={(e) =>
                  setCustomerForm({
                    ...customerForm,
                    openingBalance: e.target.value,
                  })
                }
              />
            </Field>
          </div>

          <Field label="Address">
            <textarea
              style={{ ...inputStyle, minHeight: 70 }}
              value={customerForm.address}
              onChange={(e) =>
                setCustomerForm({
                  ...customerForm,
                  address: e.target.value,
                })
              }
            />
          </Field>

          <Field label="Notes">
            <textarea
              style={{ ...inputStyle, minHeight: 70 }}
              value={customerForm.notes}
              onChange={(e) =>
                setCustomerForm({
                  ...customerForm,
                  notes: e.target.value,
                })
              }
            />
          </Field>

          <div style={modalFooterStyle}>
            <button
              type="button"
              className="date-button"
              onClick={() => setShowCustomerForm(false)}
            >
              Cancel
            </button>

            <button type="submit" className="primary-button">
              {editingCustomerId ? "Update Customer" : "Save Customer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}



if (authChecking) {
  return <div>Checking Admin Login...</div>;
}

if (!adminUser) {
  return (
    <AdminLogin
      apiRequest={apiRequest}
      onLogin={setAdminUser}
    />
  );
}


// ADMIN LOGOUT
async function handleAdminLogout() {
  try {
    await apiRequest("/auth/logout", {
      method: "POST",
    });

    setAdminUser(null);
  } catch (error) {
    alert(error.message || "Logout করা যায়নি");
  }
}


  return (
    <div className="erp-app">
      <Toaster position="top-right" />

      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-logo">M</div>
          <div className="brand-text">
            <h2>Makkah Traders</h2>
            <span>Sale Management System</span>
          </div>
          <button className="mobile-close" onClick={() => setSidebarOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <div className="company-switch">
          <div className="company-avatar">B</div>
          <div className="company-info">
            <strong>My Business</strong>
            <span>Business Owner</span>
          </div>
          <ChevronDown size={17} />
        </div>

        <nav className="navigation">
       {navigation.map((group) => (
  <div className="nav-group" key={group.title}>
    <p className="nav-heading">{group.title}</p>

    {group.items.map((item) => {
      const Icon = item.icon;
      const hasChildren = Array.isArray(item.children);
      const isExpanded = expandedMenus[item.label] || false;

      return (
        <div key={item.label}>
          <button
            className={`nav-item ${
              activePage === item.label ||
              (hasChildren &&
                item.children.some(
                  (child) => child.label === activePage
                ))
                ? "active"
                : ""
            }`}
           onClick={() => {
  if (hasChildren) {
    setExpandedMenus((prev) =>
      prev[item.label] ? {} : { [item.label]: true }
    );
    return;
  }

  setExpandedMenus({});
  setActivePage(item.label);
  setSearchText("");
  setShowForm(false);
  setSidebarOpen(false);
}}
          >
            <Icon size={19} />

            <span>{item.label}</span>

            {item.label === "Products" && (
              <span className="nav-count">{products.length}</span>
            )}

            {hasChildren && (
              <span
                style={{
                  marginLeft: "auto",
                  fontSize: 12,
                  transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 0.2s ease",
                }}
              >
                ▼
              </span>
            )}
          </button>

      {hasChildren && (
  <div
    className={`submenu-container ${isExpanded ? "submenu-open" : ""}`}
    style={{
      marginLeft: 18,
      paddingLeft: 12,
      borderLeft: "2px solid var(--border-color, #e5e7eb)",
    }}
  >
    {isExpanded && item.children.map((child) => {
      const ChildIcon = child.icon;

      return (
        <button
          key={child.label}
          className={`nav-item ${
            activePage === child.label ? "active" : ""
          }`}
          style={{
            fontSize: 13,
            paddingLeft: 10,
          }}
          onClick={() => {
            setExpandedMenus({});
            setActivePage(child.label);
            setSearchText("");
            setShowForm(false);
            setSidebarOpen(false);
          }}
        >
          <ChildIcon size={17} />
          <span>{child.label}</span>
        </button>
      );
    })}
  </div>
)}
        </div>
      );
    })}
  </div>
))}
        </nav>

        <div className="sidebar-bottom">
          <div className="help-card">
            <div className="help-icon">?</div>
            <strong>Need Help?</strong>
            <p>Contact our support team anytime.</p>
            <button>Get Support</button>
          </div>
        
<button
  className="nav-item logout"
  onClick={handleAdminLogout}
>
  <LogOut size={19} />
  <span>Sign Out</span>
</button>

        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="topbar-left">
            <button className="menu-toggle" onClick={() => setSidebarOpen(true)}>
              <Menu size={22} />
            </button>
            <div>
              <h1>{activePage}</h1>
              <p>{pageDescription[activePage] || "Manage your business."}</p>
            </div>
          </div>

          <div className="topbar-right">
            <div className="search-box">
              <Search size={18} />
              <input placeholder="Search anything..." />
              <kbd>⌘ K</kbd>
            </div>
            <button className="icon-button notification">
              <Bell size={20} /><span />
            </button>
            <div className="profile">
              <div className="profile-avatar">A</div>
              <div className="profile-info">
                <strong>Admin User</strong>
                <span>Super Admin</span>
              </div>
              <ChevronDown size={16} />
            </div>
          </div>
        </header>

       


<div key={activePage} className="dashboard-content page-transition">
  {activePage === "Dashboard" && renderDashboard()}
  {activePage === "Inventory Dashboard" && renderInventoryDashboard()}
  {activePage === "Products" && renderProducts()}
  {activePage === "Suppliers" && renderSuppliers()}
  {activePage === "Customer List" && renderCustomers()}
  {activePage === "Customer Due Summary" &&
    renderCustomerDueSummary()}
  {activePage === "Supplier Report" && renderAllSupplierReport()}
  {activePage === "All Customer Report" && renderAllCustomerReport()}
  {activePage === "Categories" && renderCategories()}

  {[
    "Sales",
    "Sales Dashboard",
    "New Sales Invoice",
    "Sales Invoice History",
    "Sales Return",
    "Sales Collection",
    "Customer Payment",

    "Daily Sales Summary",
    "Weekly Sales Summary",
    "Monthly Sales Summary",
    "Yearly Sales Summary",

    "Lot Wise Sales",
    "Product Wise Sales",
    "Category Wise Sales",
    "Supplier Wise Sales",
    "OWN Profit / Loss",
  ].includes(activePage) && renderSales()}

  {activePage === "Purchases" && renderPurchases()}
  {activePage === "Stock In" && renderPurchases()}
{/* INVENTORY MODULE */}
{[
  "Inventory Dashboard",
  "Stock In",
  "Stock Out",
  "Stock Transfer",
  "Stock Adjustment",
  "Stock Return",
  "Stock Transaction History",
  "Current Stock Report",
  "Warehouse Wise Stock",
  "Stock Movement Report",
  "Low Stock Report",
  "Stock Valuation",
].includes(activePage) && (
  <div className="panel" style={{ padding: 30 }}>
    <h2>{activePage}</h2>
    <p>Inventory Module তৈরি করা হচ্ছে।</p>
  </div>
)}

  {activePage === "Commission Management" &&
    renderCommissionManagement()}
  {activePage === "Commission History" && renderCommissionHistory()}
  {activePage === "Commission Reports" && renderCommissionReports()}
  {activePage === "Activity Log" && renderActivityLog()}

  {![
    "Dashboard",
    "Products",
    "Suppliers",
    "Customer List",
    "Customer Due Summary",
    "Supplier Report",
    "All Customer Report",
    "Categories",
    "Purchases",
    "Commission Management",
    "Commission History",
    "Commission Reports",
    "Activity Log",

    "Sales",
    "Sales Dashboard",
    "New Sales Invoice",
    "Sales Invoice History",
    "Sales Return",
    "Sales Collection",
    "Customer Payment",

    "Daily Sales Summary",
    "Weekly Sales Summary",
    "Monthly Sales Summary",
    "Yearly Sales Summary",

    "Lot Wise Sales",
    "Product Wise Sales",
    "Category Wise Sales",
    "Supplier Wise Sales",
    "OWN Profit / Loss",
  ].includes(activePage) && (
    <div className="panel" style={{ padding: 30 }}>
      <h2>{activePage}</h2>
      <p>এই Module পরবর্তী ধাপে তৈরি করব।</p>
    </div>
  )}

  <footer className="footer">
    <span>© 2026 Business ERP. All rights reserved.</span>
    <span>Version 1.0.0</span>
  </footer>
</div>



      </main>

      {showForm && activePage === "Products" && renderProductModal()}
     
      {showForm && activePage === "Suppliers" && renderSupplierModal()}
{showCustomerForm &&
  (activePage === "Customer List" ||
    activePage === "Customer Due Summary") &&
  renderCustomerModal()}
      {showPaymentForm && renderSupplierPaymentModal()}
{showCustomerPaymentForm &&
  (activePage === "Customer List" ||
    activePage === "Customer Due Summary") &&
  renderCustomerPaymentModal()}
{showSupplierLedger && renderSupplierLedgerModal()}
{showCustomerLedger && renderCustomerLedgerModal()}
{showPaymentEdit && renderPaymentEditModal()}
{showPaymentVoid && renderPaymentVoidModal()}


{showCustomerPaymentEdit &&
  renderCustomerPaymentEditModal()}

{showCustomerPaymentVoid &&
  renderCustomerPaymentVoidModal()}
{showReturnForm && renderPurchaseReturnModal()}
{showLotEditForm && renderLotEditModal()}
{showEditHistory && renderEditHistoryModal()}
{showSupplierStatement && renderSupplierStatementModal()}
{showCustomerStatement && renderCustomerStatementModal()}
{showPaymentHistory && renderPaymentHistoryModal()}

    </div>
  );
}

function Field({ label, children }) {
  return (
    <label style={fieldStyle}>
      <span style={{ fontSize: 13, fontWeight: 600, color: "#465064" }}>{label}</span>
      {children}
    </label>
  );
}

const pageHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
};

const actionButtonStyle = {
  border: "1px solid #e1e5eb",
  background: "#fff",
  borderRadius: 6,
  padding: 7,
  marginRight: 5,
  cursor: "pointer",
  color: "#526071",
};

const modalOverlayStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(20, 28, 40, 0.55)",
  zIndex: 1000,
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  padding: 15,
};

const modalStyle = {
  background: "#fff",
  width: "100%",
  maxWidth: 720,
  maxHeight: "90vh",
  overflowY: "auto",
  borderRadius: 12,
  padding: 22,
  boxSizing: "border-box",
};

const modalHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 22,
};

const closeButtonStyle = {
  border: 0,
  background: "#f1f3f6",
  borderRadius: 7,
  padding: 7,
  cursor: "pointer",
};

const formGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "0 15px",
};

const modalFooterStyle = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 10,
  marginTop: 20,
};

export default App;
