# Pen Khon Dee — Test Notes

## Completed Tests

- [x] Staff login accepts valid credentials and rejects invalid credentials.
- [x] Open a table and create an order.
- [x] Place an order using QR Ordering at `http://localhost:3000/order/:token`; the items appear in Staff Web.
- [x] Complete payment; the table becomes Available again.
- [x] Link an existing member to an order.
- [x] Earn points: Order #14, THB 178, earned 17 points (88 -> 105).
- [x] Automatically upgrade Bronze to Silver; verified in MySQL (`level_id = 2`, 105 points).
- [x] Apply the 5% Silver discount: Order #15, THB 89 minus THB 4.45 = THB 84.55.
- [x] Pay Order #15; earn 8 points and reach a balance of 113 points.
- [x] Search for an existing customer; Silver membership and 113 points are displayed.
- [x] Search for a nonexistent phone number; the page shows `No customer found`.
- [x] Add `Test Fried Rice` at THB 100.
- [x] Edit the test item's price to THB 120.
- [x] Change menu availability between Available and Sold out.
- [x] Open Categories and view the existing categories.
- [x] View reservations and their statuses.
- [x] Create a reservation for `Test Customer`, 2 guests at 18:00.
- [x] Cancel Reservation #7; its status changes to Cancelled.
- [x] Cancel empty Order #16; Table 1 becomes Available.
- [x] Perform a basic Staff Web mobile-layout check.

## Issue to Follow Up

- [ ] **Customer Web (`http://localhost:5174`)** previously showed `Endpoint not found`. Confirm that the API connection and customer ordering flow work after the fix. The separate QR Ordering page on port 3000 worked during testing.

## Tests Still Needed

- [ ] Add a new menu category and rename a category; verify both changes are saved.
- [ ] Test `Show discontinued` using an item actually marked Discontinued. So far, only the checkbox itself was checked.
- [ ] Attempt to order a Sold out menu item; verify that the system prevents the order.
- [ ] Check the user-facing message when attempting to pay an already paid order. An API `409 Conflict` was observed, but the UI behavior was not confirmed.
- [ ] Test reservation validation with missing or invalid required fields.

## Cleanup Before Submission

- [x] Remove or appropriately mark the test item `Test Fried Rice` (THB 120), so it is not confused with real menu data.
- [ ] Check for any unintended test orders or reservations left open.
- [ ] Retest Customer Web after the teammate fixes it and capture the results.
- [ ] Review screenshots and add testing evidence to the project documentation if required.

## Notes

- A `404` response for a customer phone number that does not exist and a `409` response for a duplicate payment are not automatically bugs. Check whether these responses are intentional and whether the interface handles them clearly.
- A checked item means the tested scenario passed based on the evidence available. It does not mean every possible edge case was tested.
- Suggested place for a separate testing section in the existing database report: **Part 12 — System Testing and Results** (the report currently ends its numbered sections at Part 11).
