// Centralized typed configuration reading from environment variables
export const APP_CONFIG = {
  appName: process.env.NEXT_PUBLIC_APP_NAME || "PharmaNext",
  appTagline: process.env.NEXT_PUBLIC_APP_TAGLINE || "Smart Pharmacy POS",
  appUrl: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  appVersion: process.env.NEXT_PUBLIC_APP_VERSION || "1.0.0",
  companyName: process.env.NEXT_PUBLIC_COMPANY_NAME || "PharmaNext Technologies Pvt Ltd",

  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "support@pharmanext.com",
  supportPhone: process.env.NEXT_PUBLIC_SUPPORT_PHONE || "+91 98765 43210",

  currencySymbol: process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || "₹",
  currencyCode: process.env.NEXT_PUBLIC_CURRENCY_CODE || "INR",

  // Security & OTP settings
  enableOtpAlert: process.env.NEXT_PUBLIC_ENABLE_OTP_ALERT !== "false",
  otpExpiryMinutes: parseInt(process.env.NEXT_PUBLIC_OTP_EXPIRY_MINUTES || "5", 10),
  maxOtpAttempts: parseInt(process.env.NEXT_PUBLIC_MAX_OTP_ATTEMPTS || "4", 10),

  // Subscription default
  defaultTrialDays: parseInt(process.env.NEXT_PUBLIC_DEFAULT_TRIAL_DAYS || "365", 10),
} as const;
