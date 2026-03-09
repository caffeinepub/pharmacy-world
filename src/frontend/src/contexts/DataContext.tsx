import type { backendInterface } from "@/backend";
import { createActorWithConfig } from "@/config";
import type React from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";

let _actor: backendInterface | null = null;
async function getActor(): Promise<backendInterface> {
  if (!_actor) {
    _actor = await createActorWithConfig();
  }
  return _actor;
}

/** Retry a function up to `retries` times with exponential backoff */
async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 3,
  delayMs = 1500,
): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      _actor = null;
      if (i < retries - 1) {
        await new Promise((r) => setTimeout(r, delayMs * (i + 1)));
      }
    }
  }
  throw lastErr;
}

import type { Account, Medicine, PurchaseRecord, Sale } from "../types";

interface DataContextType {
  medicines: Medicine[];
  accounts: Account[];
  sales: Sale[];
  purchaseRecords: PurchaseRecord[];
  isLoading: boolean;
  addMedicine: (med: Omit<Medicine, "id">) => Promise<void>;
  updateMedicine: (id: string, med: Partial<Medicine>) => Promise<void>;
  deleteMedicine: (id: string) => Promise<void>;
  addAccount: (acc: Omit<Account, "id" | "createdAt">) => Promise<void>;
  updateAccount: (id: string, acc: Partial<Account>) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
  addSale: (sale: Omit<Sale, "id" | "invoiceNumber">) => Promise<Sale>;
  deleteSale: (id: string) => Promise<void>;
  deductStock: (
    items: { medicineId: string; quantity: number }[],
  ) => Promise<void>;
  addPurchaseRecord: (
    record: Omit<PurchaseRecord, "id">,
    addQuantity: number,
  ) => Promise<void>;
  refreshData: () => Promise<void>;
}

const DataContext = createContext<DataContextType | null>(null);

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Convert backend Medicine to frontend Medicine */
function mapBackendMedicine(m: {
  id: string;
  name: string;
  category: string;
  price: number;
  purchasePrice: number;
  retailPrice: number;
  quantity: bigint;
  expiryDate: string;
  manufacturer: string;
  lowStockThreshold: bigint;
  rackNumber: string;
  pharmacyId: string;
}): Medicine {
  return {
    id: m.id,
    name: m.name,
    category: m.category,
    price: m.price,
    purchasePrice: m.purchasePrice,
    retailPrice: m.retailPrice,
    quantity: Number(m.quantity),
    expiryDate: m.expiryDate,
    manufacturer: m.manufacturer,
    lowStockThreshold: Number(m.lowStockThreshold),
    rackNumber: m.rackNumber || undefined,
  };
}

/** Convert backend Account to frontend Account */
function mapBackendAccount(a: {
  id: string;
  username: string;
  password: string;
  fullName: string;
  role: string;
  enabled: boolean;
  createdAt: string;
  pharmacyId: string;
}): Account {
  return {
    id: a.id,
    username: a.username,
    password: a.password,
    fullName: a.fullName,
    role: (a.role === "admin" ? "admin" : "client") as "admin" | "client",
    enabled: a.enabled,
    createdAt: a.createdAt,
  };
}

/** Convert backend Sale to frontend Sale */
function mapBackendSale(s: {
  id: string;
  invoiceNumber: string;
  date: string;
  soldBy: string;
  soldByName: string;
  items: Array<{
    medicineId: string;
    medicineName: string;
    quantity: bigint;
    unitPrice: number;
    subtotal: number;
  }>;
  subtotal: number;
  discount: number;
  total: number;
  patientName: string;
  patientPhone: string;
  pharmacyId: string;
}): Sale {
  return {
    id: s.id,
    invoiceNumber: s.invoiceNumber,
    date: s.date,
    soldBy: s.soldBy,
    soldByName: s.soldByName,
    items: s.items.map((item) => ({
      medicineId: item.medicineId,
      medicineName: item.medicineName,
      quantity: Number(item.quantity),
      unitPrice: item.unitPrice,
      subtotal: item.subtotal,
    })),
    subtotal: s.subtotal,
    discount: s.discount,
    total: s.total,
    patientName: s.patientName || undefined,
    patientPhone: s.patientPhone || undefined,
  };
}

