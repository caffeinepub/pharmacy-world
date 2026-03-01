import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  AlertCircle,
  History,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Pill,
  ShoppingBag,
  ShoppingCart,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "../contexts/AuthContext";
import { useData } from "../contexts/DataContext";
import { useSuperAdmin } from "../contexts/SuperAdminContext";

const navItems = [
  {
    label: "Dashboard",
    path: "/dashboard",
    icon: LayoutDashboard,
    adminOnly: false,
  },
  {
    label: "Inventory",
    path: "/inventory",
    icon: Package,
    adminOnly: true,
  },
  {
    label: "Accounts",
    path: "/accounts",
    icon: Users,
    adminOnly: true,
  },
  {
    label: "New Sale",
    path: "/sales",
    icon: ShoppingCart,
    adminOnly: false,
  },
  {
    label: "Sales History",
    path: "/history",
    icon: History,
    adminOnly: false,
  },
  {
    label: "Purchases",
    path: "/purchases",
    icon: ShoppingBag,
    adminOnly: true,
  },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const { currentUser, logout, login } = useAuth();
  const { updateAccount } = useData();
  const { pharmacies } = useSuperAdmin();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [changePwOpen, setChangePwOpen] = useState(false);
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  // Resolve current pharmacy name dynamically
  const selectedPharmacyId = localStorage.getItem("pw_selected_pharmacy") ?? "";
  const currentPharmacy = pharmacies.find((p) => p.id === selectedPharmacyId);
  const pharmacyName = currentPharmacy?.name ?? "Pharmacy World";

  const visibleNav = navItems.filter(
    (item) => !item.adminOnly || currentUser?.role === "admin",
  );

  // ---- Change Password logic ----
  const [cpCurrent, setCpCurrent] = useState("");
  const [cpNew, setCpNew] = useState("");
  const [cpConfirm, setCpConfirm] = useState("");
  const [cpErrors, setCpErrors] = useState<Record<string, string>>({});
  const [cpLoading, setCpLoading] = useState(false);

  const openChangePw = () => {
    setCpCurrent("");
    setCpNew("");
    setCpConfirm("");
    setCpErrors({});
    setChangePwOpen(true);
  };

  const handleChangePassword = async () => {
    const e: Record<string, string> = {};
    if (!cpCurrent) e.current = "Current password is required";
    else if (cpCurrent !== currentUser?.password)
      e.current = "Current password is incorrect";
    if (!cpNew) e.newPw = "New password is required";
    else if (cpNew.length < 4) e.newPw = "Minimum 4 characters";
    if (!cpConfirm) e.confirm = "Please confirm new password";
    else if (cpNew !== cpConfirm) e.confirm = "Passwords do not match";
    setCpErrors(e);
    if (Object.keys(e).length > 0) return;

    setCpLoading(true);
    await new Promise((r) => setTimeout(r, 300));

    if (currentUser) {
      updateAccount(currentUser.id, { password: cpNew });
      // Update stored session with new password (pharmacy-scoped key via login())
      const updated = { ...currentUser, password: cpNew };
      login(updated);
    }
    toast.success("Password changed successfully");
    setChangePwOpen(false);
    setCpLoading(false);
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-6 border-b border-sidebar-border">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-sidebar-primary/20">
          <Pill className="w-5 h-5 text-sidebar-primary" />
        </div>
        <div>
          <p className="font-bold text-sidebar-foreground text-sm leading-none truncate max-w-[130px]">
            {pharmacyName}
          </p>
          <p className="text-xs text-sidebar-foreground/60 mt-0.5">
            Management System
          </p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {visibleNav.map((item) => {
          const isActive = currentPath === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-white hover:bg-sidebar-accent hover:text-white"
              }`}
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User info */}
      <div className="border-t border-sidebar-border px-4 py-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-sidebar-primary/20 flex items-center justify-center text-xs font-bold text-sidebar-primary">
            {currentUser?.fullName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-sidebar-foreground truncate">
              {currentUser?.fullName}
            </p>
            <p className="text-xs text-white/60 capitalize">
              {currentUser?.role}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={openChangePw}
          className="w-full justify-start gap-2 text-white/80 hover:text-white hover:bg-sidebar-accent text-xs mb-1"
        >
          <KeyRound className="w-3.5 h-3.5" />
          Change Password
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={logout}
          className="w-full justify-start gap-2 text-white/80 hover:text-white hover:bg-sidebar-accent text-xs"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sign Out
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-60 bg-sidebar fixed inset-y-0 left-0 z-40">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        // biome-ignore lint/a11y/useKeyWithClickEvents: overlay dismiss on click is acceptable UX
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50"
          onClick={() => setSidebarOpen(false)}
          role="presentation"
        >
          {/* biome-ignore lint/a11y/useKeyWithClickEvents: stop propagation inside sidebar */}
          <aside
            className="w-60 h-full bg-sidebar"
            onClick={(e) => e.stopPropagation()}
          >
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 lg:ml-60 flex flex-col min-h-screen">
        {/* Mobile Topbar */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-sidebar border-b border-sidebar-border">
          <div className="flex items-center gap-2">
            <Pill className="w-5 h-5 text-sidebar-primary" />
            <span className="font-bold text-sidebar-foreground text-sm truncate max-w-[160px]">
              {pharmacyName}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-sidebar-foreground p-1"
          >
            {sidebarOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
        </header>

        <main className="flex-1 p-4 lg:p-6">{children}</main>

        {/* Footer */}
        <footer className="px-6 py-3 text-center text-xs text-muted-foreground border-t border-border">
          © {new Date().getFullYear()}. Built with ♥ using{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            caffeine.ai
          </a>
        </footer>
      </div>

      {/* Change Password Dialog */}
      <Dialog
        open={changePwOpen}
        onOpenChange={(o) => !o && setChangePwOpen(false)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-primary" />
              Change Password
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="cp-current">Current Password *</Label>
              <Input
                id="cp-current"
                type="password"
                placeholder="Enter current password"
                value={cpCurrent}
                onChange={(e) => setCpCurrent(e.target.value)}
                className={cpErrors.current ? "border-destructive" : ""}
                autoFocus
              />
              {cpErrors.current && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {cpErrors.current}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cp-new">New Password *</Label>
              <Input
                id="cp-new"
                type="password"
                placeholder="Minimum 4 characters"
                value={cpNew}
                onChange={(e) => setCpNew(e.target.value)}
                className={cpErrors.newPw ? "border-destructive" : ""}
              />
              {cpErrors.newPw && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {cpErrors.newPw}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cp-confirm">Confirm New Password *</Label>
              <Input
                id="cp-confirm"
                type="password"
                placeholder="Re-enter new password"
                value={cpConfirm}
                onChange={(e) => setCpConfirm(e.target.value)}
                className={cpErrors.confirm ? "border-destructive" : ""}
              />
              {cpErrors.confirm && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {cpErrors.confirm}
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setChangePwOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleChangePassword} disabled={cpLoading}>
              {cpLoading ? "Saving..." : "Change Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
