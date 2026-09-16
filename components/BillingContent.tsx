"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Search,
  Pill,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  CheckCircle2,
  Percent,
  IndianRupee,
  Receipt,
  Printer,
  CreditCard,
  QrCode,
  Banknote,
  Split,
  User,
  Phone,
  Stethoscope,
  Sparkles,
  AlertCircle,
  Package,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/firebase";
import { collection, doc, getDocs, setDoc, query, where } from "firebase/firestore";
import { MedicineItem, purgeDummyMedicines } from "@/lib/medicine-master";
import {
  PharmacySettings,
  defaultPharmacySettings,
  getLocalPharmacySettings,
  fetchRemotePharmacySettings,
} from "@/lib/pharmacy-settings";
import BillPrintModal, { BillItem, BillInvoice } from "./BillPrintModal";

export default function BillingContent() {
  const { currentPharmacy } = useAuth();
  
  // Store Settings & GST configuration
  const [settings, setSettings] = useState<PharmacySettings>(getLocalPharmacySettings());
  
  // Medicines catalog
  const [medicines, setMedicines] = useState<MedicineItem[]>([]);
  const [isLoadingMedicines, setIsLoadingMedicines] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  // Cart / Order Summary state
  const [cartItems, setCartItems] = useState<BillItem[]>([]);
  const [customerName, setCustomerName] = useState("Walk-in Customer");
  const [customerPhone, setCustomerPhone] = useState("");
  const [doctorName, setDoctorName] = useState("");

  // Discount configuration
  const [discountType, setDiscountType] = useState<"rupees" | "percent">("percent");
  const [discountValue, setDiscountValue] = useState<number>(0);

  // Payment method state
  const [paymentMethod, setPaymentMethod] = useState<"UPI" | "Cash" | "Card" | "Split">("UPI");
  const [cashTendered, setCashTendered] = useState<string>("");
  const [splitCash, setSplitCash] = useState<string>("");
  const [splitOnline, setSplitOnline] = useState<string>("");
  const [transactionRef, setTransactionRef] = useState<string>("");

  // Post-settlement print modal state
  const [settledInvoice, setSettledInvoice] = useState<BillInvoice | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isSettling, setIsSettling] = useState(false);

  // 1. Load Settings and Dynamic Medicines on mount
  useEffect(() => {
    async function initData() {
      // Fetch settings
      const st = await fetchRemotePharmacySettings(currentPharmacy?.id);
      setSettings(st);

      // Fetch medicines from local or Firestore
      setIsLoadingMedicines(true);
      try {
        let medQuery;
        if (currentPharmacy?.id) {
          medQuery = query(
            collection(db, "medicines"),
            where("pharmacyId", "==", currentPharmacy.id)
          );
        } else {
          medQuery = collection(db, "medicines");
        }

        const snapshot = await getDocs(medQuery);
        if (!snapshot.empty) {
          const fetched: MedicineItem[] = [];
          snapshot.forEach((docSnap) => fetched.push(docSnap.data() as MedicineItem));
          const clean = purgeDummyMedicines(fetched);
          setMedicines(clean);
          localStorage.setItem("pharmacynext_medicines", JSON.stringify(clean));
        } else {
          const saved = localStorage.getItem("pharmacynext_medicines");
          if (saved) {
            setMedicines(purgeDummyMedicines(JSON.parse(saved)));
          }
        }
      } catch (e) {
        console.warn("Billing medicines load:", e);
        const saved = localStorage.getItem("pharmacynext_medicines");
        if (saved) {
          try {
            setMedicines(purgeDummyMedicines(JSON.parse(saved)));
          } catch {}
        }
      } finally {
        setIsLoadingMedicines(false);
      }
    }
    initData();
  }, [currentPharmacy]);

  // Filtered medicines list
  const filteredMedicines = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return medicines.filter((m) => {
      const matchQuery =
        !q ||
        m.name.toLowerCase().includes(q) ||
        m.genericName.toLowerCase().includes(q) ||
        m.brandName.toLowerCase().includes(q) ||
        (m.batchNumber && m.batchNumber.toLowerCase().includes(q)) ||
        m.sku.toLowerCase().includes(q);

      const matchCategory =
        selectedCategory === "All" || m.category === selectedCategory;

      return matchQuery && matchCategory;
    });
  }, [medicines, searchQuery, selectedCategory]);

  // Unique categories for filtering chips
  const categoriesList = useMemo(() => {
    const set = new Set<string>();
    medicines.forEach((m) => {
      if (m.category) set.add(m.category);
    });
    return ["All", ...Array.from(set)];
  }, [medicines]);

  // 2. Add Item to Cart (Handles Sheet vs Loose Tablet)
  const handleAddToCart = (medicine: MedicineItem, unitType: "sheet" | "loose") => {
    const count = Math.max(1, medicine.unitsPerSheet || 10);
    const sheetRate = parseFloat(medicine.sheetPrice || medicine.sellingPrice?.replace(/[^0-9.]/g, "") || "0") || 100;
    const unitRate = parseFloat(medicine.unitPrice || "0") || sheetRate / count;
    const rate = unitType === "sheet" ? sheetRate : unitRate;

    setCartItems((prev) => {
      const existingIdx = prev.findIndex(
        (it) => it.medicineId === medicine.id && it.unitType === unitType
      );

      if (existingIdx >= 0) {
        const updated = [...prev];
        const current = updated[existingIdx];
        const newQty = current.quantity + 1;
        updated[existingIdx] = {
          ...current,
          quantity: newQty,
          amount: +(newQty * current.rate).toFixed(2),
        };
        return updated;
      } else {
        const newItem: BillItem = {
          id: `cart-${Date.now()}-${unitType}-${medicine.id}`,
          medicineId: medicine.id,
          name: medicine.name,
          genericName: medicine.genericName,
          batchNumber: medicine.batchNumber,
          expiryDate: medicine.expiryDate,
          unitType,
          unitsPerSheet: count,
          quantity: 1,
          rate: +(rate).toFixed(2),
          amount: +(rate).toFixed(2),
        };
        return [...prev, newItem];
      }
    });
  };

  const handleUpdateQty = (cartItemId: string, delta: number) => {
    setCartItems((prev) =>
      prev
        .map((it) => {
          if (it.id === cartItemId) {
            const nextQty = it.quantity + delta;
            if (nextQty <= 0) return null;
            return {
              ...it,
              quantity: nextQty,
              amount: +(nextQty * it.rate).toFixed(2),
            };
          }
          return it;
        })
        .filter(Boolean) as BillItem[]
    );
  };

  const handleRemoveCartItem = (cartItemId: string) => {
    setCartItems((prev) => prev.filter((it) => it.id !== cartItemId));
  };

  const handleClearCart = () => {
    if (confirm("Are you sure you want to clear the current order?")) {
      setCartItems([]);
    }
  };

  // 3. Billing & Tax Math Computations
  const subtotal = useMemo(() => {
    return +(cartItems.reduce((acc, it) => acc + it.amount, 0)).toFixed(2);
  }, [cartItems]);

  const discountAmount = useMemo(() => {
    if (discountType === "percent") {
      return +((subtotal * Math.min(100, Math.max(0, discountValue))) / 100).toFixed(2);
    } else {
      return +Math.min(subtotal, Math.max(0, discountValue)).toFixed(2);
    }
  }, [subtotal, discountType, discountValue]);

  const taxableAmount = useMemo(() => {
    return +Math.max(0, subtotal - discountAmount).toFixed(2);
  }, [subtotal, discountAmount]);

  const { cgstAmount, sgstAmount, totalGstAmount } = useMemo(() => {
    if (!settings.gstEnabled || settings.gstPercentage <= 0) {
      return { cgstAmount: 0, sgstAmount: 0, totalGstAmount: 0 };
    }
    const cgst = +((taxableAmount * settings.cgstPercentage) / 100).toFixed(2);
    const sgst = +((taxableAmount * settings.sgstPercentage) / 100).toFixed(2);
    return {
      cgstAmount: cgst,
      sgstAmount: sgst,
      totalGstAmount: +(cgst + sgst).toFixed(2),
    };
  }, [taxableAmount, settings]);

  const { grandTotal, roundOff } = useMemo(() => {
    const rawTotal = taxableAmount + totalGstAmount;
    const rounded = Math.round(rawTotal);
    const diff = +(rounded - rawTotal).toFixed(2);
    return {
      grandTotal: rounded,
      roundOff: diff,
    };
  }, [taxableAmount, totalGstAmount]);

  // Cash tendered change calculation
  const cashChangeReturn = useMemo(() => {
    if (paymentMethod !== "Cash") return 0;
    const tendered = parseFloat(cashTendered) || 0;
    return Math.max(0, +(tendered - grandTotal).toFixed(2));
  }, [paymentMethod, cashTendered, grandTotal]);

  // 4. Settle Bill Handler
  const handleSettleBill = async () => {
    if (cartItems.length === 0) {
      alert("Please add at least one medicine to the bill before settling.");
      return;
    }

    setIsSettling(true);
    const now = new Date();
    const invoiceNumber = `INV-${now.getFullYear()}${(now.getMonth() + 1)
      .toString()
      .padStart(2, "0")}-${Math.floor(1000 + Math.random() * 9000)}`;

    const dateStr = now.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    const timeStr = now.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    const newInvoice: BillInvoice = {
      invoiceNo: invoiceNumber,
      date: dateStr,
      time: timeStr,
      customerName: customerName.trim() || "Walk-in Customer",
      customerPhone: customerPhone.trim() || undefined,
      doctorName: doctorName.trim() || undefined,
      items: cartItems,
      subtotal,
      discountType,
      discountValue,
      discountAmount,
      taxableAmount,
      gstEnabled: settings.gstEnabled,
      gstPercentage: settings.gstPercentage,
      cgstPercentage: settings.cgstPercentage,
      sgstPercentage: settings.sgstPercentage,
      cgstAmount,
      sgstAmount,
      totalGstAmount,
      roundOff,
      grandTotal,
      paymentMethod,
      cashTendered: paymentMethod === "Cash" ? parseFloat(cashTendered) || grandTotal : undefined,
      changeDue: paymentMethod === "Cash" ? cashChangeReturn : undefined,
      splitDetails:
        paymentMethod === "Split"
          ? {
              cash: parseFloat(splitCash) || 0,
              online: parseFloat(splitOnline) || 0,
            }
          : undefined,
      transactionRef: transactionRef.trim() || undefined,
    };

    // Deduct stock from medicines inventory
    const updatedMedicines = medicines.map((med) => {
      const itemsInCart = cartItems.filter((it) => it.medicineId === med.id);
      if (itemsInCart.length === 0) return med;

      let sheetsDeducted = 0;
      let looseDeducted = 0;

      itemsInCart.forEach((it) => {
        if (it.unitType === "sheet") sheetsDeducted += it.quantity;
        if (it.unitType === "loose") looseDeducted += it.quantity;
      });

      const count = Math.max(1, med.unitsPerSheet || 10);
      const totalPcsDeducted = sheetsDeducted * count + looseDeducted;

      let curSheets = med.sheetsStock ?? Math.floor((parseInt(String(med.stock || 0), 10) || 0) / count);
      let curLoose = med.looseStock ?? ((parseInt(String(med.stock || 0), 10) || 0) % count);
      let curTotal = curSheets * count + curLoose;

      const newTotal = Math.max(0, curTotal - totalPcsDeducted);
      const newSheets = Math.floor(newTotal / count);
      const newLoose = newTotal % count;

      const newStatus =
        newTotal === 0 ? "Out of Stock" : newTotal < 15 ? "Low Stock" : "Active";

      return {
        ...med,
        sheetsStock: newSheets,
        looseStock: newLoose,
        totalUnitsStock: newTotal,
        stock: String(newTotal),
        status: newStatus as any,
      };
    });

    setMedicines(updatedMedicines);
    try {
      localStorage.setItem("pharmacynext_medicines", JSON.stringify(updatedMedicines));
    } catch {}

    // Save invoice to localStorage history
    try {
      const existingInvoices = JSON.parse(localStorage.getItem("pharmacynext_invoices") || "[]");
      localStorage.setItem(
        "pharmacynext_invoices",
        JSON.stringify([newInvoice, ...existingInvoices])
      );
    } catch {}

    // Background Firestore Sync
    (async () => {
      try {
        await setDoc(doc(db, "invoices", invoiceNumber), {
          ...newInvoice,
          pharmacyId: currentPharmacy?.id || "default",
          createdAt: now.toISOString(),
        });
        // Update stock in Firestore
        for (const it of cartItems) {
          const med = updatedMedicines.find((m) => m.id === it.medicineId);
          if (med) {
            await setDoc(doc(db, "medicines", med.id), med, { merge: true });
          }
        }
      } catch (e) {
        console.warn("Firestore invoice settlement note:", e);
      }
    })();

    setSettledInvoice(newInvoice);
    setIsPrintModalOpen(true);
    setIsSettling(false);
  };

  const handleStartNewBill = () => {
    setCartItems([]);
    setCustomerName("Walk-in Customer");
    setCustomerPhone("");
    setDoctorName("");
    setDiscountValue(0);
    setCashTendered("");
    setSplitCash("");
    setSplitOnline("");
    setTransactionRef("");
    setSettledInvoice(null);
  };

  return (
    <div className="space-y-5 pb-10">
      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Pharmacy Billing &amp; Point of Sale
            </h1>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-100 text-[#581c87] border border-purple-200">
              Live Counter
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Select medicines, apply discounts, choose payment tender, and generate instant Thermal or A5 bills.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-purple-50 text-[#581c87] border border-purple-100 text-xs font-bold shadow-2xs">
            <Receipt className="w-4 h-4" />
            <span>
              GST: {settings.gstEnabled ? `${settings.gstPercentage}% (CGST ${settings.cgstPercentage}% + SGST ${settings.sgstPercentage}%)` : "Disabled"}
            </span>
          </div>
        </div>
      </div>

      {/* Main Billing Grid: 12 Cols */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* ============================================================ */}
        {/* LEFT COLUMN: Medicines Catalog & Instant Search (7 cols)      */}
        {/* ============================================================ */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* Search Bar & Category Chips */}
          <div className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-xs space-y-3">
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search medicine name, salt formula, brand, or batch..."
                className="w-full bg-[#f8fafc] hover:bg-[#f1f5f9] focus:bg-white text-xs text-slate-800 placeholder-slate-400 rounded-2xl pl-10 pr-10 py-3 border border-slate-200 focus:border-[#581c87] focus:outline-none transition-all font-medium"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3.5 text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Category Chips Carousel */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
              {categoriesList.slice(0, 8).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl whitespace-nowrap font-bold text-xs transition-all cursor-pointer ${
                    selectedCategory === cat
                      ? "bg-[#581c87] text-white shadow-xs"
                      : "bg-slate-100/80 hover:bg-slate-200/80 text-slate-600"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Medicines Grid / Cards */}
          <div className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-xs space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold text-slate-700">
                Available Medicines ({filteredMedicines.length})
              </span>
              <span className="text-[11px] text-slate-400">
                Click Sheet or Loose to add to bill
              </span>
            </div>

            {isLoadingMedicines ? (
              <div className="py-16 text-center text-slate-400 text-xs">
                Loading medicines inventory...
              </div>
            ) : filteredMedicines.length === 0 ? (
              <div className="py-16 text-center text-slate-500 space-y-2">
                <Pill className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs font-bold">No medicines matching your search</p>
                <p className="text-[11px] text-slate-400">
                  Try searching another salt name, or add medicines in the Medicines tab.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[620px] overflow-y-auto pr-1">
                {filteredMedicines.map((med) => {
                  const count = med.unitsPerSheet || 10;
                  const sheetRate = parseFloat(med.sheetPrice || med.sellingPrice?.replace(/[^0-9.]/g, "") || "0") || 100;
                  const unitRate = parseFloat(med.unitPrice || "0") || sheetRate / count;
                  const isOut = med.totalUnitsStock === 0;

                  return (
                    <div
                      key={med.id}
                      className="p-3.5 rounded-2xl border border-slate-200 hover:border-purple-300 hover:shadow-xs transition-all bg-slate-50/40 hover:bg-white flex flex-col justify-between gap-2.5"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-1.5">
                          <h4 className="font-bold text-slate-900 text-xs line-clamp-1">
                            {med.name}
                          </h4>
                          {med.prescriptionRequired ? (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-50 text-rose-600 border border-rose-200 shrink-0">
                              Rx
                            </span>
                          ) : (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 border border-emerald-200 shrink-0">
                              OTC
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">
                          {med.genericName}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400 font-mono">
                          <span>{count} / sheet</span>
                          <span>&bull;</span>
                          <span>B: {med.batchNumber || "N/A"}</span>
                        </div>
                      </div>

                      {/* Stock & Dual Pricing */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                        <div>
                          <span className="font-bold text-slate-900 block">
                            ₹{sheetRate.toFixed(2)}{" "}
                            <span className="text-[10px] text-slate-400 font-normal">/ sheet</span>
                          </span>
                          <span className="text-[10px] text-purple-700 font-semibold block">
                            ₹{unitRate.toFixed(2)}{" "}
                            <span className="text-[9px] text-purple-400 font-normal">/ tablet</span>
                          </span>
                        </div>

                        <div className="text-right">
                          <span
                            className={`text-[10px] font-bold block ${
                              isOut ? "text-rose-600" : "text-emerald-700"
                            }`}
                          >
                            {med.sheetsStock ?? Math.floor((med.totalUnitsStock || 0) / count)} Sheets + {med.looseStock ?? ((med.totalUnitsStock || 0) % count)} Loose
                          </span>
                          <span className="text-[9px] text-slate-400 block">
                            Total: {med.totalUnitsStock ?? 0} pcs
                          </span>
                        </div>
                      </div>

                      {/* Quick Add Buttons: Sheet vs Loose */}
                      <div className="grid grid-cols-2 gap-1.5 pt-1">
                        <button
                          type="button"
                          disabled={isOut}
                          onClick={() => handleAddToCart(med, "sheet")}
                          className="py-1.5 px-2 rounded-xl bg-[#581c87] hover:bg-[#431c8c] disabled:opacity-40 disabled:cursor-not-allowed text-white text-[11px] font-bold flex items-center justify-center gap-1 shadow-2xs transition-all cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                          <span>+ Sheet</span>
                        </button>
                        <button
                          type="button"
                          disabled={isOut}
                          onClick={() => handleAddToCart(med, "loose")}
                          className="py-1.5 px-2 rounded-xl bg-purple-50 hover:bg-purple-100 disabled:opacity-40 disabled:cursor-not-allowed text-[#581c87] border border-purple-200 text-[11px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                          <span>+ Loose</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ============================================================ */}
        {/* RIGHT COLUMN: Order Summary, Cart, GST & Settle (5 cols)     */}
        {/* ============================================================ */}
        <div className="lg:col-span-5 space-y-4">
          
          <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-4 sticky top-20">
            {/* Cart Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-purple-50 text-[#581c87] border border-purple-100 flex items-center justify-center shadow-xs">
                  <ShoppingCart className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Order Summary
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    {cartItems.length} items added
                  </span>
                </div>
              </div>

              {cartItems.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearCart}
                  className="text-[11px] text-rose-500 hover:text-rose-700 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Clear All</span>
                </button>
              )}
            </div>

            {/* Customer Details Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs p-3 bg-slate-50/70 rounded-2xl border border-slate-200/70">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1 flex items-center gap-1">
                  <User className="w-3 h-3" /> Customer Name:
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Patient Name"
                  className="w-full px-2.5 py-1.5 bg-white rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-[#581c87]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1 flex items-center gap-1">
                  <Phone className="w-3 h-3" /> Mobile Number:
                </label>
                <input
                  type="text"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="Phone (optional)"
                  className="w-full px-2.5 py-1.5 bg-white rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#581c87]"
                />
              </div>

              <div className="sm:col-span-2 pt-1">
                <label className="block text-[10px] font-bold text-slate-500 mb-1 flex items-center gap-1">
                  <Stethoscope className="w-3 h-3" /> Prescribing Doctor:
                </label>
                <input
                  type="text"
                  value={doctorName}
                  onChange={(e) => setDoctorName(e.target.value)}
                  placeholder="Dr. Name / Hospital (optional)"
                  className="w-full px-2.5 py-1.5 bg-white rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#581c87]"
                />
              </div>
            </div>

            {/* Added Items Table / List */}
            <div className="border border-slate-200/80 rounded-2xl overflow-hidden max-h-56 overflow-y-auto divide-y divide-slate-100 text-xs">
              {cartItems.length === 0 ? (
                <div className="p-8 text-center text-slate-400 space-y-1">
                  <ShoppingCart className="w-6 h-6 mx-auto text-slate-300" />
                  <p className="text-xs font-semibold">Cart is currently empty</p>
                  <p className="text-[11px] text-slate-400">
                    Click + Sheet or + Loose on any medicine on the left to add items.
                  </p>
                </div>
              ) : (
                cartItems.map((it) => (
                  <div key={it.id} className="p-3 flex items-center justify-between gap-2 hover:bg-slate-50/50">
                    <div className="flex-1 min-w-0 pr-2">
                      <h5 className="font-bold text-slate-900 text-xs truncate">
                        {it.name}
                      </h5>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                        <span className="px-1.5 py-0.2 rounded bg-purple-50 text-purple-700 font-semibold">
                          {it.unitType === "sheet" ? "Full Sheet" : "Loose Tablet"}
                        </span>
                        <span>₹{it.rate.toFixed(2)} ea</span>
                      </div>
                    </div>

                    {/* Qty changer */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleUpdateQty(it.id, -1)}
                        className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold transition-colors cursor-pointer"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-6 text-center font-extrabold text-xs text-slate-900">
                        {it.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleUpdateQty(it.id, 1)}
                        className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold transition-colors cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Amount & Delete */}
                    <div className="text-right shrink-0 flex items-center gap-2">
                      <span className="font-extrabold text-slate-900 text-xs w-16">
                        ₹{it.amount.toFixed(2)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveCartItem(it.id)}
                        className="text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                        title="Remove item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Discount & GST Controls */}
            <div className="p-3 bg-purple-50/40 rounded-2xl border border-purple-100/80 space-y-3 text-xs">
              {/* Discount Selector */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-700 text-[11px]">Apply Discount:</span>
                  <div className="inline-flex p-0.5 rounded-lg bg-white border border-purple-200">
                    <button
                      type="button"
                      onClick={() => setDiscountType("percent")}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold cursor-pointer ${
                        discountType === "percent"
                          ? "bg-[#581c87] text-white"
                          : "text-slate-600"
                      }`}
                    >
                      %
                    </button>
                    <button
                      type="button"
                      onClick={() => setDiscountType("rupees")}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold cursor-pointer ${
                        discountType === "rupees"
                          ? "bg-[#581c87] text-white"
                          : "text-slate-600"
                      }`}
                    >
                      ₹
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="0"
                    max={discountType === "percent" ? "100" : String(subtotal)}
                    value={discountValue || ""}
                    onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="w-20 px-2.5 py-1 text-right bg-white rounded-lg border border-purple-200 font-bold text-slate-900 text-xs focus:outline-none focus:border-[#581c87]"
                  />
                  {discountAmount > 0 && (
                    <span className="text-[10px] text-rose-600 font-bold">
                      (-₹{discountAmount.toFixed(2)})
                    </span>
                  )}
                </div>
              </div>

              {/* Financial Calculation Breakdown */}
              <div className="pt-2 border-t border-purple-100 space-y-1 text-[11px]">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span>₹{subtotal.toFixed(2)}</span>
                </div>

                {discountAmount > 0 && (
                  <div className="flex justify-between text-rose-600 font-medium">
                    <span>Discount:</span>
                    <span>- ₹{discountAmount.toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between text-slate-700 font-medium">
                  <span>Taxable Amount:</span>
                  <span>₹{taxableAmount.toFixed(2)}</span>
                </div>

                {settings.gstEnabled ? (
                  <>
                    <div className="flex justify-between text-purple-900">
                      <span>CGST ({settings.cgstPercentage}%):</span>
                      <span>+ ₹{cgstAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-purple-900">
                      <span>SGST ({settings.sgstPercentage}%):</span>
                      <span>+ ₹{sgstAmount.toFixed(2)}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between text-slate-400 text-[10px]">
                    <span>GST (Disabled in Settings):</span>
                    <span>₹0.00</span>
                  </div>
                )}

                {roundOff !== 0 && (
                  <div className="flex justify-between text-slate-400 text-[10px]">
                    <span>Round off:</span>
                    <span>{roundOff > 0 ? `+₹${roundOff}` : `-₹${Math.abs(roundOff)}`}</span>
                  </div>
                )}

                <div className="flex justify-between items-center pt-2 border-t border-purple-200">
                  <span className="text-xs font-black text-slate-900">
                    Grand Total:
                  </span>
                  <span className="text-xl font-black text-[#581c87]">
                    ₹{grandTotal.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-2">
              <label className="block text-[11px] font-bold text-slate-700">
                Payment Method:
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { id: "UPI", label: "UPI", icon: QrCode },
                  { id: "Cash", label: "Cash", icon: Banknote },
                  { id: "Card", label: "Card", icon: CreditCard },
                  { id: "Split", label: "Split", icon: Split },
                ].map((item) => {
                  const Icon = item.icon;
                  const isSelected = paymentMethod === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setPaymentMethod(item.id as any)}
                      className={`p-2 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-1 border transition-all cursor-pointer ${
                        isSelected
                          ? "bg-[#581c87] text-white border-[#581c87] shadow-xs"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-[11px]">{item.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Tender Details based on Selected Payment Method */}
              {paymentMethod === "Cash" && (
                <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200 text-xs space-y-2 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-900">Cash Tendered:</span>
                    <input
                      type="number"
                      value={cashTendered}
                      onChange={(e) => setCashTendered(e.target.value)}
                      placeholder={String(grandTotal)}
                      className="w-28 px-2.5 py-1 text-right rounded-lg border border-emerald-300 bg-white font-bold text-slate-900 focus:outline-none"
                    />
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-emerald-200 text-emerald-900 font-bold">
                    <span>Change Return:</span>
                    <span className="text-sm font-black text-emerald-700">
                      ₹{cashChangeReturn.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              {paymentMethod === "UPI" && (
                <div className="p-3 bg-purple-50/60 rounded-xl border border-purple-200 text-xs space-y-2 animate-in fade-in">
                  <div className="flex items-center justify-between text-[11px] text-purple-900 font-medium">
                    <span>UPI ID: <strong>{settings.email || "pharmacy@upi"}</strong></span>
                    <span className="text-purple-600 font-bold">Ready for scan</span>
                  </div>
                  <input
                    type="text"
                    value={transactionRef}
                    onChange={(e) => setTransactionRef(e.target.value)}
                    placeholder="Transaction / UTR Reference No. (optional)"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-purple-200 bg-white text-xs font-mono focus:outline-none"
                  />
                </div>
              )}

              {paymentMethod === "Card" && (
                <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200 text-xs space-y-2 animate-in fade-in">
                  <input
                    type="text"
                    value={transactionRef}
                    onChange={(e) => setTransactionRef(e.target.value)}
                    placeholder="Card Approval / Auth Code (optional)"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-blue-200 bg-white text-xs font-mono focus:outline-none"
                  />
                </div>
              )}

              {paymentMethod === "Split" && (
                <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200 text-xs space-y-2 animate-in fade-in">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-amber-900 block mb-0.5">
                        Cash Paid:
                      </label>
                      <input
                        type="number"
                        value={splitCash}
                        onChange={(e) => setSplitCash(e.target.value)}
                        placeholder="₹ Cash"
                        className="w-full px-2 py-1 rounded-lg border border-amber-300 bg-white font-bold text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-amber-900 block mb-0.5">
                        UPI / Card Paid:
                      </label>
                      <input
                        type="number"
                        value={splitOnline}
                        onChange={(e) => setSplitOnline(e.target.value)}
                        placeholder="₹ Online"
                        className="w-full px-2 py-1 rounded-lg border border-amber-300 bg-white font-bold text-xs"
                      />
                    </div>
                  </div>
                  <div className="flex justify-between text-[10px] text-amber-800 font-bold">
                    <span>Split Sum: ₹{((parseFloat(splitCash) || 0) + (parseFloat(splitOnline) || 0)).toFixed(2)}</span>
                    <span>Target: ₹{grandTotal.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Settle Bill Button */}
            <button
              type="button"
              disabled={cartItems.length === 0 || isSettling}
              onClick={handleSettleBill}
              className="w-full py-3.5 rounded-2xl bg-[#581c87] hover:bg-[#431c8c] disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-sm tracking-wide shadow-lg shadow-purple-900/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Receipt className="w-5 h-5" />
              <span>
                {isSettling ? "Settling Invoice..." : `Settle Bill (₹${grandTotal.toFixed(2)})`}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Bill Print Selection Modal (Thermal vs A5) */}
      <BillPrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        invoice={settledInvoice}
        settings={settings}
        onStartNewBill={handleStartNewBill}
      />
    </div>
  );
}
