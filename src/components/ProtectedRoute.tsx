import { useAuth } from "@/contexts/AuthContext";
import { Navigate, useLocation } from "react-router-dom";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: "admin" | "user";
}

const Spinner = () => (
  <div className="flex min-h-screen items-center justify-center bg-background">
    <div className="flex flex-col items-center gap-3">
      <div className="h-10 w-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      <p className="text-muted-foreground text-sm">Carregando...</p>
    </div>
  </div>
);

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, profile, loading, profileLoading, isProfileComplete } = useAuth();
  const location = useLocation();

  // Wait for auth session + initial profile to resolve
  if (loading || profileLoading) return <Spinner />;

  // No session → redirect to login
  if (!user) return <Navigate to="/login" replace />;

  // Force password change if default
  if (profile?.is_default_password && location.pathname !== "/trocar-senha") {
    return <Navigate to="/trocar-senha" replace />;
  }

  // Force profile completion for regular users (after password change)
  if (
    profile?.role === "user" &&
    !profile?.is_default_password &&
    !isProfileComplete &&
    location.pathname !== "/perfil"
  ) {
    return <Navigate to="/perfil" replace />;
  }

  // Role check
  if (requiredRole && profile?.role !== requiredRole) {
    if (profile?.role === "admin") return <Navigate to="/admin" replace />;
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
