import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface Account {
    id: string;
    username: string;
    password: string;
    createdAt: string;
    role: string;
    fullName: string;
    enabled: boolean;
    pharmacyId: string;
}
export interface Pharmacy {
    id: string;
    status: string;
    expiresAt: string;
    name: string;
    createdAt: string;
    address: string;
    phone: string;
}
export interface SuperAdmin {
    username: string;
    password: string;
}
export interface PurchaseRecord {
    id: string;
    purchasePrice: number;
    date: string;
    discountAmount: number;
    totalCost: number;
    discountPercent: number;
    addedByName: string;
    addedBy: string;
    quantity: bigint;
    pharmacyId: string;
    medicineId: string;
    netPurchasePrice: number;
    medicineName: string;
}
export interface InventoryAdjustmentRecord {
    inventoryDifferences?: string;
    adjustmentAmount: bigint;
    timestamp: string;
    pharmacyId: string;
    medicineId: string;
    adjustedBy: string;
    reason: string;
}
export interface Medicine {
    id: string;
    manufacturer: string;
    retailPrice: number;
    purchasePrice: number;
    lowStockThreshold: bigint;
    expiryDate: string;
    name: string;
    quantity: bigint;
    category: string;
    pharmacyId: string;
    price: number;
    rackNumber: string;
}
export interface Sale {
    id: string;
    total: number;
    soldBy: string;
    date: string;
    patientPhone: string;
    soldByName: string;
    invoiceNumber: string;
    patientName: string;
    discount: number;
    pharmacyId: string;
    items: Array<SaleItem>;
    subtotal: number;
}
export interface UnauthorizedAccessAttempt {
    userId: string;
    timestamp: string;
    details: string;
    pharmacyId: string;
    resourceAttempted: string;
}
export interface SaleItem {
    quantity: bigint;
    unitPrice: number;
    medicineId: string;
    subtotal: number;
    medicineName: string;
}
export interface TransactionRecord {
    transactionType: string;
    source: string;
    performedBy: string;
    timestamp: string;
    pharmacyId: string;
    amount: number;
    transactionId: string;
}
export interface backendInterface {
    addAccount(account: Account): Promise<void>;
    addInventoryAdjustmentRecord(record: InventoryAdjustmentRecord): Promise<void>;
    addMedicine(medicine: Medicine): Promise<void>;
    addPharmacy(id: string, name: string, address: string, phone: string, createdAt: string): Promise<void>;
    addPurchase(record: PurchaseRecord): Promise<void>;
    addSale(sale: Sale): Promise<void>;
    addTransactionRecord(record: TransactionRecord): Promise<void>;
    addUnauthorizedAccessAttempt(attempt: UnauthorizedAccessAttempt): Promise<void>;
    changeSuperAdminPassword(oldPassword: string, newPassword: string): Promise<boolean>;
    deleteAccount(id: string, pharmacyId: string): Promise<void>;
    deleteMedicine(id: string, pharmacyId: string): Promise<void>;
    deletePharmacy(id: string): Promise<void>;
    deleteSale(id: string, pharmacyId: string): Promise<Sale | null>;
    getAccounts(pharmacyId: string): Promise<Array<Account>>;
    getInventoryAdjustmentRecords(): Promise<Array<InventoryAdjustmentRecord>>;
    getMedicines(pharmacyId: string): Promise<Array<Medicine>>;
    getMedicinesByCategory(pharmacyId: string, category: string): Promise<Array<Medicine>>;
    getMedicinesByPriceRange(pharmacyId: string, minPrice: number, maxPrice: number): Promise<Array<Medicine>>;
    getMedicinesExpiringSoon(pharmacyId: string): Promise<Array<Medicine>>;
    getMedicinesLowStock(pharmacyId: string): Promise<Array<Medicine>>;
    getPharmacies(): Promise<Array<Pharmacy>>;
    getPurchases(pharmacyId: string): Promise<Array<PurchaseRecord>>;
    getSales(pharmacyId: string): Promise<Array<Sale>>;
    getSuperAdmin(): Promise<SuperAdmin | null>;
    getTransactionRecords(): Promise<Array<TransactionRecord>>;
    getUnauthorizedAccessAttempts(): Promise<Array<UnauthorizedAccessAttempt>>;
    setupSuperAdmin(username: string, password: string): Promise<boolean>;
    updateAccount(id: string, pharmacyId: string, username: string, password: string, fullName: string, role: string, enabled: boolean): Promise<void>;
    updateMedicine(id: string, pharmacyId: string, name: string, category: string, price: number, purchasePrice: number, retailPrice: number, quantity: bigint, expiryDate: string, manufacturer: string, lowStockThreshold: bigint, rackNumber: string): Promise<void>;
    updateMedicineQuantity(id: string, pharmacyId: string, newQuantity: bigint): Promise<void>;
    updatePharmacyStatus(id: string, status: string, expiresAt: string): Promise<void>;
    verifyAccount(pharmacyId: string, username: string, password: string): Promise<Account | null>;
    verifySuperAdmin(username: string, password: string): Promise<boolean>;
}
