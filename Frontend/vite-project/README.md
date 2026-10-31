# Trackio frontend

React 19 and Vite frontend for Trackio. See the [project README](../../README.md) for the API, Atlas configuration, environment variables, and full deployment instructions.

## Run locally

```powershell
npm install
npm run dev
```

The Vite development server proxies `/api` and `/health` to `http://127.0.0.1:5000`. Override the proxy with `VITE_API_PROXY_TARGET` in `.env.local` when the API uses another local address.

## Build and deploy

```powershell
npm run lint
npm run build
```

Deploy the generated `dist` directory. For a separately hosted API, set `VITE_API_URL` to its public HTTPS URL ending in `/api` before building. Frontend environment variables are public; do not put credentials or database URLs in them.
