import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useNavigate } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowRight,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  LogOut,
  Phone,
  Plus,
  Shield,
  Trash2,
  User,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { isPharmacyActive, useSuperAdmin } from "../contexts/SuperAdminContext";
import type { Pharmacy } from "../types";

interface CreatePharmacyForm {
  name: string;
  address: string;
  phone: string;
  adminFullName: string;
  adminUsername: string;
  adminPassword: string;
}

const emptyForm: CreatePharmacyForm = {
  name: "",
  address: "",
  phone: "",
  adminFullName: "",
  adminUsername: "",
  adminPassword: "",
};

// Duration options
const DURATION_OPTIONS = [
  { label: "1 Month", months: 1 },
  { label: "3 Months", months: 3 },
  { label: "6 Months", months: 6 },
  { label: "1 Year", months: 12 },
  { label: "2 Years", months: 24 },
  { label: "3 Years", months: 36 },
];

const SUPPORT_PHONE = "03114187399";

function formatExpiry(expiresAt?: string): string {
  if (!expiresAt) return "No expiry set";
  const d = new Date(expiresAt);
  const now = new Date();
  if (d < now) return "Expired";
  const diffMs = d.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 1) return "Expires tomorrow";
  if (diffDays <= 30) return `Expires in ${diffDays} days`;
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12)
    return `Expires in ${diffMonths} month${diffMonths > 1 ? "s" : ""}`;
  const diffYears = Math.floor(diffMonths / 12);
  const remMonths = diffMonths % 12;
  if (remMonths === 0)
    return `Expires in ${diffYears} year${diffYears > 1 ? "s" : ""}`;
  return `Expires in ${diffYears}y ${remMonths}m`;
}

