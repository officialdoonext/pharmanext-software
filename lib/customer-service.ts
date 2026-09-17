"use client";

import { db } from "./firebase";
import { collection, getDocs, doc, setDoc, query, where } from "firebase/firestore";

export interface CustomerRecord {
  id: string;
  name: string;
  phone: string;
  city?: string;
  totalVisits: number;
  totalSpent: number;
  lastVisit: string;
  pharmacyId?: string;
}

function cleanObject<T extends Record<string, any>>(obj: T): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result;
}

export function getCustomersStorageKey(pharmacyId?: string): string {
  return pharmacyId ? `pharmacynext_customers_${pharmacyId}` : "pharmacynext_customers_default";
}

export async function fetchPharmacyCustomers(pharmacyId?: string): Promise<CustomerRecord[]> {
  const storeKey = getCustomersStorageKey(pharmacyId);

  // 1. Check LocalStorage cache first
  let localList: CustomerRecord[] = [];
  if (typeof window !== "undefined") {
    try {
      const saved = localStorage.getItem(storeKey);
      if (saved) {
        localList = JSON.parse(saved);
      }
    } catch {}
  }

  // 2. Fetch from Firestore
  const remoteList: CustomerRecord[] = [];
  try {
    let custQuery;
    if (pharmacyId) {
      custQuery = query(collection(db, "customers"), where("pharmacyId", "==", pharmacyId));
    } else {
      custQuery = collection(db, "customers");
    }

    const snap = await getDocs(custQuery);
    if (!snap.empty) {
      snap.forEach((d) => remoteList.push(d.data() as CustomerRecord));
    }
  } catch (e) {
    console.warn("Firestore fetch customers note:", e);
  }

  // 3. Merge by Phone / ID (so local records are not lost)
  const map = new Map<string, CustomerRecord>();
  remoteList.forEach((c) => {
    if (c.phone) map.set(c.phone, c);
    else if (c.id) map.set(c.id, c);
  });
  localList.forEach((c) => {
    if (c.phone) map.set(c.phone, c);
    else if (c.id) map.set(c.id, c);
  });

  const merged = Array.from(map.values());
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(storeKey, JSON.stringify(merged));
    } catch {}
  }

  return merged;
}

export async function savePharmacyCustomer(
  pharmacyId: string | undefined,
  data: {
    name: string;
    phone: string;
    city?: string;
  }
): Promise<CustomerRecord> {
  const storeKey = getCustomersStorageKey(pharmacyId);
  const nowStr = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const newCustomer: CustomerRecord = {
    id: `cust-${Date.now()}`,
    name: data.name.trim(),
    phone: data.phone.trim(),
    city: data.city?.trim() || undefined,
    totalVisits: 0,
    totalSpent: 0,
    lastVisit: nowStr,
    pharmacyId,
  };

  // 1. Update LocalStorage
  if (typeof window !== "undefined") {
    try {
      const saved = localStorage.getItem(storeKey);
      const existing: CustomerRecord[] = saved ? JSON.parse(saved) : [];
      const filtered = existing.filter((c) => c.phone !== newCustomer.phone);
      const updated = [newCustomer, ...filtered];
      localStorage.setItem(storeKey, JSON.stringify(updated));
    } catch {}
  }

  // 2. Save to Firestore (omit undefined)
  try {
    await setDoc(doc(db, "customers", newCustomer.id), cleanObject(newCustomer), { merge: true });
  } catch (e) {
    console.warn("Firestore save customer note:", e);
  }

  return newCustomer;
}

export async function recordCustomerPurchase(
  pharmacyId: string | undefined,
  data: {
    name: string;
    phone: string;
    amount: number;
  }
): Promise<void> {
  const phone = data.phone.trim();
  if (!phone) return;
  const name = data.name.trim() || "Walk-in Customer";
  const storeKey = getCustomersStorageKey(pharmacyId);

  const nowStr = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  let existingList: CustomerRecord[] = [];
  if (typeof window !== "undefined") {
    try {
      const saved = localStorage.getItem(storeKey);
      if (saved) existingList = JSON.parse(saved);
    } catch {}
  }

  const existingIdx = existingList.findIndex((c) => c.phone === phone);
  let updatedRecord: CustomerRecord;

  if (existingIdx >= 0) {
    const prev = existingList[existingIdx];
    updatedRecord = {
      ...prev,
      name: name !== "Walk-in Customer" ? name : prev.name,
      totalVisits: (prev.totalVisits || 0) + 1,
      totalSpent: Math.round(((prev.totalSpent || 0) + data.amount) * 100) / 100,
      lastVisit: nowStr,
      pharmacyId: pharmacyId || prev.pharmacyId,
    };
    existingList[existingIdx] = updatedRecord;
  } else {
    updatedRecord = {
      id: `cust-${Date.now()}`,
      name,
      phone,
      totalVisits: 1,
      totalSpent: Math.round(data.amount * 100) / 100,
      lastVisit: nowStr,
      pharmacyId,
    };
    existingList.unshift(updatedRecord);
  }

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(storeKey, JSON.stringify(existingList));
    } catch {}
  }

  try {
    await setDoc(
      doc(db, "customers", updatedRecord.id),
      cleanObject(updatedRecord),
      { merge: true }
    );
  } catch (e) {
    console.warn("Firestore recordCustomerPurchase note:", e);
  }
}
