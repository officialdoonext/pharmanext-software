"use client";

import React, { useState } from "react";
import {
  Plus,
  Trash2,
  Tag,
  Layers,
  Search,
  CheckCircle2,
  FolderPlus,
  Hash,
} from "lucide-react";
import { MedicineCategory, MedicineItem } from "@/lib/medicine-master";

interface CategoryManagerTabProps {
  categories: MedicineCategory[];
  medicines: MedicineItem[];
  onAddCategory: (category: MedicineCategory) => void;
  onDeleteCategory: (id: string) => void;
  onAddSubCategory: (categoryId: string, subCategory: string) => void;
  onDeleteSubCategory: (categoryId: string, subCategory: string) => void;
}

export default function CategoryManagerTab({
  categories,
  medicines,
  onAddCategory,
  onDeleteCategory,
  onAddSubCategory,
  onDeleteSubCategory,
}: CategoryManagerTabProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [subCategoriesInput, setSubCategoriesInput] = useState("");
  const [selectedColor, setSelectedColor] = useState("bg-purple-50 text-purple-700 border-purple-200");
  const [activeAddingSubId, setActiveAddingSubId] = useState<string | null>(null);
  const [newSubText, setNewSubText] = useState("");

  const colorOptions = [
    { label: "Purple", val: "bg-purple-50 text-purple-700 border-purple-200" },
    { label: "Blue", val: "bg-blue-50 text-blue-700 border-blue-200" },
    { label: "Emerald", val: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    { label: "Rose", val: "bg-rose-50 text-rose-700 border-rose-200" },
    { label: "Amber", val: "bg-amber-50 text-amber-700 border-amber-200" },
    { label: "Teal", val: "bg-teal-50 text-teal-700 border-teal-200" },
  ];

  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    // Parse comma separated subcategories
    const parsedSubs = subCategoriesInput
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const newCategory: MedicineCategory = {
      id: "cat-" + Date.now(),
      name: name.trim(),
      description: description.trim() || "Pharmacy therapeutic classification",
      subCategories: parsedSubs.length > 0 ? parsedSubs : ["General"],
      badgeColor: selectedColor,
    };

    onAddCategory(newCategory);
    setName("");
    setDescription("");
    setSubCategoriesInput("");
  };

  const handleInlineAddSub = (categoryId: string) => {
    if (!newSubText.trim()) return;
    onAddSubCategory(categoryId, newSubText.trim());
    setNewSubText("");
    setActiveAddingSubId(null);
  };

  const filteredCategories = categories.filter((c) => {
    const q = searchTerm.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q) ||
      c.subCategories.some((sub) => sub.toLowerCase().includes(q))
    );
  });

  const totalSubCategories = categories.reduce(
    (acc, cat) => acc + cat.subCategories.length,
    0
  );

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-gradient-to-r from-[#1e1b4b] via-[#5E2B9D] to-[#5E2B9D] rounded-3xl p-6 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-white/10 backdrop-blur-md">
              <FolderPlus className="w-5 h-5 text-purple-200" />
            </span>
            <h2 className="text-xl font-bold tracking-tight text-white">
              Categories & Sub-Categories Master
            </h2>
          </div>
          <p className="text-xs text-purple-200 mt-1 max-w-xl">
            Manage therapeutic classes and their sub-classifications. Any category or subcategory added here instantly populates the dropdowns in the Add Medicine form!
          </p>
        </div>

        <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/15">
          <div className="text-center px-3 border-r border-white/20">
            <p className="text-[11px] text-purple-200">Categories</p>
            <p className="text-xl font-black text-white">{categories.length}</p>
          </div>
          <div className="text-center px-3">
            <p className="text-[11px] text-purple-200">Sub-Categories</p>
            <p className="text-xl font-black text-emerald-300">
              {totalSubCategories}
            </p>
          </div>
        </div>
      </div>

      {/* Grid: Left = Add New Category Form, Right = Categories List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Add Category Form (4 cols) */}
        <div className="lg:col-span-4">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs sticky top-24 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <span className="w-2.5 h-2.5 rounded-full bg-[#5E2B9D]"></span>
              <h3 className="text-sm font-bold text-slate-900">
                + Create New Category
              </h3>
            </div>

            <form onSubmit={handleCreateCategory} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Category Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Ophthalmology, Nephrology, Oncology"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-[#5E2B9D] text-slate-900 text-xs font-medium"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief clinical purpose or therapeutic description"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-[#5E2B9D] text-slate-800 text-xs resize-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Initial Sub-Categories (Comma-separated)
                </label>
                <input
                  type="text"
                  value={subCategoriesInput}
                  onChange={(e) => setSubCategoriesInput(e.target.value)}
                  placeholder="e.g. Beta Blockers, ARBs, Statins"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-[#5E2B9D] text-slate-800 text-xs"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Separate multiple subcategories with commas
                </span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Badge Color Theme
                </label>
                <div className="flex items-center gap-2">
                  {colorOptions.map((c) => (
                    <button
                      key={c.label}
                      type="button"
                      onClick={() => setSelectedColor(c.val)}
                      className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-all ${c.val} ${
                        selectedColor === c.val ? "ring-2 ring-purple-600 ring-offset-1 scale-105" : "opacity-75 hover:opacity-100"
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-[#5E2B9D] hover:bg-[#4D2382] text-white font-bold text-xs shadow-md shadow-purple-900/10 flex items-center justify-center gap-2 transition-all mt-2"
              >
                <Plus className="w-4 h-4" />
                <span>Save Category</span>
              </button>
            </form>
          </div>
        </div>

        {/* Existing Categories List & Sub-categories Management (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          
          {/* Search Bar */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-3 shadow-xs flex items-center gap-3">
            <Search className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search category or subcategory name..."
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

          {/* Categories Grid */}
          <div className="space-y-4">
            {filteredCategories.map((cat) => {
              const medicinesInThisCategory = medicines.filter(
                (m) => m.category.toLowerCase() === cat.name.toLowerCase()
              );

              return (
                <div
                  key={cat.id}
                  className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:border-purple-200 transition-all space-y-4"
                >
                  {/* Category Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`px-3 py-1 rounded-xl text-xs font-bold border ${cat.badgeColor || "bg-purple-50 text-purple-700 border-purple-200"}`}
                      >
                        {cat.name}
                      </span>
                      <span className="text-[11px] text-slate-500 font-medium bg-slate-100 px-2 py-0.5 rounded-lg">
                        {medicinesInThisCategory.length} Medicines
                      </span>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <button
                        type="button"
                        onClick={() => setActiveAddingSubId(activeAddingSubId === cat.id ? null : cat.id)}
                        className="text-xs text-[#5E2B9D] hover:bg-purple-50 font-semibold px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 border border-purple-200"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Sub Category</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Delete category "${cat.name}" and its subcategories?`)) {
                            onDeleteCategory(cat.id);
                          }
                        }}
                        className="w-7 h-7 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors"
                        title="Delete Category"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Description */}
                  {cat.description && (
                    <p className="text-xs text-slate-500 leading-relaxed">
                      {cat.description}
                    </p>
                  )}

                  {/* Inline Add Sub Category Box if active */}
                  {activeAddingSubId === cat.id && (
                    <div className="p-3 bg-purple-50/60 rounded-xl border border-purple-200 flex items-center gap-2 animate-in fade-in">
                      <input
                        type="text"
                        value={newSubText}
                        onChange={(e) => setNewSubText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleInlineAddSub(cat.id);
                          }
                        }}
                        placeholder="Enter subcategory name..."
                        className="w-full text-xs px-3 py-1.5 rounded-lg border border-purple-300 focus:outline-none bg-white text-slate-800"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => handleInlineAddSub(cat.id)}
                        className="px-3 py-1.5 rounded-lg bg-[#5E2B9D] text-white text-xs font-semibold shrink-0"
                      >
                        Add
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveAddingSubId(null)}
                        className="px-2 py-1.5 rounded-lg text-slate-500 text-xs font-medium hover:bg-slate-100"
                      >
                        Cancel
                      </button>
                    </div>
                  )}

                  {/* Subcategories Tags */}
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                      Sub-Categories ({cat.subCategories.length})
                    </span>
                    <div className="flex flex-wrap items-center gap-2">
                      {cat.subCategories.map((sub) => (
                        <span
                          key={sub}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200 group"
                        >
                          <Tag className="w-3 h-3 text-slate-400" />
                          <span>{sub}</span>
                          <button
                            type="button"
                            onClick={() => onDeleteSubCategory(cat.id, sub)}
                            className="text-slate-400 hover:text-rose-500 transition-colors ml-0.5"
                            title={`Remove ${sub}`}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </span>
                      ))}

                      {cat.subCategories.length === 0 && (
                        <span className="text-xs text-slate-400 italic">
                          No subcategories added yet. Click &quot;Add Sub Category&quot; above.
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredCategories.length === 0 && (
              <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center text-slate-500">
                <Layers className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-700">
                  {searchTerm ? "No matching categories found" : "No categories created yet"}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {searchTerm ? "Try adjusting your search query." : "Fill out the form on the left to add your first therapeutic category."}
                </p>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
