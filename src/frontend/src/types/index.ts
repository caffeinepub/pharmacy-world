export interface Medicine {
  id: string;
  name: string;
  category: string;
  price: number;
  quantity: number;
  expiryDate: string;
  manufacturer: string;
  lowStockThreshold: number;
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
}
