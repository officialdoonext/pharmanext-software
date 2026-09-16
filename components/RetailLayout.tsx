import React from "react";
import TopNavbar from "./TopNavbar";

export default function RetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc] text-slate-800">
      {/* Top horizontal navigation */}
      <TopNavbar />

      {/* Main Page Area */}
      <main className="flex-1 max-w-[1700px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-7">
        {children}
      </main>
    </div>
  );
}
