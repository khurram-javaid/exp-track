# Trackio

Trackio is a full-stack personal expense tracker built with React, Vite, Express, and MongoDB. It supports private accounts, searchable transactions, category management, monthly budgets, and a live analytics dashboard.

## Assumptions

- Users can display and enter amounts in USD, PKR, or EUR. Exchange rates are fetched from ExchangeRate-API and cached by the backend.
- Transactions and budgets are stored as integer USD cents. New entries are converted to USD when saved; changing the display currency converts all values using the latest available rate, so historical display amounts can change with exchange rates.
- Dashboard totals and budgets are calendar-month totals in UTC.
- Each account starts with a set of categories and can add more; category names are account-specific.
- Authentication uses a signed, HTTP-only cookie. The browser never stores the JWT in local storage.
- The frontend and API may be deployed separately. The API URL and permitted browser origins are deployment settings, not source-code constants.

## Project layout

```text
Backend/
  app.js
  middleware/         authentication
  models/             user, transaction, category, budget
  routes/             auth, dashboard, transactions, categories, budgets, currency
Frontend/vite-project/
  src/api/            credentialed API client
  src/components/     shared route protection
  src/context/        account session and currency state
  src/pages/           sign-in, registration, dashboard
```

## Requirements

- Node.js 20.19+ or 22.12+ (required by the current Vite release)
- npm
- MongoDB locally, or a MongoDB Atlas cluster

## Local development

1. Copy `Backend/.env.example` to `Backend/.env`. Set `MONGODB_URI` to your database connection string and replace `JWT_SECRET` with a random value of at least 32 characters. Keep `.env` files private; they are ignored by Git.
2. Install and start the API:

   ```powershell
   cd Backend
   npm install
   npm run dev
   ```

3. In another terminal, install and start the frontend:

   ```powershell
   cd Frontend/vite-project
   npm install
   npm run dev
   ```

4. Open the Vite address printed in the terminal (normally `http://localhost:5173`). During development, Vite proxies `/api` and `/health` to port 5000. To use a different local API port, set `VITE_API_PROXY_TARGET` in `Frontend/vite-project/.env.local`.

The backend listens on `PORT` (5000 by default). It requires `MONGODB_URI` and `JWT_SECRET` and intentionally does not fall back to a public or hard-coded database.

## Environment variables

### Backend (server only)

| Variable | Required | Description |
| --- | --- | --- |
| `MONGODB_URI` | Yes | MongoDB connection string. Never add this to a `VITE_` variable. |
| `JWT_SECRET` | Yes | Random signing secret, at least 32 characters. Use a secret manager in production. |
| `PORT` | No | HTTP port supplied by the host; defaults to `5000`. |
| `NODE_ENV` | No | Set to `production` on the deployed API. |
| `FRONTEND_URLS` | Production | Comma-separated, exact frontend origins, including scheme and any non-default port. |
| `COOKIE_SAME_SITE` | No | `lax` by default. Use `none` only when cross-site cookies are required; HTTPS is mandatory. |
| `COOKIE_DOMAIN` | No | Optional shared parent domain when using a custom domain setup. |
| `TRUST_PROXY_HOPS` | No | Trusted reverse-proxy count; defaults to `1` in production. Configure to match your host. |

### Frontend (public build-time settings)

| Variable | Description |
| --- | --- |
| `VITE_API_URL` | Full API base including `/api`, e.g. `https://api.example.com/api`. Leave empty for same-origin `/api` routing. |
| `VITE_API_PROXY_TARGET` | Development-only Vite proxy target; defaults to `http://127.0.0.1:5000`. |

Only public URLs belong in frontend variables. Anything prefixed `VITE_` is included in the browser bundle.

The authenticated currency-rates endpoint fetches USD-based USD, PKR, and EUR rates from ExchangeRate-API. Rates are cached by the API for six hours; if a refresh fails, the last available rate is returned with a stale indicator. New transaction and budget entries use the selected display currency and are converted to their stored USD value when saved. Changing the account currency updates all displayed amounts using the latest available rate; it does not rewrite saved records.

## API overview

