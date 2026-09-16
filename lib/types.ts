export interface User {
  id: string;
  email: string;
  name: string;
  role: "admin" | "staff";
  storeId?: string;
  phone?: string;
}

export interface Pharmacy {
  id: string;
  name: string;
  address: string;
  phone?: string;
  licenseNo?: string;
  status: "active" | "inactive";
  expiryDate: string | null; // ISO date string or null
  ownerEmail: string;
  createdAt: string;
}

export interface PendingOtp {
  email: string;
  otp: string;
  expiresAt: number; // Unix timestamp
  attempts: number;
}
