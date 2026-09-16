"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  Store,
  Plus,
  ShieldCheck,
  ShieldAlert,
  Calendar,
  MapPin,
  Phone,
  FileBadge,
  ArrowRight,
  LogOut,
  X,
  AlertTriangle,
  Building2,
  Lock,
} from "lucide-react";
import { Pharmacy } from "@/lib/types";

export default function OnboardingPage() {
  const router = useRouter();
  const {
    user,
    pharmacies,
    addPharmacy,
    selectPharmacy,
    logout,
  } = useAuth();

  // Add Pharmacy Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [pharmacyName, setPharmacyName] = useState("");
  const [pharmacyAddress, setPharmacyAddress] = useState("");
  const [pharmacyPhone, setPharmacyPhone] = useState("");
  const [pharmacyLicense, setPharmacyLicense] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  // Security Access Denied Modal state
  const [deniedModalData, setDeniedModalData] = useState<{
    pharmacy: Pharmacy;
    reason: "inactive" | "no_expiry" | "expired";
  } | null>(null);

  // Dynamic pharmacies only - strictly exclude any legacy mock/dummy entries
  const displayedPharmacies = pharmacies.filter((p) => {
    if (
      !p ||
      p.id === "PHARM-1001" ||
      p.id === "PHARM-1002" ||
      p.name?.toLowerCase().includes("medlife") ||
      p.name?.toLowerCase().includes("greencross")
    ) {
      return false;
    }
    if (!user?.email) return true;
    return !p.ownerEmail || p.ownerEmail.toLowerCase() === user.email.toLowerCase();
  });

  // Handle Add Pharmacy Submit
  const handleCreatePharmacy = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pharmacyName.trim() || !pharmacyAddress.trim()) {
      setFormError("Please provide both Pharmacy Name and Address.");
      return;
    }

    // Creates with status: "inactive" and expiryDate: null
    addPharmacy({
      name: pharmacyName,
      address: pharmacyAddress,
      phone: pharmacyPhone,
      licenseNo: pharmacyLicense,
    });

    // Reset and close
    setPharmacyName("");
    setPharmacyAddress("");
    setPharmacyPhone("");
    setPharmacyLicense("");
    setFormError(null);
    setIsAddModalOpen(false);
  };

  // Handle Store Selection with Security Check
  const handleSelectStore = (pharmacy: Pharmacy) => {
    const check = selectPharmacy(pharmacy.id);

    if (check.success) {
      // Access granted! Move to software
      router.push("/medicines");
    } else {
      // Access denied! Show security gate modal
      setDeniedModalData({
        pharmacy,
        reason: check.reason || "inactive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col">
      {/* Top Header Bar */}
      <header className="bg-white border-b border-slate-200/80 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-18 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden shadow-xs flex items-center justify-center bg-white border border-slate-200/80 p-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/doonext-fav.png"
                alt="PharmaNext Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="flex items-center text-2xl font-black tracking-tight">
              <span className="text-[#5E2B9D]">Pharma</span>
              <span className="text-[#059669]">Next</span>
            </div>
          </div>

          {/* User Session Info & Logout */}
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-purple-50 border border-purple-200/80 text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="font-semibold text-slate-700">
                {user?.email || "admin@pharmanext.com"}
              </span>
              <span className="font-bold text-[#5E2B9D] bg-white px-2 py-0.5 rounded-md text-[10px] uppercase border border-purple-100">
                {user?.role || "Admin"}
              </span>
            </div>

            <button
              onClick={logout}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-10">
        {/* Title Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Pharmacy Stores
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Select an active, verified pharmacy to launch the software or register a new store.
            </p>
          </div>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#5E2B9D] hover:bg-[#4D2382] text-white font-bold text-xs tracking-wide shadow-md shadow-purple-500/20 transition-all cursor-pointer w-fit"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Pharmacy</span>
          </button>
        </div>

        {/* Security Rule Notice Banner */}
        <div className="mb-8 p-4 rounded-2xl bg-amber-50/80 border border-amber-200/80 text-amber-900 text-xs flex items-start gap-3 shadow-xs">
          <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1 leading-relaxed">
            <span className="font-bold">Security & Compliance Access Policy:</span> Only
            pharmacies with <span className="underline font-bold">Active Status</span> and a{" "}
            <span className="underline font-bold">Valid, Non-Expired Subscription</span> can
            access billing, inventory, and pharmacy management software. Inactive or newly added
            stores with null expiry cannot access software pages until activated.
          </div>
        </div>

        {/* Dynamic Pharmacy Cards List */}
        {displayedPharmacies.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center max-w-md mx-auto">
            <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-900">No Pharmacy Stores Found</h3>
            <p className="text-xs text-slate-500 mt-1 mb-6">
              You do not have any registered pharmacies under this account. Click below to add your first real pharmacy.
            </p>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-[#5E2B9D] hover:bg-[#4D2382] text-white font-bold text-xs shadow-sm cursor-pointer inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Register Your First Pharmacy</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayedPharmacies.map((pharm) => {
              const isExpired =
                !pharm.expiryDate || new Date(pharm.expiryDate) <= new Date();
              const canAccess = pharm.status === "active" && !isExpired;

              return (
                <div
                  key={pharm.id}
                  className={`bg-white rounded-3xl border p-6 shadow-xs flex flex-col justify-between transition-all relative overflow-hidden ${
                    canAccess
                      ? "border-slate-200/90 hover:border-purple-300 hover:shadow-md"
                      : "border-slate-200 opacity-95 bg-slate-50/50"
                  }`}
                >
                  {/* Top Store Badge Row */}
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${
                            canAccess
                              ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                              : "bg-slate-100 text-slate-400 border-slate-200"
                          }`}
                        >
                          <Store className="w-6 h-6" />
                        </div>
                        <div>
                          <span className="font-mono text-[10px] font-bold text-slate-400">
                            {pharm.id}
                          </span>
                          <h3 className="text-base font-bold text-slate-900 leading-snug">
                            {pharm.name}
                          </h3>
                        </div>
                      </div>

                      {/* Status Pill */}
                      {pharm.status === "active" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-600 border border-rose-200 shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                          Inactive
                        </span>
                      )}
                    </div>

                    {/* Details List */}
                    <div className="space-y-2 py-3 border-y border-slate-100 text-xs text-slate-600">
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                        <span className="line-clamp-2 leading-relaxed">{pharm.address}</span>
                      </div>

                      {pharm.phone && (
                        <div className="flex items-center gap-2 text-slate-500">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span>{pharm.phone}</span>
                        </div>
                      )}

                      {pharm.licenseNo && (
                        <div className="flex items-center gap-2 text-slate-500 font-mono text-[11px]">
                          <FileBadge className="w-3.5 h-3.5 text-slate-400" />
                          <span>{pharm.licenseNo}</span>
                        </div>
                      )}

                      {/* Expiry Date Display */}
                      <div className="flex items-center gap-2 pt-1 font-semibold">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {pharm.expiryDate ? (
                          <span
                            className={
                              new Date(pharm.expiryDate) > new Date()
                                ? "text-emerald-700 font-bold"
                                : "text-rose-600 font-bold"
                            }
                          >
                            Expires:{" "}
                            {new Date(pharm.expiryDate).toLocaleDateString("en-GB", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic font-medium">
                            Expiry Date: <strong className="text-rose-500 font-bold">null</strong> (Not Activated)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="mt-5">
                    {/* Enter Software Button */}
                    <button
                      type="button"
                      onClick={() => handleSelectStore(pharm)}
                      className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        canAccess
                          ? "bg-[#5E2B9D] hover:bg-[#4D2382] text-white shadow-md shadow-purple-500/20"
                          : "bg-slate-200 text-slate-500 hover:bg-slate-300"
                      }`}
                    >
                      {canAccess ? (
                        <>
                          <span>Enter Software</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      ) : (
                        <>
                          <Lock className="w-3.5 h-3.5 text-slate-500" />
                          <span>Locked (Activation Required)</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* MODAL: ADD PHARMACY */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-purple-50 text-[#5E2B9D] flex items-center justify-center">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Add New Pharmacy</h3>
                  <p className="text-xs text-slate-500">
                    Register a new pharmacy branch or counter
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePharmacy} className="mt-5 space-y-4 text-xs">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-medium">
                  {formError}
                </div>
              )}

              {/* Requirement Alert Notice */}
              <div className="p-3 bg-purple-50 border border-purple-100 rounded-xl text-[11px] text-[#5E2B9D] leading-relaxed">
                ℹ️ As requested, new pharmacies will be saved with{" "}
                <span className="font-bold">Status: Inactive</span> and{" "}
                <span className="font-bold">Expiry Date: null</span>. Once activated with a valid
                subscription, users can access the software.
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  Pharmacy / Store Name *
                </label>
                <input
                  type="text"
                  required
                  value={pharmacyName}
                  onChange={(e) => setPharmacyName(e.target.value)}
                  placeholder="e.g. Sanjeevani MediLife Chemist"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#5E2B9D] focus:ring-2 focus:ring-purple-100"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  Pharmacy Store Address *
                </label>
                <textarea
                  rows={2}
                  required
                  value={pharmacyAddress}
                  onChange={(e) => setPharmacyAddress(e.target.value)}
                  placeholder="e.g. Door 4-12, Main Road, Gachibowli, Hyderabad"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#5E2B9D] focus:ring-2 focus:ring-purple-100 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">Contact Phone</label>
                  <input
                    type="text"
                    value={pharmacyPhone}
                    onChange={(e) => setPharmacyPhone(e.target.value)}
                    placeholder="+91 98765 00000"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#5E2B9D]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">
                    Drug License (DL) No.
                  </label>
                  <input
                    type="text"
                    value={pharmacyLicense}
                    onChange={(e) => setPharmacyLicense(e.target.value)}
                    placeholder="DL-TS-2026-9912"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#5E2B9D] font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#5E2B9D] hover:bg-[#4D2382] text-white font-bold transition-all shadow-sm"
                >
                  Save Pharmacy (Inactive)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: SECURITY ACCESS RESTRICTED */}
      {deniedModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-rose-200 text-center relative">
            <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4 border border-rose-200">
              <ShieldAlert className="w-8 h-8" />
            </div>

            <h3 className="text-xl font-bold text-slate-900">Access Restricted</h3>
            <p className="text-xs text-slate-500 mt-1">
              Store:{" "}
              <span className="font-bold text-slate-800">
                {deniedModalData.pharmacy.name}
              </span>
            </p>

            <div className="my-5 p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-left text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Store Status:</span>
                <span className="font-bold text-rose-600 uppercase">
                  {deniedModalData.pharmacy.status}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Subscription Expiry:</span>
                <span className="font-bold text-slate-700">
                  {deniedModalData.pharmacy.expiryDate
                    ? new Date(deniedModalData.pharmacy.expiryDate).toLocaleDateString()
                    : "null (Not Set)"}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200/80 text-[11px] text-amber-900 leading-relaxed text-left mt-3">
                <strong>Administrative Notice:</strong> This store is awaiting manual verification and subscription activation by the administrator. Once activated manually, you will be able to enter the software.
              </div>
            </div>

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => setDeniedModalData(null)}
                className="w-full py-2.5 px-4 rounded-xl bg-[#5E2B9D] hover:bg-[#4D2382] text-white font-bold text-xs tracking-wide transition-all shadow-sm flex items-center justify-center cursor-pointer"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
