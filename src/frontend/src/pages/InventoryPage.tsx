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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { MedicineFormModal } from "../components/MedicineFormModal";
import { useData } from "../contexts/DataContext";
import type { Medicine } from "../types";

export function InventoryPage() {
  const { medicines, deleteMedicine } = useData();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMed, setEditingMed] = useState<Medicine | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

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

  const handleDelete = () => {
    if (!deleteId) return;
    const med = medicines.find((m) => m.id === deleteId);
    deleteMedicine(deleteId);
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
        <Button onClick={openAdd} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Medicine
        </Button>
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
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-44">
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

      {/* Table */}
      <div className="rounded-lg border border-border overflow-hidden bg-card">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
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
                  Price
                </TableHead>
                <TableHead className="text-xs font-semibold text-center">
                  Qty
                </TableHead>
                <TableHead className="text-xs font-semibold">Expiry</TableHead>
                <TableHead className="text-xs font-semibold text-center">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center py-10 text-muted-foreground text-sm"
                  >
                    No medicines found
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((med) => {
                  const expiryStatus = getExpiryStatus(med.expiryDate);
                  const isLow = med.quantity <= med.lowStockThreshold;
                  return (
                    <TableRow key={med.id} className="hover:bg-muted/30">
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
                      <TableCell className="text-sm text-right font-mono">
                        ${med.price.toFixed(2)}
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
                      <TableCell>
                        <div className="flex items-center justify-center gap-1.5">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openEdit(med)}
                            className="h-7 w-7 p-0"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setDeleteId(med.id)}
                            className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
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

      {/* Modals */}
      <MedicineFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        medicine={editingMed}
      />

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
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
