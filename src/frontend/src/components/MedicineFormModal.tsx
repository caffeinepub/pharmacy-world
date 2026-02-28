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
  price: string;
  quantity: string;
  expiryDate: string;
  lowStockThreshold: string;
}

const EMPTY_FORM: FormData = {
  name: "",
  category: "",
  manufacturer: "",
  price: "",
  quantity: "",
  expiryDate: "",
  lowStockThreshold: "10",
};

export function MedicineFormModal({
  open,
  onClose,
  medicine,
}: MedicineFormModalProps) {
  const { addMedicine, updateMedicine } = useData();
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<FormData>>({});

  // Using a key approach: when open changes or medicine changes, reset the form
  // We track a reset counter tied to open state
  const openRef = open ? 1 : 0;
  // biome-ignore lint/correctness/useExhaustiveDependencies: openRef is derived from open prop to trigger reset
  useEffect(() => {
    if (medicine) {
      setForm({
        name: medicine.name,
        category: medicine.category,
        manufacturer: medicine.manufacturer,
        price: String(medicine.price),
        quantity: String(medicine.quantity),
        expiryDate: medicine.expiryDate,
        lowStockThreshold: String(medicine.lowStockThreshold),
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setErrors({});
  }, [medicine, openRef]);

  const validate = (): boolean => {
    const newErrors: Partial<FormData> = {};
    if (!form.name.trim()) newErrors.name = "Required";
    if (!form.category.trim()) newErrors.category = "Required";
    if (!form.manufacturer.trim()) newErrors.manufacturer = "Required";
    if (!form.expiryDate) newErrors.expiryDate = "Required";
    const price = Number(form.price);
    if (!form.price || Number.isNaN(price) || price <= 0)
      newErrors.price = "Must be > 0";
    const qty = Number(form.quantity);
    if (form.quantity === "" || Number.isNaN(qty) || qty < 0)
      newErrors.quantity = "Must be >= 0";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;

    const data = {
      name: form.name.trim(),
      category: form.category.trim(),
      manufacturer: form.manufacturer.trim(),
      price: Number(form.price),
      quantity: Number(form.quantity),
      expiryDate: form.expiryDate,
      lowStockThreshold: Number(form.lowStockThreshold) || 10,
    };

    if (medicine) {
      updateMedicine(medicine.id, data);
      toast.success(`${data.name} updated successfully`);
    } else {
      addMedicine(data);
      toast.success(`${data.name} added to inventory`);
    }
    onClose();
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
      <DialogContent className="max-w-md">
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
          {field("price", "Price per Unit ($) *", "number", "0.00")}
          {field("quantity", "Quantity *", "number", "0")}
          {field("expiryDate", "Expiry Date *", "date")}
          {field("lowStockThreshold", "Low Stock Alert", "number", "10")}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            {medicine ? "Save Changes" : "Add Medicine"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
