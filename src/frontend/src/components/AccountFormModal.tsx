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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useData } from "../contexts/DataContext";

interface AccountFormModalProps {
  open: boolean;
  onClose: () => void;
}

interface FormData {
  fullName: string;
  username: string;
  password: string;
  role: "admin" | "client";
}

export function AccountFormModal({ open, onClose }: AccountFormModalProps) {
  const { accounts, addAccount } = useData();
  const [form, setForm] = useState<FormData>({
    fullName: "",
    username: "",
    password: "",
    role: "client",
  });
  const [errors, setErrors] = useState<Partial<Omit<FormData, "role">>>({});

  useEffect(() => {
    if (open) {
      setForm({ fullName: "", username: "", password: "", role: "client" });
      setErrors({});
    }
  }, [open]);

  const validate = (): boolean => {
    const newErrors: Partial<Omit<FormData, "role">> = {};
    if (!form.fullName.trim()) newErrors.fullName = "Required";
    if (!form.username.trim()) newErrors.username = "Required";
    else if (accounts.some((a) => a.username === form.username.trim()))
      newErrors.username = "Username already taken";
    if (!form.password) newErrors.password = "Required";
    else if (form.password.length < 4)
      newErrors.password = "At least 4 characters";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    addAccount({
      fullName: form.fullName.trim(),
      username: form.username.trim(),
      password: form.password,
      role: form.role,
      enabled: true,
    });
    toast.success(`Account for ${form.fullName.trim()} created`);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Create Account</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="fullName">Full Name *</Label>
            <Input
              id="fullName"
              placeholder="e.g. Ahmed Ali"
              value={form.fullName}
              onChange={(e) =>
                setForm((p) => ({ ...p, fullName: e.target.value }))
              }
              className={errors.fullName ? "border-destructive" : ""}
            />
            {errors.fullName && (
              <p className="text-xs text-destructive">{errors.fullName}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="username">Username *</Label>
            <Input
              id="username"
              placeholder="e.g. cashier2"
              value={form.username}
              onChange={(e) =>
                setForm((p) => ({ ...p, username: e.target.value }))
              }
              className={errors.username ? "border-destructive" : ""}
            />
            {errors.username && (
              <p className="text-xs text-destructive">{errors.username}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Password *</Label>
            <Input
              id="password"
              type="password"
              placeholder="Min 4 characters"
              value={form.password}
              onChange={(e) =>
                setForm((p) => ({ ...p, password: e.target.value }))
              }
              className={errors.password ? "border-destructive" : ""}
            />
            {errors.password && (
              <p className="text-xs text-destructive">{errors.password}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="role">Role *</Label>
            <Select
              value={form.role}
              onValueChange={(v: "admin" | "client") =>
                setForm((p) => ({ ...p, role: v }))
              }
            >
              <SelectTrigger id="role">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="client">Client (Cashier)</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Create Account</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
