# Frontend Architecture Documentation

## 1. Architectural Philosophy

Devzen is designed to be:
1. **Production-Quality**: Clean code, strong types, proper loading/empty/error states, and clear boundary separation.
2. **Interview-Explainable**: No "framework inside a framework", no gratuitous abstractions, and direct adherence to standard React 19 + TanStack Query patterns.
3. **Faithful to Backend**: Designed strictly around the existing `admin-backend` API without invented schemas or fake metrics.

---

## 2. Directory Structure

```text
devzen/src/
├── lib/                      # Core cross-cutting infrastructure
│   ├── api-client.ts         # Centralized HTTP client (fetch wrapper)
│   ├── api-error.ts          # Strongly-typed error wrapper
│   └── money.ts              # Minor-unit -> currency formatting
├── types/                    # Shared TypeScript declarations
│   ├── api.ts                # API envelopes & pagination metadata
│   ├── auth.ts               # User, role, and permission types
│   └── models.ts             # Domain models (Products, Brands, Categories, Inventory, Audit)
├── features/                 # Domain-driven features
│   ├── auth/                 # Auth context, hooks, guards, session API
│   ├── dashboard/            # KPI cards, Recharts, quick actions, recent activity
│   ├── products/             # Product API, table, form, image gallery
│   ├── brands/               # Brand API + modal form
│   ├── categories/           # Category API + modal form
│   ├── inventory/            # Inventory API + set/adjust forms
│   ├── admin-users/          # Admin user API, table, create/edit + password forms
│   └── audit-logs/           # Audit log API + expandable table
├── layouts/                  # Structural page layouts
│   ├── app-layout.tsx        # Responsive dashboard shell (sidebar + header + outlet)
│   ├── sidebar.tsx           # Permission-aware navigation
│   └── header.tsx            # User info, role badge, logout
├── components/ui/            # Small reusable UI primitives
│   ├── button.tsx            # Accessible button with loading/variant styles
│   ├── input.tsx             # Standard form input with label and error
│   ├── textarea.tsx          # Standard textarea with label and error
│   ├── badge.tsx             # Visual role/status indicator
│   ├── card.tsx              # Clean container card
│   ├── modal.tsx             # Small accessible dialog for the CRUD forms
│   ├── skeleton.tsx          # Shimmer loading placeholders
│   ├── empty-state.tsx       # Informative zero-data UI
│   ├── error-state.tsx       # Error alert with optional retry
│   └── spinner.tsx           # SVG loading indicator
├── pages/                    # Routed top-level pages
│   ├── login.tsx             # Public login view
│   ├── dashboard.tsx         # Executive dashboard overview
│   ├── products.tsx          # Product list (URL-driven filters)
│   ├── product-detail.tsx    # Product detail + image gallery
│   ├── product-editor.tsx    # Create/edit product
│   ├── brands.tsx            # Brand list + modal CRUD
│   ├── categories.tsx        # Category list + modal CRUD
│   ├── inventory.tsx         # Inventory list + stock modal
│   ├── admin-users.tsx       # Admin user list + modal CRUD
│   ├── audit-logs.tsx        # Audit trail with filters
│   ├── profile.tsx           # Signed-in account details
│   └── not-found.tsx         # 404
├── router.tsx                # Centralized React Router configuration
├── main.tsx                  # Root bootstrapping (QueryClient, AuthProvider, Router)
└── index.css                 # Tailwind CSS 4 styling and design tokens
```

---

## 3. Key Strategies

### 3.1 Centralized API Client (`src/lib/api-client.ts`)
- Utilizes native `fetch` with `credentials: "include"`.
- Prefixes requests with `VITE_API_BASE_URL`.
- Parses JSON responses into `{ success: true, data, pagination? }`.
- Intercepts `401 Unauthorized` responses and automatically attempts a single session refresh via `POST /api/auth/refresh`. If refresh succeeds, the original request is transparently retried. If refresh fails, it surfaces the `ApiError` so the auth context can clear user state and route to `/login`.
- Normalizes all errors into `ApiError` instances containing backend `code`, `message`, `details`, and `requestId`.

