import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "@tanstack/react-router";
import { AlertCircle, Loader2, Lock, Shield, User } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useSuperAdmin } from "../contexts/SuperAdminContext";

export function SuperAdminSetupPage() {
  const { setupSuperAdmin, isSuperAdminSetup } = useSuperAdmin();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  // If already set up, redirect to login
  if (isSuperAdminSetup) {
    navigate({ to: "/superadmin/login" });
    return null;
  }

  const validate = () => {
    const e: Record<string, string> = {};
    if (!username.trim()) e.username = "Username is required";
    if (!password) e.password = "Password is required";
    else if (password.length < 4) e.password = "Minimum 4 characters";
    if (!confirmPassword) e.confirmPassword = "Please confirm password";
    else if (password !== confirmPassword)
      e.confirmPassword = "Passwords do not match";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await setupSuperAdmin(username.trim(), password);
      toast.success("Master admin account created successfully!");
      await navigate({ to: "/superadmin/dashboard" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("already exists")) {
        toast.error("Master admin already set up. Redirecting to login...");
        setTimeout(() => navigate({ to: "/superadmin/login" }), 1500);
      } else {
        toast.error("Failed to create master admin account. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSubmit();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sidebar via-sidebar/90 to-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary mb-4 shadow-lg">
            <Shield className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Pharmacy World</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Multi-Pharmacy Management System
          </p>
        </div>

        <Card className="shadow-2xl border-border">
          <CardHeader className="pb-3 pt-6 text-center">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 mx-auto mb-3">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-lg font-bold text-foreground">
              Create Master Admin Account
            </h2>
            <p className="text-sm text-muted-foreground">
              This is a one-time setup. The master admin manages all pharmacies.
            </p>
          </CardHeader>
          <CardContent className="space-y-4 pb-6">
            <div className="space-y-1.5">
              <Label htmlFor="sa-username">Username *</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="sa-username"
                  placeholder="e.g. superadmin"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className={`pl-9 ${errors.username ? "border-destructive" : ""}`}
                  autoFocus
                />
              </div>
              {errors.username && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.username}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sa-password">Password *</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="sa-password"
                  type="password"
                  placeholder="Minimum 4 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className={`pl-9 ${errors.password ? "border-destructive" : ""}`}
                />
              </div>
              {errors.password && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.password}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sa-confirm">Confirm Password *</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="sa-confirm"
                  type="password"
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className={`pl-9 ${errors.confirmPassword ? "border-destructive" : ""}`}
                />
              </div>
              {errors.confirmPassword && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.confirmPassword}
                </p>
              )}
            </div>

            <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 text-xs text-muted-foreground">
              <p className="font-semibold text-foreground mb-1">Important:</p>
              <ul className="space-y-0.5 list-disc list-inside">
                <li>Keep your master password safe — it cannot be recovered</li>
                <li>
                  You can create separate pharmacy accounts from the dashboard
                </li>
                <li>Each pharmacy will have its own isolated data</li>
              </ul>
            </div>

            <Button
              className="w-full"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Account...
                </>
              ) : (
                "Create Master Admin Account"
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
