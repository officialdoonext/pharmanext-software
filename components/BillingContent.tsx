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
  ChevronDown,
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  UserPlus,
  X,
  MapPin,
  Clock,
  Bookmark,
  FileText,
  ArrowRight,
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
import {
  CustomerRecord,
  fetchPharmacyCustomers,
  savePharmacyCustomer,
} from "@/lib/customer-service";
import { maskPhoneNumber } from "@/lib/thermal-printer";
import BillPrintModal, { BillItem, BillInvoice } from "./BillPrintModal";

export interface DraftBill {
  id: string;
  draftNumber: string;
  createdAt: string;
  date: string;
  time: string;
  customerName: string;
  customerPhone?: string;
  doctorName?: string;
  selectedCustomer?: CustomerRecord | null;
  items: BillItem[];
  subtotal: number;
  discountType: "rupees" | "percent";
  discountValue: number;
  grandTotal: number;
  pharmacyId?: string;
}

const getMedicinesStorageKey = (pharmacyId?: string) =>
  pharmacyId ? `pharmacynext_medicines_${pharmacyId}` : "pharmacynext_medicines_default";

const getInvoicesStorageKey = (pharmacyId?: string) =>
  pharmacyId ? `pharmacynext_invoices_${pharmacyId}` : "pharmacynext_invoices_default";

const getDraftsStorageKey = (pharmacyId?: string) =>
  pharmacyId ? `pharmacynext_drafts_${pharmacyId}` : "pharmacynext_drafts_default";

