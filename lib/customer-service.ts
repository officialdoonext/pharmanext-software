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
  try {
    let custQuery;
    if (pharmacyId) {
      custQuery = query(collection(db, "customers"), where("pharmacyId", "==", pharmacyId));
    } else {
      custQuery = collection(db, "customers");
    }

    const snap = await getDocs(custQuery);
    if (!snap.empty) {
      const list: CustomerRecord[] = [];
      snap.forEach((d) => list.push(d.data() as CustomerRecord));
      if (typeof window !== "undefined") {
        localStorage.setItem(storeKey, JSON.stringify(list));
      }
      return list;
    }
  } catch (e) {
    console.warn("Firestore fetch customers note:", e);
  }

  return localList;
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
      // Replace if same phone exists or prepend
      const filtered = existing.filter((c) => c.phone !== newCustomer.phone);
      const updated = [newCustomer, ...filtered];
      localStorage.setItem(storeKey, JSON.stringify(updated));
    } catch {}
  }

  // 2. Save to Firestore
  try {
    await setDoc(doc(db, "customers", newCustomer.id), newCustomer);
  } catch (e) {
    console.warn("Firestore save customer note:", e);
  }

  return newCustomer;
}
