# Pen Khon Dee Frontends

This folder contains two separate web apps. The internal staff dashboard remains in `staff-web`; the public table-ordering website is in `customer-web`.

## Run locally

Start the backend from the repository root:

```bash
npm --prefix backend run dev
```

Install dependencies for both apps once from the frontend workspace root:

```bash
npm --prefix frontend install
```

Run either frontend in a separate terminal:

```bash
npm --prefix frontend run dev:staff
npm --prefix frontend run dev:customer
```

The staff app uses port `5173`; the customer app uses port `5174`. Both proxy `/api` to the backend on port `3000`.

The staff app signs each role in to its matching workspace: Cashier opens `/admin/tables`, Kitchen opens `/kitchen`, and Server opens `/server`. Kitchen can move pending items to Ready or Cancelled; Server can move Ready items to Served. Both boards refresh automatically every 10 seconds.

Build both apps with:

```bash
npm --prefix frontend run build
```

## Customer table orders

Customers choose an available table, add available menu items to a cart, and submit them to the kitchen. The backend returns a private order access token so that the same browser can add more items to the open order. The staff app can view and manage these open orders as usual.

Apply `database/Migrations/001_customer_table_orders.sql` once to an existing database before using customer orders. New databases created from `database/Schema.sql` already include the required schema.
