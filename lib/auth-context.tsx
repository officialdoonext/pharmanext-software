"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { User, Pharmacy } from "./types";
import { useRouter } from "next/navigation";
import { APP_CONFIG } from "./config";

import { db } from "./firebase";
import { collection, getDocs, doc, setDoc, updateDoc, query, where } from "firebase/firestore";

interface AuthContextType {
  user: User | null;
  currentPharmacy: Pharmacy | null;
  pharmacies: Pharmacy[];
  isAuthenticated: boolean;
  isLoading: boolean;
  sendAdminOtp: (email: string) => Promise<{ success: boolean; message: string }>;
  verifyAdminOtp: (email: string, enteredOtp: string) => Promise<{ success: boolean; message: string }>;
  loginStaff: (storeCode: string, identifier: string, pass: string) => Promise<{ success: boolean; message: string }>;
  loginStaffByMpin: (mobile: string, mpin: string) => Promise<{ success: boolean; message: string; pharmacyCount: number }>;
  addPharmacy: (data: { name: string; address: string; phone?: string; licenseNo?: string }) => Pharmacy;
  togglePharmacyActivation: (pharmacyId: string, days?: number) => void;
  selectPharmacy: (pharmacyId: string) => { success: boolean; reason?: "inactive" | "no_expiry" | "expired" };
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEYS = {
  USER: "pharmanext_user_session",
  CURRENT_PHARMACY: "pharmanext_current_pharmacy",
  PHARMACIES: "pharmanext_pharmacies_list",
};

// No hardcoded mock/dummy pharmacies - clean dynamic data only
const defaultPharmacies: Pharmacy[] = [];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [currentPharmacy, setCurrentPharmacy] = useState<Pharmacy | null>(null);
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize dynamic state from LocalStorage & Firestore on client mount
  useEffect(() => {
    async function initSessionAndPharmacies() {
      try {
        const savedUser = localStorage.getItem(STORAGE_KEYS.USER);
        const savedCurrentPharmacy = localStorage.getItem(STORAGE_KEYS.CURRENT_PHARMACY);
        const savedPharmacies = localStorage.getItem(STORAGE_KEYS.PHARMACIES);

        if (savedUser) {
          setUser(JSON.parse(savedUser));
        }

        let localCleanPharmacies: Pharmacy[] = [];
        if (savedPharmacies) {
          try {
            const parsed = JSON.parse(savedPharmacies);
            // Strictly purge any legacy dummy entries (PHARM-1001, PHARM-1002, MedLife, GreenCross)
            localCleanPharmacies = Array.isArray(parsed)
              ? parsed.filter(
                  (p: Pharmacy) =>
                    p &&
                    p.id !== "PHARM-1001" &&
                    p.id !== "PHARM-1002" &&
                    !p.name?.toLowerCase().includes("medlife") &&
                    !p.name?.toLowerCase().includes("greencross")
                )
              : [];
          } catch {
            localCleanPharmacies = [];
          }
        }

        setPharmacies(localCleanPharmacies);
        localStorage.setItem(STORAGE_KEYS.PHARMACIES, JSON.stringify(localCleanPharmacies));

        // Purge dummy current pharmacy if it was previously selected
        if (savedCurrentPharmacy) {
          try {
            const parsedCurrent = JSON.parse(savedCurrentPharmacy);
            if (
              !parsedCurrent ||
              parsedCurrent.id === "PHARM-1001" ||
              parsedCurrent.id === "PHARM-1002" ||
              parsedCurrent.name?.toLowerCase().includes("medlife") ||
              parsedCurrent.name?.toLowerCase().includes("greencross")
            ) {
              setCurrentPharmacy(null);
              localStorage.removeItem(STORAGE_KEYS.CURRENT_PHARMACY);
            } else {
              setCurrentPharmacy(parsedCurrent);
            }
          } catch {
            setCurrentPharmacy(null);
          }
        }

        // Asynchronously fetch real dynamic pharmacies from Firestore
        try {
          const snapshot = await getDocs(collection(db, "pharmacies"));
          if (!snapshot.empty) {
            const firestoreList: Pharmacy[] = [];
            snapshot.forEach((docSnap) => {
              const item = docSnap.data() as Pharmacy;
              if (
                item &&
                item.id !== "PHARM-1001" &&
                item.id !== "PHARM-1002" &&
                !item.name?.toLowerCase().includes("medlife") &&
                !item.name?.toLowerCase().includes("greencross")
              ) {
                firestoreList.push(item);
              }
            });

            if (firestoreList.length > 0) {
              // Merge with local list avoiding duplicates
              const combined = [...firestoreList];
              for (const localItem of localCleanPharmacies) {
                if (!combined.some((c) => c.id === localItem.id)) {
                  combined.push(localItem);
                }
              }
              setPharmacies(combined);
              localStorage.setItem(STORAGE_KEYS.PHARMACIES, JSON.stringify(combined));
            }
          }
        } catch (firestoreErr) {
          // Firestore offline or rules restricted - smoothly continue with clean local data
        }
      } catch (e) {
        console.error("Failed to restore session from storage", e);
      } finally {
        setIsLoading(false);
      }
    }

    initSessionAndPharmacies();
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

  // Securely Send OTP to email via API & Firebase Firestore
  const sendAdminOtp = async (
    email: string
  ): Promise<{ success: boolean; message: string }> => {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !trimmedEmail.includes("@")) {
      return { success: false, message: "Please provide a valid email address." };
    }

    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail }),
      });
      const data = await res.json();
      return data;
    } catch (err) {
      console.error("Send OTP Network Error:", err);
      return { success: false, message: "Unable to connect to security server. Please try again." };
    }
  };

  // Securely Verify OTP via API & Firebase Firestore
  const verifyAdminOtp = async (
    email: string,
    enteredOtp: string
  ): Promise<{ success: boolean; message: string }> => {
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedOtp = enteredOtp.trim();

    if (!trimmedEmail || !trimmedOtp) {
      return { success: false, message: "Please enter your 6-digit OTP code." };
    }

    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail, otp: trimmedOtp }),
      });
      const data = await res.json();

      if (data.success) {
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
      }

      return { success: false, message: data.message || "Invalid verification code." };
    } catch (err) {
      console.error("Verify OTP Network Error:", err);
      return { success: false, message: "Verification encountered a network error. Please try again." };
    }
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

    const matchedPharmacy = pharmacies.find(
      (p) => p.id.toLowerCase() === storeCode.trim().toLowerCase()
    );

    if (!matchedPharmacy) {
      return { success: false, message: "Pharmacy Store Code not found. Contact your Store Administrator." };
    }

    const staffUser: User = {
      id: "staff_" + Math.random().toString(36).substring(2, 8),
      email: `${identifier.trim().toLowerCase()}@pharmanext.com`,
      name: identifier.trim(),
      role: "staff",
      storeId: matchedPharmacy.id,
    };

    setUser(staffUser);
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(staffUser));

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

  // Staff Login using Mobile Number + MPIN
  const loginStaffByMpin = async (
    mobile: string,
    enteredMpin: string
  ): Promise<{ success: boolean; message: string; pharmacyCount: number }> => {
    const cleanMobile = mobile.replace(/\D/g, "").slice(-10);
    const cleanMpin = enteredMpin.trim();

    if (!cleanMobile || cleanMobile.length !== 10) {
      return { success: false, message: "Please enter a valid 10-digit mobile number.", pharmacyCount: 0 };
    }
    if (!cleanMpin || cleanMpin.length < 4) {
      return { success: false, message: "Please enter your 4-6 digit MPIN.", pharmacyCount: 0 };
    }

    // 1. Search for staff matching this phone in Firestore
    let matchingStaffDocs: any[] = [];
    try {
      const q = query(collection(db, "staff"), where("phone", "==", cleanMobile));
      const snap = await getDocs(q);
      if (!snap.empty) {
        snap.forEach((docSnap) => {
          matchingStaffDocs.push(docSnap.data());
        });
      }
    } catch (e) {
      console.warn("Firestore staff search note:", e);
    }

    // 2. Also search local storage across pharmacynext_staff_* keys as fallback / offline cache
    if (typeof window !== "undefined") {
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith("pharmacynext_staff_")) {
            const raw = localStorage.getItem(key);
            if (raw) {
              const parsed = JSON.parse(raw);
              if (Array.isArray(parsed)) {
                for (const item of parsed) {
                  const itemPhone = (item.phone || "").replace(/\D/g, "").slice(-10);
                  if (itemPhone === cleanMobile) {
                    if (!matchingStaffDocs.some((m) => m.id === item.id)) {
                      matchingStaffDocs.push(item);
                    }
                  }
                }
              }
            }
          }
        }
      } catch (err) {
        console.warn("LocalStorage staff scan error:", err);
      }
    }

    if (matchingStaffDocs.length === 0) {
      return {
        success: false,
        message: "No staff account found for this mobile number. Please ask your pharmacy admin to add you.",
        pharmacyCount: 0,
      };
    }

    // 3. Verify MPIN & active status
    const validMatches = matchingStaffDocs.filter(
      (staff) => staff.mpin === cleanMpin && staff.status !== "Inactive"
    );

    if (validMatches.length === 0) {
      return {
        success: false,
        message: "Incorrect MPIN. Please enter the valid counter MPIN.",
        pharmacyCount: 0,
      };
    }

    // 4. Collect all unique pharmacy IDs associated with this staff member
    const assignedPharmacyIds = Array.from(
      new Set(validMatches.map((m) => m.pharmacyId).filter(Boolean))
    ) as string[];

    if (assignedPharmacyIds.length === 0) {
      return {
        success: false,
        message: "Your staff account is not assigned to any active pharmacy branch.",
        pharmacyCount: 0,
      };
    }

    const primaryStaff = validMatches[0];
    const staffUser: User = {
      id: primaryStaff.id || `staff_${cleanMobile}`,
      name: primaryStaff.name || "Counter Cashier",
      phone: cleanMobile,
      email: `${cleanMobile}@staff.pharmacynext.com`,
      role: "staff",
      storeId: assignedPharmacyIds[0],
      assignedPharmacyIds,
    };

    setUser(staffUser);
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(staffUser));

    // If assigned to exactly 1 pharmacy, check if we can pre-select it
    if (assignedPharmacyIds.length === 1) {
      const targetPharmacyId = assignedPharmacyIds[0];
      const targetPharm = pharmacies.find((p) => p.id === targetPharmacyId);
      if (targetPharm) {
        const canEnter =
          targetPharm.status === "active" &&
          targetPharm.expiryDate !== null &&
          new Date(targetPharm.expiryDate) > new Date();

        if (canEnter) {
          setCurrentPharmacy(targetPharm);
          localStorage.setItem(STORAGE_KEYS.CURRENT_PHARMACY, JSON.stringify(targetPharm));
        }
      }
    }

    return {
      success: true,
      message: "Staff authenticated successfully.",
      pharmacyCount: assignedPharmacyIds.length,
    };
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
      status: "inactive",
      expiryDate: null,
      ownerEmail: user?.email || "admin@pharmanext.com",
      createdAt: new Date().toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
    };

    const updated = [newPharmacy, ...pharmacies];
    savePharmacies(updated);

    // Dynamic Cloud sync to Firestore
    setDoc(doc(db, "pharmacies", newPharmacy.id), newPharmacy).catch((err) => {
      console.warn("Firestore save notice:", err?.message || err);
    });

    return newPharmacy;
  };

  // Toggle pharmacy activation (Admin demo/simulation feature)
  const togglePharmacyActivation = (
    pharmacyId: string,
    days: number = APP_CONFIG.defaultTrialDays
  ) => {
    let updatedTarget: Pharmacy | null = null;
    const updated = pharmacies.map((p) => {
      if (p.id === pharmacyId) {
        if (p.status === "active") {
          updatedTarget = {
            ...p,
            status: "inactive" as const,
            expiryDate: null,
          };
          return updatedTarget;
        } else {
          updatedTarget = {
            ...p,
            status: "active" as const,
            expiryDate: new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString(),
          };
          return updatedTarget;
        }
      }
      return p;
    });

    savePharmacies(updated);

    if (currentPharmacy && currentPharmacy.id === pharmacyId) {
      const refreshed = updated.find((p) => p.id === pharmacyId) || null;
      setCurrentPharmacy(refreshed);
      if (refreshed) {
        localStorage.setItem(STORAGE_KEYS.CURRENT_PHARMACY, JSON.stringify(refreshed));
      }
    }

    // Dynamic Cloud sync update to Firestore
    if (updatedTarget) {
      updateDoc(doc(db, "pharmacies", pharmacyId), {
        status: (updatedTarget as Pharmacy).status,
        expiryDate: (updatedTarget as Pharmacy).expiryDate,
      }).catch((err) => {
        console.warn("Firestore update notice:", err?.message || err);
      });
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
        sendAdminOtp,
        verifyAdminOtp,
        loginStaff,
        loginStaffByMpin,
        addPharmacy,
        togglePharmacyActivation,
        selectPharmacy,
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
