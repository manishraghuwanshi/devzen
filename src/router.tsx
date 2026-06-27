import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppLayout } from "./layouts/app-layout.tsx";
import { ProtectedRoute } from "./features/auth/protected-route.tsx";
import { PermissionGuard } from "./features/auth/permission-guard.tsx";

// Pages
import LoginPage from "./pages/login.tsx";
import DashboardPage from "./pages/dashboard.tsx";
import ProductsPage from "./pages/products.tsx";
import ProductDetailPage from "./pages/product-detail.tsx";
import ProductEditorPage from "./pages/product-editor.tsx";
import BrandsPage from "./pages/brands.tsx";
import CategoriesPage from "./pages/categories.tsx";
import InventoryPage from "./pages/inventory.tsx";
import AdminUsersPage from "./pages/admin-users.tsx";
import AuditLogsPage from "./pages/audit-logs.tsx";
import ProfilePage from "./pages/profile.tsx";
import NotFoundPage from "./pages/not-found.tsx";

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <DashboardPage />,
      },
      {
        path: "products",
        element: (
          <PermissionGuard permission="products.read" fallback={<Navigate to="/" replace />}>
            <ProductsPage />
          </PermissionGuard>
        ),
      },
      { path: "products/new", element: <PermissionGuard permission="products.write" fallback={<Navigate to="/products" replace />}><ProductEditorPage /></PermissionGuard> },
      { path: "products/:id", element: <PermissionGuard permission="products.read" fallback={<Navigate to="/" replace />}><ProductDetailPage /></PermissionGuard> },
      { path: "products/:id/edit", element: <PermissionGuard permission="products.write" fallback={<Navigate to="/products" replace />}><ProductEditorPage /></PermissionGuard> },
      {
        path: "brands",
        element: (
          <PermissionGuard permission="brands.manage" fallback={<Navigate to="/" replace />}>
            <BrandsPage />
          </PermissionGuard>
        ),
      },
      {
        path: "categories",
        element: (
          <PermissionGuard permission="categories.manage" fallback={<Navigate to="/" replace />}>
            <CategoriesPage />
          </PermissionGuard>
        ),
      },
      {
        path: "inventory",
        element: (
          <PermissionGuard permission="inventory.read" fallback={<Navigate to="/" replace />}>
            <InventoryPage />
          </PermissionGuard>
        ),
      },
      {
        path: "admin-users",
        element: (
          <PermissionGuard permission="adminUsers.manage" fallback={<Navigate to="/" replace />}>
            <AdminUsersPage />
          </PermissionGuard>
        ),
      },
      {
        path: "audit-logs",
        element: (
          <PermissionGuard
            permissions={["auditLogs.read", "auditLogs.readLimited"]}
            fallback={<Navigate to="/" replace />}
          >
            <AuditLogsPage />
          </PermissionGuard>
        ),
      },
      {
        path: "profile",
        element: <ProfilePage />,
      },
      {
        path: "*",
        element: <NotFoundPage />,
      },
    ],
  },
]);