function getDaysUntilExpiry(expiresAt?: string): number | null {
  if (!expiresAt) return null;
  const d = new Date(expiresAt);
  const now = new Date();
  if (d < now) return -1;
  const diffMs = d.getTime() - now.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

export function SuperAdminDashboardPage() {
  const {
    pharmacies,
    isLoggedInAsSuperAdmin,
    superAdminLogout,
    addPharmacy,
    deletePharmacy,
    activatePharmacy,
    deactivatePharmacy,
  } = useSuperAdmin();
  const navigate = useNavigate();

  const [createOpen, setCreateOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<CreatePharmacyForm>(emptyForm);
  const [errors, setErrors] = useState<Partial<CreatePharmacyForm>>({});
  const [loading, setLoading] = useState(false);

  // Activate dialog state
  const [activatePharmacyTarget, setActivatePharmacyTarget] =
    useState<Pharmacy | null>(null);
  const [selectedDurationMonths, setSelectedDurationMonths] =
    useState<number>(12);

  // Deactivate confirmation state
  const [deactivateId, setDeactivateId] = useState<string | null>(null);

  // Redirect if not logged in as superadmin
  useEffect(() => {
    if (!isLoggedInAsSuperAdmin) {
      navigate({ to: "/superadmin/login" });
    }
  }, [isLoggedInAsSuperAdmin, navigate]);

  if (!isLoggedInAsSuperAdmin) return null;

  const handleLogout = () => {
    superAdminLogout();
    toast.success("Logged out from master admin");
    navigate({ to: "/login" });
  };

  const validate = (): boolean => {
    const e: Partial<CreatePharmacyForm> = {};
    if (!form.name.trim()) e.name = "Pharmacy name is required";
    if (!form.address.trim()) e.address = "Address is required";
    if (!form.phone.trim()) e.phone = "Phone is required";
    if (!form.adminFullName.trim())
      e.adminFullName = "Admin full name is required";
    if (!form.adminUsername.trim())
      e.adminUsername = "Admin username is required";
    if (!form.adminPassword) e.adminPassword = "Admin password is required";
    else if (form.adminPassword.length < 4)
      e.adminPassword = "Minimum 4 characters";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleCreate = async () => {
    if (!validate()) return;
    setLoading(true);
    await new Promise((r) => setTimeout(r, 300));
    addPharmacy({
      name: form.name.trim(),
      address: form.address.trim(),
      phone: form.phone.trim(),
      adminFullName: form.adminFullName.trim(),
      adminUsername: form.adminUsername.trim(),
      adminPassword: form.adminPassword,
    });
    toast.success(`${form.name.trim()} created successfully!`);
    setCreateOpen(false);
    setForm(emptyForm);
    setErrors({});
    setLoading(false);
  };

  const handleDelete = () => {
    if (!deleteId) return;
    const ph = pharmacies.find((p) => p.id === deleteId);
    deletePharmacy(deleteId);
    toast.success(`${ph?.name} deleted`);
    setDeleteId(null);
  };

  const handleActivate = () => {
    if (!activatePharmacyTarget) return;
    activatePharmacy(activatePharmacyTarget.id, selectedDurationMonths);
    const label =
      DURATION_OPTIONS.find((o) => o.months === selectedDurationMonths)
        ?.label ?? `${selectedDurationMonths} months`;
    toast.success(`${activatePharmacyTarget.name} activated for ${label}`);
    setActivatePharmacyTarget(null);
  };

  const handleDeactivate = () => {
    if (!deactivateId) return;
    const ph = pharmacies.find((p) => p.id === deactivateId);
    deactivatePharmacy(deactivateId);
    toast.success(`${ph?.name} deactivated`);
    setDeactivateId(null);
  };

  const handleGoToPharmacy = (pharmacyId: string) => {
    localStorage.setItem("pw_selected_pharmacy", pharmacyId);
    navigate({ to: "/login" });
  };

  const field = (
    id: keyof CreatePharmacyForm,
    label: string,
    placeholder: string,
    type = "text",
  ) => (
    <div className="space-y-1.5">
      <Label htmlFor={`cpf-${id}`}>{label} *</Label>
      <Input
        id={`cpf-${id}`}
        type={type}
        placeholder={placeholder}
        value={form[id]}
        onChange={(e) => setForm((p) => ({ ...p, [id]: e.target.value }))}
        className={errors[id] ? "border-destructive" : ""}
      />
      {errors[id] && (
        <p className="text-xs text-destructive flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          {errors[id]}
        </p>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-sidebar border-b border-sidebar-border">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-sidebar-primary/20">
              <Shield className="w-4 h-4 text-sidebar-primary" />
            </div>
            <div>
              <p className="font-bold text-sidebar-foreground text-sm leading-none">
                Pharmacy World
              </p>
              <p className="text-xs text-sidebar-foreground/60">
                Master Admin Dashboard
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="gap-2 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Page title */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Pharmacy Management
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {pharmacies.length === 0
                ? "No pharmacies yet — create your first one"
                : `${pharmacies.length} ${pharmacies.length === 1 ? "pharmacy" : "pharmacies"} registered`}
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Create New Pharmacy
          </Button>
        </div>

        {/* Empty state */}
        {pharmacies.length === 0 && (
          <div className="text-center py-20 rounded-xl border-2 border-dashed border-border">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-muted mb-4">
              <Building2 className="w-7 h-7 text-muted-foreground" />
            </div>
            <p className="font-semibold text-foreground mb-1">
              No pharmacies yet
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              Create your first pharmacy to get started
            </p>
            <Button
              onClick={() => setCreateOpen(true)}
              variant="outline"
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              Create Pharmacy
            </Button>
          </div>
        )}

        {/* Pharmacy Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {pharmacies.map((pharmacy) => {
            // Get the admin account info from localStorage
            const accountsRaw = localStorage.getItem(
              `ph_${pharmacy.id}_accounts`,
            );
            let adminUsername = "—";
            if (accountsRaw) {
              try {
                const accs = JSON.parse(accountsRaw) as Array<{
                  username: string;
                  role: string;
                }>;
                const admin = accs.find((a) => a.role === "admin");
                if (admin) adminUsername = admin.username;
              } catch {
                /* ignore */
              }
            }

            const active = isPharmacyActive(pharmacy);
            const expired =
              pharmacy.expiresAt && new Date(pharmacy.expiresAt) < new Date();
            const daysLeft = getDaysUntilExpiry(pharmacy.expiresAt);
            const expiringSoon =
              active && daysLeft !== null && daysLeft <= 7 && daysLeft >= 0;

            return (
              <Card
                key={pharmacy.id}
                className={`border-border hover:shadow-md transition-shadow ${!active ? "opacity-75" : ""}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${active ? "bg-primary/10" : "bg-muted"}`}
                      >
                        <Building2
                          className={`w-5 h-5 ${active ? "text-primary" : "text-muted-foreground"}`}
                        />
                      </div>
                      <CardTitle className="text-base truncate">
                        {pharmacy.name}
                      </CardTitle>
                    </div>
                    {active ? (
                      <Badge className="text-xs bg-green-100 text-green-700 border-0 flex-shrink-0">
                        Active
                      </Badge>
                    ) : expired ? (
                      <Badge className="text-xs bg-orange-100 text-orange-700 border-0 flex-shrink-0">
                        Expired
                      </Badge>
                    ) : (
                      <Badge className="text-xs bg-red-100 text-red-700 border-0 flex-shrink-0">
                        Inactive
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1.5 text-sm text-muted-foreground">
                    <p className="flex items-start gap-2">
                      <Building2 className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                      <span className="line-clamp-2">{pharmacy.address}</span>
                    </p>
                    <p className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>{pharmacy.phone}</span>
                    </p>
                    <p className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="font-mono">{adminUsername}</span>
                    </p>
                    <p className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                      <span
                        className={
                          expired
                            ? "text-orange-600 font-medium"
                            : expiringSoon
                              ? "text-amber-600 font-medium"
                              : ""
                        }
                      >
                        {formatExpiry(pharmacy.expiresAt)}
                      </span>
                    </p>
                  </div>

                  {/* Expiry warning -- 7 days or less */}
                  {expiringSoon && (
                    <div className="rounded-lg bg-amber-50 border border-amber-300 px-3 py-2 text-xs text-amber-800 flex items-start gap-2">
                      <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-amber-600" />
                      <span>
                        Subscription expires in{" "}
                        <strong>
                          {daysLeft} day{daysLeft !== 1 ? "s" : ""}
                        </strong>
                        . Please renew soon. Contact:{" "}
                        <strong>{SUPPORT_PHONE}</strong>
                      </span>
                    </div>
                  )}

                  {/* Expired warning */}
                  {expired && (
                    <div className="rounded-lg bg-red-50 border border-red-300 px-3 py-2 text-xs text-red-800 flex items-start gap-2">
                      <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-red-600" />
                      <span>
                        Subscription expired. Contact to renew:{" "}
                        <strong>{SUPPORT_PHONE}</strong>
                      </span>
                    </div>
                  )}

                  <p className="text-xs text-muted-foreground">
                    Created:{" "}
                    {new Date(pharmacy.createdAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </p>

                  {/* Action buttons */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {/* Activate / Extend button */}
                    <Button
                      size="sm"
                      variant={active ? "outline" : "default"}
                      className={`gap-1.5 text-xs flex-1 ${
                        active
                          ? "border-green-300 text-green-700 hover:bg-green-50"
                          : "bg-green-600 hover:bg-green-700 text-white"
                      }`}
                      onClick={() => {
                        setActivatePharmacyTarget(pharmacy);
                        setSelectedDurationMonths(12);
                      }}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {active ? "Extend" : "Activate"}
                    </Button>

                    {/* Deactivate button -- only show when active */}
                    {active && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 text-xs border-red-300 text-red-600 hover:bg-red-50"
                        onClick={() => setDeactivateId(pharmacy.id)}
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Deactivate
                      </Button>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1 gap-1.5 text-xs"
                      onClick={() => handleGoToPharmacy(pharmacy.id)}
                      disabled={!active}
                      title={
                        !active
                          ? "Activate this pharmacy first to access it"
                          : undefined
                      }
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                      Go to {pharmacy.name}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDeleteId(pharmacy.id)}
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </main>

      {/* Create Pharmacy Dialog */}
      <Dialog
        open={createOpen}
        onOpenChange={(o) => {
          if (!o) {
            setCreateOpen(false);
            setForm(emptyForm);
            setErrors({});
          }
        }}
      >
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" />
              Create New Pharmacy
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground border-b border-border pb-1.5">
                Pharmacy Details
              </h3>
              {field("name", "Pharmacy Name", "e.g. United Pharmacy")}
              {field(
                "address",
                "Address",
                "e.g. 208 Road, Near Kashmir Pull, Faisalabad",
              )}
              {field("phone", "Phone", "e.g. 0311-4187399")}
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground border-b border-border pb-1.5">
                Admin Account
              </h3>
              {field("adminFullName", "Admin Full Name", "e.g. Muhammad Awais")}
              {field("adminUsername", "Admin Username", "e.g. admin")}
              {field(
                "adminPassword",
                "Admin Password",
                "Minimum 4 characters",
                "password",
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCreateOpen(false);
                setForm(emptyForm);
                setErrors({});
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={loading}>
              {loading ? "Creating..." : "Create Pharmacy"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Activate / Extend Duration Dialog */}
      <Dialog
        open={!!activatePharmacyTarget}
        onOpenChange={(o) => !o && setActivatePharmacyTarget(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-green-600" />
              {activatePharmacyTarget &&
              isPharmacyActive(activatePharmacyTarget)
                ? "Extend Subscription"
                : "Activate Pharmacy"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {activatePharmacyTarget && (
              <p className="text-sm text-muted-foreground">
                Set subscription duration for{" "}
                <strong>{activatePharmacyTarget.name}</strong>.
                {activatePharmacyTarget.expiresAt &&
                  new Date(activatePharmacyTarget.expiresAt) > new Date() && (
                    <span className="block mt-1 text-xs text-blue-600">
                      Current expiry:{" "}
                      {new Date(
                        activatePharmacyTarget.expiresAt,
                      ).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                      . New duration will be added on top.
                    </span>
                  )}
              </p>
            )}

            <div className="space-y-1.5">
              <Label>Duration *</Label>
              <Select
                value={String(selectedDurationMonths)}
                onValueChange={(v) => setSelectedDurationMonths(Number(v))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent>
                  {DURATION_OPTIONS.map((opt) => (
                    <SelectItem key={opt.months} value={String(opt.months)}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Preview expiry date */}
            {activatePharmacyTarget && (
              <div className="rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-sm">
                <p className="text-green-700 font-medium">
                  New expiry date preview:
                </p>
                <p className="text-green-800 font-semibold">
                  {(() => {
                    const baseDate =
                      activatePharmacyTarget.status === "active" &&
                      activatePharmacyTarget.expiresAt &&
                      new Date(activatePharmacyTarget.expiresAt) > new Date()
                        ? new Date(activatePharmacyTarget.expiresAt)
                        : new Date();
                    const d = new Date(baseDate);
                    d.setMonth(d.getMonth() + selectedDurationMonths);
                    return d.toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    });
                  })()}
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setActivatePharmacyTarget(null)}
            >
              Cancel
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={handleActivate}
            >
              Confirm &amp; Activate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deactivate Confirmation */}
      <AlertDialog
        open={!!deactivateId}
        onOpenChange={(o) => !o && setDeactivateId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Pharmacy</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate{" "}
              <strong>
                {pharmacies.find((p) => p.id === deactivateId)?.name}
              </strong>
              ? The pharmacy admin and staff will not be able to log in until
              you activate it again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeactivate}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Pharmacy</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <strong>{pharmacies.find((p) => p.id === deleteId)?.name}</strong>
              ? This will permanently delete all medicines, sales, purchases and
              accounts for this pharmacy. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Pharmacy
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
