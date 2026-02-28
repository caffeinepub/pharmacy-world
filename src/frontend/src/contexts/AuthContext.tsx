import type React from "react";
import { createContext, useContext, useEffect, useState } from "react";
import type { Account } from "../types";

interface AuthContextType {
  currentUser: Account | null;
  login: (user: Account) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<Account | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("pw_currentUser");
    if (stored) {
      try {
        const user = JSON.parse(stored) as Account;
        setCurrentUser(user);
      } catch {
        localStorage.removeItem("pw_currentUser");
      }
    }
    setIsLoading(false);
  }, []);

  const login = (user: Account) => {
    localStorage.setItem("pw_currentUser", JSON.stringify(user));
    setCurrentUser(user);
  };

  const logout = () => {
    localStorage.removeItem("pw_currentUser");
    setCurrentUser(null);
  };

  return (
    <AuthContext.Provider value={{ currentUser, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
