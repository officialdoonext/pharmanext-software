"use client";

import React, { useState } from "react";
import { Search, Bell, ChevronDown } from "lucide-react";

export default function Header() {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <header className="h-18 bg-white border-b border-slate-200/80 px-8 flex items-center justify-between sticky top-0 z-30">
      {/* Search Bar */}
      <div className="flex-1 max-w-lg">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search medicine, customer, invoice..."
            className="w-full bg-[#f8fafc] hover:bg-[#f1f5f9] focus:bg-white text-sm text-slate-800 placeholder-slate-400 rounded-xl pl-10 pr-20 py-2.5 border border-slate-200/80 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
          />
          <div className="absolute right-3 flex items-center gap-0.5 pointer-events-none">
            <kbd className="text-[11px] font-medium text-slate-400 bg-white px-2 py-0.5 rounded-md border border-slate-200 shadow-xs">
              Ctrl + K
            </kbd>
          </div>
        </div>
      </div>

      {/* Right Controls: Notifications & User Profile */}
      <div className="flex items-center gap-6">
        {/* Notification Bell */}
        <button
          type="button"
          aria-label="Notifications"
          className="relative p-2.5 rounded-xl hover:bg-slate-100/80 text-slate-600 transition-colors"
        >
          <Bell className="w-5 h-5 text-slate-600" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white"></span>
        </button>

        {/* User Profile */}
        <div className="flex items-center gap-3 pl-2 cursor-pointer group">
          <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-700 font-semibold text-sm ring-2 ring-slate-100">
            SK
          </div>
          <div className="flex flex-col text-left">
            <span className="text-sm font-semibold text-slate-800 group-hover:text-blue-600 transition-colors">
              Siva Krishna
            </span>
            <span className="text-xs text-slate-400">Store Admin</span>
          </div>
          <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
        </div>
      </div>
    </header>
  );
}
