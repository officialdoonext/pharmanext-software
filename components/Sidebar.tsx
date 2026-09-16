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
          <div className="relative w-10 h-10 flex items-center justify-center">
            {/* Custom 4-dot / medical plus icon matching the screenshot */}
            <div className="grid grid-cols-2 gap-1 w-8 h-8 items-center justify-center">
              <div className="w-3.5 h-3.5 rounded-full bg-emerald-500"></div>
              <div className="w-3.5 h-3.5 rounded-full bg-blue-500"></div>
              <div className="w-3.5 h-3.5 rounded-full bg-teal-400"></div>
              <div className="w-3.5 h-3.5 rounded-full bg-emerald-600"></div>
            </div>
          </div>
          <div>
            <div className="flex items-center text-xl font-bold tracking-tight">
              <span className="text-slate-900 font-extrabold">Pharma</span>
              <span className="text-blue-600 font-extrabold">Next</span>
            </div>
            <p className="text-[11px] font-medium text-slate-400 tracking-tight leading-tight">
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
                className={`flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? "bg-[#2563eb] text-white shadow-md shadow-blue-500/20"
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
        <div className="bg-[#f0f5ff] rounded-2xl p-4 border border-blue-100/80">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-blue-600 shadow-sm shrink-0">
              <Headphones className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <h4 className="text-xs font-semibold text-slate-800">Need Help?</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">We&apos;re here for you</p>
              <Link
                href="/support"
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 mt-2 transition-colors"
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
