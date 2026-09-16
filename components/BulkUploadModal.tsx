"use client";

import React, { useState, useRef } from "react";
import {
  FileSpreadsheet,
  UploadCloud,
  Download,
  CheckCircle2,
  AlertCircle,
  X,
  FileText,
  Layers,
  Sparkles,
  Pill,
  Loader2,
  Table as TableIcon,
} from "lucide-react";
import * as XLSX from "xlsx";
import {
  MedicineCategory,
  MedicineItem,
  MedicineTypeOption,
} from "@/lib/medicine-master";
import {
  downloadSampleMedicinesExcel,
  downloadSampleMedicinesCSV,
} from "@/lib/sample-medicines-200";

interface BulkUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingCategories: MedicineCategory[];
  existingTypes: MedicineTypeOption[];
  onBulkImport: (data: {
    medicines: MedicineItem[];
    newCategories: MedicineCategory[];
    newTypes: MedicineTypeOption[];
  }) => Promise<void> | void;
}

const DEFAULT_MEDICINE_IMAGE =
  "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=300&auto=format&fit=crop&q=60";

export default function BulkUploadModal({
  isOpen,
  onClose,
  existingCategories,
  existingTypes,
  onBulkImport,
}: BulkUploadModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState<{
    count: number;
    catsCount: number;
    typesCount: number;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
  };

  const processFile = async (file: File) => {
    setSelectedFile(file);
    setIsParsing(true);
    setErrorMessage(null);
    setImportSuccess(null);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const json: any[] = XLSX.utils.sheet_to_json(worksheet);

      if (!json || json.length === 0) {
        setErrorMessage("The uploaded file contains no data rows. Please use the sample template.");
        setParsedRows([]);
        setIsParsing(false);
        return;
      }

      // Check if essential columns exist
      const firstRow = json[0];
      const hasName = "Medicine Name" in firstRow || "name" in firstRow || "Name" in firstRow;
      if (!hasName) {
        setErrorMessage(
          "Column 'Medicine Name' was not found. Please ensure headers match the sample template."
        );
        setParsedRows([]);
        setIsParsing(false);
        return;
      }

      setParsedRows(json);
    } catch (err: any) {
      console.error("Excel parse error:", err);
      setErrorMessage("Failed to read file. Please ensure it is a valid .xlsx, .xls, or .csv file.");
      setParsedRows([]);
    } finally {
      setIsParsing(false);
    }
  };

  // Inspect what new categories and types will be created
  const detectedNewCategories: string[] = [];
  const detectedNewTypes: string[] = [];

  if (parsedRows.length > 0) {
    const existingCatNames = new Set(existingCategories.map((c) => c.name.toLowerCase().trim()));
    const existingTypeNames = new Set(existingTypes.map((t) => t.name.toLowerCase().trim()));

    parsedRows.forEach((row) => {
      const cat = String(row["Category"] || row["category"] || "").trim();
      if (cat && !existingCatNames.has(cat.toLowerCase()) && !detectedNewCategories.includes(cat)) {
        detectedNewCategories.push(cat);
      }

      const t = String(row["Medicine Type"] || row["type"] || "").trim();
      if (t && !existingTypeNames.has(t.toLowerCase()) && !detectedNewTypes.includes(t)) {
        detectedNewTypes.push(t);
      }
    });
  }

  const handleImport = async () => {
    if (parsedRows.length === 0) return;
    setIsImporting(true);
    setErrorMessage(null);

    try {
      const newCategoriesMap = new Map<string, MedicineCategory>();
      const existingCatMap = new Map(existingCategories.map((c) => [c.name.toLowerCase().trim(), c]));

      const newTypesMap = new Map<string, MedicineTypeOption>();
      const existingTypeMap = new Map(existingTypes.map((t) => [t.name.toLowerCase().trim(), t]));

      const now = new Date();
      const dateStr = now.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });

      const processedMedicines: MedicineItem[] = [];

      for (let i = 0; i < parsedRows.length; i++) {
        const row = parsedRows[i];
        const medName = String(row["Medicine Name"] || row["name"] || row["Name"] || "").trim();
        if (!medName) continue;

        const catName = String(row["Category"] || row["category"] || "General Care").trim();
        const subCatName = String(row["Sub Category"] || row["subCategory"] || "General").trim();
        const typeName = String(row["Medicine Type"] || row["type"] || "Tablet").trim();

        // 1. Ensure Category & SubCategory exist or register
        const catKey = catName.toLowerCase();
        if (!existingCatMap.has(catKey) && !newCategoriesMap.has(catKey)) {
          const newCat: MedicineCategory = {
            id: `cat-bulk-${Date.now()}-${newCategoriesMap.size + 1}`,
            name: catName,
            description: `${catName} therapeutic pharmacy category`,
            subCategories: [subCatName],
            badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
          };
          newCategoriesMap.set(catKey, newCat);
        } else if (newCategoriesMap.has(catKey)) {
          const cat = newCategoriesMap.get(catKey)!;
          if (!cat.subCategories.includes(subCatName)) {
            cat.subCategories.push(subCatName);
          }
        }

        // 2. Ensure Medicine Type exists or register
        const typeKey = typeName.toLowerCase();
        if (!existingTypeMap.has(typeKey) && !newTypesMap.has(typeKey)) {
          const newType: MedicineTypeOption = {
            id: `type-bulk-${Date.now()}-${newTypesMap.size + 1}`,
            name: typeName,
            defaultUnit: "Sheet / Strip",
            description: `${typeName} dosage formulation`,
            iconTag: "💊",
          };
          newTypesMap.set(typeKey, newType);
        }

        // 3. Packaging & Stock numbers
        const packingCount = Math.max(
          1,
          parseInt(String(row["Packing Count"] || row["packingCount"] || "10"), 10) || 10
        );
        const pkgUnit = String(row["Packaging Unit"] || row["packagingUnit"] || "Sheet / Strip").trim();

        // Prices
        let sheetP = parseFloat(String(row["Sheet Price"] || row["sheetPrice"] || "0"));
        let unitP = parseFloat(String(row["Per Medicine Price"] || row["unitPrice"] || "0"));

        if (!sheetP && unitP) sheetP = unitP * packingCount;
        if (!unitP && sheetP) unitP = sheetP / packingCount;
        if (!sheetP && !unitP) {
          sheetP = 100;
          unitP = 100 / packingCount;
        }

        let sheetCost = parseFloat(String(row["Sheet Cost Price"] || row["sheetCostPrice"] || "0"));
        let unitCost = parseFloat(String(row["Per Medicine Cost Price"] || row["unitCostPrice"] || "0"));
        if (!sheetCost && unitCost) sheetCost = unitCost * packingCount;
        if (!unitCost && sheetCost) unitCost = sheetCost / packingCount;
        if (!sheetCost && !unitCost) {
          sheetCost = sheetP * 0.75;
          unitCost = sheetCost / packingCount;
        }

        // Stocks
        const sheetsStock = parseInt(String(row["Full Sheets Stock"] || row["sheetsStock"] || "25"), 10) || 0;
        const looseStock = parseInt(String(row["Loose Units Stock"] || row["looseStock"] || "0"), 10) || 0;
        const totalUnitsStock = sheetsStock * packingCount + looseStock;

        // Prescription status
        const rxRaw = String(row["Prescription Required"] || row["rx"] || "No").trim().toLowerCase();
        const rxRequired = rxRaw === "yes" || rxRaw === "true" || rxRaw === "1" || rxRaw === "rx";

        // Status
        let status: "Active" | "Out of Stock" | "Low Stock" = "Active";
        if (totalUnitsStock <= 0) {
          status = "Out of Stock";
        } else if (totalUnitsStock < 15) {
          status = "Low Stock";
        }

        const medItem: MedicineItem = {
          id: `med-imp-${Date.now()}-${i}`,
          name: medName,
          genericName: String(row["Generic / Salt Name"] || row["genericName"] || medName).trim(),
          brandName: String(row["Brand Name"] || row["brandName"] || medName.split(" ")[0]).trim(),
          medicineType: typeName,
          category: catName,
          subCategory: subCatName,
          manufacturer: String(row["Manufacturer"] || row["manufacturer"] || "Generic Labs").trim(),
          prescriptionRequired: rxRequired,
          description: String(
            row["Description"] ||
              row["description"] ||
              `Pharmaceutical formulation of ${medName}`
          ).trim(),

          unitsPerSheet: packingCount,
          packagingUnitName: pkgUnit,

          sheetPrice: sheetP.toFixed(2),
          unitPrice: unitP.toFixed(2),
          sheetCostPrice: sheetCost.toFixed(2),
          unitCostPrice: unitCost.toFixed(2),
          sellingPrice: `₹${sheetP.toFixed(2)}`,
          costPrice: `₹${sheetCost.toFixed(2)}`,

          sheetsStock,
          looseStock,
          totalUnitsStock,
          stock: String(totalUnitsStock),

          sku: `SKU-${1000 + i}`,
          unit: `${packingCount} per ${pkgUnit}`,
          batchNumber: String(row["Batch Number"] || row["batchNumber"] || `BAT-${202600 + i}`).trim(),
          expiryDate: String(row["Expiry Date"] || row["expiryDate"] || "2028-06-30").trim(),
          status,
          addedOn: dateStr,

          // Default image as requested by user
          imageUrl: DEFAULT_MEDICINE_IMAGE,
          imageEmoji: "💊",
        };

        processedMedicines.push(medItem);
      }

      const finalNewCats = Array.from(newCategoriesMap.values());
      const finalNewTypes = Array.from(newTypesMap.values());

      await onBulkImport({
        medicines: processedMedicines,
        newCategories: finalNewCats,
        newTypes: finalNewTypes,
      });

      setImportSuccess({
        count: processedMedicines.length,
        catsCount: finalNewCats.length,
        typesCount: finalNewTypes.length,
      });
    } catch (err: any) {
      console.error("Import processing error:", err);
      setErrorMessage(err?.message || "An error occurred while importing medicines.");
    } finally {
      setIsImporting(false);
    }
  };

  const resetModal = () => {
    setSelectedFile(null);
    setParsedRows([]);
    setErrorMessage(null);
    setImportSuccess(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200/80 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4.5 bg-gradient-to-r from-slate-900 via-[#1e1b4b] to-[#3b0764] text-white flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-emerald-400 shadow-inner">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">
                  Bulk Medicine Import
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">
                  Excel &amp; CSV
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Download sample file, choose your spreadsheet, and auto-register medicines
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1 bg-slate-50/50">
          {/* Success Banner */}
          {importSuccess ? (
            <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-200 text-center space-y-3 animate-in zoom-in-95">
              <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-md shadow-emerald-600/30">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-bold text-emerald-900">
                  Import Successful!
                </h4>
                <p className="text-xs text-emerald-700 mt-1 max-w-md mx-auto">
                  Registered <strong>{importSuccess.count} medicines</strong> with dual pricing, sheet &amp; loose stock, and default clinical images.
                </p>
              </div>

              <div className="flex items-center justify-center gap-2 pt-1 flex-wrap text-xs">
                {importSuccess.catsCount > 0 && (
                  <span className="px-3 py-1 rounded-full bg-white text-emerald-800 font-bold border border-emerald-200 shadow-2xs">
                    + {importSuccess.catsCount} New Categories Created
                  </span>
                )}
                {importSuccess.typesCount > 0 && (
                  <span className="px-3 py-1 rounded-full bg-white text-emerald-800 font-bold border border-emerald-200 shadow-2xs">
                    + {importSuccess.typesCount} New Medicine Types Created
                  </span>
                )}
              </div>

              <div className="pt-3 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    resetModal();
                    onClose();
                  }}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
                >
                  Done &amp; View Catalog
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Step 1: Download Sample Template Card */}
              <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-100">
                      Step 1: Get Template
                    </span>
                    <h4 className="text-xs font-bold text-slate-900 mt-1.5">
                      Download 200 Sample Medicines File
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Contains 200 realistic pharmaceutical medicines across Antibiotics, Pain Relief, Diabetes, Cardiac Care, Respiratory, etc.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={downloadSampleMedicinesExcel}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#581c87] hover:bg-[#431c8c] text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
                      title="Download formatted Excel (.xlsx) containing 200 sample medicines"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Excel (.xlsx)</span>
                    </button>
                    <button
                      type="button"
                      onClick={downloadSampleMedicinesCSV}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-200 transition-all cursor-pointer"
                      title="Download as CSV file"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>CSV</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Step 2: Upload File Area */}
              <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                  Step 2: Choose Spreadsheet
                </span>

                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`w-full p-6 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
                    selectedFile
                      ? "border-purple-300 bg-purple-50/20"
                      : "border-slate-300 hover:border-purple-400 bg-slate-50/70 hover:bg-purple-50/10"
                  }`}
                >
                  <div className="w-12 h-12 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center text-[#581c87] mb-2 shadow-xs">
                    {isParsing ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      <UploadCloud className="w-6 h-6" />
                    )}
                  </div>
                  {selectedFile ? (
                    <div>
                      <p className="text-xs font-bold text-slate-800">
                        {selectedFile.name}
                      </p>
                      <p className="text-[11px] text-purple-700 font-semibold mt-0.5">
                        {(selectedFile.size / 1024).toFixed(1)} KB — Click to choose different file
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs font-bold text-slate-800">
                        Click here to select your Excel or CSV file
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Supports .xlsx, .xls, and .csv files
                      </p>
                    </div>
                  )}
                </div>

                {errorMessage && (
                  <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 flex items-start gap-2 text-xs text-rose-700">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
                    <span>{errorMessage}</span>
                  </div>
                )}
              </div>

              {/* Step 3: Parsed Data Summary & Preview */}
              {parsedRows.length > 0 && (
                <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                        Step 3: Verification
                      </span>
                      <h4 className="text-xs font-bold text-slate-900">
                        Ready to Import ({parsedRows.length} Medicines)
                      </h4>
                    </div>
                    <span className="text-[11px] text-slate-400 font-medium">
                      Default image will be applied
                    </span>
                  </div>

                  {/* Badges for Auto-Created Entities */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 rounded-xl bg-purple-50/70 border border-purple-100 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-purple-600" />
                        <span className="text-purple-900 font-medium text-[11px]">
                          New Categories to Create:
                        </span>
                      </div>
                      <span className="font-bold text-purple-950 px-2 py-0.5 bg-white rounded-lg border border-purple-200 text-xs">
                        {detectedNewCategories.length}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-blue-50/70 border border-blue-100 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-blue-600" />
                        <span className="text-blue-900 font-medium text-[11px]">
                          New Types to Create:
                        </span>
                      </div>
                      <span className="font-bold text-blue-950 px-2 py-0.5 bg-white rounded-lg border border-blue-200 text-xs">
                        {detectedNewTypes.length}
                      </span>
                    </div>
                  </div>

                  {/* Preview First 3 Rows */}
                  <div className="border border-slate-200/80 rounded-xl overflow-hidden text-[11px]">
                    <div className="bg-slate-100 px-3 py-1.5 font-bold text-slate-700 flex items-center gap-1.5 border-b border-slate-200">
                      <TableIcon className="w-3.5 h-3.5 text-slate-500" />
                      <span>Data Preview (First 3 of {parsedRows.length})</span>
                    </div>
                    <div className="divide-y divide-slate-100 max-h-36 overflow-y-auto">
                      {parsedRows.slice(0, 3).map((r, idx) => (
                        <div key={idx} className="p-2.5 flex items-center justify-between gap-2">
                          <div>
                            <span className="font-bold text-slate-900 block">
                              {r["Medicine Name"] || r["name"]}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              {r["Category"] || r["category"]} &bull; {r["Medicine Type"] || r["type"]} &bull; Packing: {r["Packing Count"] || 10}/sheet
                            </span>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="font-bold text-[#581c87] block">
                              ₹{r["Sheet Price"] || 0} / sheet
                            </span>
                            <span className="text-[10px] text-emerald-600 font-medium">
                              Stock: {r["Full Sheets Stock"] || 0} sheets
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        {!importSuccess && (
          <div className="px-6 py-4 bg-white border-t border-slate-100 flex items-center justify-between shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold text-xs transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={parsedRows.length === 0 || isImporting}
              onClick={handleImport}
              className="px-5 py-2.5 rounded-xl bg-[#581c87] hover:bg-[#431c8c] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs shadow-md shadow-purple-900/20 transition-all cursor-pointer flex items-center gap-2"
            >
              {isImporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Importing {parsedRows.length} Medicines...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4" />
                  <span>
                    Import {parsedRows.length > 0 ? `${parsedRows.length} Medicines` : "Medicines"}
                  </span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
