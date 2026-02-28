import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  BadgePercent,
  PackagePlus,
  ReceiptText,
  ShoppingBag,
  Tag,
  TrendingDown,
  User,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useData } from "../contexts/DataContext";

export function PurchasesPage() {
  const { purchaseRecords, accounts } = useData();

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [medSearch, setMedSearch] = useState("");
  const [addedByFilter, setAddedByFilter] = useState("all");

  const filtered = useMemo(() => {
    return [...purchaseRecords]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .filter((rec) => {
        const recDate = rec.date.slice(0, 10);
        if (fromDate && recDate < fromDate) return false;
        if (toDate && recDate > toDate) return false;
        if (
          medSearch &&
          !rec.medicineName.toLowerCase().includes(medSearch.toLowerCase())
        )
          return false;
        if (addedByFilter !== "all" && rec.addedBy !== addedByFilter)
          return false;
        return true;
      });
  }, [purchaseRecords, fromDate, toDate, medSearch, addedByFilter]);

  const formatDateTime = (iso: string) => {
    const d = new Date(iso);
    return `${d.toLocaleDateString("en-PK")} ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  };

  const resetFilters = () => {
    setFromDate("");
    setToDate("");
    setMedSearch("");
    setAddedByFilter("all");
  };

  const totalUnits = filtered.reduce((s, r) => s + r.quantity, 0);
  const totalSpent = filtered.reduce((s, r) => s + r.totalCost, 0);
  const totalDiscount = filtered.reduce(
    (s, r) => s + r.discountAmount * r.quantity,
    0,
  );
  const uniqueMedicines = new Set(filtered.map((r) => r.medicineId)).size;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Purchase History
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {filtered.length} purchase records · Total Spent: Rs.
            {totalSpent.toFixed(0)}
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <ShoppingBag className="w-4 h-4" />
          <span className="text-sm">{purchaseRecords.length} total</span>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <ReceiptText className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">
            Purchase Summary Report
          </h2>
          {(fromDate || toDate) && (
            <span className="text-xs text-muted-foreground">
              {fromDate && toDate
                ? `${fromDate} — ${toDate}`
                : fromDate
                  ? `From ${fromDate}`
                  : `Up to ${toDate}`}
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-primary/8 rounded-lg p-3 flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-primary">
              <PackagePlus className="w-3.5 h-3.5" />
              <span className="text-xs font-medium">Total Records</span>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {filtered.length}
            </p>
            <p className="text-xs text-muted-foreground">purchases</p>
          </div>
          <div className="bg-blue-500/8 rounded-lg p-3 flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-blue-600">
              <ShoppingBag className="w-3.5 h-3.5" />
              <span className="text-xs font-medium">Units Purchased</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{totalUnits}</p>
            <p className="text-xs text-muted-foreground">
              {uniqueMedicines} medicines
            </p>
          </div>
          <div className="bg-rose-500/8 rounded-lg p-3 flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-rose-600">
              <TrendingDown className="w-3.5 h-3.5" />
              <span className="text-xs font-medium">Total Spent</span>
            </div>
            <p className="text-2xl font-bold text-foreground">
              Rs.{totalSpent.toFixed(0)}
            </p>
            <p className="text-xs text-muted-foreground">net after discount</p>
          </div>
          <div className="bg-emerald-500/8 rounded-lg p-3 flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-emerald-600">
              <Tag className="w-3.5 h-3.5" />
              <span className="text-xs font-medium">Discount Saved</span>
            </div>
            <p className="text-2xl font-bold text-foreground">
              Rs.{totalDiscount.toFixed(0)}
            </p>
            <p className="text-xs text-muted-foreground">total saved</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">From Date</Label>
            <Input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">To Date</Label>
            <Input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Added By</Label>
            <Select value={addedByFilter} onValueChange={setAddedByFilter}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="All accounts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Accounts</SelectItem>
                {accounts.map((acc) => (
                  <SelectItem key={acc.id} value={acc.username}>
                    {acc.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Medicine Name</Label>
            <Input
              placeholder="Search medicine..."
              value={medSearch}
              onChange={(e) => setMedSearch(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
        </div>
        {(fromDate || toDate || addedByFilter !== "all" || medSearch) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={resetFilters}
            className="mt-3 text-xs text-muted-foreground h-7"
          >
            Clear filters
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border overflow-hidden bg-card">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-xs font-semibold">
                  Date / Time
                </TableHead>
                <TableHead className="text-xs font-semibold">
                  Medicine
                </TableHead>
                <TableHead className="text-xs font-semibold text-center">
                  Qty
                </TableHead>
                <TableHead className="text-xs font-semibold text-right">
                  Purchase Price
                </TableHead>
                <TableHead className="text-xs font-semibold text-center">
                  Discount
                </TableHead>
                <TableHead className="text-xs font-semibold text-right">
                  Net Price/Unit
                </TableHead>
                <TableHead className="text-xs font-semibold text-right">
                  Total Cost
                </TableHead>
                <TableHead className="text-xs font-semibold">
                  Added By
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="text-center py-10 text-muted-foreground text-sm"
                  >
                    {purchaseRecords.length === 0
                      ? "Koi purchase record nahi hai. Inventory se 'Add Stock' karein."
                      : "No records match your filters."}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((rec) => (
                  <TableRow key={rec.id} className="hover:bg-muted/30">
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDateTime(rec.date)}
                    </TableCell>
                    <TableCell>
                      <p className="text-sm font-medium">{rec.medicineName}</p>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary" className="text-xs">
                        {rec.quantity}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-xs font-mono">
                      Rs.{rec.purchasePrice.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-center">
                      {rec.discountPercent > 0 ? (
                        <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-emerald-600">
                          <BadgePercent className="w-3 h-3" />
                          {rec.discountPercent}%
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-xs font-mono font-semibold">
                      Rs.{rec.netPurchasePrice.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right text-sm font-bold font-mono text-primary">
                      Rs.{rec.totalCost.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <User className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs">{rec.addedByName}</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
