"use client";

export type ThermalPaperWidth = "auto" | "80mm" | "58mm";

export interface ConnectedPrinterInfo {
  type: "usb" | "bluetooth" | "browser";
  name: string;
  connectedAt: string;
  paperWidth?: ThermalPaperWidth;
}

// Helper to mask phone numbers on thermal slips (e.g. 9876543210 -> 98XXXXXX10)
export function maskPhoneNumber(phone?: string): string {
  if (!phone) return "";
  const cleaned = phone.replace(/[^0-9]/g, "");
  if (cleaned.length < 5) return phone;
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 2)}XXXXXX${cleaned.slice(8)}`;
  }
  const prefix = cleaned.slice(0, 2);
  const suffix = cleaned.slice(-2);
  const maskedCount = Math.max(3, cleaned.length - 4);
  return `${prefix}${"X".repeat(maskedCount)}${suffix}`;
}

const PRINTER_STORAGE_KEY = "pharmacynext_connected_printer";
export const THERMAL_PAPER_WIDTH_KEY = "pharmacynext_thermal_paper_width";

export function getSavedThermalPaperWidth(): ThermalPaperWidth {
  if (typeof window === "undefined") return "auto";
  try {
    const saved = localStorage.getItem(THERMAL_PAPER_WIDTH_KEY);
    if (saved === "80mm" || saved === "58mm" || saved === "auto") {
      return saved;
    }
  } catch {}
  return "auto";
}

export function saveThermalPaperWidth(width: ThermalPaperWidth) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(THERMAL_PAPER_WIDTH_KEY, width);
  } catch {}
}

export function getSavedPrinter(): ConnectedPrinterInfo | null {
  if (typeof window === "undefined") return null;
  try {
    const saved = localStorage.getItem(PRINTER_STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

export function savePrinter(printer: ConnectedPrinterInfo | null) {
  if (typeof window === "undefined") return;
  try {
    if (!printer) {
      localStorage.removeItem(PRINTER_STORAGE_KEY);
    } else {
      localStorage.setItem(PRINTER_STORAGE_KEY, JSON.stringify(printer));
    }
  } catch {}
}

// Global references for active hardware sessions
let activeUsbDevice: any = null;
let activeBluetoothDevice: any = null;
let activeBluetoothCharacteristic: any = null;

// Connect via WebUSB
export async function connectWebUsbPrinter(): Promise<{ success: boolean; name?: string; error?: string }> {
  if (typeof window === "undefined" || !("usb" in navigator)) {
    return {
      success: false,
      error: "WebUSB is not supported in this browser. Please use Chrome, Edge, or an updated Chromium browser.",
    };
  }

  try {
    const usb = (navigator as any).usb;
    const device = await usb.requestDevice({ filters: [] });
    await device.open();
    if (device.configuration === null) {
      await device.selectConfiguration(1);
    }
    await device.claimInterface(0);
    activeUsbDevice = device;

    const printerInfo: ConnectedPrinterInfo = {
      type: "usb",
      name: device.productName || device.manufacturerName || "USB Thermal Printer",
      connectedAt: new Date().toLocaleTimeString(),
    };
    savePrinter(printerInfo);
    return { success: true, name: printerInfo.name };
  } catch (err: any) {
    if (err.name === "NotFoundError" || err.name === "SecurityError") {
      return { success: false, error: "No USB printer device selected or permission denied." };
    }
    return { success: false, error: err.message || "Failed to connect USB printer." };
  }
}

// Connect via Web Bluetooth
export async function connectWebBluetoothPrinter(): Promise<{ success: boolean; name?: string; error?: string }> {
  if (typeof window === "undefined" || !("bluetooth" in navigator)) {
    return {
      success: false,
      error: "Web Bluetooth is not supported in this browser. Please use Chrome or Edge with Bluetooth enabled.",
    };
  }

  try {
    const bluetooth = (navigator as any).bluetooth;
    const device = await bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: [
        "000018f0-0000-1000-8000-00805f9b34fb", // common ESC/POS printer service
        "e7810a71-73ae-499d-8c15-faa9aef0c3f2",
        "49535343-fe7d-4ae5-8fa9-9fafd205e455",
      ],
    });

    const server = await device.gatt.connect();
    activeBluetoothDevice = device;

    const printerInfo: ConnectedPrinterInfo = {
      type: "bluetooth",
      name: device.name || "Bluetooth Thermal Printer",
      connectedAt: new Date().toLocaleTimeString(),
    };
    savePrinter(printerInfo);
    return { success: true, name: printerInfo.name };
  } catch (err: any) {
    if (err.name === "NotFoundError") {
      return { success: false, error: "No Bluetooth printer device selected." };
    }
    return { success: false, error: err.message || "Failed to pair Bluetooth printer." };
  }
}

// Disconnect Printer
export async function disconnectPrinter() {
  try {
    if (activeUsbDevice) {
      await activeUsbDevice.close();
      activeUsbDevice = null;
    }
    if (activeBluetoothDevice && activeBluetoothDevice.gatt.connected) {
      activeBluetoothDevice.gatt.disconnect();
      activeBluetoothDevice = null;
      activeBluetoothCharacteristic = null;
    }
  } catch {}
  savePrinter(null);
}

// Generate ESC/POS Binary Buffer for 80mm (3-inch) or 58mm (2-inch) Thermal Receipt
export function generateEscPosInvoice(
  invoice: any,
  settings: any,
  requestedPaperWidth?: ThermalPaperWidth
): Uint8Array {
  const encoder = new TextEncoder();
  const bytes: number[] = [];

  const addText = (text: string) => {
    const encoded = encoder.encode(text);
    for (let i = 0; i < encoded.length; i++) bytes.push(encoded[i]);
  };

  const addCmd = (...cmds: number[]) => {
    bytes.push(...cmds);
  };

  const savedPrinter = getSavedPrinter();
  let targetWidth = requestedPaperWidth || "auto";
  if (targetWidth === "auto") {
    const saved = getSavedThermalPaperWidth();
    if (saved !== "auto") {
      targetWidth = saved;
    } else if (savedPrinter?.name && /(58|pt[-_]?210|pos[-_]?58|mtp|goojprt)/i.test(savedPrinter.name)) {
      targetWidth = "58mm";
    } else {
      targetWidth = "80mm";
    }
  }

  const is58mm = targetWidth === "58mm";
  const LINE_WIDTH = is58mm ? 32 : 48;

  // Helper to format two columns spanning the exact full line width
  const formatTwoCols = (left: string, right: string, width = LINE_WIDTH) => {
    const l = String(left || "");
    const r = String(right || "");
    if (l.length + r.length + 1 <= width) {
      const spaces = width - l.length - r.length;
      return l + " ".repeat(spaces) + r + "\n";
    }
    if (width <= 32) {
      // On narrow 2-inch paper, if both don't fit on one line, wrap neatly
      const rSpaces = Math.max(0, width - r.length);
      return l.slice(0, width) + "\n" + " ".repeat(rSpaces) + r + "\n";
    }
    const maxLeft = Math.max(0, width - r.length - 1);
    const truncLeft = l.length > maxLeft ? l.slice(0, maxLeft) : l;
    const spaces = Math.max(1, width - truncLeft.length - r.length);
    return truncLeft + " ".repeat(spaces) + r + "\n";
  };

  // 1. Initialize Printer (ESC @)
  addCmd(0x1b, 0x40);

  // 2. Header (Center Aligned)
  addCmd(0x1b, 0x61, 0x01); // Center

  // Store Name
  addCmd(0x1b, 0x45, 0x01); // Bold ON
  if (is58mm) {
    // 58mm (32 cols): Double Height (0x1d 0x21 0x01) fits up to 32 chars on single line cleanly
    addCmd(0x1d, 0x21, 0x01);
  } else {
    // 80mm (48 cols): Double Size (0x1d 0x21 0x11)
    addCmd(0x1d, 0x21, 0x11);
  }
  addText((settings.pharmacyName || "PharmacyNext").toUpperCase() + "\n");
  addCmd(0x1d, 0x21, 0x00); // Normal size
  addCmd(0x1b, 0x45, 0x00); // Bold OFF

  if (settings.tagline) {
    addText(settings.tagline + "\n");
  }
  if (settings.address) {
    addText(settings.address + "\n");
  }
  if (settings.phone) {
    addText("Phone: " + settings.phone + "\n");
  }
  if (settings.drugLicenseNo) {
    addText("DL No: " + settings.drugLicenseNo + "\n");
  }
  if (invoice.gstEnabled && settings.gstNumber) {
    addText("GSTIN: " + settings.gstNumber + "\n");
  }
  addText("*** RETAIL TAX INVOICE ***\n");

  // 3. Invoice Metadata (Left Aligned, Full Width)
  addCmd(0x1b, 0x61, 0x00); // Left
  addText("-".repeat(LINE_WIDTH) + "\n");
  addText(formatTwoCols(`Bill No: ${invoice.invoiceNo}`, `Date: ${invoice.date}`));
  addText(formatTwoCols(`Time: ${invoice.time}`, `Pay: ${invoice.paymentMethod}`));
  addText(
    formatTwoCols(
      `Patient: ${invoice.customerName}`,
      invoice.customerPhone ? `Mob: ${maskPhoneNumber(invoice.customerPhone)}` : ""
    )
  );
  if (invoice.doctorName) {
    addText(`Doctor: Dr. ${invoice.doctorName}\n`);
  }
  addText("-".repeat(LINE_WIDTH) + "\n");

  // 4. Items Table
  if (is58mm) {
    // 32-col layout:
    // Item (13) + Qty (4) + Rate (6) + Amt (6) + 3 spaces = 32
    addText("Item          Qty   Rate    Amt\n");
    addText("-".repeat(LINE_WIDTH) + "\n");

    for (const item of invoice.items || []) {
      const rawName = String(item.name || "Item").trim();
      const qtyStr = String(item.quantity).padStart(4, " ");
      const rateStr = Number(item.rate).toFixed(2).padStart(6, " ");
      const amtStr = Number(item.amount).toFixed(2).padStart(6, " ");

      if (rawName.length > 13) {
        // Line 1: Full item name (up to 32 chars)
        addText(rawName.slice(0, 32) + "\n");
        // Line 2: right aligned Qty, Rate, Amt
        addText(" ".repeat(13) + " " + qtyStr + " " + rateStr + " " + amtStr + "\n");
      } else {
        const nameStr = rawName.padEnd(13, " ");
        addText(`${nameStr} ${qtyStr} ${rateStr} ${amtStr}\n`);
      }
    }
  } else {
    // 48-col layout (80mm):
    addText("Item                     Qty     Rate        Amt\n");
    addText("-".repeat(LINE_WIDTH) + "\n");

    for (const item of invoice.items || []) {
      const rawName = String(item.name || "Item").trim();
      const nameStr = rawName.length > 22 ? rawName.slice(0, 21) + "." : rawName.padEnd(22, " ");
      const qtyStr = String(item.quantity).padStart(5, " ");
      const rateStr = Number(item.rate).toFixed(2).padStart(8, " ");
      const amtStr = Number(item.amount).toFixed(2).padStart(10, " ");
      addText(`${nameStr} ${qtyStr} ${rateStr} ${amtStr}\n`);
    }
  }

  addText("-".repeat(LINE_WIDTH) + "\n");

  // 5. Totals Breakdown (Full Width)
  addText(formatTwoCols("Subtotal:", "Rs. " + Number(invoice.subtotal).toFixed(2)));

  if (invoice.discountAmount > 0) {
    addText(formatTwoCols("Discount:", "-Rs. " + Number(invoice.discountAmount).toFixed(2)));
  }

  if (invoice.gstEnabled && invoice.totalGstAmount > 0) {
    addText(
      formatTwoCols(
        `GST (${invoice.gstPercentage}%):`,
        "Rs. " + Number(invoice.totalGstAmount).toFixed(2)
      )
    );
  }

  if (invoice.roundOff !== 0) {
    const sign = invoice.roundOff > 0 ? "+" : "";
    addText(
      formatTwoCols("Round Off:", "Rs. " + sign + Number(invoice.roundOff).toFixed(2))
    );
  }

  addText("-".repeat(LINE_WIDTH) + "\n");

  // Grand Total (Bold, Full Width)
  addCmd(0x1b, 0x45, 0x01); // Bold ON
  addText(formatTwoCols("GRAND TOTAL:", "Rs. " + Number(invoice.grandTotal).toFixed(2)));
  addCmd(0x1b, 0x45, 0x00); // Bold OFF
  addText("-".repeat(LINE_WIDTH) + "\n");

  // 6. Footer (Center Aligned)
  addCmd(0x1b, 0x61, 0x01); // Center
  addText("Thank You! Get Well Soon!\n");
  addText("Goods once sold cannot be returned\n\n");

  // 7. Feed and Paper Cut (GS V 65 0)
  addCmd(0x1b, 0x64, 0x04); // Feed 4 lines
  addCmd(0x1d, 0x56, 0x41, 0x00); // Paper Cut

  return new Uint8Array(bytes);
}

// Send ESC/POS Bytes Directly to Connected Hardware Printer
export async function printDirectToThermalPrinter(
  invoice: any,
  settings: any,
  requestedPaperWidth?: ThermalPaperWidth
): Promise<{ success: boolean; error?: string }> {
  const savedPrinter = getSavedPrinter();
  if (!savedPrinter) {
    return {
      success: false,
      error: "No thermal printer configured. Please connect a USB or Bluetooth printer first.",
    };
  }

  const effectiveWidth = requestedPaperWidth || savedPrinter.paperWidth || getSavedThermalPaperWidth();
  const data = generateEscPosInvoice(invoice, settings, effectiveWidth);

  // 1. Try WebUSB transmission
  if (savedPrinter.type === "usb") {
    try {
      let device = activeUsbDevice;

      // Auto-reconnect if session was suspended or page reloaded
      if (!device && typeof window !== "undefined" && "usb" in navigator) {
        const devices = await (navigator as any).usb.getDevices();
        if (devices && devices.length > 0) {
          device = devices[0];
          await device.open();
          if (device.configuration === null) {
            await device.selectConfiguration(1);
          }
          await device.claimInterface(0);
          activeUsbDevice = device;
        }
      }

      if (!device) {
        return {
          success: false,
          error: "USB thermal printer is disconnected. Please re-connect using 'Connect Printer' in top header.",
        };
      }

      // Locate OUT endpoint (Bulk transfer)
      let outEndpoint = 1;
      if (device.configuration && device.configuration.interfaces) {
        for (const iface of device.configuration.interfaces) {
          for (const alt of iface.alternates) {
            for (const ep of alt.endpoints) {
              if (ep.direction === "out") {
                outEndpoint = ep.endpointNumber;
                break;
              }
            }
          }
        }
      }

      // Transfer bytes directly to printer
      await device.transferOut(outEndpoint, data);
      return { success: true };
    } catch (err: any) {
      console.error("WebUSB Print Error:", err);
      return { success: false, error: err.message || "Failed to print via WebUSB." };
    }
  }

  // 2. Try Web Bluetooth transmission
  if (savedPrinter.type === "bluetooth") {
    try {
      const device = activeBluetoothDevice;
      if (!device || !device.gatt || !device.gatt.connected) {
        return {
          success: false,
          error: "Bluetooth thermal printer is disconnected. Please re-pair from 'Connect Printer'.",
        };
      }

      let writeChar = activeBluetoothCharacteristic;
      if (!writeChar) {
        const server = device.gatt;
        const services = await server.getPrimaryServices();
        for (const svc of services) {
          const chars = await svc.getCharacteristics();
          for (const c of chars) {
            if (c.properties.write || c.properties.writeWithoutResponse) {
              writeChar = c;
              activeBluetoothCharacteristic = c;
              break;
            }
          }
          if (writeChar) break;
        }
      }

      if (!writeChar) {
        return {
          success: false,
          error: "Could not find a writable print channel on the Bluetooth printer.",
        };
      }

      // Send in 100-byte chunks for Bluetooth MTU compatibility
      const CHUNK_SIZE = 100;
      for (let offset = 0; offset < data.byteLength; offset += CHUNK_SIZE) {
        const chunk = data.slice(offset, offset + CHUNK_SIZE);
        if (writeChar.writeValueWithoutResponse) {
          await writeChar.writeValueWithoutResponse(chunk);
        } else {
          await writeChar.writeValue(chunk);
        }
      }

      return { success: true };
    } catch (err: any) {
      console.error("Web Bluetooth Print Error:", err);
      return { success: false, error: err.message || "Failed to print via Bluetooth." };
    }
  }

  return { success: false, error: "Unsupported printer connection type." };
}
