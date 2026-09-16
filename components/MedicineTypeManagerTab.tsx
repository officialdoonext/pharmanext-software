"use client";

import React, { useState } from "react";
import {
  Plus,
  Trash2,
  Search,
  Pill,
  Syringe,
  Package,
  Layers,
  Sparkles,
} from "lucide-react";
import { MedicineTypeOption, MedicineItem } from "@/lib/medicine-master";

interface MedicineTypeManagerTabProps {
  medicineTypes: MedicineTypeOption[];
  medicines: MedicineItem[];
  onAddType: (type: MedicineTypeOption) => void;
  onDeleteType: (id: string) => void;
}

export default function MedicineTypeManagerTab({
  medicineTypes,
  medicines,
  onAddType,
  onDeleteType,
}: MedicineTypeManagerTabProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [name, setName] = useState("");
  const [defaultUnit, setDefaultUnit] = useState("");
  const [description, setDescription] = useState("");
  const [iconTag, setIconTag] = useState("💊");

  const emojiOptions = ["💊", "🧪", "💉", "🧴", "💧", "🧂", "💨", "✨", "🩹", "📦"];

  const handleCreateType = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newType: MedicineTypeOption = {
      id: "type-" + Date.now(),
      name: name.trim(),
      defaultUnit: defaultUnit.trim() || "Strip",
      description: description.trim() || "Dosage administration form",
      iconTag: iconTag || "💊",
    };

    onAddType(newType);
    setName("");
    setDefaultUnit("");
    setDescription("");
  };

  const filteredTypes = medicineTypes.filter((t) => {
    const q = searchTerm.toLowerCase();
    return (
      t.name.toLowerCase().includes(q) ||
      t.defaultUnit.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-[#0f172a] via-[#1e293b] to-[#334155] rounded-3xl p-6 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-white/10 backdrop-blur-md">
              <Pill className="w-5 h-5 text-emerald-300" />
            </span>
            <h2 className="text-xl font-bold tracking-tight text-white">
              Medicine Dosage Forms & Types
            </h2>
          </div>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            Configure pharmaceutical dosage forms (Tablet, Capsule, Syrup, Injection, Cream, Drops, Powder, etc.). Any new form added here dynamically appears in the Add Medicine dropdown!
          </p>
        </div>

        <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/15">
          <div className="text-center px-4 border-r border-white/20">
            <p className="text-[11px] text-slate-300">Total Types</p>
            <p className="text-xl font-black text-white">{medicineTypes.length}</p>
          </div>
          <div className="text-center px-4">
            <p className="text-[11px] text-slate-300">Medicines Linked</p>
            <p className="text-xl font-black text-emerald-300">
              {medicines.length}
            </p>
          </div>
        </div>
      </div>

      {/* Grid: Left Form, Right Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Add Type Form (4 cols) */}
        <div className="lg:col-span-4">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs sticky top-24 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <h3 className="text-sm font-bold text-slate-900">
                + Add Dosage / Medicine Type
              </h3>
            </div>

            <form onSubmit={handleCreateType} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Type Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Inhaler, Suppository, Spray, Gel"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-[#5E2B9D] text-slate-900 text-xs font-medium"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Default Packaging / Unit
                </label>
                <input
                  type="text"
                  value={defaultUnit}
                  onChange={(e) => setDefaultUnit(e.target.value)}
                  placeholder="e.g. Canister, Strip, Bottle, Box"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-[#5E2B9D] text-slate-800 text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Description / Administration Route
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Metered-dose inhaler for oral inhalation route"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-[#5E2B9D] text-slate-800 text-xs resize-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Select Icon Tag
                </label>
                <div className="flex flex-wrap items-center gap-1.5">
                  {emojiOptions.map((emo) => (
                    <button
                      key={emo}
                      type="button"
                      onClick={() => setIconTag(emo)}
                      className={`w-8 h-8 rounded-xl text-sm flex items-center justify-center border transition-all ${
                        iconTag === emo
                          ? "bg-purple-100 border-[#5E2B9D] scale-110 shadow-xs"
                          : "bg-slate-50 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {emo}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-[#5E2B9D] hover:bg-[#4D2382] text-white font-bold text-xs shadow-md shadow-purple-900/10 flex items-center justify-center gap-2 transition-all mt-2"
              >
                <Plus className="w-4 h-4" />
                <span>Save Medicine Type</span>
              </button>
            </form>
          </div>
        </div>

        {/* Existing Medicine Types Grid (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          
          {/* Search Bar */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-3 shadow-xs flex items-center gap-3">
            <Search className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search dosage form or type name..."
              className="w-full text-xs text-slate-800 focus:outline-none bg-transparent"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="text-[11px] text-slate-400 hover:text-slate-600 px-2"
              >
                Clear
              </button>
            )}
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredTypes.map((type) => {
              const medicinesWithThisType = medicines.filter(
                (m) => m.medicineType.toLowerCase() === type.name.toLowerCase()
              );

              return (
                <div
                  key={type.id}
                  className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:border-purple-200 hover:shadow-sm transition-all flex flex-col justify-between space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center text-xl shrink-0 shadow-xs">
                        {type.iconTag || "💊"}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">
                          {type.name}
                        </h4>
                        <span className="text-[11px] text-slate-500 font-medium">
                          Packaging: {type.defaultUnit || "Unit"}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Remove dosage type "${type.name}"?`)) {
                          onDeleteType(type.id);
                        }
                      }}
                      className="w-7 h-7 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors"
                      title="Delete Type"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <p className="text-xs text-slate-500 leading-relaxed">
                    {type.description}
                  </p>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 font-medium">Linked Inventory</span>
                    <span className="font-bold text-[#5E2B9D] bg-purple-50 px-2 py-0.5 rounded-md">
                      {medicinesWithThisType.length} Items
                    </span>
                  </div>
                </div>
              );
            })}

            {filteredTypes.length === 0 && (
              <div className="col-span-2 bg-white rounded-2xl border border-slate-200/80 p-12 text-center text-slate-500">
                <Pill className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-700">
                  {searchTerm ? "No matching dosage types found" : "No medicine dosage types created yet"}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {searchTerm ? "Try adjusting your search keyword." : "Fill out the form on the left to add your first medicine dosage type (e.g. Tablet, Syrup, Injection)."}
                </p>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
