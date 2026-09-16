"use client";

import { db } from "./firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

export interface PharmacySettings {
  // Pharmacy Profile Details
  pharmacyName: string;
  phone: string;
  email: string;
  address: string;
  drugLicenseNo?: string;
  pharmacistName?: string;
  tagline?: string;

  // GST Configuration Details
  gstEnabled: boolean;
  gstNumber: string;
  gstPercentage: number; // e.g. 12%
  cgstPercentage: number; // e.g. 6%
  sgstPercentage: number; // e.g. 6%
}

export const defaultPharmacySettings: PharmacySettings = {
  pharmacyName: "Sri Krishna Pharmacy & Healthcare",
  phone: "+91 98765 43210",
  email: "billing@pharmacynext.in",
  address: "Shop #4, Ground Floor, Sri Sai Complex, Main Road, Hyderabad - 500001",
  drugLicenseNo: "DL-20B/TG/2024/00192, DL-21B/TG/2024/00193",
  pharmacistName: "Reg. Pharmacist: Siva Krishna (Reg No: 54129)",
  tagline: "Smart Pharmacy. Genuine Medicines. Healthy Tomorrow.",

  gstEnabled: true,
  gstNumber: "36AAACP1234A1Z5",
  gstPercentage: 12,
  cgstPercentage: 6,
  sgstPercentage: 6,
};

const SETTINGS_STORAGE_KEY = "pharmacynext_store_settings";

// Retrieve settings from local cache or Firestore
export function getLocalPharmacySettings(): PharmacySettings {
  if (typeof window === "undefined") return defaultPharmacySettings;
  try {
    const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (saved) {
      return { ...defaultPharmacySettings, ...JSON.parse(saved) };
    }
  } catch (err) {
    console.warn("Failed to load settings from localStorage:", err);
  }
  return defaultPharmacySettings;
}

// Save settings to localStorage and Firestore
export async function savePharmacySettings(
  settings: PharmacySettings,
  pharmacyId?: string
): Promise<void> {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch (e) {
      console.warn("LocalStorage save error:", e);
    }
  }

  try {
    const docId = pharmacyId ? `settings_${pharmacyId}` : "general_store_settings";
    await setDoc(doc(db, "store_settings", docId), settings, { merge: true });
  } catch (err) {
    console.warn("Firestore settings save error:", err);
  }
}

// Fetch settings from Firestore on mount
export async function fetchRemotePharmacySettings(
  pharmacyId?: string
): Promise<PharmacySettings> {
  try {
    const docId = pharmacyId ? `settings_${pharmacyId}` : "general_store_settings";
    const snap = await getDoc(doc(db, "store_settings", docId));
    if (snap.exists()) {
      const data = snap.data() as PharmacySettings;
      const merged = { ...defaultPharmacySettings, ...data };
      if (typeof window !== "undefined") {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(merged));
      }
      return merged;
    }
  } catch (err) {
    console.warn("Firestore settings fetch error:", err);
  }
  return getLocalPharmacySettings();
}
