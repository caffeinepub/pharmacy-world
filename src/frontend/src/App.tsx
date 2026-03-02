import { Toaster } from "@/components/ui/sonner";
import {
  Navigate,
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Layout } from "./components/Layout";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { DataProvider } from "./contexts/DataContext";
import {
  SuperAdminProvider,
  useSuperAdmin,
} from "./contexts/SuperAdminContext";
import { AccountsPage } from "./pages/AccountsPage";
import { DashboardPage } from "./pages/DashboardPage";
import { HistoryPage } from "./pages/HistoryPage";
import { InventoryPage } from "./pages/InventoryPage";
import { LoginPage } from "./pages/LoginPage";
import { PurchasesPage } from "./pages/PurchasesPage";
import { SalesPage } from "./pages/SalesPage";
import { SuperAdminDashboardPage } from "./pages/SuperAdminDashboardPage";
import { SuperAdminLoginPage } from "./pages/SuperAdminLoginPage";
import { SuperAdminSetupPage } from "./pages/SuperAdminSetupPage";

// ---- Smart Root Redirect ----

function RootRedirect() {
  const { isSuperAdminSetup, pharmacies, isLoading } = useSuperAdmin();
  const [showSlowWarning, setShowSlowWarning] = useState(false);

  useEffect(() => {
    if (!isLoading) return;
    const t = setTimeout(() => setShowSlowWarning(true), 8000);
    return () => clearTimeout(t);
  }, [isLoading]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Loading...</p>
          {showSlowWarning && (
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
              Taking longer than usual… Please wait or{" "}
              <button
                type="button"
                className="underline text-primary hover:opacity-80"
                onClick={() => window.location.reload()}
              >
                refresh the page
              </button>
            </p>
          )}
        </div>
      </div>
    );
  }

  if (!isSuperAdminSetup) {
    return <Navigate to="/superadmin/setup" />;
  }
  if (pharmacies.length === 0) {
    return <Navigate to="/superadmin/dashboard" />;
  }
  return <Navigate to="/login" />;
}

// ---- Auth Guard Wrappers ----

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { currentUser, isLoading } = useAuth();
  const { pharmacies } = useSuperAdmin();
  const selectedPharmacyId = localStorage.getItem("pw_selected_pharmacy") ?? "";

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }
  if (!currentUser) {
    return <Navigate to="/login" />;
  }
  if (
    !selectedPharmacyId ||
    !pharmacies.find((p) => p.id === selectedPharmacyId)
  ) {
    return <Navigate to="/login" />;
  }
  return <Layout>{children}</Layout>;
}

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { currentUser } = useAuth();
  if (currentUser?.role !== "admin") {
    return <Navigate to="/dashboard" />;
  }
  return <>{children}</>;
}

function RequireGuest({ children }: { children: React.ReactNode }) {
  const { currentUser, isLoading } = useAuth();
  if (isLoading) return null;
  if (currentUser) {
    return <Navigate to="/dashboard" />;
  }
  return <>{children}</>;
}

function RequireSuperAdminGuest({ children }: { children: React.ReactNode }) {
  const { isLoggedInAsSuperAdmin } = useSuperAdmin();
  if (isLoggedInAsSuperAdmin) {
    return <Navigate to="/superadmin/dashboard" />;
  }
  return <>{children}</>;
}

// ---- Routes ----

const rootRoute = createRootRoute({
  component: Outlet,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: RootRedirect,
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  component: () => (
    <RequireGuest>
      <LoginPage />
    </RequireGuest>
  ),
});

const superAdminSetupRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/superadmin/setup",
  component: SuperAdminSetupPage,
});

const superAdminLoginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/superadmin/login",
  component: () => (
    <RequireSuperAdminGuest>
      <SuperAdminLoginPage />
    </RequireSuperAdminGuest>
  ),
});

const superAdminDashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/superadmin/dashboard",
  component: SuperAdminDashboardPage,
});

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/dashboard",
  component: () => (
    <RequireAuth>
      <DashboardPage />
    </RequireAuth>
  ),
});

const inventoryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/inventory",
  component: () => (
    <RequireAuth>
      <RequireAdmin>
        <InventoryPage />
      </RequireAdmin>
    </RequireAuth>
  ),
});

const accountsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/accounts",
  component: () => (
    <RequireAuth>
      <RequireAdmin>
        <AccountsPage />
      </RequireAdmin>
    </RequireAuth>
  ),
});

const salesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/sales",
  component: () => (
    <RequireAuth>
      <SalesPage />
    </RequireAuth>
  ),
});

const historyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/history",
  component: () => (
    <RequireAuth>
      <HistoryPage />
    </RequireAuth>
  ),
});

const purchasesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/purchases",
  component: () => (
    <RequireAuth>
      <RequireAdmin>
        <PurchasesPage />
      </RequireAdmin>
    </RequireAuth>
  ),
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  superAdminSetupRoute,
  superAdminLoginRoute,
  superAdminDashboardRoute,
  dashboardRoute,
  inventoryRoute,
  accountsRoute,
  salesRoute,
  historyRoute,
  purchasesRoute,
]);

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

// ---- DataProvider with dynamic pharmacyId ----
// Reads pharmacyId from localStorage on every render cycle via a state that
// gets updated when the "pw_pharmacy_changed" custom event fires (dispatched
// after a successful login/logout).

function DataProviderWrapper({ children }: { children: React.ReactNode }) {
  const [pharmacyId, setPharmacyId] = useState<string>(
    () => localStorage.getItem("pw_selected_pharmacy") ?? "__none__",
  );

  useEffect(() => {
    const handler = () => {
      setPharmacyId(localStorage.getItem("pw_selected_pharmacy") ?? "__none__");
    };
    window.addEventListener("pw_pharmacy_changed", handler);
    return () => window.removeEventListener("pw_pharmacy_changed", handler);
  }, []);

  return <DataProvider pharmacyId={pharmacyId}>{children}</DataProvider>;
}

// ---- App Root ----

export default function App() {
  return (
    <SuperAdminProvider>
      <DataProviderWrapper>
        <AuthProvider>
          <RouterProvider router={router} />
          <Toaster position="top-right" richColors />
        </AuthProvider>
      </DataProviderWrapper>
    </SuperAdminProvider>
  );
}
