import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowLeft,
  Loader2,
  Lock,
  RefreshCw,
  Shield,
  User,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useSuperAdmin } from "../contexts/SuperAdminContext";

/** Sleep for ms milliseconds */
function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

export function SuperAdminLoginPage() {
  const { superAdminLogin, isLoggedInAsSuperAdmin, isLoading, initFailed } =
    useSuperAdmin();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("Signing in...");

  // If already logged in, redirect
  if (isLoggedInAsSuperAdmin) {
    navigate({ to: "/superadmin/dashboard" });
    return null;
  }

  // Full-page loading while connecting to backend
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sidebar via-sidebar/90 to-background flex items-center justify-center p-4">
        <div
          className="text-center space-y-4"
          data-ocid="superadmin.loading_state"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary mb-2 shadow-lg">
            <Shield className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Pharmacy World</h1>
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">
              Connecting to server, please wait...
            </span>
          </div>
          <p className="text-xs text-muted-foreground max-w-xs">
            First load may take up to 30 seconds while the server starts.
          </p>
        </div>
      </div>
    );
  }

  // Full-page error if init permanently failed
  if (initFailed) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sidebar via-sidebar/90 to-background flex items-center justify-center p-4">
        <div
          className="text-center space-y-4 max-w-sm"
          data-ocid="superadmin.error_state"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-destructive/10 mb-2">
            <AlertCircle className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="text-xl font-bold text-foreground">
            Connection Failed
          </h1>
          <p className="text-sm text-muted-foreground">
            Could not connect to server. Please check your internet connection
            and try again.
          </p>
          <Button
            onClick={() => window.location.reload()}
            className="w-full gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh Page
          </Button>
          <Link
            to="/login"
            className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Pharmacy Login
          </Link>
        </div>
      </div>
    );
  }

  const handleLogin = async () => {
    setError("");
    if (!username.trim() || !password) {
      setError("Please enter username and password");
      return;
    }

    setLoading(true);
    setLoadingMsg("Signing in...");

    const MAX_RETRIES = 10;
    let lastErr: unknown = null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const success = await superAdminLogin(username.trim(), password);
        if (!success) {
          setError(
            "Invalid master admin credentials. Please check username and password.",
          );
          setLoading(false);
          return;
        }

        toast.success("Welcome, Master Admin!");
        await navigate({ to: "/superadmin/dashboard" });
        setLoading(false);
        return; // success
      } catch (err) {
        lastErr = err;
        if (attempt < MAX_RETRIES - 1) {
          if (attempt >= 1) {
            setLoadingMsg(
              `Server is starting up... (${attempt + 1}/${MAX_RETRIES})`,
            );
          }
          const delay = Math.min(2000 * (attempt + 1), 8000);
          await sleep(delay);
        }
      }
    }

    // All retries exhausted
    const finalMsg =
      lastErr instanceof Error ? lastErr.message : String(lastErr);
    if (finalMsg.includes("timed out") || finalMsg.includes("timeout")) {
      setError(
        "Server is taking too long to start. Please refresh the page (F5) and try again.",
      );
    } else {
      setError("Connection error. Please refresh the page (F5) and try again.");
    }
    setLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleLogin();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sidebar via-sidebar/90 to-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary mb-4 shadow-lg">
            <Shield className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Pharmacy World</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Master Admin Portal
          </p>
        </div>

        <Card className="shadow-xl border-border">
          <CardHeader className="pb-4 pt-6 text-center">
            <h2 className="text-lg font-semibold text-foreground">
              Master Admin Login
            </h2>
            <p className="text-xs text-muted-foreground">
              Access the pharmacy management dashboard
            </p>
          </CardHeader>
          <CardContent className="space-y-4 pb-6">
            {error && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="sa-username">Username</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="sa-username"
                  placeholder="Master admin username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="pl-9"
                  autoFocus
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sa-password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="sa-password"
                  type="password"
                  placeholder="Master admin password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="pl-9"
                />
              </div>
            </div>

            <Button className="w-full" onClick={handleLogin} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {loadingMsg}
                </>
              ) : (
                "Sign In as Master Admin"
              )}
            </Button>

            <div className="pt-2 border-t border-border">
              <Link
                to="/login"
                className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Pharmacy Login
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
