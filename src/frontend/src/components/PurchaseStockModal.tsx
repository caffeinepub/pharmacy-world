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

type EntryMode = "tablets" | "boxes" | "syrup";

const COMMON_BOX_SIZES = [10, 14, 15, 20, 28, 30, 60, 100];

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function PurchaseStockModal({
  open,
  onClose,
  medicine,
}: PurchaseStockModalProps) {
  const { addPurchaseRecord, updateMedicine } = useData();
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

  // Syrup mode state
  const [syrupBottleQty, setSyrupBottleQty] = useState("");
  const [syrupVolumeMl, setSyrupVolumeMl] = useState("");

  // Sale price (always shown, auto-calculated)
  const [newSalePrice, setNewSalePrice] = useState("");

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
      setSyrupBottleQty("");
      setSyrupVolumeMl("");
      setNewSalePrice("");
      setSalePriceManuallyEdited(false);
    }
  }, [medicine, openRef]);

  const resolvedTabletsPerBox = useCustomPerBox
    ? Number(customTabletsPerBox) || 0
    : Number(tabletsPerBox) || 0;

  const totalQty =
    entryMode === "tablets"
      ? Number(tabletQty) || 0
      : entryMode === "boxes"
        ? (Number(boxQty) || 0) * resolvedTabletsPerBox
        : Number(syrupBottleQty) || 0;

  // If box mode: user enters price per BOX, convert to per-tablet for storage
  // Syrup mode: price per bottle
  const rawPrice = Number(form.purchasePrice);
  const pp =
    entryMode === "boxes" && resolvedTabletsPerBox > 0
      ? rawPrice / resolvedTabletsPerBox
      : rawPrice;
  const disc = Number(form.discountPercent);
  const discountAmount = pp * (disc / 100);
  const netPrice = pp - discountAmount;
  const totalCost = netPrice * totalQty;

  // Auto-suggest sale price: when purchase price or discount changes, auto-fill sale price
  // Only auto-fill if user hasn't manually edited it (track with a flag)
  const [salePriceManuallyEdited, setSalePriceManuallyEdited] = useState(false);

  // biome-ignore lint/correctness/useExhaustiveDependencies: auto-suggest logic
  useEffect(() => {
    if (!salePriceManuallyEdited && netPrice > 0) {
      // Suggest a sale price = net purchase price per tablet (user can change)
      setNewSalePrice(netPrice.toFixed(2));
    }
  }, [netPrice, salePriceManuallyEdited]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (entryMode === "tablets") {
      if (!tabletQty || Number(tabletQty) <= 0)
        newErrors.tabletQty = "Must be > 0";
    } else if (entryMode === "boxes") {
      if (!boxQty || Number(boxQty) <= 0) newErrors.boxQty = "Must be > 0";
      if (resolvedTabletsPerBox <= 0) newErrors.tabletsPerBox = "Must be > 0";
    } else {
      // syrup
      if (!syrupBottleQty || Number(syrupBottleQty) <= 0)
        newErrors.syrupBottleQty = "Must be > 0";
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

      // Always update sale price per tablet if provided
      const salePriceNum = Number(newSalePrice);
      if (!Number.isNaN(salePriceNum) && salePriceNum > 0) {
        await updateMedicine(medicine.id, {
          price: salePriceNum,
          retailPrice: salePriceNum,
        });
      }

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
      <DialogContent className="max-w-sm flex flex-col max-h-[90vh]">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Purchase Stock</DialogTitle>
        </DialogHeader>

        {medicine && (
          <div className="space-y-4 py-2 overflow-y-auto flex-1 pr-1">
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
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setEntryMode("tablets")}
                  className={`py-2 px-3 rounded-md border text-sm font-medium transition-colors ${
                    entryMode === "tablets"
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background border-border text-foreground hover:bg-muted"
                  }`}
                  data-ocid="purchase.mode_tablets.button"
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
                  data-ocid="purchase.mode_boxes.button"
                >
                  Full Box
                </button>
                <button
                  type="button"
                  onClick={() => setEntryMode("syrup")}
                  className={`py-2 px-3 rounded-md border text-sm font-medium transition-colors ${
                    entryMode === "syrup"
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background border-border text-foreground hover:bg-muted"
                  }`}
                  data-ocid="purchase.mode_syrup.button"
                >
                  Syrup / Liquid
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

            {/* Syrup mode */}
            {entryMode === "syrup" && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="syrupBottleQty">No. of Bottles *</Label>
                    <Input
                      id="syrupBottleQty"
                      type="number"
                      placeholder="0"
                      value={syrupBottleQty}
                      onChange={(e) => setSyrupBottleQty(e.target.value)}
                      className={
                        errors.syrupBottleQty ? "border-destructive" : ""
                      }
                      min="1"
                      data-ocid="purchase.syrup_bottles.input"
                    />
                    {errors.syrupBottleQty && (
                      <p className="text-xs text-destructive">
                        {errors.syrupBottleQty}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="purchaseDateSyrup">Purchase Date *</Label>
                    <Input
                      id="purchaseDateSyrup"
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
                <div className="space-y-1.5">
                  <Label htmlFor="syrupVolumeMl">
                    Volume per Bottle (ml) — Optional
                  </Label>
                  <Input
                    id="syrupVolumeMl"
                    type="number"
                    placeholder="e.g. 120"
                    value={syrupVolumeMl}
                    onChange={(e) => setSyrupVolumeMl(e.target.value)}
                    min="1"
                    data-ocid="purchase.syrup_volume.input"
                  />
                  <p className="text-xs text-muted-foreground">
                    Sirf record rakhne ke liye — optional hai
                  </p>
                </div>
                {Number(syrupBottleQty) > 0 && (
                  <div className="bg-muted/50 rounded-md px-3 py-2 text-sm">
                    <span className="text-muted-foreground">
                      Total bottles:{" "}
                    </span>
                    <span className="font-bold text-primary">
                      {syrupBottleQty} bottles
                    </span>
                    {syrupVolumeMl && Number(syrupVolumeMl) > 0 && (
                      <span className="text-muted-foreground ml-2">
                        × {syrupVolumeMl} ml ={" "}
                        {(
                          Number(syrupBottleQty) * Number(syrupVolumeMl)
                        ).toFixed(0)}{" "}
                        ml total
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Pricing */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="purchasePrice">
                  {entryMode === "boxes"
                    ? "Purchase Price/Box (Rs.) *"
                    : entryMode === "syrup"
                      ? "Purchase Price/Bottle (Rs.) *"
                      : "Purchase Price/Tablet (Rs.) *"}
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

            {/* Sale Price per unit - always visible, auto-calculated */}
            <div className="space-y-1.5 bg-amber-50 border border-amber-200 rounded-lg p-3">
              <div className="flex items-center justify-between mb-1">
                <Label
                  htmlFor="newSalePrice"
                  className="text-amber-900 font-semibold"
                >
                  {entryMode === "syrup"
                    ? "Sale Price/Bottle (Rs.) *"
                    : "Sale Price/Tablet (Rs.) *"}
                </Label>
                <span className="text-[11px] text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full font-medium">
                  Auto-calculated
                </span>
              </div>
              <Input
                id="newSalePrice"
                type="number"
                placeholder="e.g. 12.50"
                value={newSalePrice}
                onChange={(e) => {
                  setSalePriceManuallyEdited(true);
                  setNewSalePrice(e.target.value);
                }}
                min="0.01"
                step="0.01"
                className="bg-white border-amber-300 focus:border-amber-500"
              />
              <div className="flex items-center justify-between text-xs text-amber-700 mt-0.5">
                <span>
                  Current: Rs. {(medicine?.price ?? 0).toFixed(2)}
                  {entryMode === "syrup" ? "/bottle" : "/tab"}
                </span>
                {netPrice > 0 && (
                  <button
                    type="button"
                    className="underline text-amber-600 hover:text-amber-800"
                    onClick={() => {
                      setSalePriceManuallyEdited(false);
                      setNewSalePrice(netPrice.toFixed(2));
                    }}
                  >
                    Reset to purchase price
                  </button>
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
            {totalQty > 0 && rawPrice >= 0 && (
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 space-y-1.5 text-sm">
                <p className="font-semibold text-foreground text-xs uppercase tracking-wide mb-2">
                  Purchase Summary
                </p>
                {entryMode === "syrup" ? (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Price/Bottle
                      </span>
                      <span className="font-mono">
                        Rs. {rawPrice.toFixed(2)}
                      </span>
                    </div>
                    {disc > 0 && (
                      <div className="flex justify-between text-emerald-600">
                        <span>Discount ({disc}%)</span>
                        <span className="font-mono">
                          - Rs. {(rawPrice * (disc / 100)).toFixed(2)}/bottle
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Net Price/Bottle
                      </span>
                      <span className="font-mono font-semibold">
                        Rs. {netPrice.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-border pt-1.5 mt-1">
                      <span className="font-semibold">
                        Total Cost ({totalQty} bottles)
                      </span>
                      <span className="font-mono font-bold text-primary">
                        Rs. {totalCost.toFixed(2)}
                      </span>
                    </div>
                  </>
                ) : entryMode === "boxes" && resolvedTabletsPerBox > 0 ? (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Price/Box</span>
                      <span className="font-mono">
                        Rs. {rawPrice.toFixed(2)}
                      </span>
                    </div>
                    {disc > 0 && (
                      <div className="flex justify-between text-emerald-600">
                        <span>Discount ({disc}%)</span>
                        <span className="font-mono">
                          - Rs. {(rawPrice * (disc / 100)).toFixed(2)}/box
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Net Price/Box
                      </span>
                      <span className="font-mono font-semibold">
                        Rs. {(rawPrice - rawPrice * (disc / 100)).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-primary/80">
                      <span className="text-muted-foreground">
                        Net Price/Tablet
                      </span>
                      <span className="font-mono">
                        Rs. {netPrice.toFixed(2)}
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Purchase Price/Tablet
                      </span>
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
                      <span className="text-muted-foreground">
                        Net Price/Tablet
                      </span>
                      <span className="font-mono font-semibold">
                        Rs. {netPrice.toFixed(2)}
                      </span>
                    </div>
                  </>
                )}
                {entryMode !== "syrup" && (
                  <div className="flex justify-between border-t border-border pt-1.5 mt-1">
                    <span className="font-semibold">
                      Total Cost ({totalQty}{" "}
                      {entryMode === "boxes" ? "tablets" : "tablets"})
                    </span>
                    <span className="font-mono font-bold text-primary">
                      Rs. {totalCost.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <DialogFooter className="flex-shrink-0 pt-2 border-t border-border">
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
