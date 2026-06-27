import { Link } from "react-router-dom";
import { FiAlertTriangle } from "react-icons/fi";
import { Button } from "../components/ui/button.tsx";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
        <FiAlertTriangle className="h-7 w-7" />
      </div>
      <h2 className="text-2xl font-bold text-slate-900">Page Not Found</h2>
      <p className="mt-2 text-sm text-slate-500">
        The requested administrative route does not exist.
      </p>
      <div className="mt-6">
        <Link to="/">
          <Button variant="primary">Return to Dashboard</Button>
        </Link>
      </div>
    </div>
  );
}
