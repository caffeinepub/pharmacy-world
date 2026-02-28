import type React from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { Account, Medicine, PurchaseRecord, Sale } from "../types";

interface DataContextType {
  medicines: Medicine[];
  accounts: Account[];
  sales: Sale[];
  purchaseRecords: PurchaseRecord[];
  addMedicine: (med: Omit<Medicine, "id">) => void;
  updateMedicine: (id: string, med: Partial<Medicine>) => void;
  deleteMedicine: (id: string) => void;
  addAccount: (acc: Omit<Account, "id" | "createdAt">) => void;
  updateAccount: (id: string, acc: Partial<Account>) => void;
  deleteAccount: (id: string) => void;
  addSale: (sale: Omit<Sale, "id" | "invoiceNumber">) => Sale;
  deductStock: (items: { medicineId: string; quantity: number }[]) => void;
  addPurchaseRecord: (
    record: Omit<PurchaseRecord, "id">,
    addQuantity: number,
  ) => void;
}

const DataContext = createContext<DataContextType | null>(null);

function loadFromStorage<T>(key: string, fallback: T[]): T[] {
  const stored = localStorage.getItem(key);
  if (stored) {
    try {
      return JSON.parse(stored) as T[];
    } catch {
      return fallback;
    }
  }
  return fallback;
}

function saveToStorage<T>(key: string, data: T[]) {
  localStorage.setItem(key, JSON.stringify(data));
}

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

interface DataProviderProps {
  children: React.ReactNode;
  pharmacyId: string;
}

export function DataProvider({ children, pharmacyId }: DataProviderProps) {
  const medicinesKey = `ph_${pharmacyId}_medicines`;
  const accountsKey = `ph_${pharmacyId}_accounts`;
  const salesKey = `ph_${pharmacyId}_sales`;
  const purchasesKey = `ph_${pharmacyId}_purchases`;

  const [medicines, setMedicines] = useState<Medicine[]>(() =>
    loadFromStorage<Medicine>(medicinesKey, []),
  );

  const [accounts, setAccounts] = useState<Account[]>(() =>
    loadFromStorage<Account>(accountsKey, []),
  );

  const [sales, setSales] = useState<Sale[]>(() =>
    loadFromStorage<Sale>(salesKey, []),
  );

  const [purchaseRecords, setPurchaseRecords] = useState<PurchaseRecord[]>(() =>
    loadFromStorage<PurchaseRecord>(purchasesKey, []),
  );

  // Re-load when pharmacyId changes
  useEffect(() => {
    setMedicines(loadFromStorage<Medicine>(`ph_${pharmacyId}_medicines`, []));
    setAccounts(loadFromStorage<Account>(`ph_${pharmacyId}_accounts`, []));
    setSales(loadFromStorage<Sale>(`ph_${pharmacyId}_sales`, []));
    setPurchaseRecords(
      loadFromStorage<PurchaseRecord>(`ph_${pharmacyId}_purchases`, []),
    );
  }, [pharmacyId]);

  useEffect(() => {
    saveToStorage(medicinesKey, medicines);
  }, [medicines, medicinesKey]);

  useEffect(() => {
    saveToStorage(accountsKey, accounts);
  }, [accounts, accountsKey]);

  useEffect(() => {
    saveToStorage(salesKey, sales);
  }, [sales, salesKey]);

  useEffect(() => {
    saveToStorage(purchasesKey, purchaseRecords);
  }, [purchaseRecords, purchasesKey]);

  const addMedicine = useCallback((med: Omit<Medicine, "id">) => {
    const newMed: Medicine = { ...med, id: generateId() };
    setMedicines((prev) => [...prev, newMed]);
  }, []);

  const updateMedicine = useCallback((id: string, med: Partial<Medicine>) => {
    setMedicines((prev) =>
      prev.map((m) => (m.id === id ? { ...m, ...med } : m)),
    );
  }, []);

  const deleteMedicine = useCallback((id: string) => {
    setMedicines((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const addAccount = useCallback((acc: Omit<Account, "id" | "createdAt">) => {
    const newAcc: Account = {
      ...acc,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };
    setAccounts((prev) => [...prev, newAcc]);
  }, []);

  const updateAccount = useCallback((id: string, acc: Partial<Account>) => {
    setAccounts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...acc } : a)),
    );
  }, []);

  const deleteAccount = useCallback((id: string) => {
    setAccounts((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const addSale = useCallback(
    (saleData: Omit<Sale, "id" | "invoiceNumber">): Sale => {
      const today = new Date();
      const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");
      const storedSales = loadFromStorage<Sale>(salesKey, []);
      const todaySales = storedSales.filter((s) =>
        s.date.startsWith(today.toISOString().slice(0, 10)),
      );
      const count = todaySales.length + 1;
      const invoiceNumber = `INV-${dateStr}-${String(count).padStart(4, "0")}`;
      const newSale: Sale = {
        ...saleData,
        id: generateId(),
        invoiceNumber,
      };
      setSales((prev) => [...prev, newSale]);
      return newSale;
    },
    [salesKey],
  );

  const deductStock = useCallback(
    (items: { medicineId: string; quantity: number }[]) => {
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
    },
    [],
  );

  const addPurchaseRecord = useCallback(
    (record: Omit<PurchaseRecord, "id">, addQuantity: number) => {
      const newRecord: PurchaseRecord = { ...record, id: generateId() };
      setPurchaseRecords((prev) => [...prev, newRecord]);
      setMedicines((prev) =>
        prev.map((med) =>
          med.id === record.medicineId
            ? { ...med, quantity: med.quantity + addQuantity }
            : med,
        ),
      );
    },
    [],
  );

  return (
    <DataContext.Provider
      value={{
        medicines,
        accounts,
        sales,
        purchaseRecords,
        addMedicine,
        updateMedicine,
        deleteMedicine,
        addAccount,
        updateAccount,
        deleteAccount,
        addSale,
        deductStock,
        addPurchaseRecord,
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
