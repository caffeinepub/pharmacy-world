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
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "../contexts/AuthContext";
import { useData } from "../contexts/DataContext";
import type { Medicine } from "../types";

interface PurchaseStockModalProps {
  open: boolean;
  onClose: () => void;
  medicine: Medicine | null;
}

interface FormData {
  quantity: string;
  purchasePrice: string;
  discountPercent: string;
  purchaseDate: string;
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function PurchaseStockModal({
  open,
  onClose,
  medicine,
}: PurchaseStockModalProps) {
  const { addPurchaseRecord } = useData();
  const { currentUser } = useAuth();

  const [form, setForm] = useState<FormData>({
    quantity: "",
    purchasePrice: "",
    discountPercent: "0",
    purchaseDate: todayStr(),
  });
  const [errors, setErrors] = useState<Partial<FormData>>({});

  const openRef = open ? 1 : 0;
  // biome-ignore lint/correctness/useExhaustiveDependencies: openRef triggers reset
  useEffect(() => {
    if (open && medicine) {
      setForm({
        quantity: "",
        purchasePrice: String(medicine.purchasePrice ?? medicine.price ?? ""),
        discountPercent: "0",
        purchaseDate: todayStr(),
      });
      setErrors({});
    }
  }, [medicine, openRef]);

  const qty = Number(form.quantity);
  const pp = Number(form.purchasePrice);
  const disc = Number(form.discountPercent);
  const discountAmount = pp * (disc / 100);
  const netPrice = pp - discountAmount;
  const totalCost = netPrice * qty;

  const validate = (): boolean => {
    const newErrors: Partial<FormData> = {};
    if (!form.quantity || Number.isNaN(qty) || qty <= 0)
      newErrors.quantity = "Must be > 0";
    if (!form.purchasePrice || Number.isNaN(pp) || pp < 0)
      newErrors.purchasePrice = "Must be >= 0";
    const d = Number(form.discountPercent);
    if (Number.isNaN(d) || d < 0 || d > 100)
      newErrors.discountPercent = "0-100";
    if (!form.purchaseDate) newErrors.purchaseDate = "Required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!medicine || !validate()) return;
    const dateISO = new Date(
      `${form.purchaseDate}T${new Date().toTimeString().slice(0, 8)}`,
    ).toISOString();

    setSubmitting(true);
    try {
      await addPurchaseRecord(
        {
          medicineId: medicine.id,
          medicineName: medicine.name,
          date: dateISO,
          quantity: qty,
          purchasePrice: pp,
          discountPercent: disc,
          discountAmount,
          netPurchasePrice: netPrice,
          totalCost,
          addedBy: currentUser?.username ?? "unknown",
          addedByName: currentUser?.fullName ?? "Unknown",
        },
        qty,
      );
      toast.success(`${qty} units of ${medicine.name} added to stock`);
      onClose();
    } catch {
      // Error toast shown in context
    } finally {
      setSubmitting(false);
    }
  };

  const field = (
    id: keyof FormData,
    label: string,
    type = "text",
    placeholder = "",
  ) => (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        placeholder={placeholder}
        value={form[id]}
        onChange={(e) => setForm((prev) => ({ ...prev, [id]: e.target.value }))}
        className={errors[id] ? "border-destructive" : ""}
      />
      {errors[id] && <p className="text-xs text-destructive">{errors[id]}</p>}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Purchase Stock</DialogTitle>
        </DialogHeader>

        {medicine && (
          <div className="space-y-4 py-2">
            {/* Medicine info */}
            <div className="bg-muted/50 rounded-lg px-3 py-2.5 space-y-0.5">
              <p className="text-sm font-semibold text-foreground">
                {medicine.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {medicine.category} · {medicine.manufacturer}
              </p>
              <p className="text-xs text-muted-foreground">
                Current Stock:{" "}
                <span className="font-medium text-foreground">
                  {medicine.quantity} units
                </span>
              </p>
            </div>

            {/* Quantity */}
            <div className="grid grid-cols-2 gap-3">
              {field("quantity", "Quantity *", "number", "0")}
              {field("purchaseDate", "Purchase Date *", "date")}
            </div>

            {/* Pricing */}
            <div className="grid grid-cols-2 gap-3">
              {field(
                "purchasePrice",
                "Purchase Price/Unit (Rs.) *",
                "number",
                "0.00",
              )}
              <div className="space-y-1.5">
                <Label htmlFor="discountPercent">Discount % (0-100)</Label>
                <Input
                  id="discountPercent"
                  type="number"
                  placeholder="0"
                  value={form.discountPercent}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      discountPercent: e.target.value,
                    }))
                  }
                  className={errors.discountPercent ? "border-destructive" : ""}
                />
                {errors.discountPercent && (
                  <p className="text-xs text-destructive">
                    {errors.discountPercent}
                  </p>
                )}
              </div>
            </div>

            {/* Added by */}
            <div className="space-y-1.5">
              <Label>Added By</Label>
              <div className="h-9 px-3 flex items-center rounded-md border border-border bg-muted/40 text-sm text-foreground">
                {currentUser?.fullName ?? "Unknown"} (
                {currentUser?.username ?? "—"})
              </div>
            </div>

            {/* Calculated summary */}
            {qty > 0 && pp >= 0 && (
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 space-y-1.5 text-sm">
                <p className="font-semibold text-foreground text-xs uppercase tracking-wide mb-2">
                  Purchase Summary
                </p>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Purchase Price</span>
                  <span className="font-mono">Rs. {pp.toFixed(2)}</span>
                </div>
                {disc > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Discount ({disc}%)</span>
                    <span className="font-mono">
                      - Rs. {discountAmount.toFixed(2)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Net Price/Unit</span>
                  <span className="font-mono font-semibold">
                    Rs. {netPrice.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between border-t border-border pt-1.5 mt-1">
                  <span className="font-semibold">
                    Total Cost ({qty} units)
                  </span>
                  <span className="font-mono font-bold text-primary">
                    Rs. {totalCost.toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!medicine || submitting}>
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Adding...
              </>
            ) : (
              "Add to Stock"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
