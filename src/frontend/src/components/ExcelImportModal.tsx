import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Loader2,
  Upload,
  X,
} from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { useData } from "../contexts/DataContext";

// XLSX is loaded via CDN script in index.html (window.XLSX)
const XLSX = (window as unknown as Record<string, unknown>)
  .XLSX as typeof import("xlsx");

interface ParsedRow {
  name: string;
  category: string;
  manufacturer: string;
  purchasePrice: number;
  retailPrice: number;
  quantity: number;
  expiryDate: string;
  lowStockThreshold: number;
  rackNumber?: string;
  // validation
  valid: boolean;
  errors: string[];
  rowIndex: number;
}

interface ExcelImportModalProps {
  open: boolean;
  onClose: () => void;
}

function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[\s_-]/g, "");
}

function getVal(row: Record<string, unknown>, ...keys: string[]): unknown {
  const normalized = Object.fromEntries(
    Object.entries(row).map(([k, v]) => [normalizeKey(k), v]),
  );
  for (const key of keys) {
    const val = normalized[normalizeKey(key)];
    if (val !== undefined && val !== null && val !== "") return val;
  }
  return undefined;
}

function toNumber(val: unknown): number | null {
  if (val === undefined || val === null || val === "") return null;
  // Handle already-numeric values
  if (typeof val === "number") return Number.isNaN(val) ? null : val;
  // Handle string values: strip commas, spaces, currency symbols and parse
  const cleaned = String(val)
    .trim()
    .replace(/,/g, "")
    .replace(/[^\d.\-]/g, "");
  if (cleaned === "") return null;
  const n = Number(cleaned);
  return Number.isNaN(n) ? null : n;
}

function toStr(val: unknown): string {
  if (val === undefined || val === null) return "";
  return String(val).trim();
}

function parseRows(data: Record<string, unknown>[]): ParsedRow[] {
  return data.map((row, idx) => {
    const errors: string[] = [];

    const name = toStr(getVal(row, "name"));
    const category = toStr(getVal(row, "category")) || "General";
    const manufacturer = toStr(getVal(row, "manufacturer")) || "";

    const rawQty = getVal(row, "quantity", "qty", "stock");
    const quantityNum = toNumber(rawQty);
    if (!name) errors.push("Name is required");
    if (rawQty === undefined || rawQty === null || rawQty === "")
      errors.push("Quantity is required");
    else if (quantityNum === null || quantityNum < 0)
      errors.push("Quantity must be a non-negative number");

    const rawPurchasePrice = getVal(
      row,
      "purchasePrice",
      "purchase_price",
      "purchaseprice",
      "buyPrice",
      "buyprice",
      "costPrice",
      "costprice",
    );
    const rawRetailPrice = getVal(
      row,
      "retailPrice",
      "retail_price",
      "retailprice",
      "price",
      "sellingPrice",
      "sellingprice",
    );

    const purchasePriceNum = toNumber(rawPurchasePrice);
    const retailPriceNum = toNumber(rawRetailPrice);

    if (
      rawPurchasePrice !== undefined &&
      rawPurchasePrice !== null &&
      rawPurchasePrice !== "" &&
      purchasePriceNum === null
    ) {
      errors.push("Purchase price must be a number");
    }
    if (
      rawRetailPrice !== undefined &&
      rawRetailPrice !== null &&
      rawRetailPrice !== "" &&
      retailPriceNum === null
    ) {
      errors.push("Retail price must be a number");
    }

    const retailPrice = retailPriceNum ?? purchasePriceNum ?? 0;
    const purchasePrice = purchasePriceNum ?? retailPrice;

    const rawExpiry = getVal(
      row,
      "expiryDate",
      "expiry_date",
      "expiry",
      "expirydate",
      "exp",
    );
    const expiryDate = toStr(rawExpiry);

    const rawThreshold = getVal(
      row,
      "lowStockThreshold",
      "low_stock",
      "threshold",
      "lowstockthreshold",
      "lowstock",
      "minstock",
      "min_stock",
    );
    const thresholdNum = toNumber(rawThreshold);
    const lowStockThreshold = thresholdNum !== null ? thresholdNum : 10;

    const rawRack = getVal(
      row,
      "rackNumber",
      "rack_number",
      "rack",
      "racknumber",
    );
    const rackNumber = rawRack ? toStr(rawRack) : undefined;

    return {
      name,
      category,
      manufacturer,
      purchasePrice,
      retailPrice,
      quantity: quantityNum ?? 0,
      expiryDate,
      lowStockThreshold,
      rackNumber,
      valid: errors.length === 0,
      errors,
      rowIndex: idx + 2, // 1-indexed, row 1 = header
    };
  });
}

