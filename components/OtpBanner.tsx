"use client";

import React from "react";
import { useAuth } from "@/lib/auth-context";
import { ShieldCheck, X, Copy, Check } from "lucide-react";

export default function OtpBanner() {
  const { activeOtpNotification, dismissOtpNotification } = useAuth();
  const [copied, setCopied] = React.useState(false);

  if (!activeOtpNotification) return null;

  // Extract 6-digit OTP code if present
  const match = activeOtpNotification.match(/\b\d{6}\b/);
  const otpCode = match ? match[0] : null;

  const handleCopy = () => {
    if (otpCode) {
      navigator.clipboard.writeText(otpCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50 max-w-md animate-in slide-in-from-top duration-200">
      <div className="bg-[#1e1b4b] border border-purple-500/40 text-white rounded-2xl p-4 shadow-2xl flex items-start gap-3.5 backdrop-blur-md">
        <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center shrink-0 border border-purple-400/30">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div className="flex-1 pr-1 text-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="font-bold text-sm text-purple-200">Email OTP Dispatched</span>
            <button
              onClick={dismissOtpNotification}
              className="text-purple-300 hover:text-white p-0.5 rounded transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-slate-300 mt-1 leading-relaxed">{activeOtpNotification}</p>
          {otpCode && (
            <div className="mt-2.5 flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg bg-purple-900/80 font-mono text-sm tracking-widest font-bold text-emerald-400 border border-purple-700/60">
                {otpCode}
              </span>
              <button
                onClick={handleCopy}
                className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium flex items-center gap-1 transition-colors"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-300" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? "Copied" : "Copy Code"}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
