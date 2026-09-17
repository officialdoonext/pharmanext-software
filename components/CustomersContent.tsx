"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Users,
  Search,
  Plus,
  Phone,
  Calendar,
  ShoppingBag,
  IndianRupee,
  X,
  CheckCircle2,
  Store,
  UserPlus,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { BillInvoice } from "./BillPrintModal";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, setDoc, query, where } from "firebase/firestore";

interface CustomerRecord {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  totalVisits: number;
  totalSpent: number;
  lastVisit: string;
  pharmacyId?: string;
}

export default function CustomersContent() {
  const { currentPharmacy } = useAuth();
  const pharmacyId = currentPharmacy?.id;

  const [invoices, setInvoices] = useState<BillInvoice[]>([]);
  const [manualCustomers, setManualCustomers] = useState<CustomerRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newAddress, setNewAddress] = useState("");

  // Load pharmacy-isolated invoices and customers
  useEffect(() => {
    let isMounted = true;
    const invKey = pharmacyId
      ? `pharmacynext_invoices_${pharmacyId}`
      : "pharmacynext_invoices_default";
    const custKey = pharmacyId
      ? `pharmacynext_customers_${pharmacyId}`
      : "pharmacynext_customers_default";

    async function loadCustomerData() {
      setIsLoading(true);

      // 1. Invoices
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
        } else if (isMounted && typeof window !== "undefined") {
          const saved = localStorage.getItem(invKey);
          if (saved) {
            try {
              setInvoices(JSON.parse(saved));
            } catch {
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
      }

      // 2. Manual Customers
      try {
        let custQuery;
        if (pharmacyId) {
          custQuery = query(collection(db, "customers"), where("pharmacyId", "==", pharmacyId));
        } else {
          custQuery = collection(db, "customers");
        }
        const custSnap = await getDocs(custQuery);
        if (isMounted && !custSnap.empty) {
          const list: CustomerRecord[] = [];
          custSnap.forEach((d) => list.push(d.data() as CustomerRecord));
          setManualCustomers(list);
          if (typeof window !== "undefined") {
            localStorage.setItem(custKey, JSON.stringify(list));
          }
        } else if (isMounted && typeof window !== "undefined") {
          const saved = localStorage.getItem(custKey);
          if (saved) {
            try {
              setManualCustomers(JSON.parse(saved));
            } catch {
              setManualCustomers([]);
            }
          }
        }
      } catch (err) {
        if (isMounted && typeof window !== "undefined") {
          const saved = localStorage.getItem(custKey);
          if (saved) {
            try {
              setManualCustomers(JSON.parse(saved));
            } catch {
              setManualCustomers([]);
            }
          }
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadCustomerData();
    return () => {
      isMounted = false;
    };
  }, [pharmacyId]);

  // Aggregate Customer Records from Invoices & Manual list strictly for this pharmacy
  const customerList = useMemo(() => {
    const map = new Map<string, CustomerRecord>();

    // 1. Seed from manual customers
    manualCustomers.forEach((mc) => {
      const key = mc.phone.trim() || mc.id;
      map.set(key, { ...mc });
    });

    // 2. Aggregate from invoices
    invoices.forEach((inv) => {
      const phone = inv.customerPhone?.trim() || "";
      const name = inv.customerName?.trim() || "Walk-in Customer";
      const key = phone || name;

      if (!map.has(key)) {
        map.set(key, {
          id: `cust-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          name,
          phone,
          totalVisits: 1,
          totalSpent: inv.grandTotal || 0,
          lastVisit: inv.date,
          pharmacyId,
        });
      } else {
        const existing = map.get(key)!;
        existing.totalVisits += 1;
        existing.totalSpent += inv.grandTotal || 0;
        // Keep most recent date
        if (inv.date) existing.lastVisit = inv.date;
      }
    });

    return Array.from(map.values());
  }, [invoices, manualCustomers, pharmacyId]);

  // Filtered List
  const filteredCustomers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return customerList;
    return customerList.filter(
      (c) => c.name.toLowerCase().includes(q) || (c.phone && c.phone.includes(q))
    );
  }, [customerList, searchQuery]);

  // Add Customer Handler
  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const newRecord: CustomerRecord = {
      id: `cust-${Date.now()}`,
      name: newName.trim(),
      phone: newPhone.trim(),
      email: newEmail.trim() || undefined,
      address: newAddress.trim() || undefined,
      totalVisits: 0,
      totalSpent: 0,
      lastVisit: "Never",
      pharmacyId,
    };

    const updated = [newRecord, ...manualCustomers];
    setManualCustomers(updated);

    const custKey = pharmacyId
      ? `pharmacynext_customers_${pharmacyId}`
      : "pharmacynext_customers_default";
    try {
      localStorage.setItem(custKey, JSON.stringify(updated));
      await setDoc(doc(db, "customers", newRecord.id), newRecord);
    } catch (err) {
      console.warn("Customer save sync note:", err);
    }

    setNewName("");
    setNewPhone("");
    setNewEmail("");
    setNewAddress("");
    setIsAddModalOpen(false);
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="bg-white border border-slate-200/80 rounded-md p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-medium text-slate-900 tracking-tight">
              Customer Directory
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-purple-50 text-[#5E2B9D] border border-purple-200">
              {currentPharmacy?.name || "Active Outlet"}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Customer purchasing history and contact profiles isolated strictly to this pharmacy.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-[#5E2B9D] hover:bg-[#4D2382] text-white text-xs font-medium transition-colors shadow-xs cursor-pointer"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>Add Customer</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200/80 rounded-md p-4 shadow-xs">
          <span className="text-xs font-medium text-slate-500">Registered Customers</span>
          <div className="mt-2 text-2xl font-medium text-slate-900">
            {customerList.length}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Associated with this branch</p>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-md p-4 shadow-xs">
          <span className="text-xs font-medium text-slate-500">Repeat Customers</span>
          <div className="mt-2 text-2xl font-medium text-emerald-600">
            {customerList.filter((c) => c.totalVisits > 1).length}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Visited 2 or more times</p>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-md p-4 shadow-xs">
          <span className="text-xs font-medium text-slate-500">Total Customer Spend</span>
          <div className="mt-2 text-2xl font-medium text-[#5E2B9D]">
            ₹{customerList.reduce((s, c) => s + c.totalSpent, 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Lifetime customer revenue at this store</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white border border-slate-200/80 rounded-md p-4 shadow-xs flex items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search customers by name or mobile number..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-xs focus:outline-hidden focus:border-[#5E2B9D] focus:bg-white transition-colors"
          />
        </div>
        <span className="text-xs text-slate-400">
          Showing {filteredCustomers.length} customer{filteredCustomers.length === 1 ? "" : "s"}
        </span>
      </div>

      {/* Customers Table */}
      <div className="bg-white border border-slate-200/80 rounded-md shadow-xs overflow-hidden">
        {filteredCustomers.length === 0 ? (
          <div className="p-16 text-center flex flex-col items-center justify-center text-slate-400">
            <Users className="w-12 h-12 stroke-1 text-slate-300 mb-2" />
            <h3 className="text-sm font-medium text-slate-700">No Customers Found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">
              {searchQuery
                ? "No customer matches your search criteria."
                : `No customers have been registered or billed at ${currentPharmacy?.name || "this pharmacy"} yet.`}
            </p>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-[#5E2B9D] hover:bg-[#4D2382] text-white text-xs font-medium transition-colors shadow-xs cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Add First Customer</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Customer Name</th>
                  <th className="py-3 px-3">Phone Number</th>
                  <th className="py-3 px-3 text-center">Visits / Bills</th>
                  <th className="py-3 px-3 text-right">Total Spent</th>
                  <th className="py-3 px-3">Last Visit</th>
                  <th className="py-3 px-4 text-center">Quick Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredCustomers.map((cust) => (
                  <tr key={cust.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-medium text-slate-900">{cust.name}</td>
                    <td className="py-3.5 px-3 text-slate-600">{cust.phone || "—"}</td>
                    <td className="py-3.5 px-3 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-50 text-[#5E2B9D] border border-purple-200">
                        {cust.totalVisits} visit{cust.totalVisits === 1 ? "" : "s"}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 font-medium text-slate-900 text-right">
                      ₹{cust.totalSpent.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-3 text-slate-500">{cust.lastVisit || "Never"}</td>
                    <td className="py-3.5 px-4 text-center">
                      <Link
                        href="/billing"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-purple-50 hover:bg-purple-100/70 border border-purple-200 text-[#5E2B9D] text-[11px] font-medium transition-colors"
                      >
                        <span>Bill Customer</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Customer Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-md border border-slate-200 shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-[#5E2B9D]" />
                <h3 className="text-base font-medium text-slate-900">Add Customer</h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddCustomer} className="space-y-3.5 mt-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Customer Name *
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-xs focus:outline-hidden focus:border-[#5E2B9D] focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Mobile Number
                </label>
                <input
                  type="tel"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="10-digit mobile number"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-xs focus:outline-hidden focus:border-[#5E2B9D] focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="customer@example.com"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-xs focus:outline-hidden focus:border-[#5E2B9D] focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Address
                </label>
                <input
                  type="text"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  placeholder="Street / City"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-xs focus:outline-hidden focus:border-[#5E2B9D] focus:bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-md bg-[#5E2B9D] hover:bg-[#4D2382] text-white text-xs font-medium transition-colors shadow-xs cursor-pointer"
                >
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
