import React from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex bg-[#f5f7fb]">
      {/* Sidebar navigation */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Global Header */}
        <Header />

        {/* Dynamic Page Content */}
        <main className="flex-1 p-8 overflow-y-auto">
          {children}

          {/* Footer */}
          <footer className="mt-10 pt-6 pb-4 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-3">
            <p>© 2026 PharmaNext. All rights reserved.</p>
            <div className="flex items-center gap-3">
              <a href="#" className="hover:text-slate-600 transition-colors">
                Privacy
              </a>
              <span>|</span>
              <a href="#" className="hover:text-slate-600 transition-colors">
                Terms
              </a>
              <span>|</span>
              <a href="#" className="hover:text-slate-600 transition-colors">
                Help
              </a>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}
