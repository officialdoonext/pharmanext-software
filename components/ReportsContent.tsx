"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  FileText,
  TrendingUp,
  Receipt,
  Download,
  Calendar,
  Percent,
  PieChart,
  ShoppingBag,
  Store,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { BillInvoice } from "./BillPrintModal";
import {
  PharmacySettings,
  getLocalPharmacySettings,
  fetchRemotePharmacySettings,
} from "@/lib/pharmacy-settings";
import { fetchPharmacyInvoices } from "@/lib/invoice-service";

export default function ReportsContent() {
  const { currentPharmacy } = useAuth();
  const pharmacyId = currentPharmacy?.id;

  const [settings, setSettings] = useState<PharmacySettings>(() =>
    getLocalPharmacySettings(pharmacyId, currentPharmacy || undefined)
  );
  const [invoices, setInvoices] = useState<BillInvoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState<"all" | "today" | "month">("all");

  useEffect(() => {
    let isMounted = true;

    async function loadReportsData() {
      setIsLoading(true);
      const st = await fetchRemotePharmacySettings(pharmacyId, currentPharmacy || undefined);
      if (isMounted) setSettings(st);

      try {
        const list = await fetchPharmacyInvoices(pharmacyId);
        if (isMounted) {
          setInvoices(list);
        }
      } catch (err) {
        console.warn("Reports data fetch error:", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadReportsData();

    // Listen for live invoice settlements
    const handleLiveInvoice = (e: any) => {
      const newInv = e.detail?.invoice;
      const targetPharmacyId = e.detail?.pharmacyId;
      if (newInv && (!pharmacyId || targetPharmacyId === pharmacyId)) {
        setInvoices((prev) => {
          const filtered = prev.filter((i) => i.invoiceNo !== newInv.invoiceNo);
          return [newInv, ...filtered];
        });
      }
    };

    window.addEventListener("pharmacynext_invoice_saved", handleLiveInvoice);
    return () => {
      isMounted = false;
      window.removeEventListener("pharmacynext_invoice_saved", handleLiveInvoice);
    };
  }, [pharmacyId, currentPharmacy]);

  // Filtered invoices by period
  const filteredInvoices = useMemo(() => {
    const todayStr = new Date().toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

    if (period === "today") {
      return invoices.filter((i) => i.date === todayStr);
    }
    return invoices;
  }, [invoices, period]);

  // Aggregated Financial Metrics
  const grossSales = useMemo(() => {
    return filteredInvoices.reduce((s, i) => s + (i.grandTotal || 0), 0);
  }, [filteredInvoices]);

  const taxableAmount = useMemo(() => {
    return filteredInvoices.reduce((s, i) => s + (i.taxableAmount || 0), 0);
  }, [filteredInvoices]);

  const totalGst = useMemo(() => {
    return filteredInvoices.reduce((s, i) => s + (i.totalGstAmount || 0), 0);
  }, [filteredInvoices]);

  const totalCgst = useMemo(() => {
    return filteredInvoices.reduce((s, i) => s + (i.cgstAmount || 0), 0);
  }, [filteredInvoices]);

  const totalSgst = useMemo(() => {
    return filteredInvoices.reduce((s, i) => s + (i.sgstAmount || 0), 0);
  }, [filteredInvoices]);

  const totalDiscounts = useMemo(() => {
    return filteredInvoices.reduce((s, i) => s + (i.discountAmount || 0), 0);
  }, [filteredInvoices]);

  // Top Selling Medicines
  const topMedicines = useMemo(() => {
    const countMap = new Map<string, { name: string; qty: number; revenue: number }>();
    filteredInvoices.forEach((inv) => {
      inv.items.forEach((item) => {
        const key = item.medicineId || item.name;
        if (!countMap.has(key)) {
          countMap.set(key, { name: item.name, qty: item.quantity, revenue: item.amount });
        } else {
          const ex = countMap.get(key)!;
          ex.qty += item.quantity;
          ex.revenue += item.amount;
        }
      });
    });

    return Array.from(countMap.values())
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);
  }, [filteredInvoices]);

  // Payment Breakdown
  const paymentBreakdown = useMemo(() => {
    let upi = 0;
    let cash = 0;
    let card = 0;
    let split = 0;
    filteredInvoices.forEach((i) => {
      if (i.paymentMethod === "UPI") upi += i.grandTotal;
      else if (i.paymentMethod === "Cash") cash += i.grandTotal;
      else if (i.paymentMethod === "Card") card += i.grandTotal;
      else split += i.grandTotal;
    });
    return { upi, cash, card, split };
  }, [filteredInvoices]);

  // Export GST Report CSV
  const handleExportGST = () => {
    if (filteredInvoices.length === 0) return;
    const headers = [
      "Invoice No",
      "Date",
      "Customer",
      "GSTIN",
      "Taxable Value (INR)",
      "CGST (INR)",
      "SGST (INR)",
      "Total GST (INR)",
      "Invoice Total (INR)",
    ];

    const rows = filteredInvoices.map((i) => [
      i.invoiceNo,
      `"${i.date}"`,
      `"${i.customerName || "Walk-in"}"`,
      settings.gstNumber || "N/A",
      i.taxableAmount.toFixed(2),
      i.cgstAmount.toFixed(2),
      i.sgstAmount.toFixed(2),
      i.totalGstAmount.toFixed(2),
      i.grandTotal.toFixed(2),
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `GST_Report_${currentPharmacy?.name || "Outlet"}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white border border-slate-200/80 rounded-md p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-medium text-slate-900 tracking-tight">
              Reports & Tax Intelligence
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-purple-50 text-[#5E2B9D] border border-purple-200">
              {currentPharmacy?.name || "Active Outlet"}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            GST compliance, sales performance, and settlement audits for this pharmacy branch.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center bg-slate-100 p-0.5 rounded-md border border-slate-200/80 text-xs">
            <button
              onClick={() => setPeriod("all")}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors cursor-pointer ${
                period === "all" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              All Time
            </button>
            <button
              onClick={() => setPeriod("today")}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors cursor-pointer ${
                period === "today" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Today
            </button>
          </div>

          <button
            onClick={handleExportGST}
            disabled={filteredInvoices.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-[#5E2B9D] hover:bg-[#4D2382] text-white text-xs font-medium transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download GST Report</span>
          </button>
        </div>
      </div>

      {/* KPI Financial Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/80 rounded-md p-4 shadow-xs">
          <span className="text-xs font-medium text-slate-500">Gross Sales Revenue</span>
          <div className="mt-2 text-2xl font-medium text-slate-900">
            ₹{grossSales.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Across {filteredInvoices.length} invoices</p>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-md p-4 shadow-xs">
          <span className="text-xs font-medium text-slate-500">Taxable Sales Value</span>
          <div className="mt-2 text-2xl font-medium text-slate-900">
            ₹{taxableAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Net base price excluding taxes</p>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-md p-4 shadow-xs">
          <span className="text-xs font-medium text-slate-500">Total GST Collected</span>
          <div className="mt-2 text-2xl font-medium text-[#5E2B9D]">
            ₹{totalGst.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            CGST: ₹{totalCgst.toFixed(2)} • SGST: ₹{totalSgst.toFixed(2)}
          </p>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-md p-4 shadow-xs">
          <span className="text-xs font-medium text-slate-500">Total Discounts Granted</span>
          <div className="mt-2 text-2xl font-medium text-amber-600">
            ₹{totalDiscounts.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Savings given to patients</p>
        </div>
      </div>

      {/* Two Column Layout: Top Medicines & Payment Split */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Selling Medicines */}
        <div className="bg-white border border-slate-200/80 rounded-md shadow-xs p-5 flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-[#5E2B9D]" />
              <h2 className="text-sm font-medium text-slate-900">Top Moving Medicines</h2>
            </div>
            <span className="text-xs text-slate-400">By quantity sold</span>
          </div>

          <div className="flex-1 divide-y divide-slate-100 mt-2">
            {topMedicines.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <FileText className="w-8 h-8 stroke-1 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-medium text-slate-600">No sales data yet</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Items billed at this branch will populate this moving list.
                </p>
              </div>
            ) : (
              topMedicines.map((m, idx) => (
                <div key={idx} className="py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-5 h-5 rounded-full bg-purple-50 text-[#5E2B9D] flex items-center justify-center text-[10px] font-medium shrink-0">
                      {idx + 1}
                    </span>
                    <span className="text-xs font-medium text-slate-800 truncate">{m.name}</span>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs font-medium text-slate-900">
                      {m.qty} unit{m.qty === 1 ? "" : "s"}
                    </div>
                    <div className="text-[10px] text-slate-400">₹{m.revenue.toFixed(2)}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Payment Mode Distribution */}
        <div className="bg-white border border-slate-200/80 rounded-md shadow-xs p-5 flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <PieChart className="w-4 h-4 text-[#5E2B9D]" />
              <h2 className="text-sm font-medium text-slate-900">Settlement Channels</h2>
            </div>
            <span className="text-xs text-slate-400">Payment Breakdown</span>
          </div>

          <div className="flex-1 space-y-4 mt-4">
            {/* UPI */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-medium text-slate-700">UPI / QR Payment</span>
                <span className="font-medium text-slate-900">₹{paymentBreakdown.upi.toFixed(2)}</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#5E2B9D] rounded-full"
                  style={{ width: `${grossSales > 0 ? (paymentBreakdown.upi / grossSales) * 100 : 0}%` }}
                ></div>
              </div>
            </div>

            {/* Cash */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-medium text-slate-700">Cash Settlement</span>
                <span className="font-medium text-slate-900">₹{paymentBreakdown.cash.toFixed(2)}</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full"
                  style={{ width: `${grossSales > 0 ? (paymentBreakdown.cash / grossSales) * 100 : 0}%` }}
                ></div>
              </div>
            </div>

            {/* Card */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-medium text-slate-700">Debit / Credit Card</span>
                <span className="font-medium text-slate-900">₹{paymentBreakdown.card.toFixed(2)}</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full"
                  style={{ width: `${grossSales > 0 ? (paymentBreakdown.card / grossSales) * 100 : 0}%` }}
                ></div>
              </div>
            </div>

            {/* Split */}
            {paymentBreakdown.split > 0 && (
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-medium text-slate-700">Split Payment</span>
                  <span className="font-medium text-slate-900">₹{paymentBreakdown.split.toFixed(2)}</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full"
                    style={{ width: `${(paymentBreakdown.split / grossSales) * 100}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100 mt-auto flex items-center justify-between text-xs text-slate-500">
            <span>Store GSTIN: {settings.gstNumber || "Not Configured"}</span>
            <Link href="/settings" className="text-[#5E2B9D] font-medium hover:underline">
              Configure GST
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
