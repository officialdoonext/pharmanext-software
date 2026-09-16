"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { APP_CONFIG } from "@/lib/config";
import {
  Home,
  Receipt,
  TrendingUp,
  Pill,
  Users,
  BadgeCheck,
  UserCog,
  Store,
  Settings,
  ChevronDown,
  LogOut,
  RefreshCw,
} from "lucide-react";

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: Home },
  { name: "Billing", href: "/billing", icon: Receipt },
  { name: "Sales", href: "/sales", icon: TrendingUp },
  { name: "Medicines", href: "/medicines", icon: Pill },
  { name: "Customer", href: "/customers", icon: Users },
  { name: "Employees", href: "/employees", icon: BadgeCheck },
  { name: "Staff", href: "/staff", icon: UserCog },
  { name: "Settings", href: "/settings", icon: Settings },
];

export default function TopNavbar() {
  const pathname = usePathname();
  const { user, currentPharmacy, logout } = useAuth();

  return (
    <header className="bg-white border-b border-slate-200/80 sticky top-0 z-40 shadow-xs">
      <div className="max-w-[1700px] mx-auto px-4 sm:px-8 h-20 flex items-center justify-between gap-4">
        {/* PharmaNext Brand Logo & Active Store Pill */}
        <div className="flex items-center gap-4 shrink-0">
          <Link href="/medicines" className="flex items-center gap-2.5 group">
            {/* Logo Icon */}
            <div className="w-11 h-11 rounded-2xl overflow-hidden shadow-xs flex items-center justify-center bg-white border border-slate-200/80 p-1 group-hover:scale-105 transition-transform">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/doonext-fav.png"
                alt="PharmaNext Logo"
                className="w-full h-full object-contain"
              />
            </div>
            {/* Logo Text */}
            <div className="flex flex-col">
              <div className="flex items-center text-2xl font-medium tracking-tight leading-none">
                <span className="text-[#5E2B9D]">Pharma</span>
                <span className="text-[#059669]">Next</span>
              </div>
              <span className="text-[10px] font-medium text-slate-400 tracking-wider uppercase mt-1">
                {APP_CONFIG.appTagline}
              </span>
            </div>
          </Link>

          {/* Active Store Indicator with Switcher */}
          {currentPharmacy && (
            <Link
              href="/onboarding"
              className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-md bg-purple-50 hover:bg-purple-100/70 border border-purple-200/80 text-xs transition-colors group"
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

        {/* Center Navigation Bar */}
        <nav className="flex items-center gap-1 overflow-x-auto py-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isMedicinesActive =
              item.href === "/medicines" &&
              (pathname.startsWith("/medicines") ||
                pathname === "/products" ||
                pathname === "/");
            const isOtherActive =
              item.href !== "/medicines" && pathname.startsWith(item.href);
            const isActive = isMedicinesActive || isOtherActive;

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`relative flex flex-col items-center justify-center px-3.5 py-2 rounded-md transition-all duration-150 group shrink-0 ${
                  isActive
                    ? "text-[#5E2B9D] font-medium"
                    : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                {/* Icon Above */}
                <Icon
                  className={`w-5 h-5 transition-transform duration-150 group-hover:scale-105 ${
                    isActive
                      ? "text-[#5E2B9D] stroke-[2.3]"
                      : "text-slate-400 group-hover:text-slate-700 stroke-[1.9]"
                  }`}
                />

                {/* Text Below */}
                <span
                  className={`text-xs mt-1.5 tracking-tight ${
                    isActive
                      ? "font-medium text-[#5E2B9D]"
                      : "font-normal text-slate-500 group-hover:text-slate-900"
                  }`}
                >
                  {item.name}
                </span>

                {/* Bottom Active Purple Indicator Bar */}
                {isActive && (
                  <span className="absolute -bottom-2 left-2 right-2 h-[3px] bg-[#5E2B9D] rounded-full shadow-xs"></span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Profile, Settings Gear & Logout on Far Right */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
            <Link
              href="/settings"
              title="View Store Settings & Profile"
              className="flex items-center gap-3 group cursor-pointer"
            >
              <div className="w-10 h-10 rounded-md bg-gradient-to-tr from-[#5E2B9D] to-purple-600 ring-2 ring-purple-100 flex items-center justify-center text-white text-xs font-medium shadow-xs shrink-0 group-hover:ring-purple-300 transition-all">
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
