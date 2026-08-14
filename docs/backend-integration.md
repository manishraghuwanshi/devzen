# Admin Backend Integration Contract

## 1. Overview & Base Assumptions

The `devzen` dashboard communicates with the `admin-backend` API over HTTP with JSON payloads and cookie-based credentials.

- **Base URL**: Configured via Vite environment variable `VITE_API_BASE_URL` (defaults to `http://localhost:3000` or `/` if reverse-proxied).
- **Credentials & Cookies**: All API requests pass `credentials: "include"`. The backend sets two `HttpOnly`, `Path=/` cookies upon successful authentication:
  - `access_token`: Short-lived JWT (default 15 minutes, 900s) containing `{ sub, email, role, sid }`.
  - `refresh_token`: Cryptographically random 32-byte secret (SHA-256 hashed in backend `refresh_sessions`).
- **CSRF & Origin Policy**: State-changing methods (`POST`, `PUT`, `PATCH`, `DELETE`) on `/api/*` are guarded by `csrfOriginCheck`. The browser automatically supplies the `Origin` header, which is validated against allowed origins (`localhost` / `127.0.0.1` in development).

---

## 2. Standard Response Envelopes

Every endpoint in `admin-backend` adheres strictly to standard response structures:

### Success (Single Resource or Action)
```json
{
  "success": true,
  "data": { ... }
}
```

### Success (Paginated List)
```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

### Error
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable message",
    "details": { ... }
  },
  "requestId": "uuid-v4-or-header"
}
```

Standard error codes include:
- `400` -> `VALIDATION_ERROR`, `INVALID_JSON`
- `401` -> `UNAUTHORIZED` ("Invalid or expired session" or "Authentication required")
- `403` -> `FORBIDDEN` ("You do not have permission to perform this action"), `CSRF_REJECTED`
- `404` -> `NOT_FOUND` ("Resource not found")
- `409` -> `CONFLICT` (e.g. duplicate slug/SKU/email, last active owner lockout)
- `413` -> `PAYLOAD_TOO_LARGE`
- `422` -> `UNPROCESSABLE_ENTITY` (e.g. self-demotion, reservation > quantity)
- `429` -> `TOO_MANY_REQUESTS`
- `500` -> `INTERNAL_ERROR`
- `503` -> `SERVICE_UNAVAILABLE`

---

## 3. Discovered Endpoints Contract

### 3.1 Authentication (`/api/auth`)
- `POST /api/auth/login`: Rate-limited. Body: `{ email: string, password: string }`. Sets `access_token` and `refresh_token` cookies. Returns `{ success: true, data: AdminUser }`.
- `POST /api/auth/refresh`: Rate-limited. Reads `refresh_token` cookie, issues rotated cookies. Returns `{ success: true, data: AdminUser }`. Replay of an already rotated token revokes all account sessions.
- `POST /api/auth/logout`: Requires authentication. Revokes caller session and matching refresh session, clears cookies. Returns `{ success: true, data: { loggedOut: true } }`.
- `GET /api/auth/me`: Requires authentication. Returns `{ success: true, data: AdminUser }`.

