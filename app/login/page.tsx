"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { APP_CONFIG } from "@/lib/config";
import {
  ShieldCheck,
  Mail,
  Lock,
  ArrowRight,
  RefreshCw,
  Store,
  KeyRound,
  AlertCircle,
  CheckCircle2,
  Building2,
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { sendAdminOtp, verifyAdminOtp, loginStaff, isAuthenticated, currentPharmacy } = useAuth();

  // If already authenticated with active pharmacy, can go to dashboard
  useEffect(() => {
    if (isAuthenticated) {
      if (currentPharmacy && currentPharmacy.status === "active" && currentPharmacy.expiryDate) {
        router.push("/medicines");
      } else {
        router.push("/onboarding");
      }
    }
  }, [isAuthenticated, currentPharmacy, router]);

  // Tab State
  const [activeTab, setActiveTab] = useState<"admin" | "staff">("admin");

  // Admin Login States
  const [email, setEmail] = useState("");
  const [otpStep, setOtpStep] = useState<"email" | "verify">("email");
  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [timer, setTimer] = useState(60);
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Staff Login States
  const [storeCode, setStoreCode] = useState("PHARM-1001");
  const [staffUsername, setStaffUsername] = useState("");
  const [staffPassword, setStaffPassword] = useState("");
  const [isStaffSubmitting, setIsStaffSubmitting] = useState(false);

  // OTP Input Refs
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Timer countdown
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (otpStep === "verify" && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [otpStep, timer]);

  // Handle Send OTP
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!email.trim() || !email.includes("@")) {
      setErrorMessage("Please enter a valid administrator email address.");
      return;
    }

    setIsSending(true);
    try {
      const res = await sendAdminOtp(email);
      if (res.success) {
        setOtpStep("verify");
        setTimer(60);
        setSuccessMessage(`A 6-digit security code has been sent to ${email}.`);
        setTimeout(() => inputRefs.current[0]?.focus(), 100);
      } else {
        setErrorMessage(res.message);
      }
    } catch (err) {
      setErrorMessage("Failed to send OTP. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  // Handle Single OTP Digit Change
  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newDigits = [...otpDigits];
    newDigits[index] = value.slice(-1);
    setOtpDigits(newDigits);

    // Auto-advance
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Handle OTP Keydown (Backspace)
  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // Handle OTP Paste
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").trim();
    if (/^\d{6}$/.test(pastedData)) {
      const splitDigits = pastedData.split("");
      setOtpDigits(splitDigits);
      inputRefs.current[5]?.focus();
    }
  };

  // Handle Verify OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const fullOtp = otpDigits.join("");
    if (fullOtp.length !== 6) {
      setErrorMessage("Please enter all 6 digits of the OTP code.");
      return;
    }

    setIsVerifying(true);
    try {
      const res = await verifyAdminOtp(email, fullOtp);
      if (res.success) {
        setSuccessMessage("OTP verified successfully. Redirecting to onboarding...");
        setTimeout(() => {
          router.push("/onboarding");
        }, 600);
      } else {
        setErrorMessage(res.message);
      }
    } catch (err) {
      setErrorMessage("Verification encountered an error. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  // Handle Resend OTP
  const handleResend = async () => {
    if (timer > 0) return;
    setErrorMessage(null);
    setSuccessMessage(null);
    setOtpDigits(["", "", "", "", "", ""]);
    const res = await sendAdminOtp(email);
    if (res.success) {
      setTimer(60);
      setSuccessMessage("A fresh security code has been sent.");
      inputRefs.current[0]?.focus();
    } else {
      setErrorMessage(res.message);
    }
  };

  // Handle Staff Login
  const handleStaffLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsStaffSubmitting(true);

    try {
      const res = await loginStaff(storeCode, staffUsername, staffPassword);
      if (res.success) {
        setSuccessMessage("Staff authenticated. Loading store session...");
        setTimeout(() => {
          router.push("/medicines");
        }, 600);
      } else {
        setErrorMessage(res.message);
      }
    } catch (err) {
      setErrorMessage("Authentication failed.");
    } finally {
      setIsStaffSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      {/* Background Decorative Blur Gradients */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-purple-200/40 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-emerald-200/30 rounded-full blur-3xl pointer-events-none"></div>

      {/* Brand Header */}
      <div className="flex flex-col items-center mb-8 text-center z-10">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#3b0764] via-[#581c87] to-[#059669] flex items-center justify-center shadow-lg shadow-purple-500/20 mb-3.5">
          <div className="grid grid-cols-2 gap-1.5 w-7 h-7 items-center justify-center">
            <div className="w-2.5 h-2.5 rounded-sm bg-white"></div>
            <div className="w-2.5 h-2.5 rounded-sm bg-emerald-300"></div>
            <div className="w-2.5 h-2.5 rounded-sm bg-teal-300"></div>
            <div className="w-2.5 h-2.5 rounded-sm bg-white"></div>
          </div>
        </div>

        <div className="flex items-center text-3xl font-extrabold tracking-tight">
          <span className="text-[#3b0764]">Pharma</span>
          <span className="text-[#059669]">Next</span>
        </div>
        <p className="text-xs font-semibold text-slate-400 mt-1 uppercase tracking-widest">
          {APP_CONFIG.appTagline}
        </p>
      </div>

      {/* Main Login Card */}
      <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200/90 shadow-xl p-8 z-10 relative">
        {/* Security Shield Tag */}
        <div className="flex items-center justify-center gap-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 rounded-full py-1 px-3 w-fit mx-auto mb-6">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>256-Bit Encrypted Security Protocol</span>
        </div>

        {/* Login Role Tabs (Admin vs Staff) */}
        <div className="grid grid-cols-2 p-1.5 bg-slate-100/90 rounded-2xl mb-6">
          <button
            type="button"
            onClick={() => {
              setActiveTab("admin");
              setErrorMessage(null);
            }}
            className={`py-2.5 text-xs font-bold rounded-xl transition-all ${
              activeTab === "admin"
                ? "bg-white text-[#581c87] shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Admin Login
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("staff");
              setErrorMessage(null);
            }}
            className={`py-2.5 text-xs font-bold rounded-xl transition-all ${
              activeTab === "staff"
                ? "bg-white text-[#581c87] shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Staff Login
          </button>
        </div>

        {/* Error / Success Notifications */}
        {errorMessage && (
          <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
            <div className="flex-1 leading-relaxed font-medium">{errorMessage}</div>
          </div>
        )}

        {successMessage && (
          <div className="mb-5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-start gap-2.5 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
            <div className="flex-1 leading-relaxed font-medium">{successMessage}</div>
          </div>
        )}

        {/* ADMIN LOGIN CONTENT */}
        {activeTab === "admin" && (
          <div>
            {otpStep === "email" ? (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Administrator Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@pharmanext.com"
                      className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:border-[#581c87] focus:ring-2 focus:ring-purple-100 transition-all"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                    We will send a one-time 6-digit verification code to this inbox.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isSending}
                  className="w-full py-3 px-4 rounded-xl bg-[#581c87] hover:bg-[#431c8c] text-white font-bold text-xs tracking-wide transition-all shadow-md shadow-purple-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {isSending ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Sending Secure OTP...</span>
                    </>
                  ) : (
                    <>
                      <span>Send OTP Code</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            ) : (
              /* OTP VERIFICATION STEP */
              <form onSubmit={handleVerifyOtp} className="space-y-5">
                <div className="text-center">
                  <h3 className="text-base font-bold text-slate-900">Enter Verification Code</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Sent to <span className="font-semibold text-slate-800">{email}</span>
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setOtpStep("email");
                      setErrorMessage(null);
                    }}
                    className="text-[11px] font-bold text-[#581c87] hover:underline mt-0.5"
                  >
                    Change Email
                  </button>
                </div>

                {/* 6 Digit Inputs */}
                <div className="flex justify-between gap-2 on-paste" onPaste={handlePaste}>
                  {otpDigits.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => {
                        inputRefs.current[idx] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(idx, e)}
                      className="w-11 h-12 text-center text-lg font-bold rounded-xl border border-slate-200 bg-[#f8fafc] text-slate-900 focus:bg-white focus:border-[#581c87] focus:ring-2 focus:ring-purple-100 focus:outline-none transition-all"
                    />
                  ))}
                </div>

                {/* Countdown Timer & Resend */}
                <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                  <span>
                    {timer > 0 ? (
                      <>
                        Expires in{" "}
                        <span className="font-bold text-[#581c87]">
                          00:{timer < 10 ? `0${timer}` : timer}
                        </span>
                      </>
                    ) : (
                      <span className="text-rose-500 font-semibold">Code expired</span>
                    )}
                  </span>
                  <button
                    type="button"
                    disabled={timer > 0}
                    onClick={handleResend}
                    className="font-bold text-[#581c87] disabled:text-slate-300 hover:underline cursor-pointer disabled:cursor-not-allowed"
                  >
                    Resend Code
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={isVerifying}
                  className="w-full py-3 px-4 rounded-xl bg-[#581c87] hover:bg-[#431c8c] text-white font-bold text-xs tracking-wide transition-all shadow-md shadow-purple-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {isVerifying ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Verifying Security Code...</span>
                    </>
                  ) : (
                    <>
                      <span>Verify & Continue to Onboarding</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        )}

        {/* STAFF LOGIN CONTENT */}
        {activeTab === "staff" && (
          <form onSubmit={handleStaffLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Pharmacy Store Code
              </label>
              <div className="relative">
                <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                <input
                  type="text"
                  required
                  value={storeCode}
                  onChange={(e) => setStoreCode(e.target.value)}
                  placeholder="e.g. PHARM-1001"
                  className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:border-[#581c87] focus:ring-2 focus:ring-purple-100 transition-all font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Staff Email / Username
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                <input
                  type="text"
                  required
                  value={staffUsername}
                  onChange={(e) => setStaffUsername(e.target.value)}
                  placeholder="pharmacist_rahul"
                  className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:border-[#581c87] focus:ring-2 focus:ring-purple-100 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Staff Password / PIN
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                <input
                  type="password"
                  required
                  value={staffPassword}
                  onChange={(e) => setStaffPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:border-[#581c87] focus:ring-2 focus:ring-purple-100 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isStaffSubmitting}
              className="w-full py-3 px-4 rounded-xl bg-[#581c87] hover:bg-[#431c8c] text-white font-bold text-xs tracking-wide transition-all shadow-md shadow-purple-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {isStaffSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <span>Staff Secure Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* Security Footer Notice (No sign-up links) */}
        <div className="mt-8 pt-5 border-t border-slate-100 text-center">
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Restricted Access for Authorized Pharmacy Personnel Only.
            <br />
            Unauthorized access attempts are monitored and logged.
          </p>
        </div>
      </div>
    </div>
  );
}
