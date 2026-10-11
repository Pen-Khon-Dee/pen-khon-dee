# Pen Khon Dee Admin

Internal restaurant management dashboard built with React, Vite, and React Router. Customers do not use this application.

## Pages

| Page | Route | File |
| --- | --- | --- |
| Staff sign-in | `/login` | `src/pages/Login.jsx` |
| Tables and bills | `/admin/tables` | `src/pages/admin/Tables.jsx` |
| Reservations | `/admin/reservations` | `src/pages/admin/Reservations.jsx` |
| Customers and members | `/admin/customers` | `src/pages/admin/Customers.jsx` |
| Menu management | `/admin/menu` | `src/pages/admin/MenuManager.jsx` |

The root route and `/admin` redirect to `/admin/tables`. All `/admin/*` pages share the sidebar layout in `src/components/AdminLayout.jsx`, which also handles session checks and table polling.

## Run locally

```bash
npm install
npm run dev
npm run build
```

The Vite development server runs at `http://localhost:5173` and proxies `/api` requests to the backend at `http://localhost:3000`.

Set `VITE_API_URL` in `.env` to `/api` for local development or to the API base URL when deploying. The backend must be running and connected to MySQL. There is no customer-facing or mock-data mode.

## Main source files

- `src/components/AdminLayout.jsx`: sidebar shell, session check, shared state (tables, bill) passed to pages via outlet context.
- `src/components/BillPanel.jsx`: bill, member linking, payment and cancellation.
- `src/hooks/useCustomerSearch.js`: phone lookup shared by Customers and Reservations.
- `src/lib/`: formatting helpers and session storage.
- `src/api.js`: authenticated admin API requests.
- `src/styles.css`: design tokens and all styles.
