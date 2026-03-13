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
  CalendarDays,
  PackagePlus,
  ReceiptText,
  ShoppingBag,
  Tag,
  TrendingDown,
  User,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useData } from "../contexts/DataContext";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-PK", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return {
    date: formatDate(iso),
    time: d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  };
}

function dateKey(iso: string) {
  return iso.slice(0, 10);
}

export function PurchasesPage() {
  const { purchaseRecords, accounts, medicines } = useData();

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [medSearch, setMedSearch] = useState("");
  const [addedByFilter, setAddedByFilter] = useState("all");
  const [showDateSummary, setShowDateSummary] = useState(true);

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

  // Group by date for date-wise summary
  const dateSummary = useMemo(() => {
    const map = new Map<
      string,
      { totalCost: number; qty: number; medicines: Set<string> }
    >();
    for (const rec of filtered) {
      const key = dateKey(rec.date);
      if (!map.has(key)) {
        map.set(key, { totalCost: 0, qty: 0, medicines: new Set() });
      }
      const entry = map.get(key)!;
      entry.totalCost += rec.totalCost;
      entry.qty += rec.quantity;
      entry.medicines.add(rec.medicineId);
    }
    return Array.from(map.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([key, val]) => ({
        date: key,
        ...val,
        medicineCount: val.medicines.size,
      }));
  }, [filtered]);

  const todayKey = new Date().toISOString().slice(0, 10);
  const todaySummary = dateSummary.find((d) => d.date === todayKey);

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

      {/* Today's quick highlight */}
      {todaySummary && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-emerald-600" />
            <span className="text-sm font-semibold text-emerald-800">
              Aaj ki purchases:
            </span>
          </div>
          <span className="text-sm text-emerald-700">
            Rs.<strong>{todaySummary.totalCost.toFixed(0)}</strong> worth of
            stock
          </span>
          <span className="text-sm text-emerald-700">
            <strong>{todaySummary.qty}</strong> units
          </span>
          <span className="text-sm text-emerald-700">
            <strong>{todaySummary.medicineCount}</strong> medicines
          </span>
        </div>
      )}

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

      {/* Date-wise grouped summary */}
      {dateSummary.length > 0 && (
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">
                Date-wise Purchase Summary
              </h2>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7"
              onClick={() => setShowDateSummary((p) => !p)}
              data-ocid="purchases.date_summary.toggle"
            >
              {showDateSummary ? "Hide" : "Show"}
            </Button>
          </div>
          {showDateSummary && (
            <div className="space-y-1.5">
              {dateSummary.slice(0, 10).map((entry) => (
                <div
                  key={entry.date}
                  className={`flex items-center justify-between px-3 py-2 rounded-md text-sm ${
                    entry.date === todayKey
                      ? "bg-emerald-50 border border-emerald-200"
                      : "bg-muted/40"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`font-semibold text-xs ${
                        entry.date === todayKey
                          ? "text-emerald-700"
                          : "text-foreground"
                      }`}
                    >
                      {entry.date === todayKey
                        ? "Today"
                        : formatDate(`${entry.date}T00:00:00`)}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {entry.medicineCount} medicines · {entry.qty} units
                    </span>
                  </div>
                  <span
                    className={`font-bold font-mono text-sm ${
                      entry.date === todayKey
                        ? "text-emerald-700"
                        : "text-primary"
                    }`}
                  >
                    Rs.{entry.totalCost.toFixed(0)}
                  </span>
                </div>
              ))}
              {dateSummary.length > 10 && (
                <p className="text-xs text-muted-foreground text-center pt-1">
                  Showing last 10 days. Use date filters to narrow down.
                </p>
              )}
            </div>
          )}
        </div>
      )}

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
              data-ocid="purchases.from_date.input"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">To Date</Label>
            <Input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="h-8 text-sm"
              data-ocid="purchases.to_date.input"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Added By</Label>
            <Select value={addedByFilter} onValueChange={setAddedByFilter}>
              <SelectTrigger
                className="h-8 text-sm"
                data-ocid="purchases.added_by.select"
              >
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
              data-ocid="purchases.search.input"
            />
          </div>
        </div>
        {(fromDate || toDate || addedByFilter !== "all" || medSearch) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={resetFilters}
            className="mt-3 text-xs text-muted-foreground h-7"
            data-ocid="purchases.clear_filters.button"
          >
            Clear filters
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border overflow-hidden bg-card">
        <div className="overflow-x-auto">
          <Table data-ocid="purchases.table">
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-xs font-semibold">Date</TableHead>
                <TableHead className="text-xs font-semibold">Time</TableHead>
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
                <TableHead className="text-xs font-semibold text-right text-amber-600">
                  Retail Price
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
                    colSpan={10}
                    className="text-center py-10 text-muted-foreground text-sm"
                    data-ocid="purchases.empty_state"
                  >
                    {purchaseRecords.length === 0
                      ? "Koi purchase record nahi hai. Inventory se 'Add Stock' karein."
                      : "No records match your filters."}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((rec, i) => {
                  const med = medicines.find((m) => m.id === rec.medicineId);
                  const retailPrice = med?.retailPrice ?? med?.price;
                  const { date, time } = formatDateTime(rec.date);
                  return (
                    <TableRow
                      key={rec.id}
                      className="hover:bg-muted/30"
                      data-ocid={`purchases.row.${i + 1}`}
                    >
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {date}
                      </TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground whitespace-nowrap">
                        {time}
                      </TableCell>
                      <TableCell>
                        <p className="text-sm font-medium">
                          {rec.medicineName}
                        </p>
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
                          <span className="text-xs text-muted-foreground">
                            —
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-xs font-mono font-semibold">
                        Rs.{rec.netPurchasePrice.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right text-xs font-mono font-semibold text-amber-600">
                        {retailPrice != null
                          ? `Rs.${retailPrice.toFixed(2)}`
                          : "—"}
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
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
