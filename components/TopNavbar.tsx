"use client";

import React from "react";
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
];

export default function TopNavbar() {
  const pathname = usePathname();

  return (
    <header className="bg-white border-b border-slate-200/80 sticky top-0 z-40 shadow-xs">
      <div className="max-w-[1700px] mx-auto px-4 sm:px-8 h-20 flex items-center justify-between gap-6">
        {/* PharmaNext Brand Logo */}
        <div className="flex items-center gap-3 shrink-0">
          <Link href="/medicines" className="flex items-center gap-2.5 group">
            {/* Logo Icon */}
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#3b0764] via-[#581c87] to-[#059669] flex items-center justify-center shadow-sm shadow-purple-500/20">
              <div className="grid grid-cols-2 gap-1 w-5 h-5 items-center justify-center">
                <div className="w-2 h-2 rounded-sm bg-white"></div>
                <div className="w-2 h-2 rounded-sm bg-emerald-300"></div>
                <div className="w-2 h-2 rounded-sm bg-teal-300"></div>
                <div className="w-2 h-2 rounded-sm bg-white"></div>
              </div>
            </div>
            {/* Logo Text */}
            <div className="flex flex-col">
              <div className="flex items-center text-2xl font-black tracking-tight leading-none">
                <span className="text-[#3b0764]">Pharma</span>
                <span className="text-[#059669]">Next</span>
              </div>
              <span className="text-[10px] font-semibold text-slate-400 tracking-wider uppercase mt-1">
                Smart Pharmacy POS
              </span>
            </div>
          </Link>
        </div>

        {/* Center Horizontal Menu - Icon on TOP, Text BELOW */}
        <nav className="flex items-center gap-2 sm:gap-4 md:gap-6 flex-1 justify-center px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            // Medicines is active if on /medicines, /products, or /
            const isMedicinesActive =
              item.href === "/medicines" &&
              (pathname === "/medicines" ||
                pathname === "/products" ||
                pathname === "/");
            const isOtherActive =
              item.href !== "/medicines" && pathname.startsWith(item.href);
            const isActive = isMedicinesActive || isOtherActive;

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`relative flex flex-col items-center justify-center px-4 py-2 rounded-xl transition-all duration-150 group shrink-0 ${
                  isActive
                    ? "text-[#581c87] font-bold"
                    : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                {/* Icon Above */}
                <Icon
                  className={`w-5 h-5 transition-transform duration-150 group-hover:scale-105 ${
                    isActive
                      ? "text-[#581c87] stroke-[2.3]"
                      : "text-slate-400 group-hover:text-slate-700 stroke-[1.9]"
                  }`}
                />

                {/* Text Below */}
                <span
                  className={`text-xs mt-1.5 tracking-tight ${
                    isActive
                      ? "font-bold text-[#581c87]"
                      : "font-semibold text-slate-500 group-hover:text-slate-900"
                  }`}
                >
                  {item.name}
                </span>

                {/* Bottom Active Purple Indicator Bar */}
                {isActive && (
                  <span className="absolute -bottom-2 left-2 right-2 h-[3px] bg-[#581c87] rounded-full shadow-xs"></span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Profile on Far Right */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#581c87] to-purple-600 ring-2 ring-purple-100 flex items-center justify-center text-white text-xs font-bold shadow-xs shrink-0">
              SK
            </div>
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-xs font-bold text-slate-900 leading-tight">
                Siva Krishna
              </span>
              <span className="text-[11px] font-medium text-slate-400 leading-tight">
                Store Admin
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
