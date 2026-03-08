import type { backendInterface } from "@/backend";
import { createActorWithConfig } from "@/config";
import type React from "react";
import { createContext, useContext, useEffect, useState } from "react";

let _actor: backendInterface | null = null;
async function getActor(): Promise<backendInterface> {
  if (!_actor) {
    _actor = await createActorWithConfig();
  }
  return _actor;
}

/** Retry a function up to `retries` times with backoff */
async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 4,
  delayMs = 1000,
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

/** Wrap a promise with a timeout */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("Request timed out")), ms),
    ),
  ]);
}

import type { Account } from "../types";

interface AuthContextType {
  currentUser: Account | null;
  login: (user: Account) => void;
  logout: () => void;
  loginByCredentials: (
    pharmacyId: string,
    username: string,
    password: string,
  ) => Promise<Account | null>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

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

/** Return a pharmacy-scoped session key so sessions don't bleed across pharmacies */
function sessionKey(): string {
  const pid = localStorage.getItem("pw_selected_pharmacy") ?? "__none__";
  return `pw_currentUser_${pid}`;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<Account | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Restore session from localStorage using pharmacy-scoped key
    const key = sessionKey();
    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        const user = JSON.parse(stored) as Account;
        setCurrentUser(user);
      } catch {
        localStorage.removeItem(key);
      }
    }
    setIsLoading(false);
  }, []);

  const login = (user: Account) => {
    const key = sessionKey();
    localStorage.setItem(key, JSON.stringify(user));
    setCurrentUser(user);
    // Notify DataProviderWrapper that pharmacy selection may have changed
    window.dispatchEvent(new Event("pw_pharmacy_changed"));
  };

  const logout = () => {
    const key = sessionKey();
    localStorage.removeItem(key);
    setCurrentUser(null);
    window.dispatchEvent(new Event("pw_pharmacy_changed"));
  };

  const loginByCredentials = async (
    pharmacyId: string,
    username: string,
    password: string,
  ): Promise<Account | null> => {
    try {
      const result = await withTimeout(
        withRetry(
          async () => {
            const actor = await getActor();
            return actor.verifyAccount(pharmacyId, username, password);
          },
          4,
          1200,
        ),
        25000,
      );
      if (result) {
        return mapBackendAccount(result);
      }
      return null;
    } catch (err) {
      console.error("Login by credentials failed:", err);
      throw err;
    }
  };

  return (
    <AuthContext.Provider
      value={{ currentUser, login, logout, loginByCredentials, isLoading }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
