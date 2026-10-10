# Pen Khon Dee Admin

Internal restaurant management dashboard built with React, Vite, and React Router. Customers do not use this application.

## Pages

| Page | Route | File |
| --- | --- | --- |
| Staff sign-in | `/login` | `src/pages/Login.jsx` |
| Admin dashboard | `/admin` | `src/pages/Admin.jsx` |

The root route redirects to `/admin`. Unrecognized routes show an admin-focused 404 page.

## Run locally

```bash
npm install
npm run dev
npm run build
```

The Vite development server runs at `http://localhost:5173` and proxies `/api` requests to the backend at `http://localhost:3000`.

Set `VITE_API_URL` in `.env` to `/api` for local development or to the API base URL when deploying. The backend must be running and connected to MySQL. There is no customer-facing or mock-data mode.

## Main source files

- `src/pages/Admin.jsx`: table status, bills, reservations, customers, memberships, and menu management.
- `src/pages/Login.jsx`: Cashier sign-in.
- `src/api.js`: authenticated admin API requests.
- `src/styles.css`: application styles.
