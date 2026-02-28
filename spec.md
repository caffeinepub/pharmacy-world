# Pharmacy World

## Current State
- Single-pharmacy pharmacy management system with admin and client roles
- Login page shows Demo Credentials box with hardcoded admin/admin123 and cashier1/cash123
- All data stored in a single localStorage namespace (pw_medicines, pw_accounts, pw_sales, pw_purchases)
- Admin can create client accounts but cannot create another admin
- No password change feature
- No multi-pharmacy isolation

## Requested Changes (Diff)

### Add
- **Super Admin role**: A master account (superadmin) that can create and manage multiple pharmacies
- **Pharmacy management**: Super admin can create pharmacy records (name, address, phone). Each pharmacy gets its own isolated data namespace in localStorage (e.g. `ph_{pharmacyId}_medicines`, `ph_{pharmacyId}_accounts`, etc.)
- **Per-pharmacy admin account**: When creating a pharmacy, super admin sets the pharmacy admin username and password
- **Create Admin option**: Pharmacy admin can also create another admin account (role: "admin") in addition to client accounts
- **Change Password**: Any logged-in user (admin or client) can change their own password via a "Change Password" option in the sidebar user area
- **Super Admin panel**: Separate page listing all pharmacies with ability to create/delete them
- **Pharmacy-scoped login**: On login page, show a "Select Pharmacy" dropdown or show pharmacy name from URL param. Each pharmacy's data is completely isolated

### Modify
- **Login page**: Remove Demo Credentials box completely
- **AccountFormModal**: Add role dropdown (client / admin) so pharmacy admin can create either role
- **DataContext**: Scope all localStorage keys to active pharmacy ID (passed via context or URL)
- **Layout sidebar**: Add "Change Password" button in user area. Show pharmacy name dynamically from active pharmacy config
- **Seed data**: Remove hardcoded seed accounts (admin/admin123, cashier1/cash123). On first run, show super admin setup or pharmacy selection

### Remove
- Demo Credentials hardcoded box from LoginPage
- Hardcoded "United Pharmacy" text in Layout (make it dynamic from selected pharmacy)

## Implementation Plan

1. Add `Pharmacy` and `SuperAdmin` types
2. Create SuperAdmin context/state using localStorage key `pw_superadmin` and `pw_pharmacies`
3. On first app load: if no superadmin exists, show SuperAdmin Setup page (create master username+password)
4. Super admin can create pharmacies -- each pharmacy stores: id, name, address, phone, adminUsername, adminPassword
5. DataContext: accept pharmacyId prop, prefix all keys with `ph_{pharmacyId}_`
6. Login flow: user first selects pharmacy from list, then enters credentials. Pharmacy admin + clients stored in `ph_{id}_accounts`
7. Remove Demo Credentials box from LoginPage
8. AccountFormModal: add role selector (client / admin) -- pharmacy admin can create both
9. Layout: show current pharmacy name from context; add Change Password dialog in user area
10. Change Password: validates old password, updates account in accounts list and also updates logged-in user in localStorage
