"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { User, Pharmacy, PendingOtp } from "./types";
import { useRouter } from "next/navigation";

interface AuthContextType {
  user: User | null;
  currentPharmacy: Pharmacy | null;
  pharmacies: Pharmacy[];
  isAuthenticated: boolean;
  isLoading: boolean;
  activeOtpNotification: string | null;
  sendAdminOtp: (email: string) => Promise<{ success: boolean; message: string; otp?: string }>;
  verifyAdminOtp: (email: string, enteredOtp: string) => Promise<{ success: boolean; message: string }>;
  loginStaff: (storeCode: string, identifier: string, pass: string) => Promise<{ success: boolean; message: string }>;
  addPharmacy: (data: { name: string; address: string; phone?: string; licenseNo?: string }) => Pharmacy;
  togglePharmacyActivation: (pharmacyId: string, days?: number) => void;
  selectPharmacy: (pharmacyId: string) => { success: boolean; reason?: "inactive" | "no_expiry" | "expired" };
  dismissOtpNotification: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEYS = {
  USER: "pharmanext_user_session",
  CURRENT_PHARMACY: "pharmanext_current_pharmacy",
  PHARMACIES: "pharmanext_pharmacies_list",
  PENDING_OTP: "pharmanext_pending_otp",
};

const defaultPharmacies: Pharmacy[] = [
  {
    id: "PHARM-1001",
    name: "MedLife Healthcare & Chemist",
    address: "Plot 42, Road No 10, Banjara Hills, Hyderabad",
    phone: "+91 98765 43210",
    licenseNo: "DL-TS-HYD-2024-8842",
    status: "active",
    expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year active
    ownerEmail: "admin@pharmanext.com",
    createdAt: "10 Jan 2026",
  },
  {
    id: "PHARM-1002",
    name: "GreenCross Pharmacy (Branch 2)",
    address: "Shop 4, Market Complex, Jubilee Hills, Hyderabad",
    phone: "+91 98765 99881",
    licenseNo: "DL-TS-HYD-2025-1109",
    status: "inactive",
    expiryDate: null, // Null expiry and inactive as requested
    ownerEmail: "admin@pharmanext.com",
    createdAt: "15 Feb 2026",
  },
];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [currentPharmacy, setCurrentPharmacy] = useState<Pharmacy | null>(null);
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>(defaultPharmacies);
  const [activeOtpNotification, setActiveOtpNotification] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize state from LocalStorage on client mount
  useEffect(() => {
    try {
      const savedUser = localStorage.getItem(STORAGE_KEYS.USER);
      const savedCurrentPharmacy = localStorage.getItem(STORAGE_KEYS.CURRENT_PHARMACY);
      const savedPharmacies = localStorage.getItem(STORAGE_KEYS.PHARMACIES);

      if (savedUser) {
        setUser(JSON.parse(savedUser));
      }
      if (savedPharmacies) {
        setPharmacies(JSON.parse(savedPharmacies));
      } else {
        localStorage.setItem(STORAGE_KEYS.PHARMACIES, JSON.stringify(defaultPharmacies));
      }
      if (savedCurrentPharmacy) {
        setCurrentPharmacy(JSON.parse(savedCurrentPharmacy));
      }
    } catch (e) {
      console.error("Failed to restore session from storage", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Update storage when pharmacies change
  const savePharmacies = (updatedList: Pharmacy[]) => {
    setPharmacies(updatedList);
    try {
      localStorage.setItem(STORAGE_KEYS.PHARMACIES, JSON.stringify(updatedList));
    } catch (e) {
      console.error("Storage error", e);
    }
  };

  // Send OTP to email
  const sendAdminOtp = async (email: string): Promise<{ success: boolean; message: string; otp?: string }> => {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !trimmedEmail.includes("@")) {
      return { success: false, message: "Please provide a valid email address." };
    }

    // Generate secure 6-digit OTP
    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes validity

    const pendingData: PendingOtp = {
      email: trimmedEmail,
      otp: generatedOtp,
      expiresAt,
      attempts: 0,
    };

    try {
      localStorage.setItem(STORAGE_KEYS.PENDING_OTP, JSON.stringify(pendingData));
    } catch (e) {
      console.error(e);
    }

    // Set interactive visual alert so the user sees the delivered OTP
    setActiveOtpNotification(`Security Code for ${trimmedEmail}: ${generatedOtp} (Valid for 5 minutes)`);

    return {
      success: true,
      message: `OTP sent successfully to ${trimmedEmail}`,
      otp: generatedOtp,
    };
  };

  // Verify OTP
  const verifyAdminOtp = async (email: string, enteredOtp: string): Promise<{ success: boolean; message: string }> => {
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedOtp = enteredOtp.trim();

    const storedPendingStr = localStorage.getItem(STORAGE_KEYS.PENDING_OTP);
    if (!storedPendingStr) {
      return { success: false, message: "No active OTP request found. Please request a new code." };
    }

    const pending: PendingOtp = JSON.parse(storedPendingStr);

    if (pending.email !== trimmedEmail) {
      return { success: false, message: "Email mismatch. Please re-enter your email." };
    }

    if (Date.now() > pending.expiresAt) {
      localStorage.removeItem(STORAGE_KEYS.PENDING_OTP);
      setActiveOtpNotification(null);
      return { success: false, message: "Security OTP has expired. Please request a new code." };
    }

    if (pending.attempts >= 4) {
      localStorage.removeItem(STORAGE_KEYS.PENDING_OTP);
      setActiveOtpNotification(null);
      return { success: false, message: "Maximum verification attempts exceeded. Please generate a new OTP." };
    }

    if (pending.otp !== trimmedOtp) {
      pending.attempts += 1;
      localStorage.setItem(STORAGE_KEYS.PENDING_OTP, JSON.stringify(pending));
      return {
        success: false,
        message: `Invalid security OTP code. ${4 - pending.attempts} attempts remaining.`,
      };
    }

    // Success! Clear pending OTP and create session
    localStorage.removeItem(STORAGE_KEYS.PENDING_OTP);
    setActiveOtpNotification(null);

    const authenticatedUser: User = {
      id: "usr_" + Math.random().toString(36).substring(2, 9),
      email: trimmedEmail,
      name: trimmedEmail.split("@")[0].toUpperCase().slice(0, 1) + trimmedEmail.split("@")[0].slice(1),
      role: "admin",
      phone: "+91 98765 00000",
    };

    setUser(authenticatedUser);
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(authenticatedUser));

    return { success: true, message: "Authentication successful." };
  };

  // Staff Login
  const loginStaff = async (
    storeCode: string,
    identifier: string,
    pass: string
  ): Promise<{ success: boolean; message: string }> => {
    if (!storeCode || !identifier || !pass) {
      return { success: false, message: "Please fill in all staff credentials." };
    }

    // Match store code against pharmacies
    const matchedPharmacy = pharmacies.find(
      (p) => p.id.toLowerCase() === storeCode.trim().toLowerCase()
    );

    if (!matchedPharmacy) {
      return { success: false, message: "Pharmacy Store Code not found. Contact your Store Administrator." };
    }

    // Check staff login
    const staffUser: User = {
      id: "staff_" + Math.random().toString(36).substring(2, 8),
      email: `${identifier.trim().toLowerCase()}@pharmanext.com`,
      name: identifier.trim(),
      role: "staff",
      storeId: matchedPharmacy.id,
    };

    setUser(staffUser);
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(staffUser));

    // Verify if pharmacy is active
    const canEnter =
      matchedPharmacy.status === "active" &&
      matchedPharmacy.expiryDate !== null &&
      new Date(matchedPharmacy.expiryDate) > new Date();

    if (canEnter) {
      setCurrentPharmacy(matchedPharmacy);
      localStorage.setItem(STORAGE_KEYS.CURRENT_PHARMACY, JSON.stringify(matchedPharmacy));
    }

    return { success: true, message: "Staff authenticated." };
  };

  // Add Pharmacy - strictly saved with expiryDate: null and status: "inactive"
  const addPharmacy = (data: {
    name: string;
    address: string;
    phone?: string;
    licenseNo?: string;
  }): Pharmacy => {
    const newPharmacy: Pharmacy = {
      id: "PHARM-" + Math.floor(1000 + Math.random() * 9000),
      name: data.name.trim(),
      address: data.address.trim(),
      phone: data.phone?.trim() || "+91 91234 56789",
      licenseNo: data.licenseNo?.trim() || "DL-TS-AP-" + Math.floor(1000 + Math.random() * 9000),
      status: "inactive", // Inactive by default
      expiryDate: null, // Null expiry by default
      ownerEmail: user?.email || "admin@pharmanext.com",
      createdAt: new Date().toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
    };

    const updated = [newPharmacy, ...pharmacies];
    savePharmacies(updated);
    return newPharmacy;
  };

  // Toggle pharmacy activation (Admin demo/simulation feature)
  const togglePharmacyActivation = (pharmacyId: string, days: number = 365) => {
    const updated = pharmacies.map((p) => {
      if (p.id === pharmacyId) {
        if (p.status === "active") {
          return {
            ...p,
            status: "inactive" as const,
            expiryDate: null,
          };
        } else {
          return {
            ...p,
            status: "active" as const,
            expiryDate: new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString(),
          };
        }
      }
      return p;
    });

    savePharmacies(updated);

    // If current pharmacy was deactivated, update currentPharmacy as well
    if (currentPharmacy && currentPharmacy.id === pharmacyId) {
      const refreshed = updated.find((p) => p.id === pharmacyId) || null;
      setCurrentPharmacy(refreshed);
      if (refreshed) {
        localStorage.setItem(STORAGE_KEYS.CURRENT_PHARMACY, JSON.stringify(refreshed));
      }
    }
  };

  // Select pharmacy with strict verification gate
  const selectPharmacy = (
    pharmacyId: string
  ): { success: boolean; reason?: "inactive" | "no_expiry" | "expired" } => {
    const target = pharmacies.find((p) => p.id === pharmacyId);
    if (!target) {
      return { success: false, reason: "inactive" };
    }

    if (target.status !== "active") {
      return { success: false, reason: "inactive" };
    }

    if (!target.expiryDate) {
      return { success: false, reason: "no_expiry" };
    }

    if (new Date(target.expiryDate) <= new Date()) {
      return { success: false, reason: "expired" };
    }

    setCurrentPharmacy(target);
    localStorage.setItem(STORAGE_KEYS.CURRENT_PHARMACY, JSON.stringify(target));
    return { success: true };
  };

  const dismissOtpNotification = () => {
    setActiveOtpNotification(null);
  };

  const logout = () => {
    setUser(null);
    setCurrentPharmacy(null);
    localStorage.removeItem(STORAGE_KEYS.USER);
    localStorage.removeItem(STORAGE_KEYS.CURRENT_PHARMACY);
    router.push("/login");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        currentPharmacy,
        pharmacies,
        isAuthenticated: !!user,
        isLoading,
        activeOtpNotification,
        sendAdminOtp,
        verifyAdminOtp,
        loginStaff,
        addPharmacy,
        togglePharmacyActivation,
        selectPharmacy,
        dismissOtpNotification,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
