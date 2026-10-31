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


4. Open the Vite address printed in the terminal (normally `http://localhost:5173`). During development, Vite proxies `/api` and `/health` to port 5000. To use a different local API port, set `VITE_API_PROXY_TARGET` in `Frontend/vite-project/.env.local`.


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

