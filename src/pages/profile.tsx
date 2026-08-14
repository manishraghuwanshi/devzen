import { FiUser, FiMail, FiShield, FiCalendar } from "react-icons/fi";
import { Card, CardHeader } from "../components/ui/card.tsx";
import { Badge } from "../components/ui/badge.tsx";
import { useAuth } from "../features/auth/use-auth.ts";

export default function ProfilePage() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">My Profile</h1>
        <p className="text-sm text-slate-500">Authenticated administrator credentials and role assignments</p>
      </div>

      <Card>
        <CardHeader title="Account Details" subtitle="Basic administrator information" />
        <div className="divide-y divide-slate-100 text-sm">
          <div className="flex items-center justify-between py-3">
            <span className="flex items-center gap-2 text-slate-500">
              <FiUser className="h-4 w-4" /> Name
            </span>
            <span className="font-medium text-slate-900">{user.name}</span>
          </div>
          <div className="flex items-center justify-between py-3">
            <span className="flex items-center gap-2 text-slate-500">
              <FiMail className="h-4 w-4" /> Email
            </span>
            <span className="font-medium text-slate-900">{user.email}</span>
          </div>
          <div className="flex items-center justify-between py-3">
            <span className="flex items-center gap-2 text-slate-500">
              <FiShield className="h-4 w-4" /> Role
            </span>
            <Badge variant="purple">{user.role.toUpperCase()}</Badge>
          </div>
          <div className="flex items-center justify-between py-3">
            <span className="flex items-center gap-2 text-slate-500">
              <FiCalendar className="h-4 w-4" /> Last Login
            </span>
            <span className="font-medium text-slate-900">
              {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : "First session"}
            </span>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Active Permissions"
          subtitle="Permissions derived from role by the backend authority"
        />
        <div className="flex flex-wrap gap-2 pt-2">
          {user.permissions.map((p) => (
            <Badge key={p} variant="default" size="sm">
              {p}
            </Badge>
          ))}
        </div>
      </Card>
    </div>
  );
}
