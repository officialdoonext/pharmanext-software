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
  Settings,
  LogOut,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";

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

export default function Sidebar() {
  const pathname = usePathname();
  const { logout, user } = useAuth();

  const visibleNavItems = navItems.filter((item) => {
    if (user?.role === "staff") {
      return item.href === "/billing" || item.href === "/sales";
    }
    return true;
  });

  return (
    <aside className="hidden lg:flex w-[80px] min-w-[80px] max-w-[80px] bg-white border-r border-slate-200/80 flex-col justify-between shrink-0 min-h-screen select-none sticky top-0 h-screen z-40">
      {/* Top Brand Logo */}
      <div className="h-16 flex items-center justify-center border-b border-slate-100 shrink-0">
        <Link
          href={user?.role === "staff" ? "/billing" : "/medicines"}
          className="w-10 h-10 rounded-md overflow-hidden flex items-center justify-center p-1 bg-white border border-slate-200/80 hover:scale-105 transition-transform"
          title="PharmaNext"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/app-icon.png"
            alt="PharmaNext Logo"
            className="w-full h-full object-contain"
          />
        </Link>
      </div>

      {/* Menu list with Icon on Top and Text on Bottom */}
      <nav className="flex-1 py-3 px-1.5 space-y-1.5 overflow-y-auto overflow-x-hidden">
        {visibleNavItems.map((item) => {
          const Icon = item.icon;
          const isMedicinesActive =
            item.href === "/medicines" &&
            (pathname.startsWith("/medicines") ||
              pathname === "/products" ||
              pathname === "/");
          const isDashboardActive =
            item.href === "/dashboard" &&
            (pathname === "/" || pathname === "/dashboard");
          const isOtherActive =
            item.href !== "/medicines" &&
            item.href !== "/dashboard" &&
            pathname.startsWith(item.href);
          const isActive = isMedicinesActive || isDashboardActive || isOtherActive;

          return (
            <Link
              key={item.name}
              href={item.href}
              title={item.name}
              className={`w-full py-2 px-1 rounded-md flex flex-col items-center justify-center gap-1 transition-all duration-150 group cursor-pointer ${
                isActive
                  ? "bg-[#5E2B9D] text-white shadow-xs"
                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-100/80"
              }`}
            >
              {/* Menu Icon at Top */}
              <Icon
                className={`w-5 h-5 transition-transform duration-150 group-hover:scale-105 shrink-0 ${
                  isActive ? "text-white stroke-[2.2]" : "text-slate-500 group-hover:text-slate-800"
                }`}
              />

              {/* Menu Text at Bottom */}
              <span
                className={`text-[10px] tracking-tight text-center leading-tight truncate w-full ${
                  isActive
                    ? "font-medium text-white"
                    : "font-normal text-slate-500 group-hover:text-slate-900"
                }`}
              >
                {item.name}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom Logout Action */}
      <div className="p-2 border-t border-slate-100 flex flex-col items-center shrink-0">
        <button
          type="button"
          onClick={logout}
          title="Sign Out"
          className="w-10 h-10 rounded-md flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
}
