import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarDays, Plus, Trash2 } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useData } from "../contexts/DataContext";
import type { Medicine } from "../types";

interface BulkRow {
  _id: string;
  name: string;
  category: string;
  manufacturer: string;
  productType: string;
  purchasePrice: string;
  salePrice: string;
  boxQty: string;
  boxSize: string;
  quantity: string;
  expiryDate: string;
  lowStock: string;
  rackLetter: string;
  rackNum: string;
  existingId?: string; // set when row was filled via autocomplete
}

type RowErrors = Partial<Record<keyof BulkRow, boolean>>;

const emptyRow = (): BulkRow => ({
  _id: Math.random().toString(36).slice(2),
  name: "",
  category: "",
  manufacturer: "",
  productType: "Tablet",
  purchasePrice: "",
  salePrice: "",
  boxQty: "",
  boxSize: "",
  quantity: "",
  expiryDate: "",
  lowStock: "10",
  rackLetter: "",
  rackNum: "",
});

const RACK_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const RACK_NUMS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"];
const PRODUCT_TYPES = ["Tablet", "Syrup/Liquid", "Cream", "Injection"];

const NAV_COLS: (keyof BulkRow)[] = [
  "name",
  "category",
  "manufacturer",
  "purchasePrice",
  "salePrice",
  "boxQty",
  "boxSize",
  "quantity",
  "expiryDate",
  "lowStock",
];

interface Props {
  open: boolean;
  onClose: () => void;
}

function getTotalQty(row: BulkRow): number {
  const bq = Number(row.boxQty);
  const bs = Number(row.boxSize);
  if (bq > 0 && bs > 0) return bq * bs;
  return Number(row.quantity) || 0;
}

