"use client";

import React from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import {
  Settings,
  ChevronDown,
  LogOut,
} from "lucide-react";

export default function TopNavbar() {
  const { user, currentPharmacy, logout } = useAuth();

  return (
    <header className="bg-white border-b border-slate-200/80 sticky top-0 z-30 shadow-xs h-16">
      <div className="w-full px-4 sm:px-6 h-full flex items-center justify-between gap-4">
        {/* Active Store Indicator with Switcher */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="flex items-center text-xl font-medium tracking-tight leading-none">
              <span className="text-[#5E2B9D]">Pharma</span>
              <span className="text-[#059669]">Next</span>
            </div>
            <span className="text-[10px] text-slate-400 font-medium hidden sm:inline-block">
              POS System
            </span>
          </div>

          {currentPharmacy && (
            <Link
              href="/onboarding"
              className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-purple-50 hover:bg-purple-100/70 border border-purple-200/80 text-xs transition-colors group"
              title="Click to view pharmacy profile or switch outlet"
            >
              <div className="w-2 h-2 rounded-full bg-[#5E2B9D] animate-pulse"></div>
              <span className="font-medium text-slate-700 group-hover:text-[#5E2B9D] transition-colors">
                {currentPharmacy.name}
              </span>
              <span className="text-[10px] bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-500 font-medium">
                {currentPharmacy.licenseNo ? `Lic: ${currentPharmacy.licenseNo}` : "Main Outlet"}
              </span>
              <ChevronDown className="w-3 h-3 text-slate-400 group-hover:text-slate-600 transition-colors" />
            </Link>
          )}
        </div>

        {/* User Profile, Settings Gear & Logout on Far Right */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="flex items-center gap-3 pl-3">
            <Link
              href="/settings"
              title="View Store Settings & Profile"
              className="flex items-center gap-2.5 group cursor-pointer"
            >
              <div className="w-9 h-9 rounded-md bg-gradient-to-tr from-[#5E2B9D] to-purple-600 ring-2 ring-purple-100 flex items-center justify-center text-white text-xs font-medium shadow-xs shrink-0 group-hover:ring-purple-300 transition-all">
                {user ? user.name.slice(0, 2).toUpperCase() : "SK"}
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-xs font-medium text-slate-900 group-hover:text-[#5E2B9D] leading-tight transition-colors">
                  {user?.name || "Siva Krishna"}
                </span>
                <span className="text-[11px] font-normal text-slate-400 leading-tight capitalize">
                  {user?.role ? `${user.role} Admin` : "Store Admin"}
                </span>
              </div>
            </Link>

            {/* Direct Settings Gear button */}
            <Link
              href="/settings"
              title="Store Settings & GST"
              className="p-2 rounded-md text-slate-400 hover:text-[#5E2B9D] hover:bg-purple-50 transition-colors cursor-pointer"
            >
              <Settings className="w-4 h-4" />
            </Link>

            {/* Logout button */}
            <button
              onClick={logout}
              title="Log Out"
              className="p-2 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
