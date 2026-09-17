"use client";

export interface ConnectedPrinterInfo {
  type: "usb" | "bluetooth" | "browser";
  name: string;
  connectedAt: string;
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

// Generate ESC/POS Binary Buffer for 58mm / 80mm Thermal Receipt
export function generateEscPosInvoice(invoice: any, settings: any): Uint8Array {
  const encoder = new TextEncoder();
  const bytes: number[] = [];

  const addText = (text: string) => {
    const encoded = encoder.encode(text);
    for (let i = 0; i < encoded.length; i++) bytes.push(encoded[i]);
  };

  const addCmd = (...cmds: number[]) => {
    bytes.push(...cmds);
  };

  // 1. Initialize Printer (ESC @)
  addCmd(0x1b, 0x40);

  // 2. Header (Center Aligned)
  addCmd(0x1b, 0x61, 0x01); // Center

  // Store Name (Bold + Double Height)
  addCmd(0x1b, 0x45, 0x01); // Bold ON
  addCmd(0x1d, 0x21, 0x11); // Double size
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

  // 3. Invoice Metadata (Left Aligned)
  addCmd(0x1b, 0x61, 0x00); // Left
  addText("--------------------------------\n");
  addText(`Bill No: ${invoice.invoiceNo}\n`);
  addText(`Date: ${invoice.date}  ${invoice.time}\n`);
  addText(`Patient: ${invoice.customerName}\n`);
  if (invoice.customerPhone) {
    addText(`Mobile:  ${maskPhoneNumber(invoice.customerPhone)}\n`);
  }
  if (invoice.doctorName) {
    addText(`Doctor:  Dr. ${invoice.doctorName}\n`);
  }
  addText(`Payment: ${invoice.paymentMethod}\n`);
  addText("--------------------------------\n");

  // 4. Items Table (32 Columns Standard)
  addText("Item               Qty  Rate   Amt\n");
  addText("--------------------------------\n");

  for (const item of invoice.items || []) {
    const rawName = item.name || "Item";
    const nameStr = rawName.length > 17 ? rawName.slice(0, 16) + "." : rawName.padEnd(17, " ");
    const qtyStr = String(item.quantity).padStart(3, " ");
    const rateStr = Number(item.rate).toFixed(0).padStart(5, " ");
    const amtStr = Number(item.amount).toFixed(0).padStart(5, " ");
    addText(`${nameStr} ${qtyStr} ${rateStr} ${amtStr}\n`);
  }

  addText("--------------------------------\n");

  // 5. Totals Breakdown
  addText(`Subtotal:             Rs. ${Number(invoice.subtotal).toFixed(2)}\n`);

  if (invoice.discountAmount > 0) {
    addText(`Discount:            -Rs. ${Number(invoice.discountAmount).toFixed(2)}\n`);
  }

  if (invoice.gstEnabled && invoice.totalGstAmount > 0) {
    addText(`GST (${invoice.gstPercentage}%):         Rs. ${Number(invoice.totalGstAmount).toFixed(2)}\n`);
  }

  if (invoice.roundOff !== 0) {
    const sign = invoice.roundOff > 0 ? "+" : "";
    addText(`Round Off:            Rs. ${sign}${Number(invoice.roundOff).toFixed(2)}\n`);
  }

  addText("--------------------------------\n");

  // Grand Total (Bold)
  addCmd(0x1b, 0x45, 0x01); // Bold ON
  addText(`GRAND TOTAL:          Rs. ${Number(invoice.grandTotal).toFixed(2)}\n`);
  addCmd(0x1b, 0x45, 0x00); // Bold OFF
  addText("--------------------------------\n");

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
  settings: any
): Promise<{ success: boolean; error?: string }> {
  const savedPrinter = getSavedPrinter();
  if (!savedPrinter) {
    return {
      success: false,
      error: "No thermal printer configured. Please connect a USB or Bluetooth printer first.",
    };
  }

  const data = generateEscPosInvoice(invoice, settings);

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
