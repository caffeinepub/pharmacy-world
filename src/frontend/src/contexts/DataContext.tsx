import type React from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { SEED_ACCOUNTS, SEED_MEDICINES } from "../lib/seedData";
import type { Account, Medicine, Sale } from "../types";

interface DataContextType {
  medicines: Medicine[];
  accounts: Account[];
  sales: Sale[];
  addMedicine: (med: Omit<Medicine, "id">) => void;
  updateMedicine: (id: string, med: Partial<Medicine>) => void;
  deleteMedicine: (id: string) => void;
  addAccount: (acc: Omit<Account, "id" | "createdAt">) => void;
  updateAccount: (id: string, acc: Partial<Account>) => void;
  deleteAccount: (id: string) => void;
  addSale: (sale: Omit<Sale, "id" | "invoiceNumber">) => Sale;
  deductStock: (items: { medicineId: string; quantity: number }[]) => void;
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

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [medicines, setMedicines] = useState<Medicine[]>(() => {
    const stored = localStorage.getItem("pw_medicines");
    if (!stored) {
      saveToStorage("pw_medicines", SEED_MEDICINES);
      return SEED_MEDICINES;
    }
    try {
      return JSON.parse(stored) as Medicine[];
    } catch {
      return SEED_MEDICINES;
    }
  });

  const [accounts, setAccounts] = useState<Account[]>(() => {
    const stored = localStorage.getItem("pw_accounts");
    if (!stored) {
      saveToStorage("pw_accounts", SEED_ACCOUNTS);
      return SEED_ACCOUNTS;
    }
    try {
      return JSON.parse(stored) as Account[];
    } catch {
      return SEED_ACCOUNTS;
    }
  });

  const [sales, setSales] = useState<Sale[]>(() =>
    loadFromStorage<Sale>("pw_sales", []),
  );

  useEffect(() => {
    saveToStorage("pw_medicines", medicines);
  }, [medicines]);

  useEffect(() => {
    saveToStorage("pw_accounts", accounts);
  }, [accounts]);

  useEffect(() => {
    saveToStorage("pw_sales", sales);
  }, [sales]);

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
      const todaySales = sales.filter((s) =>
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
    [sales],
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

  return (
    <DataContext.Provider
      value={{
        medicines,
        accounts,
        sales,
        addMedicine,
        updateMedicine,
        deleteMedicine,
        addAccount,
        updateAccount,
        deleteAccount,
        addSale,
        deductStock,
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
