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
  Printer,
  ChevronRight,
  Filter,
  BarChart3,
  PieChart,
  Activity,
  Layers,
  Sparkles,
  ArrowUpRight,
  Percent,
  CreditCard,
  Banknote,
  Smartphone,
  ShieldCheck,
  Coins,
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

export type FilterPeriod =
  | "today"
  | "yesterday"
  | "this_week"
  | "last_week"
  | "this_month"
  | "last_month"
  | "this_year"
  | "last_year";

interface PeriodOption {
  id: FilterPeriod;
  label: string;
}

const PERIOD_OPTIONS: PeriodOption[] = [
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "this_week", label: "This Week" },
  { id: "last_week", label: "Last Week" },
  { id: "this_month", label: "This Month" },
  { id: "last_month", label: "Last Month" },
  { id: "this_year", label: "This Year" },
  { id: "last_year", label: "Last Year" },
];

/**
 * Robust date parser for invoices formatted like "17 Sep 2026" or standard ISO
 */
function parseInvoiceDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const direct = new Date(dateStr);
  if (!isNaN(direct.getTime())) return direct;

  const parts = dateStr.trim().split(" ");
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const months: Record<string, number> = {
      jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
      jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
    };
    const month = months[parts[1].toLowerCase().slice(0, 3)];
    const year = parseInt(parts[2], 10);
    if (!isNaN(day) && month !== undefined && !isNaN(year)) {
      return new Date(year, month, day);
    }
  }
  return null;
}

/**
 * Check if invoice date matches requested filter period
 */
function isInvoiceInPeriod(invDate: Date, period: FilterPeriod, now = new Date()): boolean {
  const dYear = invDate.getFullYear();
  const dMonth = invDate.getMonth();
  const dDate = invDate.getDate();

  const nowYear = now.getFullYear();
  const nowMonth = now.getMonth();
  const nowDate = now.getDate();

  switch (period) {
    case "today":
      return dYear === nowYear && dMonth === nowMonth && dDate === nowDate;

    case "yesterday": {
      const yest = new Date(nowYear, nowMonth, nowDate - 1);
      return (
        dYear === yest.getFullYear() &&
        dMonth === yest.getMonth() &&
        dDate === yest.getDate()
      );
    }

    case "this_week": {
      // Week starting Monday
      const dayOfWeek = (now.getDay() + 6) % 7; // 0 = Mon, 6 = Sun
      const startOfWeek = new Date(nowYear, nowMonth, nowDate - dayOfWeek, 0, 0, 0, 0);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 7);
      return invDate >= startOfWeek && invDate < endOfWeek;
    }

    case "last_week": {
      const dayOfWeek = (now.getDay() + 6) % 7;
      const startOfThisWeek = new Date(nowYear, nowMonth, nowDate - dayOfWeek, 0, 0, 0, 0);
      const startOfLastWeek = new Date(startOfThisWeek);
      startOfLastWeek.setDate(startOfThisWeek.getDate() - 7);
      return invDate >= startOfLastWeek && invDate < startOfThisWeek;
    }

    case "this_month":
      return dYear === nowYear && dMonth === nowMonth;

    case "last_month": {
      const lastMonth = new Date(nowYear, nowMonth - 1, 1);
      return dYear === lastMonth.getFullYear() && dMonth === lastMonth.getMonth();
    }

    case "this_year":
      return dYear === nowYear;

    case "last_year":
      return dYear === nowYear - 1;

    default:
      return true;
  }
}

