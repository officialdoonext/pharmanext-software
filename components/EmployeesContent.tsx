"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Users,
  UserPlus,
  Search,
  Phone,
  Mail,
  MapPin,
  Calendar,
  DollarSign,
  Trash2,
  X,
  CheckCircle2,
  AlertCircle,
  Building,
  Briefcase,
  Wallet,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, setDoc, deleteDoc, query, where } from "firebase/firestore";

export interface Employee {
  id: string;
  pharmacyId?: string;
  name: string;
  phone: string;
  email?: string;
  city: string;
  address: string;
  salaryType: "monthly" | "daily";
  salaryAmount: number;
  status: "Active" | "Inactive";
  joinedDate: string;
}

export default function EmployeesContent() {
  const { currentPharmacy } = useAuth();
  const pharmacyId = currentPharmacy?.id;

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "monthly" | "daily">("all");

  // Add Employee Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [salaryType, setSalaryType] = useState<"monthly" | "daily">("monthly");
  const [salaryAmount, setSalaryAmount] = useState("");
  const [formError, setFormError] = useState("");

  // Load pharmacy-isolated employees
  useEffect(() => {
    let isMounted = true;
    const empKey = pharmacyId
      ? `pharmacynext_employees_${pharmacyId}`
      : "pharmacynext_employees_default";

    async function loadEmployees() {
      setIsLoading(true);
      try {
        let empQuery;
        if (pharmacyId) {
          empQuery = query(collection(db, "employees"), where("pharmacyId", "==", pharmacyId));
        } else {
          empQuery = collection(db, "employees");
        }

        const snap = await getDocs(empQuery);
        if (isMounted && !snap.empty) {
          const list: Employee[] = [];
          snap.forEach((d) => {
            const emp = d.data() as Employee;
            if (!emp.id.startsWith("emp-1") && !emp.id.startsWith("emp-2") && !emp.id.startsWith("emp-3")) {
              list.push(emp);
            }
          });
          setEmployees(list);
          if (typeof window !== "undefined") {
            localStorage.setItem(empKey, JSON.stringify(list));
          }
        } else if (isMounted && typeof window !== "undefined") {
          const saved = localStorage.getItem(empKey);
          if (saved) {
            try {
              const parsed: Employee[] = JSON.parse(saved);
              const clean = parsed.filter(
                (e) => !e.id.startsWith("emp-1") && !e.id.startsWith("emp-2") && !e.id.startsWith("emp-3")
              );
              setEmployees(clean);
              localStorage.setItem(empKey, JSON.stringify(clean));
            } catch {
              setEmployees([]);
            }
          } else {
            setEmployees([]);
          }
        }
      } catch (err) {
        if (isMounted && typeof window !== "undefined") {
          const saved = localStorage.getItem(empKey);
          if (saved) {
            try {
              const parsed: Employee[] = JSON.parse(saved);
              const clean = parsed.filter(
                (e) => !e.id.startsWith("emp-1") && !e.id.startsWith("emp-2") && !e.id.startsWith("emp-3")
              );
              setEmployees(clean);
              localStorage.setItem(empKey, JSON.stringify(clean));
            } catch {
              setEmployees([]);
            }
          }
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadEmployees();
    return () => {
      isMounted = false;
    };
  }, [pharmacyId]);

  // Filtered employees
  const filteredEmployees = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return employees.filter((emp) => {
      if (filterType !== "all" && emp.salaryType !== filterType) return false;
      if (q) {
        const matchName = emp.name.toLowerCase().includes(q);
        const matchPhone = emp.phone.includes(q);
        const matchCity = emp.city.toLowerCase().includes(q);
        const matchAddr = emp.address.toLowerCase().includes(q);
        if (!matchName && !matchPhone && !matchCity && !matchAddr) return false;
      }
      return true;
    });
  }, [employees, searchQuery, filterType]);

  // Metrics
  const metrics = useMemo(() => {
    const total = employees.length;
    const monthlyList = employees.filter((e) => e.salaryType === "monthly");
    const dailyList = employees.filter((e) => e.salaryType === "daily");
    const monthlyPayroll = monthlyList.reduce((acc, e) => acc + (e.salaryAmount || 0), 0);
    const avgDailyWage =
      dailyList.length > 0
        ? Math.round(dailyList.reduce((acc, e) => acc + (e.salaryAmount || 0), 0) / dailyList.length)
        : 0;

    return {
      total,
      monthlyCount: monthlyList.length,
      dailyCount: dailyList.length,
      monthlyPayroll,
      avgDailyWage,
    };
  }, [employees]);

  // Handle Add Employee Submit
  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!name.trim()) {
      setFormError("Please enter employee name.");
      return;
    }
    if (!phone.trim()) {
      setFormError("Please enter mobile number.");
      return;
    }
    if (!city.trim()) {
      setFormError("Please enter city.");
      return;
    }
    if (!address.trim()) {
      setFormError("Please enter full address.");
      return;
    }
    const amount = parseFloat(salaryAmount);
    if (isNaN(amount) || amount <= 0) {
      setFormError(
        salaryType === "monthly"
          ? "Please enter a valid monthly income."
          : "Please enter a valid daily wage."
      );
      return;
    }

    const newEmp: Employee = {
      id: `emp-${Date.now()}`,
      pharmacyId,
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim() || undefined,
      city: city.trim(),
      address: address.trim(),
      salaryType,
      salaryAmount: amount,
      status: "Active",
      joinedDate: new Date().toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
    };

    const updated = [newEmp, ...employees];
    setEmployees(updated);

    const empKey = pharmacyId
      ? `pharmacynext_employees_${pharmacyId}`
      : "pharmacynext_employees_default";
    try {
      localStorage.setItem(empKey, JSON.stringify(updated));
      await setDoc(doc(db, "employees", newEmp.id), newEmp);
    } catch (err) {
      console.warn("Employee save sync note:", err);
    }

    // Reset Form
    setName("");
    setPhone("");
    setEmail("");
    setCity("");
    setAddress("");
    setSalaryType("monthly");
    setSalaryAmount("");
    setFormError("");
    setIsAddModalOpen(false);
  };

  // Toggle status
  const handleToggleStatus = async (id: string) => {
    const updated: Employee[] = employees.map((e) =>
      e.id === id
        ? { ...e, status: (e.status === "Active" ? "Inactive" : "Active") as "Active" | "Inactive" }
        : e
    );
    setEmployees(updated);
    const empKey = pharmacyId
      ? `pharmacynext_employees_${pharmacyId}`
      : "pharmacynext_employees_default";
    try {
      localStorage.setItem(empKey, JSON.stringify(updated));
      const target = updated.find((e) => e.id === id);
      if (target) {
        await setDoc(doc(db, "employees", id), target);
      }
    } catch (err) {
      console.warn("Employee status toggle note:", err);
    }
  };

  // Delete employee
  const handleDeleteEmployee = async (id: string) => {
    if (confirm("Are you sure you want to remove this employee record?")) {
      const updated = employees.filter((e) => e.id !== id);
      setEmployees(updated);
      const empKey = pharmacyId
        ? `pharmacynext_employees_${pharmacyId}`
        : "pharmacynext_employees_default";
      try {
        localStorage.setItem(empKey, JSON.stringify(updated));
        await deleteDoc(doc(db, "employees", id));
      } catch (err) {
        console.warn("Employee delete note:", err);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Row */}
      <div className="bg-white border border-slate-200/80 rounded-md p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-medium text-slate-900 tracking-tight">
              Employees & Payroll
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-purple-50 text-[#5E2B9D] border border-purple-200">
              {employees.length} Staff & Workers
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage employee contact details, addresses, monthly salaries, and daily wage records for {currentPharmacy?.name || "this outlet"}.
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
          <span>Add Employee</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/80 rounded-md p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Total Employees</span>
            <Users className="w-4 h-4 text-purple-600" />
          </div>
          <div className="mt-2 text-2xl font-medium text-slate-900">
            {metrics.total}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Enrolled at this branch</p>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-md p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Monthly Salaried</span>
            <Briefcase className="w-4 h-4 text-[#5E2B9D]" />
          </div>
          <div className="mt-2 text-2xl font-medium text-[#5E2B9D]">
            {metrics.monthlyCount}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Payroll: ₹{metrics.monthlyPayroll.toLocaleString("en-IN")}/mo
          </p>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-md p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Daily Wage Workers</span>
            <Wallet className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2 text-2xl font-medium text-amber-600">
            {metrics.dailyCount}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Avg Rate: ₹{metrics.avgDailyWage.toLocaleString("en-IN")}/day
          </p>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-md p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Active Status</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-medium text-emerald-600">
            {employees.filter((e) => e.status === "Active").length}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Available for work</p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white border border-slate-200/80 rounded-md p-3.5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, phone, city, or address..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-xs focus:outline-hidden focus:border-[#5E2B9D] focus:bg-white transition-colors"
          />
        </div>

        <div className="flex items-center gap-1.5 self-start md:self-auto">
          <button
            onClick={() => setFilterType("all")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              filterType === "all"
                ? "bg-[#5E2B9D] text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            All ({employees.length})
          </button>
          <button
            onClick={() => setFilterType("monthly")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              filterType === "monthly"
                ? "bg-[#5E2B9D] text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Monthly Salaried ({metrics.monthlyCount})
          </button>
          <button
            onClick={() => setFilterType("daily")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              filterType === "daily"
                ? "bg-[#5E2B9D] text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Daily Wages ({metrics.dailyCount})
          </button>
        </div>
      </div>

      {/* Employees Table */}
      <div className="bg-white border border-slate-200/80 rounded-md shadow-xs overflow-hidden">
        {filteredEmployees.length === 0 ? (
          <div className="p-16 text-center flex flex-col items-center justify-center text-slate-400">
            <Users className="w-12 h-12 stroke-1 text-slate-300 mb-2" />
            <h3 className="text-sm font-medium text-slate-700">No Employees Found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">
              {searchQuery || filterType !== "all"
                ? "No employee records match your search or filter."
                : "No employees added to this pharmacy outlet yet."}
            </p>
            <button
              onClick={() => {
                setFormError("");
                setIsAddModalOpen(true);
              }}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-[#5E2B9D] hover:bg-[#4D2382] text-white text-xs font-medium transition-colors shadow-xs cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Add First Employee</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-3">Contact</th>
                  <th className="py-3 px-3">City & Full Address</th>
                  <th className="py-3 px-3">Salary Type</th>
                  <th className="py-3 px-3">Rate / Income</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {filteredEmployees.map((emp) => {
                  const initials = emp.name
                    .split(" ")
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase();

                  return (
                    <tr key={emp.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Name & Initials */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-purple-100 border border-purple-200 text-[#5E2B9D] flex items-center justify-center font-medium text-xs shrink-0">
                            {initials}
                          </div>
                          <div>
                            <div className="font-medium text-slate-900">{emp.name}</div>
                            <div className="text-[10px] text-slate-400">
                              Joined {emp.joinedDate}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="py-3 px-3">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 text-slate-800 font-medium">
                            <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{emp.phone}</span>
                          </div>
                          {emp.email ? (
                            <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                              <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="truncate max-w-[150px]">{emp.email}</span>
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">No email</span>
                          )}
                        </div>
                      </td>

                      {/* City & Address */}
                      <td className="py-3 px-3">
                        <div className="max-w-xs">
                          <div className="flex items-center gap-1 font-medium text-slate-800">
                            <MapPin className="w-3 h-3 text-[#5E2B9D] shrink-0" />
                            <span>{emp.city}</span>
                          </div>
                          <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5" title={emp.address}>
                            {emp.address}
                          </div>
                        </div>
                      </td>

                      {/* Salary Type */}
                      <td className="py-3 px-3">
                        {emp.salaryType === "monthly" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-purple-50 text-[#5E2B9D] border border-purple-200">
                            <Briefcase className="w-2.5 h-2.5" />
                            Monthly Salary
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                            <Wallet className="w-2.5 h-2.5" />
                            Daily Wages
                          </span>
                        )}
                      </td>

                      {/* Rate / Income */}
                      <td className="py-3 px-3">
                        <div className="font-medium text-slate-900 text-sm">
                          ₹{emp.salaryAmount.toLocaleString("en-IN")}
                          <span className="text-[10px] text-slate-400 font-normal ml-1">
                            {emp.salaryType === "monthly" ? "/ month" : "/ day"}
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => handleToggleStatus(emp.id)}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium cursor-pointer transition-colors ${
                            emp.status === "Active"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                              : "bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200"
                          }`}
                          title="Click to toggle status"
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              emp.status === "Active" ? "bg-emerald-500" : "bg-slate-400"
                            }`}
                          />
                          <span>{emp.status}</span>
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleDeleteEmployee(emp.id)}
                          className="p-1.5 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                          title="Delete employee"
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

      {/* Add Employee Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-md border border-slate-200 shadow-xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-md bg-purple-50 text-[#5E2B9D] flex items-center justify-center border border-purple-100">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-medium text-slate-900">Add New Employee</h2>
                  <p className="text-[11px] text-slate-500">
                    Register worker contact info, address, and salary details
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
            <form onSubmit={handleAddEmployee} className="p-5 space-y-4 overflow-y-auto">
              {formError && (
                <div className="p-2.5 rounded-md bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Employee Name */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Employee Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full px-3 py-2 border border-slate-200 rounded-md text-xs focus:outline-hidden focus:border-[#5E2B9D]"
                />
              </div>

              {/* Mobile Number & Email (Optional) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Email <span className="text-slate-400 text-[10px] font-normal">(Optional)</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. ramesh@gmail.com"
                    className="w-full px-3 py-2 border border-slate-200 rounded-md text-xs focus:outline-hidden focus:border-[#5E2B9D]"
                  />
                </div>
              </div>

              {/* City */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  City <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Hyderabad, Vijayawada, Bangalore"
                  className="w-full px-3 py-2 border border-slate-200 rounded-md text-xs focus:outline-hidden focus:border-[#5E2B9D]"
                />
              </div>

              {/* Full Address */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Full Address <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. Plot No 42, Near Metro Station, Ameerpet, Hyderabad - 500038"
                  className="w-full px-3 py-2 border border-slate-200 rounded-md text-xs focus:outline-hidden focus:border-[#5E2B9D] resize-none"
                />
              </div>

              {/* Salary Type: Monthly or Daily */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Compensation Type <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSalaryType("monthly");
                      setSalaryAmount("");
                    }}
                    className={`py-2 px-3 rounded-md text-xs font-medium border flex items-center justify-center gap-2 cursor-pointer transition-colors ${
                      salaryType === "monthly"
                        ? "bg-purple-50 text-[#5E2B9D] border-[#5E2B9D] shadow-xs"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <Briefcase className="w-3.5 h-3.5" />
                    <span>Monthly Salary</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSalaryType("daily");
                      setSalaryAmount("");
                    }}
                    className={`py-2 px-3 rounded-md text-xs font-medium border flex items-center justify-center gap-2 cursor-pointer transition-colors ${
                      salaryType === "daily"
                        ? "bg-amber-50 text-amber-700 border-amber-500 shadow-xs"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <Wallet className="w-3.5 h-3.5" />
                    <span>Daily Wages</span>
                  </button>
                </div>
              </div>

              {/* Salary / Wages Amount */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  {salaryType === "monthly" ? (
                    <>
                      Monthly Income (₹) <span className="text-red-500">*</span>
                    </>
                  ) : (
                    <>
                      Daily Wages (₹) <span className="text-red-500">*</span>
                    </>
                  )}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium text-xs">
                    ₹
                  </span>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    required
                    value={salaryAmount}
                    onChange={(e) => setSalaryAmount(e.target.value)}
                    placeholder={salaryType === "monthly" ? "e.g. 25000" : "e.g. 800"}
                    className="w-full pl-7 pr-3 py-2 border border-slate-200 rounded-md text-xs focus:outline-hidden focus:border-[#5E2B9D]"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  {salaryType === "monthly"
                    ? "Fixed monthly remuneration paid on billing cycles."
                    : "Payable per completed workday / attendance."}
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
                  Save Employee
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
