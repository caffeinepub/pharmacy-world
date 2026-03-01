import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle,
  Loader2,
  Minus,
  Plus,
  Search,
  ShoppingCart,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { InvoiceModal } from "../components/InvoiceModal";
import { useAuth } from "../contexts/AuthContext";
import { useData } from "../contexts/DataContext";
import type { Sale, SaleItem } from "../types";

interface CartItem {
  medicineId: string;
  medicineName: string;
  unitPrice: number;
  quantity: number;
}

export function SalesPage() {
  const { medicines, addSale, deductStock } = useData();
  const { currentUser } = useAuth();

  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState("");
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [invoiceOpen, setInvoiceOpen] = useState(false);

  const filteredMedicines = useMemo(
    () =>
      medicines.filter((m) =>
        m.name.toLowerCase().includes(search.toLowerCase()),
      ),
    [medicines, search],
  );

  const addToCart = (medicineId: string) => {
    const med = medicines.find((m) => m.id === medicineId);
    if (!med || med.quantity === 0) return;

    setCart((prev) => {
      const existing = prev.find((c) => c.medicineId === medicineId);
      if (existing) {
        const maxQty = med.quantity;
        if (existing.quantity >= maxQty) {
          toast.warning(`Only ${maxQty} units available`);
          return prev;
        }
        return prev.map((c) =>
          c.medicineId === medicineId ? { ...c, quantity: c.quantity + 1 } : c,
        );
      }
      return [
        ...prev,
        {
          medicineId: med.id,
          medicineName: med.name,
          unitPrice: med.price,
          quantity: 1,
        },
      ];
    });
  };

  const updateQty = (medicineId: string, delta: number) => {
    setCart((prev) => {
      const med = medicines.find((m) => m.id === medicineId);
      return prev
        .map((c) => {
          if (c.medicineId !== medicineId) return c;
          const newQty = c.quantity + delta;
          if (newQty <= 0) return null;
          const maxQty = med?.quantity ?? 9999;
          if (newQty > maxQty) {
            toast.warning(`Only ${maxQty} units available`);
            return c;
          }
          return { ...c, quantity: newQty };
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const removeFromCart = (medicineId: string) => {
    setCart((prev) => prev.filter((c) => c.medicineId !== medicineId));
  };

  const cartSubtotal = cart.reduce((s, c) => s + c.unitPrice * c.quantity, 0);
  const discountAmt = Math.max(
    0,
    Math.min(Number(discount) || 0, cartSubtotal),
  );
  const cartTotal = cartSubtotal - discountAmt;

  const [saleLoading, setSaleLoading] = useState(false);

  const completeSale = async () => {
    if (cart.length === 0) return;
    if (!currentUser) return;
    setSaleLoading(true);

    const items: SaleItem[] = cart.map((c) => ({
      medicineId: c.medicineId,
      medicineName: c.medicineName,
      quantity: c.quantity,
      unitPrice: c.unitPrice,
      subtotal: c.quantity * c.unitPrice,
    }));

    const saleData = {
      date: new Date().toISOString(),
      soldBy: currentUser.username,
      soldByName: currentUser.fullName,
      items,
      subtotal: cartSubtotal,
      discount: discountAmt,
      total: cartTotal,
    };

    try {
      const newSale = await addSale(saleData);
      await deductStock(
        cart.map((c) => ({ medicineId: c.medicineId, quantity: c.quantity })),
      );

      setCompletedSale(newSale);
      setInvoiceOpen(true);
      toast.success(`Sale completed! Invoice: ${newSale.invoiceNumber}`);
    } catch {
      // Error toast already shown in context
    } finally {
      setSaleLoading(false);
    }
  };

  const handleInvoiceClose = () => {
    setInvoiceOpen(false);
    setCompletedSale(null);
    setCart([]);
    setDiscount("");
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">New Sale</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Point of Sale — search and add medicines to cart
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 h-[calc(100vh-12rem)]">
        {/* Medicine List */}
        <div className="lg:col-span-3 flex flex-col bg-card border border-border rounded-lg overflow-hidden">
          <div className="p-3 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search medicines..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {filteredMedicines.map((med) => {
                const inCart = cart.find((c) => c.medicineId === med.id);
                const outOfStock = med.quantity === 0;

                return (
                  <button
                    key={med.id}
                    type="button"
                    onClick={() => !outOfStock && addToCart(med.id)}
                    disabled={outOfStock}
                    className={`text-left p-3 rounded-lg border transition-all ${
                      outOfStock
                        ? "opacity-50 cursor-not-allowed bg-muted border-border"
                        : inCart
                          ? "bg-primary/10 border-primary/40 hover:bg-primary/15"
                          : "bg-card border-border hover:bg-muted/50 hover:border-primary/30"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-foreground truncate">
                          {med.name}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <p className="text-xs text-muted-foreground">
                            {med.category}
                          </p>
                          {med.rackNumber && (
                            <span className="inline-flex items-center px-1.5 py-0 rounded text-xs font-bold bg-primary/10 text-primary border border-primary/20">
                              {med.rackNumber}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold text-primary">
                          Rs. {med.price.toFixed(2)}
                        </p>
                        <Badge
                          className={`text-xs ${
                            outOfStock
                              ? "bg-destructive/15 text-destructive border-0"
                              : med.quantity <= med.lowStockThreshold
                                ? "bg-warning/20 text-warning-foreground border-0"
                                : "bg-success/15 text-success border-0"
                          }`}
                        >
                          {outOfStock ? "Out of Stock" : `${med.quantity} left`}
                        </Badge>
                      </div>
                    </div>
                    {inCart && (
                      <p className="text-xs text-primary font-medium mt-1.5">
                        ✓ In cart ({inCart.quantity})
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Cart */}
        <div className="lg:col-span-2 flex flex-col bg-card border border-border rounded-lg overflow-hidden">
          <div className="p-4 border-b border-border flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-primary" />
            <h2 className="font-semibold text-sm">
              Cart{" "}
              {cart.length > 0 && (
                <span className="text-muted-foreground font-normal">
                  ({cart.length} items)
                </span>
              )}
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-8">
                <ShoppingCart className="w-10 h-10 text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">Cart is empty</p>
                <p className="text-xs text-muted-foreground/70 mt-0.5">
                  Click on a medicine to add it
                </p>
              </div>
            ) : (
              cart.map((item) => (
                <div
                  key={item.medicineId}
                  className="p-2.5 rounded-lg bg-muted/40 border border-border"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="text-xs font-semibold text-foreground flex-1 leading-tight">
                      {item.medicineName}
                    </p>
                    <button
                      type="button"
                      onClick={() => removeFromCart(item.medicineId)}
                      className="text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => updateQty(item.medicineId, -1)}
                        className="w-6 h-6 rounded border border-border flex items-center justify-center hover:bg-muted transition-colors"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-sm font-bold w-6 text-center">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQty(item.medicineId, 1)}
                        className="w-6 h-6 rounded border border-border flex items-center justify-center hover:bg-muted transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <p className="text-sm font-bold text-primary">
                      Rs. {(item.unitPrice * item.quantity).toFixed(2)}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Rs. {item.unitPrice.toFixed(2)} × {item.quantity}
                  </p>
                </div>
              ))
            )}
          </div>

          {/* Checkout */}
          {cart.length > 0 && (
            <div className="border-t border-border p-4 space-y-3">
              <div className="space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">
                    Rs. {cartSubtotal.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Label
                  htmlFor="discount"
                  className="text-sm text-muted-foreground whitespace-nowrap"
                >
                  Discount (Rs.)
                </Label>
                <Input
                  id="discount"
                  type="number"
                  placeholder="0.00"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  className="h-8 text-sm"
                  min="0"
                />
              </div>

              {discountAmt > 0 && (
                <div className="flex justify-between text-sm text-success">
                  <span>Discount</span>
                  <span>-Rs. {discountAmt.toFixed(2)}</span>
                </div>
              )}

              <Separator />

              <div className="flex justify-between font-bold text-base">
                <span>Total</span>
                <span className="text-primary">Rs. {cartTotal.toFixed(2)}</span>
              </div>

              <Button
                className="w-full gap-2"
                onClick={completeSale}
                disabled={cart.length === 0 || saleLoading}
              >
                {saleLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                {saleLoading ? "Processing..." : "Complete Sale"}
              </Button>
            </div>
          )}
        </div>
      </div>

      <InvoiceModal
        sale={completedSale}
        open={invoiceOpen}
        onClose={handleInvoiceClose}
      />
    </div>
  );
}
