import { Link } from "react-router-dom";
import { FiPlus, FiTag, FiFolder, FiUsers } from "react-icons/fi";
import { Card, CardHeader } from "../../components/ui/card.tsx";
import { Button } from "../../components/ui/button.tsx";
import { useAuth } from "../auth/use-auth.ts";

export function QuickActions() {
  const { hasPermission } = useAuth();

  const actions = [
    {
      label: "New Product",
      path: "/products/new",
      icon: FiPlus,
      visible: hasPermission("products.write"),
    },
    {
      label: "Manage Brands",
      path: "/brands",
      icon: FiTag,
      visible: hasPermission("brands.manage"),
    },
    {
      label: "Manage Categories",
      path: "/categories",
      icon: FiFolder,
      visible: hasPermission("categories.manage"),
    },
    {
      label: "Manage Admin Users",
      path: "/admin-users",
      icon: FiUsers,
      visible: hasPermission("adminUsers.manage"),
    },
  ].filter((a) => a.visible);

  if (actions.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader
        title="Quick Navigation"
        subtitle="Shortcuts available based on your permissions"
      />
      <div className="flex flex-wrap gap-2.5 pt-1">
        {actions.map((act) => {
          const Icon = act.icon;
          return (
            <Link key={act.label} to={act.path}>
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Icon className="h-3.5 w-3.5" />}
              >
                {act.label}
              </Button>
            </Link>
          );
        })}
      </div>
    </Card>
  );
}