All application endpoints are under `/api`. JSON errors include a safe `message`; the API does not expose stack traces or database errors to clients.

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/api/auth/register` | Create an account and default categories |
| `POST` | `/api/auth/login` | Sign in and set the HTTP-only session cookie |
| `POST` | `/api/auth/logout` | Clear the session cookie |
| `GET` | `/api/auth/me` | Return the signed-in account |
| `GET` | `/api/dashboard` | Current-month summary, six-month trend, categories, budgets, and recent transactions |
| `GET`, `POST` | `/api/transactions` | List/filter/paginate and create transactions |
| `PATCH`, `DELETE` | `/api/transactions/:id` | Update or remove an owned transaction |
| `GET`, `POST` | `/api/categories` | List or add account categories |
| `PATCH`, `DELETE` | `/api/categories/:id` | Update or remove an unused owned category |
| `GET`, `PUT` | `/api/budgets` | List monthly budgets or create/update a category budget |
| `DELETE` | `/api/budgets/:id` | Remove an owned budget |
| `GET` | `/health` | Liveness/readiness check; returns 503 when MongoDB is disconnected |

Transaction list filters include `q`, `type`, `category`, `from`, `to`, `min`, `max`, `sort`, `page`, and `limit`. API access is authenticated and every database query is scoped to the signed-in user.

## Production deployment

### 1. Create MongoDB Atlas database

1. Create an Atlas project and cluster, then create a dedicated database user with only the required database access.
2. Copy the application connection string and set its database name (for example `trackio`). URL-encode special characters in the database username/password.
3. Configure Atlas **Network Access** for the API host's outbound IP addresses. For local setup, allow only your current public IP (`/32`). Avoid `0.0.0.0/0` for production; if the host uses dynamic egress, choose a static-egress option or a host/networking plan with predictable IPs.
4. Store the connection string as the backend host's `MONGODB_URI` secret. Do not commit it or put it in frontend configuration.

### 2. Deploy the API

Use a Node.js host such as Render, Railway, Fly.io, or another managed Node host:

- Connect the GitHub repository and set the service root directory to `Backend`.
- Build/install command: `npm ci`.
- Start command: `npm start`.
- Set the host-provided `PORT` behavior and `NODE_ENV=production`.
- Add `MONGODB_URI`, `JWT_SECRET`, `FRONTEND_URLS`, and the cookie settings as host-managed environment variables. Generate `JWT_SECRET` with a cryptographically secure random generator.
- Set `FRONTEND_URLS` to the exact deployed frontend origin, such as `https://app.example.com`; do not include a path or trailing slash.
- Set `COOKIE_SAME_SITE=lax` for frontend and API on the same site. If they are truly cross-site, use `COOKIE_SAME_SITE=none` and HTTPS, but browser third-party-cookie restrictions may still interfere. Prefer custom frontend/API domains under the same registrable domain.
- Verify `https://<api-host>/health` returns `200` and `{"status":"ok","database":"connected"}`.

### 3. Deploy the frontend

For Netlify or Vercel, connect the same GitHub repository and configure:

- Root/base directory: `Frontend/vite-project`
- Install command: `npm ci`
- Build command: `npm run build`
- Publish/output directory: `dist`
- Build environment variable: `VITE_API_URL=https://<api-host>/api`

Set the API's `FRONTEND_URLS` to the exact frontend production origin and redeploy/restart the API after changing it. For preview deployments, add the exact preview origin only if those deployments need API access; avoid broad wildcard origins when credentials are enabled.

Configure SPA fallback/rewrite behavior so direct requests to `/login`, `/register`, and `/dashboard` serve the frontend `index.html`. Netlify can use its standard Vite SPA fallback; for Vercel configure a rewrite to `/index.html`.

### 4. GitHub-based releases

Push the project to a private or public GitHub repository without `.env` files. In the frontend and backend hosting dashboards, connect the repository and enable deploy-on-push for the chosen production branch. Configure all secrets in the hosting provider, never in GitHub source files or frontend build variables. Use separate database credentials and secrets for preview/staging and production.

## Security and operations

- Passwords use bcrypt hashing with a 10-character minimum; the API limits them to 72 UTF-8 bytes (bcrypt's input limit). Passwords and hashes are excluded from normal user reads.
- Session cookies are HTTP-only, signed, and `Secure` in production. The API restricts credentialed CORS to configured origins and checks origins on state-changing browser requests.
- API authentication routes and the overall API have rate limits. Helmet sets common HTTP security headers, request bodies are size-limited, and server-side validation limits accepted values.
- The default rate-limit store is process-local. Before running multiple API instances, configure a shared rate-limit store (for example Redis) so limits apply across instances.
- Resource reads, edits, and deletes include the authenticated owner in the database filter. Categories, transactions, and budgets cannot be accessed across accounts.
- Production logs are JSON lines with request method, path, status, duration, and operational errors. Do not log request bodies, passwords, cookies, or database URLs. Route those logs to the host's log service, configure retention/alerts, and restrict access.
- Use HTTPS for the frontend and API. Rotate secrets through the hosting provider and invalidate sessions by rotating `JWT_SECRET`.

## Checks and troubleshooting

```powershell
cd Backend
npm run check
npm test

cd ..\Frontend\vite-project
npm run lint
npm run build
```

- **API exits at startup:** confirm `MONGODB_URI`, `JWT_SECRET` (32+ characters), and in production `FRONTEND_URLS` are present in the backend service settings.
- **Atlas connection timeout:** check Atlas Network Access for the API host's outbound IP, database user permissions, URI encoding, and cluster status.
- **CORS or sign-in cookie errors:** `FRONTEND_URLS` must exactly match the browser origin (scheme, hostname, and port). For truly cross-site cookies use `COOKIE_SAME_SITE=none` with HTTPS; check browser third-party-cookie policy.
- **Frontend shows a network error:** verify `/health`, set `VITE_API_URL` to the API URL ending in `/api`, and rebuild the frontend after changing build variables.
- **Deep links return 404:** configure the frontend host's SPA fallback to `index.html`.
- **Build fails on Node:** use Node 20.19+ or 22.12+ for Vite 8.
- **Budget/category can't be deleted:** categories in use by transactions or budgets are deliberately protected; remove those records first.
- **Health returns 503:** the API process is running but MongoDB is not ready/connected; check API logs and Atlas network/database settings.
