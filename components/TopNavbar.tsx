"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import {
  Settings,
  ChevronDown,
  LogOut,
  Printer,
} from "lucide-react";
import { getSavedPrinter, ConnectedPrinterInfo } from "@/lib/thermal-printer";
import PrinterConnectModal from "./PrinterConnectModal";

export default function TopNavbar() {
  const { user, currentPharmacy, logout } = useAuth();
  const [isPrinterModalOpen, setIsPrinterModalOpen] = useState(false);
  const [connectedPrinter, setConnectedPrinter] = useState<ConnectedPrinterInfo | null>(null);

  useEffect(() => {
    setConnectedPrinter(getSavedPrinter());
  }, []);

  return (
    <header className="bg-white border-b border-slate-200/80 sticky top-0 z-30 shadow-xs h-16">
      <div className="w-full px-3 sm:px-6 h-full flex items-center justify-between gap-2 sm:gap-4">
        {/* Left Section: Brand Logo ONLY */}
        <div className="flex items-center shrink-0">
          <Link
            href={user?.role === "staff" ? "/billing" : "/medicines"}
            className="flex items-center shrink-0 hover:opacity-90 transition-opacity"
            title="PharmaNext"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/header-logo.png"
              alt="PharmaNext Logo"
              className="h-7 sm:h-8 md:h-9 w-auto object-contain"
            />
          </Link>
        </div>

        {/* Right Section: Mobile has ONLY Switcher and AR login thing; Desktop adds Printer & Logout */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Pharmacy Switcher Pill (Truncated with ellipsis if long) */}
          {currentPharmacy && (
            <Link
              href="/onboarding"
              className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-md bg-purple-50 hover:bg-purple-100 border border-purple-200/80 text-xs transition-colors group min-w-0 max-w-[125px] sm:max-w-[180px] lg:max-w-xs"
              title={`Active Outlet: ${currentPharmacy.name} (Click to switch)`}
            >
              <div className="w-2 h-2 rounded-full bg-[#5E2B9D] animate-pulse shrink-0" />
              <span className="font-semibold text-slate-700 group-hover:text-[#5E2B9D] truncate text-xs leading-tight">
                {currentPharmacy.name}
              </span>
              <ChevronDown className="w-3 h-3 text-slate-400 group-hover:text-slate-600 shrink-0 hidden sm:inline-block" />
            </Link>
          )}

          {/* Desktop Only (hidden on mobile/tablet): Thermal Printer Button */}
          <div className="hidden lg:flex items-center">
            <button
              type="button"
              onClick={() => setIsPrinterModalOpen(true)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs font-medium transition-colors cursor-pointer ${
                connectedPrinter
                  ? "bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100"
                  : "bg-slate-50 hover:bg-purple-50 border-slate-200 hover:border-purple-200 text-slate-700 hover:text-[#5E2B9D]"
              }`}
              title={connectedPrinter ? `Printer: ${connectedPrinter.name}` : "Connect Thermal Printer (WebUSB / Bluetooth)"}
            >
              <Printer className="w-3.5 h-3.5 shrink-0" />
              <span>
                {connectedPrinter ? connectedPrinter.name.slice(0, 14) : "Connect Printer"}
              </span>
              {connectedPrinter && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
              )}
            </button>
          </div>

          {/* AR Login Profile Badge */}
          <div className="flex items-center gap-2 lg:pl-2 lg:border-l lg:border-slate-200/80">
            {user?.role === "staff" ? (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-md bg-purple-100 border border-purple-200 flex items-center justify-center text-[#5E2B9D] text-xs font-bold shrink-0">
                  {user?.name ? user.name.slice(0, 2).toUpperCase() : "AR"}
                </div>
                <div className="hidden lg:flex flex-col text-left">
                  <span className="text-xs font-medium text-slate-900 leading-tight">
                    {user?.name || "Counter Staff"}
                  </span>
                  <span className="text-[10px] font-medium text-[#5E2B9D] leading-tight">
                    Counter Staff
                  </span>
                </div>
              </div>
            ) : (
              <Link
                href="/settings"
                title="View Store Settings & Profile"
                className="flex items-center gap-2 group cursor-pointer"
              >
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-md bg-gradient-to-tr from-[#5E2B9D] to-purple-600 ring-2 ring-purple-100 flex items-center justify-center text-white text-xs font-bold shadow-xs shrink-0 group-hover:ring-purple-300 transition-all">
                  {user?.name ? user.name.slice(0, 2).toUpperCase() : "AR"}
                </div>
                <div className="hidden lg:flex flex-col text-left">
                  <span className="text-xs font-medium text-slate-900 group-hover:text-[#5E2B9D] leading-tight transition-colors">
                    {user?.name || "Siva Krishna"}
                  </span>
                  <span className="text-[11px] font-normal text-slate-400 leading-tight capitalize">
                    {user?.role ? `${user.role} Admin` : "Store Admin"}
                  </span>
                </div>
              </Link>
            )}
          </div>

          {/* Desktop Only (hidden on mobile/tablet): Direct Settings Gear and Logout */}
          <div className="hidden lg:flex items-center gap-1">
            {user?.role !== "staff" && (
              <Link
                href="/settings"
                title="Store Settings & GST"
                className="p-1.5 sm:p-2 rounded-md text-slate-400 hover:text-[#5E2B9D] hover:bg-purple-50 transition-colors cursor-pointer"
              >
                <Settings className="w-4 h-4" />
              </Link>
            )}

            <button
              onClick={logout}
              title="Log Out"
              className="p-1.5 sm:p-2 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Connect Printer Modal */}
      <PrinterConnectModal
        isOpen={isPrinterModalOpen}
        onClose={() => setIsPrinterModalOpen(false)}
        onPrinterChanged={(info) => setConnectedPrinter(info)}
      />
    </header>
  );
}
