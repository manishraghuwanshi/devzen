import { useState } from "react";
import { FiMenu, FiLogOut, FiUser } from "react-icons/fi";
import { useAuth } from "../features/auth/use-auth.ts";
import { Badge } from "../components/ui/badge.tsx";
import { Button } from "../components/ui/button.tsx";

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { user, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await logout();
    } finally {
      setIsLoggingOut(false);
    }
  };

  const getRoleBadgeVariant = (role?: string) => {
    switch (role) {
      case "owner":
        return "purple";
      case "manager":
        return "info";
      default:
        return "default";
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur-xs sm:px-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
          onClick={onMenuClick}
          aria-label="Open sidebar"
        >
          <FiMenu className="h-5 w-5" />
        </button>
      </div>

      <div className="flex items-center gap-4">
        {user && (
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <div className="flex items-center justify-end gap-2">
                <span className="text-sm font-semibold text-slate-800">
                  {user.name}
                </span>
                <Badge variant={getRoleBadgeVariant(user.role)} size="sm">
                  {user.role.toUpperCase()}
                </Badge>
              </div>
              <p className="text-xs text-slate-400">{user.email}</p>
            </div>

            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600 border border-slate-200">
              <FiUser className="h-4 w-4" />
            </div>

            <Button
              variant="outline"
              size="sm"
              isLoading={isLoggingOut}
              onClick={handleLogout}
              leftIcon={<FiLogOut className="h-3.5 w-3.5" />}
              aria-label="Log out"
              title="Log out"
              className="ml-2"
            >
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
