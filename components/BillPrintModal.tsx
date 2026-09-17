"use client";

import React, { useState } from "react";
import {
  Printer,
  Receipt,
  FileText,
  X,
  CheckCircle2,
  Download,
  Share2,
  Sparkles,
} from "lucide-react";
import { PharmacySettings } from "@/lib/pharmacy-settings";

export interface BillItem {
  id: string;
  medicineId: string;
  name: string;
  genericName?: string;
  batchNumber?: string;
  expiryDate?: string;
  unitType: "sheet" | "loose";
  unitsPerSheet: number;
  quantity: number;
  rate: number;
  amount: number;
}

export interface BillInvoice {
  invoiceNo: string;
  date: string;
  time: string;
  customerName: string;
  customerPhone?: string;
  doctorName?: string;
  items: BillItem[];
  subtotal: number;
  discountType: "rupees" | "percent";
  discountValue: number;
  discountAmount: number;
  taxableAmount: number;
  gstEnabled: boolean;
  gstPercentage: number;
  cgstPercentage: number;
  sgstPercentage: number;
  cgstAmount: number;
  sgstAmount: number;
  totalGstAmount: number;
  roundOff: number;
  grandTotal: number;
  paymentMethod: "UPI" | "Cash" | "Card" | "Split";
  cashTendered?: number;
  changeDue?: number;
  splitDetails?: { cash: number; online: number };
  transactionRef?: string;
  pharmacyId?: string;
}

interface BillPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: BillInvoice | null;
  settings: PharmacySettings;
  onStartNewBill: () => void;
}

