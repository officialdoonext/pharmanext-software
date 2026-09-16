export interface MedicineItem {
  id: string;
  name: string; // Medicine Name *
  genericName: string; // Generic / Salt Name
  brandName: string; // Brand Name
  medicineType: string; // Tablet, Capsule, Syrup, Injection, Cream, Drops, Powder, etc.
  category: string; // Category *
  subCategory: string; // Sub Category
  manufacturer: string; // Manufacturer
  prescriptionRequired: boolean; // Prescription Required? — Yes/No
  description: string; // Description
  imageUrl?: string; // Medicine Image (URL or data URL)
  imageEmoji?: string; // Fallback icon

  // Inventory & Pricing Details
  sku: string;
  unit: string; // e.g. Strip (10 Tabs), Bottle (100ml), Vial, Tube
  strength?: string; // e.g. 500mg, 625mg
  sellingPrice: string; // MRP / Selling Price
  costPrice: string;
  stock: string;
  batchNumber?: string;
  expiryDate?: string;
  status: "Active" | "Out of Stock" | "Low Stock";
  addedOn: string;
}

export interface MedicineCategory {
  id: string;
  name: string;
  description: string;
  subCategories: string[];
  badgeColor?: string;
}

export interface MedicineTypeOption {
  id: string;
  name: string; // Tablet, Capsule, Syrup, Injection, Cream, Drops, Powder, etc.
  defaultUnit: string;
  description: string;
  iconTag?: string;
}

// Clean dynamic master data - strictly no dummy or static data
export const defaultMedicineTypes: MedicineTypeOption[] = [];
export const defaultCategories: MedicineCategory[] = [];

// Helper to filter out any dummy/static categories from previous sessions
export function purgeDummyCategories(list: MedicineCategory[]): MedicineCategory[] {
  if (!Array.isArray(list)) return [];
  const dummyCatPrefixes = [
    "cat-antibiotics", "cat-pain", "cat-gastro", "cat-cardiac",
    "cat-diabetes", "cat-respiratory", "cat-derma", "cat-vitamins"
  ];
  const dummyNames = [
    "antibiotics & antimicrobial", "pain relief & analgesics",
    "gastrointestinal", "cardiovascular & hypertension", "diabetic care",
    "respiratory & anti-allergy", "dermatology & skin care", "vitamins & supplements",
    "cakes & bakery", "sweets", "snacks", "beverages", "grocery"
  ];

  return list.filter((c) => {
    if (!c || !c.name) return false;
    if (dummyCatPrefixes.includes(c.id)) return false;
    if (dummyNames.includes(c.name.toLowerCase().trim())) return false;
    return true;
  });
}

// Helper to filter out any dummy/static medicine types from previous sessions
export function purgeDummyTypes(list: MedicineTypeOption[]): MedicineTypeOption[] {
  if (!Array.isArray(list)) return [];
  const dummyTypeIds = [
    "type-tab", "type-cap", "type-syr", "type-inj", "type-crm",
    "type-drp", "type-pwd", "type-oint", "type-inh", "type-gel"
  ];

  return list.filter((t) => {
    if (!t || !t.name) return false;
    if (dummyTypeIds.includes(t.id)) return false;
    return true;
  });
}


// Clean dynamic medicines - no dummy or mock medicines
export const initialMedicines: MedicineItem[] = [];

// Helper to filter out any dummy/test records from previous sessions
export function purgeDummyMedicines(list: MedicineItem[]): MedicineItem[] {
  if (!Array.isArray(list)) return [];
  const dummyIds = [
    "PRD-0001", "PRD-0002", "PRD-0003", "PRD-0004", "PRD-0005",
    "PRD-0006", "PRD-0007", "PRD-0008", "PRD-0009", "PRD-0010",
    "MED-1001", "MED-1002", "MED-1003", "MED-1004", "MED-1005",
    "MED-1006", "MED-1007", "MED-1008", "MED-1009", "MED-1010"
  ];
  const dummyNames = [
    "milk cake", "gulab jamun", "rasgulla", "mysore pak", "badam halwa",
    "samosa", "coca cola", "bisleri water", "aashirvaad atta", "sugar 1kg",
    "dolo 650 tablet", "augmentin 625 duo", "pan-d capsule", "ascoril-d plus syrup",
    "monocef 1g injection", "betnovate-n cream", "ciplox 0.3% eye drops",
    "electral powder 21.8g", "glycomet 500mg sr", "telma 40 tablet"
  ];

  return list.filter((item) => {
    if (!item || !item.name) return false;
    if (dummyIds.includes(item.id)) return false;
    if (dummyNames.includes(item.name.toLowerCase().trim())) return false;
    return true;
  });
}

