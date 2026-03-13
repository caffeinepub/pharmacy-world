import type { backendInterface } from "@/backend";
import { createActorWithConfig } from "@/config";
import type React from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { toast } from "sonner";
import type { Pharmacy } from "../types";

// ---- Local storage cache keys ----
const CACHE_SETUP_KEY = "pw_sa_setup";
const CACHE_PHARMACIES_KEY = "pw_pharmacies_cache";

function loadCachedSetup(): boolean {
  return localStorage.getItem(CACHE_SETUP_KEY) === "1";
}

function loadCachedPharmacies(): Pharmacy[] {
  try {
    const raw = localStorage.getItem(CACHE_PHARMACIES_KEY);
    if (raw) return JSON.parse(raw) as Pharmacy[];
  } catch (_) {}
  return [];
}

function saveCachedPharmacies(pharmacies: Pharmacy[]) {
  localStorage.setItem(CACHE_PHARMACIES_KEY, JSON.stringify(pharmacies));
}

let _actor: backendInterface | null = null;
async function getActor(): Promise<backendInterface> {
  if (!_actor) {
    _actor = await createActorWithConfig();
  }
  return _actor;
}

async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 5,
  delayMs = 600,
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

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("Request timed out")), ms),
    ),
  ]);
}

interface AddPharmacyInput {
  name: string;
  address: string;
  phone: string;
  adminUsername: string;
  adminPassword: string;
  adminFullName: string;
}

interface SuperAdminContextType {
  superAdmin: { username: string; password: string } | null;
  pharmacies: Pharmacy[];
  isSuperAdminSetup: boolean;
  isLoading: boolean;
  initFailed: boolean;
  setupSuperAdmin: (username: string, password: string) => Promise<void>;
  addPharmacy: (input: AddPharmacyInput) => Promise<void>;
  deletePharmacy: (id: string) => Promise<void>;
  activatePharmacy: (id: string, durationMonths: number) => Promise<void>;
  deactivatePharmacy: (id: string) => Promise<void>;
  isLoggedInAsSuperAdmin: boolean;
  superAdminLogin: (username: string, password: string) => Promise<boolean>;
  superAdminLogout: () => void;
  changeSuperAdminPassword: (
    oldPassword: string,
    newPassword: string,
  ) => Promise<boolean>;
  resetPharmacyAdminPassword: (
    pharmacyId: string,
    newPassword: string,
  ) => Promise<boolean>;
  refreshPharmacies: () => Promise<void>;
}

const SuperAdminContext = createContext<SuperAdminContextType | null>(null);

