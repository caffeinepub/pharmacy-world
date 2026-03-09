import type { Medicine } from "../types";

// XLSX is loaded via CDN (window.XLSX)
const XLSX = (window as unknown as Record<string, unknown>)
  .XLSX as typeof import("xlsx");

// jsPDF is loaded via CDN (window.jspdf)
interface JsPDFInstance {
  text(
    text: string,
    x: number,
    y: number,
    options?: Record<string, unknown>,
  ): void;
  setFontSize(size: number): void;
  setFont(name: string, style?: string): void;
  setTextColor(r: number, g: number, b: number): void;
  setFillColor(r: number, g: number, b: number): void;
  rect(x: number, y: number, w: number, h: number, style?: string): void;
  line(x1: number, y1: number, x2: number, y2: number): void;
  save(filename: string): void;
  internal: {
    pageSize: { getWidth(): number; getHeight(): number };
    getNumberOfPages(): number;
  };
  setPage(page: number): void;
  // biome-ignore lint/suspicious/noExplicitAny: autotable plugin extends jsPDF dynamically
  autoTable: (options: Record<string, any>) => void;
  // biome-ignore lint/suspicious/noExplicitAny: autotable plugin extends jsPDF dynamically
  lastAutoTable: { finalY: number } | undefined;
}

interface JsPDFConstructor {
  new (orientation?: string, unit?: string, format?: string): JsPDFInstance;
}

function getJsPDF(): JsPDFConstructor {
  const win = window as unknown as Record<string, unknown>;
  // jspdf CDN exposes window.jspdf.jsPDF
  const jspdfModule = win.jspdf as Record<string, unknown> | undefined;
  if (jspdfModule?.jsPDF) {
    return jspdfModule.jsPDF as JsPDFConstructor;
  }
  // fallback: window.jsPDF
  if (win.jsPDF) {
    return win.jsPDF as JsPDFConstructor;
  }
  throw new Error("jsPDF not loaded");
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Export inventory to Excel (.xlsx)
 */
export function exportInventoryToExcel(medicines: Medicine[]): void {
  const headers = [
    "Name",
    "Category",
    "Manufacturer",
    "Purchase Price (Rs.)",
    "Sale Price/Tablet (Rs.)",
    "Quantity",
    "Expiry Date",
    "Rack Number",
    "Low Stock Threshold",
  ];

  const rows = medicines.map((m) => [
    m.name,
    m.category,
    m.manufacturer,
    (m.purchasePrice ?? m.price).toFixed(2),
    (m.retailPrice ?? m.price).toFixed(2),
    m.quantity,
    m.expiryDate,
    m.rackNumber ?? "",
    m.lowStockThreshold,
  ]);

  const wsData = [headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Set column widths
  ws["!cols"] = [
    { wch: 28 }, // Name
    { wch: 18 }, // Category
    { wch: 20 }, // Manufacturer
    { wch: 22 }, // Purchase Price
    { wch: 24 }, // Sale Price
    { wch: 10 }, // Quantity
    { wch: 14 }, // Expiry Date
    { wch: 14 }, // Rack Number
    { wch: 22 }, // Low Stock Threshold
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Inventory");

  const filename = `inventory-${formatDate(new Date())}.xlsx`;
  XLSX.writeFile(wb, filename);
}

/**
 * Export inventory to PDF
 */
export function exportInventoryToPDF(medicines: Medicine[]): void {
  const JsPDF = getJsPDF();
  const doc = new JsPDF("landscape", "mm", "a4");

  const pageWidth = doc.internal.pageSize.getWidth();
  const today = new Date();
  const dateStr = today.toLocaleDateString("en-PK", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Header background
  doc.setFillColor(22, 78, 99); // dark teal
  doc.rect(0, 0, pageWidth, 22, "F");

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text("United Pharmacy — Inventory Report", 14, 10);

  // Subtitle / date
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(
    `Generated: ${dateStr}   |   Total medicines: ${medicines.length}`,
    14,
    17,
  );

  // Table
  const tableHeaders = [
    "Name",
    "Category",
    "Manufacturer",
    "Purchase\nPrice (Rs.)",
    "Sale Price/\nTablet (Rs.)",
    "Qty",
    "Expiry Date",
    "Rack",
    "Low Stock\nThreshold",
  ];

  const tableRows = medicines.map((m) => [
    m.name,
    m.category,
    m.manufacturer,
    `Rs. ${(m.purchasePrice ?? m.price).toFixed(2)}`,
    `Rs. ${(m.retailPrice ?? m.price).toFixed(2)}`,
    m.quantity,
    m.expiryDate,
    m.rackNumber ?? "—",
    m.lowStockThreshold,
  ]);

  doc.autoTable({
    head: [tableHeaders],
    body: tableRows,
    startY: 26,
    theme: "striped",
    headStyles: {
      fillColor: [22, 78, 99],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8,
      halign: "center",
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [30, 30, 30],
    },
    alternateRowStyles: {
      fillColor: [240, 248, 255],
    },
    columnStyles: {
      0: { cellWidth: 40 }, // Name
      1: { cellWidth: 28 }, // Category
      2: { cellWidth: 30 }, // Manufacturer
      3: { cellWidth: 26, halign: "right" }, // Purchase Price
      4: { cellWidth: 26, halign: "right" }, // Sale Price
      5: { cellWidth: 14, halign: "center" }, // Qty
      6: { cellWidth: 24 }, // Expiry
      7: { cellWidth: 16, halign: "center" }, // Rack
      8: { cellWidth: 20, halign: "center" }, // Low Stock
    },
    margin: { left: 14, right: 14 },
    didDrawPage: (data: Record<string, unknown>) => {
      // Footer on each page
      const pageHeight = doc.internal.pageSize.getHeight();
      doc.setFontSize(7);
      doc.setTextColor(120, 120, 120);
      doc.setFont("helvetica", "normal");
      const pageNum = data.pageNumber as number;
      const totalPages = doc.internal.getNumberOfPages();
      doc.text(
        `Page ${pageNum} of ${totalPages}`,
        pageWidth - 14,
        pageHeight - 6,
        { align: "right" },
      );
      doc.text(
        "United Pharmacy, 208 Road Near Kashmir Pull, United Hospital, Faisalabad",
        14,
        pageHeight - 6,
      );
    },
  });

  const filename = `inventory-report-${formatDate(today)}.pdf`;
  doc.save(filename);
}
