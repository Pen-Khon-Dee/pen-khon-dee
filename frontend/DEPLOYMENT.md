# Deploy Pen Khon Dee

This setup uses Railway for the API and MySQL, and two Netlify sites for the
staff and customer frontends. Deploying requires access to the GitHub
repository and accounts on those hosting services. Do not put `.env` files,
database passwords, JWT secrets, or database backups in GitHub or send them in
chat.

## 1. Back up and move the existing database

1. Back up the current `pen_khon_dee` database before changing hosting.
2. Create a MySQL service in Railway.
3. Import the backup into the new Railway database using Railway's private
   connection or a secure database client. Do not run `npm run db:reset`; it
   recreates the schema and replaces the data with seed records.
4. If the current database predates customer table orders, check whether
   `orders.customer_order_token_hash` exists. Apply
   `database/Migrations/001_customer_table_orders.sql` only if it does not.
   Do not run this migration a second time.

## 2. Deploy the backend on Railway

Create a Railway service from the GitHub repository and set its root directory
to `backend`. Use `npm start` as the start command. Add these service variables
using the connection values shown for the Railway MySQL service:

| Variable | Value |
| --- | --- |
| `DB_HOST` | Railway MySQL host |
| `DB_PORT` | Railway MySQL port |
| `DB_USER` | Railway MySQL username |
| `DB_PASSWORD` | Railway MySQL password |
| `DB_NAME` | Railway database name |
| `JWT_SECRET` | A new, long random secret |
| `CORS_ORIGINS` | The two Netlify site origins, comma-separated |
| `NODE_ENV` | `production` |

Generate a JWT secret locally with:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Generate a public domain for the backend, then verify
`https://<backend-domain>/api/health` returns status `ok`.

## 3. Deploy the staff site on Netlify

Create a Netlify site from the same GitHub repository with:

- Base directory: `frontend`
- Build command: `npm run build:staff`
- Publish directory: `staff-web/dist`
- Environment variable: `VITE_API_URL=https://<backend-domain>/api`

The included `staff-web/public/_redirects` file enables direct navigation and
page refreshes for routes such as `/kitchen` and `/server`.

## 4. Deploy the customer site on Netlify

Create a second Netlify site from the repository with:

- Base directory: `frontend`
- Build command: `npm run build:customer`
- Publish directory: `customer-web/dist`
- Environment variable: `VITE_API_URL=https://<backend-domain>/api`

After both sites have domains, set `CORS_ORIGINS` on Railway to the exact
origins, for example `https://staff-example.netlify.app,https://customer-example.netlify.app`,
then redeploy the backend.

## 5. Verify

- Open the customer site and confirm menu and available tables load.
- Sign in to the staff site with cashier, kitchen, and server accounts.
- Confirm the corresponding role pages and their actions work.
- Check Railway logs and `/api/health` if a site cannot reach the API.
