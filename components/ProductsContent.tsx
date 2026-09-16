"use client";

import React, { useState } from "react";
import {
  Plus,
  Filter,
  Download,
  Box,
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
  LayoutGrid,
  Check,
  Search,
} from "lucide-react";
import AddProductModal, { ProductItem } from "./AddProductModal";

const initialProducts: ProductItem[] = [
  {
    id: "PRD-0001",
    name: "Milk Cake",
    sku: "PRD-0001",
    category: "Cakes & Bakery",
    brand: "Bakers World",
    unit: "Kg",
    sellingPrice: "₹ 600.00",
    costPrice: "₹ 420.00",
    stock: "25.00",
    status: "Active",
    addedOn: "25 May 2025",
    imageEmoji: "🍰",
  },
  {
    id: "PRD-0002",
    name: "Gulab Jamun",
    sku: "PRD-0002",
    category: "Sweets",
    brand: "Sweet Delights",
    unit: "Kg",
    sellingPrice: "₹ 400.00",
    costPrice: "₹ 280.00",
    stock: "18.00",
    status: "Active",
    addedOn: "24 May 2025",
    imageEmoji: "🟤",
  },
  {
    id: "PRD-0003",
    name: "Rasgulla",
    sku: "PRD-0003",
    category: "Sweets",
    brand: "Sweet Delights",
    unit: "Kg",
    sellingPrice: "₹ 380.00",
    costPrice: "₹ 250.00",
    stock: "0.00",
    status: "Out of Stock",
    addedOn: "24 May 2025",
    imageEmoji: "⚪",
  },
  {
    id: "PRD-0004",
    name: "Mysore Pak",
    sku: "PRD-0004",
    category: "Sweets",
    brand: "Sweet Delights",
    unit: "Kg",
    sellingPrice: "₹ 520.00",
    costPrice: "₹ 350.00",
    stock: "15.00",
    status: "Active",
    addedOn: "23 May 2025",
    imageEmoji: "🧈",
  },
  {
    id: "PRD-0005",
    name: "Badam Halwa",
    sku: "PRD-0005",
    category: "Sweets",
    brand: "Sweet Delights",
    unit: "Kg",
    sellingPrice: "₹ 700.00",
    costPrice: "₹ 480.00",
    stock: "12.00",
    status: "Active",
    addedOn: "23 May 2025",
    imageEmoji: "🍯",
  },
  {
    id: "PRD-0006",
    name: "Samosa",
    sku: "PRD-0006",
    category: "Snacks",
    brand: "Tasty Bites",
    unit: "Piece",
    sellingPrice: "₹ 20.00",
    costPrice: "₹ 12.00",
    stock: "150.00",
    status: "Active",
    addedOn: "22 May 2025",
    imageEmoji: "🥟",
  },
  {
    id: "PRD-0007",
    name: "Coca Cola 500ml",
    sku: "PRD-0007",
    category: "Beverages",
    brand: "Coca Cola",
    unit: "Bottle",
    sellingPrice: "₹ 40.00",
    costPrice: "₹ 28.00",
    stock: "60.00",
    status: "Active",
    addedOn: "22 May 2025",
    imageEmoji: "🥤",
  },
  {
    id: "PRD-0008",
    name: "Bisleri Water 1L",
    sku: "PRD-0008",
    category: "Beverages",
    brand: "Bisleri",
    unit: "Bottle",
    sellingPrice: "₹ 20.00",
    costPrice: "₹ 12.00",
    stock: "80.00",
    status: "Active",
    addedOn: "21 May 2025",
    imageEmoji: "💧",
  },
  {
    id: "PRD-0009",
    name: "Aashirvaad Atta 1kg",
    sku: "PRD-0009",
    category: "Grocery",
    brand: "Aashirvaad",
    unit: "Packet",
    sellingPrice: "₹ 60.00",
    costPrice: "₹ 40.00",
    stock: "35.00",
    status: "Active",
    addedOn: "21 May 2025",
    imageEmoji: "🌾",
  },
  {
    id: "PRD-0010",
    name: "Sugar 1kg",
    sku: "PRD-0010",
    category: "Grocery",
    brand: "Tata",
    unit: "Packet",
    sellingPrice: "₹ 45.00",
    costPrice: "₹ 30.00",
    stock: "22.00",
    status: "Active",
    addedOn: "20 May 2025",
    imageEmoji: "🧂",
  },
];

