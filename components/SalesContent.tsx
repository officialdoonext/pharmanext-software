"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  TrendingUp,
  Receipt,
  Search,
  Filter,
  Calendar,
  Printer,
  Plus,
  Store,
  CreditCard,
  Banknote,
  Smartphone,
  Layers,
  ArrowUpDown,
  Download,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import {
  PharmacySettings,
  getLocalPharmacySettings,
  fetchRemotePharmacySettings,
} from "@/lib/pharmacy-settings";
import BillPrintModal, { BillInvoice } from "./BillPrintModal";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";

export default function SalesContent() {
  const { currentPharmacy } = useAuth();
  const pharmacyId = currentPharmacy?.id;

  const [settings, setSettings] = useState<PharmacySettings>(() =>
    getLocalPharmacySettings(pharmacyId, currentPharmacy || undefined)
  );
  const [invoices, setInvoices] = useState<BillInvoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState<string>(""); // YYYY-MM-DD
  const [filterPeriod, setFilterPeriod] = useState<"all" | "today">("all");

  // Bill print modal state
  const [selectedInvoice, setSelectedInvoice] = useState<BillInvoice | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Load pharmacy-isolated invoices
  useEffect(() => {
    let isMounted = true;
    const invKey = pharmacyId
      ? `pharmacynext_invoices_${pharmacyId}`
      : "pharmacynext_invoices_default";

    async function loadSalesData() {
      setIsLoading(true);
      const st = await fetchRemotePharmacySettings(pharmacyId, currentPharmacy || undefined);
      if (isMounted) setSettings(st);

      try {
        let invQuery;
        if (pharmacyId) {
          invQuery = query(collection(db, "invoices"), where("pharmacyId", "==", pharmacyId));
        } else {
          invQuery = collection(db, "invoices");
        }
        const invSnap = await getDocs(invQuery);
        if (isMounted && !invSnap.empty) {
          const list: BillInvoice[] = [];
          invSnap.forEach((d) => list.push(d.data() as BillInvoice));
          setInvoices(list);
          if (typeof window !== "undefined") {
            localStorage.setItem(invKey, JSON.stringify(list));
          }
        } else if (isMounted) {
          if (typeof window !== "undefined") {
            const saved = localStorage.getItem(invKey);
            if (saved) {
              try {
                setInvoices(JSON.parse(saved));
              } catch {
                setInvoices([]);
              }
            } else {
              setInvoices([]);
            }
          }
        }
      } catch (err) {
        if (isMounted && typeof window !== "undefined") {
          const saved = localStorage.getItem(invKey);
          if (saved) {
            try {
              setInvoices(JSON.parse(saved));
            } catch {
              setInvoices([]);
            }
          }
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadSalesData();
    return () => {
      isMounted = false;
    };
  }, [pharmacyId, currentPharmacy]);

  // Filtered Invoices (Date Filter & Search Feature Only)
  const filteredInvoices = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const todayStr = new Date().toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

    let targetDateStr = "";
    if (selectedDate) {
      const parts = selectedDate.split("-"); // YYYY, MM, DD
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        targetDateStr = d.toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });
      }
    }

    return invoices.filter((inv) => {
      // Date filter
      if (targetDateStr) {
        if (inv.date !== targetDateStr) return false;
      } else if (filterPeriod === "today") {
        if (inv.date !== todayStr) return false;
      }

      // Search feature
      if (q) {
        const matchNo = inv.invoiceNo.toLowerCase().includes(q);
        const matchCustomer = (inv.customerName || "").toLowerCase().includes(q);
        const matchPhone = (inv.customerPhone || "").toLowerCase().includes(q);
        const matchDoctor = (inv.doctorName || "").toLowerCase().includes(q);
        if (!matchNo && !matchCustomer && !matchPhone && !matchDoctor) return false;
      }

      return true;
    });
  }, [invoices, searchQuery, filterPeriod, selectedDate]);

  // Metrics
  const totalSales = useMemo(() => {
    return filteredInvoices.reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);
  }, [filteredInvoices]);

  const cashSales = useMemo(() => {
    return filteredInvoices
      .filter((inv) => inv.paymentMethod === "Cash")
      .reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);
  }, [filteredInvoices]);

  const digitalSales = useMemo(() => {
    return filteredInvoices
      .filter((inv) => inv.paymentMethod === "UPI" || inv.paymentMethod === "Card")
      .reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);
  }, [filteredInvoices]);

  const openInvoicePrint = (inv: BillInvoice) => {
    setSelectedInvoice(inv);
    setIsPrintModalOpen(true);
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredInvoices.length === 0) return;
    const headers = [
      "Invoice No",
      "Date",
      "Time",
      "Customer Name",
      "Customer Phone",
      "Doctor Name",
      "Payment Mode",
      "Taxable Amount",
      "Total GST",
      "Grand Total",
    ];

    const rows = filteredInvoices.map((i) => [
      i.invoiceNo,
      `"${i.date}"`,
      `"${i.time}"`,
      `"${i.customerName || "Walk-in"}"`,
      `"${i.customerPhone || ""}"`,
      `"${i.doctorName || ""}"`,
      i.paymentMethod,
      i.taxableAmount.toFixed(2),
      i.totalGstAmount.toFixed(2),
      i.grandTotal.toFixed(2),
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Sales_${currentPharmacy?.name || "Branch"}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="bg-white border border-slate-200/80 rounded-md p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-medium text-slate-900 tracking-tight">
              Sales & Invoice History
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-purple-50 text-[#5E2B9D] border border-purple-200">
              {currentPharmacy?.name || "Active Outlet"}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit logs, settlements, and GST bills recorded specifically for this pharmacy outlet.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleExportCSV}
            disabled={filteredInvoices.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-white border border-slate-200/80 hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <Link
            href="/billing"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-[#5E2B9D] hover:bg-[#4D2382] text-white text-xs font-medium transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Bill</span>
          </Link>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/80 rounded-md p-4 shadow-xs">
          <span className="text-xs font-medium text-slate-500">Filtered Sales Revenue</span>
          <div className="mt-2 text-2xl font-medium text-slate-900">
            ₹{totalSales.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Across {filteredInvoices.length} selected bills</p>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-md p-4 shadow-xs">
          <span className="text-xs font-medium text-slate-500">Total Invoices</span>
          <div className="mt-2 text-2xl font-medium text-slate-900">
            {filteredInvoices.length}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Settled transactions</p>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-md p-4 shadow-xs">
          <span className="text-xs font-medium text-slate-500">Cash Collections</span>
          <div className="mt-2 text-2xl font-medium text-emerald-600">
            ₹{cashSales.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Direct physical cash received</p>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-md p-4 shadow-xs">
          <span className="text-xs font-medium text-slate-500">UPI / Digital Collections</span>
          <div className="mt-2 text-2xl font-medium text-[#5E2B9D]">
            ₹{digitalSales.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">QR UPI & Card settlements</p>
        </div>
      </div>

      {/* Filter and Search Bar (Date Filter & Search Feature Only) */}
      <div className="bg-white border border-slate-200/80 rounded-md p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search Feature */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by invoice #, customer name, phone, doctor..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-xs focus:outline-hidden focus:border-[#5E2B9D] focus:bg-white transition-colors"
          />
        </div>

        {/* Date Filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-slate-100 p-0.5 rounded-md border border-slate-200/80 text-xs">
            <button
              onClick={() => {
                setFilterPeriod("all");
                setSelectedDate("");
              }}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors cursor-pointer ${
                filterPeriod === "all" && !selectedDate
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              All Time
            </button>
            <button
              onClick={() => {
                setFilterPeriod("today");
                setSelectedDate("");
              }}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors cursor-pointer ${
                filterPeriod === "today" && !selectedDate
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Today
            </button>
          </div>

          {/* Specific Date Picker */}
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-2 py-1 rounded-md text-xs">
            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setFilterPeriod("all");
              }}
              className="text-xs text-slate-700 bg-transparent focus:outline-none cursor-pointer"
              title="Filter by specific date"
            />
            {selectedDate && (
              <button
                type="button"
                onClick={() => setSelectedDate("")}
                className="text-slate-400 hover:text-rose-600 text-[11px] px-1 cursor-pointer"
                title="Clear date filter"
              >
                &times;
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white border border-slate-200/80 rounded-md shadow-xs overflow-hidden">
        {filteredInvoices.length === 0 ? (
          <div className="p-16 text-center flex flex-col items-center justify-center text-slate-400">
            <Receipt className="w-12 h-12 stroke-1 text-slate-300 mb-2" />
            <h3 className="text-sm font-medium text-slate-700">No Sales Records Found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">
              {searchQuery || selectedDate || filterPeriod !== "all"
                ? "No invoices match the current search filters. Try clearing your filters."
                : `No sales have been recorded for ${currentPharmacy?.name || "this pharmacy"} yet.`}
            </p>
            <Link
              href="/billing"
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-[#5E2B9D] hover:bg-[#4D2382] text-white text-xs font-medium transition-colors shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create First Bill</span>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-3">Date & Time</th>
                  <th className="py-3 px-3">Customer</th>
                  <th className="py-3 px-3">Doctor</th>
                  <th className="py-3 px-3 text-center">Items</th>
                  <th className="py-3 px-3">Payment</th>
                  <th className="py-3 px-3 text-right">Tax (GST)</th>
                  <th className="py-3 px-3 text-right">Grand Total</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredInvoices.map((inv) => (
                  <tr key={inv.invoiceNo} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-medium text-slate-900">{inv.invoiceNo}</td>
                    <td className="py-3.5 px-3 text-slate-500">
                      {inv.date} <span className="text-[10px] text-slate-400">{inv.time}</span>
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="font-medium text-slate-800">{inv.customerName || "Walk-in Customer"}</div>
                      {inv.customerPhone && (
                        <div className="text-[10px] text-slate-400">{inv.customerPhone}</div>
                      )}
                    </td>
                    <td className="py-3.5 px-3 text-slate-500">
                      {inv.doctorName ? `Dr. ${inv.doctorName}` : "—"}
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600">
                        {inv.items.length}
                      </span>
                    </td>
                    <td className="py-3.5 px-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium ${
                          inv.paymentMethod === "UPI"
                            ? "bg-purple-50 text-[#5E2B9D] border border-purple-200"
                            : inv.paymentMethod === "Cash"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-blue-50 text-blue-700 border border-blue-200"
                        }`}
                      >
                        {inv.paymentMethod}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-right text-slate-500">
                      ₹{inv.totalGstAmount.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-3 font-medium text-slate-900 text-right">
                      ₹{inv.grandTotal.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => openInvoicePrint(inv)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-purple-50 hover:bg-purple-100/70 border border-purple-200 text-[#5E2B9D] text-[11px] font-medium transition-colors cursor-pointer"
                        title="View / Print Tax Invoice"
                      >
                        <Printer className="w-3 h-3" />
                        <span>Receipt</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Bill Print Modal */}
      <BillPrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        invoice={selectedInvoice}
        settings={settings}
        onStartNewBill={() => setIsPrintModalOpen(false)}
      />
    </div>
  );
}
