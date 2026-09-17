"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Users,
  UserPlus,
  Search,
  BadgeCheck,
  Phone,
  Mail,
  Shield,
  Clock,
  Trash2,
  X,
  Store,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, setDoc, deleteDoc, query, where } from "firebase/firestore";

export interface StaffMember {
  id: string;
  pharmacyId?: string;
  name: string;
  role: "Pharmacist" | "Assistant Pharmacist" | "Cashier" | "Inventory Manager" | "Store Manager";
  phone: string;
  email?: string;
  licenseNo?: string;
  shift: "Morning (8AM - 4PM)" | "Evening (2PM - 10PM)" | "Night (10PM - 6AM)" | "General (9AM - 6PM)";
  status: "Active" | "On Leave";
  joinedDate: string;
}

export default function StaffContent() {
  const { currentPharmacy, user } = useAuth();
  const pharmacyId = currentPharmacy?.id;

  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState("All");

  // Add Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [role, setRole] = useState<StaffMember["role"]>("Pharmacist");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [licenseNo, setLicenseNo] = useState("");
  const [shift, setShift] = useState<StaffMember["shift"]>("General (9AM - 6PM)");

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
          snap.forEach((d) => list.push(d.data() as StaffMember));
          setStaffList(list);
          if (typeof window !== "undefined") {
            localStorage.setItem(staffKey, JSON.stringify(list));
          }
        } else if (isMounted && typeof window !== "undefined") {
          const saved = localStorage.getItem(staffKey);
          if (saved) {
            try {
              setStaffList(JSON.parse(saved));
            } catch {
              setStaffList([]);
            }
          } else {
            // Provide active user as default store manager if empty
            const initialList: StaffMember[] = [
              {
                id: `staff-${Date.now()}`,
                pharmacyId,
                name: user?.name || "Store Administrator",
                role: "Store Manager",
                phone: currentPharmacy?.phone || "9876543210",
                email: user?.email || "admin@pharmacynext.com",
                licenseNo: currentPharmacy?.licenseNo || "PCI-REG-9921",
                shift: "General (9AM - 6PM)",
                status: "Active",
                joinedDate: new Date().toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                }),
              },
            ];
            setStaffList(initialList);
            localStorage.setItem(staffKey, JSON.stringify(initialList));
          }
        }
      } catch (err) {
        if (isMounted && typeof window !== "undefined") {
          const saved = localStorage.getItem(staffKey);
          if (saved) {
            try {
              setStaffList(JSON.parse(saved));
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
      if (filterRole !== "All" && s.role !== filterRole) return false;
      if (q) {
        const matchName = s.name.toLowerCase().includes(q);
        const matchPhone = s.phone.includes(q);
        const matchRole = s.role.toLowerCase().includes(q);
        if (!matchName && !matchPhone && !matchRole) return false;
      }
      return true;
    });
  }, [staffList, searchQuery, filterRole]);

  // Add Staff Member
  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;

    const newStaff: StaffMember = {
      id: `staff-${Date.now()}`,
      pharmacyId,
      name: name.trim(),
      role,
      phone: phone.trim(),
      email: email.trim() || undefined,
      licenseNo: licenseNo.trim() || undefined,
      shift,
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

    setName("");
    setPhone("");
    setEmail("");
    setLicenseNo("");
    setIsAddModalOpen(false);
  };

  // Toggle Status
  const handleToggleStatus = async (id: string) => {
    const updated: StaffMember[] = staffList.map((s) =>
      s.id === id
        ? { ...s, status: (s.status === "Active" ? "On Leave" : "Active") as "Active" | "On Leave" }
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
    if (confirm("Are you sure you want to remove this staff member from this outlet?")) {
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
              Staff & Branch Team
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-purple-50 text-[#5E2B9D] border border-purple-200">
              {currentPharmacy?.name || "Active Outlet"}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Registered pharmacists, cashiers, and store managers assigned to this pharmacy.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-[#5E2B9D] hover:bg-[#4D2382] text-white text-xs font-medium transition-colors shadow-xs cursor-pointer"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>Add Staff Member</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/80 rounded-md p-4 shadow-xs">
          <span className="text-xs font-medium text-slate-500">Total Team Members</span>
          <div className="mt-2 text-2xl font-medium text-slate-900">
            {staffList.length}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Assigned to this outlet</p>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-md p-4 shadow-xs">
          <span className="text-xs font-medium text-slate-500">Active On Duty</span>
          <div className="mt-2 text-2xl font-medium text-emerald-600">
            {staffList.filter((s) => s.status === "Active").length}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Available for shifts</p>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-md p-4 shadow-xs">
          <span className="text-xs font-medium text-slate-500">Registered Pharmacists</span>
          <div className="mt-2 text-2xl font-medium text-[#5E2B9D]">
            {staffList.filter((s) => s.role === "Pharmacist" || s.role === "Assistant Pharmacist").length}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Dispensing qualified</p>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-md p-4 shadow-xs">
          <span className="text-xs font-medium text-slate-500">Cashiers & Billing</span>
          <div className="mt-2 text-2xl font-medium text-blue-600">
            {staffList.filter((s) => s.role === "Cashier").length}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Counter operators</p>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white border border-slate-200/80 rounded-md p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search staff by name, role, phone..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-xs focus:outline-hidden focus:border-[#5E2B9D] focus:bg-white transition-colors"
          />
        </div>

        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
          className="px-3 py-2 rounded-md bg-white border border-slate-200 text-xs text-slate-700 font-medium focus:outline-hidden focus:border-[#5E2B9D] cursor-pointer"
        >
          <option value="All">All Roles</option>
          <option value="Store Manager">Store Manager</option>
          <option value="Pharmacist">Pharmacist</option>
          <option value="Assistant Pharmacist">Assistant Pharmacist</option>
          <option value="Cashier">Cashier</option>
          <option value="Inventory Manager">Inventory Manager</option>
        </select>
      </div>

      {/* Staff Table */}
      <div className="bg-white border border-slate-200/80 rounded-md shadow-xs overflow-hidden">
        {filteredStaff.length === 0 ? (
          <div className="p-16 text-center flex flex-col items-center justify-center text-slate-400">
            <Users className="w-12 h-12 stroke-1 text-slate-300 mb-2" />
            <h3 className="text-sm font-medium text-slate-700">No Staff Members Found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">
              {searchQuery || filterRole !== "All"
                ? "No team members match your filter criteria."
                : `No team members are assigned to ${currentPharmacy?.name || "this pharmacy"} yet.`}
            </p>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-[#5E2B9D] hover:bg-[#4D2382] text-white text-xs font-medium transition-colors shadow-xs cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Add Staff Member</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Staff Name</th>
                  <th className="py-3 px-3">Designation / Role</th>
                  <th className="py-3 px-3">Contact</th>
                  <th className="py-3 px-3">License / Reg #</th>
                  <th className="py-3 px-3">Assigned Shift</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredStaff.map((staff) => (
                  <tr key={staff.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-900">{staff.name}</div>
                      <div className="text-[10px] text-slate-400">Joined {staff.joinedDate}</div>
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-purple-50 text-[#5E2B9D] border border-purple-200">
                        {staff.role}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-slate-600">
                      <div>{staff.phone}</div>
                      {staff.email && <div className="text-[10px] text-slate-400">{staff.email}</div>}
                    </td>
                    <td className="py-3.5 px-3 text-slate-600 font-mono text-[11px]">
                      {staff.licenseNo || "—"}
                    </td>
                    <td className="py-3.5 px-3 text-slate-600">{staff.shift}</td>
                    <td className="py-3.5 px-3 text-center">
                      <button
                        onClick={() => handleToggleStatus(staff.id)}
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-medium cursor-pointer transition-colors ${
                          staff.status === "Active"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                            : "bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200"
                        }`}
                        title="Click to toggle status"
                      >
                        {staff.status}
                      </button>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => handleDeleteStaff(staff.id)}
                        className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Remove staff member"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Staff Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-md border border-slate-200 shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-[#5E2B9D]" />
                <h3 className="text-base font-medium text-slate-900">Add Team Member</h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddStaff} className="space-y-3.5 mt-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Dr. Anita Sharma"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-xs focus:outline-hidden focus:border-[#5E2B9D] focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Role / Designation *
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-xs focus:outline-hidden focus:border-[#5E2B9D] focus:bg-white cursor-pointer"
                >
                  <option value="Pharmacist">Pharmacist</option>
                  <option value="Assistant Pharmacist">Assistant Pharmacist</option>
                  <option value="Cashier">Cashier</option>
                  <option value="Inventory Manager">Inventory Manager</option>
                  <option value="Store Manager">Store Manager</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Mobile Number *
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="10-digit phone"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-xs focus:outline-hidden focus:border-[#5E2B9D] focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Pharmacy Reg #
                  </label>
                  <input
                    type="text"
                    value={licenseNo}
                    onChange={(e) => setLicenseNo(e.target.value)}
                    placeholder="e.g. PCI-88214"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-xs focus:outline-hidden focus:border-[#5E2B9D] focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="staff@example.com"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-xs focus:outline-hidden focus:border-[#5E2B9D] focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Assigned Shift
                </label>
                <select
                  value={shift}
                  onChange={(e) => setShift(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-xs focus:outline-hidden focus:border-[#5E2B9D] focus:bg-white cursor-pointer"
                >
                  <option value="General (9AM - 6PM)">General (9AM - 6PM)</option>
                  <option value="Morning (8AM - 4PM)">Morning (8AM - 4PM)</option>
                  <option value="Evening (2PM - 10PM)">Evening (2PM - 10PM)</option>
                  <option value="Night (10PM - 6AM)">Night (10PM - 6AM)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-md bg-[#5E2B9D] hover:bg-[#4D2382] text-white text-xs font-medium transition-colors shadow-xs cursor-pointer"
                >
                  Save Team Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