/** Convert backend PurchaseRecord to frontend PurchaseRecord */
function mapBackendPurchase(p: {
  id: string;
  medicineId: string;
  medicineName: string;
  date: string;
  quantity: bigint;
  purchasePrice: number;
  discountPercent: number;
  discountAmount: number;
  netPurchasePrice: number;
  totalCost: number;
  addedBy: string;
  addedByName: string;
  pharmacyId: string;
}): PurchaseRecord {
  return {
    id: p.id,
    medicineId: p.medicineId,
    medicineName: p.medicineName,
    date: p.date,
    quantity: Number(p.quantity),
    purchasePrice: p.purchasePrice,
    discountPercent: p.discountPercent,
    discountAmount: p.discountAmount,
    netPurchasePrice: p.netPurchasePrice,
    totalCost: p.totalCost,
    addedBy: p.addedBy,
    addedByName: p.addedByName,
  };
}

interface DataProviderProps {
  children: React.ReactNode;
  pharmacyId: string;
}

export function DataProvider({ children, pharmacyId }: DataProviderProps) {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [purchaseRecords, setPurchaseRecords] = useState<PurchaseRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Stable refs to avoid stale closures in callbacks
  const medicinesRef = useRef(medicines);
  const salesRef = useRef(sales);
  const accountsRef = useRef(accounts);

  useEffect(() => {
    medicinesRef.current = medicines;
  }, [medicines]);

  useEffect(() => {
    salesRef.current = sales;
  }, [sales]);

  useEffect(() => {
    accountsRef.current = accounts;
  }, [accounts]);

  const loadData = useCallback(async (pid: string) => {
    if (!pid || pid === "__none__") return;
    setIsLoading(true);
    try {
      const [meds, accs, sls, purchases] = await withRetry(async () => {
        const actor = await getActor();
        return Promise.all([
          actor.getMedicines(pid),
          actor.getAccounts(pid),
          actor.getSales(pid),
          actor.getPurchases(pid),
        ]);
      });
      setMedicines(meds.map(mapBackendMedicine));
      setAccounts(accs.map(mapBackendAccount));
      setSales(sls.map(mapBackendSale));
      setPurchaseRecords(purchases.map(mapBackendPurchase));
    } catch (err) {
      console.error("Failed to load pharmacy data:", err);
      toast.error("Failed to load pharmacy data. Please refresh the page.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load data when pharmacyId changes
  useEffect(() => {
    loadData(pharmacyId);
  }, [pharmacyId, loadData]);

  const refreshData = useCallback(async () => {
    await loadData(pharmacyId);
  }, [pharmacyId, loadData]);

  const addMedicine = useCallback(
    async (med: Omit<Medicine, "id">) => {
      const id = generateId();
      const backendMed = {
        id,
        name: med.name,
        category: med.category,
        price: med.price,
        purchasePrice: med.purchasePrice ?? 0,
        retailPrice: med.retailPrice ?? med.price,
        quantity: BigInt(med.quantity),
        expiryDate: med.expiryDate,
        manufacturer: med.manufacturer,
        lowStockThreshold: BigInt(med.lowStockThreshold),
        rackNumber: med.rackNumber ?? "",
        pharmacyId,
      };
      try {
        const actor = await getActor();
        await actor.addMedicine(backendMed);
        setMedicines((prev) => [...prev, { ...med, id }]);
      } catch (err) {
        console.error("Failed to add medicine:", err);
        toast.error("Failed to add medicine");
        throw err;
      }
    },
    [pharmacyId],
  );

  const updateMedicine = useCallback(
    async (id: string, med: Partial<Medicine>) => {
      // Optimistic update
      setMedicines((prev) =>
        prev.map((m) => (m.id === id ? { ...m, ...med } : m)),
      );
      try {
        const current = medicinesRef.current.find((m) => m.id === id);
        if (!current) return;
        const merged = { ...current, ...med };
        const actor = await getActor();
        await actor.updateMedicine(
          id,
          pharmacyId,
          merged.name,
          merged.category,
          merged.price,
          merged.purchasePrice ?? 0,
          merged.retailPrice ?? merged.price,
          BigInt(merged.quantity),
          merged.expiryDate,
          merged.manufacturer,
          BigInt(merged.lowStockThreshold),
          merged.rackNumber ?? "",
        );
      } catch (err) {
        console.error("Failed to update medicine:", err);
        toast.error("Failed to update medicine");
        // Revert
        setMedicines((prev) =>
          prev.map((m) => (m.id === id ? { ...m, ...med } : m)),
        );
        throw err;
      }
    },
    [pharmacyId],
  );

  const deleteMedicine = useCallback(
    async (id: string) => {
      setMedicines((prev) => prev.filter((m) => m.id !== id));
      try {
        const actor = await getActor();
        await actor.deleteMedicine(id, pharmacyId);
      } catch (err) {
        console.error("Failed to delete medicine:", err);
        toast.error("Failed to delete medicine");
        // Reload to restore state
        await loadData(pharmacyId);
        throw err;
      }
    },
    [pharmacyId, loadData],
  );

  const addAccount = useCallback(
    async (acc: Omit<Account, "id" | "createdAt">) => {
      const id = generateId();
      const createdAt = new Date().toISOString();
      const backendAcc = {
        id,
        username: acc.username,
        password: acc.password,
        fullName: acc.fullName,
        role: acc.role,
        enabled: acc.enabled,
        createdAt,
        pharmacyId,
      };
      try {
        const actor = await getActor();
        await actor.addAccount(backendAcc);
        setAccounts((prev) => [...prev, { ...acc, id, createdAt }]);
      } catch (err) {
        console.error("Failed to add account:", err);
        toast.error("Failed to add account");
        throw err;
      }
    },
    [pharmacyId],
  );

  const updateAccount = useCallback(
    async (id: string, acc: Partial<Account>) => {
      // Optimistic update
      setAccounts((prev) =>
        prev.map((a) => (a.id === id ? { ...a, ...acc } : a)),
      );
      try {
        const current = accountsRef.current.find((a) => a.id === id);
        if (!current) return;
        const merged = { ...current, ...acc };
        const actor = await getActor();
        await actor.updateAccount(
          id,
          pharmacyId,
          merged.username,
          merged.password,
          merged.fullName,
          merged.role,
          merged.enabled,
        );
      } catch (err) {
        console.error("Failed to update account:", err);
        toast.error("Failed to update account");
        await loadData(pharmacyId);
        throw err;
      }
    },
    [pharmacyId, loadData],
  );

  const deleteAccount = useCallback(
    async (id: string) => {
      setAccounts((prev) => prev.filter((a) => a.id !== id));
      try {
        const actor = await getActor();
        await actor.deleteAccount(id, pharmacyId);
      } catch (err) {
        console.error("Failed to delete account:", err);
        toast.error("Failed to delete account");
        await loadData(pharmacyId);
        throw err;
      }
    },
    [pharmacyId, loadData],
  );

  const addSale = useCallback(
    async (saleData: Omit<Sale, "id" | "invoiceNumber">): Promise<Sale> => {
      const today = new Date();
      const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");
      // Count today's sales for invoice numbering
      const todaySales = salesRef.current.filter((s) =>
        s.date.startsWith(today.toISOString().slice(0, 10)),
      );
      const count = todaySales.length + 1;
      const invoiceNumber = `INV-${dateStr}-${String(count).padStart(4, "0")}`;
      const id = generateId();

      const newSale: Sale = {
        ...saleData,
        id,
        invoiceNumber,
      };

      const backendSale = {
        id,
        invoiceNumber,
        date: saleData.date,
        soldBy: saleData.soldBy,
        soldByName: saleData.soldByName,
        items: saleData.items.map((item) => ({
          medicineId: item.medicineId,
          medicineName: item.medicineName,
          quantity: BigInt(item.quantity),
          unitPrice: item.unitPrice,
          subtotal: item.subtotal,
        })),
        subtotal: saleData.subtotal,
        discount: saleData.discount,
        total: saleData.total,
        patientName: saleData.patientName ?? "",
        patientPhone: saleData.patientPhone ?? "",
        pharmacyId,
      };

      try {
        const actor = await getActor();
        await actor.addSale(backendSale);
        setSales((prev) => [...prev, newSale]);
        return newSale;
      } catch (err) {
        console.error("Failed to add sale:", err);
        toast.error("Failed to record sale");
        throw err;
      }
    },
    [pharmacyId],
  );

  const deleteSale = useCallback(
    async (id: string) => {
      try {
        // Find sale in local state BEFORE deleting so we can restore stock
        const saleToDelete = salesRef.current.find((s) => s.id === id);

        const actor = await getActor();
        await actor.deleteSale(id, pharmacyId);

        // Restore stock using local sale data
        if (saleToDelete && saleToDelete.items.length > 0) {
          await Promise.all(
            saleToDelete.items.map(async (item) => {
              const med = medicinesRef.current.find(
                (m) => m.id === item.medicineId,
              );
              if (med) {
                const newQty = med.quantity + item.quantity;
                await actor.updateMedicineQuantity(
                  item.medicineId,
                  pharmacyId,
                  BigInt(newQty),
                );
              }
            }),
          );
        }

        // Update local state
        setSales((prev) => prev.filter((s) => s.id !== id));
        if (saleToDelete) {
          setMedicines((prev) =>
            prev.map((med) => {
              const item = saleToDelete.items.find(
                (i) => i.medicineId === med.id,
              );
              if (item)
                return {
                  ...med,
                  quantity: med.quantity + item.quantity,
                };
              return med;
            }),
          );
        }
      } catch (err) {
        console.error("Failed to delete sale:", err);
        toast.error("Failed to delete sale");
        throw err;
      }
    },
    [pharmacyId],
  );

  const deductStock = useCallback(
    async (items: { medicineId: string; quantity: number }[]) => {
      // Snapshot current medicines before optimistic update
      const snapshot = medicinesRef.current;
      // Optimistic update locally
      setMedicines((prev) =>
        prev.map((med) => {
          const item = items.find((i) => i.medicineId === med.id);
          if (item) {
            return {
              ...med,
              quantity: Math.max(0, med.quantity - item.quantity),
            };
          }
          return med;
        }),
      );
      try {
        const actor = await getActor();
        await Promise.all(
          items.map(async (item) => {
            const med = snapshot.find((m) => m.id === item.medicineId);
            if (med) {
              const newQty = Math.max(0, med.quantity - item.quantity);
              await actor.updateMedicineQuantity(
                item.medicineId,
                pharmacyId,
                BigInt(newQty),
              );
            }
          }),
        );
      } catch (err) {
        console.error("Failed to deduct stock:", err);
        toast.error("Failed to update stock");
        // Reload to restore
        await loadData(pharmacyId);
        throw err;
      }
    },
    [pharmacyId, loadData],
  );

  const addPurchaseRecord = useCallback(
    async (record: Omit<PurchaseRecord, "id">, addQuantity: number) => {
      const id = generateId();
      const newRecord: PurchaseRecord = { ...record, id };

      const backendRecord = {
        id,
        medicineId: record.medicineId,
        medicineName: record.medicineName,
        date: record.date,
        quantity: BigInt(record.quantity),
        purchasePrice: record.purchasePrice,
        discountPercent: record.discountPercent,
        discountAmount: record.discountAmount,
        netPurchasePrice: record.netPurchasePrice,
        totalCost: record.totalCost,
        addedBy: record.addedBy,
        addedByName: record.addedByName,
        pharmacyId,
      };

      try {
        // Find current medicine quantity
        const med = medicinesRef.current.find(
          (m) => m.id === record.medicineId,
        );
        const currentQty = med?.quantity ?? 0;
        const newQty = currentQty + addQuantity;

        const actor = await getActor();
        await Promise.all([
          actor.addPurchase(backendRecord),
          actor.updateMedicineQuantity(
            record.medicineId,
            pharmacyId,
            BigInt(newQty),
          ),
        ]);

        setPurchaseRecords((prev) => [...prev, newRecord]);
        setMedicines((prev) =>
          prev.map((m) =>
            m.id === record.medicineId ? { ...m, quantity: newQty } : m,
          ),
        );
      } catch (err) {
        console.error("Failed to add purchase record:", err);
        toast.error("Failed to record purchase");
        throw err;
      }
    },
    [pharmacyId],
  );

  return (
    <DataContext.Provider
      value={{
        medicines,
        accounts,
        sales,
        purchaseRecords,
        isLoading,
        addMedicine,
        updateMedicine,
        deleteMedicine,
        addAccount,
        updateAccount,
        deleteAccount,
        addSale,
        deleteSale,
        deductStock,
        addPurchaseRecord,
        refreshData,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
}
