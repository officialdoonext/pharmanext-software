"use client";

import React, { useState, useEffect } from "react";
import {
  Plus,
  Filter,
  Download,
  Pill,
  AlertCircle,
  IndianRupee,
  Eye,
  Edit2,
  Trash2,
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  ArrowUpDown,
  Search,
  Layers,
  Sparkles,
  ShieldAlert,
  ShieldCheck,
  Building2,
  X,
  FileText,
  Calendar,
  Package,
  FileSpreadsheet,
  UploadCloud,
} from "lucide-react";
import AddMedicineModal from "./AddMedicineModal";
import BulkUploadModal from "./BulkUploadModal";
import CategoryManagerTab from "./CategoryManagerTab";
import MedicineTypeManagerTab from "./MedicineTypeManagerTab";
import {
  MedicineItem,
  MedicineCategory,
  MedicineTypeOption,
  defaultCategories,
  defaultMedicineTypes,
  initialMedicines,
  purgeDummyMedicines,
  purgeDummyCategories,
  purgeDummyTypes,
} from "@/lib/medicine-master";
import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, setDoc, deleteDoc, query, where } from "firebase/firestore";

export default function ProductsContent() {
  const { currentPharmacy } = useAuth();

  // Top Level Navigation Tab: "inventory" | "categories" | "types"
  const [mainTab, setMainTab] = useState<"inventory" | "categories" | "types">("inventory");
  const [isLoadingMedicines, setIsLoadingMedicines] = useState(true);

  // Master Data States (Purely dynamic, purged of all dummy items)
  const [medicines, setMedicines] = useState<MedicineItem[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("pharmacynext_medicines");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          return purgeDummyMedicines(parsed);
        } catch {
          // fallback
        }
      }
    }
    return [];
  });

  const [categories, setCategories] = useState<MedicineCategory[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("pharmacynext_categories");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          return purgeDummyCategories(parsed);
        } catch {
          // fallback
        }
      }
    }
    return [];
  });

  const [medicineTypes, setMedicineTypes] = useState<MedicineTypeOption[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("pharmacynext_types");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          return purgeDummyTypes(parsed);
        } catch {
          // fallback
        }
      }
    }
    return [];
  });

  // Table Filter & View States
  const [activeTab, setActiveTab] = useState<"all" | "active" | "inactive">("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");
  const [filterType, setFilterType] = useState("All");
  const [filterRx, setFilterRx] = useState<"All" | "Rx" | "OTC">("All");

  // View Medicine Detail Modal State
  const [viewingMedicine, setViewingMedicine] = useState<MedicineItem | null>(null);

  // Fetch real dynamic medicines, categories, and types from Firestore on mount
  useEffect(() => {
    let isMounted = true;
    async function fetchDynamicMasterData() {
      setIsLoadingMedicines(true);
      try {
        let medQuery;
        if (currentPharmacy?.id) {
          medQuery = query(
            collection(db, "medicines"),
            where("pharmacyId", "==", currentPharmacy.id)
          );
        } else {
          medQuery = collection(db, "medicines");
        }

        const snapshot = await getDocs(medQuery);
        if (isMounted && !snapshot.empty) {
          const firestoreMeds: MedicineItem[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data() as MedicineItem;
            firestoreMeds.push(data);
          });
          const cleanList = purgeDummyMedicines(firestoreMeds);
          setMedicines(cleanList);
          localStorage.setItem("pharmacynext_medicines", JSON.stringify(cleanList));
        } else if (isMounted) {
          const saved = localStorage.getItem("pharmacynext_medicines");
          if (saved) {
            try {
              const clean = purgeDummyMedicines(JSON.parse(saved));
              setMedicines(clean);
              localStorage.setItem("pharmacynext_medicines", JSON.stringify(clean));
            } catch {
              setMedicines([]);
            }
          } else {
            setMedicines([]);
          }
        }

        // Fetch dynamic categories
        try {
          const catSnap = await getDocs(collection(db, "categories"));
          if (isMounted && !catSnap.empty) {
            const catList: MedicineCategory[] = [];
            catSnap.forEach((docSnap) => {
              catList.push(docSnap.data() as MedicineCategory);
            });
            const cleanCats = purgeDummyCategories(catList);
            setCategories(cleanCats);
            localStorage.setItem("pharmacynext_categories", JSON.stringify(cleanCats));
          }
        } catch (catErr) {
          // fallback
        }

        // Fetch dynamic medicine types
        try {
          const typeSnap = await getDocs(collection(db, "medicine_types"));
          if (isMounted && !typeSnap.empty) {
            const typeList: MedicineTypeOption[] = [];
            typeSnap.forEach((docSnap) => {
              typeList.push(docSnap.data() as MedicineTypeOption);
            });
            const cleanTypes = purgeDummyTypes(typeList);
            setMedicineTypes(cleanTypes);
            localStorage.setItem("pharmacynext_types", JSON.stringify(cleanTypes));
          }
        } catch (typeErr) {
          // fallback
        }
      } catch (err) {
        if (isMounted) {
          const saved = localStorage.getItem("pharmacynext_medicines");
          if (saved) {
            try {
              const clean = purgeDummyMedicines(JSON.parse(saved));
              setMedicines(clean);
            } catch {
              setMedicines([]);
            }
          } else {
            setMedicines([]);
          }
        }
      } finally {
        if (isMounted) {
          setIsLoadingMedicines(false);
        }
      }
    }

    fetchDynamicMasterData();
    return () => {
      isMounted = false;
    };
  }, [currentPharmacy?.id]);

  // Master Handlers for Categories (Dynamic Firestore & LocalStorage)
  const handleAddCategory = async (newCat: MedicineCategory) => {
    const updated = [newCat, ...categories];
    setCategories(updated);
    try {
      localStorage.setItem("pharmacynext_categories", JSON.stringify(updated));
      await setDoc(doc(db, "categories", newCat.id), newCat);
    } catch (err) {
      console.warn("Category saved locally, Firestore note:", err);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (confirm("Are you sure you want to delete this category?")) {
      const updated = categories.filter((c) => c.id !== id);
      setCategories(updated);
      try {
        localStorage.setItem("pharmacynext_categories", JSON.stringify(updated));
        await deleteDoc(doc(db, "categories", id));
      } catch (err) {
        console.warn("Category deleted locally, Firestore note:", err);
      }
    }
  };

  const handleAddSubCategory = async (categoryId: string, subCategoryName: string) => {
    const updated = categories.map((c) =>
      c.id === categoryId && !c.subCategories.includes(subCategoryName)
        ? { ...c, subCategories: [...c.subCategories, subCategoryName] }
        : c
    );
    setCategories(updated);
    try {
      localStorage.setItem("pharmacynext_categories", JSON.stringify(updated));
      const targetCat = updated.find((c) => c.id === categoryId);
      if (targetCat) {
        await setDoc(doc(db, "categories", categoryId), targetCat);
      }
    } catch (err) {
      console.warn("Subcategory saved locally, Firestore note:", err);
    }
  };

  const handleDeleteSubCategory = async (categoryId: string, subCategoryName: string) => {
    const updated = categories.map((c) =>
      c.id === categoryId
        ? { ...c, subCategories: c.subCategories.filter((s) => s !== subCategoryName) }
        : c
    );
    setCategories(updated);
    try {
      localStorage.setItem("pharmacynext_categories", JSON.stringify(updated));
      const targetCat = updated.find((c) => c.id === categoryId);
      if (targetCat) {
        await setDoc(doc(db, "categories", categoryId), targetCat);
      }
    } catch (err) {
      console.warn("Subcategory removed locally, Firestore note:", err);
    }
  };

  // Master Handlers for Medicine Types (Dynamic Firestore & LocalStorage)
  const handleAddType = async (newType: MedicineTypeOption) => {
    const updated = [newType, ...medicineTypes];
    setMedicineTypes(updated);
    try {
      localStorage.setItem("pharmacynext_types", JSON.stringify(updated));
      await setDoc(doc(db, "medicine_types", newType.id), newType);
    } catch (err) {
      console.warn("Type saved locally, Firestore note:", err);
    }
  };

  const handleDeleteType = async (id: string) => {
    if (confirm("Are you sure you want to remove this medicine type?")) {
      const updated = medicineTypes.filter((t) => t.id !== id);
      setMedicineTypes(updated);
      try {
        localStorage.setItem("pharmacynext_types", JSON.stringify(updated));
        await deleteDoc(doc(db, "medicine_types", id));
      } catch (err) {
        console.warn("Type deleted locally, Firestore note:", err);
      }
    }
  };

  // Quick Add helpers called from inside Add Medicine modal
  const handleQuickAddCategory = async (name: string) => {
    const newCat: MedicineCategory = {
      id: "cat-" + Date.now(),
      name,
      description: "User created therapeutic category",
      subCategories: ["General"],
      badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
    };
    await handleAddCategory(newCat);
  };

  const handleQuickAddType = async (name: string, defaultUnit: string = "Strip") => {
    const newType: MedicineTypeOption = {
      id: "type-" + Date.now(),
      name,
      defaultUnit,
      description: "User created medicine dosage form",
      iconTag: "💊",
    };
    await handleAddType(newType);
  };

  // Medicine Inventory Handlers (Real Dynamic Data with Firestore & LocalStorage)
  const handleAddMedicine = async (newMed: MedicineItem) => {
    const medicineWithStore: MedicineItem & { pharmacyId?: string } = {
      ...newMed,
      pharmacyId: currentPharmacy?.id || undefined,
    };

    setMedicines((prev) => [medicineWithStore, ...prev]);
    try {
      const updated = [medicineWithStore, ...medicines];
      localStorage.setItem("pharmacynext_medicines", JSON.stringify(updated));
      await setDoc(doc(db, "medicines", newMed.id), medicineWithStore);
    } catch (err) {
      console.warn("Saved locally, Firestore sync note:", err);
    }
  };

  // Bulk Import Handler (Processes medicines, creates new categories and types automatically)
  const handleBulkImport = async ({
    medicines: newMeds,
    newCategories: newCats,
    newTypes: newTypes,
  }: {
    medicines: MedicineItem[];
    newCategories: MedicineCategory[];
    newTypes: MedicineTypeOption[];
  }) => {
    // 1. Sync any newly created categories
    if (newCats.length > 0) {
      setCategories((prev) => {
        const merged = [...newCats, ...prev];
        try {
          localStorage.setItem("pharmacynext_categories", JSON.stringify(merged));
        } catch {}
        return merged;
      });
      for (const cat of newCats) {
        try {
          await setDoc(doc(db, "categories", cat.id), cat);
        } catch (e) {
          console.warn("Category sync error:", e);
        }
      }
    }

    // 2. Sync any newly created medicine types
    if (newTypes.length > 0) {
      setMedicineTypes((prev) => {
        const merged = [...newTypes, ...prev];
        try {
          localStorage.setItem("pharmacynext_types", JSON.stringify(merged));
        } catch {}
        return merged;
      });
      for (const t of newTypes) {
        try {
          await setDoc(doc(db, "medicine_types", t.id), t);
        } catch (e) {
          console.warn("Type sync error:", e);
        }
      }
    }

    // 3. Sync all imported medicines with store ID
    if (newMeds.length > 0) {
      const medsWithStore: MedicineItem[] = newMeds.map((m) => ({
        ...m,
        pharmacyId: currentPharmacy?.id || undefined,
      }));

      setMedicines((prev) => {
        const merged = [...medsWithStore, ...prev];
        try {
          localStorage.setItem("pharmacynext_medicines", JSON.stringify(merged));
        } catch {}
        return merged;
      });

      // Save medicines in background
      (async () => {
        for (const m of medsWithStore) {
          try {
            await setDoc(doc(db, "medicines", m.id), m);
          } catch (e) {
            console.warn("Medicine sync error:", e);
          }
        }
      })();
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this medicine record?")) {
      const updated = medicines.filter((p) => p.id !== id);
      setMedicines(updated);
      setSelectedIds((prev) => prev.filter((item) => item !== id));

      try {
        localStorage.setItem("pharmacynext_medicines", JSON.stringify(updated));
        await deleteDoc(doc(db, "medicines", id));
      } catch (err) {
        console.warn("Deleted locally, Firestore sync note:", err);
      }
    }
  };

  // Filtered list based on Search, Tabs, Category, Type, and Rx
  const filteredProducts = medicines.filter((p) => {
    if (activeTab === "active" && p.status !== "Active") return false;
    if (activeTab === "inactive" && p.status === "Active") return false;
    if (filterCategory !== "All" && p.category !== filterCategory) return false;
    if (filterType !== "All" && p.medicineType !== filterType) return false;
    if (filterRx === "Rx" && !p.prescriptionRequired) return false;
    if (filterRx === "OTC" && p.prescriptionRequired) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = p.name.toLowerCase().includes(q);
      const matchGeneric = p.genericName?.toLowerCase().includes(q);
      const matchBrand = p.brandName?.toLowerCase().includes(q);
      const matchManufacturer = p.manufacturer?.toLowerCase().includes(q);
      const matchSku = p.sku.toLowerCase().includes(q);
      return matchName || matchGeneric || matchBrand || matchManufacturer || matchSku;
    }
    return true;
  });

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredProducts.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredProducts.map((p) => p.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Inventory Summary Metrics (Dynamic Sheets & Loose calculations)
  const totalSheetsCount = medicines.reduce(
    (acc, m) => acc + (m.sheetsStock || 0),
    0
  );
  const totalLooseCount = medicines.reduce(
    (acc, m) => acc + (m.looseStock || 0),
    0
  );
  const totalUnitsCount = medicines.reduce(
    (acc, m) => acc + (m.totalUnitsStock ?? (parseFloat(m.stock) || 0)),
    0
  );
  const lowStockCount = medicines.filter((m) => m.status === "Low Stock").length;
  const outOfStockCount = medicines.filter((m) => m.status === "Out of Stock").length;
  const totalValuation = medicines.reduce((acc, m) => {
    const sPrice = parseFloat(m.sheetPrice || "0");
    const uPrice = parseFloat(m.unitPrice || "0");
    const sStock = m.sheetsStock || 0;
    const lStock = m.looseStock || 0;
    if (sPrice > 0 || uPrice > 0) {
      return acc + (sStock * sPrice) + (lStock * uPrice);
    }
    const qty = parseFloat(m.stock) || 0;
    const price = parseFloat(m.sellingPrice.replace(/[^\d.]/g, "")) || 0;
    return acc + qty * price;
  }, 0);

  return (
    <div className="space-y-6">
      {/* Top Header Row: Title and Main Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Medicines & Pharmacy Catalog
            </h1>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-100 text-[#581c87] border border-purple-200">
              {medicines.length} Medicines
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage pharmaceutical formulas, salt names, clinical classes, and stock inventory
          </p>
        </div>

        {/* Global Action buttons */}
        <div className="flex items-center gap-3">
          {mainTab === "inventory" && (
            <>
              {/* Filter Drawer Toggle */}
              <button
                onClick={() => setShowFilterDrawer(!showFilterDrawer)}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                  showFilterDrawer
                    ? "bg-purple-50 text-[#581c87] border-purple-200"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                }`}
              >
                <Filter className="w-3.5 h-3.5" />
                <span>Filters</span>
                {(filterCategory !== "All" || filterType !== "All" || filterRx !== "All") && (
                  <span className="w-2 h-2 rounded-full bg-[#581c87]"></span>
                )}
              </button>

              {/* Export CSV */}
              <button
                onClick={() => alert(`Exporting ${filteredProducts.length} medicines to CSV...`)}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export</span>
              </button>
            </>
          )}

          {/* Bulk Upload Button */}
          <button
            type="button"
            onClick={() => setIsBulkUploadOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold bg-white text-slate-800 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 shadow-xs transition-all cursor-pointer"
            title="Bulk Upload Medicines via Excel or CSV"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Bulk Upload</span>
          </button>

          {/* + Add Medicine Button (Triggers Fullscreen Modal) */}
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-[#581c87] hover:bg-[#431c8c] text-white shadow-md shadow-purple-900/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Medicine</span>
          </button>
        </div>
      </div>

      {/* Main Tab Navigation Bar on the Page */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-1.5 shadow-xs flex flex-wrap items-center gap-1.5">
        <button
          onClick={() => setMainTab("inventory")}
          className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            mainTab === "inventory"
              ? "bg-[#581c87] text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          }`}
        >
          <Pill className="w-4 h-4" />
          <span>Medicines Inventory</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
              mainTab === "inventory"
                ? "bg-white/20 text-white"
                : "bg-slate-100 text-slate-700"
            }`}
          >
            {medicines.length}
          </span>
        </button>

        <button
          onClick={() => setMainTab("categories")}
          className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            mainTab === "categories"
              ? "bg-[#581c87] text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Categories & Sub-Categories</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
              mainTab === "categories"
                ? "bg-white/20 text-white"
                : "bg-slate-100 text-slate-700"
            }`}
          >
            {categories.length}
          </span>
        </button>

        <button
          onClick={() => setMainTab("types")}
          className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            mainTab === "types"
              ? "bg-[#581c87] text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Medicine Types</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
              mainTab === "types"
                ? "bg-white/20 text-white"
                : "bg-slate-100 text-slate-700"
            }`}
          >
            {medicineTypes.length}
          </span>
        </button>
      </div>

      {/* Tab 2: Categories & Sub-Categories Manager */}
      {mainTab === "categories" && (
        <CategoryManagerTab
          categories={categories}
          medicines={medicines}
          onAddCategory={handleAddCategory}
          onDeleteCategory={handleDeleteCategory}
          onAddSubCategory={handleAddSubCategory}
          onDeleteSubCategory={handleDeleteSubCategory}
        />
      )}

      {/* Tab 3: Medicine Types Manager */}
      {mainTab === "types" && (
        <MedicineTypeManagerTab
          medicineTypes={medicineTypes}
          medicines={medicines}
          onAddType={handleAddType}
          onDeleteType={handleDeleteType}
        />
      )}

      {/* Tab 1: Medicines Inventory Table View */}
      {mainTab === "inventory" && (
        <div className="space-y-6 animate-in fade-in">
          
          {/* 4 Metric Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Total Medicines */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
                <Pill className="w-6 h-6 stroke-[2.2]" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">Total Medicines</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-0.5">
                  {medicines.length}
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {totalSheetsCount} Sheets + {totalLooseCount} Loose ({totalUnitsCount} Units)
                </p>
              </div>
            </div>

            {/* Low Stock Alert */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
                <AlertCircle className="w-6 h-6 stroke-[2.2]" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">Low Stock Alert</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-0.5">
                  {lowStockCount}
                </h3>
                <p className="text-[11px] text-amber-600 font-medium mt-0.5">
                  Items below 15 units
                </p>
              </div>
            </div>

            {/* Out of Stock */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100">
                <AlertCircle className="w-6 h-6 stroke-[2.2]" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">Out of Stock</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-0.5">
                  {outOfStockCount}
                </h3>
                <p className="text-[11px] text-rose-500 font-medium mt-0.5">
                  Reorder needed immediately
                </p>
              </div>
            </div>

            {/* Stock Valuation */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-100">
                <IndianRupee className="w-6 h-6 stroke-[2.2]" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">Catalog Valuation</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-0.5">
                  ₹ {totalValuation.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Retail inventory value</p>
              </div>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs space-y-3">
            <div className="flex flex-col md:flex-row items-center gap-3">
              {/* Search input */}
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by Medicine Name, Salt / Generic, Brand, Manufacturer, or SKU..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-[#581c87] text-xs text-slate-800"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Rx / OTC Filter Pills */}
              <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl shrink-0 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setFilterRx("All")}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    filterRx === "All" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  All Types
                </button>
                <button
                  type="button"
                  onClick={() => setFilterRx("Rx")}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    filterRx === "Rx" ? "bg-rose-500 text-white shadow-xs" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Rx Only
                </button>
                <button
                  type="button"
                  onClick={() => setFilterRx("OTC")}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    filterRx === "OTC" ? "bg-emerald-600 text-white shadow-xs" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  OTC
                </button>
              </div>
            </div>

            {/* Expandable Advanced Filter Drawer */}
            {showFilterDrawer && (
              <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs animate-in fade-in">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Filter by Category:
                  </label>
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-[#581c87] bg-white text-slate-800"
                  >
                    <option value="All">All Categories ({categories.length})</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Filter by Medicine Dosage Type:
                  </label>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-[#581c87] bg-white text-slate-800"
                  >
                    <option value="All">All Types ({medicineTypes.length})</option>
                    {medicineTypes.map((t) => (
                      <option key={t.id} value={t.name}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Main Table Container */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            {/* Table Tabs & Controls Header */}
            <div className="px-6 pt-4 pb-2 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              {/* Tabs */}
              <div className="flex items-center gap-6">
                <button
                  onClick={() => setActiveTab("all")}
                  className={`text-xs font-semibold pb-3 border-b-2 transition-colors relative ${
                    activeTab === "all"
                      ? "border-[#581c87] text-[#581c87]"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  All Medicines ({medicines.length})
                </button>
                <button
                  onClick={() => setActiveTab("active")}
                  className={`text-xs font-semibold pb-3 border-b-2 transition-colors relative ${
                    activeTab === "active"
                      ? "border-[#581c87] text-[#581c87]"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  In Stock Active ({medicines.filter((m) => m.status === "Active").length})
                </button>
                <button
                  onClick={() => setActiveTab("inactive")}
                  className={`text-xs font-semibold pb-3 border-b-2 transition-colors relative ${
                    activeTab === "inactive"
                      ? "border-[#581c87] text-[#581c87]"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Low / Out of Stock ({lowStockCount + outOfStockCount})
                </button>
              </div>

              {/* Right Summary info */}
              <div className="flex items-center gap-3 text-xs text-slate-500 pb-2 sm:pb-0">
                <span>Showing {filteredProducts.length} of {medicines.length} medicines</span>
              </div>
            </div>

            {/* Data Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-[#fbfcfd] text-slate-700 font-semibold select-none">
                    <th className="py-3 px-4 w-10">
                      <input
                        type="checkbox"
                        checked={
                          selectedIds.length === filteredProducts.length &&
                          filteredProducts.length > 0
                        }
                        onChange={toggleSelectAll}
                        className="w-4 h-4 rounded border-slate-300 text-[#581c87] focus:ring-[#581c87]"
                      />
                    </th>
                    <th className="py-3 px-3">
                      <div className="flex items-center gap-1.5">
                        <span>Medicine & Salt Formulation</span>
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      </div>
                    </th>
                    <th className="py-3 px-3">Type</th>
                    <th className="py-3 px-3">Category / Sub-Category</th>
                    <th className="py-3 px-3">Brand & Manufacturer</th>
                    <th className="py-3 px-3 text-center">Rx / OTC</th>
                    <th className="py-3 px-3">Packing Count</th>
                    <th className="py-3 px-3">Price (Sheet / Per Med)</th>
                    <th className="py-3 px-3">Stock (Sheets & Loose)</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredProducts.map((prod) => {
                    const isSelected = selectedIds.includes(prod.id);
                    const isOutOfStock = prod.status === "Out of Stock";
                    const isLowStock = prod.status === "Low Stock";

                    return (
                      <tr
                        key={prod.id}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          isSelected ? "bg-purple-50/40" : ""
                        }`}
                      >
                        {/* Checkbox */}
                        <td className="py-3.5 px-4">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectOne(prod.id)}
                            className="w-4 h-4 rounded border-slate-300 text-[#581c87] focus:ring-[#581c87]"
                          />
                        </td>

                        {/* Medicine Name + Generic / Salt formulation */}
                        <td className="py-3.5 px-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-lg shrink-0 overflow-hidden shadow-xs">
                              {prod.imageUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={prod.imageUrl}
                                  alt={prod.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                prod.imageEmoji || "💊"
                              )}
                            </div>
                            <div className="flex flex-col">
                              <span
                                onClick={() => setViewingMedicine(prod)}
                                className="font-bold text-slate-900 hover:text-[#581c87] cursor-pointer"
                              >
                                {prod.name}
                              </span>
                              <span className="text-[11px] text-slate-500 line-clamp-1">
                                {prod.genericName}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                SKU: {prod.sku}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Type */}
                        <td className="py-3.5 px-3">
                          <span className="inline-block px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                            {prod.medicineType}
                          </span>
                        </td>

                        {/* Category & Sub-Category */}
                        <td className="py-3.5 px-3">
                          <div className="flex flex-col">
                            <span className="font-semibold text-slate-800">
                              {prod.category}
                            </span>
                            <span className="text-[11px] text-slate-500">
                              {prod.subCategory}
                            </span>
                          </div>
                        </td>

                        {/* Brand & Manufacturer */}
                        <td className="py-3.5 px-3">
                          <div className="flex flex-col">
                            <span className="font-semibold text-slate-800">
                              {prod.brandName}
                            </span>
                            <span className="text-[11px] text-slate-500 flex items-center gap-1">
                              <Building2 className="w-3 h-3 text-slate-400" />
                              {prod.manufacturer}
                            </span>
                          </div>
                        </td>

                        {/* Prescription Required? — Yes/No */}
                        <td className="py-3.5 px-3 text-center">
                          {prod.prescriptionRequired ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-600 border border-rose-200">
                              <ShieldAlert className="w-3 h-3" /> Rx
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200">
                              <ShieldCheck className="w-3 h-3" /> OTC
                            </span>
                          )}
                        </td>

                        {/* Packing Count */}
                        <td className="py-3.5 px-3">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-800 text-xs">
                              {prod.unitsPerSheet ? `${prod.unitsPerSheet} per sheet` : prod.unit}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {prod.packagingUnitName || "Sheet / Strip"}
                            </span>
                          </div>
                        </td>

                        {/* Selling Price (Sheet Price & Per Medicine Price) */}
                        <td className="py-3.5 px-3">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-900 text-xs">
                              ₹ {prod.sheetPrice ? parseFloat(prod.sheetPrice).toFixed(2) : "0.00"}{" "}
                              <span className="text-[10px] text-slate-500 font-normal">/ sheet</span>
                            </span>
                            <span className="text-[11px] font-semibold text-purple-700">
                              ₹ {prod.unitPrice ? parseFloat(prod.unitPrice).toFixed(2) : "0.00"}{" "}
                              <span className="text-[10px] text-purple-400 font-normal">/ pc</span>
                            </span>
                          </div>
                        </td>

                        {/* Stock (Sheets & Loose Units) & Status Pill */}
                        <td className="py-3.5 px-3">
                          <div className="flex flex-col gap-0.5">
                            <span
                              className={`font-extrabold text-xs ${
                                isOutOfStock
                                  ? "text-rose-600"
                                  : isLowStock
                                  ? "text-amber-600"
                                  : "text-emerald-700"
                              }`}
                            >
                              {prod.sheetsStock !== undefined && prod.looseStock !== undefined
                                ? `${prod.sheetsStock} Sheets + ${prod.looseStock} Loose`
                                : `${prod.stock} units`}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium">
                              Total: {prod.totalUnitsStock ?? prod.stock} units
                            </span>
                            {isOutOfStock ? (
                              <span className="inline-block w-max px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-600 border border-rose-200 mt-0.5">
                                Out of Stock
                              </span>
                            ) : isLowStock ? (
                              <span className="inline-block w-max px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-600 border border-amber-200 mt-0.5">
                                Low Stock
                              </span>
                            ) : (
                              <span className="inline-block w-max px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200 mt-0.5">
                                Active
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Action buttons */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              aria-label="View product details"
                              onClick={() => setViewingMedicine(prod)}
                              className="w-7 h-7 rounded-lg text-purple-600 hover:bg-purple-50 flex items-center justify-center transition-colors"
                              title="View full medicine profile"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              aria-label="Edit medicine"
                              onClick={() => {
                                alert(`Edit medicine ${prod.name}`);
                              }}
                              className="w-7 h-7 rounded-lg text-blue-500 hover:bg-blue-50 flex items-center justify-center transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              aria-label="Delete medicine"
                              onClick={() => handleDelete(prod.id)}
                              className="w-7 h-7 rounded-lg text-rose-500 hover:bg-rose-50 flex items-center justify-center transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredProducts.length === 0 && (
                    <tr>
                      <td colSpan={10} className="py-16 text-center text-slate-500">
                        <div className="max-w-md mx-auto space-y-3">
                          <div className="w-14 h-14 rounded-2xl bg-purple-50 text-[#581c87] border border-purple-100 flex items-center justify-center mx-auto shadow-xs">
                            <Pill className="w-7 h-7" />
                          </div>
                          <h4 className="text-base font-bold text-slate-800">
                            {isLoadingMedicines
                              ? "Loading real medicine catalog..."
                              : searchQuery || filterCategory !== "All" || filterType !== "All" || filterRx !== "All"
                              ? "No matching medicines found"
                              : "No medicines registered yet"}
                          </h4>
                          <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                            {isLoadingMedicines
                              ? "Retrieving dynamic inventory records..."
                              : searchQuery || filterCategory !== "All" || filterType !== "All" || filterRx !== "All"
                              ? "Try adjusting your search query or filter options."
                              : "Your medicine catalog is clean and empty. Click below to add your first real pharmaceutical product."}
                          </p>
                          {!isLoadingMedicines && !searchQuery && filterCategory === "All" && filterType === "All" && filterRx === "All" && (
                            <div className="pt-2 flex items-center justify-center gap-3 flex-wrap">
                              <button
                                onClick={() => setIsAddModalOpen(true)}
                                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-[#581c87] hover:bg-[#431c8c] text-white shadow-sm transition-all cursor-pointer"
                              >
                                <Plus className="w-4 h-4" />
                                <span>Add First Medicine</span>
                              </button>
                              <button
                                onClick={() => setIsBulkUploadOpen(true)}
                                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 shadow-xs transition-all cursor-pointer"
                              >
                                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                                <span>Bulk Upload Excel</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 select-none">
              <span className="text-xs text-slate-500">
                Showing 1 to {filteredProducts.length} of {medicines.length} medicines
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage(1)}
                  aria-label="First page"
                  className="w-7 h-7 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-50 flex items-center justify-center text-xs transition-colors"
                >
                  <ChevronsLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  aria-label="Previous page"
                  className="w-7 h-7 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-50 flex items-center justify-center text-xs transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  className="w-7 h-7 rounded-lg text-xs font-semibold flex items-center justify-center bg-[#581c87] text-white shadow-xs"
                >
                  1
                </button>
                <button
                  onClick={() => setCurrentPage((p) => p + 1)}
                  aria-label="Next page"
                  className="w-7 h-7 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-50 flex items-center justify-center text-xs transition-colors"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setCurrentPage(1)}
                  aria-label="Last page"
                  className="w-7 h-7 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-50 flex items-center justify-center text-xs transition-colors"
                >
                  <ChevronsRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* Fullscreen Add Medicine Modal */}
      <AddMedicineModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddMedicine}
        categories={categories}
        medicineTypes={medicineTypes}
        onQuickAddCategory={handleQuickAddCategory}
        onQuickAddType={handleQuickAddType}
      />

      {/* Bulk Upload Modal (Excel / CSV with 200 Sample file download & auto-creation) */}
      <BulkUploadModal
        isOpen={isBulkUploadOpen}
        onClose={() => setIsBulkUploadOpen(false)}
        existingCategories={categories}
        existingTypes={medicineTypes}
        onBulkImport={handleBulkImport}
      />

      {/* Detailed Medicine View Modal */}
      {viewingMedicine && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 relative space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center text-2xl overflow-hidden shrink-0">
                  {viewingMedicine.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={viewingMedicine.imageUrl}
                      alt={viewingMedicine.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    viewingMedicine.imageEmoji || "💊"
                  )}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {viewingMedicine.name}
                  </h3>
                  <p className="text-xs text-purple-700 font-medium">
                    {viewingMedicine.genericName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewingMedicine(null)}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Medicine Profile Details Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-slate-400 block text-[10px]">Brand / Manufacturer</span>
                <span className="font-bold text-slate-800">{viewingMedicine.brandName}</span>
                <span className="text-[11px] text-slate-500 block">{viewingMedicine.manufacturer}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-slate-400 block text-[10px]">Type & Packaging</span>
                <span className="font-bold text-slate-800">{viewingMedicine.medicineType}</span>
                <span className="text-[11px] text-slate-500 block">{viewingMedicine.unit}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-slate-400 block text-[10px]">Category & Sub-Category</span>
                <span className="font-bold text-slate-800">{viewingMedicine.category}</span>
                <span className="text-[11px] text-slate-500 block">{viewingMedicine.subCategory}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-slate-400 block text-[10px]">Prescription Status</span>
                {viewingMedicine.prescriptionRequired ? (
                  <span className="font-bold text-rose-600 flex items-center gap-1 mt-0.5">
                    <ShieldAlert className="w-3.5 h-3.5" /> Rx Required
                  </span>
                ) : (
                  <span className="font-bold text-emerald-600 flex items-center gap-1 mt-0.5">
                    <ShieldCheck className="w-3.5 h-3.5" /> OTC (Over The Counter)
                  </span>
                )}
              </div>
            </div>

            {/* Packaging, Pricing & Stock Details */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-purple-50/80 border border-purple-100 text-xs">
                <span className="text-purple-900 font-medium">Packaging Unit:</span>
                <span className="font-bold text-purple-950 bg-white px-2.5 py-0.5 rounded-lg border border-purple-200">
                  {viewingMedicine.unitsPerSheet || 1} units per sheet / strip
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-500 text-[11px] font-medium block">Sheet MRP Price</span>
                  <span className="font-bold text-slate-900 text-sm">
                    ₹{parseFloat(viewingMedicine.sheetPrice || viewingMedicine.sellingPrice?.replace(/[^0-9.]/g, '') || "0").toFixed(2)}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">per full sheet</span>
                </div>
                <div className="p-3 bg-purple-50/60 rounded-xl border border-purple-100">
                  <span className="text-purple-700 text-[11px] font-medium block">Per Medicine Price</span>
                  <span className="font-bold text-purple-900 text-sm">
                    ₹{(
                      parseFloat(viewingMedicine.unitPrice || "0") ||
                      (parseFloat(viewingMedicine.sheetPrice || viewingMedicine.sellingPrice?.replace(/[^0-9.]/g, '') || "0") / (viewingMedicine.unitsPerSheet || 1))
                    ).toFixed(2)}
                  </span>
                  <span className="text-[10px] text-purple-500 block mt-0.5">per single unit / tablet</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5 text-xs">
                <div className="p-2.5 bg-emerald-50/60 rounded-xl border border-emerald-100 text-center">
                  <span className="text-emerald-700 text-[11px] font-medium block">Full Sheets</span>
                  <span className="font-bold text-emerald-900 text-sm">
                    {viewingMedicine.sheetsStock ?? Math.floor(parseInt(String(viewingMedicine.stock || 0), 10) / (viewingMedicine.unitsPerSheet || 1))}
                  </span>
                  <span className="text-[10px] text-emerald-600 block">sheets</span>
                </div>
                <div className="p-2.5 bg-amber-50/60 rounded-xl border border-amber-100 text-center">
                  <span className="text-amber-700 text-[11px] font-medium block">Loose Units</span>
                  <span className="font-bold text-amber-900 text-sm">
                    {viewingMedicine.looseStock ?? (parseInt(String(viewingMedicine.stock || 0), 10) % (viewingMedicine.unitsPerSheet || 1))}
                  </span>
                  <span className="text-[10px] text-amber-600 block">loose</span>
                </div>
                <div className="p-2.5 bg-slate-900 text-white rounded-xl text-center shadow-sm">
                  <span className="text-slate-300 text-[11px] font-medium block">Total Units</span>
                  <span className="font-bold text-white text-sm">
                    {viewingMedicine.totalUnitsStock ?? viewingMedicine.stock ?? 0}
                  </span>
                  <span className="text-[10px] text-slate-400 block">total pcs</span>
                </div>
              </div>
            </div>

            {/* Batch & Expiry */}
            {(viewingMedicine.batchNumber || viewingMedicine.expiryDate) && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600">
                <span>Batch: <strong className="text-slate-900">{viewingMedicine.batchNumber || "N/A"}</strong></span>
                <span>Expiry: <strong className="text-slate-900">{viewingMedicine.expiryDate || "N/A"}</strong></span>
              </div>
            )}

            {/* Description */}
            {viewingMedicine.description && (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
                <span className="font-bold text-slate-700 block mb-1">Clinical Indications:</span>
                <p className="text-slate-600 leading-relaxed">{viewingMedicine.description}</p>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setViewingMedicine(null)}
                className="px-5 py-2 rounded-xl bg-slate-900 text-white font-semibold text-xs hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
