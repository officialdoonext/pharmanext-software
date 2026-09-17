"use client";

import React, { useState, useEffect } from "react";
import {
  Store,
  Receipt,
  CheckCircle2,
  AlertCircle,
  Save,
  Building2,
  Phone,
  Mail,
  MapPin,
  FileBadge2,
  Percent,
  ShieldCheck,
  Eye,
  RotateCcw,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import {
  PharmacySettings,
  defaultPharmacySettings,
  getLocalPharmacySettings,
  savePharmacySettings,
  fetchRemotePharmacySettings,
} from "@/lib/pharmacy-settings";

export default function SettingsContent() {
  const { currentPharmacy } = useAuth();
  const [settings, setSettings] = useState<PharmacySettings>(() =>
    getLocalPharmacySettings(currentPharmacy?.id, currentPharmacy || undefined)
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    async function loadSettings() {
      const data = await fetchRemotePharmacySettings(currentPharmacy?.id, currentPharmacy || undefined);
      setSettings(data);
    }
    loadSettings();
  }, [currentPharmacy]);

  const handleTotalGstChange = (val: number) => {
    const half = +(val / 2).toFixed(2);
    setSettings((prev) => ({
      ...prev,
      gstPercentage: val,
      cgstPercentage: half,
      sgstPercentage: half,
    }));
  };

  const handleCgstChange = (val: number) => {
    setSettings((prev) => ({
      ...prev,
      cgstPercentage: val,
      gstPercentage: +(val + prev.sgstPercentage).toFixed(2),
    }));
  };

  const handleSgstChange = (val: number) => {
    setSettings((prev) => ({
      ...prev,
      sgstPercentage: val,
      gstPercentage: +(prev.cgstPercentage + val).toFixed(2),
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveMessage(null);

    try {
      await savePharmacySettings(settings, currentPharmacy?.id);
      setSaveMessage({
        type: "success",
        text: "Store profile and GST configuration saved successfully! These details will automatically appear on all thermal and A5 bills.",
      });
      setTimeout(() => setSaveMessage(null), 5000);
    } catch (err: any) {
      setSaveMessage({
        type: "error",
        text: err?.message || "Failed to save settings. Please try again.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Store Settings &amp; GST Setup
            </h1>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-100 text-[#5E2B9D] border border-purple-200">
              Billing Configuration
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure pharmacy profile details and GST percentages used across all sales and invoices.
          </p>
        </div>

        {saveMessage && (
          <div
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border animate-in fade-in ${
              saveMessage.type === "success"
                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                : "bg-rose-50 text-rose-800 border-rose-200"
            }`}
          >
            {saveMessage.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600" />
            )}
            <span>{saveMessage.text}</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Form Fields (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Section 1: Pharmacy Profile Details */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-5">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-2xl bg-purple-50 text-[#5E2B9D] border border-purple-100 flex items-center justify-center shadow-xs">
                <Store className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Pharmacy Profile Details
                </h3>
                <p className="text-[11px] text-slate-400">
                  Printed in bill header, tax invoices, and prescription slips
                </p>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              {/* Pharmacy Name */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  <span>Pharmacy Name</span> <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={settings.pharmacyName}
                  onChange={(e) =>
                    setSettings({ ...settings, pharmacyName: e.target.value })
                  }
                  placeholder="e.g. Sri Krishna Pharmacy & Healthcare"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-[#5E2B9D] text-slate-900 font-bold text-xs"
                />
              </div>

              {/* Phone & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>Mobile / Phone Number</span> <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={settings.phone}
                    onChange={(e) =>
                      setSettings({ ...settings, phone: e.target.value })
                    }
                    placeholder="e.g. +91 98765 43210"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-[#5E2B9D] text-slate-900 text-xs font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>Email Address</span> <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={settings.email}
                    onChange={(e) =>
                      setSettings({ ...settings, email: e.target.value })
                    }
                    placeholder="e.g. billing@pharmacynext.in"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-[#5E2B9D] text-slate-900 text-xs font-medium"
                  />
                </div>
              </div>

              {/* Full Address */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>Full Address</span> <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  value={settings.address}
                  onChange={(e) =>
                    setSettings({ ...settings, address: e.target.value })
                  }
                  placeholder="e.g. Shop #4, Ground Floor, Sri Sai Complex, Main Road, Hyderabad - 500001"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-[#5E2B9D] text-slate-900 text-xs font-medium resize-none"
                />
              </div>

              {/* Drug License Number & Pharmacist Credentials */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <FileBadge2 className="w-3.5 h-3.5 text-slate-400" />
                    <span>Drug License No. (DL 20B/21B)</span>
                  </label>
                  <input
                    type="text"
                    value={settings.drugLicenseNo || ""}
                    onChange={(e) =>
                      setSettings({ ...settings, drugLicenseNo: e.target.value })
                    }
                    placeholder="e.g. DL-20B/1234, DL-21B/5678"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-[#5E2B9D] text-slate-900 text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                    <span>Registered Pharmacist</span>
                  </label>
                  <input
                    type="text"
                    value={settings.pharmacistName || ""}
                    onChange={(e) =>
                      setSettings({ ...settings, pharmacistName: e.target.value })
                    }
                    placeholder="e.g. Siva Krishna (Reg. 54129)"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-[#5E2B9D] text-slate-900 text-xs"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: GST Configuration */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shadow-xs">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    GST Billing Details
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Enable GST and configure GSTIN, total rate, CGST, and SGST
                  </p>
                </div>
              </div>

              {/* Enable / Disable Toggle Switch */}
              <label className="flex items-center gap-2.5 cursor-pointer">
                <span className="text-xs font-bold text-slate-700">
                  {settings.gstEnabled ? "GST Enabled" : "GST Disabled"}
                </span>
                <div className="relative inline-flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.gstEnabled}
                    onChange={(e) =>
                      setSettings({ ...settings, gstEnabled: e.target.checked })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#5E2B9D]"></div>
                </div>
              </label>
            </div>

            {settings.gstEnabled ? (
              <div className="space-y-4 text-xs animate-in fade-in duration-200">
                {/* GSTIN Number */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <FileBadge2 className="w-3.5 h-3.5 text-purple-600" />
                    <span>GST Number (GSTIN)</span> <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required={settings.gstEnabled}
                    maxLength={15}
                    value={settings.gstNumber}
                    onChange={(e) =>
                      setSettings({ ...settings, gstNumber: e.target.value.toUpperCase() })
                    }
                    placeholder="e.g. 36AAACP1234A1Z5"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-[#5E2B9D] text-slate-900 font-mono font-bold text-xs uppercase"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    15-character Government of India Goods &amp; Services Tax Identification Number
                  </span>
                </div>

                {/* Quick Presets */}
                <div>
                  <label className="block font-semibold text-slate-600 mb-1.5">
                    Quick Tax Slabs (Medical Presets):
                  </label>
                  <div className="flex items-center gap-2 flex-wrap">
                    {[
                      { label: "0% (Exempt)", val: 0 },
                      { label: "5% (CGST 2.5% + SGST 2.5%)", val: 5 },
                      { label: "12% (CGST 6% + SGST 6%) - Standard", val: 12 },
                      { label: "18% (CGST 9% + SGST 9%)", val: 18 },
                    ].map((preset) => (
                      <button
                        key={preset.val}
                        type="button"
                        onClick={() => handleTotalGstChange(preset.val)}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                          settings.gstPercentage === preset.val
                            ? "bg-[#5E2B9D] text-white border-[#5E2B9D] shadow-xs"
                            : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Percentage Inputs: Total, CGST, SGST */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-purple-50/50 rounded-2xl border border-purple-100">
                  <div>
                    <label className="block font-bold text-purple-950 mb-1 flex items-center gap-1">
                      <Percent className="w-3.5 h-3.5 text-purple-600" />
                      <span>Total GST %</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={settings.gstPercentage}
                      onChange={(e) =>
                        handleTotalGstChange(parseFloat(e.target.value) || 0)
                      }
                      className="w-full px-3 py-2 rounded-xl border border-purple-200 bg-white font-bold text-slate-900 text-xs focus:outline-none focus:border-[#5E2B9D]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      CGST % (Central)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="50"
                      value={settings.cgstPercentage}
                      onChange={(e) =>
                        handleCgstChange(parseFloat(e.target.value) || 0)
                      }
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-semibold text-slate-900 text-xs focus:outline-none focus:border-[#5E2B9D]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      SGST % (State)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="50"
                      value={settings.sgstPercentage}
                      onChange={(e) =>
                        handleSgstChange(parseFloat(e.target.value) || 0)
                      }
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-semibold text-slate-900 text-xs focus:outline-none focus:border-[#5E2B9D]"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                <span>
                  GST is currently disabled. Invoices will be generated without CGST and SGST tax breakdowns.
                </span>
              </div>
            )}
          </div>

          {/* Submit Save Button */}
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-3 rounded-xl bg-[#5E2B9D] hover:bg-[#4D2382] text-white font-bold text-xs shadow-md shadow-purple-900/20 transition-all cursor-pointer flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? "Saving Configuration..." : "Save Settings"}</span>
            </button>
            <button
              type="button"
              onClick={() => setSettings(defaultPharmacySettings)}
              className="px-4 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset to Defaults</span>
            </button>
          </div>
        </div>

        {/* Right Column: Live Bill Header Preview (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs sticky top-24 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-purple-600" />
                <h3 className="text-xs font-bold text-slate-900">
                  Live Bill Header Preview
                </h3>
              </div>
              <span className="text-[10px] text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full font-bold">
                Thermal &amp; A5 Bill
              </span>
            </div>

            {/* Thermal Bill Mockup */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-slate-800 text-center font-mono text-[11px] shadow-inner space-y-2 select-none">
              <div className="border-b border-dashed border-slate-300 pb-2.5">
                <h4 className="font-extrabold text-xs text-slate-900 uppercase tracking-tight">
                  {settings.pharmacyName || "PHARMACY NAME"}
                </h4>
                <p className="text-[10px] text-slate-600 mt-0.5 leading-snug">
                  {settings.address || "Pharmacy Full Address"}
                </p>
                <p className="text-[10px] text-slate-600">
                  Ph: {settings.phone} | Email: {settings.email}
                </p>
                {settings.drugLicenseNo && (
                  <p className="text-[9px] text-slate-500 mt-0.5">
                    DL: {settings.drugLicenseNo}
                  </p>
                )}
                {settings.gstEnabled && settings.gstNumber && (
                  <p className="font-bold text-[10px] text-purple-900 mt-1">
                    GSTIN: {settings.gstNumber}
                  </p>
                )}
              </div>

              {/* Sample item preview */}
              <div className="py-2 border-b border-dashed border-slate-300 text-left space-y-1">
                <div className="flex justify-between font-bold text-[10px] text-slate-700">
                  <span>ITEM</span>
                  <span>QTY</span>
                  <span>AMT</span>
                </div>
                <div className="flex justify-between text-[10px] text-slate-600">
                  <span>Dolo 650 Tab</span>
                  <span>1 Sheet</span>
                  <span>₹33.50</span>
                </div>
                <div className="flex justify-between text-[10px] text-slate-600">
                  <span>Pan-D Cap</span>
                  <span>5 Loose</span>
                  <span>₹68.00</span>
                </div>
              </div>

              {/* Sample Tax breakdown */}
              <div className="pt-1 text-right space-y-0.5 text-[10px] text-slate-600">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>₹101.50</span>
                </div>
                {settings.gstEnabled ? (
                  <>
                    <div className="flex justify-between text-purple-800">
                      <span>CGST ({settings.cgstPercentage}%):</span>
                      <span>₹{(101.5 * (settings.cgstPercentage / 100)).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-purple-800">
                      <span>SGST ({settings.sgstPercentage}%):</span>
                      <span>₹{(101.5 * (settings.sgstPercentage / 100)).toFixed(2)}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between text-slate-400">
                    <span>GST:</span>
                    <span>Exempt / Disabled</span>
                  </div>
                )}
                <div className="flex justify-between font-extrabold text-xs text-slate-900 pt-1 border-t border-slate-300">
                  <span>NET TOTAL:</span>
                  <span>
                    ₹
                    {(
                      101.5 +
                      (settings.gstEnabled
                        ? 101.5 * (settings.gstPercentage / 100)
                        : 0)
                    ).toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="pt-2 text-[9px] text-slate-400 border-t border-dashed border-slate-300">
                <span>*** GET WELL SOON ***</span>
                {settings.pharmacistName && (
                  <p className="text-[8px] text-slate-400 mt-0.5">
                    {settings.pharmacistName}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
