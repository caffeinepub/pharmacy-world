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
import { Info, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useData } from "../contexts/DataContext";
import type { Medicine } from "../types";

interface MedicineFormModalProps {
  open: boolean;
  onClose: () => void;
  medicine?: Medicine | null;
}

interface FormData {
  name: string;
  category: string;
  manufacturer: string;
  purchasePrice: string;
  retailPrice: string;
  quantity: string;
  expiryDate: string;
  lowStockThreshold: string;
}

const EMPTY_FORM: FormData = {
  name: "",
  category: "",
  manufacturer: "",
  purchasePrice: "",
  retailPrice: "",
  quantity: "",
  expiryDate: "",
  lowStockThreshold: "10",
};

const RACK_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const RACK_NUMBERS = Array.from({ length: 10 }, (_, i) => String(i + 1));

function parseRack(rackNumber?: string) {
  if (!rackNumber || rackNumber.length < 2) return { letter: "", num: "" };
  const letter = rackNumber[0];
  const num = rackNumber.slice(1);
  return { letter, num };
}

export function MedicineFormModal({
  open,
  onClose,
  medicine,
}: MedicineFormModalProps) {
  const { addMedicine, updateMedicine } = useData();
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [rackLetter, setRackLetter] = useState("");
  const [rackNum, setRackNum] = useState("");

  const openRef = open ? 1 : 0;
  // biome-ignore lint/correctness/useExhaustiveDependencies: openRef is derived from open prop to trigger reset
  useEffect(() => {
    if (medicine) {
      const pp = medicine.purchasePrice ?? medicine.price;
      const rp = medicine.retailPrice ?? medicine.price;
      setForm({
        name: medicine.name,
        category: medicine.category,
        manufacturer: medicine.manufacturer,
        purchasePrice: String(pp),
        retailPrice: String(rp),
        quantity: String(medicine.quantity),
        expiryDate: medicine.expiryDate,
        lowStockThreshold: String(medicine.lowStockThreshold),
      });
      const parsed = parseRack(medicine.rackNumber);
      setRackLetter(parsed.letter);
      setRackNum(parsed.num);
    } else {
      setForm(EMPTY_FORM);
      setRackLetter("");
      setRackNum("");
    }
    setErrors({});
  }, [medicine, openRef]);

  const validate = (): boolean => {
    const newErrors: Partial<FormData> = {};
    if (!form.name.trim()) newErrors.name = "Required";
    if (!form.category.trim()) newErrors.category = "Required";
    if (!form.manufacturer.trim()) newErrors.manufacturer = "Required";
    if (!form.expiryDate) newErrors.expiryDate = "Required";
    const pp = Number(form.purchasePrice);
    if (!form.purchasePrice || Number.isNaN(pp) || pp < 0)
      newErrors.purchasePrice = "Must be >= 0";
    const rp = Number(form.retailPrice);
    if (!form.retailPrice || Number.isNaN(rp) || rp <= 0)
      newErrors.retailPrice = "Must be > 0";
    const qty = Number(form.quantity);
    if (form.quantity === "" || Number.isNaN(qty) || qty < 0)
      newErrors.quantity = "Must be >= 0";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!validate()) return;

    const rackNumber =
      rackLetter && rackNum ? `${rackLetter}${rackNum}` : undefined;
    const pp = Number(form.purchasePrice);
    const rp = Number(form.retailPrice);

    const data = {
      name: form.name.trim(),
      category: form.category.trim(),
      manufacturer: form.manufacturer.trim(),
      purchasePrice: pp,
      retailPrice: rp,
      price: rp, // keep price in sync with retailPrice
      quantity: Number(form.quantity),
      expiryDate: form.expiryDate,
      lowStockThreshold: Number(form.lowStockThreshold) || 10,
      rackNumber,
    };

    setSubmitting(true);
    try {
      if (medicine) {
        await updateMedicine(medicine.id, data);
        toast.success(`${data.name} updated successfully`);
      } else {
        await addMedicine(data);
        toast.success(`${data.name} added to inventory`);
      }
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

  // compute margin
  const pp = Number(form.purchasePrice);
  const rp = Number(form.retailPrice);
  const margin = pp > 0 && rp > 0 ? (((rp - pp) / pp) * 100).toFixed(1) : null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {medicine ? "Edit Medicine" : "Add New Medicine"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-2">
          <div className="col-span-2">
            {field("name", "Medicine Name *", "text", "e.g. Paracetamol 500mg")}
          </div>
          {field("category", "Category *", "text", "e.g. Analgesic")}
          {field("manufacturer", "Manufacturer *", "text", "e.g. GSK")}

          {/* Price section */}
          <div className="col-span-2">
            {/* Per-tablet notice */}
            <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-md px-3 py-2 mb-3">
              <Info className="w-3.5 h-3.5 text-blue-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-blue-700 leading-snug">
                <span className="font-semibold">Note:</span> Enter prices per
                individual tablet/unit or per piece (syrup, drops, etc.) — not
                per box.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="purchasePrice">
                  Purchase Price/Tablet (Rs.) *
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
                <p className="text-xs text-muted-foreground">
                  Per tablet price
                </p>
                {errors.purchasePrice && (
                  <p className="text-xs text-destructive">
                    {errors.purchasePrice}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="retailPrice">Sale Price/Tablet (Rs.) *</Label>
                <Input
                  id="retailPrice"
                  type="number"
                  placeholder="0.00"
                  value={form.retailPrice}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      retailPrice: e.target.value,
                    }))
                  }
                  className={errors.retailPrice ? "border-destructive" : ""}
                />
                <p className="text-xs text-muted-foreground">
                  Per tablet price
                </p>
                {errors.retailPrice && (
                  <p className="text-xs text-destructive">
                    {errors.retailPrice}
                  </p>
                )}
              </div>
            </div>
            {margin !== null && (
              <p className="text-xs text-muted-foreground mt-1">
                Margin:{" "}
                <span
                  className={
                    Number(margin) >= 0
                      ? "text-emerald-600 font-semibold"
                      : "text-destructive font-semibold"
                  }
                >
                  {margin}%
                </span>{" "}
                profit per tablet
              </p>
            )}
          </div>

          {field("quantity", "Opening Quantity *", "number", "0")}
          {field("expiryDate", "Expiry Date *", "date")}
          {field("lowStockThreshold", "Low Stock Alert", "number", "10")}

          {/* Rack Number */}
          <div className="col-span-2 space-y-1.5">
            <Label>Rack Number (Optional)</Label>
            <div className="flex gap-2 items-center">
              <Select value={rackLetter} onValueChange={setRackLetter}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Letter (A-Z)" />
                </SelectTrigger>
                <SelectContent className="max-h-48">
                  {RACK_LETTERS.map((l) => (
                    <SelectItem key={l} value={l}>
                      {l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={rackNum} onValueChange={setRackNum}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Num (1-10)" />
                </SelectTrigger>
                <SelectContent>
                  {RACK_NUMBERS.map((n) => (
                    <SelectItem key={n} value={n}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {rackLetter && rackNum && (
                <div className="flex items-center justify-center min-w-[3rem] h-10 rounded-md border border-border bg-primary/10 font-bold text-primary text-sm px-2">
                  {rackLetter}
                  {rackNum}
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Rack location jahan yeh medicine rakhi hai, e.g. A1, B3
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : medicine ? (
              "Save Changes"
            ) : (
              "Add Medicine"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
