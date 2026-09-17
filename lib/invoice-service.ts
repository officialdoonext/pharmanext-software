"use client";

import { db } from "./firebase";
import {
  collection,
  doc,
  getDocs,
  setDoc,
  query,
  where,
} from "firebase/firestore";
import { BillInvoice } from "@/components/BillPrintModal";
import { recordCustomerPurchase } from "./customer-service";

/**
 * Recursively cleans an object for Firestore by omitting any keys with `undefined` values.
 * Firestore strictly throws an error if any field or nested field has `undefined`.
 */
export function cleanFirestoreData<T = any>(data: T): any {
  if (data === undefined) {
    return null;
  }
  if (data === null || typeof data !== "object") {
    return data;
  }
  if (data instanceof Date) {
    return data.toISOString();
  }
  if (Array.isArray(data)) {
    return data
      .filter((item) => item !== undefined)
      .map((item) => cleanFirestoreData(item));
  }
  const cleanObj: Record<string, any> = {};
  for (const [key, val] of Object.entries(data as Record<string, any>)) {
    if (val !== undefined) {
      cleanObj[key] = cleanFirestoreData(val);
    }
  }
  return cleanObj;
}

/**
 * Resolves the pharmacy ID from parameter or local storage session fallback
 */
export function resolveCurrentPharmacyId(explicitPharmacyId?: string): string | undefined {
  if (explicitPharmacyId && explicitPharmacyId.trim()) {
    return explicitPharmacyId.trim();
  }
  if (typeof window !== "undefined") {
    try {
      const saved = localStorage.getItem("pharmanext_current_pharmacy");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.id) return parsed.id;
      }
    } catch {}
  }
  return undefined;
}

/**
 * Returns the pharmacy-isolated localStorage key for invoices
 */
export function getInvoicesStorageKey(pharmacyId?: string): string {
  const resolved = resolveCurrentPharmacyId(pharmacyId);
  return resolved ? `pharmacynext_invoices_${resolved}` : "pharmacynext_invoices_default";
}

/**
 * Saves a settled bill invoice into both pharmacy-isolated LocalStorage and Firestore.
 * Strips all `undefined` values so Firestore setDoc never fails.
 * Also automatically registers / updates customer purchase metrics.
 */
export async function savePharmacyInvoice(
  invoice: BillInvoice,
  pharmacyId?: string
): Promise<BillInvoice> {
  const resolvedPharmacyId = resolveCurrentPharmacyId(pharmacyId || invoice.pharmacyId);
  const now = new Date();
  
  const finalInvoice: BillInvoice = {
    ...invoice,
    pharmacyId: resolvedPharmacyId,
    createdAt: invoice.createdAt || now.toISOString(),
  };

  const storeKey = getInvoicesStorageKey(resolvedPharmacyId);

  // 1. Immediately persist to Pharmacy-specific LocalStorage
  if (typeof window !== "undefined") {
    try {
      const saved = localStorage.getItem(storeKey);
      const existing: BillInvoice[] = saved ? JSON.parse(saved) : [];
      const filtered = existing.filter((inv) => inv.invoiceNo !== finalInvoice.invoiceNo);
      const updated = [finalInvoice, ...filtered];
      localStorage.setItem(storeKey, JSON.stringify(updated));

      // Broadcast custom event so other mounted views (sales, dashboard, etc.) can react
      window.dispatchEvent(
        new CustomEvent("pharmacynext_invoice_saved", {
          detail: { invoice: finalInvoice, pharmacyId: resolvedPharmacyId },
        })
      );
    } catch (err) {
      console.warn("LocalStorage save invoice error:", err);
    }
  }

  // 2. Persist to Firestore with sanitized payload (no `undefined` values)
  try {
    const firestorePayload = cleanFirestoreData({
      ...finalInvoice,
      pharmacyId: resolvedPharmacyId || "default",
    });

    await setDoc(doc(db, "invoices", finalInvoice.invoiceNo), firestorePayload, {
      merge: true,
    });
  } catch (err) {
    console.warn("Firestore invoice settlement sync note:", err);
  }

  // 3. Automatically record customer purchase if valid phone provided
  if (finalInvoice.customerPhone && finalInvoice.customerPhone.trim()) {
    try {
      await recordCustomerPurchase(resolvedPharmacyId, {
        name: finalInvoice.customerName || "Walk-in Customer",
        phone: finalInvoice.customerPhone.trim(),
        amount: finalInvoice.grandTotal,
      });
    } catch (custErr) {
      console.warn("Customer purchase record note:", custErr);
    }
  }

  return finalInvoice;
}

/**
 * Loads all invoices strictly for the specified pharmacy.
 * Merges Firestore documents and LocalStorage cache by invoiceNo, ensuring that
 * newly settled bills in LocalStorage are NEVER lost or overwritten.
 * Also auto-syncs any un-synced local invoices to Firestore in the background.
 */
export async function fetchPharmacyInvoices(
  pharmacyId?: string
): Promise<BillInvoice[]> {
  const resolvedPharmacyId = resolveCurrentPharmacyId(pharmacyId);
  const storeKey = getInvoicesStorageKey(resolvedPharmacyId);

  // 1. Read existing LocalStorage invoices
  let localList: BillInvoice[] = [];
  if (typeof window !== "undefined") {
    try {
      const saved = localStorage.getItem(storeKey);
      if (saved) {
        localList = JSON.parse(saved);
      }
    } catch {}
  }

  // 2. Query Firestore invoices
  const remoteMap = new Map<string, BillInvoice>();
  try {
    let invQuery;
    if (resolvedPharmacyId) {
      invQuery = query(
        collection(db, "invoices"),
        where("pharmacyId", "==", resolvedPharmacyId)
      );
    } else {
      invQuery = collection(db, "invoices");
    }

    const snap = await getDocs(invQuery);
    if (!snap.empty) {
      snap.forEach((docSnap) => {
        const item = docSnap.data() as BillInvoice;
        if (item && item.invoiceNo) {
          remoteMap.set(item.invoiceNo, item);
        }
      });
    }
  } catch (err) {
    console.warn("Firestore fetch invoices note:", err);
  }

  // 3. Merge Local + Remote:
  // We use a Map keyed by invoiceNo so neither local nor remote invoices are dropped.
  const mergedMap = new Map<string, BillInvoice>();

  // Insert remote invoices first
  remoteMap.forEach((inv, no) => {
    mergedMap.set(no, inv);
  });

  // Local invoices override/augment remote invoices (preserves fresh local settlements)
  localList.forEach((inv) => {
    if (inv && inv.invoiceNo) {
      mergedMap.set(inv.invoiceNo, inv);
    }
  });

  const mergedList = Array.from(mergedMap.values());

  // Sort descending by date / invoiceNo
  mergedList.sort((a, b) => {
    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    if (dateA && dateB && dateA !== dateB) return dateB - dateA;
    return b.invoiceNo.localeCompare(a.invoiceNo);
  });

  // 4. Update LocalStorage with unified list
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(storeKey, JSON.stringify(mergedList));
    } catch {}
  }

  // 5. Background auto-sync: Push any invoices that exist only locally into Firestore
  (async () => {
    try {
      for (const inv of localList) {
        if (!remoteMap.has(inv.invoiceNo)) {
          const payload = cleanFirestoreData({
            ...inv,
            pharmacyId: resolvedPharmacyId || inv.pharmacyId || "default",
          });
          await setDoc(doc(db, "invoices", inv.invoiceNo), payload, {
            merge: true,
          });
        }
      }
    } catch {}
  })();

  return mergedList;
}
