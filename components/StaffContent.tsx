"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Users,
  UserPlus,
  Search,
  Phone,
  KeyRound,
  Shield,
  Eye,
  EyeOff,
  Trash2,
  X,
  CheckCircle2,
  AlertCircle,
  Lock,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, setDoc, deleteDoc, query, where } from "firebase/firestore";

export interface StaffMember {
  id: string;
  pharmacyId?: string;
  name: string;
  phone: string;
  mpin: string;
  role?: string;
  status: "Active" | "Inactive";
  joinedDate: string;
}

export default function StaffContent() {
  const { currentPharmacy, user } = useAuth();
  const pharmacyId = currentPharmacy?.id;

  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [visibleMpins, setVisibleMpins] = useState<Record<string, boolean>>({});

  // Add Staff Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [mpin, setMpin] = useState("");
  const [showModalMpin, setShowModalMpin] = useState(false);
  const [formError, setFormError] = useState("");

  // Load pharmacy-isolated staff
  useEffect(() => {
    let isMounted = true;
    const staffKey = pharmacyId
      ? `pharmacynext_staff_${pharmacyId}`
      : "pharmacynext_staff_default";

    async function loadStaff() {
      setIsLoading(true);
      try {
        let staffQuery;
        if (pharmacyId) {
          staffQuery = query(collection(db, "staff"), where("pharmacyId", "==", pharmacyId));
        } else {
          staffQuery = collection(db, "staff");
        }

        const snap = await getDocs(staffQuery);
        if (isMounted && !snap.empty) {
          const list: StaffMember[] = [];
          snap.forEach((d) => {
            const data = d.data() as StaffMember;
            // Backward compatibility if mpin wasn't set earlier
            list.push({
              ...data,
              mpin: data.mpin || "1234",
              status: ((data.status as unknown as string) === "On Leave" ? "Inactive" : (data.status || "Active")),
            });
          });
          setStaffList(list);
          if (typeof window !== "undefined") {
            localStorage.setItem(staffKey, JSON.stringify(list));
          }
        } else if (isMounted && typeof window !== "undefined") {
          const saved = localStorage.getItem(staffKey);
          if (saved) {
            try {
              const parsed = JSON.parse(saved);
              const list = parsed
                .filter((item: any) => item.id !== "staff-1" && item.name !== "Main Cashier")
                .map((item: any) => ({
                  ...item,
                  mpin: item.mpin || "1234",
                  status: (item.status === "On Leave" ? "Inactive" : (item.status || "Active")),
                }));
              setStaffList(list);
              localStorage.setItem(staffKey, JSON.stringify(list));
            } catch {
              setStaffList([]);
            }
          } else {
            setStaffList([]);
          }
        }
      } catch (err) {
        if (isMounted && typeof window !== "undefined") {
          const saved = localStorage.getItem(staffKey);
          if (saved) {
            try {
              const parsed = JSON.parse(saved);
              const list = parsed
                .filter((item: any) => item.id !== "staff-1" && item.name !== "Main Cashier")
                .map((item: any) => ({
                  ...item,
                  mpin: item.mpin || "1234",
                  status: (item.status === "On Leave" ? "Inactive" : (item.status || "Active")),
                }));
              setStaffList(list);
              localStorage.setItem(staffKey, JSON.stringify(list));
            } catch {
              setStaffList([]);
            }
          }
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadStaff();
    return () => {
      isMounted = false;
    };
  }, [pharmacyId, currentPharmacy, user]);

  // Filtered List
  const filteredStaff = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return staffList.filter((s) => {
      if (q) {
        const matchName = s.name.toLowerCase().includes(q);
        const matchPhone = s.phone.includes(q);
        if (!matchName && !matchPhone) return false;
      }
      return true;
    });
  }, [staffList, searchQuery]);

  // Toggle MPIN visibility for a row
  const toggleMpinVisibility = (id: string) => {
    setVisibleMpins((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Add Staff Member
  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!name.trim()) {
      setFormError("Please enter staff name.");
      return;
    }
    if (!phone.trim()) {
      setFormError("Please enter mobile number.");
      return;
    }
    if (!mpin.trim() || mpin.trim().length < 4) {
      setFormError("Please enter a valid 4-6 digit MPIN.");
      return;
    }

    const newStaff: StaffMember = {
      id: `staff-${Date.now()}`,
      pharmacyId,
      name: name.trim(),
      phone: phone.trim(),
      mpin: mpin.trim(),
      role: "Staff / Cashier",
      status: "Active",
      joinedDate: new Date().toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
    };

    const updated = [newStaff, ...staffList];
    setStaffList(updated);

    const staffKey = pharmacyId
      ? `pharmacynext_staff_${pharmacyId}`
      : "pharmacynext_staff_default";
    try {
      localStorage.setItem(staffKey, JSON.stringify(updated));
      await setDoc(doc(db, "staff", newStaff.id), newStaff);
    } catch (err) {
      console.warn("Staff save sync note:", err);
    }

    // Reset Form
    setName("");
    setPhone("");
    setMpin("");
    setShowModalMpin(false);
    setFormError("");
    setIsAddModalOpen(false);
  };

  // Toggle Status
  const handleToggleStatus = async (id: string) => {
    const updated: StaffMember[] = staffList.map((s) =>
      s.id === id
        ? { ...s, status: (s.status === "Active" ? "Inactive" : "Active") as "Active" | "Inactive" }
        : s
    );
    setStaffList(updated);
    const staffKey = pharmacyId
      ? `pharmacynext_staff_${pharmacyId}`
      : "pharmacynext_staff_default";
    try {
      localStorage.setItem(staffKey, JSON.stringify(updated));
      const target = updated.find((s) => s.id === id);
      if (target) {
        await setDoc(doc(db, "staff", id), target);
      }
    } catch (err) {
      console.warn("Staff status toggle note:", err);
    }
  };

  // Delete Staff
  const handleDeleteStaff = async (id: string) => {
    if (confirm("Are you sure you want to remove this staff member?")) {
      const updated = staffList.filter((s) => s.id !== id);
      setStaffList(updated);
      const staffKey = pharmacyId
        ? `pharmacynext_staff_${pharmacyId}`
        : "pharmacynext_staff_default";
      try {
        localStorage.setItem(staffKey, JSON.stringify(updated));
        await deleteDoc(doc(db, "staff", id));
      } catch (err) {
        console.warn("Staff delete note:", err);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white border border-slate-200/80 rounded-md p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-medium text-slate-900 tracking-tight">
              Staff &amp; Counter Logins
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-purple-50 text-[#5E2B9D] border border-purple-200">
              {staffList.length} Staff Members
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage counter staff, mobile numbers, and quick MPIN credentials for billing counters at {currentPharmacy?.name || "this pharmacy"}.
          </p>
        </div>

        <button
          onClick={() => {
            setFormError("");
            setIsAddModalOpen(true);
          }}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-[#5E2B9D] hover:bg-[#4D2382] text-white text-xs font-medium transition-colors shadow-xs cursor-pointer"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>Add Staff</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200/80 rounded-md p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Total Staff Members</span>
            <Users className="w-4 h-4 text-purple-600" />
          </div>
          <div className="mt-2 text-2xl font-medium text-slate-900">
            {staffList.length}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Assigned to this outlet</p>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-md p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Active Counters</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-medium text-emerald-600">
            {staffList.filter((s) => s.status === "Active").length}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Authorized for billing</p>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-md p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">MPIN Security</span>
            <Shield className="w-4 h-4 text-[#5E2B9D]" />
          </div>
          <div className="mt-2 text-2xl font-medium text-[#5E2B9D]">
            {staffList.filter((s) => s.mpin && s.mpin.length >= 4).length}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Configured MPIN passwords</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white border border-slate-200/80 rounded-md p-3.5 shadow-xs flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search staff by name or mobile number..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-xs focus:outline-hidden focus:border-[#5E2B9D] focus:bg-white transition-colors"
          />
        </div>
      </div>

      {/* Staff Table */}
      <div className="bg-white border border-slate-200/80 rounded-md shadow-xs overflow-hidden">
        {filteredStaff.length === 0 ? (
          <div className="p-16 text-center flex flex-col items-center justify-center text-slate-400">
            <Users className="w-12 h-12 stroke-1 text-slate-300 mb-2" />
            <h3 className="text-sm font-medium text-slate-700">No Staff Members Found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">
              {searchQuery
                ? "No staff members match your search."
                : `No staff members are registered for ${currentPharmacy?.name || "this pharmacy"} yet.`}
            </p>
            <button
              onClick={() => {
                setFormError("");
                setIsAddModalOpen(true);
              }}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-[#5E2B9D] hover:bg-[#4D2382] text-white text-xs font-medium transition-colors shadow-xs cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Add First Staff Member</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[650px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Staff Name</th>
                  <th className="py-3 px-3">Mobile Number</th>
                  <th className="py-3 px-3">Counter MPIN</th>
                  <th className="py-3 px-3">Joined Date</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {filteredStaff.map((staff) => {
                  const isMpinVisible = visibleMpins[staff.id] || false;
                  const initials = staff.name
                    .split(" ")
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase();

                  return (
                    <tr key={staff.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Name & Initials */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-purple-100 border border-purple-200 text-[#5E2B9D] flex items-center justify-center font-medium text-xs shrink-0">
                            {initials}
                          </div>
                          <div>
                            <div className="font-medium text-slate-900">{staff.name}</div>
                            <div className="text-[10px] text-slate-400">
                              {staff.role || "Cashier"}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Mobile Number */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5 text-slate-800 font-medium">
                          <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{staff.phone}</span>
                        </div>
                      </td>

                      {/* Counter MPIN */}
                      <td className="py-3 px-3">
                        <div className="inline-flex items-center gap-2 bg-slate-50 border border-slate-200 rounded px-2.5 py-1">
                          <KeyRound className="w-3 h-3 text-purple-600 shrink-0" />
                          <span className="font-mono text-xs tracking-wider text-slate-800">
                            {isMpinVisible ? staff.mpin : "••••"}
                          </span>
                          <button
                            type="button"
                            onClick={() => toggleMpinVisibility(staff.id)}
                            className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                            title={isMpinVisible ? "Hide MPIN" : "Reveal MPIN"}
                          >
                            {isMpinVisible ? (
                              <EyeOff className="w-3 h-3" />
                            ) : (
                              <Eye className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Joined Date */}
                      <td className="py-3 px-3 text-slate-500">
                        {staff.joinedDate}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => handleToggleStatus(staff.id)}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium cursor-pointer transition-colors ${
                            staff.status === "Active"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                              : "bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200"
                          }`}
                          title="Click to toggle status"
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              staff.status === "Active" ? "bg-emerald-500" : "bg-slate-400"
                            }`}
                          />
                          <span>{staff.status}</span>
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleDeleteStaff(staff.id)}
                          className="p-1.5 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                          title="Delete staff member"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Staff Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-md border border-slate-200 shadow-xl max-w-md w-full overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-md bg-purple-50 text-[#5E2B9D] flex items-center justify-center border border-purple-100">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-medium text-slate-900">Add Staff Member</h2>
                  <p className="text-[11px] text-slate-500">
                    Register counter cashier with mobile and login MPIN
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleAddStaff} className="p-5 space-y-4">
              {formError && (
                <div className="p-2.5 rounded-md bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Staff Name */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Staff Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Rahul Verma"
                  className="w-full px-3 py-2 border border-slate-200 rounded-md text-xs focus:outline-hidden focus:border-[#5E2B9D]"
                />
              </div>

              {/* Mobile Number */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Mobile Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  placeholder="e.g. 9876543210"
                  className="w-full px-3 py-2 border border-slate-200 rounded-md text-xs focus:outline-hidden focus:border-[#5E2B9D]"
                />
              </div>

              {/* MPIN */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Counter MPIN <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showModalMpin ? "text" : "password"}
                    inputMode="numeric"
                    maxLength={6}
                    required
                    value={mpin}
                    onChange={(e) => setMpin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="4 to 6 digit security PIN (e.g. 1234)"
                    className="w-full pl-3 pr-9 py-2 border border-slate-200 rounded-md text-xs tracking-widest focus:outline-hidden focus:border-[#5E2B9D]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowModalMpin(!showModalMpin)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                  >
                    {showModalMpin ? (
                      <EyeOff className="w-3.5 h-3.5" />
                    ) : (
                      <Eye className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Numeric passcode used by this staff member for counter authentication.
                </p>
              </div>

              {/* Modal Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3.5 py-2 rounded-md border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-md bg-[#5E2B9D] hover:bg-[#4D2382] text-white text-xs font-medium shadow-xs cursor-pointer"
                >
                  Save Staff
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