function downloadSampleTemplate() {
  const headers = [
    "name",
    "category",
    "manufacturer",
    "purchasePrice",
    "retailPrice",
    "quantity",
    "expiryDate",
    "lowStockThreshold",
    "rackNumber",
  ];
  const example1 = [
    "Paracetamol 500mg",
    "Analgesic",
    "GSK",
    "25.00",
    "35.00",
    "100",
    "2026-12-31",
    "10",
    "A1",
  ];
  const example2 = [
    "Amoxicillin 250mg",
    "Antibiotic",
    "Pfizer",
    "80.00",
    "110.00",
    "50",
    "2026-06-30",
    "5",
    "B3",
  ];

  const ws = XLSX.utils.aoa_to_sheet([headers, example1, example2]);

  // Set column widths
  ws["!cols"] = headers.map((h) => ({ wch: Math.max(h.length + 4, 16) }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Medicines");
  XLSX.writeFile(wb, "medicine_import_template.xlsx");
}

export function ExcelImportModal({ open, onClose }: ExcelImportModalProps) {
  const { addMedicine } = useData();
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [hasFile, setHasFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validRows = parsedRows.filter((r) => r.valid);
  const invalidRows = parsedRows.filter((r) => !r.valid);
  const previewRows = parsedRows.slice(0, 50);

  const handleClose = useCallback(() => {
    setParsedRows([]);
    setFileName("");
    setHasFile(false);
    onClose();
  }, [onClose]);

  const processFile = useCallback((file: File) => {
    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
      toast.error("Please upload an Excel (.xlsx, .xls) or CSV file");
      return;
    }

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(
          worksheet,
          { defval: "", raw: false },
        );

        if (jsonData.length === 0) {
          toast.error("The file appears to be empty or has no data rows");
          return;
        }

        const rows = parseRows(jsonData);
        setParsedRows(rows);
        setHasFile(true);
      } catch {
        toast.error("Could not read the file. Please check the format.");
      }
    };
    reader.readAsArrayBuffer(file);
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
      // Reset input so same file can be re-uploaded
      e.target.value = "";
    },
    [processFile],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleImport = useCallback(async () => {
    if (validRows.length === 0) return;
    setIsImporting(true);
    try {
      for (const row of validRows) {
        addMedicine({
          name: row.name,
          category: row.category,
          manufacturer: row.manufacturer,
          purchasePrice: row.purchasePrice,
          retailPrice: row.retailPrice,
          price: row.retailPrice,
          quantity: row.quantity,
          expiryDate: row.expiryDate,
          lowStockThreshold: row.lowStockThreshold,
          rackNumber: row.rackNumber,
        });
      }
      toast.success(
        `${validRows.length} medicine${validRows.length !== 1 ? "s" : ""} imported successfully!`,
      );
      handleClose();
    } catch {
      toast.error("Import failed. Please try again.");
    } finally {
      setIsImporting(false);
    }
  }, [validRows, addMedicine, handleClose]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-4xl w-full max-h-[90vh] flex flex-col gap-0 p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold">
                Import Medicines from Excel
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Upload an Excel or CSV file to bulk-add medicines to inventory
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Upload zone */}
          {!hasFile ? (
            <label
              htmlFor="excel-file-input"
              className={`relative border-2 border-dashed rounded-xl transition-all cursor-pointer block ${
                isDragging
                  ? "border-primary bg-primary/5 scale-[1.01]"
                  : "border-border hover:border-primary/50 hover:bg-muted/30"
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              <input
                id="excel-file-input"
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={handleFileChange}
              />
              <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                <div
                  className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-colors ${
                    isDragging ? "bg-primary/20" : "bg-muted"
                  }`}
                >
                  <Upload
                    className={`w-8 h-8 ${isDragging ? "text-primary" : "text-muted-foreground"}`}
                  />
                </div>
                <p className="text-sm font-semibold text-foreground mb-1">
                  {isDragging
                    ? "Drop your file here"
                    : "Drag & drop your Excel file here"}
                </p>
                <p className="text-xs text-muted-foreground mb-4">
                  or click to browse — supports .xlsx, .xls, .csv
                </p>
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-border bg-background text-xs font-medium text-foreground hover:bg-muted transition-colors pointer-events-none">
                  <Upload className="w-3.5 h-3.5" />
                  Choose File
                </span>
              </div>
            </label>
          ) : (
            <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-muted/40 border border-border">
              <FileSpreadsheet className="w-5 h-5 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{fileName}</p>
                <p className="text-xs text-muted-foreground">
                  {parsedRows.length} row{parsedRows.length !== 1 ? "s" : ""}{" "}
                  found
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setParsedRows([]);
                  setFileName("");
                  setHasFile(false);
                }}
                title="Remove file"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* Summary row */}
          {hasFile && parsedRows.length > 0 && (
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-success/10 border border-success/20">
                <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                <span className="text-xs font-semibold text-success">
                  {validRows.length} valid
                </span>
              </div>
              {invalidRows.length > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-destructive/10 border border-destructive/20">
                  <AlertCircle className="w-3.5 h-3.5 text-destructive" />
                  <span className="text-xs font-semibold text-destructive">
                    {invalidRows.length} invalid
                  </span>
                </div>
              )}
              {parsedRows.length > 50 && (
                <span className="text-xs text-muted-foreground">
                  Showing first 50 of {parsedRows.length} rows
                </span>
              )}
            </div>
          )}

          {/* Preview table */}
          {hasFile && parsedRows.length > 0 && (
            <div className="rounded-lg border border-border overflow-hidden">
              <ScrollArea className="h-64">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="text-xs font-semibold w-10">
                        #
                      </TableHead>
                      <TableHead className="text-xs font-semibold">
                        Status
                      </TableHead>
                      <TableHead className="text-xs font-semibold">
                        Name
                      </TableHead>
                      <TableHead className="text-xs font-semibold">
                        Category
                      </TableHead>
                      <TableHead className="text-xs font-semibold text-right">
                        Purchase
                      </TableHead>
                      <TableHead className="text-xs font-semibold text-right">
                        Retail
                      </TableHead>
                      <TableHead className="text-xs font-semibold text-center">
                        Qty
                      </TableHead>
                      <TableHead className="text-xs font-semibold">
                        Expiry
                      </TableHead>
                      <TableHead className="text-xs font-semibold">
                        Rack
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewRows.map((row) => (
                      <TableRow
                        key={row.rowIndex}
                        className={
                          row.valid
                            ? "hover:bg-muted/20"
                            : "bg-destructive/5 hover:bg-destructive/8"
                        }
                      >
                        <TableCell className="text-xs text-muted-foreground w-10">
                          {row.rowIndex}
                        </TableCell>
                        <TableCell>
                          {row.valid ? (
                            <Badge
                              variant="outline"
                              className="text-xs gap-1 border-success/40 text-success bg-success/5 py-0"
                            >
                              <CheckCircle2 className="w-2.5 h-2.5" />
                              OK
                            </Badge>
                          ) : (
                            <div className="flex flex-col gap-0.5">
                              <Badge
                                variant="outline"
                                className="text-xs gap-1 border-destructive/40 text-destructive bg-destructive/5 py-0 w-fit"
                              >
                                <AlertCircle className="w-2.5 h-2.5" />
                                Error
                              </Badge>
                              {row.errors.map((err) => (
                                <span
                                  key={err}
                                  className="text-[10px] text-destructive leading-tight"
                                >
                                  {err}
                                </span>
                              ))}
                            </div>
                          )}
                        </TableCell>
                        <TableCell
                          className={`text-xs font-medium ${!row.name ? "text-destructive italic" : ""}`}
                        >
                          {row.name || "—"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {row.category}
                        </TableCell>
                        <TableCell className="text-xs text-right font-mono text-muted-foreground">
                          Rs.{row.purchasePrice.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-xs text-right font-mono">
                          Rs.{row.retailPrice.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-xs text-center">
                          <span
                            className={`inline-flex items-center justify-center min-w-[1.5rem] px-1.5 py-0.5 rounded-full font-bold text-[10px] ${
                              row.quantity <= 0
                                ? "bg-muted text-muted-foreground"
                                : "bg-primary/10 text-primary"
                            }`}
                          >
                            {row.quantity}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {row.expiryDate || "—"}
                        </TableCell>
                        <TableCell className="text-xs">
                          {row.rackNumber ? (
                            <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
                              {row.rackNumber}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-muted/20 flex items-center justify-between gap-3 shrink-0 flex-wrap">
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 text-muted-foreground hover:text-foreground"
            onClick={downloadSampleTemplate}
          >
            <Download className="w-3.5 h-3.5" />
            Download Sample Template
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isImporting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              disabled={validRows.length === 0 || isImporting}
              className="gap-2"
            >
              {isImporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <FileSpreadsheet className="w-4 h-4" />
                  Import {validRows.length > 0 ? `${validRows.length} ` : ""}
                  Medicine{validRows.length !== 1 ? "s" : ""}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
