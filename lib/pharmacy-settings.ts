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
  pharmacyName: "Pharmacy Store",
  phone: "+91 98765 43210",
  email: "billing@pharmacynext.in",
  address: "Main Road, Hyderabad",
  drugLicenseNo: "DL-20B/21B",
  pharmacistName: "Reg. Pharmacist",
  tagline: "Smart Pharmacy. Genuine Medicines. Healthy Tomorrow.",

  gstEnabled: true,
  gstNumber: "36AAACP1234A1Z5",
  gstPercentage: 12,
  cgstPercentage: 6,
  sgstPercentage: 6,
};

export function getSettingsStorageKey(pharmacyId?: string): string {
  return pharmacyId ? `pharmacynext_store_settings_${pharmacyId}` : "pharmacynext_store_settings";
}

// Retrieve settings from local cache or Firestore
export function getLocalPharmacySettings(
  pharmacyId?: string,
  fallbackPharmacy?: { name?: string; phone?: string; licenseNo?: string; address?: string }
): PharmacySettings {
  if (typeof window === "undefined") {
    return createInitialSettings(fallbackPharmacy);
  }

  try {
    const key = getSettingsStorageKey(pharmacyId);
    const saved = localStorage.getItem(key);
    if (saved) {
      return { ...defaultPharmacySettings, ...JSON.parse(saved) };
    }
  } catch (err) {
    console.warn("Failed to load settings from localStorage:", err);
  }

  return createInitialSettings(fallbackPharmacy);
}

function createInitialSettings(fallbackPharmacy?: {
  name?: string;
  phone?: string;
  licenseNo?: string;
  address?: string;
}): PharmacySettings {
  if (!fallbackPharmacy) return defaultPharmacySettings;

  return {
    ...defaultPharmacySettings,
    pharmacyName: fallbackPharmacy.name || defaultPharmacySettings.pharmacyName,
    phone: fallbackPharmacy.phone || defaultPharmacySettings.phone,
    address: fallbackPharmacy.address || defaultPharmacySettings.address,
    drugLicenseNo: fallbackPharmacy.licenseNo ? `DL-${fallbackPharmacy.licenseNo}` : defaultPharmacySettings.drugLicenseNo,
  };
}

// Save settings to localStorage and Firestore
export async function savePharmacySettings(
  settings: PharmacySettings,
  pharmacyId?: string
): Promise<void> {
  const key = getSettingsStorageKey(pharmacyId);

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(key, JSON.stringify(settings));
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
  pharmacyId?: string,
  fallbackPharmacy?: { name?: string; phone?: string; licenseNo?: string; address?: string }
): Promise<PharmacySettings> {
  const key = getSettingsStorageKey(pharmacyId);

  try {
    const docId = pharmacyId ? `settings_${pharmacyId}` : "general_store_settings";
    const snap = await getDoc(doc(db, "store_settings", docId));
    if (snap.exists()) {
      const data = snap.data() as PharmacySettings;
      const initial = createInitialSettings(fallbackPharmacy);
      const merged = { ...initial, ...data };
      if (typeof window !== "undefined") {
        localStorage.setItem(key, JSON.stringify(merged));
      }
      return merged;
    }
  } catch (err) {
    console.warn("Firestore settings fetch error:", err);
  }

  return getLocalPharmacySettings(pharmacyId, fallbackPharmacy);
}