export default function BillPrintModal({
  isOpen,
  onClose,
  invoice,
  settings,
  onStartNewBill,
}: BillPrintModalProps) {
  const [printFormat, setPrintFormat] = useState<"thermal" | "a5">("thermal");

  if (!isOpen || !invoice) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in">
      {/* Modal Container */}
      <div className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[95vh] my-auto">
        
        {/* Modal Top Bar (Hidden during Print) */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-[#1e1b4b] to-[#5E2B9D] text-white flex items-center justify-between shrink-0 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">
                  Bill Settled Successfully!
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-emerald-300 border border-white/20">
                  {invoice.invoiceNo}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Choose print format: 3-inch Thermal Slip or A5 Tax Invoice
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

        {/* Format Selector Bar (Hidden during Print) */}
        <div className="px-6 py-3 bg-slate-100/80 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700">Print Format:</span>
            <div className="inline-flex p-1 rounded-xl bg-white border border-slate-200 shadow-2xs">
              <button
                type="button"
                onClick={() => setPrintFormat("thermal")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  printFormat === "thermal"
                    ? "bg-[#5E2B9D] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>Thermal (3-inch / 80mm)</span>
              </button>
              <button
                type="button"
                onClick={() => setPrintFormat("a5")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  printFormat === "a5"
                    ? "bg-[#5E2B9D] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>A5 Tax Invoice</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-700/20 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print {printFormat === "thermal" ? "Thermal Slip" : "A5 Bill"}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onStartNewBill();
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#5E2B9D] hover:bg-[#4D2382] text-white text-xs font-bold transition-all cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>+ New Bill</span>
            </button>
          </div>
        </div>

        {/* Printable Area */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-50 flex justify-center">
          
          {/* 1. THERMAL PRINT PREVIEW (80mm / 300px) */}
          {printFormat === "thermal" && (
            <div
              id="thermal-receipt"
              className="bg-white p-5 w-full max-w-[340px] border border-slate-300 shadow-md font-mono text-[11px] text-slate-900 space-y-2 select-text"
            >
              {/* Thermal Header */}
              <div className="text-center border-b border-dashed border-slate-400 pb-2.5">
                <h2 className="text-sm font-black uppercase tracking-tight text-slate-950">
                  {settings.pharmacyName}
                </h2>
                {settings.tagline && (
                  <p className="text-[9px] text-slate-500 italic mt-0.5">
                    {settings.tagline}
                  </p>
                )}
                <p className="text-[10px] text-slate-700 leading-snug mt-1">
                  {settings.address}
                </p>
                <p className="text-[10px] text-slate-700 mt-0.5">
                  Ph: {settings.phone}
                </p>
                {settings.email && (
                  <p className="text-[9px] text-slate-600">
                    Email: {settings.email}
                  </p>
                )}
                {settings.drugLicenseNo && (
                  <p className="text-[9px] text-slate-600 mt-0.5">
                    DL: {settings.drugLicenseNo}
                  </p>
                )}
                {invoice.gstEnabled && settings.gstNumber && (
                  <p className="text-[10px] font-bold text-slate-900 mt-1">
                    GSTIN: {settings.gstNumber}
                  </p>
                )}
                <div className="pt-1.5 text-[9px] font-bold uppercase tracking-widest text-slate-500">
                  *** CASH / RETAIL INVOICE ***
                </div>
              </div>

              {/* Invoice Metadata */}
              <div className="text-[10px] space-y-0.5 border-b border-dashed border-slate-400 py-1.5">
                <div className="flex justify-between">
                  <span>Bill No: <strong>{invoice.invoiceNo}</strong></span>
                  <span>Date: {invoice.date}</span>
                </div>
                <div className="flex justify-between">
                  <span>Time: {invoice.time}</span>
                  <span>Pay: <strong>{invoice.paymentMethod}</strong></span>
                </div>
                <div className="flex justify-between">
                  <span>Patient: <strong>{invoice.customerName}</strong></span>
                  {invoice.customerPhone && <span>Mob: {invoice.customerPhone}</span>}
                </div>
                {invoice.doctorName && (
                  <div>Dr: {invoice.doctorName}</div>
                )}
              </div>

              {/* Items Table */}
              <div className="border-b border-dashed border-slate-400 py-1.5 space-y-1">
                <div className="flex justify-between font-bold text-[10px] border-b border-slate-200 pb-1">
                  <span className="w-1/2">ITEM</span>
                  <span className="w-1/4 text-center">QTY</span>
                  <span className="w-1/4 text-right">AMT (₹)</span>
                </div>
                {invoice.items.map((it, idx) => (
                  <div key={idx} className="flex justify-between text-[10px] leading-tight">
                    <div className="w-1/2 pr-1">
                      <span className="font-bold block">{it.name}</span>
                      {it.batchNumber && (
                        <span className="text-[9px] text-slate-500 block">
                          B:{it.batchNumber} {it.expiryDate ? `E:${it.expiryDate}` : ""}
                        </span>
                      )}
                    </div>
                    <div className="w-1/4 text-center text-[10px]">
                      {it.quantity} {it.unitType === "sheet" ? "sh" : "pcs"}
                    </div>
                    <div className="w-1/4 text-right font-medium">
                      {it.amount.toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals & Tax Breakup */}
              <div className="space-y-1 pt-1 text-[10px] text-slate-800">
                <div className="flex justify-between">
                  <span>Items Total:</span>
                  <span>₹{invoice.subtotal.toFixed(2)}</span>
                </div>

                {invoice.discountAmount > 0 && (
                  <div className="flex justify-between text-rose-700 font-medium">
                    <span>
                      Discount ({invoice.discountType === "percent" ? `${invoice.discountValue}%` : "Flat"}):
                    </span>
                    <span>- ₹{invoice.discountAmount.toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between font-medium">
                  <span>Taxable Subtotal:</span>
                  <span>₹{invoice.taxableAmount.toFixed(2)}</span>
                </div>

                {invoice.gstEnabled ? (
                  <>
                    <div className="flex justify-between text-slate-600">
                      <span>CGST ({invoice.cgstPercentage}%):</span>
                      <span>₹{invoice.cgstAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>SGST ({invoice.sgstPercentage}%):</span>
                      <span>₹{invoice.sgstAmount.toFixed(2)}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between text-slate-400">
                    <span>GST:</span>
                    <span>Exempt</span>
                  </div>
                )}

                {invoice.roundOff !== 0 && (
                  <div className="flex justify-between text-slate-500">
                    <span>Round Off:</span>
                    <span>{invoice.roundOff > 0 ? `+₹${invoice.roundOff}` : `-₹${Math.abs(invoice.roundOff)}`}</span>
                  </div>
                )}

                <div className="flex justify-between text-xs font-black text-slate-950 pt-1.5 border-t-2 border-slate-900">
                  <span>GRAND TOTAL:</span>
                  <span>₹{invoice.grandTotal.toFixed(2)}</span>
                </div>

                {/* Cash Tendered info */}
                {invoice.paymentMethod === "Cash" && invoice.cashTendered ? (
                  <div className="pt-1 text-[9px] text-slate-600 border-t border-slate-200 space-y-0.5">
                    <div className="flex justify-between">
                      <span>Cash Tendered:</span>
                      <span>₹{invoice.cashTendered.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-slate-900">
                      <span>Change Return:</span>
                      <span>₹{(invoice.changeDue || 0).toFixed(2)}</span>
                    </div>
                  </div>
                ) : null}

                {invoice.paymentMethod === "Split" && invoice.splitDetails ? (
                  <div className="pt-1 text-[9px] text-slate-600 border-t border-slate-200 space-y-0.5">
                    <div className="flex justify-between">
                      <span>Cash Paid:</span>
                      <span>₹{invoice.splitDetails.cash.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Online / UPI:</span>
                      <span>₹{invoice.splitDetails.online.toFixed(2)}</span>
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Thermal Footer */}
              <div className="text-center pt-3 border-t border-dashed border-slate-400 text-[9px] text-slate-500 space-y-1">
                <p className="font-bold text-slate-800">*** GET WELL SOON ***</p>
                <p>Medicines once sold cannot be taken back or exchanged without original cash receipt.</p>
                {settings.pharmacistName && (
                  <p className="text-[8px] text-slate-600 pt-1">{settings.pharmacistName}</p>
                )}
                <p className="text-[8px] text-slate-400">Powered by PharmacyNext POS</p>
              </div>
            </div>
          )}

          {/* 2. A5 TAX INVOICE PREVIEW */}
          {printFormat === "a5" && (
            <div
              id="a5-invoice"
              className="bg-white p-7 w-full max-w-2xl border border-slate-300 shadow-md text-slate-900 text-xs select-text space-y-4 font-sans"
            >
              {/* Header */}
              <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4">
                <div className="max-w-md">
                  <h2 className="text-xl font-black text-slate-950 uppercase tracking-tight">
                    {settings.pharmacyName}
                  </h2>
                  {settings.tagline && (
                    <p className="text-xs text-purple-800 font-semibold mt-0.5">
                      {settings.tagline}
                    </p>
                  )}
                  <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                    {settings.address}
                  </p>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    <strong>Phone:</strong> {settings.phone} | <strong>Email:</strong> {settings.email}
                  </p>
                  {settings.drugLicenseNo && (
                    <p className="text-[11px] text-slate-700 font-medium">
                      <strong>Drug License:</strong> {settings.drugLicenseNo}
                    </p>
                  )}
                </div>

                <div className="text-right">
                  <span className="inline-block px-3 py-1 rounded-md bg-purple-900 text-white font-extrabold text-xs tracking-wider uppercase">
                    Tax Invoice
                  </span>
                  {invoice.gstEnabled && settings.gstNumber && (
                    <div className="mt-2 text-[11px]">
                      <span className="text-slate-500 block">GSTIN:</span>
                      <strong className="text-slate-900 font-mono text-xs">{settings.gstNumber}</strong>
                    </div>
                  )}
                </div>
              </div>

              {/* Patient & Invoice Meta Grid */}
              <div className="grid grid-cols-2 gap-4 p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Billed To (Patient):</span>
                  <strong className="text-sm text-slate-900">{invoice.customerName}</strong>
                  {invoice.customerPhone && (
                    <p className="text-slate-600 text-[11px] mt-0.5">Mobile: {invoice.customerPhone}</p>
                  )}
                  {invoice.doctorName && (
                    <p className="text-slate-700 text-[11px] mt-0.5">Doctor: <strong>{invoice.doctorName}</strong></p>
                  )}
                </div>

                <div className="text-right space-y-1">
                  <div>
                    <span className="text-slate-500">Invoice No: </span>
                    <strong className="text-slate-900 font-mono">{invoice.invoiceNo}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Invoice Date: </span>
                    <strong className="text-slate-900">{invoice.date} {invoice.time}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Payment Mode: </span>
                    <span className="px-2 py-0.5 rounded bg-white font-bold border border-slate-200 text-slate-800">
                      {invoice.paymentMethod}
                    </span>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3 w-8">#</th>
                      <th className="py-2.5 px-3">Medicine Description</th>
                      <th className="py-2.5 px-3">Batch &amp; Exp</th>
                      <th className="py-2.5 px-3 text-center">Packaging</th>
                      <th className="py-2.5 px-3 text-center">Qty</th>
                      <th className="py-2.5 px-3 text-right">Rate</th>
                      <th className="py-2.5 px-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-[11px]">
                    {invoice.items.map((it, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-2 px-3 text-slate-400 font-medium">{idx + 1}</td>
                        <td className="py-2 px-3">
                          <strong className="text-slate-900 block">{it.name}</strong>
                          {it.genericName && (
                            <span className="text-[10px] text-slate-500 block">{it.genericName}</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-slate-600 font-mono text-[10px]">
                          {it.batchNumber || "N/A"} <br />
                          {it.expiryDate ? `Exp: ${it.expiryDate}` : ""}
                        </td>
                        <td className="py-2 px-3 text-center text-slate-500">
                          {it.unitType === "sheet" ? `${it.unitsPerSheet}/sheet` : "Loose Tablet"}
                        </td>
                        <td className="py-2 px-3 text-center font-bold text-slate-800">
                          {it.quantity} {it.unitType === "sheet" ? "Sheets" : "Pcs"}
                        </td>
                        <td className="py-2 px-3 text-right text-slate-700">₹{it.rate.toFixed(2)}</td>
                        <td className="py-2 px-3 text-right font-bold text-slate-900">₹{it.amount.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Financial Calculation Block */}
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[10px] space-y-1 text-slate-600">
                  <span className="font-bold text-slate-800 block text-xs">Terms &amp; Conditions:</span>
                  <p>1. Certified that all medicines supplied are genuine and stored properly.</p>
                  <p>2. Subject to local jurisdiction only.</p>
                  <p>3. Goods once sold will not be returned without original cash invoice.</p>
                  <div className="pt-2 text-slate-400 text-[9px]">
                    E. &amp; O.E.
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-right">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Subtotal:</span>
                    <span className="font-semibold text-slate-800">₹{invoice.subtotal.toFixed(2)}</span>
                  </div>

                  {invoice.discountAmount > 0 && (
                    <div className="flex justify-between text-rose-600">
                      <span>Discount ({invoice.discountType === "percent" ? `${invoice.discountValue}%` : "Flat"}):</span>
                      <span className="font-semibold">- ₹{invoice.discountAmount.toFixed(2)}</span>
                    </div>
                  )}

                  <div className="flex justify-between font-medium">
                    <span className="text-slate-600">Taxable Amount:</span>
                    <span className="text-slate-900">₹{invoice.taxableAmount.toFixed(2)}</span>
                  </div>

                  {invoice.gstEnabled ? (
                    <>
                      <div className="flex justify-between text-slate-600 text-[11px]">
                        <span>CGST ({invoice.cgstPercentage}%):</span>
                        <span>₹{invoice.cgstAmount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-slate-600 text-[11px]">
                        <span>SGST ({invoice.sgstPercentage}%):</span>
                        <span>₹{invoice.sgstAmount.toFixed(2)}</span>
                      </div>
                    </>
                  ) : null}

                  {invoice.roundOff !== 0 && (
                    <div className="flex justify-between text-slate-500 text-[11px]">
                      <span>Round Off:</span>
                      <span>{invoice.roundOff > 0 ? `+₹${invoice.roundOff}` : `-₹${Math.abs(invoice.roundOff)}`}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-sm font-black text-slate-900 pt-2 border-t border-slate-300">
                    <span>Grand Total:</span>
                    <span className="text-purple-950">₹{invoice.grandTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Signatures */}
              <div className="pt-6 flex items-end justify-between text-[11px] text-slate-500 border-t border-dashed border-slate-300">
                <div>
                  <p>Customer Signature</p>
                </div>
                <div className="text-right">
                  <div className="h-10"></div>
                  <p className="font-bold text-slate-800">For {settings.pharmacyName}</p>
                  <p className="text-[10px] text-slate-500">Authorized Signatory / Regd. Pharmacist</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer (Hidden during Print) */}
        <div className="px-6 py-4 bg-white border-t border-slate-100 flex items-center justify-between shrink-0 print:hidden">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold text-xs transition-colors cursor-pointer"
          >
            Close
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-700/20 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print {printFormat === "thermal" ? "Thermal Slip" : "A5 Invoice"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
