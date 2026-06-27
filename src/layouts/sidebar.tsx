import { NavLink } from "react-router-dom";
import {
  FiGrid,
  FiWatch,
  FiTag,
  FiFolder,
  FiArchive,
  FiUsers,
  FiActivity,
  FiUser,
  FiX,
} from "react-icons/fi";
import { useAuth } from "../features/auth/use-auth.ts";
import type { Permission } from "../types/auth.ts";

interface NavItem {
  label: string;
  path: string;
  icon: typeof FiGrid;
  permission?: Permission;
  anyPermissions?: Permission[];
}

const NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    path: "/",
    icon: FiGrid,
  },
  {
    label: "Products",
    path: "/products",
    icon: FiWatch,
    permission: "products.read",
  },
  {
    label: "Brands",
    path: "/brands",
    icon: FiTag,
    permission: "brands.manage",
  },
  {
    label: "Categories",
    path: "/categories",
    icon: FiFolder,
    permission: "categories.manage",
  },
  {
    label: "Inventory",
    path: "/inventory",
    icon: FiArchive,
    permission: "inventory.read",
  },
  {
    label: "Admin Users",
    path: "/admin-users",
    icon: FiUsers,
    permission: "adminUsers.manage",
  },
  {
    label: "Audit Logs",
    path: "/audit-logs",
    icon: FiActivity,
    anyPermissions: ["auditLogs.read", "auditLogs.readLimited"],
  },
  {
    label: "Profile",
    path: "/profile",
    icon: FiUser,
  },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { hasPermission, hasAnyPermission } = useAuth();

  const filteredItems = NAV_ITEMS.filter((item) => {
    if (item.permission) {
      return hasPermission(item.permission);
    }
    if (item.anyPermissions) {
      return hasAnyPermission(item.anyPermissions);
    }
    return true;
  });

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand header */}
        <div className="flex h-16 items-center justify-between border-b border-slate-100 px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs">
              <FiWatch className="h-5 w-5" />
            </div>
            <div>
              <span className="text-base font-bold tracking-tight text-slate-900">
                Devzen
              </span>
              <span className="ml-1.5 rounded-sm bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-600">
                ADMIN
              </span>
            </div>
          </div>
          <button
            type="button"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 lg:hidden"
            onClick={onClose}
            aria-label="Close sidebar"
          >
            <FiX className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Catalog & Ops
          </p>
          {filteredItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/"}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-blue-50 text-blue-700 font-semibold"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`
                }
              >
                <Icon className="h-4 w-4 shrink-0 text-current" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        {/* App Version / Footer */}
        <div className="border-t border-slate-100 p-4">
          <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
            <p className="font-medium text-slate-700">Chronospeed Platform</p>
            <p className="mt-0.5 text-[11px] text-slate-400">Admin API v1.0 • Express 5</p>
          </div>
        </div>
      </aside>
    </>
  );
}