export function BulkMedicineModal({ open, onClose }: Props) {
  const { addMedicine, updateMedicine, medicines } = useData();
  const [rows, setRows] = useState<BulkRow[]>(() =>
    Array.from({ length: 5 }, emptyRow),
  );
  const [errors, setErrors] = useState<RowErrors[]>(() =>
    Array.from({ length: 5 }, () => ({})),
  );
  const [saving, setSaving] = useState(false);

  const [acRowIdx, setAcRowIdx] = useState<number | null>(null);
  const [acQuery, setAcQuery] = useState("");

  const inputRefs = useRef<(HTMLInputElement | null)[][]>([]);

  const ensureRef = (rowIdx: number, colIdx: number) => {
    if (!inputRefs.current[rowIdx]) inputRefs.current[rowIdx] = [];
    return (el: HTMLInputElement | null) => {
      if (!inputRefs.current[rowIdx]) inputRefs.current[rowIdx] = [];
      inputRefs.current[rowIdx][colIdx] = el;
    };
  };

  const focusCell = useCallback((rowIdx: number, colIdx: number) => {
    const el = inputRefs.current[rowIdx]?.[colIdx];
    if (el) {
      el.focus();
      el.select();
    }
  }, []);

  const handleKeyNav = useCallback(
    (
      e: React.KeyboardEvent<HTMLInputElement>,
      rowIdx: number,
      colIdx: number,
    ) => {
      if (e.key === "Enter" || (e.key === "Tab" && !e.shiftKey)) {
        if (e.key === "Enter") e.preventDefault();
        const nextCol = colIdx + 1;
        if (nextCol < NAV_COLS.length) {
          e.preventDefault();
          focusCell(rowIdx, nextCol);
        } else {
          e.preventDefault();
          const nextRow = rowIdx + 1;
          setRows((prev) => {
            if (nextRow >= prev.length) {
              const updated = [...prev, emptyRow()];
              setErrors((pe) => [...pe, {}]);
              setTimeout(() => focusCell(nextRow, 0), 50);
              return updated;
            }
            setTimeout(() => focusCell(nextRow, 0), 0);
            return prev;
          });
        }
      }
    },
    [focusCell],
  );

  const updateRow = useCallback(
    (idx: number, field: keyof BulkRow, value: string) => {
      setRows((prev) => {
        const next = [...prev];
        if (field === "name" && next[idx].existingId) {
          next[idx] = { ...next[idx], [field]: value, existingId: undefined };
        } else {
          next[idx] = { ...next[idx], [field]: value };
        }
        return next;
      });
      setErrors((prev) => {
        const next = [...prev];
        next[idx] = { ...next[idx], [field]: false };
        return next;
      });
    },
    [],
  );

  const addRow = () => {
    setRows((prev) => [...prev, emptyRow()]);
    setErrors((prev) => [...prev, {}]);
  };

  const deleteRow = (idx: number) => {
    setRows((prev) => prev.filter((_, i) => i !== idx));
    setErrors((prev) => prev.filter((_, i) => i !== idx));
    inputRefs.current.splice(idx, 1);
  };

  const handleClose = () => {
    setRows(Array.from({ length: 5 }, emptyRow));
    setErrors(Array.from({ length: 5 }, () => ({})));
    setAcRowIdx(null);
    setAcQuery("");
    inputRefs.current = [];
    onClose();
  };

  const acSuggestions = useMemo<Medicine[]>(() => {
    if (!acQuery.trim() || acQuery.length < 2) return [];
    const q = acQuery.toLowerCase();
    return medicines
      .filter((m) => m.name.toLowerCase().includes(q))
      .slice(0, 8);
  }, [medicines, acQuery]);

  const applyAutocomplete = (idx: number, med: Medicine) => {
    const rackLetter = med.rackNumber
      ? med.rackNumber.replace(/[0-9]/g, "")
      : "";
    const rackNum = med.rackNumber ? med.rackNumber.replace(/[^0-9]/g, "") : "";
    setRows((prev) => {
      const next = [...prev];
      next[idx] = {
        ...next[idx],
        name: med.name,
        category: med.category ?? "",
        manufacturer: med.manufacturer ?? "",
        purchasePrice: String(med.purchasePrice ?? ""),
        salePrice: String(med.retailPrice ?? med.price ?? ""),
        expiryDate: med.expiryDate ?? "",
        lowStock: String(med.lowStockThreshold ?? 10),
        rackLetter,
        rackNum,
        existingId: med.id,
      };
      return next;
    });
    setAcRowIdx(null);
    setAcQuery("");
    setTimeout(() => focusCell(idx, NAV_COLS.indexOf("quantity")), 50);
  };

  const handleSave = async () => {
    const activeRows = rows
      .map((row, idx) => ({ row, idx }))
      .filter(({ row }) => row.name.trim() !== "");

    if (activeRows.length === 0) {
      toast.error("Please fill in at least one medicine name.");
      return;
    }

    let hasErrors = false;
    const newErrors = errors.map((e) => ({ ...e }));
    for (const { row, idx } of activeRows) {
      if (!row.name.trim()) {
        newErrors[idx].name = true;
        hasErrors = true;
      }
      if (!row.salePrice.trim() || Number.isNaN(Number(row.salePrice))) {
        newErrors[idx].salePrice = true;
        hasErrors = true;
      }
    }
    setErrors(newErrors);
    if (hasErrors) return;

    setSaving(true);
    try {
      let addedCount = 0;
      let updatedCount = 0;

      for (const { row } of activeRows) {
        const rackNumber =
          row.rackLetter && row.rackNum
            ? `${row.rackLetter}${row.rackNum}`
            : undefined;
        const salePrice = Number(row.salePrice) || 0;
        const qty = getTotalQty(row);

        // Resolve existing medicine: by existingId (autocomplete) OR by exact name match (manual typing)
        const existingMed =
          (row.existingId
            ? medicines.find((m) => m.id === row.existingId)
            : null) ??
          medicines.find(
            (m) =>
              m.name.trim().toLowerCase() === row.name.trim().toLowerCase(),
          );

        if (existingMed) {
          // Update existing -- add new quantity on top of current stock
          await updateMedicine(existingMed.id, {
            price: salePrice,
            retailPrice: salePrice,
            purchasePrice: row.purchasePrice
              ? Number(row.purchasePrice)
              : existingMed.purchasePrice,
            quantity: existingMed.quantity + qty,
            expiryDate: row.expiryDate || existingMed.expiryDate || "",
            lowStockThreshold: row.lowStock
              ? Number(row.lowStock)
              : existingMed.lowStockThreshold,
            rackNumber: rackNumber ?? existingMed.rackNumber,
          });
          updatedCount++;
        } else {
          await addMedicine({
            name: row.name.trim(),
            category: row.category.trim(),
            manufacturer: row.manufacturer.trim(),
            price: salePrice,
            retailPrice: salePrice,
            purchasePrice: row.purchasePrice
              ? Number(row.purchasePrice)
              : undefined,
            quantity: qty,
            expiryDate: row.expiryDate || "",
            lowStockThreshold: row.lowStock ? Number(row.lowStock) : 10,
            rackNumber,
          });
          addedCount++;
        }
      }

      const parts: string[] = [];
      if (addedCount > 0)
        parts.push(
          `${addedCount} medicine${addedCount !== 1 ? "s" : ""} added`,
        );
      if (updatedCount > 0)
        parts.push(
          `${updatedCount} medicine${updatedCount !== 1 ? "s" : ""} updated`,
        );
      toast.success(`${parts.join(", ")} successfully`);
      handleClose();
    } catch {
      toast.error("Failed to save medicines. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const activeRows = rows.filter((r) => r.name.trim() !== "");
  const summaryTotal = activeRows.reduce((sum, r) => {
    const qty = getTotalQty(r);
    const price = Number(r.purchasePrice) || 0;
    return sum + qty * price;
  }, 0);
  const summaryQty = activeRows.reduce((sum, r) => sum + getTotalQty(r), 0);
  const now = new Date();
  const nowStr = `${now.toLocaleDateString("en-PK", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })} ${now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent
        className="max-w-[98vw] w-full lg:max-w-7xl"
        data-ocid="bulk_add.dialog"
      >
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-primary" />
            Bulk Add Medicines
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Fill in multiple medicines at once. Existing medicines (same name)
            will have their stock updated — no duplicates. Tab or Enter
            navigates between cells.
          </p>
        </DialogHeader>

        <ScrollArea className="h-[55vh] pr-1">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse min-w-[1300px]">
              <thead>
                <tr className="sticky top-0 z-10 bg-muted text-muted-foreground">
                  <th className="text-left px-2 py-2 font-medium whitespace-nowrap w-44">
                    Medicine Name *
                  </th>
                  <th className="text-left px-2 py-2 font-medium whitespace-nowrap w-24">
                    Category
                  </th>
                  <th className="text-left px-2 py-2 font-medium whitespace-nowrap w-24">
                    Manufacturer
                  </th>
                  <th className="text-left px-2 py-2 font-medium whitespace-nowrap w-24">
                    Type
                  </th>
                  <th className="text-left px-2 py-2 font-medium whitespace-nowrap w-24">
                    Purchase Price/Tab
                  </th>
                  <th className="text-left px-2 py-2 font-medium whitespace-nowrap w-24">
                    Sale Price *
                  </th>
                  <th className="text-left px-2 py-2 font-medium whitespace-nowrap w-20 bg-blue-50/60 text-blue-700">
                    # Boxes
                  </th>
                  <th className="text-left px-2 py-2 font-medium whitespace-nowrap w-20 bg-blue-50/60 text-blue-700">
                    Box Size
                  </th>
                  <th className="text-left px-2 py-2 font-medium whitespace-nowrap w-20">
                    Qty
                  </th>
                  <th className="text-left px-2 py-2 font-medium whitespace-nowrap w-32">
                    Expiry Date
                  </th>
                  <th className="text-left px-2 py-2 font-medium whitespace-nowrap w-20">
                    Low Alert
                  </th>
                  <th className="text-left px-2 py-2 font-medium whitespace-nowrap w-20">
                    Rack
                  </th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => {
                  const autoQty =
                    Number(row.boxQty) > 0 && Number(row.boxSize) > 0
                      ? Number(row.boxQty) * Number(row.boxSize)
                      : null;

                  // Real-time check: does this row match an existing medicine?
                  const matchedMed = row.existingId
                    ? medicines.find((m) => m.id === row.existingId)
                    : row.name.trim().length > 1
                      ? medicines.find(
                          (m) =>
                            m.name.trim().toLowerCase() ===
                            row.name.trim().toLowerCase(),
                        )
                      : undefined;

                  return (
                    <tr
                      key={row._id}
                      className={`border-b border-border/40 hover:bg-muted/30 ${
                        matchedMed ? "bg-amber-50/40" : ""
                      }`}
                      data-ocid={`bulk_add.row.${idx + 1}`}
                    >
                      {/* Name with autocomplete */}
                      <td className="px-1 py-1 relative">
                        <Input
                          ref={ensureRef(idx, 0)}
                          value={row.name}
                          onChange={(e) => {
                            updateRow(idx, "name", e.target.value);
                            setAcRowIdx(idx);
                            setAcQuery(e.target.value);
                          }}
                          onFocus={() => {
                            setAcRowIdx(idx);
                            setAcQuery(row.name);
                          }}
                          onBlur={() => {
                            setTimeout(() => setAcRowIdx(null), 150);
                          }}
                          onKeyDown={(e) => handleKeyNav(e, idx, 0)}
                          placeholder="Medicine name"
                          className={`h-8 text-sm pr-14 ${
                            errors[idx]?.name ? "border-destructive" : ""
                          } ${
                            matchedMed ? "border-amber-400 bg-amber-50" : ""
                          }`}
                          data-ocid={`bulk_add.name.input.${idx + 1}`}
                          autoComplete="off"
                        />
                        {matchedMed && (
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded pointer-events-none">
                            +stock
                          </span>
                        )}
                        {acRowIdx === idx && acSuggestions.length > 0 && (
                          <div className="absolute top-full left-1 z-50 mt-0.5 w-72 bg-popover border border-border rounded-md shadow-lg overflow-hidden">
                            {acSuggestions.map((med) => (
                              <button
                                key={med.id}
                                type="button"
                                className="w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors border-b border-border/30 last:border-0"
                                onMouseDown={() => applyAutocomplete(idx, med)}
                              >
                                <p className="font-semibold text-foreground">
                                  {med.name}
                                </p>
                                <p className="text-muted-foreground">
                                  {med.category} · Rs.
                                  {(med.retailPrice ?? med.price ?? 0).toFixed(
                                    2,
                                  )}
                                  /tab · Stock: {med.quantity}
                                </p>
                              </button>
                            ))}
                          </div>
                        )}
                      </td>
                      {/* Category */}
                      <td className="px-1 py-1">
                        <Input
                          ref={ensureRef(idx, 1)}
                          value={row.category}
                          onChange={(e) =>
                            updateRow(idx, "category", e.target.value)
                          }
                          onKeyDown={(e) => handleKeyNav(e, idx, 1)}
                          placeholder="Category"
                          className="h-8 text-sm"
                        />
                      </td>
                      {/* Manufacturer */}
                      <td className="px-1 py-1">
                        <Input
                          ref={ensureRef(idx, 2)}
                          value={row.manufacturer}
                          onChange={(e) =>
                            updateRow(idx, "manufacturer", e.target.value)
                          }
                          onKeyDown={(e) => handleKeyNav(e, idx, 2)}
                          placeholder="Manufacturer"
                          className="h-8 text-sm"
                        />
                      </td>
                      {/* Product Type */}
                      <td className="px-1 py-1">
                        <Select
                          value={row.productType}
                          onValueChange={(v) =>
                            updateRow(idx, "productType", v)
                          }
                        >
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PRODUCT_TYPES.map((t) => (
                              <SelectItem key={t} value={t}>
                                {t}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      {/* Purchase Price */}
                      <td className="px-1 py-1">
                        <Input
                          ref={ensureRef(idx, 3)}
                          type="number"
                          min="0"
                          value={row.purchasePrice}
                          onChange={(e) =>
                            updateRow(idx, "purchasePrice", e.target.value)
                          }
                          onKeyDown={(e) => handleKeyNav(e, idx, 3)}
                          placeholder="0"
                          className="h-8 text-sm"
                          data-ocid={`bulk_add.purchase_price.input.${idx + 1}`}
                        />
                      </td>
                      {/* Sale Price */}
                      <td className="px-1 py-1">
                        <Input
                          ref={ensureRef(idx, 4)}
                          type="number"
                          min="0"
                          value={row.salePrice}
                          onChange={(e) =>
                            updateRow(idx, "salePrice", e.target.value)
                          }
                          onKeyDown={(e) => handleKeyNav(e, idx, 4)}
                          placeholder="0"
                          className={`h-8 text-sm ${
                            errors[idx]?.salePrice ? "border-destructive" : ""
                          }`}
                          data-ocid={`bulk_add.sale_price.input.${idx + 1}`}
                        />
                      </td>
                      {/* # Boxes */}
                      <td className="px-1 py-1 bg-blue-50/30">
                        <Input
                          ref={ensureRef(idx, 5)}
                          type="number"
                          min="0"
                          value={row.boxQty}
                          onChange={(e) =>
                            updateRow(idx, "boxQty", e.target.value)
                          }
                          onKeyDown={(e) => handleKeyNav(e, idx, 5)}
                          placeholder="0"
                          className="h-8 text-sm border-blue-200 focus:border-blue-400"
                          data-ocid={`bulk_add.box_qty.input.${idx + 1}`}
                        />
                      </td>
                      {/* Box Size */}
                      <td className="px-1 py-1 bg-blue-50/30">
                        <Input
                          ref={ensureRef(idx, 6)}
                          type="number"
                          min="0"
                          value={row.boxSize}
                          onChange={(e) =>
                            updateRow(idx, "boxSize", e.target.value)
                          }
                          onKeyDown={(e) => handleKeyNav(e, idx, 6)}
                          placeholder="e.g.30"
                          className="h-8 text-sm border-blue-200 focus:border-blue-400"
                          data-ocid={`bulk_add.box_size.input.${idx + 1}`}
                        />
                      </td>
                      {/* Quantity */}
                      <td className="px-1 py-1">
                        {autoQty !== null ? (
                          <div className="h-8 flex items-center px-2 rounded-md bg-emerald-50 border border-emerald-200 text-sm font-semibold text-emerald-700">
                            {autoQty}
                          </div>
                        ) : (
                          <Input
                            ref={ensureRef(idx, 7)}
                            type="number"
                            min="0"
                            value={row.quantity}
                            onChange={(e) =>
                              updateRow(idx, "quantity", e.target.value)
                            }
                            onKeyDown={(e) => handleKeyNav(e, idx, 7)}
                            placeholder="0"
                            className="h-8 text-sm"
                            data-ocid={`bulk_add.quantity.input.${idx + 1}`}
                          />
                        )}
                      </td>
                      {/* Expiry Date */}
                      <td className="px-1 py-1">
                        <Input
                          ref={ensureRef(idx, 8)}
                          type="date"
                          value={row.expiryDate}
                          onChange={(e) =>
                            updateRow(idx, "expiryDate", e.target.value)
                          }
                          onKeyDown={(e) => handleKeyNav(e, idx, 8)}
                          className="h-8 text-sm"
                        />
                      </td>
                      {/* Low Stock */}
                      <td className="px-1 py-1">
                        <Input
                          ref={ensureRef(idx, 9)}
                          type="number"
                          min="0"
                          value={row.lowStock}
                          onChange={(e) =>
                            updateRow(idx, "lowStock", e.target.value)
                          }
                          onKeyDown={(e) => handleKeyNav(e, idx, 9)}
                          placeholder="10"
                          className="h-8 text-sm"
                        />
                      </td>
                      {/* Rack */}
                      <td className="px-1 py-1">
                        <div className="flex gap-1">
                          <Select
                            value={row.rackLetter}
                            onValueChange={(v) =>
                              updateRow(idx, "rackLetter", v)
                            }
                          >
                            <SelectTrigger className="h-8 text-sm w-14">
                              <SelectValue placeholder="-" />
                            </SelectTrigger>
                            <SelectContent>
                              {RACK_LETTERS.map((l) => (
                                <SelectItem key={l} value={l}>
                                  {l}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Select
                            value={row.rackNum}
                            onValueChange={(v) => updateRow(idx, "rackNum", v)}
                          >
                            <SelectTrigger className="h-8 text-sm w-14">
                              <SelectValue placeholder="-" />
                            </SelectTrigger>
                            <SelectContent>
                              {RACK_NUMS.map((n) => (
                                <SelectItem key={n} value={n}>
                                  {n}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </td>
                      {/* Delete */}
                      <td className="px-1 py-1 text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => deleteRow(idx)}
                          disabled={rows.length === 1}
                          data-ocid={`bulk_add.delete_button.${idx + 1}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </ScrollArea>

        <div className="flex items-center justify-between pt-1">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={addRow}
            data-ocid="bulk_add.add_row.button"
          >
            <Plus className="w-4 h-4" />
            Add Row
          </Button>

          {activeRows.length > 0 && (
            <div className="flex items-center gap-4 text-sm bg-primary/5 border border-primary/20 rounded-lg px-4 py-2">
              <div className="text-muted-foreground text-xs">
                <span className="font-medium text-foreground">{nowStr}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">Medicines:</span>
                <span className="font-bold text-foreground">
                  {activeRows.length}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">Total Units:</span>
                <span className="font-bold text-foreground">{summaryQty}</span>
              </div>
              {summaryTotal > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground">Purchase Value:</span>
                  <span className="font-bold text-primary">
                    Rs.{summaryTotal.toFixed(0)}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            data-ocid="bulk_add.cancel_button"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            data-ocid="bulk_add.save_button"
          >
            {saving ? "Saving..." : "Save All"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
