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

let _actor: backendInterface | null = null;
async function getActor(): Promise<backendInterface> {
  if (!_actor) {
    _actor = await createActorWithConfig();
  }
  return _actor;
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
  refreshPharmacies: () => Promise<void>;
}

const SuperAdminContext = createContext<SuperAdminContextType | null>(null);

function generateId() {
  return `ph-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Returns true if pharmacy is currently active (not expired and status=active) */
export function isPharmacyActive(pharmacy: Pharmacy): boolean {
  if (pharmacy.status === "inactive") return false;
  if (pharmacy.expiresAt) {
    const expiry = new Date(pharmacy.expiresAt);
    if (expiry < new Date()) return false;
  }
  return true;
}

/** Convert backend Pharmacy to frontend Pharmacy type */
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
  const [superAdmin, setSuperAdmin] = useState<{
    username: string;
    password: string;
  } | null>(null);
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [isSuperAdminSetup, setIsSuperAdminSetup] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedInAsSuperAdmin, setIsLoggedInAsSuperAdmin] = useState<boolean>(
    () => localStorage.getItem("pw_superadmin_session") === "1",
  );

  // Load initial data from backend
  useEffect(() => {
    async function init() {
      try {
        const actor = await getActor();
        const [sa, phs] = await Promise.all([
          actor.getSuperAdmin(),
          actor.getPharmacies(),
        ]);
        if (sa) {
          setSuperAdmin(sa);
          setIsSuperAdminSetup(true);
        } else {
          // Backend pre-seeds masteradmin/master123 so this should always be set
          setIsSuperAdminSetup(false);
        }
        setPharmacies(phs.map(mapBackendPharmacy));
      } catch (err) {
        console.error("Failed to init SuperAdminContext:", err);
        toast.error("Failed to connect to backend");
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, []);

  const refreshPharmacies = useCallback(async () => {
    try {
      const actor = await getActor();
      const phs = await actor.getPharmacies();
      setPharmacies(phs.map(mapBackendPharmacy));
    } catch (err) {
      console.error("Failed to refresh pharmacies:", err);
    }
  }, []);

  const setupSuperAdmin = useCallback(
    async (username: string, password: string) => {
      try {
        const actor = await getActor();
        await actor.setupSuperAdmin(username, password);
        setSuperAdmin({ username, password });
        setIsSuperAdminSetup(true);
      } catch (err) {
        console.error("Failed to setup super admin:", err);
        toast.error("Failed to create master admin account");
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
      // Add pharmacy to backend
      await actor.addPharmacy(
        id,
        input.name,
        input.address,
        input.phone,
        createdAt,
      );

      // Add admin account for the pharmacy
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

      // Refresh pharmacies list
      const phs = await actor.getPharmacies();
      setPharmacies(phs.map(mapBackendPharmacy));
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
      // Remove selected pharmacy if it's the deleted one
      if (localStorage.getItem("pw_selected_pharmacy") === id) {
        localStorage.removeItem("pw_selected_pharmacy");
      }
      setPharmacies((prev) => prev.filter((p) => p.id !== id));
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
        // Find current pharmacy to compute base date
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

        setPharmacies((prev) =>
          prev.map((p) =>
            p.id === id
              ? {
                  ...p,
                  status: "active" as const,
                  expiresAt: expiry.toISOString(),
                }
              : p,
          ),
        );
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
      setPharmacies((prev) =>
        prev.map((p) =>
          p.id === id ? { ...p, status: "inactive" as const } : p,
        ),
      );
    } catch (err) {
      console.error("Failed to deactivate pharmacy:", err);
      toast.error("Failed to deactivate pharmacy");
      throw err;
    }
  }, []);

  const superAdminLogin = useCallback(
    async (username: string, password: string): Promise<boolean> => {
      try {
        const actor = await getActor();
        const success = await actor.verifySuperAdmin(username, password);
        if (success) {
          localStorage.setItem("pw_superadmin_session", "1");
          setIsLoggedInAsSuperAdmin(true);
          // Also fetch the SA object
          const sa = await actor.getSuperAdmin();
          if (sa) setSuperAdmin(sa);
        }
        return success;
      } catch (err) {
        console.error("Super admin login failed:", err);
        return false;
      }
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

  return (
    <SuperAdminContext.Provider
      value={{
        superAdmin,
        pharmacies,
        isSuperAdminSetup,
        isLoading,
        setupSuperAdmin,
        addPharmacy,
        deletePharmacy,
        activatePharmacy,
        deactivatePharmacy,
        isLoggedInAsSuperAdmin,
        superAdminLogin,
        superAdminLogout,
        changeSuperAdminPassword,
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
