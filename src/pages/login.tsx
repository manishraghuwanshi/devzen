import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Navigate, useNavigate, useLocation } from "react-router-dom";
import { FiMail, FiLock, FiClock, FiAlertCircle } from "react-icons/fi";
import { useAuth } from "../features/auth/use-auth.ts";
import { Button } from "../components/ui/button.tsx";
import { Input } from "../components/ui/input.tsx";
import { ApiError } from "../lib/api-error.ts";

const loginSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [serverError, setServerError] = useState<string | null>(null);

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || "/";

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      setServerError(null);
      await login(data);
      navigate(from, { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setServerError(err.message || "Invalid email or password");
      } else {
        setServerError("An unexpected error occurred. Please try again.");
      }
    }
  };

  // Already signed in (e.g. the session was restored while this page was open):
  // render a redirect instead of navigating during render, which would be a
  // side effect in the render phase.
  if (isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 rounded-2xl bg-white p-8 shadow-2xl">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-500/30">
            <FiClock className="h-7 w-7" />
          </div>
          <h2 className="mt-5 text-2xl font-bold tracking-tight text-slate-900">
            Devzen Admin
          </h2>
          <p className="mt-1.5 text-xs text-slate-500">
            Watch Catalog & Operations Management
          </p>
        </div>

        {serverError && (
          <div className="flex items-center gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3.5 text-xs text-red-800">
            <FiAlertCircle className="h-4 w-4 shrink-0 text-red-600" />
            <p className="font-medium">{serverError}</p>
          </div>
        )}

        <form className="mt-6 space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <Input
            label="Email Address"
            type="email"
            placeholder="admin@devzen.com"
            autoComplete="email"
            leftIcon={<FiMail className="h-4 w-4" />}
            error={errors.email?.message}
            {...register("email")}
          />

          <Input
            label="Password"
            type="password"
            placeholder="••••••••••••"
            autoComplete="current-password"
            leftIcon={<FiLock className="h-4 w-4" />}
            error={errors.password?.message}
            {...register("password")}
          />

          <Button
            type="submit"
            className="w-full mt-2"
            size="lg"
            isLoading={isSubmitting}
          >
            Sign In to Dashboard
          </Button>
        </form>

        <div className="border-t border-slate-100 pt-4 text-center">
          <p className="text-xs text-slate-400">
            Secure administrator access. Protected by cookie-based JWT sessions.
          </p>
        </div>
      </div>
    </div>
  );
}
