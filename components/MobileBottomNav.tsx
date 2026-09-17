"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Receipt,
  TrendingUp,
  Pill,
  Users,
  BadgeCheck,
  UserCog,
  Settings,
  MoreHorizontal,
  LogOut,
  X,
  Printer,
  Store,
  BarChart3,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { getSavedPrinter, ConnectedPrinterInfo } from "@/lib/thermal-printer";
import PrinterConnectModal from "./PrinterConnectModal";

export default function MobileBottomNav() {
  const pathname = usePathname();
  const { user, currentPharmacy, logout } = useAuth();
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [isPrinterModalOpen, setIsPrinterModalOpen] = useState(false);
  const [connectedPrinter, setConnectedPrinter] = useState<ConnectedPrinterInfo | null>(null);

  useEffect(() => {
    setConnectedPrinter(getSavedPrinter());
  }, []);

  // Close drawer on path change
  useEffect(() => {
    setIsMoreOpen(false);
  }, [pathname]);

  const isStaff = user?.role === "staff";

  // Check active routes
  const isDashboardActive =
    pathname === "/" || pathname === "/dashboard";
  const isBillingActive = pathname.startsWith("/billing");
  const isMedicinesActive =
    pathname.startsWith("/medicines") ||
    pathname === "/products";
  const isSalesActive = pathname.startsWith("/sales");

  // Secondary items are active if path matches one of them
  const isCustomersActive = pathname.startsWith("/customers");
  const isEmployeesActive = pathname.startsWith("/employees");
  const isStaffActive = pathname.startsWith("/staff");
  const isReportsActive = pathname.startsWith("/reports");
  const isSettingsActive = pathname.startsWith("/settings");

  const isMoreActive =
    isCustomersActive ||
    isEmployeesActive ||
    isStaffActive ||
    isReportsActive ||
    isSettingsActive;

  return (
    <>
      {/* ------------------------------------------------------------- */}
      {/* FLOATING BOTTOM BAR (Visible on Mobile & Tablet: < lg)         */}
      {/* ------------------------------------------------------------- */}
      <nav
        aria-label="Mobile Navigation"
        className="fixed bottom-3 inset-x-3 z-40 lg:hidden max-w-lg mx-auto bg-white/95 backdrop-blur-xl border border-slate-200/90 shadow-[0_12px_36px_rgba(94,43,157,0.12),0_4px_12px_rgba(0,0,0,0.06)] mobile-bottom-dock px-2 py-1.5 flex items-center justify-between gap-1 select-none transition-all duration-200"
      >
        {isStaff ? (
          // ================= STAFF ROLE NAVIGATION =================
          <>
            {/* 1. Billing (Primary Counter) */}
            <Link
              href="/billing"
              className={`flex-1 bottom-nav-action transition-all duration-200 ${
                isBillingActive
                  ? "bg-gradient-to-tr from-[#5E2B9D] to-purple-600 text-white shadow-md shadow-purple-900/25"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 active:scale-95"
              }`}
            >
              <Receipt className={`w-5 h-5 ${isBillingActive ? "text-white stroke-[2.2]" : "text-slate-500"}`} />
              <span className={`text-[10px] leading-tight mt-0.5 ${isBillingActive ? "font-medium text-white" : "text-slate-600"}`}>
                Billing
              </span>
              {isBillingActive && (
                <span className="w-1 h-1 rounded-full bg-white mt-0.5"></span>
              )}
            </Link>

            {/* 2. Sales */}
            <Link
              href="/sales"
              className={`flex-1 bottom-nav-action transition-all duration-200 ${
                isSalesActive
                  ? "bg-purple-50 text-[#5E2B9D] border border-purple-200/80 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 active:scale-95"
              }`}
            >
              <TrendingUp className={`w-5 h-5 ${isSalesActive ? "text-[#5E2B9D] stroke-[2.2]" : "text-slate-500"}`} />
              <span className={`text-[10px] leading-tight mt-0.5 ${isSalesActive ? "font-medium text-[#5E2B9D]" : "text-slate-600"}`}>
                Sales
              </span>
              {isSalesActive && (
                <span className="w-1 h-1 rounded-full bg-[#5E2B9D] mt-0.5"></span>
              )}
            </Link>

            {/* 3. Thermal Printer */}
            <button
              type="button"
              onClick={() => setIsPrinterModalOpen(true)}
              className="flex-1 bottom-nav-action text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 active:scale-95 transition-all duration-200 relative"
            >
              <Printer className="w-5 h-5 text-slate-500" />
              {connectedPrinter && (
                <span className="absolute top-2 right-4 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white"></span>
              )}
              <span className="text-[10px] leading-tight text-slate-600 mt-0.5">
                {connectedPrinter ? "Printer •" : "Printer"}
              </span>
            </button>

            {/* 4. Logout */}
            <button
              type="button"
              onClick={logout}
              className="flex-1 bottom-nav-action text-slate-600 hover:text-rose-600 hover:bg-rose-50/70 active:scale-95 transition-all duration-200"
            >
              <LogOut className="w-5 h-5 text-slate-500 group-hover:text-rose-600" />
              <span className="text-[10px] leading-tight text-slate-600 mt-0.5">
                Logout
              </span>
            </button>
          </>
        ) : (
          // ================= ADMIN / STORE OWNER NAVIGATION =================
          <>
            {/* 1. Dashboard / Home */}
            <Link
              href="/dashboard"
              className={`flex-1 bottom-nav-action transition-all duration-200 ${
                isDashboardActive
                  ? "bg-purple-50 text-[#5E2B9D] border border-purple-200/80 shadow-2xs font-medium"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 active:scale-95"
              }`}
            >
              <Home className={`w-5 h-5 ${isDashboardActive ? "text-[#5E2B9D] stroke-[2.2]" : "text-slate-500"}`} />
              <span className={`text-[10px] leading-tight mt-0.5 truncate max-w-[52px] ${isDashboardActive ? "font-medium text-[#5E2B9D]" : "text-slate-600"}`}>
                Home
              </span>
              {isDashboardActive && (
                <span className="w-1 h-1 rounded-full bg-[#5E2B9D] mt-0.5"></span>
              )}
            </Link>

            {/* 2. Billing (Hero Counter Action) */}
            <Link
              href="/billing"
              className={`flex-1 bottom-nav-action transition-all duration-200 ${
                isBillingActive
                  ? "bg-gradient-to-tr from-[#5E2B9D] to-purple-600 text-white shadow-md shadow-purple-900/25 -translate-y-0.5"
                  : "text-[#5E2B9D] bg-purple-50/70 hover:bg-purple-100/70 border border-purple-200/60 active:scale-95"
              }`}
            >
              <Receipt className={`w-5 h-5 ${isBillingActive ? "text-white stroke-[2.2]" : "text-[#5E2B9D]"}`} />
              <span className={`text-[10px] leading-tight mt-0.5 truncate max-w-[52px] font-medium ${isBillingActive ? "text-white" : "text-[#5E2B9D]"}`}>
                Billing
              </span>
              {isBillingActive && (
                <span className="w-1 h-1 rounded-full bg-white mt-0.5"></span>
              )}
            </Link>

            {/* 3. Medicines */}
            <Link
              href="/medicines"
              className={`flex-1 bottom-nav-action transition-all duration-200 ${
                isMedicinesActive
                  ? "bg-purple-50 text-[#5E2B9D] border border-purple-200/80 shadow-2xs font-medium"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 active:scale-95"
              }`}
            >
              <Pill className={`w-5 h-5 ${isMedicinesActive ? "text-[#5E2B9D] stroke-[2.2]" : "text-slate-500"}`} />
              <span className={`text-[10px] leading-tight mt-0.5 truncate max-w-[52px] ${isMedicinesActive ? "font-medium text-[#5E2B9D]" : "text-slate-600"}`}>
                Medicines
              </span>
              {isMedicinesActive && (
                <span className="w-1 h-1 rounded-full bg-[#5E2B9D] mt-0.5"></span>
              )}
            </Link>

            {/* 4. Sales */}
            <Link
              href="/sales"
              className={`flex-1 bottom-nav-action transition-all duration-200 ${
                isSalesActive
                  ? "bg-purple-50 text-[#5E2B9D] border border-purple-200/80 shadow-2xs font-medium"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 active:scale-95"
              }`}
            >
              <TrendingUp className={`w-5 h-5 ${isSalesActive ? "text-[#5E2B9D] stroke-[2.2]" : "text-slate-500"}`} />
              <span className={`text-[10px] leading-tight mt-0.5 truncate max-w-[52px] ${isSalesActive ? "font-medium text-[#5E2B9D]" : "text-slate-600"}`}>
                Sales
              </span>
              {isSalesActive && (
                <span className="w-1 h-1 rounded-full bg-[#5E2B9D] mt-0.5"></span>
              )}
            </Link>

            {/* 5. More Menu Toggle */}
            <button
              type="button"
              onClick={() => setIsMoreOpen(true)}
              className={`flex-1 bottom-nav-action transition-all duration-200 relative ${
                isMoreActive || isMoreOpen
                  ? "bg-purple-50 text-[#5E2B9D] border border-purple-200/80 shadow-2xs font-medium"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 active:scale-95"
              }`}
            >
              <MoreHorizontal className={`w-5 h-5 ${isMoreActive || isMoreOpen ? "text-[#5E2B9D]" : "text-slate-500"}`} />
              {isMoreActive && (
                <span className="absolute top-2 right-3 sm:right-5 w-1.5 h-1.5 rounded-full bg-[#5E2B9D] ring-2 ring-white"></span>
              )}
              <span className={`text-[10px] leading-tight mt-0.5 truncate max-w-[52px] ${isMoreActive || isMoreOpen ? "font-medium text-[#5E2B9D]" : "text-slate-600"}`}>
                More
              </span>
              {(isMoreActive || isMoreOpen) && (
                <span className="w-1 h-1 rounded-full bg-[#5E2B9D] mt-0.5"></span>
              )}
            </button>
          </>
        )}
      </nav>

      {/* ------------------------------------------------------------- */}
      {/* "MORE" SLIDE-UP DRAWER SHEET                                   */}
      {/* ------------------------------------------------------------- */}
      {isMoreOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-end justify-center p-2 sm:p-4 animate-in fade-in duration-200">
          <div
            className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200/90 p-5 space-y-4 max-h-[88vh] overflow-y-auto animate-in slide-in-from-bottom-6 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Handle and Header */}
            <div className="flex flex-col items-center">
              <div className="w-12 h-1 bg-slate-200 rounded-full mb-3"></div>
              <div className="w-full flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-md bg-purple-50 text-[#5E2B9D] border border-purple-200 flex items-center justify-center">
                    <Store className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-slate-900 line-clamp-1">
                      {currentPharmacy?.name || "Active Store"}
                    </h3>
                    <p className="text-[10px] text-slate-400">
                      {currentPharmacy?.licenseNo ? `DL: ${currentPharmacy.licenseNo}` : "PharmaNext System"}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsMoreOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
                  title="Close Menu"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Quick Outlets / Store Switcher Bar */}
            <Link
              href="/onboarding"
              onClick={() => setIsMoreOpen(false)}
              className="flex items-center justify-between p-3 rounded-xl bg-purple-50/60 hover:bg-purple-100/70 border border-purple-200/70 transition-colors group cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-[#5E2B9D] animate-pulse"></span>
                <div>
                  <span className="text-xs font-medium text-slate-900 group-hover:text-[#5E2B9D] transition-colors">
                    Switch Active Store
                  </span>
                  <p className="text-[10px] text-slate-500">
                    Access multi-branch pharmacy management
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#5E2B9D] transition-colors" />
            </Link>

            {/* Secondary Modules Grid */}
            <div className="grid grid-cols-2 gap-2.5">
              {/* Customers */}
              <Link
                href="/customers"
                onClick={() => setIsMoreOpen(false)}
                className={`p-3 rounded-xl border flex flex-col gap-1 transition-all group cursor-pointer ${
                  isCustomersActive
                    ? "bg-purple-50 border-[#5E2B9D] text-[#5E2B9D]"
                    : "bg-slate-50/60 hover:bg-white border-slate-200/80 text-slate-700 hover:border-purple-200"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Users className="w-4 h-4" />
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500" />
                </div>
                <span className="text-xs font-medium mt-1">Customers</span>
                <span className="text-[10px] text-slate-400">Patients & Ledger</span>
              </Link>

              {/* Employees */}
              <Link
                href="/employees"
                onClick={() => setIsMoreOpen(false)}
                className={`p-3 rounded-xl border flex flex-col gap-1 transition-all group cursor-pointer ${
                  isEmployeesActive
                    ? "bg-purple-50 border-[#5E2B9D] text-[#5E2B9D]"
                    : "bg-slate-50/60 hover:bg-white border-slate-200/80 text-slate-700 hover:border-purple-200"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="w-7 h-7 rounded-lg bg-purple-50 text-[#5E2B9D] flex items-center justify-center">
                    <BadgeCheck className="w-4 h-4" />
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500" />
                </div>
                <span className="text-xs font-medium mt-1">Employees</span>
                <span className="text-[10px] text-slate-400">Payroll & Wages</span>
              </Link>

              {/* Staff Access */}
              <Link
                href="/staff"
                onClick={() => setIsMoreOpen(false)}
                className={`p-3 rounded-xl border flex flex-col gap-1 transition-all group cursor-pointer ${
                  isStaffActive
                    ? "bg-purple-50 border-[#5E2B9D] text-[#5E2B9D]"
                    : "bg-slate-50/60 hover:bg-white border-slate-200/80 text-slate-700 hover:border-purple-200"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <UserCog className="w-4 h-4" />
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500" />
                </div>
                <span className="text-xs font-medium mt-1">Staff Logins</span>
                <span className="text-[10px] text-slate-400">Counter MPIN</span>
              </Link>

              {/* Reports */}
              <Link
                href="/reports"
                onClick={() => setIsMoreOpen(false)}
                className={`p-3 rounded-xl border flex flex-col gap-1 transition-all group cursor-pointer ${
                  isReportsActive
                    ? "bg-purple-50 border-[#5E2B9D] text-[#5E2B9D]"
                    : "bg-slate-50/60 hover:bg-white border-slate-200/80 text-slate-700 hover:border-purple-200"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                    <BarChart3 className="w-4 h-4" />
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500" />
                </div>
                <span className="text-xs font-medium mt-1">Reports</span>
                <span className="text-[10px] text-slate-400">Financial Audit</span>
              </Link>

              {/* Settings */}
              <Link
                href="/settings"
                onClick={() => setIsMoreOpen(false)}
                className={`p-3 rounded-xl border flex flex-col gap-1 transition-all group cursor-pointer ${
                  isSettingsActive
                    ? "bg-purple-50 border-[#5E2B9D] text-[#5E2B9D]"
                    : "bg-slate-50/60 hover:bg-white border-slate-200/80 text-slate-700 hover:border-purple-200"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <Settings className="w-4 h-4" />
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500" />
                </div>
                <span className="text-xs font-medium mt-1">Store Settings</span>
                <span className="text-[10px] text-slate-400">GST, Profile, DL</span>
              </Link>

              {/* Thermal Printer Toggle */}
              <button
                type="button"
                onClick={() => {
                  setIsMoreOpen(false);
                  setIsPrinterModalOpen(true);
                }}
                className="p-3 rounded-xl border bg-slate-50/60 hover:bg-white border-slate-200/80 text-slate-700 hover:border-purple-200 flex flex-col gap-1 transition-all text-left group cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                    <Printer className="w-4 h-4" />
                  </div>
                  {connectedPrinter ? (
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500" />
                  )}
                </div>
                <span className="text-xs font-medium mt-1">Thermal Printer</span>
                <span className="text-[10px] text-slate-400">
                  {connectedPrinter ? "Connected" : "WebUSB / BT"}
                </span>
              </button>
            </div>

            {/* Profile & Logout Action */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#5E2B9D] text-white flex items-center justify-center text-xs font-medium">
                  {user ? user.name.slice(0, 2).toUpperCase() : "AD"}
                </div>
                <div>
                  <span className="text-xs font-medium text-slate-900 block leading-tight">
                    {user?.name || "Store Admin"}
                  </span>
                  <span className="text-[10px] text-slate-400 block leading-tight capitalize">
                    {user?.role ? `${user.role} Access` : "Administrator"}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsMoreOpen(false);
                  logout();
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-medium transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Printer Modal */}
      <PrinterConnectModal
        isOpen={isPrinterModalOpen}
        onClose={() => setIsPrinterModalOpen(false)}
        onPrinterChanged={(info) => setConnectedPrinter(info)}
      />
    </>
  );
}
