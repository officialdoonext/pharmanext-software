import React from "react";
import Sidebar from "./Sidebar";
import TopNavbar from "./TopNavbar";
import AuthGuard from "./AuthGuard";

export default function RetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <div className="min-h-screen flex bg-[#f8fafc] text-slate-800">
        {/* Left Sidebar: 80px width, menu icon at top, text at bottom */}
        <Sidebar />

        {/* Right side: Top bar and Main Page Area */}
        <div className="flex-1 flex flex-col min-w-0">
          <TopNavbar />

          <main className="flex-1 max-w-[1700px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {children}
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}
