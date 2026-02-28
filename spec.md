# Pharmacy World

## Current State
- Multi-pharmacy POS system with admin/cashier roles
- Sales history page shows invoices with view (eye icon) button
- InvoiceModal handles screen view + print
- DataContext has addSale, deductStock, addPurchaseRecord -- but NO deleteSale or restoreStock
- Sale type has no patientName / patientPhone fields
- Print goes directly without asking for patient info

## Requested Changes (Diff)

### Add
- `deleteSale` function in DataContext that removes a sale AND restores stock for all items in that sale
- Delete button in History page (admin only) -- with confirmation dialog
- Patient info dialog that appears before print -- fields: Patient Name (optional), Patient Phone (optional)
- Patient name and phone shown on printed invoice and screen invoice preview if provided

### Modify
- `Sale` type: add optional `patientName?: string` and `patientPhone?: string` fields
- DataContext: expose `deleteSale(id: string)` which removes sale and calls restoreStock internally
- InvoiceModal: before triggering print window, show a small dialog asking for patient name/phone; after confirm, print with those details
- InvoiceModal screen view: show patient name/phone row if present
- History page: add delete button (Trash2 icon) in the Invoice column for admin role; show confirm dialog before delete

### Remove
- Nothing removed

## Implementation Plan
1. Update `Sale` type to add patientName and patientPhone optional fields
2. Add `deleteSale` to DataContextType interface and implement it in DataProvider (removes sale, restores stock quantities)
3. Update HistoryPage: import useAuth, show Trash2 delete button for admin, show confirmation AlertDialog before calling deleteSale
4. Update InvoiceModal: add patient info state + a pre-print dialog (PatientInfoDialog) that shows before print; pass patientName/patientPhone into print HTML and screen view
