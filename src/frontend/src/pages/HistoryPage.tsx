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
import { Eye, History } from "lucide-react";
import { useMemo, useState } from "react";
import { InvoiceModal } from "../components/InvoiceModal";
import { useData } from "../contexts/DataContext";
import type { Sale } from "../types";

export function HistoryPage() {
  const { sales, accounts } = useData();
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

  const totalRevenue = filtered.reduce((s, sale) => s + sale.total, 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Sales History</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {filtered.length} sales · Total Revenue: ${totalRevenue.toFixed(2)}
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <History className="w-4 h-4" />
          <span className="text-sm">{sales.length} total</span>
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
                  Invoice
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
                    <TableCell className="text-sm">{sale.soldByName}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary" className="text-xs">
                        {sale.items.length}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-right font-mono">
                      {sale.discount > 0 ? (
                        <span className="text-success">
                          -${sale.discount.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm font-bold text-right font-mono">
                      ${sale.total.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedSale(sale)}
                        className="h-7 w-7 p-0"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
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
