"use client";

import React, { useState, useEffect } from "react";
import {
  Printer,
  Usb,
  Bluetooth,
  X,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Power,
  Sparkles,
} from "lucide-react";
import {
  ConnectedPrinterInfo,
  getSavedPrinter,
  connectWebUsbPrinter,
  connectWebBluetoothPrinter,
  disconnectPrinter,
} from "@/lib/thermal-printer";

interface PrinterConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPrinterChanged?: (info: ConnectedPrinterInfo | null) => void;
}

export default function PrinterConnectModal({
  isOpen,
  onClose,
  onPrinterChanged,
}: PrinterConnectModalProps) {
  const [currentPrinter, setCurrentPrinter] = useState<ConnectedPrinterInfo | null>(null);
  const [isConnecting, setIsConnecting] = useState<"usb" | "bluetooth" | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setCurrentPrinter(getSavedPrinter());
      setErrorMessage(null);
      setSuccessMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConnectUsb = async () => {
    setIsConnecting("usb");
    setErrorMessage(null);
    setSuccessMessage(null);
    const res = await connectWebUsbPrinter();
    setIsConnecting(null);
    if (res.success) {
      const saved = getSavedPrinter();
      setCurrentPrinter(saved);
      setSuccessMessage(`Connected to USB Printer: ${res.name}`);
      onPrinterChanged?.(saved);
    } else {
      setErrorMessage(res.error || "Failed to connect to USB printer.");
    }
  };

  const handleConnectBluetooth = async () => {
    setIsConnecting("bluetooth");
    setErrorMessage(null);
    setSuccessMessage(null);
    const res = await connectWebBluetoothPrinter();
    setIsConnecting(null);
    if (res.success) {
      const saved = getSavedPrinter();
      setCurrentPrinter(saved);
      setSuccessMessage(`Paired with Bluetooth Printer: ${res.name}`);
      onPrinterChanged?.(saved);
    } else {
      setErrorMessage(res.error || "Failed to connect Bluetooth printer.");
    }
  };

  const handleDisconnect = async () => {
    await disconnectPrinter();
    setCurrentPrinter(null);
    setSuccessMessage("Printer disconnected.");
    onPrinterChanged?.(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-md border border-slate-200 shadow-xl max-w-lg w-full p-6 animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-purple-50 border border-purple-200 text-[#5E2B9D] flex items-center justify-center">
              <Printer className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-medium text-slate-900">Connect Thermal Printer</h3>
              <p className="text-[11px] text-slate-500">ESC/POS 58mm &amp; 80mm receipt printers</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Status Indicator */}
        <div className="mt-4 p-3.5 rounded-md bg-slate-50 border border-slate-200/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-600">Current Status:</span>
            {currentPrinter ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Connected ({currentPrinter.type.toUpperCase()})</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                <span>Not Connected</span>
              </span>
            )}
          </div>

          {currentPrinter && (
            <div className="mt-2.5 pt-2.5 border-t border-slate-200/80 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-xs font-medium text-slate-900 truncate">{currentPrinter.name}</div>
                <div className="text-[10px] text-slate-400">Paired at {currentPrinter.connectedAt}</div>
              </div>
              <button
                type="button"
                onClick={handleDisconnect}
                className="shrink-0 px-2.5 py-1 rounded-md text-xs font-medium text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors cursor-pointer"
              >
                Disconnect
              </button>
            </div>
          )}
        </div>

        {/* Notifications */}
        {errorMessage && (
          <div className="mt-3 p-2.5 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}
        {successMessage && (
          <div className="mt-3 p-2.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Connection Options */}
        <div className="mt-4 space-y-2.5">
          <label className="block text-xs font-medium text-slate-700">Choose Connection Protocol:</label>

          {/* Option 1: WebUSB */}
          <button
            type="button"
            disabled={isConnecting !== null}
            onClick={handleConnectUsb}
            className="w-full p-3.5 rounded-md border border-slate-200 hover:border-[#5E2B9D] hover:bg-purple-50/40 flex items-center justify-between text-left transition-all cursor-pointer group disabled:opacity-50 gap-3"
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-9 h-9 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:bg-purple-100 group-hover:text-[#5E2B9D] transition-colors">
                <Usb className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium text-slate-900 truncate">WebUSB Thermal Printer</div>
                <div className="text-[10px] text-slate-500 truncate">Direct USB cable connection (ESC/POS)</div>
              </div>
            </div>
            {isConnecting === "usb" ? (
              <RefreshCw className="w-4 h-4 text-[#5E2B9D] animate-spin shrink-0" />
            ) : (
              <span className="shrink-0 px-3 py-1.5 rounded-md bg-[#5E2B9D] text-white text-xs font-medium group-hover:bg-[#4D2382] transition-colors shadow-xs">
                Connect
              </span>
            )}
          </button>

          {/* Option 2: Web Bluetooth */}
          <button
            type="button"
            disabled={isConnecting !== null}
            onClick={handleConnectBluetooth}
            className="w-full p-3.5 rounded-md border border-slate-200 hover:border-[#5E2B9D] hover:bg-purple-50/40 flex items-center justify-between text-left transition-all cursor-pointer group disabled:opacity-50 gap-3"
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-9 h-9 rounded-md bg-purple-50 text-[#5E2B9D] flex items-center justify-center shrink-0 group-hover:bg-purple-100 transition-colors">
                <Bluetooth className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium text-slate-900 truncate">Web Bluetooth Thermal Printer</div>
                <div className="text-[10px] text-slate-500 truncate">Wireless Bluetooth portable receipt printer</div>
              </div>
            </div>
            {isConnecting === "bluetooth" ? (
              <RefreshCw className="w-4 h-4 text-[#5E2B9D] animate-spin shrink-0" />
            ) : (
              <span className="shrink-0 px-3 py-1.5 rounded-md bg-[#5E2B9D] text-white text-xs font-medium group-hover:bg-[#4D2382] transition-colors shadow-xs">
                Pair
              </span>
            )}
          </button>
        </div>

        {/* Footer info note */}
        <p className="text-[10px] text-slate-400 mt-4 leading-relaxed">
          Supports any standard ESC/POS thermal printer (e.g. TVS, Epson, Posiflex, Retsol, Bluetags, Everycom).
          Standard browser printing dialog is also always available on bill settlement.
        </p>

        <div className="mt-5 pt-3 border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
