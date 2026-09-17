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
  const isSettingsActive = pathname.startsWith("/settings");

  const isMoreActive =
    isCustomersActive ||
    isEmployeesActive ||
    isStaffActive ||
    isSettingsActive;

  const moreNavItems = [
    { name: "Customer", href: "/customers", icon: Users },
    { name: "Employees", href: "/employees", icon: BadgeCheck },
    { name: "Staff", href: "/staff", icon: UserCog },
    { name: "Settings", href: "/settings", icon: Settings },
  ];

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
            {/* 1. Billing */}
            <Link
              href="/billing"
              className={`flex-1 bottom-nav-action transition-all duration-200 ${
                isBillingActive
                  ? "bg-purple-50 text-[#5E2B9D] border border-purple-200/80 shadow-2xs font-medium"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 active:scale-95 font-normal"
              }`}
            >
              <Receipt className={`w-5 h-5 ${isBillingActive ? "text-[#5E2B9D] stroke-[2.2]" : "text-slate-500"}`} />
              <span className={`text-[10px] leading-tight mt-0.5 ${isBillingActive ? "font-medium text-[#5E2B9D]" : "text-slate-600"}`}>
                Billing
              </span>
              {isBillingActive && (
                <span className="w-1 h-1 rounded-full bg-[#5E2B9D] mt-0.5"></span>
              )}
            </Link>

            {/* 2. Sales */}
            <Link
              href="/sales"
              className={`flex-1 bottom-nav-action transition-all duration-200 ${
                isSalesActive
                  ? "bg-purple-50 text-[#5E2B9D] border border-purple-200/80 shadow-2xs font-medium"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 active:scale-95 font-normal"
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
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 active:scale-95 font-normal"
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

            {/* 2. Billing */}
            <Link
              href="/billing"
              className={`flex-1 bottom-nav-action transition-all duration-200 ${
                isBillingActive
                  ? "bg-purple-50 text-[#5E2B9D] border border-purple-200/80 shadow-2xs font-medium"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 active:scale-95 font-normal"
              }`}
            >
              <Receipt className={`w-5 h-5 ${isBillingActive ? "text-[#5E2B9D] stroke-[2.2]" : "text-slate-500"}`} />
              <span className={`text-[10px] leading-tight mt-0.5 truncate max-w-[52px] ${isBillingActive ? "font-medium text-[#5E2B9D]" : "text-slate-600"}`}>
                Billing
              </span>
              {isBillingActive && (
                <span className="w-1 h-1 rounded-full bg-[#5E2B9D] mt-0.5"></span>
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
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-end justify-center p-2 sm:p-4 animate-in fade-in duration-200"
          onClick={() => setIsMoreOpen(false)}
        >
          <div
            className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200/90 p-5 space-y-4 max-h-[88vh] overflow-y-auto animate-in slide-in-from-bottom-6 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Handle and Header */}
            <div className="flex flex-col items-center">
              <div className="w-12 h-1 bg-slate-200 rounded-full mb-3"></div>
              <div className="w-full flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-sm font-semibold text-slate-900">Menu</h3>

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

            {/* Menu Items Grid - Exact Names & Icons Only */}
            <div className="grid grid-cols-2 gap-2.5">
              {moreNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setIsMoreOpen(false)}
                    className={`p-3 rounded-xl border flex items-center gap-2.5 transition-all cursor-pointer ${
                      isActive
                        ? "bg-purple-50 border-[#5E2B9D] text-[#5E2B9D] shadow-xs"
                        : "bg-slate-50/70 hover:bg-white border-slate-200/80 text-slate-700 hover:border-purple-200"
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        isActive
                          ? "bg-[#5E2B9D] text-white"
                          : "bg-white text-[#5E2B9D] border border-purple-100"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-semibold text-slate-900">
                      {item.name}
                    </span>
                  </Link>
                );
              })}
            </div>

            {/* Connect Thermal Printer Card */}
            <button
              type="button"
              onClick={() => {
                setIsMoreOpen(false);
                setIsPrinterModalOpen(true);
              }}
              className={`w-full p-3 rounded-xl border flex items-center justify-between transition-all cursor-pointer text-left ${
                connectedPrinter
                  ? "bg-emerald-50/70 border-emerald-200 hover:bg-emerald-50"
                  : "bg-slate-50/70 hover:bg-purple-50/50 border-slate-200/80 hover:border-purple-200"
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    connectedPrinter
                      ? "bg-emerald-600 text-white"
                      : "bg-white text-[#5E2B9D] border border-purple-100"
                  }`}
                >
                  <Printer className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                    <span>Connect Printer</span>
                    {connectedPrinter ? (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold bg-emerald-100 text-emerald-800">
                        Connected
                      </span>
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 truncate max-w-[200px] leading-tight mt-0.5">
                    {connectedPrinter ? connectedPrinter.name : "Thermal WebUSB / Bluetooth"}
                  </p>
                </div>
              </div>

              <div className="text-xs text-[#5E2B9D] font-medium flex items-center gap-0.5 shrink-0 pl-2">
                <span>{connectedPrinter ? "Manage" : "Setup"}</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              </div>
            </button>

            {/* Profile & Logout Action */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#5E2B9D] text-white flex items-center justify-center text-xs font-medium">
                  {user?.name ? user.name.slice(0, 2).toUpperCase() : "AR"}
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-slate-900 leading-tight">
                    {user?.name || "Store Admin"}
                  </span>
                  <span className="text-[10px] text-slate-400 leading-tight capitalize">
                    {user?.role ? `${user.role} Admin` : "Store Admin"}
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
