# Pharmacy World

## Current State

A full multi-pharmacy management system where:
- Master Admin (SuperAdmin) manages multiple pharmacies
- Each pharmacy has its own admin/cashier accounts, medicines inventory, sales, and purchase records
- All data currently stored in browser `localStorage` -- works only on the browser/device where setup was done
- Login fails on any other browser/device because localStorage is not shared

## Requested Changes (Diff)

### Add
- ICP canister-based persistent storage for all data (SuperAdmin credentials, pharmacies list, pharmacy accounts, medicines, sales, purchases)
- Data accessible from any browser/device after deployment
- Default master admin credentials (username: `masteradmin`, password: `master123`) pre-seeded so first login always works from any browser
- Change password functionality for master admin from Dashboard

### Modify
- SuperAdminContext: replace localStorage with backend canister calls for superadmin setup/login and pharmacy CRUD
- DataContext: replace localStorage with backend canister calls for medicines, accounts, sales, purchases per pharmacy
- AuthContext: keep session in localStorage (browser session is fine) but validate credentials against backend
- SuperAdminSetupPage: only show if no superadmin exists in backend; if default exists, skip setup
- SuperAdminDashboardPage: add "Change Master Password" button

### Remove
- Dependency on localStorage as primary data store (session-only use is fine)

## Implementation Plan

1. Generate Motoko backend with:
   - SuperAdmin storage: username + password hash, CRUD
   - Pharmacy storage: full Pharmacy records, activate/deactivate/delete
   - Per-pharmacy Accounts: CRUD with pharmacyId scoping
   - Per-pharmacy Medicines: CRUD with pharmacyId scoping
   - Per-pharmacy Sales: create, list, delete (with stock restore)
   - Per-pharmacy Purchases: create, list
   - Pre-seeded default master admin: username=`masteradmin` password=`master123`

2. Update SuperAdminContext to call backend for:
   - superAdminLogin (validate against backend)
   - setupSuperAdmin / changePassword
   - addPharmacy, deletePharmacy, activatePharmacy, deactivatePharmacy
   - Load pharmacies list from backend

3. Update DataContext to call backend for all pharmacy-scoped data operations

4. Update AuthContext to validate login against backend accounts

5. Add "Change Master Password" dialog in SuperAdminDashboardPage

6. Keep localStorage only for active session tokens (currentUser, superadmin_session, selected_pharmacy)
