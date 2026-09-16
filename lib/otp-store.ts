// Server-side fallback memory store for OTPs in case Firestore rules block unauthenticated clients
interface StoredOtp {
  email: string;
  otp: string;
  expiresAt: number;
  attempts: number;
}

// Attach to globalThis to persist across hot-reloads in development
const globalForOtp = globalThis as unknown as {
  otpStore: Map<string, StoredOtp>;
};

export const otpStore = globalForOtp.otpStore || new Map<string, StoredOtp>();

if (process.env.NODE_ENV !== "production") {
  globalForOtp.otpStore = otpStore;
}
