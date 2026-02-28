import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Link, useNavigate } from "@tanstack/react-router";
import { AlertCircle, Building2, Lock, Pill, User } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "../contexts/AuthContext";
import { useData } from "../contexts/DataContext";
import { useSuperAdmin } from "../contexts/SuperAdminContext";

export function LoginPage() {
  const { login } = useAuth();
  const { accounts } = useData();
  const { pharmacies } = useSuperAdmin();
  const navigate = useNavigate();

  const [selectedPharmacyId, setSelectedPharmacyId] = useState<string>(() => {
    return localStorage.getItem("pw_selected_pharmacy") ?? "";
  });
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Sync selected pharmacy to localStorage and trigger DataProvider reload
  useEffect(() => {
    if (selectedPharmacyId) {
      localStorage.setItem("pw_selected_pharmacy", selectedPharmacyId);
    }
  }, [selectedPharmacyId]);

  const selectedPharmacy = pharmacies.find((p) => p.id === selectedPharmacyId);

  const handleLogin = async () => {
    setError("");
    if (!selectedPharmacyId) {
      setError("Please select a pharmacy first");
      return;
    }
    if (!username.trim() || !password) {
      setError("Please enter username and password");
      return;
    }

    setLoading(true);
    await new Promise((r) => setTimeout(r, 400));

    const account = accounts.find((a) => a.username === username.trim());
    if (!account || account.password !== password) {
      setError("Invalid username or password");
      setLoading(false);
      return;
    }
    if (!account.enabled) {
      setError("This account has been disabled. Contact administrator.");
      setLoading(false);
      return;
    }

    login(account);
    toast.success(`Welcome back, ${account.fullName}!`);
    await navigate({ to: "/dashboard" });
    setLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleLogin();
  };

  const displayName = selectedPharmacy?.name ?? "Pharmacy World";

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary mb-4 shadow-lg">
            <Pill className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">{displayName}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Professional Pharmacy Management System
          </p>
        </div>

        <Card className="shadow-xl border-border">
          <CardHeader className="pb-4 pt-6">
            <h2 className="text-lg font-semibold text-center text-foreground">
              Sign In to Your Account
            </h2>
          </CardHeader>
          <CardContent className="space-y-4 pb-6">
            {error && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Pharmacy Selector */}
            <div className="space-y-1.5">
              <Label htmlFor="pharmacy-select">Select Pharmacy</Label>
              {pharmacies.length === 0 ? (
                <div className="rounded-lg border border-border bg-muted/40 p-3 text-center">
                  <Building2 className="w-5 h-5 text-muted-foreground mx-auto mb-1" />
                  <p className="text-xs text-muted-foreground">
                    No pharmacies registered.{" "}
                    <Link
                      to="/superadmin/login"
                      className="text-primary hover:underline font-medium"
                    >
                      Set up master admin
                    </Link>{" "}
                    to create one.
                  </p>
                </div>
              ) : (
                <Select
                  value={selectedPharmacyId}
                  onValueChange={setSelectedPharmacyId}
                >
                  <SelectTrigger id="pharmacy-select">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-muted-foreground" />
                      <SelectValue placeholder="Choose a pharmacy..." />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {pharmacies.map((ph) => (
                      <SelectItem key={ph.id} value={ph.id}>
                        {ph.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="username">Username</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="username"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="pl-9"
                  autoFocus
                  disabled={!selectedPharmacyId}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="pl-9"
                  disabled={!selectedPharmacyId}
                />
              </div>
            </div>

            <Button
              className="w-full"
              onClick={handleLogin}
              disabled={loading || !selectedPharmacyId}
            >
              {loading ? "Signing in..." : "Sign In"}
            </Button>

            <div className="pt-2 border-t border-border text-center">
              <Link
                to="/superadmin/login"
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Super Admin Login
              </Link>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-4">
          © {new Date().getFullYear()} Pharmacy World. All rights reserved.
        </p>
      </div>
    </div>
  );
}
