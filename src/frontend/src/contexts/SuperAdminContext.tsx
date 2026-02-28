import type React from "react";
import { createContext, useCallback, useContext, useState } from "react";
import type { Pharmacy, SuperAdmin } from "../types";

interface AddPharmacyInput {
  name: string;
  address: string;
  phone: string;
  adminUsername: string;
  adminPassword: string;
  adminFullName: string;
}

interface SuperAdminContextType {
  superAdmin: SuperAdmin | null;
  pharmacies: Pharmacy[];
  isSuperAdminSetup: boolean;
  setupSuperAdmin: (username: string, password: string) => void;
  addPharmacy: (input: AddPharmacyInput) => void;
  deletePharmacy: (id: string) => void;
  isLoggedInAsSuperAdmin: boolean;
  superAdminLogin: (username: string, password: string) => boolean;
  superAdminLogout: () => void;
}

const SuperAdminContext = createContext<SuperAdminContextType | null>(null);

function generateId() {
  return `ph-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function loadPharmacies(): Pharmacy[] {
  const stored = localStorage.getItem("pw_pharmacies");
  if (stored) {
    try {
      return JSON.parse(stored) as Pharmacy[];
    } catch {
      return [];
    }
  }
  return [];
}

function loadSuperAdmin(): SuperAdmin | null {
  const stored = localStorage.getItem("pw_superadmin");
  if (stored) {
    try {
      return JSON.parse(stored) as SuperAdmin;
    } catch {
      return null;
    }
  }
  return null;
}

export function SuperAdminProvider({
  children,
}: { children: React.ReactNode }) {
  const [superAdmin, setSuperAdmin] = useState<SuperAdmin | null>(() =>
    loadSuperAdmin(),
  );
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>(() =>
    loadPharmacies(),
  );
  const [isLoggedInAsSuperAdmin, setIsLoggedInAsSuperAdmin] = useState<boolean>(
    () => {
      return localStorage.getItem("pw_superadmin_session") === "1";
    },
  );

  const setupSuperAdmin = useCallback((username: string, password: string) => {
    const sa: SuperAdmin = { username, password };
    localStorage.setItem("pw_superadmin", JSON.stringify(sa));
    setSuperAdmin(sa);
  }, []);

  const addPharmacy = useCallback((input: AddPharmacyInput) => {
    const id = generateId();
    const pharmacy: Pharmacy = {
      id,
      name: input.name,
      address: input.address,
      phone: input.phone,
      createdAt: new Date().toISOString(),
    };

    // Initialize pharmacy data in localStorage
    const adminAccount = {
      id: `${id}-admin-001`,
      username: input.adminUsername,
      password: input.adminPassword,
      fullName: input.adminFullName,
      role: "admin" as const,
      enabled: true,
      createdAt: new Date().toISOString(),
    };
    localStorage.setItem(`ph_${id}_accounts`, JSON.stringify([adminAccount]));
    localStorage.setItem(`ph_${id}_medicines`, JSON.stringify([]));
    localStorage.setItem(`ph_${id}_sales`, JSON.stringify([]));
    localStorage.setItem(`ph_${id}_purchases`, JSON.stringify([]));

    const updated = [...loadPharmacies(), pharmacy];
    localStorage.setItem("pw_pharmacies", JSON.stringify(updated));
    setPharmacies(updated);
  }, []);

  const deletePharmacy = useCallback((id: string) => {
    // Clean up pharmacy data
    localStorage.removeItem(`ph_${id}_accounts`);
    localStorage.removeItem(`ph_${id}_medicines`);
    localStorage.removeItem(`ph_${id}_sales`);
    localStorage.removeItem(`ph_${id}_purchases`);

    // Remove selected pharmacy if it's the deleted one
    if (localStorage.getItem("pw_selected_pharmacy") === id) {
      localStorage.removeItem("pw_selected_pharmacy");
    }

    const updated = loadPharmacies().filter((p) => p.id !== id);
    localStorage.setItem("pw_pharmacies", JSON.stringify(updated));
    setPharmacies(updated);
  }, []);

  const superAdminLogin = useCallback(
    (username: string, password: string): boolean => {
      const sa = loadSuperAdmin();
      if (sa && sa.username === username && sa.password === password) {
        localStorage.setItem("pw_superadmin_session", "1");
        setIsLoggedInAsSuperAdmin(true);
        return true;
      }
      return false;
    },
    [],
  );

  const superAdminLogout = useCallback(() => {
    localStorage.removeItem("pw_superadmin_session");
    setIsLoggedInAsSuperAdmin(false);
  }, []);

  return (
    <SuperAdminContext.Provider
      value={{
        superAdmin,
        pharmacies,
        isSuperAdminSetup: !!superAdmin,
        setupSuperAdmin,
        addPharmacy,
        deletePharmacy,
        isLoggedInAsSuperAdmin,
        superAdminLogin,
        superAdminLogout,
      }}
    >
      {children}
    </SuperAdminContext.Provider>
  );
}

export function useSuperAdmin() {
  const ctx = useContext(SuperAdminContext);
  if (!ctx)
    throw new Error("useSuperAdmin must be used within SuperAdminProvider");
  return ctx;
}
