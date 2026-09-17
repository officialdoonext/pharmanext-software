"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  TrendingUp,
  Receipt,
  Pill,
  AlertTriangle,
  ArrowRight,
  Plus,
  Clock,
  CheckCircle2,
  Calendar,
  Store,
  DollarSign,
  Printer,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { MedicineItem, purgeDummyMedicines } from "@/lib/medicine-master";
import {
  PharmacySettings,
  getLocalPharmacySettings,
  fetchRemotePharmacySettings,
} from "@/lib/pharmacy-settings";
import BillPrintModal, { BillInvoice } from "./BillPrintModal";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";

export default function DashboardContent() {
  const { currentPharmacy, user } = useAuth();
  const pharmacyId = currentPharmacy?.id;

  const [settings, setSettings] = useState<PharmacySettings>(() =>
    getLocalPharmacySettings(pharmacyId, currentPharmacy || undefined)
  );
  const [medicines, setMedicines] = useState<MedicineItem[]>([]);
  const [invoices, setInvoices] = useState<BillInvoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Bill print modal state
  const [selectedInvoice, setSelectedInvoice] = useState<BillInvoice | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Load pharmacy-isolated medicines and invoices
  useEffect(() => {
    let isMounted = true;
    const medKey = pharmacyId
      ? `pharmacynext_medicines_${pharmacyId}`
      : "pharmacynext_medicines_default";
    const invKey = pharmacyId
      ? `pharmacynext_invoices_${pharmacyId}`
      : "pharmacynext_invoices_default";

    async function loadDashboardData() {
      setIsLoading(true);

      // Load settings
      const st = await fetchRemotePharmacySettings(pharmacyId, currentPharmacy || undefined);
      if (isMounted) setSettings(st);

      // 1. Load Medicines for this pharmacy
      try {
        let medQuery;
        if (pharmacyId) {
          medQuery = query(collection(db, "medicines"), where("pharmacyId", "==", pharmacyId));
        } else {
          medQuery = collection(db, "medicines");
        }
        const medSnap = await getDocs(medQuery);
        if (isMounted && !medSnap.empty) {
          const list: MedicineItem[] = [];
          medSnap.forEach((d) => list.push(d.data() as MedicineItem));
          const clean = purgeDummyMedicines(list);
          setMedicines(clean);
          if (typeof window !== "undefined") {
            localStorage.setItem(medKey, JSON.stringify(clean));
          }
        } else if (isMounted) {
          if (typeof window !== "undefined") {
            const saved = localStorage.getItem(medKey);
            if (saved) {
              try {
                setMedicines(purgeDummyMedicines(JSON.parse(saved)));
              } catch {
                setMedicines([]);
              }
            } else {
              setMedicines([]);
            }
          }
        }
      } catch (err) {
        if (isMounted && typeof window !== "undefined") {
          const saved = localStorage.getItem(medKey);
          if (saved) {
            try {
              setMedicines(purgeDummyMedicines(JSON.parse(saved)));
            } catch {
              setMedicines([]);
            }
          }
        }
      }

      // 2. Load Invoices for this pharmacy
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

    loadDashboardData();
    return () => {
      isMounted = false;
    };
  }, [pharmacyId, currentPharmacy]);

  // Derived Metrics strictly for current pharmacy
  const totalSalesRevenue = useMemo(() => {
    return invoices.reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);
  }, [invoices]);

  const totalBillsCount = invoices.length;

  const lowStockMedicines = useMemo(() => {
    return medicines.filter((m) => {
      const stock = parseInt(String(m.stock || 0), 10);
      return stock > 0 && stock <= 15;
    });
  }, [medicines]);

  const outOfStockMedicines = useMemo(() => {
    return medicines.filter((m) => {
      const stock = parseInt(String(m.stock || 0), 10);
      return stock === 0;
    });
  }, [medicines]);

  const totalUnitsInInventory = useMemo(() => {
    return medicines.reduce((sum, m) => sum + (parseInt(String(m.stock || 0), 10) || 0), 0);
  }, [medicines]);

  const recentInvoices = useMemo(() => {
    return [...invoices].slice(0, 5);
  }, [invoices]);

  const openInvoicePrint = (inv: BillInvoice) => {
    setSelectedInvoice(inv);
    setIsPrintModalOpen(true);
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Pharmacy Banner */}
      <div className="bg-white border border-slate-200/80 rounded-md p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-md bg-purple-50 border border-purple-200 flex items-center justify-center text-[#5E2B9D] shrink-0">
            <Store className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-medium text-slate-900 tracking-tight">
                {currentPharmacy?.name || "Active Pharmacy Outlet"}
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                Active Store
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {currentPharmacy?.address || "Main Branch"} • Lic:{" "}
              {currentPharmacy?.licenseNo || settings.drugLicenseNo || "DL-PENDING"} • GSTIN:{" "}
              {settings.gstNumber || "Unregistered"}
            </p>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <Link
            href="/billing"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-[#5E2B9D] hover:bg-[#4D2382] text-white text-xs font-medium transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New POS Bill</span>
          </Link>
          <Link
            href="/medicines"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-colors"
          >
            <Pill className="w-3.5 h-3.5" />
            <span>Medicines</span>
          </Link>
          <Link
            href="/sales"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-colors"
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Sales History</span>
          </Link>
        </div>
      </div>

      {/* Primary KPI Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Sales */}
        <div className="bg-white border border-slate-200/80 rounded-md p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Total Sales Revenue</span>
            <div className="w-8 h-8 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-medium text-slate-900">
            ₹{totalSalesRevenue.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Across {totalBillsCount} invoice{totalBillsCount === 1 ? "" : "s"} at this outlet
          </p>
        </div>

        {/* Total Bills */}
        <div className="bg-white border border-slate-200/80 rounded-md p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Invoices Generated</span>
            <div className="w-8 h-8 rounded-md bg-purple-50 text-[#5E2B9D] flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-medium text-slate-900">
            {totalBillsCount}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Registered customer & walk-in bills
          </p>
        </div>

        {/* Medicines in Inventory */}
        <div className="bg-white border border-slate-200/80 rounded-md p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Medicines Stocked</span>
            <div className="w-8 h-8 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center">
              <Pill className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-medium text-slate-900">
            {medicines.length}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {totalUnitsInInventory.toLocaleString("en-IN")} total units in stock
          </p>
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-white border border-slate-200/80 rounded-md p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Stock Alerts</span>
            <div className="w-8 h-8 rounded-md bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-medium text-slate-900">
            {lowStockMedicines.length + outOfStockMedicines.length}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {outOfStockMedicines.length} out of stock • {lowStockMedicines.length} low stock
          </p>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Recent Invoices Table */}
        <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-md shadow-xs flex flex-col">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-[#5E2B9D]" />
              <h2 className="text-sm font-medium text-slate-900">Recent Sales Activity</h2>
            </div>
            <Link
              href="/sales"
              className="text-xs font-medium text-[#5E2B9D] hover:underline inline-flex items-center gap-1"
            >
              <span>View All Sales</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="flex-1 overflow-x-auto">
            {recentInvoices.length === 0 ? (
              <div className="p-10 text-center flex flex-col items-center justify-center text-slate-400">
                <Receipt className="w-10 h-10 stroke-1 text-slate-300 mb-2" />
                <p className="text-xs font-medium text-slate-600">No invoices recorded yet</p>
                <p className="text-[11px] text-slate-400 mt-1 max-w-xs">
                  Invoices created in POS Billing for this pharmacy will immediately appear here.
                </p>
                <Link
                  href="/billing"
                  className="mt-3 px-3 py-1.5 rounded-md bg-[#5E2B9D] text-white text-xs font-medium hover:bg-[#4D2382] transition-colors"
                >
                  Create Bill
                </Link>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                    <th className="py-2.5 px-4">Invoice #</th>
                    <th className="py-2.5 px-3">Date / Time</th>
                    <th className="py-2.5 px-3">Customer</th>
                    <th className="py-2.5 px-3">Payment</th>
                    <th className="py-2.5 px-3 text-right">Amount</th>
                    <th className="py-2.5 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {recentInvoices.map((inv) => (
                    <tr key={inv.invoiceNo} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-medium text-slate-900">{inv.invoiceNo}</td>
                      <td className="py-3 px-3 text-slate-500">
                        {inv.date} <span className="text-[10px] text-slate-400">{inv.time}</span>
                      </td>
                      <td className="py-3 px-3 text-slate-700">{inv.customerName || "Walk-in"}</td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-purple-50 text-[#5E2B9D] border border-purple-200">
                          {inv.paymentMethod}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-medium text-slate-900 text-right">
                        ₹{inv.grandTotal.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => openInvoicePrint(inv)}
                          className="p-1.5 rounded-md text-slate-400 hover:text-[#5E2B9D] hover:bg-purple-50 transition-colors cursor-pointer"
                          title="View / Print Receipt"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right 1 Column: Low Stock Attention List */}
        <div className="bg-white border border-slate-200/80 rounded-md shadow-xs p-4 flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <h2 className="text-sm font-medium text-slate-900">Low Stock Attention</h2>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
              {lowStockMedicines.length + outOfStockMedicines.length} items
            </span>
          </div>

          <div className="flex-1 divide-y divide-slate-100 mt-2 max-h-[380px] overflow-y-auto">
            {lowStockMedicines.length === 0 && outOfStockMedicines.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <p className="text-xs font-medium text-slate-700">Inventory Well Stocked</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  No low stock or depleted items found for this branch.
                </p>
              </div>
            ) : (
              [...outOfStockMedicines, ...lowStockMedicines].slice(0, 6).map((med) => {
                const stock = parseInt(String(med.stock || 0), 10);
                const isOut = stock === 0;
                return (
                  <div key={med.id} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-slate-800 truncate">
                        {med.name}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {med.category} • {med.unitsPerSheet || 10} / sheet
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium ${
                          isOut
                            ? "bg-rose-50 text-rose-700 border border-rose-200"
                            : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}
                      >
                        {isOut ? "Depleted (0)" : `${stock} pcs left`}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 mt-auto">
            <Link
              href="/medicines"
              className="w-full py-2 rounded-md bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors border border-slate-200/80"
            >
              <span>Manage Medicine Inventory</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
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
