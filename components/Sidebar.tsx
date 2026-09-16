"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  ShoppingCart,
  TrendingUp,
  Pill,
  Users,
  BadgeCheck,
  UserCog,
  Settings,
  Headphones,
  ArrowRight,
} from "lucide-react";

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  { name: "Dashboard", href: "/", icon: Home },
  { name: "Billing", href: "/billing", icon: ShoppingCart },
  { name: "Sales", href: "/sales", icon: TrendingUp },
  { name: "Medicines", href: "/medicines", icon: Pill },
  { name: "Customers", href: "/customers", icon: Users },
  { name: "Employees", href: "/employees", icon: BadgeCheck },
  { name: "Staff", href: "/staff", icon: UserCog },
  { name: "Settings", href: "/settings", icon: Settings },
  { name: "Support", href: "/support", icon: Headphones },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-white border-r border-slate-200/80 flex flex-col justify-between shrink-0 min-h-screen select-none sticky top-0 h-screen">
      {/* Top section: Logo & Nav */}
      <div className="flex flex-col flex-1 overflow-y-auto">
        {/* Brand Logo */}
        <div className="p-6 pb-5 flex items-center gap-3">
          <div className="relative w-10 h-10 rounded-xl overflow-hidden shadow-xs flex items-center justify-center bg-white border border-slate-200/80 p-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/doonext-fav.png"
              alt="PharmaNext Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <div className="flex items-center text-xl font-medium tracking-tight">
              <span className="text-slate-900">Pharma</span>
              <span className="text-[#5E2B9D]">Next</span>
            </div>
            <p className="text-[11px] font-normal text-slate-400 tracking-tight leading-tight">
              Smart Pharmacy. Healthy Tomorrow.
            </p>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="px-4 py-2 space-y-1.5 flex-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/"
                ? pathname === "/" || pathname === "/dashboard"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3.5 px-4 py-2.5 rounded-md text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? "bg-[#5E2B9D] text-white shadow-md shadow-purple-900/20"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80"
                }`}
              >
                <Icon
                  className={`w-5 h-5 transition-transform duration-150 ${
                    isActive ? "text-white" : "text-slate-500"
                  }`}
                />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom Help & Version Section */}
      <div className="p-4 space-y-4">
        {/* Need Help Card */}
        <div className="bg-purple-50/70 rounded-md p-4 border border-purple-100/80">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-md bg-white flex items-center justify-center text-[#5E2B9D] shadow-xs shrink-0">
              <Headphones className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <h4 className="text-xs font-medium text-slate-800">Need Help?</h4>
              <p className="text-[11px] font-normal text-slate-500 mt-0.5">We&apos;re here for you</p>
              <Link
                href="/support"
                className="inline-flex items-center gap-1 text-[11px] font-medium text-[#5E2B9D] hover:text-[#4D2382] mt-2 transition-colors"
              >
                <span>Contact Support</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>

        {/* Brand Footer Version */}
        <div className="flex items-center gap-2 px-2 pt-1 pb-2">
          <div className="grid grid-cols-2 gap-0.5 w-5 h-5 items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
            <div className="w-2 h-2 rounded-full bg-teal-400"></div>
            <div className="w-2 h-2 rounded-full bg-emerald-600"></div>
          </div>
          <div>
            <p className="text-xs font-bold text-slate-700">PharmaNext</p>
            <p className="text-[10px] text-slate-400">v1.0.0</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
