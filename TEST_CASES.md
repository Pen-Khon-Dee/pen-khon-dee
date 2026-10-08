# 📋 Quick Test Checklist — Pen Khon Dee

### 1. Auth & Roles
- [ ] Valid login -> Returns Token (200 OK)
- [ ] Wrong password -> Blocked (401 Unauthorized)
- [ ] GET `/api/auth/me` -> Correct staff profile
- [ ] Server role can update dish status (`Pending` -> `Served`)
- [ ] Server role blocked from billing & reservations (403 Forbidden)

### 2. Business Rules (BR1 - BR13)
- [ ] 1 Customer = 1 Member max (prevent duplicate signup)
- [ ] Member points change ONLY via `Point_Transaction` (audit trail)
- [ ] Order paid -> Member points auto-incremented
- [ ] Walk-in orders allow `customer_id = null`
- [ ] Member orders successfully link `customer_id`
- [ ] Order must link to table -> Table becomes occupied
- [ ] Order cannot be empty (at least 1 `Order_Item`)
- [ ] `Order_Item.unit_price` matches current `Menu.price`
- [ ] Every Menu item must have a valid `category_id`
- [ ] Reservation requires: Customer + Cashier + at least 1 Table

### 3. Core Logic
- [ ] Order total is auto-calculated (`qty * price`), no manual input
- [ ] Prevent double-booking (same table, overlapping time)
- [ ] Out-of-stock items (`availability_status = false`) cannot be ordered