function generateId() {
  return `ph-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function isPharmacyActive(pharmacy: Pharmacy): boolean {
  if (pharmacy.status === "inactive") return false;
  if (pharmacy.expiresAt) {
    const expiry = new Date(pharmacy.expiresAt);
    if (expiry < new Date()) return false;
  }
  return true;
}

function mapBackendPharmacy(p: {
  id: string;
  name: string;
  address: string;
  phone: string;
  createdAt: string;
  status: string;
  expiresAt: string;
}): Pharmacy {
  return {
    id: p.id,
    name: p.name,
    address: p.address,
    phone: p.phone,
    createdAt: p.createdAt,
    status: (p.status === "inactive" ? "inactive" : "active") as
      | "active"
      | "inactive",
    expiresAt: p.expiresAt || undefined,
  };
}

export function SuperAdminProvider({
  children,
}: { children: React.ReactNode }) {
  // Initialise from cache immediately so UI renders without delay
  const cachedSetup = loadCachedSetup();
  const cachedPharmacies = loadCachedPharmacies();

  const [superAdmin, setSuperAdmin] = useState<{
    username: string;
    password: string;
  } | null>(null);
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>(cachedPharmacies);
  const [isSuperAdminSetup, setIsSuperAdminSetup] =
    useState<boolean>(cachedSetup);
  // If we have cached data, start as NOT loading so app opens instantly
  const [isLoading, setIsLoading] = useState<boolean>(
    !cachedSetup && cachedPharmacies.length === 0,
  );
  const [initFailed, setInitFailed] = useState(false);
  const [isLoggedInAsSuperAdmin, setIsLoggedInAsSuperAdmin] = useState<boolean>(
    () => localStorage.getItem("pw_superadmin_session") === "1",
  );

  // Sync pharmacies to cache whenever they change
  useEffect(() => {
    if (pharmacies.length > 0) {
      saveCachedPharmacies(pharmacies);
    }
  }, [pharmacies]);

  // Load / refresh data from backend in background
  useEffect(() => {
    async function init() {
      const MAX_ATTEMPTS = 8;
      const TIMEOUT_PER_ATTEMPT = 20000;
      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        try {
          const actor = await getActor();
          const [sa, phs] = await withTimeout(
            Promise.all([actor.getSuperAdmin(), actor.getPharmacies()]),
            TIMEOUT_PER_ATTEMPT,
          );
          const mappedPhs = phs.map(mapBackendPharmacy);
          if (sa) {
            setSuperAdmin(sa);
            setIsSuperAdminSetup(true);
            localStorage.setItem(CACHE_SETUP_KEY, "1");
          } else {
            setIsSuperAdminSetup(false);
            localStorage.removeItem(CACHE_SETUP_KEY);
          }
          setPharmacies(mappedPhs);
          saveCachedPharmacies(mappedPhs);
          setIsLoading(false);
          return;
        } catch (_err) {
          _actor = null;
          if (attempt < MAX_ATTEMPTS - 1) {
            const delay = Math.min(1000 * (attempt + 1), 4000);
            await new Promise((r) => setTimeout(r, delay));
          }
        }
      }
      // All retries exhausted -- keep showing cached data, mark failed silently
      setInitFailed(true);
      setIsLoading(false);
    }
    init();
  }, []);

  const refreshPharmacies = useCallback(async () => {
    try {
      const actor = await getActor();
      const phs = await actor.getPharmacies();
      const mapped = phs.map(mapBackendPharmacy);
      setPharmacies(mapped);
      saveCachedPharmacies(mapped);
    } catch (err) {
      console.error("Failed to refresh pharmacies:", err);
    }
  }, []);

  const setupSuperAdmin = useCallback(
    async (username: string, password: string) => {
      try {
        const success = await withTimeout(
          withRetry(
            async () => {
              const actor = await getActor();
              return actor.setupSuperAdmin(username, password);
            },
            4,
            1000,
          ),
          20000,
        );
        if (!success) {
          try {
            const actor = await getActor();
            const sa = await actor.getSuperAdmin();
            if (sa) {
              setSuperAdmin(sa);
              setIsSuperAdminSetup(true);
              localStorage.setItem(CACHE_SETUP_KEY, "1");
            }
          } catch (_) {}
          throw new Error("Master admin already exists. Please login instead.");
        }
        setSuperAdmin({ username, password });
        setIsSuperAdminSetup(true);
        localStorage.setItem(CACHE_SETUP_KEY, "1");
      } catch (err) {
        console.error("Failed to setup super admin:", err);
        throw err;
      }
    },
    [],
  );

  const addPharmacy = useCallback(async (input: AddPharmacyInput) => {
    const id = generateId();
    const createdAt = new Date().toISOString();
    try {
      const actor = await getActor();
      await actor.addPharmacy(
        id,
        input.name,
        input.address,
        input.phone,
        createdAt,
      );
      const adminAccount = {
        id: `${id}-admin-001`,
        username: input.adminUsername,
        password: input.adminPassword,
        fullName: input.adminFullName,
        role: "admin",
        enabled: true,
        createdAt,
        pharmacyId: id,
      };
      await actor.addAccount(adminAccount);
      const phs = await actor.getPharmacies();
      const mapped = phs.map(mapBackendPharmacy);
      setPharmacies(mapped);
      saveCachedPharmacies(mapped);
    } catch (err) {
      console.error("Failed to add pharmacy:", err);
      toast.error("Failed to create pharmacy");
      throw err;
    }
  }, []);

  const deletePharmacy = useCallback(async (id: string) => {
    try {
      const actor = await getActor();
      await actor.deletePharmacy(id);
      if (localStorage.getItem("pw_selected_pharmacy") === id) {
        localStorage.removeItem("pw_selected_pharmacy");
      }
      setPharmacies((prev) => {
        const updated = prev.filter((p) => p.id !== id);
        saveCachedPharmacies(updated);
        return updated;
      });
    } catch (err) {
      console.error("Failed to delete pharmacy:", err);
      toast.error("Failed to delete pharmacy");
      throw err;
    }
  }, []);

  const activatePharmacy = useCallback(
    async (id: string, durationMonths: number) => {
      try {
        const actor = await getActor();
        const current = pharmacies.find((p) => p.id === id);
        const baseDate =
          current?.status === "active" &&
          current.expiresAt &&
          new Date(current.expiresAt) > new Date()
            ? new Date(current.expiresAt)
            : new Date();
        const expiry = new Date(baseDate);
        expiry.setMonth(expiry.getMonth() + durationMonths);
        await actor.updatePharmacyStatus(id, "active", expiry.toISOString());
        setPharmacies((prev) => {
          const updated = prev.map((p) =>
            p.id === id
              ? {
                  ...p,
                  status: "active" as const,
                  expiresAt: expiry.toISOString(),
                }
              : p,
          );
          saveCachedPharmacies(updated);
          return updated;
        });
      } catch (err) {
        console.error("Failed to activate pharmacy:", err);
        toast.error("Failed to activate pharmacy");
        throw err;
      }
    },
    [pharmacies],
  );

  const deactivatePharmacy = useCallback(async (id: string) => {
    try {
      const actor = await getActor();
      await actor.updatePharmacyStatus(id, "inactive", "");
      setPharmacies((prev) => {
        const updated = prev.map((p) =>
          p.id === id ? { ...p, status: "inactive" as const } : p,
        );
        saveCachedPharmacies(updated);
        return updated;
      });
    } catch (err) {
      console.error("Failed to deactivate pharmacy:", err);
      toast.error("Failed to deactivate pharmacy");
      throw err;
    }
  }, []);

  const superAdminLogin = useCallback(
    async (username: string, password: string): Promise<boolean> => {
      const success = await withTimeout(
        withRetry(
          async () => {
            const actor = await getActor();
            return actor.verifySuperAdmin(username, password);
          },
          4,
          1000,
        ),
        25000,
      );
      if (success) {
        localStorage.setItem("pw_superadmin_session", "1");
        setIsLoggedInAsSuperAdmin(true);
        try {
          const actor = await getActor();
          const sa = await actor.getSuperAdmin();
          if (sa) setSuperAdmin(sa);
        } catch (_) {}
      }
      return success;
    },
    [],
  );

  const superAdminLogout = useCallback(() => {
    localStorage.removeItem("pw_superadmin_session");
    setIsLoggedInAsSuperAdmin(false);
  }, []);

  const changeSuperAdminPassword = useCallback(
    async (oldPassword: string, newPassword: string): Promise<boolean> => {
      try {
        const actor = await getActor();
        const success = await actor.changeSuperAdminPassword(
          oldPassword,
          newPassword,
        );
        if (success && superAdmin) {
          setSuperAdmin({ ...superAdmin, password: newPassword });
        }
        return success;
      } catch (err) {
        console.error("Failed to change super admin password:", err);
        return false;
      }
    },
    [superAdmin],
  );

  const resetPharmacyAdminPassword = useCallback(
    async (pharmacyId: string, newPassword: string): Promise<boolean> => {
      try {
        const actor = await getActor();
        const accounts = await actor.getAccounts(pharmacyId);
        const adminAccount = accounts.find((a) => a.role === "admin");
        if (!adminAccount) {
          toast.error("Admin account not found for this pharmacy");
          return false;
        }
        await actor.updateAccount(
          adminAccount.id,
          pharmacyId,
          adminAccount.username,
          newPassword,
          adminAccount.fullName,
          adminAccount.role,
          adminAccount.enabled,
        );
        return true;
      } catch (err) {
        console.error("Failed to reset pharmacy admin password:", err);
        toast.error("Failed to reset password");
        return false;
      }
    },
    [],
  );

  return (
    <SuperAdminContext.Provider
      value={{
        superAdmin,
        pharmacies,
        isSuperAdminSetup,
        isLoading,
        initFailed,
        setupSuperAdmin,
        addPharmacy,
        deletePharmacy,
        activatePharmacy,
        deactivatePharmacy,
        isLoggedInAsSuperAdmin,
        superAdminLogin,
        superAdminLogout,
        changeSuperAdminPassword,
        resetPharmacyAdminPassword,
        refreshPharmacies,
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
