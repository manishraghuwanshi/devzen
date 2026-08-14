# Frontend Permission Map

This document establishes the frontend mapping between backend permissions and UI features.

> **Source of Truth**: `admin-backend/src/lib/auth/permissions.ts`.
> The backend derives permissions strictly from the user's role on each request. The frontend receives `permissions: Permission[]` inside the user profile object returned by `/api/auth/login`, `/api/auth/refresh`, and `/api/auth/me`.

---

## 1. Roles & Default Permissions Matrix

| Permission | Owner | Manager | Editor | Purpose |
| :--- | :---: | :---: | :---: | :--- |
| `products.read` | ✅ | ✅ | ✅ | View product list, details, and catalog counts |
| `products.write` | ✅ | ✅ | ✅ | Create new products and edit existing products |
| `products.delete` | ✅ | ✅ | ❌ | Delete products permanently |
| `brands.manage` | ✅ | ✅ | ✅ | View, create, update, and delete brands |
| `categories.manage`| ✅ | ✅ | ✅ | View, create, update, and delete categories |
| `images.manage` | ✅ | ✅ | ✅ | Upload, reorder, delete, and set primary images |
| `inventory.read` | ✅ | ✅ | ✅ | View inventory levels and low-stock alerts |
| `inventory.write` | ✅ | ✅ | ❌ | Adjust or set stock quantities directly |
| `adminUsers.manage`| ✅ | ❌ | ❌ | Manage staff, assign roles, reset passwords, view sessions |
| `auditLogs.read` | ✅ | ❌ | ❌ | View complete administrative audit trail |
| `auditLogs.readLimited` | ❌ | ✅ | ❌ | View self-performed audit trail only |

---

## 2. UI Actions and Route Access Mapping

### Navigation & Routing

| Route / Nav Item | Required Permission(s) | UI Fallback if Denied |
| :--- | :--- | :--- |
| **Dashboard** (`/`) | *Authenticated* (any role) | Redirect to `/login` |
| **Products** (`/products`) | `products.read` | Hidden from sidebar, 403 / Redirect if accessed |
| **New Product** (`/products/new`)| `products.write` | Button hidden, forbidden page if direct link |
| **Product Detail** (`/products/:id`)| `products.read` | Forbidden page if direct link |
| **Brands** (`/brands`) | `brands.manage` | Hidden from sidebar, forbidden page if direct link |
| **Categories** (`/categories`) | `categories.manage` | Hidden from sidebar, forbidden page if direct link |
| **Inventory** (`/inventory`) | `inventory.read` | Hidden from sidebar, forbidden page if direct link |
| **Admin Users** (`/admin-users`) | `adminUsers.manage` | Hidden from sidebar, forbidden page if direct link |
| **Audit Logs** (`/audit-logs`) | `auditLogs.read` OR `auditLogs.readLimited` | Hidden from sidebar, forbidden page if direct link |

### Component Actions & Buttons

| UI Element / Action | Required Permission |
| :--- | :--- |
| "Add Product" button | `products.write` |
| "Delete Product" action | `products.delete` |
| "Add Brand" / "Edit Brand" | `brands.manage` |
| "Add Category" / "Edit Category" | `categories.manage` |
| "Adjust Stock" modal / button | `inventory.write` |
| Image Upload / Reorder / Delete | `images.manage` |
| "Invite / Add Admin" button | `adminUsers.manage` |
| "Audit Logs" filter by any actor | `auditLogs.read` (Managers are locked to own actor server-side) |

---

## 3. Implementation in Frontend

The frontend exposes simple permission utilities via `useAuth()`:
- `hasPermission(permission: Permission): boolean`
- `hasAnyPermission(permissions: Permission[]): boolean`
- `hasAllPermissions(permissions: Permission[]): boolean`

Example usage in components:
```tsx
const { hasPermission } = useAuth();

{hasPermission("products.write") && (
  <Button to="/products/new">New Product</Button>
)}
```
