import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
  Eye,
  History,
  ReceiptText,
  ShoppingCart,
  Tag,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { InvoiceModal } from "../components/InvoiceModal";
import { useAuth } from "../contexts/AuthContext";
import { useData } from "../contexts/DataContext";
import type { Sale } from "../types";

export function HistoryPage() {
  const { sales, accounts, deleteSale } = useData();
  const { currentUser } = useAuth();
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [soldByFilter, setSoldByFilter] = useState("all");
  const [medSearch, setMedSearch] = useState("");

  const filtered = useMemo(() => {
    return [...sales]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .filter((sale) => {
        const saleDate = sale.date.slice(0, 10);
        if (fromDate && saleDate < fromDate) return false;
        if (toDate && saleDate > toDate) return false;
        if (soldByFilter !== "all" && sale.soldBy !== soldByFilter)
          return false;
        if (
          medSearch &&
          !sale.items.some((item) =>
            item.medicineName.toLowerCase().includes(medSearch.toLowerCase()),
          )
        )
          return false;
        return true;
      });
  }, [sales, fromDate, toDate, soldByFilter, medSearch]);

  const formatDateTime = (iso: string) => {
    const d = new Date(iso);
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  };

  const resetFilters = () => {
    setFromDate("");
    setToDate("");
    setSoldByFilter("all");
    setMedSearch("");
  };

  const handleDeleteSale = (saleId: string) => {
    deleteSale(saleId);
    toast.success("Invoice deleted and stock restored");
  };

  const totalRevenue = filtered.reduce((s, sale) => s + sale.total, 0);
  const totalDiscount = filtered.reduce(
    (s, sale) => s + (sale.discount || 0),
    0,
  );
  const totalItems = filtered.reduce(
    (s, sale) => s + sale.items.reduce((si, item) => si + item.quantity, 0),
    0,
  );
  const avgSale = filtered.length > 0 ? totalRevenue / filtered.length : 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Sales History</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {filtered.length} sales · Total Revenue: Rs.
            {totalRevenue.toFixed(2)}
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <History className="w-4 h-4" />
          <span className="text-sm">{sales.length} total</span>
        </div>
      </div>

      {/* Sales Summary Report */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <ReceiptText className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">
            Sale Summary Report
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
              <ReceiptText className="w-3.5 h-3.5" />
              <span className="text-xs font-medium">Total Invoices</span>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {filtered.length}
            </p>
            <p className="text-xs text-muted-foreground">invoices</p>
          </div>
          <div className="bg-emerald-500/8 rounded-lg p-3 flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-emerald-600">
              <TrendingUp className="w-3.5 h-3.5" />
              <span className="text-xs font-medium">Total Revenue</span>
            </div>
            <p className="text-2xl font-bold text-foreground">
              Rs.{totalRevenue.toFixed(0)}
            </p>
            <p className="text-xs text-muted-foreground">
              avg Rs.{avgSale.toFixed(0)}/sale
            </p>
          </div>
          <div className="bg-blue-500/8 rounded-lg p-3 flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-blue-600">
              <ShoppingCart className="w-3.5 h-3.5" />
              <span className="text-xs font-medium">Items Sold</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{totalItems}</p>
            <p className="text-xs text-muted-foreground">units</p>
          </div>
          <div className="bg-orange-500/8 rounded-lg p-3 flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-orange-600">
              <Tag className="w-3.5 h-3.5" />
              <span className="text-xs font-medium">Total Discount</span>
            </div>
            <p className="text-2xl font-bold text-foreground">
              Rs.{totalDiscount.toFixed(0)}
            </p>
            <p className="text-xs text-muted-foreground">given</p>
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
            <Label className="text-xs">Sold By</Label>
            <Select value={soldByFilter} onValueChange={setSoldByFilter}>
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
        {(fromDate || toDate || soldByFilter !== "all" || medSearch) && (
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
                  Invoice #
                </TableHead>
                <TableHead className="text-xs font-semibold">
                  Date/Time
                </TableHead>
                <TableHead className="text-xs font-semibold">Sold By</TableHead>
                <TableHead className="text-xs font-semibold text-center">
                  Items
                </TableHead>
                <TableHead className="text-xs font-semibold text-right">
                  Discount
                </TableHead>
                <TableHead className="text-xs font-semibold text-right">
                  Total
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
                    colSpan={7}
                    className="text-center py-10 text-muted-foreground text-sm"
                  >
                    {sales.length === 0
                      ? "No sales recorded yet."
                      : "No sales match your filters."}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((sale) => (
                  <TableRow key={sale.id} className="hover:bg-muted/30">
                    <TableCell className="text-xs font-mono font-semibold text-primary">
                      {sale.invoiceNumber}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDateTime(sale.date)}
                    </TableCell>
                    <TableCell className="text-sm">
                      <div>{sale.soldByName}</div>
                      {(sale.patientName || sale.patientPhone) && (
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {sale.patientName && <span>{sale.patientName}</span>}
                          {sale.patientName && sale.patientPhone && (
                            <span> · </span>
                          )}
                          {sale.patientPhone && (
                            <span>{sale.patientPhone}</span>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary" className="text-xs">
                        {sale.items.length}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-right font-mono">
                      {sale.discount > 0 ? (
                        <span className="text-success">
                          -Rs.{sale.discount.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm font-bold text-right font-mono">
                      Rs.{sale.total.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setSelectedSale(sale)}
                          className="h-7 w-7 p-0"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                        {currentUser?.role === "admin" && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  Delete Invoice?
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently delete invoice{" "}
                                  <strong>{sale.invoiceNumber}</strong> and
                                  restore stock for all {sale.items.length}{" "}
                                  item(s). This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteSale(sale.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete & Restore Stock
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <InvoiceModal
        sale={selectedSale}
        open={!!selectedSale}
        onClose={() => setSelectedSale(null)}
      />
    </div>
  );
}
