import React from "react";
import Sidebar from "./Sidebar";
import TopNavbar from "./TopNavbar";
import MobileBottomNav from "./MobileBottomNav";
import AuthGuard from "./AuthGuard";

export default function RetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <div className="min-h-screen flex bg-[#f8fafc] text-slate-800 w-full max-w-full overflow-x-hidden">
        {/* Left Sidebar: 80px width on desktop (hidden on mobile/tablet) */}
        <Sidebar />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 w-full max-w-full overflow-x-hidden">
          <TopNavbar />

          <main className="flex-1 max-w-[1700px] w-full mx-auto px-3 sm:px-6 lg:px-8 pt-4 sm:pt-6 pb-28 lg:pb-8 min-w-0">
            {children}
          </main>
        </div>

        {/* Floating Bottom Navigation Bar (Visible on Mobile & Tablet: < lg) */}
        <MobileBottomNav />
      </div>
    </AuthGuard>
  );
}
