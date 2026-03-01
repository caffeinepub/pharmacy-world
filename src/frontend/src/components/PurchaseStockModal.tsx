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
  purchasePrice: string;
  discountPercent: string;
  purchaseDate: string;
}

type EntryMode = "tablets" | "boxes";

const COMMON_BOX_SIZES = [10, 14, 15, 20, 28, 30, 60, 100];

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
    purchasePrice: "",
    discountPercent: "0",
    purchaseDate: todayStr(),
  });
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});

  // Quantity entry state
  const [entryMode, setEntryMode] = useState<EntryMode>("tablets");
  const [tabletQty, setTabletQty] = useState("");
  const [boxQty, setBoxQty] = useState("");
  const [tabletsPerBox, setTabletsPerBox] = useState("30");
  const [customTabletsPerBox, setCustomTabletsPerBox] = useState("");
  const [useCustomPerBox, setUseCustomPerBox] = useState(false);

  const openRef = open ? 1 : 0;
  // biome-ignore lint/correctness/useExhaustiveDependencies: openRef triggers reset
  useEffect(() => {
    if (open && medicine) {
      setForm({
        purchasePrice: String(medicine.purchasePrice ?? medicine.price ?? ""),
        discountPercent: "0",
        purchaseDate: todayStr(),
      });
      setErrors({});
      setEntryMode("tablets");
      setTabletQty("");
      setBoxQty("");
      setTabletsPerBox("30");
      setCustomTabletsPerBox("");
      setUseCustomPerBox(false);
    }
  }, [medicine, openRef]);

  const resolvedTabletsPerBox = useCustomPerBox
    ? Number(customTabletsPerBox) || 0
    : Number(tabletsPerBox) || 0;

  const totalQty =
    entryMode === "tablets"
      ? Number(tabletQty) || 0
      : (Number(boxQty) || 0) * resolvedTabletsPerBox;

  const pp = Number(form.purchasePrice);
  const disc = Number(form.discountPercent);
  const discountAmount = pp * (disc / 100);
  const netPrice = pp - discountAmount;
  const totalCost = netPrice * totalQty;

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (entryMode === "tablets") {
      if (!tabletQty || Number(tabletQty) <= 0)
        newErrors.tabletQty = "Must be > 0";
    } else {
      if (!boxQty || Number(boxQty) <= 0) newErrors.boxQty = "Must be > 0";
      if (resolvedTabletsPerBox <= 0) newErrors.tabletsPerBox = "Must be > 0";
    }

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
          quantity: totalQty,
          purchasePrice: pp,
          discountPercent: disc,
          discountAmount,
          netPurchasePrice: netPrice,
          totalCost,
          addedBy: currentUser?.username ?? "unknown",
          addedByName: currentUser?.fullName ?? "Unknown",
        },
        totalQty,
      );
      toast.success(`${totalQty} units of ${medicine.name} added to stock`);
      onClose();
    } catch {
      // Error toast shown in context
    } finally {
      setSubmitting(false);
    }
  };

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

            {/* Entry mode toggle */}
            <div className="space-y-2">
              <Label>Quantity Entry Mode</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setEntryMode("tablets")}
                  className={`py-2 px-3 rounded-md border text-sm font-medium transition-colors ${
                    entryMode === "tablets"
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background border-border text-foreground hover:bg-muted"
                  }`}
                >
                  Tablet / Unit
                </button>
                <button
                  type="button"
                  onClick={() => setEntryMode("boxes")}
                  className={`py-2 px-3 rounded-md border text-sm font-medium transition-colors ${
                    entryMode === "boxes"
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background border-border text-foreground hover:bg-muted"
                  }`}
                >
                  Full Box
                </button>
              </div>
            </div>

            {/* Tablet mode */}
            {entryMode === "tablets" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="tabletQty">Quantity (Tablets) *</Label>
                  <Input
                    id="tabletQty"
                    type="number"
                    placeholder="0"
                    value={tabletQty}
                    onChange={(e) => setTabletQty(e.target.value)}
                    className={errors.tabletQty ? "border-destructive" : ""}
                    min="1"
                  />
                  {errors.tabletQty && (
                    <p className="text-xs text-destructive">
                      {errors.tabletQty}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="purchaseDate">Purchase Date *</Label>
                  <Input
                    id="purchaseDate"
                    type="date"
                    value={form.purchaseDate}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        purchaseDate: e.target.value,
                      }))
                    }
                    className={errors.purchaseDate ? "border-destructive" : ""}
                  />
                  {errors.purchaseDate && (
                    <p className="text-xs text-destructive">
                      {errors.purchaseDate}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Box mode */}
            {entryMode === "boxes" && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="boxQty">Number of Boxes *</Label>
                    <Input
                      id="boxQty"
                      type="number"
                      placeholder="0"
                      value={boxQty}
                      onChange={(e) => setBoxQty(e.target.value)}
                      className={errors.boxQty ? "border-destructive" : ""}
                      min="1"
                    />
                    {errors.boxQty && (
                      <p className="text-xs text-destructive">
                        {errors.boxQty}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="purchaseDateBox">Purchase Date *</Label>
                    <Input
                      id="purchaseDateBox"
                      type="date"
                      value={form.purchaseDate}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          purchaseDate: e.target.value,
                        }))
                      }
                      className={
                        errors.purchaseDate ? "border-destructive" : ""
                      }
                    />
                    {errors.purchaseDate && (
                      <p className="text-xs text-destructive">
                        {errors.purchaseDate}
                      </p>
                    )}
                  </div>
                </div>

                {/* Tablets per box */}
                <div className="space-y-2">
                  <Label>Tablets per Box *</Label>
                  {!useCustomPerBox ? (
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-1.5">
                        {COMMON_BOX_SIZES.map((size) => (
                          <button
                            key={size}
                            type="button"
                            onClick={() => setTabletsPerBox(String(size))}
                            className={`px-2.5 py-1 rounded border text-xs font-medium transition-colors ${
                              tabletsPerBox === String(size)
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-background border-border text-foreground hover:bg-muted"
                            }`}
                          >
                            {size}
                          </button>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => setUseCustomPerBox(true)}
                        className="text-xs text-primary underline"
                      >
                        Enter custom number
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <Input
                        type="number"
                        placeholder="e.g. 45"
                        value={customTabletsPerBox}
                        onChange={(e) => setCustomTabletsPerBox(e.target.value)}
                        className={
                          errors.tabletsPerBox ? "border-destructive" : ""
                        }
                        min="1"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setUseCustomPerBox(false);
                          setCustomTabletsPerBox("");
                        }}
                        className="text-xs text-primary underline"
                      >
                        Use common sizes
                      </button>
                      {errors.tabletsPerBox && (
                        <p className="text-xs text-destructive">
                          {errors.tabletsPerBox}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Box calculation preview */}
                {Number(boxQty) > 0 && resolvedTabletsPerBox > 0 && (
                  <div className="bg-muted/50 rounded-md px-3 py-2 text-sm">
                    <span className="text-muted-foreground">
                      Total tablets:{" "}
                    </span>
                    <span className="font-bold text-foreground">
                      {Number(boxQty)} boxes × {resolvedTabletsPerBox} ={" "}
                      <span className="text-primary">{totalQty} tablets</span>
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Pricing */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="purchasePrice">
                  Purchase Price/Unit (Rs.) *
                </Label>
                <Input
                  id="purchasePrice"
                  type="number"
                  placeholder="0.00"
                  value={form.purchasePrice}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      purchasePrice: e.target.value,
                    }))
                  }
                  className={errors.purchasePrice ? "border-destructive" : ""}
                />
                {errors.purchasePrice && (
                  <p className="text-xs text-destructive">
                    {errors.purchasePrice}
                  </p>
                )}
              </div>
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
            {totalQty > 0 && pp >= 0 && (
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
                    Total Cost ({totalQty} units)
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