### 3.2 Authentication & Authorization (`src/features/auth/`)
- **Server State as Authority**: The current user is fetched via `GET /api/auth/me`. TanStack Query manages caching and liveness.
- **Session Restoration**: On initial application mount, `GET /api/auth/me` is invoked. A `401` is treated as "signed out" (`null`) rather than an error, so an expired session renders the login screen instead of a broken page.
- **Permission Checking**: `useAuth()` exposes `hasPermission`, `hasAnyPermission`, and `hasAllPermissions` over the `permissions` array from the API.
- **Protected Routes**: `<ProtectedRoute />` shows a spinner while the session is resolving and redirects unauthenticated visitors to `/login` with the attempted location.
- **Permission Guards**: `<PermissionGuard />` wraps each permissioned route, and the sidebar filters its items with the same hook.

### 3.4 Query Keys & Invalidation
- Query keys are hierarchical arrays, e.g. `["auth","me"]`, `["products","list",{…}]`,
  `["products","detail",id]`, `["brands","options"]`, `["inventory","list",{…}]`.
- Mutations invalidate a shared `*.all` namespace so lists, option pickers, and detail
  views refresh together (catalog edits also invalidate `productKeys.all`, since a brand
  or category rename is shown on product rows).
- List pages keep filters in the URL and pass them straight into the query key, so
  TanStack Query caches each filter combination separately and refreshes it on navigation.

### 3.5 Form & Validation Strategy
- `react-hook-form` coupled with `@hookform/resolvers/zod` and `zod`.
- Each form mirrors the corresponding backend Zod schema (slugs, URL fields, list bounds,
  money integers, `compareAtPrice >= price`, `reservedQuantity <= quantity`), so invalid
  payloads are rejected in the browser before a request is sent. The backend remains the
  authority and its `400 VALIDATION_ERROR` message is surfaced when it disagrees.
- Forms are controlled by `register()` and reset from their `initialValues`, and every
  submit button is disabled while its mutation is pending, so a double-click cannot
  create duplicates.
- **React Compiler exception**: the product, brand, category, admin-user, and inventory
  forms begin with a function-level `"use no memo"`. React Compiler memoised the change
  and blur handlers created by `register()` together with the values they close over,
  which made react-hook-form read stale values (Zod then reported populated required
  fields as empty). These directives are deliberate and must stay; `watch()` is avoided
  in those files for the same reason.

### 3.6 Money
- The backend stores monetary columns as integers in **whole currency units** (its
  `docs/database.md`: ₹12,999 is stored as `12999`), so the value the API returns is the
  amount itself. There is deliberately no scaling in the frontend.
- `src/lib/money.ts` is the single place that renders them: `formatMoney(12999, "INR")`
  -> `₹12,999`. Fraction digits are pinned to zero because the API only accepts integers.
- Product tables, product detail, and the product form all use it, including the
  min/max price filters, so a price is always shown as a currency rather than a bare
  integer.

### 3.7 Real Backend Data for Dashboard
- No fictional dashboard endpoints are invented.
- Real metrics are derived from existing endpoints using bounded requests and pagination totals:
  - Total Products & Active Products -> `GET /api/products?limit=1&page=1` (+ `isActive=true`)
  - Total Brands -> `GET /api/brands?limit=1&page=1`
  - Total Categories -> `GET /api/categories?limit=1&page=1`
  - Low Stock Items -> `GET /api/inventory?limit=1&page=1&stockState=low`
  - Stock health chart -> three bounded `stockState` counts (`inStock` / `low` / `out`)
  - Recent activity -> `GET /api/audit-logs?limit=6`, only requested when the signed-in
    role may read audit logs at all (`auditLogs.read` or `auditLogs.readLimited`); an
    unauthorised role sees no activity card rather than a `403`.
- `Promise.allSettled` is used throughout, so one forbidden or failing endpoint degrades
  that single metric to `0` instead of blanking the whole dashboard.
