import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertTriangle,
  DollarSign,
  Package,
  ShoppingCart,
  TrendingUp,
} from "lucide-react";
import { useState } from "react";
import { InvoiceModal } from "../components/InvoiceModal";
import { useData } from "../contexts/DataContext";
import type { Sale } from "../types";

export function DashboardPage() {
  const { medicines, sales } = useData();
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  const today = new Date().toISOString().slice(0, 10);
  const todaySales = sales.filter((s) => s.date.startsWith(today));
  const totalRevenue = todaySales.reduce((sum, s) => sum + s.total, 0);
  const totalStockUnits = medicines.reduce((sum, m) => sum + m.quantity, 0);
  const lowStockItems = medicines.filter(
    (m) => m.quantity <= m.lowStockThreshold,
  );
  const recentSales = [...sales]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 10);

  const formatDateTime = (iso: string) => {
    const d = new Date(iso);
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  };

  const stats = [
    {
      label: "Total Medicines",
      value: medicines.length,
      icon: Package,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      label: "Total Stock Units",
      value: totalStockUnits.toLocaleString(),
      icon: TrendingUp,
      color: "text-success",
      bg: "bg-success/10",
    },
    {
      label: "Today's Sales",
      value: todaySales.length,
      icon: ShoppingCart,
      color: "text-warning",
      bg: "bg-warning/10",
    },
    {
      label: "Today's Revenue",
      value: `$${totalRevenue.toFixed(2)}`,
      icon: DollarSign,
      color: "text-primary",
      bg: "bg-primary/10",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Overview of your pharmacy operations
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-border shadow-xs">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    {stat.label}
                  </p>
                  <p className="text-2xl font-bold text-foreground mt-1">
                    {stat.value}
                  </p>
                </div>
                <div className={`p-2 rounded-lg ${stat.bg}`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Low Stock Alerts */}
      <Card className="border-border shadow-xs">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-warning" />
            Low Stock Alerts
            {lowStockItems.length > 0 && (
              <Badge className="bg-warning/20 text-warning-foreground border-0 text-xs">
                {lowStockItems.length} items
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {lowStockItems.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              ✓ No low stock items — all medicines are well stocked!
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {lowStockItems.map((med) => (
                <div
                  key={med.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-warning/10 border border-warning/30"
                >
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {med.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {med.category}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-warning">
                      {med.quantity}
                    </p>
                    <p className="text-xs text-muted-foreground">units left</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      <Card className="border-border shadow-xs">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {recentSales.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No sales recorded yet. Start making sales from the New Sale page.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Invoice #</TableHead>
                    <TableHead className="text-xs">Date/Time</TableHead>
                    <TableHead className="text-xs">Sold By</TableHead>
                    <TableHead className="text-xs text-center">Items</TableHead>
                    <TableHead className="text-xs text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentSales.map((sale) => (
                    <TableRow
                      key={sale.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedSale(sale)}
                    >
                      <TableCell className="text-xs font-mono font-semibold text-primary">
                        {sale.invoiceNumber}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDateTime(sale.date)}
                      </TableCell>
                      <TableCell className="text-xs">
                        {sale.soldByName}
                      </TableCell>
                      <TableCell className="text-xs text-center">
                        <Badge variant="secondary" className="text-xs">
                          {sale.items.length}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs font-semibold text-right">
                        ${sale.total.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <InvoiceModal
        sale={selectedSale}
        open={!!selectedSale}
        onClose={() => setSelectedSale(null)}
      />
    </div>
  );
}
