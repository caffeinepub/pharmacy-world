import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Download,
  FileDown,
  Loader2,
  MinusCircle,
  PackagePlus,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { ExcelImportModal } from "../components/ExcelImportModal";
import { MedicineFormModal } from "../components/MedicineFormModal";
import { PurchaseStockModal } from "../components/PurchaseStockModal";
import { useData } from "../contexts/DataContext";
import type { Medicine } from "../types";
import {
  exportInventoryToExcel,
  exportInventoryToPDF,
} from "../utils/exportUtils";

interface RemoveEntry {
  removeQty: string;
  removeAll: boolean;
}

export function InventoryPage() {
  const { medicines, deleteMedicine, updateMedicine } = useData();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMed, setEditingMed] = useState<Medicine | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [purchaseMed, setPurchaseMed] = useState<Medicine | null>(null);
  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const handleExportExcel = () => {
    try {
      exportInventoryToExcel(medicines);
      toast.success("Inventory exported to Excel");
    } catch {
      toast.error("Failed to export Excel");
    }
  };

  const handleExportPDF = () => {
    try {
      exportInventoryToPDF(medicines);
      toast.success("Inventory exported to PDF");
    } catch {
      toast.error("Failed to export PDF");
    }
  };

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkRemoveOpen, setBulkRemoveOpen] = useState(false);
  const [removeEntries, setRemoveEntries] = useState<
    Record<string, RemoveEntry>
  >({});
  const [isRemoving, setIsRemoving] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);

  const categories = Array.from(
    new Set(medicines.map((m) => m.category)),
  ).sort();

  const filtered = medicines.filter((m) => {
    const matchesSearch =
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.category.toLowerCase().includes(search.toLowerCase());
    const matchesCategory =
      categoryFilter === "all" || m.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const getExpiryStatus = (expiryDate: string) => {
    const exp = new Date(expiryDate);
    const now = new Date();
    const daysLeft = Math.ceil(
      (exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (daysLeft < 0) return "expired";
    if (daysLeft <= 90) return "soon";
    return "ok";
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const med = medicines.find((m) => m.id === deleteId);
    await deleteMedicine(deleteId);
    toast.success(`${med?.name} removed from inventory`);
    setDeleteId(null);
  };

  const openAdd = () => {
    setEditingMed(null);
    setModalOpen(true);
  };

  const openEdit = (med: Medicine) => {
    setEditingMed(med);
    setModalOpen(true);
  };

  const openPurchase = (med: Medicine) => {
    setPurchaseMed(med);
    setPurchaseOpen(true);
  };

  // ── Bulk selection helpers ──────────────────────────────────────────────
  const allFilteredSelected =
    filtered.length > 0 && filtered.every((m) => selectedIds.has(m.id));
  const someFilteredSelected = filtered.some((m) => selectedIds.has(m.id));

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      const next = new Set(selectedIds);
      for (const m of filtered) next.delete(m.id);
      setSelectedIds(next);
    } else {
      const next = new Set(selectedIds);
      for (const m of filtered) next.add(m.id);
      setSelectedIds(next);
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const clearSelection = () => setSelectedIds(new Set());

  // ── Bulk Remove dialog ─────────────────────────────────────────────────
  const openBulkRemove = () => {
    const entries: Record<string, RemoveEntry> = {};
    for (const id of selectedIds) {
      entries[id] = { removeQty: "", removeAll: false };
    }
    setRemoveEntries(entries);
    setBulkRemoveOpen(true);
  };

  const selectedMedicines = medicines.filter((m) => selectedIds.has(m.id));

  const updateEntry = (id: string, patch: Partial<RemoveEntry>) => {
    setRemoveEntries((prev) => ({
      ...prev,
      [id]: { ...prev[id], ...patch },
    }));
  };

  // ── Bulk Delete (permanently remove medicines) ─────────────────────────
  const handleBulkDeleteConfirm = async () => {
    setIsDeletingAll(true);
    try {
      await Promise.all([...selectedIds].map((id) => deleteMedicine(id)));
      toast.success(`${selectedIds.size} medicine(s) permanently deleted.`);
      setBulkDeleteOpen(false);
      clearSelection();
    } catch {
      toast.error("Failed to delete medicines. Please try again.");
    } finally {
      setIsDeletingAll(false);
    }
  };

  const handleBulkRemoveConfirm = async () => {
    const toProcess = selectedMedicines.filter((m) => {
      const entry = removeEntries[m.id];
      if (!entry) return false;
      if (entry.removeAll) return true;
      const qty = Number.parseInt(entry.removeQty, 10);
      return !Number.isNaN(qty) && qty > 0;
    });

    if (toProcess.length === 0) {
      toast.error("No removal quantities specified.");
      return;
    }

    setIsRemoving(true);
    try {
      await Promise.all(
        toProcess.map((m) => {
          const entry = removeEntries[m.id];
          const newQty = entry.removeAll
            ? 0
            : Math.max(0, m.quantity - Number.parseInt(entry.removeQty, 10));
          return updateMedicine(m.id, { quantity: newQty });
        }),
      );
      toast.success(`Stock removed for ${toProcess.length} medicine(s).`);
      setBulkRemoveOpen(false);
      clearSelection();
    } catch {
      toast.error("Failed to remove stock. Please try again.");
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Inventory</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {medicines.length} medicines •{" "}
            {medicines.reduce((s, m) => s + m.quantity, 0)} total units
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            onClick={handleExportExcel}
            className="gap-2"
            data-ocid="inventory.export_excel.button"
            disabled={medicines.length === 0}
            title="Export inventory to Excel"
          >
            <Download className="w-4 h-4" />
            Export Excel
          </Button>
          <Button
            variant="outline"
            onClick={handleExportPDF}
            className="gap-2"
            data-ocid="inventory.export_pdf.button"
            disabled={medicines.length === 0}
            title="Export inventory to PDF"
          >
            <FileDown className="w-4 h-4" />
            Export PDF
          </Button>
          <Button
            variant="outline"
            onClick={() => setImportOpen(true)}
            className="gap-2"
            data-ocid="inventory.import.button"
          >
            <Upload className="w-4 h-4" />
            Import Excel
          </Button>
          <Button
            onClick={openAdd}
            className="gap-2"
            data-ocid="inventory.add_medicine.button"
          >
            <Plus className="w-4 h-4" />
            Add Medicine
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            data-ocid="inventory.search_input"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-44" data-ocid="inventory.category.select">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Bulk Action Bar */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className="flex items-center gap-3 px-4 py-3 rounded-lg border border-destructive/30 bg-destructive/5 backdrop-blur-sm"
            data-ocid="inventory.bulk_action.panel"
          >
            <span className="flex items-center gap-1.5 text-sm font-semibold text-destructive">
              <MinusCircle className="w-4 h-4" />
              {selectedIds.size} medicine{selectedIds.size > 1 ? "s" : ""}{" "}
              selected
            </span>
            <div className="flex-1" />
            <Button
              size="sm"
              variant="destructive"
              onClick={openBulkRemove}
              className="gap-2 h-8"
              data-ocid="inventory.bulk_remove.button"
            >
              <MinusCircle className="w-3.5 h-3.5" />
              Remove Stock
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => setBulkDeleteOpen(true)}
              className="gap-2 h-8 bg-red-700 hover:bg-red-800"
              data-ocid="inventory.bulk_delete.button"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete All Selected
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={clearSelection}
              className="gap-2 h-8"
              data-ocid="inventory.clear_selection.button"
            >
              <X className="w-3.5 h-3.5" />
              Clear Selection
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table */}
      <div className="rounded-lg border border-border overflow-hidden bg-card">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-10 px-3">
                  <Checkbox
                    checked={allFilteredSelected}
                    data-state={
                      someFilteredSelected && !allFilteredSelected
                        ? "indeterminate"
                        : undefined
                    }
                    onCheckedChange={toggleSelectAll}
                    aria-label="Select all medicines"
                    data-ocid="inventory.select_all.checkbox"
                    className="block"
                  />
                </TableHead>
                <TableHead className="text-xs font-semibold">
                  Medicine
                </TableHead>
                <TableHead className="text-xs font-semibold">
                  Category
                </TableHead>
                <TableHead className="text-xs font-semibold">
                  Manufacturer
                </TableHead>
                <TableHead className="text-xs font-semibold text-right">
                  Purchase Price
                </TableHead>
                <TableHead className="text-xs font-semibold text-right">
                  Sale Price/Tab
                </TableHead>
                <TableHead className="text-xs font-semibold text-center">
                  Qty
                </TableHead>
                <TableHead className="text-xs font-semibold">Expiry</TableHead>
                <TableHead className="text-xs font-semibold text-center">
                  Rack
                </TableHead>
                <TableHead className="text-xs font-semibold text-center">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={10}
                    className="text-center py-10 text-muted-foreground text-sm"
                    data-ocid="inventory.empty_state"
                  >
                    No medicines found
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((med, idx) => {
                  const expiryStatus = getExpiryStatus(med.expiryDate);
                  const isLow = med.quantity <= med.lowStockThreshold;
                  const pp = med.purchasePrice ?? med.price;
                  const rp = med.retailPrice ?? med.price;
                  const isSelected = selectedIds.has(med.id);
                  return (
                    <TableRow
                      key={med.id}
                      className={`hover:bg-muted/30 transition-colors ${isSelected ? "bg-destructive/5" : ""}`}
                      data-ocid={`inventory.item.${idx + 1}`}
                    >
                      <TableCell className="px-3">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSelect(med.id)}
                          aria-label={`Select ${med.name}`}
                          data-ocid={`inventory.row_select.checkbox.${idx + 1}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium text-sm">
                        {med.name}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {med.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {med.manufacturer}
                      </TableCell>
                      <TableCell className="text-sm text-right font-mono text-muted-foreground">
                        Rs.{pp.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-sm text-right font-mono font-semibold">
                        Rs.{rp.toFixed(2)}
                        <span className="text-xs font-normal text-muted-foreground">
                          /tab
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span
                          className={`inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 rounded-full text-xs font-bold ${
                            isLow
                              ? "bg-destructive/15 text-destructive"
                              : "bg-success/15 text-success"
                          }`}
                        >
                          {med.quantity}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`text-xs font-medium ${
                            expiryStatus === "expired"
                              ? "text-destructive"
                              : expiryStatus === "soon"
                                ? "text-warning"
                                : "text-muted-foreground"
                          }`}
                        >
                          {med.expiryDate}
                          {expiryStatus === "expired" && " (Expired)"}
                          {expiryStatus === "soon" && " (Soon)"}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        {med.rackNumber ? (
                          <span className="inline-flex items-center justify-center min-w-[2.2rem] px-2 py-0.5 rounded-md text-xs font-bold bg-primary/10 text-primary border border-primary/20">
                            {med.rackNumber}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            —
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openPurchase(med)}
                            className="h-7 w-7 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                            title="Add Stock (Purchase)"
                            data-ocid={`inventory.add_stock.button.${idx + 1}`}
                          >
                            <PackagePlus className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openEdit(med)}
                            className="h-7 w-7 p-0"
                            title="Edit Medicine"
                            data-ocid={`inventory.edit_button.${idx + 1}`}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setDeleteId(med.id)}
                            className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                            title="Delete Medicine"
                            data-ocid={`inventory.delete_button.${idx + 1}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* ── Bulk Remove Stock Dialog ─────────────────────────────────────── */}
      <Dialog
        open={bulkRemoveOpen}
        onOpenChange={(o) => !o && setBulkRemoveOpen(false)}
      >
        <DialogContent
          className="max-w-lg"
          data-ocid="inventory.bulk_remove.dialog"
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MinusCircle className="w-5 h-5 text-destructive" />
              Remove Stock
            </DialogTitle>
          </DialogHeader>

          <p className="text-sm text-muted-foreground -mt-1">
            Enter the quantity to remove for each selected medicine, or toggle
            &quot;Remove All&quot; to zero out the stock.
          </p>

          <ScrollArea className="max-h-[55vh] pr-3">
            <div className="space-y-3 py-1">
              {selectedMedicines.map((med) => {
                const entry = removeEntries[med.id] ?? {
                  removeQty: "",
                  removeAll: false,
                };
                const removeQtyNum = Number.parseInt(entry.removeQty, 10);
                const isOverLimit =
                  !Number.isNaN(removeQtyNum) && removeQtyNum > med.quantity;
                return (
                  <div
                    key={med.id}
                    className="flex items-start gap-3 p-3 rounded-lg border border-border bg-muted/30"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">
                        {med.name}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Current stock:{" "}
                        <span className="font-mono font-bold text-foreground">
                          {med.quantity}
                        </span>{" "}
                        units
                      </p>
                      {!entry.removeAll && (
                        <div className="mt-2">
                          <Input
                            type="number"
                            min={1}
                            max={med.quantity}
                            placeholder="Qty to remove"
                            value={entry.removeQty}
                            onChange={(e) =>
                              updateEntry(med.id, { removeQty: e.target.value })
                            }
                            className={`h-8 text-sm w-36 ${isOverLimit ? "border-destructive focus-visible:ring-destructive" : ""}`}
                            data-ocid="inventory.bulk_remove_qty.input"
                          />
                          {isOverLimit && (
                            <p className="text-xs text-destructive mt-1">
                              Cannot exceed current stock ({med.quantity})
                            </p>
                          )}
                        </div>
                      )}
                      {entry.removeAll && (
                        <p className="mt-2 text-xs text-destructive font-medium">
                          All {med.quantity} units will be removed
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1.5 pt-0.5 shrink-0">
                      <Label
                        htmlFor={`remove-all-${med.id}`}
                        className="text-xs text-muted-foreground"
                      >
                        Remove All
                      </Label>
                      <Switch
                        id={`remove-all-${med.id}`}
                        checked={entry.removeAll}
                        onCheckedChange={(checked) =>
                          updateEntry(med.id, {
                            removeAll: checked,
                            removeQty: "",
                          })
                        }
                        data-ocid="inventory.bulk_remove_all.switch"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          <DialogFooter className="gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setBulkRemoveOpen(false)}
              disabled={isRemoving}
              data-ocid="inventory.bulk_remove.cancel_button"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleBulkRemoveConfirm}
              disabled={isRemoving}
              className="gap-2"
              data-ocid="inventory.bulk_remove.confirm_button"
            >
              {isRemoving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <MinusCircle className="w-4 h-4" />
              )}
              {isRemoving ? "Removing..." : "Confirm Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modals */}
      <MedicineFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        medicine={editingMed}
      />

      <PurchaseStockModal
        open={purchaseOpen}
        onClose={() => {
          setPurchaseOpen(false);
          setPurchaseMed(null);
        }}
        medicine={purchaseMed}
      />

      <ExcelImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
      />

      {/* ── Bulk Delete All Selected Dialog ─────────────────────────────── */}
      <AlertDialog
        open={bulkDeleteOpen}
        onOpenChange={(o) => !o && setBulkDeleteOpen(false)}
      >
        <AlertDialogContent data-ocid="inventory.bulk_delete.dialog">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-5 h-5" />
              Delete {selectedIds.size} Medicine
              {selectedIds.size > 1 ? "s" : ""}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Yeh action{" "}
              <strong>
                {selectedIds.size} medicine{selectedIds.size > 1 ? "s" : ""}
              </strong>{" "}
              ko permanently inventory se hata dega. Ye undo nahi ho sakta.
              {selectedIds.size === medicines.length && (
                <span className="block mt-2 font-semibold text-destructive">
                  Aap poori inventory delete kar rahe hain -- sab kuch blank ho
                  jayega.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={isDeletingAll}
              data-ocid="inventory.bulk_delete.cancel_button"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDeleteConfirm}
              disabled={isDeletingAll}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-2"
              data-ocid="inventory.bulk_delete.confirm_button"
            >
              {isDeletingAll ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              {isDeletingAll ? "Deleting..." : "Yes, Delete All"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Medicine</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove{" "}
              <strong>{medicines.find((m) => m.id === deleteId)?.name}</strong>{" "}
              from inventory? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-ocid="inventory.delete.cancel_button">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-ocid="inventory.delete.confirm_button"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
