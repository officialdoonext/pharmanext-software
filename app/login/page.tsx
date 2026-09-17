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
  Phone,
  Eye,
  EyeOff,
  Download,
  ArrowDownToLine,
  Smartphone,
  Share,
  PlusSquare,
  X,
} from "lucide-react";
import { usePWA } from "@/components/PWAProvider";

export default function LoginPage() {
  const router = useRouter();
  const {
    sendAdminOtp,
    verifyAdminOtp,
    loginStaffByMpin,
    isAuthenticated,
    currentPharmacy,
    user,
  } = useAuth();

  // If already authenticated with active pharmacy, redirect appropriately
  useEffect(() => {
    if (isAuthenticated) {
      if (currentPharmacy && currentPharmacy.status === "active" && currentPharmacy.expiryDate) {
        if (user?.role === "staff") {
          router.push("/billing");
        } else {
          router.push("/medicines");
        }
      } else {
        router.push("/onboarding");
      }
    }
  }, [isAuthenticated, currentPharmacy, user, router]);

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
  const [staffMobile, setStaffMobile] = useState("");
  const [staffMpin, setStaffMpin] = useState("");
  const [showStaffMpin, setShowStaffMpin] = useState(false);
  const [isStaffSubmitting, setIsStaffSubmitting] = useState(false);

  // PWA States
  const { isInstallable, isInstalled, installPWA, isIOS } = usePWA();
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [installInfoMessage, setInstallInfoMessage] = useState<string | null>(null);

  const handleInstallClick = async () => {
    setInstallInfoMessage(null);
    if (isIOS) {
      setShowIosGuide(true);
      return;
    }

    const outcome = await installPWA();
    if (outcome === "unavailable") {
      setInstallInfoMessage(
        "To install, click the Install App icon in your browser's address bar (top right) or add to Home Screen from your browser menu."
      );
      setTimeout(() => setInstallInfoMessage(null), 7000);
    }
  };

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

  // Handle Staff Login (Mobile + MPIN)
  const handleStaffLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsStaffSubmitting(true);

    try {
      const res = await loginStaffByMpin(staffMobile, staffMpin);
      if (res.success) {
        setSuccessMessage("Staff verified successfully. Loading counter session...");
        setTimeout(() => {
          if (res.pharmacyCount === 1) {
            router.push("/billing");
          } else {
            router.push("/onboarding");
          }
        }, 500);
      } else {
        setErrorMessage(res.message);
      }
    } catch (err) {
      setErrorMessage("Authentication encountered an error. Please try again.");
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
        <div className="w-16 h-16 rounded-3xl overflow-hidden shadow-lg shadow-purple-500/15 flex items-center justify-center bg-white border border-slate-200/80 p-2 mb-3.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/doonext-fav.png"
            alt="PharmaNext Logo"
            className="w-full h-full object-contain"
          />
        </div>

        <div className="flex items-center text-3xl font-extrabold tracking-tight">
          <span className="text-[#5E2B9D]">Pharma</span>
          <span className="text-[#059669]">Next</span>
        </div>
        <p className="text-xs font-semibold text-slate-400 mt-1 uppercase tracking-widest">
          {APP_CONFIG.appTagline}
        </p>
      </div>

      {/* Main Login Card */}
      <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200/90 shadow-xl p-8 z-10 relative">
        {/* Security Shield Tag */}
        {/* <div className="flex items-center justify-center gap-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 rounded-full py-1 px-3 w-fit mx-auto mb-6">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>256-Bit Encrypted Security Protocol</span>
        </div> */}

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
                ? "bg-white text-[#5E2B9D] shadow-sm"
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
                ? "bg-white text-[#5E2B9D] shadow-sm"
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
                      className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:border-[#5E2B9D] focus:ring-2 focus:ring-purple-100 transition-all"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                    We will send a one-time 6-digit verification code to this inbox.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isSending}
                  className="w-full py-3 px-4 rounded-xl bg-[#5E2B9D] hover:bg-[#4D2382] text-white font-bold text-xs tracking-wide transition-all shadow-md shadow-purple-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
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
                    className="text-[11px] font-bold text-[#5E2B9D] hover:underline mt-0.5"
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
                      className="w-11 h-12 text-center text-lg font-bold rounded-xl border border-slate-200 bg-[#f8fafc] text-slate-900 focus:bg-white focus:border-[#5E2B9D] focus:ring-2 focus:ring-purple-100 focus:outline-none transition-all"
                    />
                  ))}
                </div>

                {/* Countdown Timer & Resend */}
                <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                  <span>
                    {timer > 0 ? (
                      <>
                        Expires in{" "}
                        <span className="font-bold text-[#5E2B9D]">
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
                    className="font-bold text-[#5E2B9D] disabled:text-slate-300 hover:underline cursor-pointer disabled:cursor-not-allowed"
                  >
                    Resend Code
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={isVerifying}
                  className="w-full py-3 px-4 rounded-xl bg-[#5E2B9D] hover:bg-[#4D2382] text-white font-bold text-xs tracking-wide transition-all shadow-md shadow-purple-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
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
                Staff Mobile Number
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                <input
                  type="tel"
                  required
                  maxLength={10}
                  value={staffMobile}
                  onChange={(e) => setStaffMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  placeholder="e.g. 9876543210"
                  className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:border-[#5E2B9D] focus:ring-2 focus:ring-purple-100 transition-all font-mono"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Enter your 10-digit registered counter mobile number
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Counter MPIN
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                <input
                  type={showStaffMpin ? "text" : "password"}
                  inputMode="numeric"
                  required
                  maxLength={6}
                  value={staffMpin}
                  onChange={(e) => setStaffMpin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="4 to 6 digit MPIN"
                  className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl pl-10 pr-10 py-2.5 text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:border-[#5E2B9D] focus:ring-2 focus:ring-purple-100 transition-all font-mono tracking-widest"
                />
                <button
                  type="button"
                  onClick={() => setShowStaffMpin(!showStaffMpin)}
                  className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showStaffMpin ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Enter your secret 4-6 digit counter login MPIN
              </p>
            </div>

            <button
              type="submit"
              disabled={isStaffSubmitting}
              className="w-full py-3 px-4 rounded-xl bg-[#5E2B9D] hover:bg-[#4D2382] text-white font-bold text-xs tracking-wide transition-all shadow-md shadow-purple-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {isStaffSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Verifying Staff Credentials...</span>
                </>
              ) : (
                <>
                  <span>Sign In as Staff</span>
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

      {/* PWA Install Action Card on Login */}
      {!isInstalled && (
        <div className="mt-4 w-full max-w-md z-10 animate-in fade-in slide-in-from-bottom-2">
          <button
            type="button"
            onClick={handleInstallClick}
            className="w-full p-3 rounded-2xl bg-white/90 hover:bg-white border border-purple-200/90 hover:border-purple-300 shadow-md shadow-purple-900/5 flex items-center justify-between group transition-all cursor-pointer backdrop-blur-xs card-button !h-auto !max-h-none"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#5E2B9D] to-purple-600 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform shrink-0">
                <Download className="w-5 h-5" />
              </div>
              <div className="text-left">
                <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <span>Install PharmaNext App</span>
                  <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-full bg-purple-100 text-[#5E2B9D]">
                    PWA
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 font-normal">
                  Install for faster access &amp; auto updates
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-purple-50 group-hover:bg-[#5E2B9D] text-[#5E2B9D] group-hover:text-white text-xs font-semibold transition-all">
              <span>Install</span>
              <ArrowDownToLine className="w-3.5 h-3.5" />
            </div>
          </button>
        </div>
      )}

      {/* Installed Badge if already opened via PWA */}
      {isInstalled && (
        <div className="mt-4 flex items-center justify-center gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200/80 py-2 px-4 rounded-xl z-10">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-medium">PharmaNext Installed • Running as Desktop/Mobile App</span>
        </div>
      )}

      {/* Help message if browser deferred prompt is unavailable */}
      {installInfoMessage && (
        <div className="mt-3 max-w-md w-full p-3 rounded-xl bg-purple-50 border border-purple-200 text-[#5E2B9D] text-xs flex items-start gap-2 z-10 animate-in fade-in">
          <Smartphone className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="flex-1 leading-relaxed font-medium">{installInfoMessage}</div>
        </div>
      )}

      {/* iOS Safari Installation Guide Modal */}
      {showIosGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-sm w-full p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-purple-50 text-[#5E2B9D] flex items-center justify-center">
                  <Smartphone className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">Install on iOS (iPhone / iPad)</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowIosGuide(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600">
              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <div className="w-6 h-6 rounded-full bg-purple-100 text-[#5E2B9D] font-bold flex items-center justify-center shrink-0 text-xs">
                  1
                </div>
                <div>
                  Tap the <strong className="text-slate-900">Share button</strong> (box with upward arrow <Share className="w-3.5 h-3.5 inline text-blue-600 mb-0.5" />) in Safari toolbar at the bottom.
                </div>
              </div>

              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <div className="w-6 h-6 rounded-full bg-purple-100 text-[#5E2B9D] font-bold flex items-center justify-center shrink-0 text-xs">
                  2
                </div>
                <div>
                  Scroll down the options list and tap <strong className="text-slate-900">&quot;Add to Home Screen&quot;</strong> (<PlusSquare className="w-3.5 h-3.5 inline text-slate-700 mb-0.5" />).
                </div>
              </div>

              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <div className="w-6 h-6 rounded-full bg-purple-100 text-[#5E2B9D] font-bold flex items-center justify-center shrink-0 text-xs">
                  3
                </div>
                <div>
                  Tap <strong className="text-slate-900">&quot;Add&quot;</strong> in the top-right corner. The PharmaNext icon will appear on your home screen!
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowIosGuide(false)}
              className="w-full py-2.5 rounded-xl bg-[#5E2B9D] hover:bg-[#4D2382] text-white text-xs font-semibold transition-colors cursor-pointer shadow-xs"
            >
              Got It
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
