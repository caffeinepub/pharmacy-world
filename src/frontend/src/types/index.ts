export interface Pharmacy {
  id: string;
  name: string;
  address: string;
  phone: string;
  createdAt: string;
}

export interface SuperAdmin {
  username: string;
  password: string;
}

export interface Medicine {
  id: string;
  name: string;
  category: string;
  price: number; // kept for backward compat (= retailPrice)
  purchasePrice?: number; // price paid to supplier
  retailPrice?: number; // price sold to customer
  quantity: number;
  expiryDate: string;
  manufacturer: string;
  lowStockThreshold: number;
  rackNumber?: string;
}

export interface Account {
  id: string;
  username: string;
  password: string;
  fullName: string;
  role: "admin" | "client";
  enabled: boolean;
  createdAt: string;
}

export interface SaleItem {
  medicineId: string;
  medicineName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface Sale {
  id: string;
  invoiceNumber: string;
  date: string;
  soldBy: string;
  soldByName: string;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  total: number;
  patientName?: string;
  patientPhone?: string;
}

export interface PurchaseRecord {
  id: string;
  medicineId: string;
  medicineName: string;
  date: string; // ISO string
  quantity: number;
  purchasePrice: number; // price per unit before discount
  discountPercent: number; // e.g. 10 for 10%
  discountAmount: number; // per unit discount amount
  netPurchasePrice: number; // price per unit after discount
  totalCost: number; // netPurchasePrice * quantity
  addedBy: string; // username
  addedByName: string; // full name
}
