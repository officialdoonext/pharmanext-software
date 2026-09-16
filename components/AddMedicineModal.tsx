"use client";

import React, { useState, useRef } from "react";
import {
  X,
  Plus,
  Pill,
  Upload,
  AlertTriangle,
  FileText,
  DollarSign,
  Layers,
  Building2,
  Calendar,
  Sparkles,
  Maximize2,
  Minimize2,
  Trash2,
} from "lucide-react";
import {
  MedicineItem,
  MedicineCategory,
  MedicineTypeOption,
} from "@/lib/medicine-master";

interface AddMedicineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (medicine: MedicineItem) => void;
  categories: MedicineCategory[];
  medicineTypes: MedicineTypeOption[];
  onQuickAddCategory?: (name: string, subCategories?: string[]) => void;
  onQuickAddType?: (name: string, defaultUnit?: string) => void;
}

export default function AddMedicineModal({
  isOpen,
  onClose,
  onAdd,
  categories,
  medicineTypes,
  onQuickAddCategory,
  onQuickAddType,
}: AddMedicineModalProps) {
  // Form State (Purely dynamic, no static defaults)
  const [name, setName] = useState("");
  const [genericName, setGenericName] = useState("");
  const [brandName, setBrandName] = useState("");
  const [medicineType, setMedicineType] = useState(medicineTypes[0]?.name || "");
  const [category, setCategory] = useState(categories[0]?.name || "");
  const [subCategory, setSubCategory] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [prescriptionRequired, setPrescriptionRequired] = useState(false);
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imageEmoji, setImageEmoji] = useState("💊");

  // Inventory, Packaging & Pricing Details
  const [sku, setSku] = useState("MED-" + Math.floor(1000 + Math.random() * 9000));
  const [strength, setStrength] = useState("");
  const [batchNumber, setBatchNumber] = useState("BAT-" + Math.floor(1000 + Math.random() * 9000));
  const [expiryDate, setExpiryDate] = useState("");

  // Packaging Count per Sheet / Strip (e.g. 10, 15, 20)
  const [unitsPerSheet, setUnitsPerSheet] = useState("10");
  const [packagingName, setPackagingName] = useState("Sheet / Strip");

  // Dual Pricing: Sheet Price & Per Medicine Price
  const [sheetPrice, setSheetPrice] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [sheetCostPrice, setSheetCostPrice] = useState("");
  const [unitCostPrice, setUnitCostPrice] = useState("");

  // Dual Stock: No. of Sheets & Loose Units
  const [sheetsStock, setSheetsStock] = useState("");
  const [looseStock, setLooseStock] = useState("");

  // Inline Quick-Add states
  const [showQuickAddCat, setShowQuickAddCat] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [showQuickAddType, setShowQuickAddType] = useState(false);
  const [newTypeName, setNewTypeName] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Dynamic pricing calculation handlers
  const handleUnitsPerSheetChange = (newCountStr: string) => {
    setUnitsPerSheet(newCountStr);
    const count = Math.max(1, parseFloat(newCountStr) || 1);
    if (sheetPrice) {
      const sp = parseFloat(sheetPrice) || 0;
      setUnitPrice((sp / count).toFixed(2));
    } else if (unitPrice) {
      const up = parseFloat(unitPrice) || 0;
      setSheetPrice((up * count).toFixed(2));
    }
    if (sheetCostPrice) {
      const sc = parseFloat(sheetCostPrice) || 0;
      setUnitCostPrice((sc / count).toFixed(2));
    }
  };

  const handleSheetPriceChange = (val: string) => {
    setSheetPrice(val);
    const count = Math.max(1, parseFloat(unitsPerSheet) || 10);
    if (val && !isNaN(parseFloat(val))) {
      setUnitPrice((parseFloat(val) / count).toFixed(2));
    } else {
      setUnitPrice("");
    }
  };

  const handleUnitPriceChange = (val: string) => {
    setUnitPrice(val);
    const count = Math.max(1, parseFloat(unitsPerSheet) || 10);
    if (val && !isNaN(parseFloat(val))) {
      setSheetPrice((parseFloat(val) * count).toFixed(2));
    } else {
      setSheetPrice("");
    }
  };

  const handleSheetCostPriceChange = (val: string) => {
    setSheetCostPrice(val);
    const count = Math.max(1, parseFloat(unitsPerSheet) || 10);
    if (val && !isNaN(parseFloat(val))) {
      setUnitCostPrice((parseFloat(val) / count).toFixed(2));
    } else {
      setUnitCostPrice("");
    }
  };

  const handleUnitCostPriceChange = (val: string) => {
    setUnitCostPrice(val);
    const count = Math.max(1, parseFloat(unitsPerSheet) || 10);
    if (val && !isNaN(parseFloat(val))) {
      setSheetCostPrice((parseFloat(val) * count).toFixed(2));
    } else {
      setSheetCostPrice("");
    }
  };

  if (!isOpen) return null;

  // Selected Category Object to dynamically get its Subcategories
  const selectedCategoryObj = categories.find((c) => c.name === category);
  const availableSubCategories = selectedCategoryObj?.subCategories || [];

  // Computed total stock units
  const countPerSheet = Math.max(1, parseInt(unitsPerSheet) || 10);
  const numSheets = parseInt(sheetsStock) || 0;
  const numLoose = parseInt(looseStock) || 0;
  const totalUnits = numSheets * countPerSheet + numLoose;

  // Handle File Upload for Medicine Image
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleQuickAddCatSubmit = () => {
    if (!newCatName.trim()) return;
    if (onQuickAddCategory) {
      onQuickAddCategory(newCatName.trim());
    }
    setCategory(newCatName.trim());
    setNewCatName("");
    setShowQuickAddCat(false);
  };

  const handleQuickAddTypeSubmit = () => {
    if (!newTypeName.trim()) return;
    if (onQuickAddType) {
      onQuickAddType(newTypeName.trim(), "Unit");
    }
    setMedicineType(newTypeName.trim());
    setNewTypeName("");
    setShowQuickAddType(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert("Please enter a Medicine Name.");
      return;
    }
    if (!category.trim()) {
      alert("Please select or enter a Category.");
      return;
    }
    if (!sheetPrice && !unitPrice) {
      alert("Please enter a Sheet Price or Per Medicine Price.");
      return;
    }

    const formattedSheetPrice = sheetPrice
      ? parseFloat(sheetPrice).toFixed(2)
      : (parseFloat(unitPrice || "0") * countPerSheet).toFixed(2);
    const formattedUnitPrice = unitPrice
      ? parseFloat(unitPrice).toFixed(2)
      : (parseFloat(sheetPrice || "0") / countPerSheet).toFixed(2);

    const newMedicine: MedicineItem = {
      id: sku,
      name: name.trim(),
      genericName: genericName.trim() || "N/A",
      brandName: brandName.trim() || name.trim(),
      medicineType: medicineType || "Tablet",
      category: category.trim(),
      subCategory: subCategory.trim() || "General",
      manufacturer: manufacturer.trim() || "Generic / Third Party",
      prescriptionRequired,
      description: description.trim(),
      imageUrl: imageUrl || undefined,
      imageEmoji: imageEmoji || "💊",
      sku,
      unitsPerSheet: countPerSheet,
      packagingUnitName: packagingName || "Sheet",
      sheetPrice: formattedSheetPrice,
      unitPrice: formattedUnitPrice,
      sheetCostPrice: sheetCostPrice ? parseFloat(sheetCostPrice).toFixed(2) : undefined,
      unitCostPrice: unitCostPrice ? parseFloat(unitCostPrice).toFixed(2) : undefined,
      sellingPrice: `₹ ${formattedSheetPrice} / sheet (₹ ${formattedUnitPrice} / pc)`,
      costPrice: sheetCostPrice ? `₹ ${parseFloat(sheetCostPrice).toFixed(2)} / sheet` : "₹ 0.00",
      sheetsStock: numSheets,
      looseStock: numLoose,
      totalUnitsStock: totalUnits,
      stock: `${numSheets} Sheets + ${numLoose} Loose (${totalUnits} Units)`,
      unit: `${countPerSheet} per ${packagingName || "Sheet"}`,
      strength: strength.trim(),
      batchNumber: batchNumber.trim() || undefined,
      expiryDate: expiryDate.trim() || undefined,
      status: totalUnits <= 0 ? "Out of Stock" : totalUnits <= countPerSheet * 2 ? "Low Stock" : "Active",
      addedOn: new Date().toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
    };

    onAdd(newMedicine);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex flex-col justify-end sm:justify-center p-0 md:p-3 lg:p-4 animate-in fade-in duration-200">
      {/* Fullscreen Modal Container */}
      <div className="bg-white w-full h-full sm:max-h-[96vh] sm:rounded-3xl shadow-2xl border border-slate-200/80 flex flex-col overflow-hidden">
        {/* Sticky Modal Top Header */}
        <div className="px-6 py-4.5 bg-gradient-to-r from-slate-900 via-[#1e1b4b] to-[#3b0764] text-white flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-inner">
              <Pill className="w-6 h-6 text-emerald-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold tracking-tight text-white">
                  Add New Medicine
                </h2>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">
                  Full Pharmacy Master Form
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Enter salt formulation, brand credentials, packaging, and stock parameters
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
              title="Close modal (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6 bg-slate-50/50">
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Column (8 cols): Primary Clinical & Master Attributes */}
            <div className="lg:col-span-8 space-y-6">
              
              {/* Section 1: Basic Identifiers */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#581c87]"></span>
                    <h3 className="text-sm font-bold text-slate-900">
                      Medicine & Salt Formulation
                    </h3>
                  </div>
                  <span className="text-[11px] text-slate-400 font-medium">
                    * Required fields
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  {/* Medicine Name * */}
                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-slate-700 mb-1.5">
                      Medicine Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Dolo 650 Tablet, Augmentin 625 Duo, Pan-D"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-[#581c87] focus:ring-2 focus:ring-purple-100 text-sm font-medium text-slate-900 placeholder:text-slate-400"
                    />
                  </div>

                  {/* Generic / Salt Name */}
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1.5">
                      Generic / Salt Name
                    </label>
                    <input
                      type="text"
                      value={genericName}
                      onChange={(e) => setGenericName(e.target.value)}
                      placeholder="e.g. Paracetamol IP 650mg, Amoxicillin + Clavulanic Acid"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-[#581c87] text-slate-800 text-xs"
                    />
                  </div>

                  {/* Brand Name */}
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1.5">
                      Brand Name
                    </label>
                    <input
                      type="text"
                      value={brandName}
                      onChange={(e) => setBrandName(e.target.value)}
                      placeholder="e.g. Micro Labs, GlaxoSmithKline, Sun Pharma"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-[#581c87] text-slate-800 text-xs"
                    />
                  </div>

                  {/* Manufacturer */}
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1.5">
                      Manufacturer
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={manufacturer}
                        onChange={(e) => setManufacturer(e.target.value)}
                        placeholder="e.g. Cipla Ltd., Dr. Reddy's, Mankind Pharma"
                        className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-[#581c87] text-slate-800 text-xs"
                      />
                      <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    </div>
                  </div>

                  {/* Strength / Dosage */}
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1.5">
                      Strength / Dosage
                    </label>
                    <input
                      type="text"
                      value={strength}
                      onChange={(e) => setStrength(e.target.value)}
                      placeholder="e.g. 500 mg, 625 mg, 100 ml, 2% w/v"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-[#581c87] text-slate-800 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Medicine Classification & Hierarchy */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                    <h3 className="text-sm font-bold text-slate-900">
                      Classification & Type
                    </h3>
                  </div>
                  <span className="text-[11px] text-purple-700 font-medium bg-purple-50 px-2 py-0.5 rounded-md">
                    Synced with Master Tabs
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  {/* Medicine Type */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block font-semibold text-slate-700">
                        Medicine Type
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowQuickAddType(!showQuickAddType)}
                        className="text-[11px] text-[#581c87] hover:underline font-semibold"
                      >
                        + Add Type
                      </button>
                    </div>
                    {showQuickAddType ? (
                      <div className="flex items-center gap-1.5 mb-1.5 animate-in fade-in">
                        <input
                          type="text"
                          value={newTypeName}
                          onChange={(e) => setNewTypeName(e.target.value)}
                          placeholder="New Type (e.g. Inhaler)"
                          className="w-full px-2.5 py-1.5 rounded-lg border border-purple-300 text-xs focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={handleQuickAddTypeSubmit}
                          className="px-2 py-1.5 rounded-lg bg-[#581c87] text-white text-[11px] font-semibold"
                        >
                          Save
                        </button>
                      </div>
                    ) : null}
                    <select
                      value={medicineType}
                      onChange={(e) => setMedicineType(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-[#581c87] bg-white text-slate-800 text-xs font-medium cursor-pointer"
                    >
                      {medicineTypes.length === 0 ? (
                        <option value="">-- No types yet (Click &quot;+ Add Type&quot;) --</option>
                      ) : (
                        <>
                          <option value="">-- Select Medicine Type --</option>
                          {medicineTypes.map((t) => (
                            <option key={t.id} value={t.name}>
                              {t.iconTag ? `${t.iconTag} ` : ""}{t.name}
                            </option>
                          ))}
                        </>
                      )}
                    </select>
                  </div>

                  {/* Category * */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block font-semibold text-slate-700">
                        Category <span className="text-rose-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowQuickAddCat(!showQuickAddCat)}
                        className="text-[11px] text-[#581c87] hover:underline font-semibold"
                      >
                        + Add Cat
                      </button>
                    </div>
                    {showQuickAddCat ? (
                      <div className="flex items-center gap-1.5 mb-1.5 animate-in fade-in">
                        <input
                          type="text"
                          value={newCatName}
                          onChange={(e) => setNewCatName(e.target.value)}
                          placeholder="New Category"
                          className="w-full px-2.5 py-1.5 rounded-lg border border-purple-300 text-xs focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={handleQuickAddCatSubmit}
                          className="px-2 py-1.5 rounded-lg bg-[#581c87] text-white text-[11px] font-semibold"
                        >
                          Save
                        </button>
                      </div>
                    ) : null}
                    <select
                      required
                      value={category}
                      onChange={(e) => {
                        setCategory(e.target.value);
                        setSubCategory("");
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-[#581c87] bg-white text-slate-800 text-xs font-medium cursor-pointer"
                    >
                      {categories.length === 0 ? (
                        <option value="">-- No categories yet (Click &quot;+ Add Cat&quot;) --</option>
                      ) : (
                        <>
                          <option value="">-- Select Category --</option>
                          {categories.map((c) => (
                            <option key={c.id} value={c.name}>
                              {c.name}
                            </option>
                          ))}
                        </>
                      )}
                    </select>
                  </div>

                  {/* Sub Category */}
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1.5">
                      Sub Category
                    </label>
                    {availableSubCategories.length > 0 ? (
                      <select
                        value={subCategory}
                        onChange={(e) => setSubCategory(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-[#581c87] bg-white text-slate-800 text-xs font-medium cursor-pointer"
                      >
                        <option value="">-- Select Sub Category --</option>
                        {availableSubCategories.map((sub) => (
                          <option key={sub} value={sub}>
                            {sub}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={subCategory}
                        onChange={(e) => setSubCategory(e.target.value)}
                        placeholder="e.g. Penicillins, Antacids"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-[#581c87] text-slate-800 text-xs"
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Section 3: Pricing & Stock Inventory */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                    <h3 className="text-sm font-bold text-slate-900">
                      Packing, Pricing & Stock Configuration
                    </h3>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">SKU: {sku}</span>
                </div>

                {/* Packaging count per sheet/strip */}
                <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <label className="block font-bold text-slate-800 text-xs">
                        Packing Count per Sheet / Strip <span className="text-rose-500">*</span>
                      </label>
                      <p className="text-[11px] text-slate-500">
                        How many tablets/capsules/units are in one full sheet/strip?
                      </p>
                    </div>

                    {/* Quick Count Selection Chips: 10, 15, 20, 30 */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {["10", "15", "20", "30", "1"].map((cnt) => (
                        <button
                          key={cnt}
                          type="button"
                          onClick={() => handleUnitsPerSheetChange(cnt)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${
                            unitsPerSheet === cnt
                              ? "bg-[#581c87] text-white border-[#581c87] shadow-xs"
                              : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          {cnt === "1" ? "1 (Single)" : `${cnt} units`}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-600 text-[11px] mb-1">
                        Exact Count per Sheet (e.g. 10, 15, 20)
                      </label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={unitsPerSheet}
                        onChange={(e) => handleUnitsPerSheetChange(e.target.value)}
                        placeholder="10"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-[#581c87] text-slate-900 text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-600 text-[11px] mb-1">
                        Packaging Label
                      </label>
                      <select
                        value={packagingName}
                        onChange={(e) => setPackagingName(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-[#581c87] text-slate-800 text-xs font-medium cursor-pointer"
                      >
                        <option value="Sheet / Strip">Sheet / Strip</option>
                        <option value="Box">Box</option>
                        <option value="Bottle">Bottle</option>
                        <option value="Blister Pack">Blister Pack</option>
                        <option value="Vial">Vial</option>
                        <option value="Tube">Tube</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Dual Pricing: Sheet Price & Per Medicine Price */}
                <div className="p-4 bg-purple-50/40 rounded-2xl border border-purple-100/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">
                        Selling Price & Unit Rate
                      </h4>
                      <p className="text-[11px] text-purple-700">
                        Enter Sheet Price or Per Medicine Price — the other calculates automatically!
                      </p>
                    </div>
                    <span className="text-[11px] font-semibold bg-white text-purple-800 px-2 py-0.5 rounded-md border border-purple-200">
                      1 Sheet = {countPerSheet} Units
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {/* Sheet Price */}
                    <div className="bg-white p-3 rounded-xl border border-purple-100 shadow-xs">
                      <label className="block font-bold text-slate-800 mb-1">
                        Sheet / Strip Price (₹) <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={sheetPrice}
                          onChange={(e) => handleSheetPriceChange(e.target.value)}
                          placeholder="0.00"
                          className="w-full pl-7 pr-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-[#581c87] text-slate-900 text-sm font-bold"
                        />
                        <span className="absolute left-2.5 top-2 text-slate-400 font-bold">₹</span>
                      </div>
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        Full pack / strip selling price
                      </span>
                    </div>

                    {/* Per Medicine Price */}
                    <div className="bg-white p-3 rounded-xl border border-purple-100 shadow-xs">
                      <label className="block font-bold text-slate-800 mb-1">
                        Per Medicine / Unit Price (₹) <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.01"
                          value={unitPrice}
                          onChange={(e) => handleUnitPriceChange(e.target.value)}
                          placeholder="0.00"
                          className="w-full pl-7 pr-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-[#581c87] text-slate-900 text-sm font-bold"
                        />
                        <span className="absolute left-2.5 top-2 text-slate-400 font-bold">₹</span>
                      </div>
                      <span className="text-[10px] text-emerald-600 mt-1 block font-medium">
                        Rate per single tablet / capsule
                      </span>
                    </div>

                    {/* Cost Prices */}
                    <div className="bg-white p-3 rounded-xl border border-slate-200/80">
                      <label className="block font-semibold text-slate-700 mb-1 text-[11px]">
                        Purchase Cost per Sheet (₹)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.01"
                          value={sheetCostPrice}
                          onChange={(e) => handleSheetCostPriceChange(e.target.value)}
                          placeholder="0.00"
                          className="w-full pl-7 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold focus:outline-none focus:border-[#581c87]"
                        />
                        <span className="absolute left-2.5 top-1.5 text-slate-400 font-semibold">₹</span>
                      </div>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-slate-200/80">
                      <label className="block font-semibold text-slate-700 mb-1 text-[11px]">
                        Purchase Cost per Medicine (₹)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.01"
                          value={unitCostPrice}
                          onChange={(e) => handleUnitCostPriceChange(e.target.value)}
                          placeholder="0.00"
                          className="w-full pl-7 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold focus:outline-none focus:border-[#581c87]"
                        />
                        <span className="absolute left-2.5 top-1.5 text-slate-400 font-semibold">₹</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Dual Stock: Sheets & Loose Units */}
                <div className="p-4 bg-emerald-50/40 rounded-2xl border border-emerald-100/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">
                        Current Stock Inventory
                      </h4>
                      <p className="text-[11px] text-emerald-700">
                        Record both unopened full sheets and opened loose medicines
                      </p>
                    </div>
                    {/* Live calculated total units badge */}
                    <div className="text-right">
                      <span className="text-xs font-extrabold text-emerald-800 bg-emerald-100/80 px-2.5 py-1 rounded-lg border border-emerald-200 inline-block">
                        Total: {totalUnits} Units
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {/* Full Sheets */}
                    <div className="bg-white p-3 rounded-xl border border-emerald-100 shadow-xs">
                      <label className="block font-bold text-slate-800 mb-1">
                        No. of Full Sheets / Strips in Stock
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={sheetsStock}
                        onChange={(e) => setSheetsStock(e.target.value)}
                        placeholder="0"
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-600 text-slate-900 text-sm font-bold"
                      />
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        = {numSheets * countPerSheet} tablets/units
                      </span>
                    </div>

                    {/* Loose Medicines */}
                    <div className="bg-white p-3 rounded-xl border border-emerald-100 shadow-xs">
                      <label className="block font-bold text-slate-800 mb-1">
                        Loose Tablets / Units in Stock
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={looseStock}
                        onChange={(e) => setLooseStock(e.target.value)}
                        placeholder="0"
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-600 text-slate-900 text-sm font-bold"
                      />
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        Loose pieces from cut/opened strips
                      </span>
                    </div>
                  </div>

                  {/* Summary calculation pill */}
                  <div className="p-2.5 bg-white/90 rounded-xl border border-emerald-200 flex items-center justify-between text-xs text-slate-700">
                    <span className="text-slate-600 font-medium">
                      Formula Breakdown:
                    </span>
                    <span className="font-bold text-emerald-800 font-mono">
                      ({numSheets} sheets × {countPerSheet}) + {numLoose} loose = {totalUnits} Total Units
                    </span>
                  </div>
                </div>

                {/* Batch & Expiry Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Batch Number
                    </label>
                    <input
                      type="text"
                      value={batchNumber}
                      onChange={(e) => setBatchNumber(e.target.value)}
                      placeholder="e.g. BAT-4402"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-[#581c87] text-slate-800 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Expiry Date
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={expiryDate}
                        onChange={(e) => setExpiryDate(e.target.value)}
                        placeholder="e.g. 12/2027 or YYYY-MM"
                        className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-[#581c87] text-slate-800 text-xs"
                      />
                      <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 4: Clinical Description */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <FileText className="w-4 h-4 text-slate-500" />
                  <h3 className="text-sm font-bold text-slate-900">
                    Clinical Indications & Description
                  </h3>
                </div>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter medical indications, dosage instructions, contraindications, side effects, or storage conditions..."
                  className="w-full p-3.5 rounded-xl border border-slate-200 focus:outline-none focus:border-[#581c87] text-slate-800 text-xs resize-none"
                />
              </div>

            </div>

            {/* Right Column (4 cols): Prescription Requirement, Image Upload & Summary Preview */}
            <div className="lg:col-span-4 space-y-6">
              
              {/* Prescription Required? — Yes/No */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                    <h3 className="text-sm font-bold text-slate-900">
                      Prescription Required?
                    </h3>
                  </div>
                  {prescriptionRequired ? (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-700 border border-rose-200 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Rx Only
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                      OTC (Over The Counter)
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Specify whether a registered medical practitioner&apos;s prescription (Schedule H/H1/X) is mandatory for dispensing this medicine.
                </p>

                {/* Yes / No Interactive Segmented Control */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setPrescriptionRequired(true)}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                      prescriptionRequired
                        ? "bg-rose-600 text-white border-rose-600 shadow-md shadow-rose-600/20"
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <span>Yes (Rx Required)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrescriptionRequired(false)}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                      !prescriptionRequired
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20"
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <span>No (OTC)</span>
                  </button>
                </div>
              </div>

              {/* Medicine Image Upload & Preview */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-teal-500"></span>
                    <h3 className="text-sm font-bold text-slate-900">
                      Medicine Image
                    </h3>
                  </div>
                  {imageUrl && (
                    <button
                      type="button"
                      onClick={() => setImageUrl("")}
                      className="text-[11px] text-rose-500 hover:underline flex items-center gap-1 font-medium"
                    >
                      <Trash2 className="w-3 h-3" /> Remove
                    </button>
                  )}
                </div>

                <p className="text-[11px] text-slate-500">
                  Upload packaging photo or bottle/strip shot for pharmacy billing and verification.
                </p>

                {/* Upload box */}
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />

                {imageUrl ? (
                  <div className="relative group w-full h-44 rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imageUrl}
                      alt="Medicine preview"
                      className="w-full h-full object-contain p-2"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1.5 rounded-lg bg-white text-slate-800 text-xs font-semibold shadow-md"
                      >
                        Change Photo
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-40 rounded-2xl border-2 border-dashed border-slate-200 hover:border-purple-400 bg-slate-50/70 hover:bg-purple-50/20 cursor-pointer flex flex-col items-center justify-center gap-2 text-center p-4 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full bg-white shadow-xs border border-slate-200 flex items-center justify-center text-[#581c87]">
                      <Upload className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-700">
                        Click to upload medicine image
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        PNG, JPG, WebP up to 5MB
                      </p>
                    </div>
                  </div>
                )}

                {/* Medicine Form Emoji selector as instant fallback */}
                <div className="pt-2 border-t border-slate-100">
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1.5">
                    Or select dosage icon:
                  </label>
                  <div className="flex items-center gap-2">
                    {["💊", "🧪", "💉", "🧴", "💧", "🧂", "💨", "✨"].map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setImageEmoji(emoji)}
                        className={`w-8 h-8 rounded-lg text-sm flex items-center justify-center border transition-all ${
                          imageEmoji === emoji
                            ? "bg-purple-100 border-[#581c87] scale-110 shadow-xs"
                            : "bg-slate-50 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Real-time Medicine Card Summary */}
              <div className="bg-gradient-to-br from-purple-50 to-indigo-50/50 p-5 rounded-2xl border border-purple-100 space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#581c87]" />
                  <h4 className="text-xs font-bold text-slate-900">
                    Live Preview Summary
                  </h4>
                </div>
                <div className="bg-white p-3.5 rounded-xl border border-purple-100 shadow-xs space-y-2 text-xs">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-slate-900 text-sm">
                        {name || "Medicine Name"}
                      </p>
                      <p className="text-[11px] text-slate-500 font-medium">
                        {genericName || "Generic / Salt formulation"}
                      </p>
                    </div>
                    <span className="text-xl">
                      {imageUrl ? "🖼️" : imageEmoji}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <span className="px-2 py-0.5 rounded-md bg-purple-50 text-[#581c87] font-semibold text-[10px]">
                      {medicineType || "Dosage Form"}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-medium text-[10px]">
                      {category || "Category"}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-semibold text-[10px]">
                      {countPerSheet} / {packagingName || "Sheet"}
                    </span>
                    {prescriptionRequired ? (
                      <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-600 font-bold text-[10px]">
                        Rx Required
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-600 font-bold text-[10px]">
                        OTC
                      </span>
                    )}
                  </div>
                  <div className="pt-2 border-t border-slate-100 space-y-1 text-slate-700 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 text-[11px]">Sheet Price:</span>
                      <strong className="text-slate-900 font-bold">
                        ₹ {sheetPrice ? parseFloat(sheetPrice).toFixed(2) : "0.00"}
                      </strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 text-[11px]">Per Medicine:</span>
                      <strong className="text-purple-700 font-bold">
                        ₹ {unitPrice ? parseFloat(unitPrice).toFixed(2) : "0.00"} / pc
                      </strong>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-slate-50">
                      <span className="text-slate-500 text-[11px]">Stock Breakdown:</span>
                      <span className="font-bold text-emerald-700 text-[11px]">
                        {numSheets} Sheets + {numLoose} Loose ({totalUnits} Units)
                      </span>
                    </div>
                  </div>
                </div>
              </div>

            </div>

          </div>
        </form>

        {/* Sticky Modal Bottom Actions */}
        <div className="px-6 py-4 bg-white border-t border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>All values will be saved to your local pharmacy catalog and instantly searchable</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold text-xs transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="px-6 py-2.5 rounded-xl bg-[#581c87] hover:bg-[#431c8c] text-white font-bold text-xs transition-all shadow-md shadow-purple-900/20 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Save & Add Medicine</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
