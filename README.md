# Devzen - Admin Dashboard

A React admin frontend for `admin-backend` (the Chronospeed watch catalog API).

It covers authentication, a dashboard, products, brands, categories, inventory, admin
users, audit logs, and a profile view, using the real backend contract: cookie-based
sessions (no tokens in `localStorage`) and permissions derived from the signed-in
user's role.

## Stack

React 19 - TypeScript - Vite - React Compiler - Oxlint - React Router - Tailwind CSS 4 -
TanStack Query - React Hook Form + Zod - react-icons - Recharts - native `fetch`.

## Getting started

```bash
pnpm install
cp .env.example .env      # then point VITE_API_BASE_URL at admin-backend
pnpm dev
```

`admin-backend` must be running (default `http://localhost:5000`). Every request is sent
with `credentials: "include"`, so the API must allow this origin through CORS.

## Scripts

| Script | Purpose |
| :--- | :--- |
| `pnpm dev` | Vite dev server |
| `pnpm build` | Type-check (`tsc -b`) then production build |
| `pnpm lint` | Oxlint |
| `pnpm preview` | Serve the production build |

## Documentation

- [`docs/frontend-architecture.md`](docs/frontend-architecture.md) - how the app is put together
- [`docs/backend-integration.md`](docs/backend-integration.md) - endpoints and response envelopes
- [`docs/permission-map.md`](docs/permission-map.md) - permissions mapped to UI actions

## Notes

- React Compiler is enabled. Forms built on React Hook Form carry a function-level
  `"use no memo"` directive because the compiler's memoisation of `register()` handlers
  produced stale values; see the comments in `src/features/**/*-form.tsx`.
- Prices arrive from the API in whole currency units and are rendered by
  `src/lib/money.ts` with no scaling.
- Frontend permission checks exist for UX only. Authorisation is enforced by the backend
  on every request.