export default function DashboardContent() {
  const { currentPharmacy, user } = useAuth();
  const pharmacyId = currentPharmacy?.id;

  const [settings, setSettings] = useState<PharmacySettings>(() =>
    getLocalPharmacySettings(pharmacyId, currentPharmacy || undefined)
  );
  const [medicines, setMedicines] = useState<MedicineItem[]>([]);
  const [invoices, setInvoices] = useState<BillInvoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Date Filter Period (Default: "today")
  const [selectedPeriod, setSelectedPeriod] = useState<FilterPeriod>("today");

  // Hover state for interactive SVG charts
  const [hoveredPoint, setHoveredPoint] = useState<{
    label: string;
    amount: number;
    count: number;
    x: number;
    y: number;
  } | null>(null);

  // Donut chart hover
  const [hoveredPayment, setHoveredPayment] = useState<string | null>(null);

  // Bill print modal state
  const [selectedInvoice, setSelectedInvoice] = useState<BillInvoice | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Load pharmacy-isolated data
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

      const st = await fetchRemotePharmacySettings(pharmacyId, currentPharmacy || undefined);
      if (isMounted) setSettings(st);

      // 1. Load Medicines
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
        } else if (isMounted && typeof window !== "undefined") {
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

      // 2. Load Invoices
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
          } else {
            setInvoices([]);
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

  // -------------------------------------------------------------
  // Filter Invoices by Selected Period
  // -------------------------------------------------------------
  const filteredInvoices = useMemo(() => {
    const now = new Date();
    return invoices.filter((inv) => {
      const invDate = parseInvoiceDate(inv.date);
      if (!invDate) return false;
      return isInvoiceInPeriod(invDate, selectedPeriod, now);
    });
  }, [invoices, selectedPeriod]);

  // Period Label Description
  const periodDescription = useMemo(() => {
    const now = new Date();
    switch (selectedPeriod) {
      case "today":
        return `Today • ${now.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}`;
      case "yesterday": {
        const yest = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
        return `Yesterday • ${yest.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}`;
      }
      case "this_week": {
        const dayOfWeek = (now.getDay() + 6) % 7;
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek);
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        return `Current Week (${start.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} – ${end.toLocaleDateString("en-GB", { day: "numeric", month: "short" })})`;
      }
      case "last_week":
        return "Previous 7 Calendar Days";
      case "this_month":
        return `Month of ${now.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}`;
      case "last_month": {
        const lastM = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        return `Month of ${lastM.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}`;
      }
      case "this_year":
        return `Calendar Year ${now.getFullYear()}`;
      case "last_year":
        return `Calendar Year ${now.getFullYear() - 1}`;
      default:
        return "";
    }
  }, [selectedPeriod]);

  // -------------------------------------------------------------
  // Metrics Calculation for Selected Period
  // -------------------------------------------------------------
  const totalRevenue = useMemo(() => {
    return filteredInvoices.reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);
  }, [filteredInvoices]);

  const totalInvoicesCount = filteredInvoices.length;

  const averageOrderValue = useMemo(() => {
    return totalInvoicesCount > 0 ? Math.round(totalRevenue / totalInvoicesCount) : 0;
  }, [totalRevenue, totalInvoicesCount]);

  const totalUnitsSold = useMemo(() => {
    return filteredInvoices.reduce((sum, inv) => {
      const itemsCount = (inv.items || []).reduce(
        (iSum, item) => iSum + (item.quantity || 0),
        0
      );
      return sum + itemsCount;
    }, 0);
  }, [filteredInvoices]);

  // Payment Breakdown by Settlement Method
  const paymentBreakdown = useMemo(() => {
    const counts = { UPI: 0, Cash: 0, Card: 0, Split: 0 };
    const amounts = { UPI: 0, Cash: 0, Card: 0, Split: 0 };

    filteredInvoices.forEach((inv) => {
      const mode = (inv.paymentMethod || "Cash") as keyof typeof counts;
      if (counts[mode] !== undefined) {
        counts[mode] += 1;
        amounts[mode] += inv.grandTotal || 0;
      } else {
        counts.Cash += 1;
        amounts.Cash += inv.grandTotal || 0;
      }
    });

    const total = totalRevenue || 1;
    return {
      counts,
      amounts,
      percentages: {
        UPI: Math.round((amounts.UPI / total) * 100),
        Cash: Math.round((amounts.Cash / total) * 100),
        Card: Math.round((amounts.Card / total) * 100),
        Split: Math.round((amounts.Split / total) * 100),
      },
    };
  }, [filteredInvoices, totalRevenue]);

  // -------------------------------------------------------------
  // Detailed Payment Methods Collections & GST Tax Calculations
  // -------------------------------------------------------------
  const paymentAndTaxStats = useMemo(() => {
    let cashReceived = 0;
    let upiReceived = 0;
    let cardReceived = 0;
    let splitReceived = 0;
    let splitCashPortion = 0;
    let splitOnlinePortion = 0;

    let cashCount = 0;
    let upiCount = 0;
    let cardCount = 0;
    let splitCount = 0;

    let totalGstReceived = 0;
    let cgstReceived = 0;
    let sgstReceived = 0;
    let taxableAmountTotal = 0;
    let gstBillsCount = 0;

    filteredInvoices.forEach((inv) => {
      const gTotal = Number(inv.grandTotal) || 0;
      const method = inv.paymentMethod || "Cash";

      if (method === "Cash") {
        cashReceived += gTotal;
        cashCount += 1;
      } else if (method === "UPI") {
        upiReceived += gTotal;
        upiCount += 1;
      } else if (method === "Card") {
        cardReceived += gTotal;
        cardCount += 1;
      } else if (method === "Split") {
        splitCount += 1;
        splitReceived += gTotal;
        if (inv.splitDetails) {
          const sCash = Number(inv.splitDetails.cash) || 0;
          const sOnline = Number(inv.splitDetails.online) || 0;
          splitCashPortion += sCash;
          splitOnlinePortion += sOnline;
          cashReceived += sCash;
          upiReceived += sOnline;
        } else {
          splitCashPortion += gTotal / 2;
          splitOnlinePortion += gTotal / 2;
          cashReceived += gTotal / 2;
          upiReceived += gTotal / 2;
        }
      } else {
        cashReceived += gTotal;
        cashCount += 1;
      }

      // GST Tax accumulation
      let gst = Number(inv.totalGstAmount) || 0;
      const cgst = Number(inv.cgstAmount) || 0;
      const sgst = Number(inv.sgstAmount) || 0;

      if (!gst && (cgst > 0 || sgst > 0)) {
        gst = cgst + sgst;
      }

      if (inv.gstEnabled || gst > 0) {
        gstBillsCount += 1;
        totalGstReceived += gst;
        cgstReceived += cgst > 0 ? cgst : gst / 2;
        sgstReceived += sgst > 0 ? sgst : gst / 2;
        const taxable = Number(inv.taxableAmount) || Math.max(0, gTotal - gst);
        taxableAmountTotal += taxable;
      } else {
        taxableAmountTotal += gTotal;
      }
    });

    const total = totalRevenue || 1;
    const cashPercent = Math.round((cashReceived / total) * 100);
    const upiPercent = Math.round((upiReceived / total) * 100);
    const cardPercent = Math.round((cardReceived / total) * 100);
    const splitPercent = Math.round((splitReceived / total) * 100);

    return {
      cashReceived,
      upiReceived,
      cardReceived,
      splitReceived,
      splitCashPortion,
      splitOnlinePortion,
      cashCount,
      upiCount,
      cardCount,
      splitCount,
      cashPercent,
      upiPercent,
      cardPercent,
      splitPercent,
      totalGstReceived,
      cgstReceived,
      sgstReceived,
      taxableAmountTotal,
      gstBillsCount,
    };
  }, [filteredInvoices, totalRevenue]);

  // -------------------------------------------------------------
  // Timeline Data for Area & Bar Charts
  // -------------------------------------------------------------
  const timelineData = useMemo(() => {
    // If today or yesterday -> hourly breakdown (8 AM to 10 PM)
    if (selectedPeriod === "today" || selectedPeriod === "yesterday") {
      const hours = [
        "8AM", "9AM", "10AM", "11AM", "12PM",
        "1PM", "2PM", "3PM", "4PM", "5PM",
        "6PM", "7PM", "8PM", "9PM", "10PM",
      ];
      const dataMap: Record<string, { amount: number; count: number }> = {};
      hours.forEach((h) => (dataMap[h] = { amount: 0, count: 0 }));

      filteredInvoices.forEach((inv) => {
        if (!inv.time) return;
        // Parse time: "02:45 PM"
        const parts = inv.time.trim().split(" ");
        if (parts.length >= 2) {
          const timeParts = parts[0].split(":");
          let hour = parseInt(timeParts[0], 10);
          const ampm = parts[1].toUpperCase();
          if (ampm === "PM" && hour < 12) hour += 12;
          if (ampm === "AM" && hour === 12) hour = 0;

          let label = "";
          if (hour === 0) label = "12AM";
          else if (hour < 12) label = `${hour}AM`;
          else if (hour === 12) label = "12PM";
          else label = `${hour - 12}PM`;

          if (dataMap[label]) {
            dataMap[label].amount += inv.grandTotal || 0;
            dataMap[label].count += 1;
          }
        }
      });

      return hours.map((h) => ({
        label: h,
        amount: dataMap[h].amount,
        count: dataMap[h].count,
      }));
    }

    // If this_week or last_week -> 7 days breakdown (Mon - Sun)
    if (selectedPeriod === "this_week" || selectedPeriod === "last_week") {
      const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      const dataMap: Record<string, { amount: number; count: number }> = {};
      days.forEach((d) => (dataMap[d] = { amount: 0, count: 0 }));

      filteredInvoices.forEach((inv) => {
        const d = parseInvoiceDate(inv.date);
        if (d) {
          const dayIdx = (d.getDay() + 6) % 7;
          const dayLabel = days[dayIdx];
          if (dataMap[dayLabel]) {
            dataMap[dayLabel].amount += inv.grandTotal || 0;
            dataMap[dayLabel].count += 1;
          }
        }
      });

      return days.map((d) => ({
        label: d,
        amount: dataMap[d].amount,
        count: dataMap[d].count,
      }));
    }

    // If this_month or last_month -> 4 weeks / segments breakdown
    if (selectedPeriod === "this_month" || selectedPeriod === "last_month") {
      const weeks = ["Wk 1 (1-7)", "Wk 2 (8-14)", "Wk 3 (15-21)", "Wk 4 (22+)"];
      const dataMap: Record<string, { amount: number; count: number }> = {};
      weeks.forEach((w) => (dataMap[w] = { amount: 0, count: 0 }));

      filteredInvoices.forEach((inv) => {
        const d = parseInvoiceDate(inv.date);
        if (d) {
          const day = d.getDate();
          let wLabel = weeks[0];
          if (day > 21) wLabel = weeks[3];
          else if (day > 14) wLabel = weeks[2];
          else if (day > 7) wLabel = weeks[1];

          dataMap[wLabel].amount += inv.grandTotal || 0;
          dataMap[wLabel].count += 1;
        }
      });

      return weeks.map((w) => ({
        label: w,
        amount: dataMap[w].amount,
        count: dataMap[w].count,
      }));
    }

    // Default: this_year or last_year -> 12 Months breakdown
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const dataMap: Record<string, { amount: number; count: number }> = {};
    months.forEach((m) => (dataMap[m] = { amount: 0, count: 0 }));

    filteredInvoices.forEach((inv) => {
      const d = parseInvoiceDate(inv.date);
      if (d) {
        const mLabel = months[d.getMonth()];
        if (dataMap[mLabel]) {
          dataMap[mLabel].amount += inv.grandTotal || 0;
          dataMap[mLabel].count += 1;
        }
      }
    });

    return months.map((m) => ({
      label: m,
      amount: dataMap[m].amount,
      count: dataMap[m].count,
    }));
  }, [filteredInvoices, selectedPeriod]);

  // Max value for chart scaling
  const maxRevenuePoint = useMemo(() => {
    const maxVal = Math.max(...timelineData.map((d) => d.amount), 0);
    return maxVal > 0 ? maxVal * 1.15 : 1000;
  }, [timelineData]);

  const maxInvoicesPoint = useMemo(() => {
    const maxCount = Math.max(...timelineData.map((d) => d.count), 0);
    return maxCount > 0 ? maxCount * 1.2 : 10;
  }, [timelineData]);

  // -------------------------------------------------------------
  // Fast Moving / Top 5 Medicines Sold in Period
  // -------------------------------------------------------------
  const topSellingMedicines = useMemo(() => {
    const itemMap = new Map<string, { name: string; category?: string; units: number; revenue: number }>();

    filteredInvoices.forEach((inv) => {
      (inv.items || []).forEach((item) => {
        const key = item.name.trim();
        if (!itemMap.has(key)) {
          // Find category from medicines catalog if available
          const cat = medicines.find((m) => m.name.toLowerCase() === key.toLowerCase())?.category || "General Pharma";
          itemMap.set(key, {
            name: key,
            category: cat,
            units: item.quantity || 0,
            revenue: item.amount || 0,
          });
        } else {
          const rec = itemMap.get(key)!;
          rec.units += item.quantity || 0;
          rec.revenue += item.amount || 0;
        }
      });
    });

    return Array.from(itemMap.values())
      .sort((a, b) => b.units - a.units)
      .slice(0, 5);
  }, [filteredInvoices, medicines]);

  // -------------------------------------------------------------
  // Category Share Breakdown
  // -------------------------------------------------------------
  const categoryBreakdown = useMemo(() => {
    const catMap = new Map<string, number>();

    filteredInvoices.forEach((inv) => {
      (inv.items || []).forEach((item) => {
        const med = medicines.find((m) => m.name.toLowerCase() === item.name.toLowerCase());
        const cat = med?.category || "General Tablets";
        catMap.set(cat, (catMap.get(cat) || 0) + (item.amount || 0));
      });
    });

    const total = totalRevenue || 1;
    const sorted = Array.from(catMap.entries())
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: Math.round((amount / total) * 100),
      }))
      .sort((a, b) => b.amount - a.amount);

    return sorted.slice(0, 5);
  }, [filteredInvoices, medicines, totalRevenue]);

  // -------------------------------------------------------------
  // Hourly Counter Traffic Distribution (Peak Billing Intensity)
  // -------------------------------------------------------------
  const hourlyTrafficSegments = useMemo(() => {
    const segments = [
      { name: "Morning (8AM - 12PM)", count: 0, revenue: 0, color: "#10b981" },
      { name: "Afternoon (12PM - 4PM)", count: 0, revenue: 0, color: "#3b82f6" },
      { name: "Evening (4PM - 8PM)", count: 0, revenue: 0, color: "#5E2B9D" },
      { name: "Night (8PM - 11PM)", count: 0, revenue: 0, color: "#f59e0b" },
    ];

    filteredInvoices.forEach((inv) => {
      if (!inv.time) {
        segments[2].count += 1;
        segments[2].revenue += inv.grandTotal || 0;
        return;
      }
      const parts = inv.time.trim().split(" ");
      if (parts.length >= 2) {
        const timeParts = parts[0].split(":");
        let hour = parseInt(timeParts[0], 10);
        const ampm = parts[1].toUpperCase();
        if (ampm === "PM" && hour < 12) hour += 12;
        if (ampm === "AM" && hour === 12) hour = 0;

        if (hour >= 8 && hour < 12) {
          segments[0].count += 1;
          segments[0].revenue += inv.grandTotal || 0;
        } else if (hour >= 12 && hour < 16) {
          segments[1].count += 1;
          segments[1].revenue += inv.grandTotal || 0;
        } else if (hour >= 16 && hour < 20) {
          segments[2].count += 1;
          segments[2].revenue += inv.grandTotal || 0;
        } else {
          segments[3].count += 1;
          segments[3].revenue += inv.grandTotal || 0;
        }
      } else {
        segments[2].count += 1;
        segments[2].revenue += inv.grandTotal || 0;
      }
    });

    const maxCount = Math.max(...segments.map((s) => s.count), 1);
    return segments.map((s) => ({
      ...s,
      percentage: Math.round((s.count / maxCount) * 100),
    }));
  }, [filteredInvoices]);

  // Inventory Low Stock Attention
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

  const openInvoicePrint = (inv: BillInvoice) => {
    setSelectedInvoice(inv);
    setIsPrintModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Top Header Row with Active Outlet and Quick Actions */}
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
              {currentPharmacy?.licenseNo || settings.drugLicenseNo || "DL-REG"} • GSTIN:{" "}
              {settings.gstNumber || "Active Outlet"}
            </p>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <Link
            href="/billing"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-[#5E2B9D] hover:bg-[#4D2382] text-white text-xs font-medium transition-colors shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New POS Bill</span>
          </Link>
          <Link
            href="/sales"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-colors cursor-pointer"
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Sales History</span>
          </Link>
          <Link
            href="/medicines"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-colors cursor-pointer"
          >
            <Pill className="w-3.5 h-3.5" />
            <span>Medicines ({medicines.length})</span>
          </Link>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Dynamic Date Filter Bar (Today by Default) */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-white border border-slate-200/80 rounded-md p-3.5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-purple-50 text-[#5E2B9D] flex items-center justify-center border border-purple-100">
            <Filter className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-900">Period Analytics:</span>
              <span className="text-xs font-medium text-[#5E2B9D]">
                {periodDescription}
              </span>
            </div>
            <p className="text-[10px] text-slate-400">
              Showing {filteredInvoices.length} invoice{filteredInvoices.length === 1 ? "" : "s"} for selected timeframe
            </p>
          </div>
        </div>

        {/* Filter Pills Grid / Buttons */}
        <div className="flex items-center gap-1.5 flex-nowrap sm:flex-wrap overflow-x-auto pb-1 no-scrollbar max-w-full">
          {PERIOD_OPTIONS.map((opt) => {
            const isSelected = selectedPeriod === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => setSelectedPeriod(opt.id)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                  isSelected
                    ? "bg-[#5E2B9D] text-white shadow-xs font-medium"
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/60"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Top 4 Summary KPI Metric Cards */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Revenue Card */}
        <div className="bg-white border border-slate-200/80 rounded-md p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Period Revenue</span>
            <div className="w-8 h-8 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-medium text-slate-900 tracking-tight">
            ₹{totalRevenue.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 mt-1">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>{totalInvoicesCount} invoices collected</span>
          </div>
        </div>

        {/* Total Invoices */}
        <div className="bg-white border border-slate-200/80 rounded-md p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Orders Settled</span>
            <div className="w-8 h-8 rounded-md bg-purple-50 text-[#5E2B9D] flex items-center justify-center border border-purple-100">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-medium text-[#5E2B9D] tracking-tight">
            {totalInvoicesCount}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {totalUnitsSold} units dispensed
          </div>
        </div>

        {/* Average Order Value (AOV) */}
        <div className="bg-white border border-slate-200/80 rounded-md p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Average Bill Value</span>
            <div className="w-8 h-8 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-medium text-blue-600 tracking-tight">
            ₹{averageOrderValue.toLocaleString("en-IN")}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Average customer basket size
          </div>
        </div>

        {/* Total GST Received */}
        <div className="bg-white border border-slate-200/80 rounded-md p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Total GST Received</span>
            <div className="w-8 h-8 rounded-md bg-purple-50 text-[#5E2B9D] flex items-center justify-center border border-purple-100">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-medium text-[#5E2B9D] tracking-tight">
            ₹{paymentAndTaxStats.totalGstReceived.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
            <span>CGST: ₹{paymentAndTaxStats.cgstReceived.toFixed(2)}</span>
            <span>SGST: ₹{paymentAndTaxStats.sgstReceived.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* PAYMENT METHODS & GST TAX COLLECTIONS SECTION */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-white border border-slate-200/80 rounded-md p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-purple-50 text-[#5E2B9D] flex items-center justify-center border border-purple-100">
              <Coins className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-medium text-slate-900">
                Payment Methods & GST Collections
              </h2>
              <p className="text-[11px] text-slate-400">
                Live net amounts collected via Cash, UPI, Card and GST tax collections for {periodDescription}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] text-slate-400">Outlet GSTIN:</span>
            <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-slate-100 text-slate-700 border border-slate-200">
              {settings.gstNumber || "Unregistered"}
            </span>
          </div>
        </div>

        {/* 4 Dedicated Cards: Cash, UPI, Card, GST */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
          {/* 1. Cash Received */}
          <div className="p-4 rounded-md border border-emerald-100 bg-emerald-50/30 hover:bg-emerald-50/50 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-emerald-900">Cash Received</span>
              <div className="w-7 h-7 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <Banknote className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-medium text-slate-900 tracking-tight">
              ₹{paymentAndTaxStats.cashReceived.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-emerald-100/60 text-[11px]">
              <span className="text-slate-500">{paymentAndTaxStats.cashCount} cash bills</span>
              <span className="font-medium text-emerald-700 bg-emerald-100/80 px-1.5 py-0.5 rounded">
                {paymentAndTaxStats.cashPercent}% share
              </span>
            </div>
            {paymentAndTaxStats.splitCashPortion > 0 && (
              <p className="text-[10px] text-slate-400 mt-1">
                Incl. ₹{paymentAndTaxStats.splitCashPortion.toLocaleString("en-IN")} from split bills
              </p>
            )}
          </div>

          {/* 2. UPI / QR Received */}
          <div className="p-4 rounded-md border border-teal-100 bg-teal-50/30 hover:bg-teal-50/50 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-teal-900">UPI / QR Received</span>
              <div className="w-7 h-7 rounded-md bg-teal-100 text-teal-700 flex items-center justify-center">
                <Smartphone className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-medium text-slate-900 tracking-tight">
              ₹{paymentAndTaxStats.upiReceived.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-teal-100/60 text-[11px]">
              <span className="text-slate-500">{paymentAndTaxStats.upiCount} UPI payments</span>
              <span className="font-medium text-teal-700 bg-teal-100/80 px-1.5 py-0.5 rounded">
                {paymentAndTaxStats.upiPercent}% share
              </span>
            </div>
            {paymentAndTaxStats.splitOnlinePortion > 0 && (
              <p className="text-[10px] text-slate-400 mt-1">
                Incl. ₹{paymentAndTaxStats.splitOnlinePortion.toLocaleString("en-IN")} from split online
              </p>
            )}
          </div>

          {/* 3. Card / POS Received */}
          <div className="p-4 rounded-md border border-blue-100 bg-blue-50/30 hover:bg-blue-50/50 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-blue-900">Card / POS Received</span>
              <div className="w-7 h-7 rounded-md bg-blue-100 text-blue-700 flex items-center justify-center">
                <CreditCard className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-medium text-slate-900 tracking-tight">
              ₹{paymentAndTaxStats.cardReceived.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-blue-100/60 text-[11px]">
              <span className="text-slate-500">{paymentAndTaxStats.cardCount} card swipes</span>
              <span className="font-medium text-blue-700 bg-blue-100/80 px-1.5 py-0.5 rounded">
                {paymentAndTaxStats.cardPercent}% share
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Debit & Credit card terminal
            </p>
          </div>

          {/* 4. GST Tax Received */}
          <div className="p-4 rounded-md border border-purple-200 bg-purple-50/40 hover:bg-purple-50/60 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[#5E2B9D]">GST Tax Received</span>
              <div className="w-7 h-7 rounded-md bg-purple-100 text-[#5E2B9D] flex items-center justify-center">
                <Receipt className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-medium text-[#5E2B9D] tracking-tight">
              ₹{paymentAndTaxStats.totalGstReceived.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-purple-200/60 text-[11px]">
              <span className="text-slate-600 font-medium">
                CGST: ₹{paymentAndTaxStats.cgstReceived.toFixed(2)}
              </span>
              <span className="text-slate-600 font-medium">
                SGST: ₹{paymentAndTaxStats.sgstReceived.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between mt-1 text-[10px] text-slate-500">
              <span>Taxable: ₹{paymentAndTaxStats.taxableAmountTotal.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</span>
              <span className="font-medium text-[#5E2B9D] bg-purple-100 px-1 rounded">
                {paymentAndTaxStats.gstBillsCount} GST bills
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* GRAPHS SECTION 1: Dual Visualizations (Area & Comparative Bar) */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* GRAPH 1: Area Chart with Smooth Gradient Fill (7 Cols) */}
        <div className="lg:col-span-7 bg-white border border-slate-200/80 rounded-md shadow-xs p-5 flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#5E2B9D]" />
              <div>
                <h2 className="text-sm font-medium text-slate-900">Revenue Progression Timeline</h2>
                <p className="text-[11px] text-slate-400">
                  Real-time sales velocity across {PERIOD_OPTIONS.find((p) => p.id === selectedPeriod)?.label}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-purple-50 text-[#5E2B9D] border border-purple-200">
                <span className="w-1.5 h-1.5 rounded-full bg-[#5E2B9D]"></span>
                Total: ₹{totalRevenue.toLocaleString("en-IN")}
              </span>
            </div>
          </div>

          {/* SVG Area Chart Container */}
          <div className="mt-4 flex-1 flex flex-col justify-end relative min-h-[220px]">
            {filteredInvoices.length === 0 ? (
              <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center">
                <BarChart3 className="w-10 h-10 text-slate-300 stroke-1 mb-2" />
                <p className="text-xs font-medium text-slate-700">No Sales Recorded for this Period</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Transactions will automatically render in this spline graph once bills are settled.
                </p>
                <Link
                  href="/billing"
                  className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#5E2B9D] text-white text-xs font-medium hover:bg-[#4D2382]"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Bill Now</span>
                </Link>
              </div>
            ) : (
              <>
                <svg
                  viewBox="0 0 700 200"
                  className="w-full h-48 overflow-visible select-none"
                  preserveAspectRatio="none"
                >
                  <defs>
                    <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#5E2B9D" stopOpacity="0.28" />
                      <stop offset="100%" stopColor="#5E2B9D" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Grid Lines */}
                  <line x1="0" y1="30" x2="700" y2="30" stroke="#f1f5f9" strokeDasharray="4 4" />
                  <line x1="0" y1="80" x2="700" y2="80" stroke="#f1f5f9" strokeDasharray="4 4" />
                  <line x1="0" y1="130" x2="700" y2="130" stroke="#f1f5f9" strokeDasharray="4 4" />
                  <line x1="0" y1="180" x2="700" y2="180" stroke="#e2e8f0" />

                  {/* Build SVG Points */}
                  {(() => {
                    const count = timelineData.length;
                    const stepX = 700 / (count - 1 || 1);

                    const points = timelineData.map((d, i) => {
                      const x = i * stepX;
                      const y = 180 - (d.amount / maxRevenuePoint) * 150;
                      return { ...d, x, y };
                    });

                    // Construct smooth path string
                    let pathD = `M ${points[0].x} ${points[0].y}`;
                    for (let i = 0; i < points.length - 1; i++) {
                      const curr = points[i];
                      const next = points[i + 1];
                      const cp1x = curr.x + (next.x - curr.x) / 2;
                      const cp1y = curr.y;
                      const cp2x = curr.x + (next.x - curr.x) / 2;
                      const cp2y = next.y;
                      pathD += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${next.x} ${next.y}`;
                    }

                    const closedAreaD = `${pathD} L ${points[points.length - 1].x} 180 L ${points[0].x} 180 Z`;

                    return (
                      <>
                        {/* Gradient Fill Area */}
                        <path d={closedAreaD} fill="url(#areaGradient)" />

                        {/* Spline Line */}
                        <path
                          d={pathD}
                          fill="none"
                          stroke="#5E2B9D"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                        />

                        {/* Interactive Nodes */}
                        {points.map((pt, idx) => (
                          <g key={idx}>
                            <circle
                              cx={pt.x}
                              cy={pt.y}
                              r={hoveredPoint?.label === pt.label ? 6 : 4}
                              fill="#ffffff"
                              stroke="#5E2B9D"
                              strokeWidth={hoveredPoint?.label === pt.label ? "3" : "2"}
                              className="cursor-pointer transition-all"
                              onMouseEnter={() =>
                                setHoveredPoint({
                                  label: pt.label,
                                  amount: pt.amount,
                                  count: pt.count,
                                  x: pt.x,
                                  y: pt.y,
                                })
                              }
                              onMouseLeave={() => setHoveredPoint(null)}
                            />
                          </g>
                        ))}
                      </>
                    );
                  })()}
                </svg>

                {/* Dynamic Tooltip on Hover */}
                {hoveredPoint && (
                  <div
                    className="absolute bg-slate-900 text-white rounded-md px-3 py-1.5 text-xs shadow-lg pointer-events-none transition-all z-20 whitespace-nowrap"
                    style={{
                      left: `clamp(10px, ${(hoveredPoint.x / 700) * 100}%, calc(100% - 130px))`,
                      top: `clamp(10px, ${hoveredPoint.y - 45}px, 140px)`,
                    }}
                  >
                    <div className="font-medium text-slate-200 text-[10px]">{hoveredPoint.label}</div>
                    <div className="font-bold text-emerald-400">
                      ₹{hoveredPoint.amount.toLocaleString("en-IN")}
                    </div>
                    <div className="text-[10px] text-slate-300">
                      {hoveredPoint.count} bill{hoveredPoint.count === 1 ? "" : "s"}
                    </div>
                  </div>
                )}

                {/* X-Axis Labels */}
                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-2 border-t border-slate-100">
                  {timelineData.map((d, i) => (
                    <span key={i} className="truncate max-w-[48px] text-center">
                      {d.label}
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* GRAPH 2: Comparative Bar Chart (Sales Volume vs Invoices Count) (5 Cols) */}
        <div className="lg:col-span-5 bg-white border border-slate-200/80 rounded-md shadow-xs p-5 flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-600" />
              <div>
                <h2 className="text-sm font-medium text-slate-900">Volume vs Bills Count</h2>
                <p className="text-[11px] text-slate-400">Direct sales intensity distribution</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-[10px]">
              <span className="flex items-center gap-1 text-slate-600">
                <span className="w-2.5 h-2.5 rounded bg-[#5E2B9D]"></span> Volume (₹)
              </span>
              <span className="flex items-center gap-1 text-slate-600">
                <span className="w-2.5 h-2.5 rounded bg-blue-400"></span> Invoices
              </span>
            </div>
          </div>

          <div className="mt-4 flex-1 flex flex-col justify-end min-h-[220px]">
            {filteredInvoices.length === 0 ? (
              <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center">
                <BarChart3 className="w-10 h-10 text-slate-300 stroke-1 mb-2" />
                <p className="text-xs font-medium text-slate-700">No Volume Data Available</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Filtered period has zero settled transactions.
                </p>
              </div>
            ) : (
              <div className="h-48 flex items-end justify-between gap-1.5 pt-4">
                {timelineData.map((item, idx) => {
                  const revHeight = maxRevenuePoint > 0 ? (item.amount / maxRevenuePoint) * 100 : 0;
                  const invHeight = maxInvoicesPoint > 0 ? (item.count / maxInvoicesPoint) * 100 : 0;

                  return (
                    <div
                      key={idx}
                      className="flex-1 flex flex-col items-center h-full justify-end group relative"
                    >
                      {/* Tooltip on bar hover */}
                      <div className="absolute -top-12 bg-slate-900 text-white text-[10px] rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-md z-20 whitespace-nowrap">
                        <div className="font-bold">{item.label}</div>
                        <div>₹{item.amount.toLocaleString("en-IN")} ({item.count} bills)</div>
                      </div>

                      {/* Dual Bars Container */}
                      <div className="w-full flex items-end justify-center gap-1 h-full">
                        {/* Revenue Bar */}
                        <div
                          style={{ height: `${Math.max(revHeight, 4)}%` }}
                          className="w-1/2 max-w-[14px] bg-[#5E2B9D] rounded-t-sm group-hover:bg-[#4D2382] transition-all"
                        />
                        {/* Invoice Count Bar */}
                        <div
                          style={{ height: `${Math.max(invHeight, 4)}%` }}
                          className="w-1/2 max-w-[14px] bg-blue-400 rounded-t-sm group-hover:bg-blue-500 transition-all"
                        />
                      </div>

                      {/* Label */}
                      <span className="text-[9px] text-slate-400 mt-2 truncate w-full text-center">
                        {item.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* GRAPHS SECTION 2: Donut Chart, Top Medicines, & Category Share */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* GRAPH 3: Donut / Ring Chart (Payment Mode Split) */}
        <div className="bg-white border border-slate-200/80 rounded-md shadow-xs p-5 flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <PieChart className="w-4 h-4 text-[#5E2B9D]" />
              <h2 className="text-sm font-medium text-slate-900">Payment Channel Breakdown</h2>
            </div>
            <span className="text-[10px] font-medium text-slate-400">By Settlement Mode</span>
          </div>

          <div className="mt-4 flex flex-col items-center justify-center flex-1">
            {totalRevenue === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <PieChart className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-medium text-slate-700">No Payments Collected</p>
                <p className="text-[10px] text-slate-400 mt-0.5">UPI, Cash & Card channels will display here</p>
              </div>
            ) : (
              <>
                {/* SVG Donut Circle */}
                <div className="relative w-44 h-44 flex items-center justify-center">
                  <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                    {(() => {
                      const radius = 38;
                      const circumference = 2 * Math.PI * radius; // ~238.76
                      let accumulatedOffset = 0;

                      const slices = [
                        { mode: "UPI", color: "#10b981", percent: paymentBreakdown.percentages.UPI },
                        { mode: "Cash", color: "#5E2B9D", percent: paymentBreakdown.percentages.Cash },
                        { mode: "Card", color: "#3b82f6", percent: paymentBreakdown.percentages.Card },
                        { mode: "Split", color: "#f59e0b", percent: paymentBreakdown.percentages.Split },
                      ].filter((s) => s.percent > 0);

                      return slices.map((s, idx) => {
                        const strokeLength = (s.percent / 100) * circumference;
                        const dashArray = `${strokeLength} ${circumference - strokeLength}`;
                        const dashOffset = -accumulatedOffset;
                        accumulatedOffset += strokeLength;

                        return (
                          <circle
                            key={idx}
                            cx="50"
                            cy="50"
                            r={radius}
                            fill="transparent"
                            stroke={s.color}
                            strokeWidth="12"
                            strokeDasharray={dashArray}
                            strokeDashoffset={dashOffset}
                            className="transition-all duration-500 cursor-pointer hover:opacity-85"
                            onMouseEnter={() => setHoveredPayment(s.mode)}
                            onMouseLeave={() => setHoveredPayment(null)}
                          />
                        );
                      });
                    })()}
                  </svg>

                  {/* Donut Center Display */}
                  <div className="absolute flex flex-col items-center justify-center text-center pointer-events-none">
                    <span className="text-[10px] text-slate-400 font-medium">
                      {hoveredPayment ? `${hoveredPayment} Total` : "Total Paid"}
                    </span>
                    <span className="text-sm font-bold text-slate-900">
                      ₹{
                        hoveredPayment === "UPI"
                          ? paymentAndTaxStats.upiReceived.toLocaleString("en-IN", { maximumFractionDigits: 0 })
                          : hoveredPayment === "Cash"
                          ? paymentAndTaxStats.cashReceived.toLocaleString("en-IN", { maximumFractionDigits: 0 })
                          : hoveredPayment === "Card"
                          ? paymentAndTaxStats.cardReceived.toLocaleString("en-IN", { maximumFractionDigits: 0 })
                          : hoveredPayment === "Split"
                          ? paymentAndTaxStats.splitReceived.toLocaleString("en-IN", { maximumFractionDigits: 0 })
                          : totalRevenue.toLocaleString("en-IN", { maximumFractionDigits: 0 })
                      }
                    </span>
                    <span className="text-[10px] text-emerald-600 font-medium">
                      {hoveredPayment
                        ? `${
                            hoveredPayment === "UPI"
                              ? paymentAndTaxStats.upiPercent
                              : hoveredPayment === "Cash"
                              ? paymentAndTaxStats.cashPercent
                              : hoveredPayment === "Card"
                              ? paymentAndTaxStats.cardPercent
                              : paymentAndTaxStats.splitPercent
                          }% Share`
                        : "100% Settled"}
                    </span>
                  </div>
                </div>

                {/* Payment Mode Legend List with exact Rupee amounts */}
                <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-100 text-xs">
                  <div className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0"></span>
                      <span className="text-slate-600 truncate font-medium">UPI / QR</span>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-bold text-slate-900">₹{paymentAndTaxStats.upiReceived.toLocaleString("en-IN")}</div>
                      <div className="text-[10px] text-slate-400">{paymentAndTaxStats.upiPercent}% ({paymentAndTaxStats.upiCount} bills)</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#5E2B9D] shrink-0"></span>
                      <span className="text-slate-600 truncate font-medium">Cash</span>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-bold text-slate-900">₹{paymentAndTaxStats.cashReceived.toLocaleString("en-IN")}</div>
                      <div className="text-[10px] text-slate-400">{paymentAndTaxStats.cashPercent}% ({paymentAndTaxStats.cashCount} bills)</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0"></span>
                      <span className="text-slate-600 truncate font-medium">Card / POS</span>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-bold text-slate-900">₹{paymentAndTaxStats.cardReceived.toLocaleString("en-IN")}</div>
                      <div className="text-[10px] text-slate-400">{paymentAndTaxStats.cardPercent}% ({paymentAndTaxStats.cardCount} bills)</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full bg-purple-600 shrink-0"></span>
                      <span className="text-slate-600 truncate font-medium">GST Tax</span>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-bold text-[#5E2B9D]">₹{paymentAndTaxStats.totalGstReceived.toLocaleString("en-IN")}</div>
                      <div className="text-[10px] text-slate-400">{paymentAndTaxStats.gstBillsCount} tax bills</div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* GRAPH 4: Top Fast Moving Medicines Ranking Bar Chart */}
        <div className="bg-white border border-slate-200/80 rounded-md shadow-xs p-5 flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Pill className="w-4 h-4 text-[#5E2B9D]" />
              <h2 className="text-sm font-medium text-slate-900">Fast Moving Medicines</h2>
            </div>
            <span className="text-[10px] font-medium text-slate-400">Top 5 by Volume</span>
          </div>

          <div className="mt-4 flex-1 space-y-3.5">
            {topSellingMedicines.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <Pill className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-medium text-slate-700">No Item Sales Recorded</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Top dispensing medicines will rank here</p>
              </div>
            ) : (
              topSellingMedicines.map((item, idx) => {
                const maxUnits = topSellingMedicines[0]?.units || 1;
                const percent = Math.round((item.units / maxUnits) * 100);

                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-4 h-4 rounded-full bg-purple-100 text-[#5E2B9D] font-bold text-[9px] flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <span className="font-medium text-slate-800 truncate" title={item.name}>
                          {item.name}
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-medium text-slate-900">{item.units} units</span>
                        <span className="text-[10px] text-slate-400 ml-1.5">
                          (₹{item.revenue.toLocaleString("en-IN")})
                        </span>
                      </div>
                    </div>
                    {/* Horizontal Progress Bar */}
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${percent}%` }}
                        className="h-full bg-gradient-to-r from-[#5E2B9D] to-purple-500 rounded-full transition-all duration-500"
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* GRAPH 5: Category Share & Therapeutic Split */}
        <div className="bg-white border border-slate-200/80 rounded-md shadow-xs p-5 flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-600" />
              <h2 className="text-sm font-medium text-slate-900">Therapeutic Class Share</h2>
            </div>
            <span className="text-[10px] font-medium text-slate-400">Revenue %</span>
          </div>

          <div className="mt-4 flex-1 space-y-3.5">
            {categoryBreakdown.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <Layers className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-medium text-slate-700">No Category Data</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Therapeutic class distributions will show here</p>
              </div>
            ) : (
              categoryBreakdown.map((cat, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-800 truncate">{cat.category}</span>
                    <span className="font-bold text-[#5E2B9D]">{cat.percentage}%</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${Math.max(cat.percentage, 3)}%` }}
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* GRAPHS SECTION 3: Hourly Counter Footfall & Radial Gauges */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* GRAPH 6: Hourly Counter Activity & Busy Hours Histogram (7 Cols) */}
        <div className="lg:col-span-7 bg-white border border-slate-200/80 rounded-md shadow-xs p-5 flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" />
              <div>
                <h2 className="text-sm font-medium text-slate-900">Counter Footfall & Peak Hours</h2>
                <p className="text-[11px] text-slate-400">Identifies highest customer billing traffic</p>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
              Shift Operations
            </span>
          </div>

          <div className="mt-4 flex-1 flex flex-col justify-around gap-3">
            {hourlyTrafficSegments.map((seg, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: seg.color }}></span>
                    <span className="font-medium text-slate-800">{seg.name}</span>
                  </div>
                  <div className="text-right text-[11px]">
                    <span className="font-bold text-slate-900">{seg.count} transactions</span>
                    <span className="text-slate-400 ml-1.5">
                      (₹{seg.revenue.toLocaleString("en-IN")})
                    </span>
                  </div>
                </div>
                <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    style={{
                      width: `${Math.max(seg.percentage, seg.count > 0 ? 4 : 0)}%`,
                      backgroundColor: seg.color,
                    }}
                    className="h-full rounded-full transition-all duration-500"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* GRAPH 7: Circular Radial Arc Gauges (Fulfillment & Stock Health) (5 Cols) */}
        <div className="lg:col-span-5 bg-white border border-slate-200/80 rounded-md shadow-xs p-5 flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <div>
                <h2 className="text-sm font-medium text-slate-900">Pharmacy Health Gauges</h2>
                <p className="text-[11px] text-slate-400">Inventory fulfillment & compliance meters</p>
              </div>
            </div>
          </div>

          <div className="mt-4 flex-1 grid grid-cols-2 gap-4 items-center justify-center">
            {/* Radial Gauge 1: Stock Fulfillment Rate */}
            <div className="flex flex-col items-center text-center p-3 rounded bg-slate-50/70 border border-slate-100">
              <div className="relative w-24 h-24 flex items-center justify-center">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="transparent"
                    stroke="#e2e8f0"
                    strokeWidth="8"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="transparent"
                    stroke="#10b981"
                    strokeWidth="8"
                    strokeDasharray={`${(98.5 / 100) * 251.2} 251.2`}
                    strokeLinecap="round"
                    className="transition-all duration-700"
                  />
                </svg>
                <div className="absolute flex flex-col items-center pointer-events-none">
                  <span className="text-sm font-bold text-slate-900">98.5%</span>
                  <span className="text-[9px] text-slate-400 font-medium">Ready</span>
                </div>
              </div>
              <span className="text-xs font-medium text-slate-800 mt-2">Order Fulfillment</span>
              <p className="text-[10px] text-slate-400">Prescription readiness</p>
            </div>

            {/* Radial Gauge 2: Stock Availability Ratio */}
            <div className="flex flex-col items-center text-center p-3 rounded bg-slate-50/70 border border-slate-100">
              <div className="relative w-24 h-24 flex items-center justify-center">
                {(() => {
                  const totalMeds = medicines.length || 1;
                  const availableMeds = medicines.filter(
                    (m) => parseInt(String(m.stock || 0), 10) > 0
                  ).length;
                  const availPercent = Math.round((availableMeds / totalMeds) * 100);

                  return (
                    <>
                      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                        <circle
                          cx="50"
                          cy="50"
                          r="40"
                          fill="transparent"
                          stroke="#e2e8f0"
                          strokeWidth="8"
                        />
                        <circle
                          cx="50"
                          cy="50"
                          r="40"
                          fill="transparent"
                          stroke="#5E2B9D"
                          strokeWidth="8"
                          strokeDasharray={`${(availPercent / 100) * 251.2} 251.2`}
                          strokeLinecap="round"
                          className="transition-all duration-700"
                        />
                      </svg>
                      <div className="absolute flex flex-col items-center pointer-events-none">
                        <span className="text-sm font-bold text-slate-900">{availPercent}%</span>
                        <span className="text-[9px] text-slate-400 font-medium">In Stock</span>
                      </div>
                    </>
                  );
                })()}
              </div>
              <span className="text-xs font-medium text-slate-800 mt-2">Catalog Availability</span>
              <p className="text-[10px] text-slate-400">{medicines.length} medicines stocked</p>
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* SECTION 4: Recent Settled Invoices & Low Stock Alert */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Recent Invoices Table */}
        <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-md shadow-xs p-5 flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-[#5E2B9D]" />
              <h2 className="text-sm font-medium text-slate-900">Recent Customer Invoices</h2>
            </div>
            <Link
              href="/sales"
              className="text-xs font-medium text-[#5E2B9D] hover:text-[#4D2382] flex items-center gap-1 cursor-pointer"
            >
              <span>View Full Ledger</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="flex-1 overflow-x-auto mt-2">
            {filteredInvoices.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <Receipt className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-medium text-slate-700">No Invoices in {PERIOD_OPTIONS.find((p) => p.id === selectedPeriod)?.label}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Bills settled during this period will appear in this ledger.
                </p>
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse min-w-[520px]">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                    <th className="py-2.5 px-2">Invoice #</th>
                    <th className="py-2.5 px-2">Time</th>
                    <th className="py-2.5 px-2">Customer</th>
                    <th className="py-2.5 px-2">Mode</th>
                    <th className="py-2.5 px-2 text-right">Amount</th>
                    <th className="py-2.5 px-2 text-center">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredInvoices.slice(0, 6).map((inv) => (
                    <tr key={inv.invoiceNo} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-2.5 px-2 font-mono font-medium text-slate-800">
                        {inv.invoiceNo}
                      </td>
                      <td className="py-2.5 px-2 text-slate-500">
                        {inv.time || inv.date}
                      </td>
                      <td className="py-2.5 px-2">
                        <div className="font-medium text-slate-900 truncate max-w-[140px]">
                          {inv.customerName}
                        </div>
                      </td>
                      <td className="py-2.5 px-2">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium ${
                            inv.paymentMethod === "UPI"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : inv.paymentMethod === "Cash"
                              ? "bg-purple-50 text-[#5E2B9D] border border-purple-200"
                              : "bg-blue-50 text-blue-700 border border-blue-200"
                          }`}
                        >
                          {inv.paymentMethod}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-right font-medium text-slate-900">
                        ₹{(inv.grandTotal || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        <button
                          onClick={() => openInvoicePrint(inv)}
                          className="p-1 rounded text-slate-400 hover:text-[#5E2B9D] hover:bg-purple-50 cursor-pointer"
                          title="Print Receipt"
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
        <div className="bg-white border border-slate-200/80 rounded-md shadow-xs p-5 flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <h2 className="text-sm font-medium text-slate-900">Low Stock Attention</h2>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
              {lowStockMedicines.length + outOfStockMedicines.length} items
            </span>
          </div>

          <div className="flex-1 divide-y divide-slate-100 mt-2 max-h-[340px] overflow-y-auto">
            {lowStockMedicines.length === 0 && outOfStockMedicines.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <p className="text-xs font-medium text-slate-700">Inventory Well Stocked</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  No depleted or critical items found for this branch.
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
              className="w-full py-2 rounded-md bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors border border-slate-200/80 cursor-pointer"
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