export default function ProductsContent() {
  const [products, setProducts] = useState<ProductItem[]>(initialProducts);
  const [activeTab, setActiveTab] = useState<"all" | "active" | "inactive">("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const [filterCategory, setFilterCategory] = useState("All");

  // Filtered list based on active tab and category
  const filteredProducts = products.filter((p) => {
    if (activeTab === "active" && p.status !== "Active") return false;
    if (activeTab === "inactive" && p.status !== "Out of Stock") return false;
    if (filterCategory !== "All" && p.category !== filterCategory) return false;
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

  const handleAddProduct = (newProd: ProductItem) => {
    setProducts((prev) => [newProd, ...prev]);
  };

  const handleDelete = (id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
    setSelectedIds((prev) => prev.filter((item) => item !== id));
  };

  return (
    <div>
      {/* Top Header Row: Title and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Medicines</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage all your medicines and pharmacy inventory
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-3">
          {/* Filter */}
          <button
            onClick={() => setShowFilterDrawer(!showFilterDrawer)}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-colors ${
              showFilterDrawer
                ? "bg-purple-50 text-[#581c87] border-purple-200"
                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Filter</span>
          </button>

          {/* Export */}
          <button
            onClick={() => alert("Exporting medicines database to CSV...")}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export</span>
          </button>

          {/* + Add Medicine */}
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-[#581c87] hover:bg-[#431c8c] text-white shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Medicine</span>
          </button>
        </div>
      </div>

      {/* Filter drawer popup if toggled */}
      {showFilterDrawer && (
        <div className="mb-6 p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-4 text-xs animate-in fade-in">
          <span className="font-semibold text-slate-700">Filter by Category:</span>
          {["All", "Cakes & Bakery", "Sweets", "Snacks", "Beverages", "Grocery"].map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                filterCategory === cat
                  ? "bg-[#581c87] text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* 4 Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
        {/* Total Products */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center gap-4">
          <div className="w-13 h-13 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center shrink-0 border border-emerald-100">
            <Box className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Total Products</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-0.5">2,350</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">All Products</p>
          </div>
        </div>

        {/* Low Stock */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center gap-4">
          <div className="w-13 h-13 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center shrink-0 border border-blue-100">
            <Box className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Low Stock</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-0.5">120</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Products</p>
          </div>
        </div>

        {/* Out of Stock */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center gap-4">
          <div className="w-13 h-13 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center shrink-0 border border-amber-100">
            <AlertCircle className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Out of Stock</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-0.5">18</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Products</p>
          </div>
        </div>

        {/* Total Value */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center gap-4">
          <div className="w-13 h-13 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-100">
            <IndianRupee className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Total Value</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-0.5">₹ 25,68,450.00</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Stock Value</p>
          </div>
        </div>
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
              All Products
            </button>
            <button
              onClick={() => setActiveTab("active")}
              className={`text-xs font-semibold pb-3 border-b-2 transition-colors relative ${
                activeTab === "active"
                  ? "border-[#581c87] text-[#581c87]"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              Active Products
            </button>
            <button
              onClick={() => setActiveTab("inactive")}
              className={`text-xs font-semibold pb-3 border-b-2 transition-colors relative ${
                activeTab === "inactive"
                  ? "border-[#581c87] text-[#581c87]"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              Inactive Products
            </button>
          </div>

          {/* Right Counts & Page Size Dropdown */}
          <div className="flex items-center gap-3 text-xs text-slate-500 pb-2 sm:pb-0">
            <span>Showing 1 to {filteredProducts.length} of 2,350 products</span>
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-700 cursor-pointer">
              <span>10</span>
              <span className="text-[10px]">▼</span>
            </div>
            <button
              type="button"
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
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
                  <div className="flex items-center gap-1.5 cursor-pointer hover:text-slate-900">
                    <span>Product Name</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-3">
                  <div className="flex items-center gap-1.5 cursor-pointer hover:text-slate-900">
                    <span>SKU</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-3">
                  <div className="flex items-center gap-1.5 cursor-pointer hover:text-slate-900">
                    <span>Category</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-3">
                  <div className="flex items-center gap-1.5 cursor-pointer hover:text-slate-900">
                    <span>Brand</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-3">
                  <div className="flex items-center gap-1.5 cursor-pointer hover:text-slate-900">
                    <span>Unit</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-3">
                  <div className="flex items-center gap-1.5 cursor-pointer hover:text-slate-900">
                    <span>Selling Price</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-3">
                  <div className="flex items-center gap-1.5 cursor-pointer hover:text-slate-900">
                    <span>Cost Price</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-3">
                  <div className="flex items-center gap-1.5 cursor-pointer hover:text-slate-900">
                    <span>Stock</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-3">
                  <div className="flex items-center gap-1.5 cursor-pointer hover:text-slate-900">
                    <span>Status</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-3">
                  <div className="flex items-center gap-1.5 cursor-pointer hover:text-slate-900">
                    <span>Added On</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filteredProducts.map((prod) => {
                const isSelected = selectedIds.includes(prod.id);
                const isOutOfStock = prod.status === "Out of Stock";

                return (
                  <tr
                    key={prod.id}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      isSelected ? "bg-purple-50/40" : ""
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="py-3 px-4">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectOne(prod.id)}
                        className="w-4 h-4 rounded border-slate-300 text-[#581c87] focus:ring-[#581c87]"
                      />
                    </td>

                    {/* Product Name + Thumbnail */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center text-base shrink-0 shadow-xs">
                          {prod.imageEmoji}
                        </div>
                        <span className="font-semibold text-slate-800 hover:text-[#581c87] cursor-pointer">
                          {prod.name}
                        </span>
                      </div>
                    </td>

                    {/* SKU */}
                    <td className="py-3 px-3 text-slate-500 font-medium">{prod.sku}</td>

                    {/* Category */}
                    <td className="py-3 px-3 text-slate-600 font-medium">{prod.category}</td>

                    {/* Brand */}
                    <td className="py-3 px-3 text-slate-600 font-medium">{prod.brand}</td>

                    {/* Unit */}
                    <td className="py-3 px-3 text-slate-600 font-medium">{prod.unit}</td>

                    {/* Selling Price */}
                    <td className="py-3 px-3 font-semibold text-slate-800">
                      {prod.sellingPrice}
                    </td>

                    {/* Cost Price */}
                    <td className="py-3 px-3 text-slate-600 font-medium">
                      {prod.costPrice}
                    </td>

                    {/* Stock */}
                    <td
                      className={`py-3 px-3 font-semibold ${
                        isOutOfStock ? "text-rose-500" : "text-emerald-600"
                      }`}
                    >
                      {prod.stock}
                    </td>

                    {/* Status Pill */}
                    <td className="py-3 px-3">
                      {isOutOfStock ? (
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-500 border border-rose-100">
                          Out of Stock
                        </span>
                      ) : (
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-600 border border-emerald-100">
                          Active
                        </span>
                      )}
                    </td>

                    {/* Added On */}
                    <td className="py-3 px-3 text-slate-500 whitespace-nowrap">
                      {prod.addedOn}
                    </td>

                    {/* Action buttons */}
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          aria-label="View product"
                          onClick={() => alert(`Product Details for ${prod.name}`)}
                          className="w-7 h-7 rounded-lg text-purple-600 hover:bg-purple-50 flex items-center justify-center transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          aria-label="Edit product"
                          onClick={() => alert(`Edit Product: ${prod.name}`)}
                          className="w-7 h-7 rounded-lg text-blue-500 hover:bg-blue-50 flex items-center justify-center transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          aria-label="Delete product"
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
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 select-none">
          <span className="text-xs text-slate-500">
            Showing 1 to {filteredProducts.length} of 2,350 products
          </span>

          <div className="flex items-center gap-1.5">
            {/* First Page */}
            <button
              onClick={() => setCurrentPage(1)}
              aria-label="First page"
              className="w-7 h-7 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-50 flex items-center justify-center text-xs transition-colors"
            >
              <ChevronsLeft className="w-3.5 h-3.5" />
            </button>

            {/* Prev */}
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              aria-label="Previous page"
              className="w-7 h-7 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-50 flex items-center justify-center text-xs transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            {/* Page 1 (Active) */}
            <button
              onClick={() => setCurrentPage(1)}
              className={`w-7 h-7 rounded-lg text-xs font-semibold flex items-center justify-center transition-colors ${
                currentPage === 1
                  ? "bg-[#581c87] text-white shadow-xs"
                  : "border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              1
            </button>

            {/* Page 2 */}
            <button
              onClick={() => setCurrentPage(2)}
              className={`w-7 h-7 rounded-lg text-xs font-semibold flex items-center justify-center transition-colors ${
                currentPage === 2
                  ? "bg-[#581c87] text-white shadow-xs"
                  : "border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              2
            </button>

            {/* Page 3 */}
            <button
              onClick={() => setCurrentPage(3)}
              className={`w-7 h-7 rounded-lg text-xs font-semibold flex items-center justify-center transition-colors ${
                currentPage === 3
                  ? "bg-[#581c87] text-white shadow-xs"
                  : "border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              3
            </button>

            {/* Page 4 */}
            <button
              onClick={() => setCurrentPage(4)}
              className={`w-7 h-7 rounded-lg text-xs font-semibold flex items-center justify-center transition-colors ${
                currentPage === 4
                  ? "bg-[#581c87] text-white shadow-xs"
                  : "border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              4
            </button>

            {/* Page 5 */}
            <button
              onClick={() => setCurrentPage(5)}
              className={`w-7 h-7 rounded-lg text-xs font-semibold flex items-center justify-center transition-colors ${
                currentPage === 5
                  ? "bg-[#581c87] text-white shadow-xs"
                  : "border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              5
            </button>

            <span className="text-slate-400 text-xs px-1">...</span>

            {/* Page 235 */}
            <button
              onClick={() => setCurrentPage(235)}
              className={`w-8 h-7 rounded-lg text-xs font-semibold flex items-center justify-center transition-colors ${
                currentPage === 235
                  ? "bg-[#581c87] text-white shadow-xs"
                  : "border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              235
            </button>

            {/* Next */}
            <button
              onClick={() => setCurrentPage((p) => Math.min(235, p + 1))}
              aria-label="Next page"
              className="w-7 h-7 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-50 flex items-center justify-center text-xs transition-colors"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            {/* Last Page */}
            <button
              onClick={() => setCurrentPage(235)}
              aria-label="Last page"
              className="w-7 h-7 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-50 flex items-center justify-center text-xs transition-colors"
            >
              <ChevronsRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Add Product Modal */}
      <AddProductModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddProduct}
      />
    </div>
  );
}
