# Pharmacy World

## Current State
Multi-pharmacy SaaS POS application with:
- Super Admin dashboard to manage pharmacies (activate/deactivate with expiry)
- Per-pharmacy: inventory management, new sale (POS), sales history, purchase records, accounts management
- Excel import for medicines
- Invoice print with patient info dialog
- Bulk stock removal
- Rack number tracking per medicine
- Per-tablet price system with box-to-tablet calculation in purchase stock modal
- Rs. currency throughout

Known issues:
- Data persistence: every new deployment resets data (backend stable storage is fine; issue was believed to be frontend re-initialization bug)
- No inventory export (Excel/PDF)
- No keyboard shortcuts on New Sale page

## Requested Changes (Diff)

### Add
- **Inventory Export**: "Export Excel" and "Export PDF" buttons on the Inventory page allowing download of current inventory as an Excel (.xlsx) file and a PDF file
- **Keyboard Shortcuts on New Sale page**:
  - `/` or `Ctrl+K` focuses the medicine search input
  - `Enter` or `Space` on a highlighted medicine card adds it to cart
  - `Tab` moves focus between medicine cards in the list
  - `Escape` clears the search input
  - In cart: `+` and `-` keys adjust quantity of last-added/selected cart item
  - Discount input: `Alt+D` or `Ctrl+D` focuses discount field
  - `Ctrl+Enter` or `F10` completes the sale (only if cart is non-empty)
  - Keyboard shortcut legend displayed as a small collapsible help panel on the New Sale page

### Modify
- **Data persistence robustness**: Add a session-persistence check on app init -- on first load, verify the backend superAdmin is set; if it is, trust existing localStorage session tokens. Do NOT clear or reset localStorage on app startup. Ensure the `DataProvider` does not wipe local state on re-render by stabilizing the `pharmacyId` dependency.
- **Inventory page**: Add export buttons next to "Import Excel" and "Add Medicine" buttons

### Remove
- Nothing to remove

## Implementation Plan
1. Add `ExcelExportButton` utility using `xlsx` (already likely installed for import) to generate .xlsx from medicines array
2. Add `PDFExportButton` utility using `jspdf` + `jspdf-autotable` to generate inventory PDF
3. Add both export buttons to `InventoryPage.tsx` header area
4. Add keyboard shortcut logic to `SalesPage.tsx`:
   - useRef for search input focus
   - keydown event listeners (window-level) with proper cleanup
   - Visual shortcut hints in a small collapsible info box
5. Stabilize DataContext to prevent unnecessary data resets -- ensure pharmacyId changes only trigger reload when value actually changes (not on re-render)
6. Validate and deploy
