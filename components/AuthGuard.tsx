"use client";

import React, { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter, usePathname } from "next/navigation";
import { ShieldAlert, Loader2 } from "lucide-react";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, currentPharmacy, isLoading, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading) return;

    // Allow public access to login and onboarding pages
    if (pathname === "/login" || pathname === "/onboarding") {
      return;
    }

    // Unauthenticated user -> redirect to login
    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }

    // No active pharmacy or expired/inactive pharmacy -> redirect to onboarding
    if (!currentPharmacy) {
      router.replace("/onboarding");
      return;
    }

    const isExpired =
      !currentPharmacy.expiryDate || new Date(currentPharmacy.expiryDate) <= new Date();

    if (currentPharmacy.status !== "active" || isExpired) {
      router.replace("/onboarding");
      return;
    }

    // If staff accesses root path "/", redirect directly to "/billing"
    if (user?.role === "staff" && (pathname === "/" || pathname === "")) {
      router.replace("/billing");
      return;
    }
  }, [isAuthenticated, currentPharmacy, isLoading, pathname, router, user]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f8fafc]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-[#5E2B9D] animate-spin" />
          <p className="text-xs font-semibold text-slate-500 tracking-wide">
            Verifying Security Session...
          </p>
        </div>
      </div>
    );
  }

  // If on a protected route and not valid, don't render protected content before redirect
  if (
    pathname !== "/login" &&
    pathname !== "/onboarding" &&
    (!isAuthenticated ||
      !currentPharmacy ||
      currentPharmacy.status !== "active" ||
      !currentPharmacy.expiryDate ||
      new Date(currentPharmacy.expiryDate) <= new Date())
  ) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f8fafc] p-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4 border border-amber-200">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Security Verification Required</h2>
        <p className="text-xs text-slate-500 max-w-sm mt-1 mb-4">
          Please select an active, valid pharmacy to access this module.
        </p>
      </div>
    );
  }

  // STRICT SECURITY GATE FOR STAFF ACCOUNTS
  // Staff accounts are strictly limited to /billing and /sales only
  const isStaffAllowedPath =
    pathname === "/billing" ||
    pathname === "/sales" ||
    pathname === "/login" ||
    pathname === "/onboarding";

  if (isAuthenticated && user?.role === "staff" && !isStaffAllowedPath) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f8fafc] p-6 text-center">
        <div className="max-w-md w-full bg-white border border-rose-200 rounded-md p-8 shadow-xs flex flex-col items-center">
          <div className="w-16 h-16 rounded-md bg-rose-50 text-rose-600 flex items-center justify-center mb-4 border border-rose-200">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-purple-50 text-[#5E2B9D] border border-purple-200 mb-3">
            Role: Counter Staff / Cashier
          </div>
          <h2 className="text-lg font-medium text-slate-900">Access Restricted</h2>
          <p className="text-xs text-slate-500 mt-2 leading-relaxed">
            Staff accounts are strictly authorized for <strong>Billing</strong> and <strong>Sales</strong> records only. Access to this management module has been blocked by security policy.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row gap-2.5 w-full">
            <button
              onClick={() => router.push("/billing")}
              className="flex-1 py-2 px-4 rounded-md bg-[#5E2B9D] hover:bg-[#4D2382] text-white font-medium text-xs shadow-xs cursor-pointer"
            >
              Go to Billing Counter
            </button>
            <button
              onClick={() => router.push("/sales")}
              className="flex-1 py-2 px-4 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs cursor-pointer border border-slate-200"
            >
              View Sales Ledger
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