export default function BillingContent() {
  const { currentPharmacy } = useAuth();
  
  // Store Settings & GST configuration
  const [settings, setSettings] = useState<PharmacySettings>(() =>
    getLocalPharmacySettings(currentPharmacy?.id, currentPharmacy || undefined)
  );
  
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

  // Customer Search & Selection states
  const [customerList, setCustomerList] = useState<CustomerRecord[]>([]);
  const [customerSearchInput, setCustomerSearchInput] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerRecord | null>(null);
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  const [isAddCustomerModalOpen, setIsAddCustomerModalOpen] = useState(false);
  const [modalCustomerName, setModalCustomerName] = useState("");
  const [modalCustomerPhone, setModalCustomerPhone] = useState("");
  const [modalCustomerCity, setModalCustomerCity] = useState("");

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

  // Saved Draft Bills state (per-pharmacy)
  const [draftBills, setDraftBills] = useState<DraftBill[]>([]);
  const [isDraftsModalOpen, setIsDraftsModalOpen] = useState(false);

  // 1. Load Settings, Medicines, and Customers on mount or pharmacy change
  useEffect(() => {
    let isMounted = true;
    const pharmacyId = currentPharmacy?.id;
    const medStoreKey = getMedicinesStorageKey(pharmacyId);
    const draftsKey = getDraftsStorageKey(pharmacyId);

    async function initData() {
      // Fetch settings strictly for current pharmacy
      const st = await fetchRemotePharmacySettings(pharmacyId, currentPharmacy || undefined);
      if (isMounted) {
        setSettings(st);
      }

      // Fetch saved draft bills strictly for current pharmacy
      if (typeof window !== "undefined") {
        try {
          const savedDrafts = localStorage.getItem(draftsKey);
          if (isMounted) {
            setDraftBills(savedDrafts ? JSON.parse(savedDrafts) : []);
          }
        } catch {
          if (isMounted) setDraftBills([]);
        }
      }

      // Fetch customers strictly for current pharmacy
      try {
        const custList = await fetchPharmacyCustomers(pharmacyId);
        if (isMounted) {
          setCustomerList(custList);
        }
      } catch (custErr) {
        console.warn("Billing customers load:", custErr);
      }

      // Fetch medicines strictly for current pharmacy
      setIsLoadingMedicines(true);
      try {
        let medQuery;
        if (pharmacyId) {
          medQuery = query(
            collection(db, "medicines"),
            where("pharmacyId", "==", pharmacyId)
          );
        } else {
          medQuery = collection(db, "medicines");
        }

        const snapshot = await getDocs(medQuery);
        if (isMounted && !snapshot.empty) {
          const fetched: MedicineItem[] = [];
          snapshot.forEach((docSnap) => fetched.push(docSnap.data() as MedicineItem));
          const clean = purgeDummyMedicines(fetched);
          setMedicines(clean);
          if (typeof window !== "undefined") {
            localStorage.setItem(medStoreKey, JSON.stringify(clean));
          }
        } else if (isMounted) {
          // Check outlet-specific local cache only
          if (typeof window !== "undefined") {
            const saved = localStorage.getItem(medStoreKey);
            if (saved) {
              try {
                setMedicines(purgeDummyMedicines(JSON.parse(saved)));
              } catch {
                setMedicines([]);
              }
            } else {
              setMedicines([]);
            }
          } else {
            setMedicines([]);
          }
        }
      } catch (e) {
        console.warn("Billing medicines load error:", e);
        if (isMounted) {
          if (typeof window !== "undefined") {
            const saved = localStorage.getItem(medStoreKey);
            if (saved) {
              try {
                setMedicines(purgeDummyMedicines(JSON.parse(saved)));
              } catch {
                setMedicines([]);
              }
            } else {
              setMedicines([]);
            }
          } else {
            setMedicines([]);
          }
        }
      } finally {
        if (isMounted) {
          setIsLoadingMedicines(false);
        }
      }
    }
    initData();

    return () => {
      isMounted = false;
    };
  }, [currentPharmacy]);

  // Filtered matching customers for the search dropdown
  const matchingCustomers = useMemo(() => {
    const q = customerSearchInput.toLowerCase().trim();
    if (!q) return customerList.slice(0, 6);
    return customerList.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        (c.city && c.city.toLowerCase().includes(q))
    );
  }, [customerList, customerSearchInput]);

  const handleSelectCustomer = (c: CustomerRecord | null) => {
    if (!c) {
      setSelectedCustomer(null);
      setCustomerName("Walk-in Customer");
      setCustomerPhone("");
    } else {
      setSelectedCustomer(c);
      setCustomerName(c.name);
      setCustomerPhone(c.phone);
    }
    setIsCustomerDropdownOpen(false);
    setCustomerSearchInput("");
  };

  const handleSaveAndSelectCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalCustomerName.trim() || !modalCustomerPhone.trim()) return;

    try {
      const saved = await savePharmacyCustomer(currentPharmacy?.id, {
        name: modalCustomerName.trim(),
        phone: modalCustomerPhone.trim(),
        city: modalCustomerCity.trim(),
      });

      setCustomerList((prev) => [saved, ...prev.filter((c) => c.phone !== saved.phone)]);
      handleSelectCustomer(saved);
      setModalCustomerName("");
      setModalCustomerPhone("");
      setModalCustomerCity("");
      setIsAddCustomerModalOpen(false);
    } catch (err) {
      console.error("Failed to save and select customer:", err);
    }
  };

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

  const ITEMS_PER_PAGE = 24;
  const [currentPage, setCurrentPage] = useState(1);

  // Reset to first page on search or category filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory]);

  const totalPages = Math.max(1, Math.ceil(filteredMedicines.length / ITEMS_PER_PAGE));

  const paginatedMedicines = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredMedicines.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredMedicines, currentPage]);

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

  const handleToggleUnitType = (cartItemId: string) => {
    setCartItems((prev) =>
      prev.map((it) => {
        if (it.id !== cartItemId) return it;
        const med = medicines.find((m) => m.id === it.medicineId);
        const nextUnitType = it.unitType === "sheet" ? "loose" : "sheet";
        const count = it.unitsPerSheet || 10;
        const sheetRate = med
          ? parseFloat(med.sheetPrice || med.sellingPrice?.replace(/[^0-9.]/g, "") || "0") || 100
          : it.rate;
        const unitRate = med
          ? parseFloat(med.unitPrice || "0") || sheetRate / count
          : it.rate / count;
        const newRate = nextUnitType === "sheet" ? sheetRate : unitRate;
        return {
          ...it,
          unitType: nextUnitType,
          rate: +newRate.toFixed(2),
          amount: +(it.quantity * newRate).toFixed(2),
        };
      })
    );
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

  // 4. Draft Bills Handlers (Local per-pharmacy storage)
  const handleDraftBill = () => {
    if (cartItems.length === 0) {
      alert("Please add at least one medicine to the bill before drafting.");
      return;
    }

    const now = new Date();
    const draftNumber = `DFT-${now.getFullYear()}${(now.getMonth() + 1)
      .toString()
      .padStart(2, "0")}${now.getDate().toString().padStart(2, "0")}-${Math.floor(1000 + Math.random() * 9000)}`;

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

    const newDraft: DraftBill = {
      id: `draft_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      draftNumber,
      createdAt: now.toISOString(),
      date: dateStr,
      time: timeStr,
      customerName: customerName.trim() || "Walk-in Customer",
      customerPhone: customerPhone.trim() || undefined,
      doctorName: doctorName.trim() || undefined,
      selectedCustomer: selectedCustomer || null,
      items: [...cartItems],
      subtotal,
      discountType,
      discountValue,
      grandTotal,
      pharmacyId: currentPharmacy?.id,
    };

    const updatedDrafts = [newDraft, ...draftBills];
    setDraftBills(updatedDrafts);
    const draftsKey = getDraftsStorageKey(currentPharmacy?.id);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(draftsKey, JSON.stringify(updatedDrafts));
      } catch (e) {
        console.error("Failed to save draft to localStorage:", e);
      }
    }

    // Reset current bill counter
    setCartItems([]);
    setCustomerName("Walk-in Customer");
    setCustomerPhone("");
    setDoctorName("");
    setSelectedCustomer(null);
    setCustomerSearchInput("");
    setDiscountValue(0);
    setCashTendered("");
    setSplitCash("");
    setSplitOnline("");
    setTransactionRef("");

    alert(`Bill successfully saved as draft (${draftNumber}). You can access it anytime from 'Saved Bills' above.`);
  };

  const handleSelectDraft = (draft: DraftBill) => {
    if (cartItems.length > 0) {
      const confirmOverwrite = confirm(
        "Loading this draft will replace the items currently in your counter. Do you want to continue?"
      );
      if (!confirmOverwrite) return;
    }

    // Restore draft to active bill counter
    setCartItems(draft.items);
    setCustomerName(draft.customerName || "Walk-in Customer");
    setCustomerPhone(draft.customerPhone || "");
    setDoctorName(draft.doctorName || "");
    setSelectedCustomer(draft.selectedCustomer || null);
    if (draft.selectedCustomer) {
      setCustomerSearchInput(draft.selectedCustomer.name);
    } else {
      setCustomerSearchInput("");
    }
    setDiscountType(draft.discountType || "percent");
    setDiscountValue(draft.discountValue || 0);

    // Remove the resumed draft from saved list
    const updatedDrafts = draftBills.filter((d) => d.id !== draft.id);
    setDraftBills(updatedDrafts);
    const draftsKey = getDraftsStorageKey(currentPharmacy?.id);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(draftsKey, JSON.stringify(updatedDrafts));
      } catch {}
    }

    setIsDraftsModalOpen(false);
  };

  const handleDeleteDraft = (draftId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!confirm("Are you sure you want to delete this draft bill?")) return;

    const updatedDrafts = draftBills.filter((d) => d.id !== draftId);
    setDraftBills(updatedDrafts);
    const draftsKey = getDraftsStorageKey(currentPharmacy?.id);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(draftsKey, JSON.stringify(updatedDrafts));
      } catch {}
    }
  };

  const handleClearAllDrafts = () => {
    if (!confirm("Are you sure you want to clear all saved drafts?")) return;
    setDraftBills([]);
    const draftsKey = getDraftsStorageKey(currentPharmacy?.id);
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(draftsKey);
      } catch {}
    }
  };

  // 5. Settle Bill Handler
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
      pharmacyId: currentPharmacy?.id || undefined,
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

    const pharmacyId = currentPharmacy?.id;
    const medStoreKey = getMedicinesStorageKey(pharmacyId);
    const invoicesStoreKey = getInvoicesStorageKey(pharmacyId);

    setMedicines(updatedMedicines);
    try {
      localStorage.setItem(medStoreKey, JSON.stringify(updatedMedicines));
    } catch {}

    // Save invoice to outlet-specific localStorage history
    try {
      const existingInvoices = JSON.parse(localStorage.getItem(invoicesStoreKey) || "[]");
      localStorage.setItem(
        invoicesStoreKey,
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
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-100 text-[#5E2B9D] border border-purple-200">
              Live Counter
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Select medicines, apply discounts, choose payment tender, and generate instant Thermal or A5 bills.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsDraftsModalOpen(true)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-md border text-xs font-medium shadow-2xs transition-all cursor-pointer ${
              draftBills.length > 0
                ? "bg-purple-50 text-[#5E2B9D] border-purple-200 hover:bg-purple-100/70"
                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
            }`}
            title="View locally saved draft bills"
          >
            <Clock className="w-4 h-4 text-[#5E2B9D]" />
            <span>Saved Bills</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                draftBills.length > 0
                  ? "bg-[#5E2B9D] text-white"
                  : "bg-slate-100 text-slate-500"
              }`}
            >
              {draftBills.length}
            </span>
          </button>

          <div className="flex items-center gap-2 px-3.5 py-2 rounded-md bg-purple-50 text-[#5E2B9D] border border-purple-100 text-xs font-medium shadow-2xs">
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
                className="w-full bg-[#f8fafc] hover:bg-[#f1f5f9] focus:bg-white text-xs text-slate-800 placeholder-slate-400 rounded-2xl pl-10 pr-10 py-3 border border-slate-200 focus:border-[#5E2B9D] focus:outline-none transition-all font-medium"
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
                      ? "bg-[#5E2B9D] text-white shadow-xs"
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
              <span className="text-xs font-medium text-slate-700">
                Available Medicines ({filteredMedicines.length})
                {filteredMedicines.length > ITEMS_PER_PAGE && (
                  <span className="text-slate-400 ml-1.5 font-normal">
                    • Page {currentPage} of {totalPages} (24 per page)
                  </span>
                )}
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
                {paginatedMedicines.map((med) => {
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

                      {/* Quick Add Buttons: Both Sheet and Loose (with single + each) */}
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <button
                          type="button"
                          disabled={isOut}
                          onClick={() => handleAddToCart(med, "sheet")}
                          className="h-9 px-2.5 rounded-md bg-[#5E2B9D] hover:bg-[#4D2382] disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-medium flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                          title="Add 1 Sheet to bill"
                        >
                          <Plus className="w-3.5 h-3.5 shrink-0" />
                          <span>Sheet</span>
                        </button>
                        <button
                          type="button"
                          disabled={isOut}
                          onClick={() => handleAddToCart(med, "loose")}
                          className="h-9 px-2.5 rounded-md bg-purple-50 hover:bg-purple-100 disabled:opacity-40 disabled:cursor-not-allowed text-[#5E2B9D] border border-purple-200 text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                          title="Add 1 Loose Unit to bill"
                        >
                          <Plus className="w-3.5 h-3.5 shrink-0" />
                          <span>Loose</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination Controls (24 per page) */}
            {totalPages > 1 && (
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between select-none">
                <span className="text-[11px] text-slate-500 font-normal">
                  Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredMedicines.length)} of {filteredMedicines.length}
                </span>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(1)}
                    title="First page"
                    className="w-8 h-8 rounded-md border border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <ChevronsLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    title="Previous page"
                    className="h-8 px-2.5 rounded-md border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Prev</span>
                  </button>

                  {/* Page number buttons */}
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum = i + 1;
                    if (totalPages > 5 && currentPage > 3) {
                      pageNum = currentPage - 2 + i;
                      if (pageNum > totalPages) pageNum = totalPages - (4 - i);
                    }
                    return (
                      <button
                        key={pageNum}
                        type="button"
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-8 h-8 rounded-md text-xs font-medium flex items-center justify-center transition-all cursor-pointer ${
                          currentPage === pageNum
                            ? "bg-[#5E2B9D] text-white shadow-xs"
                            : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    title="Next page"
                    className="h-8 px-2.5 rounded-md border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(totalPages)}
                    title="Last page"
                    className="w-8 h-8 rounded-md border border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <ChevronsRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ============================================================ */}
        {/* RIGHT COLUMN: Order Summary, Cart, GST & Settle (5 cols)     */}
        {/* ============================================================ */}
        <div className="lg:col-span-5 space-y-4">
          
          <div className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-xs space-y-3 sticky top-20">
            {/* Cart Header */}
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-md bg-purple-50 text-[#5E2B9D] border border-purple-100 flex items-center justify-center shadow-xs">
                  <ShoppingCart className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-slate-900">
                    Order Summary
                  </h3>
                  <span className="text-[10px] text-slate-400">
                    {cartItems.length} items added
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {draftBills.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setIsDraftsModalOpen(true)}
                    className="text-[11px] text-[#5E2B9D] hover:text-[#4D2382] font-medium flex items-center gap-1 cursor-pointer bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200"
                    title="View and restore saved draft bills"
                  >
                    <Clock className="w-3 h-3" />
                    <span>Saved ({draftBills.length})</span>
                  </button>
                )}

                {cartItems.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearCart}
                    className="text-[11px] text-rose-500 hover:text-rose-700 font-medium flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Clear All</span>
                  </button>
                )}
              </div>
            </div>

            {/* Customer Search & Selection */}
            <div className="p-2.5 bg-slate-50/70 rounded-md border border-slate-200/70 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-medium text-slate-600 flex items-center gap-1">
                  <User className="w-3 h-3 text-[#5E2B9D]" /> Customer / Patient:
                </label>
                {selectedCustomer && (
                  <button
                    type="button"
                    onClick={() => handleSelectCustomer(null)}
                    className="text-[10px] text-[#5E2B9D] hover:underline cursor-pointer"
                  >
                    Change Customer
                  </button>
                )}
              </div>

              {selectedCustomer ? (
                <div className="flex items-center justify-between p-2 bg-white rounded-md border border-purple-200 shadow-2xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-purple-100 text-[#5E2B9D] flex items-center justify-center text-xs font-medium shrink-0">
                      {selectedCustomer.name.slice(0, 1).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium text-slate-900 text-xs truncate">
                        {selectedCustomer.name}
                      </div>
                      <div className="text-[10px] text-slate-500 truncate">
                        {selectedCustomer.phone}
                        {selectedCustomer.city ? ` • ${selectedCustomer.city}` : ""}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSelectCustomer(null)}
                    className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                    title="Remove / Change"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <div className="flex items-center gap-1.5">
                    <div className="relative flex-1">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={customerSearchInput}
                        onChange={(e) => {
                          setCustomerSearchInput(e.target.value);
                          setIsCustomerDropdownOpen(true);
                        }}
                        onFocus={() => setIsCustomerDropdownOpen(true)}
                        placeholder="Search by mobile number or name..."
                        className="w-full pl-8 pr-3 py-1.5 bg-white rounded-md border border-slate-200 text-xs focus:outline-hidden focus:border-[#5E2B9D]"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const isDigits = /^\d+$/.test(customerSearchInput.trim());
                        setModalCustomerName(isDigits ? "" : customerSearchInput.trim());
                        setModalCustomerPhone(isDigits ? customerSearchInput.trim() : "");
                        setModalCustomerCity("");
                        setIsAddCustomerModalOpen(true);
                        setIsCustomerDropdownOpen(false);
                      }}
                      className="px-2.5 py-1.5 rounded-md bg-[#5E2B9D] hover:bg-[#4D2382] text-white text-xs font-medium transition-colors shrink-0 flex items-center gap-1 cursor-pointer shadow-xs"
                      title="Add New Customer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add</span>
                    </button>
                  </div>

                  {/* Search Dropdown */}
                  {isCustomerDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-md shadow-lg z-30 max-h-56 overflow-y-auto divide-y divide-slate-100">
                      {/* Walk-in Customer Option */}
                      <div
                        onClick={() => handleSelectCustomer(null)}
                        className="p-2 hover:bg-purple-50 cursor-pointer flex items-center justify-between transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span className="text-xs text-slate-700 font-medium">Walk-in Customer</span>
                        </div>
                        <span className="text-[10px] text-slate-400">Default</span>
                      </div>

                      {matchingCustomers.length > 0 ? (
                        matchingCustomers.map((c) => (
                          <div
                            key={c.id}
                            onClick={() => handleSelectCustomer(c)}
                            className="p-2 hover:bg-purple-50 cursor-pointer flex items-center justify-between transition-colors"
                          >
                            <div>
                              <div className="text-xs font-medium text-slate-900">{c.name}</div>
                              <div className="text-[10px] text-slate-500">
                                {c.phone} {c.city ? `• ${c.city}` : ""}
                              </div>
                            </div>
                            <span className="text-[10px] text-[#5E2B9D] font-medium bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                              Select
                            </span>
                          </div>
                        ))
                      ) : customerSearchInput.trim() ? (
                        <div className="p-3 text-center text-xs text-slate-500">
                          <p className="text-[11px]">No customer found for &quot;{customerSearchInput}&quot;</p>
                          <button
                            type="button"
                            onClick={() => {
                              const isDigits = /^\d+$/.test(customerSearchInput.trim());
                              setModalCustomerName(isDigits ? "" : customerSearchInput.trim());
                              setModalCustomerPhone(isDigits ? customerSearchInput.trim() : "");
                              setModalCustomerCity("");
                              setIsAddCustomerModalOpen(true);
                              setIsCustomerDropdownOpen(false);
                            }}
                            className="mt-2 inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-[#5E2B9D] text-white text-xs font-medium hover:bg-[#4D2382] transition-colors cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Add Customer</span>
                          </button>
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              )}

              {/* Prescribing Doctor input */}
              <div>
                <label className="block text-[10px] font-medium text-slate-500 mb-0.5 flex items-center gap-1">
                  <Stethoscope className="w-3 h-3" /> Prescribing Doctor:
                </label>
                <input
                  type="text"
                  value={doctorName}
                  onChange={(e) => setDoctorName(e.target.value)}
                  placeholder="Dr. Name / Hospital (optional)"
                  className="w-full px-2.5 py-1.5 bg-white rounded-md border border-slate-200 text-xs focus:outline-hidden focus:border-[#5E2B9D]"
                />
              </div>
            </div>

            {/* Added Items Table / List */}
            <div className="border border-slate-200/80 rounded-md overflow-hidden max-h-52 overflow-y-auto divide-y divide-slate-100 text-xs">
              {cartItems.length === 0 ? (
                <div className="py-5 px-4 text-center text-slate-400 space-y-1">
                  <ShoppingCart className="w-5 h-5 mx-auto text-slate-300" />
                  <p className="text-xs font-medium">Cart is currently empty</p>
                  <p className="text-[10px] text-slate-400">
                    Click Sheet or Loose on any medicine on the left to add items.
                  </p>
                </div>
              ) : (
                cartItems.map((it) => (
                  <div key={it.id} className="p-3 flex items-center justify-between gap-2 hover:bg-slate-50/50">
                    <div className="flex-1 min-w-0 pr-2">
                      <h5 className="font-medium text-slate-900 text-xs truncate">
                        {it.name}
                      </h5>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                        <button
                          type="button"
                          onClick={() => handleToggleUnitType(it.id)}
                          className="px-2 py-0.5 rounded bg-purple-50 hover:bg-purple-100 text-[#5E2B9D] border border-purple-200 font-medium cursor-pointer transition-colors flex items-center gap-1"
                          title="Click to toggle between Sheet and Loose"
                        >
                          <span>{it.unitType === "sheet" ? "Full Sheet" : "Loose Tablet"}</span>
                          <ChevronDown className="w-2.5 h-2.5" />
                        </button>
                        <span>₹{it.rate.toFixed(2)} ea</span>
                      </div>
                    </div>

                    {/* Qty changer */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleUpdateQty(it.id, -1)}
                        className="w-6 h-6 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-medium transition-colors cursor-pointer"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-6 text-center font-medium text-xs text-slate-900">
                        {it.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleUpdateQty(it.id, 1)}
                        className="w-6 h-6 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-medium transition-colors cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Amount & Delete */}
                    <div className="text-right shrink-0">
                      <span className="font-medium text-slate-900 block">
                        ₹{it.amount.toFixed(2)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveCartItem(it.id)}
                        className="text-slate-400 hover:text-rose-600 transition-colors p-0.5 cursor-pointer mt-0.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Discounts, Tax & Totals Breakdown Card */}
            <div className="p-4 bg-purple-50/40 rounded-2xl border border-purple-100 space-y-3">
              {/* Discount Section */}
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-700">Discount:</span>
                  <div className="flex items-center rounded-md border border-purple-200 bg-white overflow-hidden p-0.5">
                    <button
                      type="button"
                      onClick={() => setDiscountType("percent")}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-medium cursor-pointer ${
                        discountType === "percent"
                          ? "bg-[#5E2B9D] text-white"
                          : "text-slate-600"
                      }`}
                    >
                      %
                    </button>
                    <button
                      type="button"
                      onClick={() => setDiscountType("rupees")}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-medium cursor-pointer ${
                        discountType === "rupees"
                          ? "bg-[#5E2B9D] text-white"
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
                    className="w-20 px-2.5 py-1 text-right bg-white rounded-md border border-purple-200 font-medium text-slate-900 text-xs focus:outline-none focus:border-[#5E2B9D]"
                  />
                  {discountAmount > 0 && (
                    <span className="text-[10px] text-rose-600 font-medium">
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
                  <span className="text-xs font-medium text-slate-900">
                    Grand Total:
                  </span>
                  <span className="text-xl font-medium text-[#5E2B9D]">
                    ₹{grandTotal.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-2">
              <label className="block text-[11px] font-medium text-slate-700">
                Payment Method:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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
                      className={`h-10 px-3 py-2 rounded-md text-xs font-medium flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                        isSelected
                          ? "bg-[#5E2B9D] text-white border-[#5E2B9D] shadow-xs"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="text-xs font-medium">{item.label}</span>
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

            {/* Action Buttons: Draft Bill & Settle Bill */}
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                disabled={cartItems.length === 0}
                onClick={handleDraftBill}
                className="col-span-1 h-10 rounded-md bg-slate-100 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed text-slate-700 font-medium text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-slate-200"
                title="Save this bill locally as draft and clear counter"
              >
                <Bookmark className="w-3.5 h-3.5 text-slate-500" />
                <span>Draft Bill</span>
              </button>

              <button
                type="button"
                disabled={cartItems.length === 0 || isSettling}
                onClick={handleSettleBill}
                className="col-span-2 h-10 rounded-md bg-[#5E2B9D] hover:bg-[#4D2382] disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
              >
                <Receipt className="w-4 h-4" />
                <span>
                  {isSettling ? "Settling Invoice..." : `Settle Bill (₹${grandTotal.toFixed(2)})`}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Add Customer Modal */}
      {isAddCustomerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-md border border-slate-200 shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-[#5E2B9D]" />
                <h3 className="text-base font-medium text-slate-900">Add Customer</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddCustomerModalOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAndSelectCustomer} className="space-y-3.5 mt-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Customer Name *
                </label>
                <input
                  type="text"
                  required
                  value={modalCustomerName}
                  onChange={(e) => setModalCustomerName(e.target.value)}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-xs focus:outline-hidden focus:border-[#5E2B9D] focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Mobile Number *
                </label>
                <input
                  type="tel"
                  required
                  value={modalCustomerPhone}
                  onChange={(e) => setModalCustomerPhone(e.target.value)}
                  placeholder="10-digit mobile number"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-xs focus:outline-hidden focus:border-[#5E2B9D] focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  City <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={modalCustomerCity}
                  onChange={(e) => setModalCustomerCity(e.target.value)}
                  placeholder="e.g. Hyderabad / Bangalore"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-xs focus:outline-hidden focus:border-[#5E2B9D] focus:bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddCustomerModalOpen(false)}
                  className="px-4 py-2 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-md bg-[#5E2B9D] hover:bg-[#4D2382] text-white text-xs font-medium transition-colors shadow-xs cursor-pointer"
                >
                  Save &amp; Select
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Saved Draft Bills Modal */}
      {isDraftsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-md border border-slate-200 shadow-xl max-w-2xl w-full flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-md bg-purple-50 text-[#5E2B9D] flex items-center justify-center border border-purple-100">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-medium text-slate-900">Saved Draft Bills</h3>
                    <span className="px-2 py-0.5 rounded-full bg-purple-100 text-[#5E2B9D] text-[10px] font-bold">
                      {draftBills.length} saved
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Select a draft to restore its items and customer into the active bill, then settle.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {draftBills.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearAllDrafts}
                    className="text-[11px] text-rose-500 hover:text-rose-700 font-medium px-2 py-1 rounded hover:bg-rose-50 cursor-pointer transition-colors"
                  >
                    Clear All
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsDraftsModalOpen(false)}
                  className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Drafts List */}
            <div className="p-4 overflow-y-auto flex-1 space-y-3">
              {draftBills.length === 0 ? (
                <div className="py-12 text-center space-y-2">
                  <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                    <FileText className="w-6 h-6" />
                  </div>
                  <h4 className="text-xs font-medium text-slate-800">No Draft Bills Saved</h4>
                  <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                    When a customer steps away or is collecting more items, click &quot;Draft Bill&quot; in the order summary to save it locally.
                  </p>
                </div>
              ) : (
                draftBills.map((draft) => (
                  <div
                    key={draft.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-md hover:bg-purple-50/30 border border-slate-200 transition-colors bg-white"
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-medium text-[#5E2B9D] bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                          {draft.draftNumber}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {draft.date} • {draft.time}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-medium text-slate-900 truncate">
                          {draft.customerName}
                        </span>
                        {draft.customerPhone && (
                          <span className="text-slate-500 font-mono text-[11px]">
                            ({maskPhoneNumber(draft.customerPhone)})
                          </span>
                        )}
                        {draft.doctorName && (
                          <span className="text-[11px] text-slate-400 truncate">
                            • Dr. {draft.doctorName}
                          </span>
                        )}
                      </div>

                      {/* Items preview */}
                      <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
                        <span className="text-slate-400 font-medium">Items ({draft.items.length}):</span>
                        {draft.items.slice(0, 3).map((item, idx) => (
                          <span
                            key={idx}
                            className="inline-block bg-slate-100 px-2 py-0.5 rounded text-[10px] text-slate-700"
                          >
                            {item.name} × {item.quantity} {item.unitType === "sheet" ? "sh" : "loose"}
                          </span>
                        ))}
                        {draft.items.length > 3 && (
                          <span className="text-[10px] text-purple-700 font-medium">
                            +{draft.items.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right side: Amount + Actions */}
                    <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
                      <div className="text-left sm:text-right">
                        <div className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">Total</div>
                        <div className="text-sm font-medium text-slate-900">
                          ₹{draft.grandTotal.toFixed(2)}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => handleDeleteDraft(draft.id, e)}
                          className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Delete draft"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSelectDraft(draft)}
                          className="h-8 px-3 rounded-md bg-[#5E2B9D] hover:bg-[#4D2382] text-white text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                        >
                          <span>Select Bill</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="p-3 bg-slate-50 border-t border-slate-100 rounded-b-md flex justify-end">
              <button
                type="button"
                onClick={() => setIsDraftsModalOpen(false)}
                className="px-4 py-1.5 rounded-md bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-medium transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

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