#### AdminUser Shape:
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "Jane Doe",
  "role": "owner" | "manager" | "editor",
  "permissions": [ "products.read", ... ],
  "isActive": true,
  "lastLoginAt": "2026-10-06T12:00:00.000Z",
  "createdAt": "2026-01-01T00:00:00.000Z",
  "updatedAt": "2026-10-06T12:00:00.000Z"
}
```

### 3.2 Products (`/api/products`)
- `GET /api/products`: Requires `products.read`. Query: `page`, `limit`, `search`, `brandId`, `categoryId`, `isActive`, `isFeatured`, `minPrice`, `maxPrice`, `sort` (createdAt | name | price | updatedAt), `order` (asc | desc). Returns paginated products.

> **Money units.** `price` and `compareAtPrice` are integers in **whole currency units**
> (`12999` = ₹12,999 for `INR`; `amountSchema` is `z.number().int()`), so `minPrice`/
> `maxPrice` are expressed in the same unit. The frontend renders them with `Intl` via
> `src/lib/money.ts`, which performs no scaling — the integer is the amount.
>
> **Product list shape.** The list is a Drizzle relational query, so rows carry a nested
> `brand { id, name, slug }` and `inventory { quantity, reservedQuantity,
> lowStockThreshold, availableQuantity, updatedAt }` rather than flat `brandName`/
> `stockQuantity` columns. `GET /api/products/:id` additionally returns `categories[]`,
> `images[]` (with signed `url`), and `watchDetails`.
- `GET /api/products/:id`: Requires `products.read`. Returns full product detail with brand, watchDetails, inventory, categories, and images (with signed download URLs if storage configured).
- `POST /api/products`: Requires `products.write`. Transactional creation.
- `PATCH /api/products/:id`: Requires `products.write`. Atomic partial updates with row locking on inventory.
- `DELETE /api/products/:id`: Requires `products.delete`. Cascades child tables and cleans up S3 objects.

The Products UI uses backend pagination and sends search, active-status, sort, and direction controls as query parameters. Product creation and editing include the nested `inventory` object supported by these endpoints. Image administration is deliberately JSON-based: `POST /api/products/:productId/images` receives a base64 data URL (not multipart form data), while list/detail responses expose signed image URLs as `url` when storage is configured.

### 3.3 Brands (`/api/brands`)
- `GET /api/brands`: Requires `brands.manage`. Query: `page`, `limit`, `search`, `isActive`, `sort` (createdAt | name), `order`. Returns paginated brands.
- `GET /api/brands/:id`: Requires `brands.manage`.
- `POST /api/brands`: Requires `brands.manage`. Body: `{ name, slug, description?, logoStorageKey?, websiteUrl?, isActive? }`.
- `PATCH /api/brands/:id`: Requires `brands.manage`.
- `DELETE /api/brands/:id`: Requires `brands.manage`. Blocked (RESTRICT) if products reference the brand.

### 3.4 Categories (`/api/categories`)
- `GET /api/categories`: Requires `categories.manage`. Query: `page`, `limit`, `search`, `isActive`, `parentId`, `sort` (createdAt | name | sortOrder), `order`. Returns paginated categories.
- `GET /api/categories/:id`: Requires `categories.manage`.
- `POST /api/categories`: Requires `categories.manage`. Body: `{ name, slug, description?, parentId?, imageStorageKey?, isActive?, sortOrder? }`.
- `PATCH /api/categories/:id`: Requires `categories.manage`.
- `DELETE /api/categories/:id`: Requires `categories.manage`. Blocked if category has children or products.

### 3.5 Inventory (`/api/inventory`)
- `GET /api/inventory`: Requires `inventory.read`. Query: `page`, `limit`, `search`, `brandId`, `stockState` (any | inStock | low | out), `sort` (updatedAt | available | product), `order`. Returns paginated inventory with joined product details.
- `GET /api/inventory/:productId`: Requires `inventory.read`. Returns inventory for product.
- `PUT /api/inventory/:productId`: Requires `inventory.write`. Absolute replacement with row locking.
- `POST /api/inventory/:productId/adjust`: Requires `inventory.write`. Safe atomic concurrency adjustment with `{ delta, reason?, reservedQuantity?, lowStockThreshold? }`.

### 3.6 Product Images (`/api/products/:productId/images`)
- Mounted under product path. Requires `images.manage`.
- `GET /api/products/:productId/images`: Lists images with signed URLs.
- `POST /api/products/:productId/images`: Uploads base64 image (sniffs magic bytes, saves to S3, writes DB row).
- `POST /api/products/:productId/images/reorder`: Reorders images via `{ imageIds: string[] }`.
- `PUT /api/products/:productId/images/:imageId/primary`: Sets primary image.
- `DELETE /api/products/:productId/images/:imageId`: Deletes DB row and S3 object.

### 3.7 Admin Users (`/api/admin-users`)
- Requires `adminUsers.manage` (owner only).
- `GET /api/admin-users`: Paginated admin users with per-row `activeSessionCount`.
- `POST /api/admin-users`: Creates new admin user.
- `PATCH /api/admin-users/:id`: Updates name/email/role/isActive. Protected against self-lockout and last-owner demotion.
- `PUT /api/admin-users/:id/password`: Resets password and revokes live sessions.
- `DELETE /api/admin-users/:id`: Deletes admin user.
- `GET /api/admin-users/:id/sessions`: Lists active sessions.
- `POST /api/admin-users/:id/sessions/revoke`: Revokes all sessions for user.
- `GET /api/admin-users/:id/audit-logs`: Fetches last 100 actions performed by this user.

### 3.8 Audit Logs (`/api/audit-logs`)
- Requires `auditLogs.read` (owner) OR `auditLogs.readLimited` (manager - scoped to caller's own actions in SQL). Rate limited (240 / 15m).
- `GET /api/audit-logs`: Paginated logs. Query: `action`, `entityType`, `entityId`, `actorId`, `from`, `to`.
- `GET /api/audit-logs/actions`: Lists distinct actions for filtering.
- `GET /api/audit-logs/entity/:entityType/:entityId`: Logs for specific entity.

> **Date filters.** The backend parses `from`/`to` with `z.coerce.date()`, so a bare
> `YYYY-MM-DD` becomes midnight UTC. The frontend widens a picked day to its full range
> (`from` -> start of day, `to` -> end of day) before sending, otherwise an "up to today"
> filter would silently exclude everything that happened today.
>
> **Audit log shape.** Rows are flattened as `actorId`, `actorName`, `actorEmail` (plus
> `action`, `entityType`, `entityId`, `metadata`, `ipAddress`, `userAgent`, `createdAt`)
> — there is no nested `actor` object. `action` accepts `*` as a wildcard within the
> dotted namespace (e.g. `product.*`).
>
> **Row limit.** List endpoints cap `limit` server-side; the frontend therefore requests
> one alphabetically sorted page (`limit: 100`) when it needs a full set of brands or
> categories for a `<select>`.
