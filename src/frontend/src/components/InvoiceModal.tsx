import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Printer, X } from "lucide-react";
import type { Sale } from "../types";

interface InvoiceModalProps {
  sale: Sale | null;
  open: boolean;
  onClose: () => void;
}

export function InvoiceModal({ sale, open, onClose }: InvoiceModalProps) {
  if (!sale) return null;

  const handlePrint = () => {
    const printWindow = window.open("", "_blank", "width=800,height=600");
    if (!printWindow) return;

    const formatD = (iso: string) => {
      const d = new Date(iso);
      return d.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    };
    const formatT = (iso: string) => {
      const d = new Date(iso);
      return d.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });
    };

    const itemRows = sale.items
      .map(
        (item, idx) => `
        <tr style="border-bottom:1px solid #f3f4f6; background:${idx % 2 === 0 ? "#fff" : "#f9fafb"}">
          <td style="padding:5px 8px;color:#6b7280">${idx + 1}</td>
          <td style="padding:5px 8px">${item.medicineName}</td>
          <td style="padding:5px 8px;text-align:center">${item.quantity}</td>
          <td style="padding:5px 8px;text-align:right">$${item.unitPrice.toFixed(2)}</td>
          <td style="padding:5px 8px;text-align:right">$${item.subtotal.toFixed(2)}</td>
        </tr>`,
      )
      .join("");

    const discountRow =
      sale.discount > 0
        ? `<div style="display:flex;justify-content:space-between;font-size:0.8rem;margin-bottom:4px;color:#16a34a">
            <span>Discount</span><span>-$${sale.discount.toFixed(2)}</span>
           </div>`
        : "";

    printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Invoice ${sale.invoiceNumber}</title>
  <style>
    body { font-family: Arial, sans-serif; color: #1a1a2e; margin: 2rem; }
    @media print { body { margin: 1cm; } }
  </style>
</head>
<body>
  <div style="text-align:center;margin-bottom:1rem">
    <div style="font-size:1.4rem;font-weight:800;letter-spacing:0.05em;color:#1e40af">✚ PHARMACY WORLD</div>
    <div style="font-size:0.8rem;color:#6b7280;margin-top:2px">Professional Pharmacy Management</div>
    <div style="display:inline-block;background:#dbeafe;color:#1e40af;padding:2px 12px;border-radius:20px;font-size:0.7rem;font-weight:600;margin-top:8px">TAX INVOICE</div>
  </div>

  <div style="border-top:1px solid #e5e7eb;border-bottom:1px solid #e5e7eb;padding:10px 0;margin-bottom:12px;display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:0.78rem">
    <div><span style="color:#6b7280">Invoice #: </span><strong>${sale.invoiceNumber}</strong></div>
    <div style="text-align:right"><span style="color:#6b7280">Date: </span><strong>${formatD(sale.date)}</strong></div>
    <div><span style="color:#6b7280">Time: </span><strong>${formatT(sale.date)}</strong></div>
    <div style="text-align:right"><span style="color:#6b7280">Sold by: </span><strong>${sale.soldByName}</strong></div>
  </div>

  <table style="width:100%;font-size:0.78rem;border-collapse:collapse;margin-bottom:12px">
    <thead>
      <tr style="background:#eff6ff;color:#1e40af">
        <th style="padding:6px 8px;text-align:left;font-weight:600">#</th>
        <th style="padding:6px 8px;text-align:left;font-weight:600">Medicine</th>
        <th style="padding:6px 8px;text-align:center;font-weight:600">Qty</th>
        <th style="padding:6px 8px;text-align:right;font-weight:600">Unit Price</th>
        <th style="padding:6px 8px;text-align:right;font-weight:600">Subtotal</th>
      </tr>
    </thead>
    <tbody>${itemRows}</tbody>
  </table>

  <div style="border-top:2px solid #dbeafe;padding-top:10px">
    <div style="display:flex;justify-content:space-between;font-size:0.8rem;margin-bottom:4px">
      <span style="color:#6b7280">Subtotal</span><span>$${sale.subtotal.toFixed(2)}</span>
    </div>
    ${discountRow}
    <div style="display:flex;justify-content:space-between;font-size:1rem;font-weight:700;margin-top:8px;padding-top:8px;border-top:1px solid #e5e7eb;color:#1e40af">
      <span>TOTAL</span><span>$${sale.total.toFixed(2)}</span>
    </div>
  </div>

  <div style="text-align:center;margin-top:2rem;font-size:0.8rem;color:#666">
    <p>Thank you for your purchase!</p>
  </div>

  <script>window.onload = function(){ window.print(); window.onafterprint = function(){ window.close(); }; }</script>
</body>
</html>`);
    printWindow.document.close();
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <>
      {/* Screen version */}
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="sr-only">Invoice</DialogTitle>
          </DialogHeader>

          <div className="invoice-screen">
            <InvoiceContent sale={sale} />
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={onClose} className="gap-2">
              <X className="w-4 h-4" />
              Close
            </Button>
            <Button onClick={handlePrint} className="gap-2">
              <Printer className="w-4 h-4" />
              Print Invoice
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );

  function InvoiceContent({ sale }: { sale: Sale }) {
    return (
      <div style={{ fontFamily: "Arial, sans-serif", color: "#1a1a2e" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "1rem" }}>
          <div
            style={{
              fontSize: "1.4rem",
              fontWeight: "800",
              letterSpacing: "0.05em",
              color: "#1e40af",
            }}
          >
            ✚ PHARMACY WORLD
          </div>
          <div
            style={{ fontSize: "0.8rem", color: "#6b7280", marginTop: "2px" }}
          >
            Professional Pharmacy Management
          </div>
          <div
            style={{
              display: "inline-block",
              background: "#dbeafe",
              color: "#1e40af",
              padding: "2px 12px",
              borderRadius: "20px",
              fontSize: "0.7rem",
              fontWeight: "600",
              marginTop: "8px",
            }}
          >
            TAX INVOICE
          </div>
        </div>

        <div
          style={{
            borderTop: "1px solid #e5e7eb",
            borderBottom: "1px solid #e5e7eb",
            padding: "10px 0",
            marginBottom: "12px",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "4px",
            fontSize: "0.78rem",
          }}
        >
          <div>
            <span style={{ color: "#6b7280" }}>Invoice #: </span>
            <strong>{sale.invoiceNumber}</strong>
          </div>
          <div style={{ textAlign: "right" }}>
            <span style={{ color: "#6b7280" }}>Date: </span>
            <strong>{formatDate(sale.date)}</strong>
          </div>
          <div>
            <span style={{ color: "#6b7280" }}>Time: </span>
            <strong>{formatTime(sale.date)}</strong>
          </div>
          <div style={{ textAlign: "right" }}>
            <span style={{ color: "#6b7280" }}>Sold by: </span>
            <strong>{sale.soldByName}</strong>
          </div>
        </div>

        {/* Items table */}
        <table
          style={{
            width: "100%",
            fontSize: "0.78rem",
            borderCollapse: "collapse",
            marginBottom: "12px",
          }}
        >
          <thead>
            <tr style={{ background: "#eff6ff", color: "#1e40af" }}>
              <th
                style={{
                  padding: "6px 8px",
                  textAlign: "left",
                  fontWeight: "600",
                }}
              >
                #
              </th>
              <th
                style={{
                  padding: "6px 8px",
                  textAlign: "left",
                  fontWeight: "600",
                }}
              >
                Medicine
              </th>
              <th
                style={{
                  padding: "6px 8px",
                  textAlign: "center",
                  fontWeight: "600",
                }}
              >
                Qty
              </th>
              <th
                style={{
                  padding: "6px 8px",
                  textAlign: "right",
                  fontWeight: "600",
                }}
              >
                Unit Price
              </th>
              <th
                style={{
                  padding: "6px 8px",
                  textAlign: "right",
                  fontWeight: "600",
                }}
              >
                Subtotal
              </th>
            </tr>
          </thead>
          <tbody>
            {sale.items.map((item, idx) => (
              <tr
                key={item.medicineId}
                style={{
                  borderBottom: "1px solid #f3f4f6",
                  background: idx % 2 === 0 ? "#fff" : "#f9fafb",
                }}
              >
                <td style={{ padding: "5px 8px", color: "#6b7280" }}>
                  {idx + 1}
                </td>
                <td style={{ padding: "5px 8px" }}>{item.medicineName}</td>
                <td style={{ padding: "5px 8px", textAlign: "center" }}>
                  {item.quantity}
                </td>
                <td style={{ padding: "5px 8px", textAlign: "right" }}>
                  ${item.unitPrice.toFixed(2)}
                </td>
                <td style={{ padding: "5px 8px", textAlign: "right" }}>
                  ${item.subtotal.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div
          style={{
            borderTop: "2px solid #dbeafe",
            paddingTop: "10px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "0.8rem",
              marginBottom: "4px",
            }}
          >
            <span style={{ color: "#6b7280" }}>Subtotal</span>
            <span>${sale.subtotal.toFixed(2)}</span>
          </div>
          {sale.discount > 0 && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "0.8rem",
                marginBottom: "4px",
                color: "#16a34a",
              }}
            >
              <span>Discount</span>
              <span>-${sale.discount.toFixed(2)}</span>
            </div>
          )}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "1rem",
              fontWeight: "700",
              marginTop: "8px",
              paddingTop: "8px",
              borderTop: "1px solid #e5e7eb",
              color: "#1e40af",
            }}
          >
            <span>TOTAL</span>
            <span>${sale.total.toFixed(2)}</span>
          </div>
        </div>
      </div>
    );
  }
}
