"use client";

import React, { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter, usePathname } from "next/navigation";
import { ShieldAlert, Loader2 } from "lucide-react";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, currentPharmacy, isLoading } = useAuth();
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
  }, [isAuthenticated, currentPharmacy, isLoading, pathname, router]);

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

  return <>{children}</>;
}
